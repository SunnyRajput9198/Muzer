import WebSocket from "ws";
//@ts-ignore
import youtubesearchapi from "youtube-search-api";
import { PrismaClient } from "@prisma/client";
import { getVideoId, isValidYoutubeURL } from "./utils";

const TIME_SPAN_FOR_VOTE = 1200000; // 20min
const TIME_SPAN_FOR_QUEUE = 1200000; // 20min
const TIME_SPAN_FOR_REPEAT = 3600000;
const MAX_QUEUE_LENGTH = 20;

export class RoomManager {
  private static instance: RoomManager;
  public spaces: Map<string, Space>;
  public users: Map<string, User>;
  public prisma: PrismaClient;
  public wstoSpace: Map<WebSocket, string>;
  private lastVoted: Map<string, Map<string, number>>; // spaceId -> userId -> timestamp
  private queueLength: Map<string, number>; // spaceId -> length
  private lastAdded: Map<string, Map<string, number>>; // spaceId -> userId -> timestamp
  private blockedSongs: Map<string, Set<string>>; // spaceId -> Set of URLs
  private actionQueue: any[] = []; // Example: simple array for the queue

  private constructor() {
    this.spaces = new Map();
    this.users = new Map();
    this.prisma = new PrismaClient();
    this.wstoSpace = new Map();
    this.lastVoted = new Map();
    this.queueLength = new Map();
    this.lastAdded = new Map();
    this.blockedSongs = new Map();
  }

  static getInstance() {
    if (!RoomManager.instance) {
      RoomManager.instance = new RoomManager();
    }
    return RoomManager.instance;
  }

  async createRoom(spaceId: string, creatorId: string) {
    console.log(process.pid + ": createRoom: ", { spaceId, creatorId });
    if (!this.spaces.has(spaceId)) {
      this.spaces.set(spaceId, {
        users: new Map<string, User>(),
        creatorId: creatorId,
      });
      this.lastVoted.set(spaceId, new Map());
      this.queueLength.set(spaceId, 0);
      this.lastAdded.set(spaceId, new Map());
      this.blockedSongs.set(spaceId, new Set());
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
      await this.createRoom(spaceId, creatorId);
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
  private async processQueue() {
    while (this.actionQueue.length > 0) {
      const action = this.actionQueue.shift();
      switch (action?.type) {
        case 'play-next':
          await this.adminPlayNext(action.spaceId, action.userId);
          break;
        case 'remove-song':
          await this.adminRemoveSong(action.data.spaceId, action.data.userId, action.data.streamId);
          break;
        case 'empty-queue':
          await this.adminEmptyQueue(action.data.spaceId);
          break;
        // Add other cases as needed
      }
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
      this.queueLength.set(spaceId, 0);
      this.publishEmptyQueue(spaceId);
    }
  }

  enqueuePlayNext(spaceId: string, userId: string) {
    this.actionQueue.push({ type: 'play-next', spaceId, userId });
    this.processQueue(); // Or trigger processing at a different point
  }

  enqueueRemoveSong(data: any) {
    this.actionQueue.push({ type: 'remove-song', data });
    this.processQueue();
  }

  enqueueEmptyQueue(data: any) {
    this.actionQueue.push({ type: 'empty-queue', data });
    this.processQueue();
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

    const currentQueueLength = this.queueLength.get(spaceId) || 1;
    this.queueLength.set(spaceId, currentQueueLength - 1);

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
    const spaceVotes = this.lastVoted.get(spaceId);
    if (spaceVotes) {
      spaceVotes.set(userId, new Date().getTime());
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
      const spaceVotes = this.lastVoted.get(spaceId);
      const lastVotedTime = spaceVotes?.get(userId);

      if (lastVotedTime && new Date().getTime() - lastVotedTime < TIME_SPAN_FOR_VOTE) {
        currentUser?.ws.forEach((ws) => {
          ws.send(
            JSON.stringify({
              type: "error",
              data: {
                message: "You can vote after 20 mins",
              },
            })
          );
        });
        return;
      }
    }

    await this.adminCastVote(creatorId as string, userId, streamId, vote, spaceId);
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

    this.queueLength.set(spaceId, existingActiveStream + 1);

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

      const spaceBlockedSongs = this.blockedSongs.get(spaceId);
      if (spaceBlockedSongs) {
        spaceBlockedSongs.add(url);
      }

      const spaceLastAdded = this.lastAdded.get(spaceId);
      if (spaceLastAdded) {
        spaceLastAdded.set(userId, new Date().getTime());
      }

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

    let previousQueueLength = this.queueLength.get(spaceId) || 0;

    if (!isCreator) {
      const spaceLastAdded = this.lastAdded.get(spaceId);
      const lastAddedTime = spaceLastAdded?.get(currentUserId);

      if (lastAddedTime && new Date().getTime() - lastAddedTime < TIME_SPAN_FOR_QUEUE) {
        currentUser.ws.forEach((ws) => {
          ws.send(
            JSON.stringify({
              type: "error",
              data: {
                message: "You can add again after 20 min.",
              },
            })
          );
        });
        return;
      }

      const spaceBlockedSongs = this.blockedSongs.get(spaceId);
      if (spaceBlockedSongs?.has(url)) {
        currentUser.ws.forEach((ws) => {
          ws.send(
            JSON.stringify({
              type: "error",
              data: {
                message: "This song is blocked for 1 hour",
              },
            })
          );
        });
        return;
      }

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

    await this.adminAddStreamHandler(spaceId, currentUser.userId, url, previousQueueLength);
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