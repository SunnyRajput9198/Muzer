import React, { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

import YouTubePlayer from "youtube-player";
import Image from "next/image";

type Props = {
  playVideo: boolean;
  currentVideo: Video | null;
  playNextLoader: boolean;
  playNext: () => void;
};

export default function NowPlaying({
  playVideo,
  currentVideo,
  playNext,
  playNextLoader,
}: Props) {
  const videoPlayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!videoPlayerRef.current || !currentVideo) return;

    const player = YouTubePlayer(videoPlayerRef.current);
    player.loadVideoById(currentVideo.extractedId);
    player.playVideo();

    const eventHandler = (event: any) => {
      if (event.data === 0) {
        playNext();
      }
    };

    player.on("stateChange", eventHandler);
    return () => {
      player.destroy();
    };
  }, [currentVideo]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Now Playing</h2>
      <Card className="bg-gray-800 border border-gray-700 shadow-md rounded-xl overflow-hidden">
        <CardContent className="p-4 space-y-3">
          {currentVideo ? (
            playVideo ? (
              <div
                ref={videoPlayerRef}
                className="w-full aspect-video rounded overflow-hidden"
              />
            ) : (
              <>
                <Image
                  height={288}
                  width={512}
                  alt={currentVideo.title}
                  src={currentVideo.bigImg}
                  className="w-full aspect-video object-cover rounded"
                />
                <p className="mt-2 text-center font-semibold text-white text-lg truncate">
                  {currentVideo.title}
                </p>
              </>
            )
          ) : (
            <p className="py-8 text-center text-gray-400">No video playing</p>
          )}
        </CardContent>
      </Card>

      {playVideo && (
       <Button
  disabled={playNextLoader}
  onClick={playNext}
  className="w-full px-6 py-3 text-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center"
>
  <Play className="mr-3 h-5 w-5" />
  {playNextLoader ? "Loading..." : "Play next"}
</Button>

      )}
    </div>
  );
}
