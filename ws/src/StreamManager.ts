import WebSocket from "ws";
import { PrismaClient } from "@prisma/client";
//@ts-ignore
import youtubesearchapi from "youtube-search-api";
import { Job, Queue, Worker } from "bullmq";
import { getVideoId, isValidYoutubeURL } from "./utils";

const TIME_SPAN_FOR_VOTE = 1200000; // 20min
const TIME_SPAN_FOR_QUEUE = 1200000; // 20min
const TIME_SPAN_FOR_REPEAT = 3600000;
const MAX_QUEUE_LENGTH = 20;
//Client joins a room:
// Initiates WebSocket connection.
// Server validates and joins the corresponding Redis channel.
// User adds a video to the queue:
// Sends video ID to WebSocket server.
// WebSocket server validates, stores via Prisma, adds job to BullMQ.
// Redis publishes to all clients in the room to update the queue.
// Sync video state (play/pause/seek):
// WebSocket events are broadcast via Redis channels.
// All clients stay in sync.
// Job Queue (BullMQ):
// Handles future play scheduling, skip after duration, etc.
// Worker listens and notifies Redis/WebSocket for execution.
// Database via Prisma:
// Stores room state, current queue, past history.

const connection = {
  password: process.env.REDIS_PASSWORD || "",
  host: process.env.REDIS_HOST || "",
  port: parseInt(process.env.REDIS_PORT || "") || 6379,
};

export class RoomManager {
  private static instance: RoomManager;
  public spaces: Map<string, Space>;
  public users: Map<string, User>;
  public prisma: PrismaClient;
  public queue: Queue;
  public worker: Worker;
  public wstoSpace: Map<WebSocket, string>;

  private constructor() {
    this.spaces = new Map();
    this.users = new Map();
    this.prisma = new PrismaClient();
    this.queue = new Queue(process.pid.toString(), {
      connection,
    });
    this.worker = new Worker(process.pid.toString(), this.processJob, {
      connection,
    });
    this.wstoSpace = new Map();
  }

  static getInstance() {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }

    return RoomManager.instance;
  }

  async processJob(job: Job) {
    const { data, name } = job;
    if (name === "cast-vote") {
      await RoomManager.getInstance().adminCastVote(
        data.creatorId,
        data.userId,
        data.streamId,
        data.vote,
        data.spaceId
      );
    } else if (name === "add-to-queue") {
      await RoomManager.getInstance().adminAddStreamHandler(
        data.spaceId,
        data.userId,
        data.url,
        data.existingActiveStream
      );
    } else if (name === "play-next") {
      await RoomManager.getInstance().adminPlayNext(data.spaceId, data.userId);
    } else if (name === "remove-song") {
      await RoomManager.getInstance().adminRemoveSong(
        data.spaceId,
        data.userId,
        data.streamId
      );
    } else if (name === "empty-queue") {
      await RoomManager.getInstance().adminEmptyQueue(data.spaceId);
    }
  }

  async createRoom(spaceId: string) {
    console.log(process.pid + ": createRoom: ", { spaceId });
    if (!this.spaces.has(spaceId)) {
      this.spaces.set(spaceId, {
        users: new Map<string, User>(),
        creatorId: "",
      });
    }
  }

  async addUser(userId: string, ws: WebSocket, token: string) {
    let user = this.users.get(userId);
    if (!user) {
      this.users.set(userId, {
        userId,
        ws: [ws],
        token,
      });
    } else {
      if (!user.ws.some((existingWs) => existingWs === ws)) {
        user.ws.push(ws);
      }
    }
  }

  async joinRoom(
    spaceId: string,
    creatorId: string,
    userId: string,
    ws: WebSocket,
    token: string
  ) {
    console.log("Join Room" + spaceId);

    let space = this.spaces.get(spaceId);
    let user = this.users.get(userId);

    if (!space) {
      await this.createRoom(spaceId);
      space = this.spaces.get(spaceId);
    }

    if (!user) {
      await this.addUser(userId, ws, token);
      user = this.users.get(userId);
    } else {
      if (!user.ws.some((existingWs) => existingWs === ws)) {
        user.ws.push(ws);
      }
    }

    this.wstoSpace.set(ws, spaceId);

    if (space && user) {
      space.users.set(userId, user);
      this.spaces.set(spaceId, {
        ...space,
        users: new Map(space.users),
        creatorId: creatorId,
      });
    }
  }

  publishEmptyQueue(spaceId: string) {
    const space = this.spaces.get(spaceId);
    space?.users.forEach((user, userId) => {
      user?.ws.forEach((ws) => {
        ws.send(
          JSON.stringify({
            type: `empty-queue/${spaceId}`,
          })
        );
      });
    });
  }

  async adminEmptyQueue(spaceId: string) {
    const room = this.spaces.get(spaceId);
    const userId = this.spaces.get(spaceId)?.creatorId;
    const user = this.users.get(userId as string);

    if (room && user) {
      await this.prisma.stream.updateMany({
        where: {
          played: false,
          spaceId: spaceId,
        },
        data: {
          played: true,
          playedTs: new Date(),
        },
      });
      this.publishEmptyQueue(spaceId);
    }
  }

  publishRemoveSong(spaceId: string, streamId: string) {
    console.log("publishRemoveSong");
    const space = this.spaces.get(spaceId);
    space?.users.forEach((user, userId) => {
      user?.ws.forEach((ws) => {
        ws.send(
          JSON.stringify({
            type: `remove-song/${spaceId}`,
            data: {
              streamId,
              spaceId,
            },
          })
        );
      });
    });
  }

  async adminRemoveSong(spaceId: string, userId: string, streamId: string) {
    console.log("adminRemoveSong");
    const user = this.users.get(userId);
    const creatorId = this.spaces.get(spaceId)?.creatorId;

    if (user && userId == creatorId) {
      await this.prisma.stream.delete({
        where: {
          id: streamId,
          spaceId: spaceId,
        },
      });

      this.publishRemoveSong(spaceId, streamId);
    } else {
      user?.ws.forEach((ws) => {
        ws.send(
          JSON.stringify({
            type: "error",
            data: {
              message: "You cant remove the song . You are not the host",
            },
          })
        );
      });
    }
  }

  publishPlayNext(spaceId: string) {
    const space = this.spaces.get(spaceId);
    space?.users.forEach((user, userId) => {
      user?.ws.forEach((ws) => {
        ws.send(
          JSON.stringify({
            type: `play-next/${spaceId}`,
          })
        );
      });
    });
  }

  async payAndPlayNext(spaceId: string, userId: string, url: string) {
    const creatorId = this.spaces.get(spaceId)?.creatorId;
    console.log("payAndPlayNext", creatorId, userId);
    let targetUser = this.users.get(userId);
    if (!targetUser || !creatorId) {
      return;
    }

    const extractedId = getVideoId(url);

    if (!extractedId) {
      targetUser?.ws.forEach((ws) => {
        ws.send(
          JSON.stringify({
            type: "error",
            data: { message: "Invalid YouTube URL" },
          })
        );
      });
      return;
    }

    const res = await youtubesearchapi.GetVideoDetails(extractedId);

    if (res.thumbnail) {
      const thumbnails = res.thumbnail.thumbnails;
      thumbnails.sort((a: { width: number }, b: { width: number }) =>
        a.width < b.width ? -1 : 1
      );
      const stream = await this.prisma.stream.create({
        data: {
          id: crypto.randomUUID(),
          userId: creatorId,
          url: url,
          extractedId,
          type: "Youtube",
          addedBy: userId,
          title: res.title ?? "Cant find video",
          smallImg:
            (thumbnails.length > 1
              ? thumbnails[thumbnails.length - 2].url
              : thumbnails[thumbnails.length - 1].url) ??
            "https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg",
          bigImg:
            thumbnails[thumbnails.length - 1].url ??
            "https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg",
          spaceId: spaceId,
        },
      });
      // update currentStream
      await Promise.all([
        this.prisma.currentStream.upsert({
          where: {
            spaceId: spaceId,
          },
          update: {
            spaceId: spaceId,
            userId,
            streamId: stream.id,
          },
          create: {
            id: crypto.randomUUID(),
            spaceId: spaceId,
            userId,
            streamId: stream.id,
          },
        }),
        this.prisma.stream.update({
          where: {
            id: stream.id,
          },
          data: {
            played: true,
            playedTs: new Date(),
          },
        }),
      ]);
      this.publishPlayNext(spaceId);
    }
  }

  async adminPlayNext(spaceId: string, userId: string) {
    const creatorId = this.spaces.get(spaceId)?.creatorId;
    console.log("adminPlayNext", creatorId, userId);
    let targetUser = this.users.get(userId);
    if (!targetUser) {
      return;
    }

    if (targetUser.userId !== creatorId) {
      targetUser.ws.forEach((ws) => {
        ws.send(
          JSON.stringify({
            type: "error",
            data: {
              message: "You can't perform this action.",
            },
          })
        );
      });
      return;
    }

    const mostUpvotedStream = await this.prisma.stream.findFirst({
      where: {
        played: false,
        spaceId: spaceId,
      },
      orderBy: {
        upvotes: {
          _count: "desc",
        },
      },
    });

    if (!mostUpvotedStream) {
      targetUser.ws.forEach((ws) => {
        ws.send(
          JSON.stringify({
            type: "error",
            data: {
              message: "Please add video in queue",
            },
          })
        );
      });
      return;
    }

    await Promise.all([
      this.prisma.currentStream.upsert({
        where: {
          spaceId: spaceId,
        },
        update: {
          spaceId: spaceId,
          userId,
          streamId: mostUpvotedStream.id,
        },
        create: {
          spaceId: spaceId,
          userId,
          streamId: mostUpvotedStream.id,
        },
      }),
      this.prisma.stream.update({
        where: {
          id: mostUpvotedStream.id,
        },
        data: {
          played: true,
          playedTs: new Date(),
        },
      }),
    ]);

    this.publishPlayNext(spaceId);
  }

  publishNewVote(
    spaceId: string,
    streamId: string,
    vote: "upvote" | "downvote",
    votedBy: string
  ) {
    console.log(process.pid + " publishNewVote");
    const spaces = this.spaces.get(spaceId);
    spaces?.users.forEach((user, userId) => {
      user?.ws.forEach((ws) => {
        ws.send(
          JSON.stringify({
            type: `new-vote/${spaceId}`,
            data: {
              vote,
              streamId,
              votedBy,
              spaceId,
            },
          })
        );
      });
    });
  }

  async adminCastVote(
    creatorId: string,
    userId: string,
    streamId: string,
    vote: string,
    spaceId: string
  ) {
    console.log(process.pid + " adminCastVote");
    if (vote === "upvote") {
      await this.prisma.upvote.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          streamId,
        },
      });
    } else {
      await this.prisma.upvote.delete({
        where: {
          userId_streamId: {
            userId,
            streamId,
          },
        },
      });
    }

    this.publishNewVote(spaceId, streamId, vote as "upvote" | "downvote", userId);
  }

  async castVote(
    userId: string,
    streamId: string,
    vote: "upvote" | "downvote",
    spaceId: string
  ) {
    console.log(process.pid + " castVote");
    const space = this.spaces.get(spaceId);
    const currentUser = this.users.get(userId);
    const creatorId = this.spaces.get(spaceId)?.creatorId;
    const isCreator = currentUser?.userId === creatorId;

    if (!space || !currentUser) {
      return;
    }
    if (!isCreator) {
      // Removed Redis logic for last voted check
    }

    await this.queue.add("cast-vote", {
      creatorId,
      userId,
      streamId,
      vote,
      spaceId: spaceId,
    });
  }

  publishNewStream(spaceId: string, data: any) {
    console.log(process.pid + ": publishNewStream");
    console.log("Publish New Stream", spaceId);
    const space = this.spaces.get(spaceId);

    if (space) {
      space?.users.forEach((user, userId) => {
        user?.ws.forEach((ws) => {
          ws.send(
            JSON.stringify({
              type: `new-stream/${spaceId}`,
              data: data,
            })
          );
        });
      });
    }
  }

  async adminAddStreamHandler(
    spaceId: string,
    userId: string,
    url: string,
    existingActiveStream: number
  ) {
    console.log(process.pid + " adminAddStreamHandler");
    console.log("adminAddStreamHandler", spaceId);
    const room = this.spaces.get(spaceId);
    const currentUser = this.users.get(userId);
  
    if (!room || typeof existingActiveStream !== "number") {
      return;
    }
  
    const extractedId = getVideoId(url);
  
    if (!extractedId) {
      currentUser?.ws.forEach((ws) => {
        ws.send(
          JSON.stringify({
            type: "error",
            data: { message: "Invalid YouTube URL" },
          })
        );
      });
      return;
    }
  
    const res = await youtubesearchapi.GetVideoDetails(extractedId);
  
    if (res.thumbnail) {
      const thumbnails = res.thumbnail.thumbnails;
      thumbnails.sort((a: { width: number }, b: { width: number }) =>
        a.width < b.width ? -1 : 1
      );
      const stream = await this.prisma.stream.create({
        data: {
          id: crypto.randomUUID(),
          userId: userId,
          url: url,
          extractedId,
          type: "Youtube",
          addedBy: userId,
          title: res.title ?? "Cant find video",
          // smallImg: video.thumbnails.medium.url,
          // bigImg: video.thumbnails.high.url,
          smallImg:
            (thumbnails.length > 1
              ? thumbnails[thumbnails.length - 2].url
              : thumbnails[thumbnails.length - 1].url) ??
            "https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg",
          bigImg:
            thumbnails[thumbnails.length - 1].url ??
            "https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg",
          spaceId: spaceId,
        },
      });
  
      // Removed Redis logic for tracking added time and preventing repeats
  
      this.publishNewStream(spaceId, {
        ...stream,
        hasUpvoted: false,
        upvotes: 0,
      });
    } else {
      currentUser?.ws.forEach((ws) => {
        ws.send(
          JSON.stringify({
            type: "error",
            data: {
              message: "Video not found",
            },
          })
        );
      });
    }
  }
  
  async addToQueue(spaceId: string, currentUserId: string, url: string) {
    console.log(process.pid + ": addToQueue");
  
    const space = this.spaces.get(spaceId);
    const currentUser = this.users.get(currentUserId);
    const creatorId = this.spaces.get(spaceId)?.creatorId;
    const isCreator = currentUserId === creatorId;
  
    if (!space || !currentUser) {
      console.log("433: Room or User not defined");
      return;
    }
  
    if (!isValidYoutubeURL(url)) {
      currentUser?.ws.forEach((ws) => {
        ws.send(
          JSON.stringify({
            type: "error",
            data: { message: "Invalid YouTube URL" },
          })
        );
      });
      return;
    }
  
    let previousQueueLength = await this.prisma.stream.count({
      where: {
        spaceId: spaceId,
        played: false,
      },
    });
  
    if (!isCreator) {
      // Removed Redis logic for rate limiting and preventing repeats
      if (previousQueueLength >= MAX_QUEUE_LENGTH) {
        currentUser.ws.forEach((ws) => {
          ws.send(
            JSON.stringify({
              type: "error",
              data: {
                message: "Queue limit reached",
              },
            })
          );
        });
        return;
      }
    }
  
    await this.queue.add("add-to-queue", {
      spaceId,
      userId: currentUser.userId,
      url,
      existingActiveStream: previousQueueLength,
    });
  }
  
  disconnect(ws: WebSocket) {
    console.log(process.pid + ": disconnect");
    let userId: string | null = null;
    const spaceId = this.wstoSpace.get(ws);
    this.users.forEach((user, id) => {
      const wsIndex = user.ws.indexOf(ws);
  
      if (wsIndex !== -1) {
        userId = id;
        user.ws.splice(wsIndex, 1);
      }
      if (user.ws.length === 0) {
        this.users.delete(id);
      }
    });
  
    if (userId && spaceId) {
      const space = this.spaces.get(spaceId);
      if (space) {
        const updatedUsers = new Map(
          Array.from(space.users).filter(([usrId]) => userId !== usrId)
        );
        this.spaces.set(spaceId, {
          ...space,
          users: updatedUsers,
        });
      }
    }
  }
  }
  
  type User = {
  userId: string;
  ws: WebSocket[];
  token: string;
  };
  
  type Space = {
  creatorId: string;
  users: Map<String, User>;
  };