"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = void 0;
//@ts-ignore
const youtube_search_api_1 = __importDefault(require("youtube-search-api"));
const client_1 = require("@prisma/client");
const utils_1 = require("./utils");
const TIME_SPAN_FOR_VOTE = 1200000; // 20min
const TIME_SPAN_FOR_QUEUE = 1200000; // 20min
const TIME_SPAN_FOR_REPEAT = 3600000;
const MAX_QUEUE_LENGTH = 20;
class RoomManager {
    constructor() {
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
    createRoom(spaceId, creatorId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(process.pid + ": createRoom: ", { spaceId, creatorId });
            if (!this.spaces.has(spaceId)) {
                this.spaces.set(spaceId, {
                    users: new Map(),
                    creatorId: creatorId,
                });
                this.lastVoted.set(spaceId, new Map());
                this.queueLength.set(spaceId, 0);
                this.lastAdded.set(spaceId, new Map());
                this.blockedSongs.set(spaceId, new Set());
            }
        });
    }
    addUser(userId, ws, token) {
        return __awaiter(this, void 0, void 0, function* () {
            let user = this.users.get(userId);
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
        });
    }
    joinRoom(spaceId, creatorId, userId, ws, token) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Join Room" + spaceId);
            let space = this.spaces.get(spaceId);
            let user = this.users.get(userId);
            if (!space) {
                yield this.createRoom(spaceId, creatorId);
                space = this.spaces.get(spaceId);
            }
            if (!user) {
                yield this.addUser(userId, ws, token);
                user = this.users.get(userId);
            }
            else {
                if (!user.ws.some((existingWs) => existingWs === ws)) {
                    user.ws.push(ws);
                }
            }
            this.wstoSpace.set(ws, spaceId);
            if (space && user) {
                space.users.set(userId, user);
                this.spaces.set(spaceId, Object.assign(Object.assign({}, space), { users: new Map(space.users), creatorId: creatorId }));
            }
        });
    }
    publishEmptyQueue(spaceId) {
        const space = this.spaces.get(spaceId);
        space === null || space === void 0 ? void 0 : space.users.forEach((user, userId) => {
            user === null || user === void 0 ? void 0 : user.ws.forEach((ws) => {
                ws.send(JSON.stringify({
                    type: `empty-queue/${spaceId}`,
                }));
            });
        });
    }
    adminEmptyQueue(spaceId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const room = this.spaces.get(spaceId);
            const userId = (_a = this.spaces.get(spaceId)) === null || _a === void 0 ? void 0 : _a.creatorId;
            const user = this.users.get(userId);
            if (room && user) {
                yield this.prisma.stream.updateMany({
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
        });
    }
    publishRemoveSong(spaceId, streamId) {
        console.log("publishRemoveSong");
        const space = this.spaces.get(spaceId);
        space === null || space === void 0 ? void 0 : space.users.forEach((user, userId) => {
            user === null || user === void 0 ? void 0 : user.ws.forEach((ws) => {
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
    adminRemoveSong(spaceId, userId, streamId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            console.log("adminRemoveSong");
            const user = this.users.get(userId);
            const creatorId = (_a = this.spaces.get(spaceId)) === null || _a === void 0 ? void 0 : _a.creatorId;
            if (user && userId == creatorId) {
                yield this.prisma.stream.delete({
                    where: {
                        id: streamId,
                        spaceId: spaceId,
                    },
                });
                this.publishRemoveSong(spaceId, streamId);
            }
            else {
                user === null || user === void 0 ? void 0 : user.ws.forEach((ws) => {
                    ws.send(JSON.stringify({
                        type: "error",
                        data: {
                            message: "You cant remove the song . You are not the host",
                        },
                    }));
                });
            }
        });
    }
    publishPlayNext(spaceId) {
        const space = this.spaces.get(spaceId);
        space === null || space === void 0 ? void 0 : space.users.forEach((user, userId) => {
            user === null || user === void 0 ? void 0 : user.ws.forEach((ws) => {
                ws.send(JSON.stringify({
                    type: `play-next/${spaceId}`,
                }));
            });
        });
    }
    payAndPlayNext(spaceId, userId, url) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const creatorId = (_a = this.spaces.get(spaceId)) === null || _a === void 0 ? void 0 : _a.creatorId;
            console.log("payAndPlayNext", creatorId, userId);
            let targetUser = this.users.get(userId);
            if (!targetUser || !creatorId) {
                return;
            }
            const extractedId = (0, utils_1.getVideoId)(url);
            if (!extractedId) {
                targetUser === null || targetUser === void 0 ? void 0 : targetUser.ws.forEach((ws) => {
                    ws.send(JSON.stringify({
                        type: "error",
                        data: { message: "Invalid YouTube URL" },
                    }));
                });
                return;
            }
            const res = yield youtube_search_api_1.default.GetVideoDetails(extractedId);
            if (res.thumbnail) {
                const thumbnails = res.thumbnail.thumbnails;
                thumbnails.sort((a, b) => a.width < b.width ? -1 : 1);
                const stream = yield this.prisma.stream.create({
                    data: {
                        id: crypto.randomUUID(),
                        userId: creatorId,
                        url: url,
                        extractedId,
                        type: "Youtube",
                        addedBy: userId,
                        title: (_b = res.title) !== null && _b !== void 0 ? _b : "Cant find video",
                        smallImg: (_c = (thumbnails.length > 1
                            ? thumbnails[thumbnails.length - 2].url
                            : thumbnails[thumbnails.length - 1].url)) !== null && _c !== void 0 ? _c : "https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg",
                        bigImg: (_d = thumbnails[thumbnails.length - 1].url) !== null && _d !== void 0 ? _d : "https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg",
                        spaceId: spaceId,
                    },
                });
                // update currentStream
                yield Promise.all([
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
        });
    }
    adminPlayNext(spaceId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const creatorId = (_a = this.spaces.get(spaceId)) === null || _a === void 0 ? void 0 : _a.creatorId;
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
            const mostUpvotedStream = yield this.prisma.stream.findFirst({
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
            yield Promise.all([
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
        });
    }
    publishNewVote(spaceId, streamId, vote, votedBy) {
        console.log(process.pid + " publishNewVote");
        const spaces = this.spaces.get(spaceId);
        spaces === null || spaces === void 0 ? void 0 : spaces.users.forEach((user, userId) => {
            user === null || user === void 0 ? void 0 : user.ws.forEach((ws) => {
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
    adminCastVote(creatorId, userId, streamId, vote, spaceId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(process.pid + " adminCastVote");
            if (vote === "upvote") {
                yield this.prisma.upvote.create({
                    data: {
                        id: crypto.randomUUID(),
                        userId,
                        streamId,
                    },
                });
            }
            else {
                yield this.prisma.upvote.delete({
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
        });
    }
    castVote(userId, streamId, vote, spaceId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            console.log(process.pid + " castVote");
            const space = this.spaces.get(spaceId);
            const currentUser = this.users.get(userId);
            const creatorId = (_a = this.spaces.get(spaceId)) === null || _a === void 0 ? void 0 : _a.creatorId;
            const isCreator = (currentUser === null || currentUser === void 0 ? void 0 : currentUser.userId) === creatorId;
            if (!space || !currentUser) {
                return;
            }
            if (!isCreator) {
                const spaceVotes = this.lastVoted.get(spaceId);
                const lastVotedTime = spaceVotes === null || spaceVotes === void 0 ? void 0 : spaceVotes.get(userId);
                if (lastVotedTime && new Date().getTime() - lastVotedTime < TIME_SPAN_FOR_VOTE) {
                    currentUser === null || currentUser === void 0 ? void 0 : currentUser.ws.forEach((ws) => {
                        ws.send(JSON.stringify({
                            type: "error",
                            data: {
                                message: "You can vote after 20 mins",
                            },
                        }));
                    });
                    return;
                }
            }
            yield this.adminCastVote(creatorId, userId, streamId, vote, spaceId);
        });
    }
    publishNewStream(spaceId, data) {
        console.log(process.pid + ": publishNewStream");
        console.log("Publish New Stream", spaceId);
        const space = this.spaces.get(spaceId);
        if (space) {
            space === null || space === void 0 ? void 0 : space.users.forEach((user, userId) => {
                user === null || user === void 0 ? void 0 : user.ws.forEach((ws) => {
                    ws.send(JSON.stringify({
                        type: `new-stream/${spaceId}`,
                        data: data,
                    }));
                });
            });
        }
    }
    adminAddStreamHandler(spaceId, userId, url, existingActiveStream) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            console.log(process.pid + " adminAddStreamHandler");
            console.log("adminAddStreamHandler", spaceId);
            const room = this.spaces.get(spaceId);
            const currentUser = this.users.get(userId);
            if (!room || typeof existingActiveStream !== "number") {
                return;
            }
            const extractedId = (0, utils_1.getVideoId)(url);
            if (!extractedId) {
                currentUser === null || currentUser === void 0 ? void 0 : currentUser.ws.forEach((ws) => {
                    ws.send(JSON.stringify({
                        type: "error",
                        data: { message: "Invalid YouTube URL" },
                    }));
                });
                return;
            }
            this.queueLength.set(spaceId, existingActiveStream + 1);
            const res = yield youtube_search_api_1.default.GetVideoDetails(extractedId);
            if (res.thumbnail) {
                const thumbnails = res.thumbnail.thumbnails;
                thumbnails.sort((a, b) => a.width < b.width ? -1 : 1);
                const stream = yield this.prisma.stream.create({
                    data: {
                        id: crypto.randomUUID(),
                        userId: userId,
                        url: url,
                        extractedId,
                        type: "Youtube",
                        addedBy: userId,
                        title: (_a = res.title) !== null && _a !== void 0 ? _a : "Cant find video",
                        smallImg: (_b = (thumbnails.length > 1
                            ? thumbnails[thumbnails.length - 2].url
                            : thumbnails[thumbnails.length - 1].url)) !== null && _b !== void 0 ? _b : "https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg",
                        bigImg: (_c = thumbnails[thumbnails.length - 1].url) !== null && _c !== void 0 ? _c : "https://cdn.pixabay.com/photo/2024/02/28/07/42/european-shorthair-8601492_640.jpg",
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
                this.publishNewStream(spaceId, Object.assign(Object.assign({}, stream), { hasUpvoted: false, upvotes: 0 }));
            }
            else {
                currentUser === null || currentUser === void 0 ? void 0 : currentUser.ws.forEach((ws) => {
                    ws.send(JSON.stringify({
                        type: "error",
                        data: {
                            message: "Video not found",
                        },
                    }));
                });
            }
        });
    }
    addToQueue(spaceId, currentUserId, url) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            console.log(process.pid + ": addToQueue");
            const space = this.spaces.get(spaceId);
            const currentUser = this.users.get(currentUserId);
            const creatorId = (_a = this.spaces.get(spaceId)) === null || _a === void 0 ? void 0 : _a.creatorId;
            const isCreator = currentUserId === creatorId;
            if (!space || !currentUser) {
                console.log("433: Room or User not defined");
                return;
            }
            if (!(0, utils_1.isValidYoutubeURL)(url)) {
                currentUser === null || currentUser === void 0 ? void 0 : currentUser.ws.forEach((ws) => {
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
                const lastAddedTime = spaceLastAdded === null || spaceLastAdded === void 0 ? void 0 : spaceLastAdded.get(currentUserId);
                if (lastAddedTime && new Date().getTime() - lastAddedTime < TIME_SPAN_FOR_QUEUE) {
                    currentUser.ws.forEach((ws) => {
                        ws.send(JSON.stringify({
                            type: "error",
                            data: {
                                message: "You can add again after 20 min.",
                            },
                        }));
                    });
                    return;
                }
                const spaceBlockedSongs = this.blockedSongs.get(spaceId);
                if (spaceBlockedSongs === null || spaceBlockedSongs === void 0 ? void 0 : spaceBlockedSongs.has(url)) {
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
            yield this.adminAddStreamHandler(spaceId, currentUser.userId, url, previousQueueLength);
        });
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
                this.spaces.set(spaceId, Object.assign(Object.assign({}, space), { users: updatedUsers }));
            }
        }
    }
}
exports.RoomManager = RoomManager;
