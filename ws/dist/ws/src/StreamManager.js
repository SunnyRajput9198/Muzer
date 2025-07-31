"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = void 0;
//@ts-ignore
const youtube_search_api_1 = __importDefault(require("youtube-search-api"));
const client_1 = require("@prisma/client");
const utils_1 = require("./utils");
const TIME_SPAN_FOR_VOTE = 12000; // 12sec
const TIME_SPAN_FOR_QUEUE = 60000; // 60sec
const TIME_SPAN_FOR_REPEAT = 3600000;
const MAX_QUEUE_LENGTH = 40;
class RoomManager {
    constructor() {
        this.wsToUser = new Map(); // Add this
        this.spaces = new Map();
        this.users = new Map();
        this.prisma = new client_1.PrismaClient();
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
    async createRoom(spaceId, creatorId) {
        if (!this.spaces.has(spaceId)) {
            this.spaces.set(spaceId, {
                users: new Map(),
                creatorId,
            });
            this.lastVoted.set(spaceId, new Map());
            this.queueLength.set(spaceId, 0);
            this.lastAdded.set(spaceId, new Map());
            this.blockedSongs.set(spaceId, new Set());
            console.log(`✅ Room created with creatorId: ${creatorId}`);
        }
    }
    async addUser(userId, ws, token) {
        let user = this.users.get(userId);
        this.wsToUser.set(ws, userId); // Track which user a WebSocket belongs to
        if (!user) {
            this.users.set(userId, {
                userId,
                ws: [ws],
                token,
            });
        }
        else {
            if (!user.ws.some((existingWs) => existingWs === ws)) {
                user.ws.push(ws);
            }
        }
    }
    async joinRoom(spaceId, creatorId, userId, ws, token) {
        console.log("Join Room" + spaceId);
        let space = this.spaces.get(spaceId);
        let user = this.users.get(userId);
        if (!space) {
            await this.createRoom(spaceId, creatorId);
            space = this.spaces.get(spaceId);
        }
        await this.addUser(userId, ws, token); // Always call this
        user = this.users.get(userId); // Then get updated user
        this.wstoSpace.set(ws, spaceId);
        if (space && user) {
            space.users.set(userId, user);
            this.spaces.set(spaceId, {
                ...space,
                users: new Map(space.users),
                creatorId: space.creatorId ?? creatorId, // 👈 Fix: preserve existing creatorId
            });
            console.log(`👑 creatorId in space ${spaceId}:`, this.spaces.get(spaceId)?.creatorId);
        }
    }
    publishEmptyQueue(spaceId) {
        const space = this.spaces.get(spaceId);
        space?.users.forEach((user, userId) => {
            user?.ws.forEach((ws) => {
                ws.send(JSON.stringify({
                    type: `empty-queue/${spaceId}`,
                }));
            });
        });
    }
    async adminEmptyQueue(spaceId) {
        const room = this.spaces.get(spaceId);
        const userId = this.spaces.get(spaceId)?.creatorId;
        const user = this.users.get(userId);
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
    publishRemoveSong(spaceId, streamId) {
        console.log("publishRemoveSong");
        const space = this.spaces.get(spaceId);
        space?.users.forEach((user, userId) => {
            user?.ws.forEach((ws) => {
                ws.send(JSON.stringify({
                    type: `remove-song/${spaceId}`,
                    data: {
                        streamId,
                        spaceId,
                    },
                }));
            });
        });
    }
    async adminRemoveSong(spaceId, userId, streamId) {
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
        }
        else {
            user?.ws.forEach((ws) => {
                ws.send(JSON.stringify({
                    type: "error",
                    data: {
                        message: "You cant remove the song . You are not the host",
                    },
                }));
            });
        }
    }
    publishPlayNext(spaceId) {
        const space = this.spaces.get(spaceId);
        space?.users.forEach((user, userId) => {
            user?.ws.forEach((ws) => {
                ws.send(JSON.stringify({
                    type: `play-next/${spaceId}`,
                }));
            });
        });
    }
    async adminPlayNext(spaceId, userId) {
        const creatorId = this.spaces.get(spaceId)?.creatorId;
        console.log("adminPlayNext", creatorId, userId);
        let targetUser = this.users.get(userId);
        if (!targetUser) {
            return;
        }
        if (targetUser.userId !== creatorId) {
            targetUser.ws.forEach((ws) => {
                ws.send(JSON.stringify({
                    type: "error",
                    data: {
                        message: "You can't perform this action.",
                    },
                }));
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
                ws.send(JSON.stringify({
                    type: "error",
                    data: {
                        message: "Please add video in queue",
                    },
                }));
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
    publishNewVote(spaceId, streamId, vote, votedBy) {
        console.log(process.pid + " publishNewVote");
        const spaces = this.spaces.get(spaceId);
        spaces?.users.forEach((user, userId) => {
            user?.ws.forEach((ws) => {
                ws.send(JSON.stringify({
                    type: `new-vote/${spaceId}`,
                    data: {
                        vote,
                        streamId,
                        votedBy,
                        spaceId,
                    },
                }));
            });
        });
    }
    async persistVote(creatorId, userId, streamId, vote, spaceId) {
        console.log(process.pid + " adminCastVote");
        if (vote === "upvote") {
            await this.prisma.upvote.create({
                data: {
                    id: crypto.randomUUID(),
                    userId,
                    streamId,
                },
            });
        }
        else {
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
        this.publishNewVote(spaceId, streamId, vote, userId);
    }
    async castVote(userId, streamId, vote, spaceId) {
        console.log(process.pid + " castVote");
        const space = this.spaces.get(spaceId);
        const currentUser = this.users.get(userId);
        const creatorId = space?.creatorId;
        if (!space || !currentUser)
            return;
        // 🧠 Validate stream belongs to this space
        const stream = await this.prisma.stream.findFirst({
            where: {
                id: streamId,
                spaceId: spaceId,
            },
        });
        if (!stream) {
            currentUser.ws.forEach((ws) => {
                ws.send(JSON.stringify({
                    type: "error",
                    data: {
                        message: "Stream not found in this space.",
                    },
                }));
            });
            return;
        }
        // 🧠 Rate limit (20 min) for non-creator users
        let spaceVotes = this.lastVoted.get(spaceId);
        if (!spaceVotes) {
            spaceVotes = new Map();
            this.lastVoted.set(spaceId, spaceVotes);
        }
        const lastVotedTime = spaceVotes.get(userId);
        const now = Date.now();
        const isCreator = userId === creatorId;
        if (!isCreator && lastVotedTime && now - lastVotedTime < TIME_SPAN_FOR_VOTE) {
            currentUser.ws.forEach((ws) => {
                ws.send(JSON.stringify({
                    type: "error",
                    data: {
                        message: "You can vote again after 12 seconds.",
                    },
                }));
            });
            return;
        }
        spaceVotes.set(userId, now);
        // ✅ All users (including admin) vote using this
        await this.persistVote(creatorId, userId, streamId, vote, spaceId);
    }
    publishNewStream(spaceId, data) {
        console.log(process.pid + ": publishNewStream");
        console.log("Publish New Stream", spaceId);
        const space = this.spaces.get(spaceId);
        if (space) {
            space?.users.forEach((user, userId) => {
                user?.ws.forEach((ws) => {
                    ws.send(JSON.stringify({
                        type: `new-stream/${spaceId}`,
                        data: data,
                    }));
                });
            });
        }
    }
    async adminAddStreamHandler(spaceId, userId, url, existingActiveStream) {
        console.log(process.pid + " adminAddStreamHandler");
        console.log("adminAddStreamHandler", spaceId);
        const room = this.spaces.get(spaceId);
        const currentUser = this.users.get(userId);
        if (!room || typeof existingActiveStream !== "number") {
            return;
        }
        const extractedId = (0, utils_1.getVideoId)(url);
        if (!extractedId) {
            currentUser?.ws.forEach((ws) => {
                ws.send(JSON.stringify({
                    type: "error",
                    data: { message: "Invalid YouTube URL" },
                }));
            });
            return;
        }
        this.queueLength.set(spaceId, existingActiveStream + 1);
        const res = await youtube_search_api_1.default.GetVideoDetails(extractedId);
        if (res.thumbnail) {
            const thumbnails = res.thumbnail.thumbnails;
            thumbnails.sort((a, b) => a.width < b.width ? -1 : 1);
            const stream = await this.prisma.stream.create({
                data: {
                    id: crypto.randomUUID(),
                    userId: userId,
                    url: url,
                    extractedId,
                    type: "Youtube",
                    addedBy: userId,
                    title: res.title ?? "Cant find video",
                    smallImg: (thumbnails.length > 1
                        ? thumbnails[thumbnails.length - 2].url
                        : thumbnails[thumbnails.length - 1].url) ??
                        "https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg",
                    bigImg: thumbnails[thumbnails.length - 1].url ??
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
        }
        else {
            currentUser?.ws.forEach((ws) => {
                ws.send(JSON.stringify({
                    type: "error",
                    data: {
                        message: "Video not found",
                    },
                }));
            });
        }
    }
    async addToQueue(spaceId, currentUserId, url) {
        console.log(process.pid + ": addToQueue");
        const space = this.spaces.get(spaceId);
        const currentUser = this.users.get(currentUserId);
        const creatorId = this.spaces.get(spaceId)?.creatorId;
        const isCreator = currentUserId === creatorId;
        if (!space || !currentUser) {
            console.log("433: Room or User not defined");
            return;
        }
        if (!(0, utils_1.isValidYoutubeURL)(url)) {
            currentUser?.ws.forEach((ws) => {
                ws.send(JSON.stringify({
                    type: "error",
                    data: { message: "Invalid YouTube URL" },
                }));
            });
            return;
        }
        let previousQueueLength = this.queueLength.get(spaceId) || 0;
        if (!isCreator) {
            const spaceLastAdded = this.lastAdded.get(spaceId);
            const lastAddedTime = spaceLastAdded?.get(currentUserId);
            if (lastAddedTime && new Date().getTime() - lastAddedTime < TIME_SPAN_FOR_QUEUE) {
                currentUser.ws.forEach((ws) => {
                    ws.send(JSON.stringify({
                        type: "error",
                        data: {
                            message: "You can add again after 1 minute.",
                        },
                    }));
                });
                return;
            }
            const spaceBlockedSongs = this.blockedSongs.get(spaceId);
            if (spaceBlockedSongs?.has(url)) {
                currentUser.ws.forEach((ws) => {
                    ws.send(JSON.stringify({
                        type: "error",
                        data: {
                            message: "This song is blocked for 1 hour",
                        },
                    }));
                });
                return;
            }
            if (previousQueueLength >= MAX_QUEUE_LENGTH) {
                currentUser.ws.forEach((ws) => {
                    ws.send(JSON.stringify({
                        type: "error",
                        data: {
                            message: "Queue limit reached",
                        },
                    }));
                });
                return;
            }
        }
        await this.adminAddStreamHandler(spaceId, currentUser.userId, url, previousQueueLength);
    }
    disconnect(ws) {
        console.log(process.pid + ": disconnect");
        let userId = null;
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
                const updatedUsers = new Map(Array.from(space.users).filter(([usrId]) => userId !== usrId));
                this.spaces.set(spaceId, {
                    ...space,
                    users: updatedUsers,
                });
            }
        }
        this.wsToUser.delete(ws); // Clean up mapping
    }
}
exports.RoomManager = RoomManager;
