import { WebSocket, WebSocketServer } from "ws";
import cluster from "cluster";
import http from "http";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { sendError } from "./utils";
// import os from "os"; // Not used, so commented out

import { RoomManager } from "./StreamManager"; // Assuming this is the correct path

dotenv.config();
const cors = 1; // os.cpus().length  // for vertical scaling.  Adjust as needed.

if (cluster.isPrimary) {
  for (let i = 0; i < cors; i++) {
    cluster.fork();
  }

  cluster.on("disconnect", () => {
    process.exit();
  });
} else {
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

async function handleJoinRoom(ws: WebSocket, data: Data) {
  console.log("data.token", data.token);
  jwt.verify(
    data.token,
    process.env.NEXTAUTH_SECRET as string,
    (err: any, decoded: any) => {
      if (err) {
        console.error(err);
        sendError(ws, "Token verification failed");
      } else {
        console.log("Decoded Token:", decoded); // Log the entire decoded object
        RoomManager.getInstance().joinRoom(
          data.spaceId,
          decoded.creatorId, // Ensure 'creatorId' exists
          decoded.userId,    // Check if 'userId' is here
          ws,
          data.token
        );
      }
    }
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
      RoomManager.getInstance().enqueuePlayNext(data.spaceId, data.userId);
      break;

    case "remove-song":
      RoomManager.getInstance().enqueueRemoveSong(data);
      break;

    case "empty-queue":
      RoomManager.getInstance().enqueueEmptyQueue(data);
      break;

    case "pay-and-play-next":
      await RoomManager.getInstance().payAndPlayNext(
        data.spaceId,
        data.userId,
        data.url
      );
      break;

    default:
      console.warn("Unknown message type:", type);
  }
}

async function handleUserAction(ws: WebSocket, type: string, data: Data) {
  const user = RoomManager.getInstance().users.get(data.userId);

  if (user) {
    console.log("handleUserAction", data.userId);
    data.userId ;
    await processUserAction(type, data);
  } else {
    sendError(ws, "You are unauthorized to perform this action");
  }
}

async function main() {
  const server = createHttpServer();
  const wss = new WebSocketServer({ server });
  // Removed initRedisClient
  wss.on("connection", (ws, req) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      "http://localhost:3000", // Your Next.js frontend URL
      "http://localhost:8080", // Potentially for testing
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
