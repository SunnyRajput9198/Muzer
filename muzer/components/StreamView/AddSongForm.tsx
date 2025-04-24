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
//Sure! This component, AddSongForm, is a React form for adding YouTube songs to a music queue within a "Space" in your app.
//  It uses a YouTube link, validates it, sends it to the backend using WebSockets, and even previews the video.
export default function AddSongForm({
  inputLink,//this is the input link that the user enters in the form.
  enqueueToast,//// Used to show a toast message
  setInputLink,//this is the function that updates the input link state.
  loading,             // Whether request is in progress
  setLoading,//this is the function that updates the loading state.
  userId,//this is the user id of the current user.
  spaceId,//this is the space id of the current space.
  isSpectator, // Whether user is just viewing
}: Props) {
  const { sendMessage } = useSocket();

  //Validates YouTube link using YT_REGEX.
// Sends a WebSocket event "add-to-queue" with the video URL and user/space data.
// Shows an error toast if invalid.
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
//Extracts video ID from link using regex.
  const videoId = inputLink ? inputLink.match(YT_REGEX)?.[1] : undefined;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Add a song</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <Input
          type="text"
          placeholder="Please paste your link"
          value={inputLink}
          onChange={(e) => setInputLink(e.target.value)}
        />
        <Button
          disabled={loading}
          onClick={handleSubmit}
          type="submit"
          className="w-full"
        >
          {loading ? "Loading..." : "Add to Queue"}
        </Button>
      </form>
      {/* Renders a preview player only when a valid video is detected and loading is false. */}
      {videoId && !loading && (
        <Card>
          <CardContent className="p-4">
            <LiteYouTubeEmbed title="" id={videoId} />
          </CardContent>
        </Card>
      )}
    </>
  );
}

