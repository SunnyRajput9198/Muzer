import { WebSocket, WebSocketServer } from "ws";
import cluster from "cluster";
import http from "http";
import dotenv from "dotenv";
import { sendError } from "./utils";
import { verifyAppToken } from "@muzer/auth-utils"; // adjust path if needed

// import os from "os"; // Not used, so commented out

import { RoomManager } from "./StreamManager"; // Assuming this is the correct path
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });
if (!process.env.JWT_SECRET_KEY) {
  console.error("❌ JWT_SECRET_KEY is missing in .env");
  process.exit(1);
}
const cors = 1; // os.cpus().length  // for vertical scaling.  Adjust as needed.

if (cluster.isPrimary) {
  for (let i = 0; i < cors; i++) {
    cluster.fork();
  }

  cluster.on("disconnect", () => {
    process.exit();
  });
} else {
    RoomManager.getInstance(); // Call once to ensure instance is created
  main();
}

type Data = {
  userId: string;
  spaceId: string;
  token: string;
  url: string;
  vote: "upvote" | "downvote";
  streamId: string;
  creatorId: string;
};

function createHttpServer() {
  return http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain");
    res.end("Hello, this is some data from the server!");
  });
}

async function handleConnection(ws: WebSocket) {
  ws.on("message", async (raw:Buffer) => {
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
    RoomManager.getInstance().disconnect(ws);
  });
}

async function handleJoinRoom(ws: WebSocket, data: Partial<Data>) {
  if (!data?.token) {
    console.error("❌ Missing token in join-room message:", data);
    sendError(ws, "Authentication failed: No token provided.");
    ws.close();
    return;
  }

  const decoded = verifyAppToken(data.token,process.env.JWT_SECRET_KEY);
  if (!decoded) {
    console.error("❌ Invalid or expired token.");
    sendError(ws, "Authentication failed: Invalid or expired token.");
    ws.close();
    return;
  }

  const { userId, creatorId } = decoded;
  if (!userId || !creatorId) {
    console.error("❌ Token missing required fields:", decoded);
    sendError(ws, "Authentication failed: Token missing user or creator info.");
    ws.close();
    return;
  }

  console.log("✅ Token verified for user:", userId);

  RoomManager.getInstance().joinRoom(
    data.spaceId!,
    creatorId,
    userId,
    ws,
    data.token
  );
}


async function processUserAction(type: string, data: Data) {
  switch (type) {
    case "cast-vote":
      await RoomManager.getInstance().castVote(
        data.userId,
        data.streamId,
        data.vote,
        data.spaceId
      );
      break;

    case "add-to-queue":
      await RoomManager.getInstance().addToQueue(
        data.spaceId,
        data.userId,
        data.url
      );
      break;

    case "play-next":
      RoomManager.getInstance().adminPlayNext(data.spaceId, data.userId);
      break;

    case "remove-song":
      RoomManager.getInstance().adminRemoveSong(data.spaceId, data.userId, data.streamId);
      break;

    case "empty-queue":
      RoomManager.getInstance().adminEmptyQueue(data.spaceId);
      break;

    default:
      console.warn("Unknown message type:", type);
  }
}
async function handleUserAction(ws: WebSocket, type: string, data: Data) {
 const manager = RoomManager.getInstance();
const actualUserId = manager.wsToUser.get(ws);

if (actualUserId === data.userId) {
  console.log(`✅ Authorized: ${data.userId} for ${type}`);
  await processUserAction(type, data);
} else {
  console.warn(`❌ Unauthorized action (${type}) by user ${data.userId} (expected: ${actualUserId})`);
  sendError(ws, "You are unauthorized to perform this action");
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
  const wss = new WebSocketServer({ server });
  wss.on("connection", (ws, req) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      "http://localhost:3000", // Your Next.js frontend URL
      "http://13.60.242.217:3000",
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
 const PORT = parseInt(process.env.PORT || '8080', 10); // ✅ convert to number

server.listen(PORT, '0.0.0.0', () => {
  console.log(`${process.pid}: WebSocket server is running on ${PORT}`);
});


}