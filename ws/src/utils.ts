import { WebSocket } from "ws";

const YT_REGEX =
/^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?(.+))?$/;

export const isValidYoutubeURL = (data: string) => {
  return data.match(YT_REGEX);
};
 
export const getVideoId = (url: string) => {
  return url.match(YT_REGEX)?.[1];
};

export function sendError(ws: WebSocket, message: string) {
  ws.send(JSON.stringify({ type: "error", data: { message } }));
}