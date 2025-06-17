import { YT_REGEX } from "@/lib/utils";
import { useSocket } from "@/context/socket-context";
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import LiteYouTubeEmbed from "react-lite-youtube-embed";

type Props = {
  inputLink: string;
  creatorId: string;
  userId: string;
  setLoading: (value: boolean) => void;
  setInputLink: (value: string) => void;
  loading: boolean;
  enqueueToast: (type: "error" | "success", message: string) => void;
  spaceId: string;
  isSpectator: boolean;
};

export default function AddSongForm({
  inputLink,
  enqueueToast,
  setInputLink,
  loading,
  setLoading,
  userId,
  spaceId,
  isSpectator,
}: Props) {
  const { sendMessage } = useSocket();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputLink.match(YT_REGEX)) {
      setLoading(true);
      sendMessage("add-to-queue", {
        spaceId,
        userId,
        url: inputLink,
      });
    } else {
      enqueueToast("error", "Invalid link. Please use a valid YouTube URL.");
    }
    setLoading(false);
    setInputLink("");
  };

  const videoId = inputLink ? inputLink.match(YT_REGEX)?.[1] : undefined;

  return (
    <div className="space-y-6 bg-[#2c2c2c] rounded-xl shadow-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Add a Song</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          type="text"
          placeholder="Paste YouTube link here"
          value={inputLink}
          onChange={(e) => setInputLink(e.target.value)}
          className="bg-gray-800 text-white placeholder-gray-400 border border-gray-600 focus:ring-2 focus:ring-purple-600"
        />
        <Button
          disabled={loading}
          onClick={handleSubmit}
          type="submit"
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold transition-colors"
        >
          {loading ? "Loading..." : "Add to Queue"}
        </Button>
      </form>

      {videoId && !loading && (
        <Card className="bg-gray-900 border border-gray-700">
          <CardContent className="p-4">
            <LiteYouTubeEmbed
              id={videoId}
              title="YouTube Preview"
              wrapperClass="yt-lite rounded-md overflow-hidden"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
