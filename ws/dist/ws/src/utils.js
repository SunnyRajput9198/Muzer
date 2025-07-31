"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVideoId = exports.isValidYoutubeURL = void 0;
exports.sendError = sendError;
const YT_REGEX = /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?(.+))?$/;
const isValidYoutubeURL = (data) => {
    return data.match(YT_REGEX);
};
exports.isValidYoutubeURL = isValidYoutubeURL;
const getVideoId = (url) => {
    return url.match(YT_REGEX)?.[1];
};
exports.getVideoId = getVideoId;
function sendError(ws, message) {
    ws.send(JSON.stringify({ type: "error", data: { message } }));
}
