"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const cluster_1 = __importDefault(require("cluster"));
const http_1 = __importDefault(require("http"));
const dotenv_1 = __importDefault(require("dotenv"));
const utils_1 = require("./utils");
const auth_utils_1 = require("@muzer/auth-utils"); // adjust path if needed
// import os from "os"; // Not used, so commented out
const StreamManager_1 = require("./StreamManager"); // Assuming this is the correct path
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../.env") });
if (!process.env.JWT_SECRET_KEY) {
    console.error("❌ JWT_SECRET_KEY is missing in .env");
    process.exit(1);
}
const cors = 1; // os.cpus().length  // for vertical scaling.  Adjust as needed.
if (cluster_1.default.isPrimary) {
    for (let i = 0; i < cors; i++) {
        cluster_1.default.fork();
    }
    cluster_1.default.on("disconnect", () => {
        process.exit();
    });
}
else {
    StreamManager_1.RoomManager.getInstance(); // Call once to ensure instance is created
    main();
}
function createHttpServer() {
    return http_1.default.createServer((req, res) => {
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/plain");
        res.end("Hello, this is some data from the server!");
    });
}
async function handleConnection(ws) {
    ws.on("message", async (raw) => {
        const { type, data } = JSON.parse(raw.toString()) || {};
        console.log("Received message:", { type, data }); // Log the incoming data
        switch (type) {
            case "join-room":
                await handleJoinRoom(ws, data);
                break;
            default:
                await handleUserAction(ws, type, data);
        }
    });
    ws.on("close", () => {
        StreamManager_1.RoomManager.getInstance().disconnect(ws);
    });
}
async function handleJoinRoom(ws, data) {
    if (!data?.token) {
        console.error("❌ Missing token in join-room message:", data);
        (0, utils_1.sendError)(ws, "Authentication failed: No token provided.");
        ws.close();
        return;
    }
    const decoded = (0, auth_utils_1.verifyAppToken)(data.token, process.env.JWT_SECRET_KEY);
    if (!decoded) {
        console.error("❌ Invalid or expired token.");
        (0, utils_1.sendError)(ws, "Authentication failed: Invalid or expired token.");
        ws.close();
        return;
    }
    const { userId, creatorId } = decoded;
    if (!userId || !creatorId) {
        console.error("❌ Token missing required fields:", decoded);
        (0, utils_1.sendError)(ws, "Authentication failed: Token missing user or creator info.");
        ws.close();
        return;
    }
    console.log("✅ Token verified for user:", userId);
    StreamManager_1.RoomManager.getInstance().joinRoom(data.spaceId, creatorId, userId, ws, data.token);
}
async function processUserAction(type, data) {
    switch (type) {
        case "cast-vote":
            await StreamManager_1.RoomManager.getInstance().castVote(data.userId, data.streamId, data.vote, data.spaceId);
            break;
        case "add-to-queue":
            await StreamManager_1.RoomManager.getInstance().addToQueue(data.spaceId, data.userId, data.url);
            break;
        case "play-next":
            StreamManager_1.RoomManager.getInstance().adminPlayNext(data.spaceId, data.userId);
            break;
        case "remove-song":
            StreamManager_1.RoomManager.getInstance().adminRemoveSong(data.spaceId, data.userId, data.streamId);
            break;
        case "empty-queue":
            StreamManager_1.RoomManager.getInstance().adminEmptyQueue(data.spaceId);
            break;
        default:
            console.warn("Unknown message type:", type);
    }
}
async function handleUserAction(ws, type, data) {
    const manager = StreamManager_1.RoomManager.getInstance();
    const actualUserId = manager.wsToUser.get(ws);
    if (actualUserId === data.userId) {
        console.log(`✅ Authorized: ${data.userId} for ${type}`);
        await processUserAction(type, data);
    }
    else {
        console.warn(`❌ Unauthorized action (${type}) by user ${data.userId} (expected: ${actualUserId})`);
        (0, utils_1.sendError)(ws, "You are unauthorized to perform this action");
    }
}
async function main() {
    // const roomManager = RoomManager.getInstance(); // No longer explicitly calling initRedisClient
    // try {
    //   // Removed: await roomManager.initRedisClient();
    //   // Removed: console.log(`${process.pid}: Redis clients connected successfully.`);
    // } catch (error) {
    //   // Removed: console.error(`${process.pid}: Failed to connect to Redis:`, error);
    //   // Removed: process.exit(1);
    // }
    const server = createHttpServer();
    const wss = new ws_1.WebSocketServer({ server });
    wss.on("connection", (ws, req) => {
        const origin = req.headers.origin;
        const allowedOrigins = [
            "http://localhost:3000", // Your Next.js frontend URL
            // "https://muzer.world", // Your Next.js frontend URL
            // "http://localhost:8080", // Potentially for testing
            // Add any other allowed origins here
        ];
        if (origin && !allowedOrigins.includes(origin)) {
            console.warn(`Connection rejected from origin: ${origin}`);
            ws.close(); // Reject the connection if the origin is not allowed
            return;
        }
        console.log("Client connected from:", origin);
        handleConnection(ws);
    });
    const PORT = process.env.PORT ?? 8080;
    server.listen(PORT, () => {
        console.log(`${process.pid}: WebSocket server is running on ${PORT}`);
    });
}
