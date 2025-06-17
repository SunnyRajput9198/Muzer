"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronUp, ChevronDown, Share2, Play, Trash2, X, MessageCircle, Instagram, Twitter } from "lucide-react";
import { toast } from "sonner";
import Appbar from "./Appbar";
import LiteYouTubeEmbed from "react-lite-youtube-embed";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";
import { YT_REGEX } from "../lib/utils";
import YouTubePlayer from "youtube-player";
import type { Session } from "next-auth";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
interface Video {
  id: string;
  type: string;
  url: string;
  extractedId: string;
  title: string;
  smallImg: string;
  bigImg: string;
  active: boolean;
  userId: string;
  upvotes: number;
  haveUpvoted: boolean;
  spaceId: string
}


const REFRESH_INTERVAL_MS = 10 * 1000;

export default function StreamView({
  creatorId,
  playVideo = false,
  spaceId
}: {
  creatorId: string;
  playVideo: boolean;
  spaceId: string;
}) {
  const [inputLink, setInputLink] = useState("");//inputLink: Tracks the YouTube link entered by the user to add a video to the queue.
  const [queue, setQueue] = useState<Video[]>([]);//queue: Holds the list of YouTube videos in the queue.
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);//currentVideo: Stores the video that is currently being played
  const [loading, setLoading] = useState(false);//loading: A boolean state that indicates whether the video is loading.
  const [playNextLoader, setPlayNextLoader] = useState(false);//playNextLoader: A boolean state that indicates whether the next video is loading.
  const videoPlayerRef = useRef<HTMLDivElement>(null);//videoPlayerRef: A reference to the video player element.
  const [isCreator, setIsCreator] = useState(false);//isCreator: A boolean state that indicates whether the user is the creator of the space.
  const [isEmptyQueueDialogOpen, setIsEmptyQueueDialogOpen] = useState(false);//isEmptyQueueDialogOpen: A boolean state that controls the visibility of the empty queue dialog.
  const [spaceName, setSpaceName] = useState("")//spaceName: The name of the space.
  const [isOpen, setIsOpen] = useState(false);//isOpen: A boolean state that controls the visibility of the dropdown menu.

  //refreshStreams: Fetches the current streams (videos) from the server and updates the queue.
  //  It also checks if the user is the creator and updates the space name.
  async function refreshStreams() {
    try {
      const res = await fetch(`/api/streams/?spaceId=${spaceId}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (json.streams && Array.isArray(json.streams)) {
        setQueue(
          json.streams.length > 0
            ? json.streams.sort((a: Video, b: Video) => b.upvotes - a.upvotes)
            : [],
        );
      } else {
        setQueue([]);
      }

      setCurrentVideo((video) => {
        if (video?.id === json.activeStream?.stream?.id) {
          return video;
        }
        return json.activeStream?.stream || null;
      });


      setIsCreator(json.isCreator);
      setSpaceName(json.spaceName)
    } catch (error) {
      console.error("Error refreshing streams:", error);
      setQueue([]);
      setCurrentVideo(null);
    }
  }
  //useEffect (on component mount): Automatically fetches stream data and sets up a polling interval (setInterval) to refresh streams every 10 seconds
  useEffect(() => {
    refreshStreams();
    const interval = setInterval(refreshStreams, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [spaceId]);

  useEffect(() => {
    if (!videoPlayerRef.current || !currentVideo) return;

    const player = YouTubePlayer(videoPlayerRef.current);
    player.loadVideoById(currentVideo.extractedId);
    player.playVideo();

    const eventHandler = (event: { data: number }) => {
      if (event.data === 0) {
        playNext();
      }
    };
    player.on("stateChange", eventHandler);

    return () => {
      player.destroy();
    };
  }, [currentVideo, videoPlayerRef]);

  //handleSubmit: Handles the form submission to add a YouTube link to the queue. It validates the URL and sends a POST request to add the video.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputLink.trim()) {
      toast.error("YouTube link cannot be empty");
      return;
    }
    if (!inputLink.match(YT_REGEX)) {
      toast.error("Invalid YouTube URL format");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/streams/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creatorId,
          url: inputLink,
          spaceId: spaceId
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "An error occurred");
      }
      setQueue([...queue, data]);
      setInputLink("");
      toast.success("Song added to queue successfully");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };
  //handleVote: Allows the user to upvote or downvote a video in the queue, and updates the list accordingly.
  const handleVote = (id: string, isUpvote: boolean) => {
    setQueue(
      queue
        .map((video) =>
          video.id === id
            ? {
              ...video,
              upvotes: isUpvote ? video.upvotes + 1 : video.upvotes - 1,
              haveUpvoted: !video.haveUpvoted,
            }
            : video,
        )
        .sort((a, b) => b.upvotes - a.upvotes),
    );

    fetch(`/api/streams/${isUpvote ? "upvote" : "downvote"}`, {
      method: "POST",
      body: JSON.stringify({
        streamId: id,
        spaceId: spaceId
      }),
    });
  };
  //playNext: Moves to the next video in the queue, removing the current one, and updating the UI.

  const playNext = async () => {
    if (queue.length > 0) {
      try {
        setPlayNextLoader(true);
        const data = await fetch(`/api/streams/next?spaceId=${spaceId}`, {
          method: "GET",
        });
        const json = await data.json();
        setCurrentVideo(json.stream);
        setQueue((q) => q.filter((x) => x.id !== json.stream?.id));
      } catch (e) {
        console.error("Error playing next song:", e);
      } finally {
        setPlayNextLoader(false);
      }
    }
  };
  //handleShare: Handles the sharing functionality for the current video. It takes a platform as a parameter and generates a shareable link based on the current space ID.
  const handleShare = (platform: 'whatsapp' | 'twitter' | 'instagram' | 'clipboard') => {
    const shareableLink = `${window.location.hostname}/spaces/${spaceId}`

    if (platform === 'clipboard') {
      navigator.clipboard.writeText(shareableLink).then(() => {
        toast.success('Link copied to clipboard!')
      }).catch((err) => {
        console.error('Could not copy text: ', err)
        toast.error('Failed to copy link. Please try again.')
      })
    } else {
      let url
      switch (platform) {
        case 'whatsapp':
          url = `https://wa.me/?text=${encodeURIComponent(shareableLink)}`
          break
        case 'twitter':
          url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareableLink)}`
          break
        case 'instagram':
          // Instagram doesn't allow direct URL sharing, so we copy the link instead
          navigator.clipboard.writeText(shareableLink)
          toast.success('Link copied for Instagram sharing!')
          return
        default:
          return
      }
      window.open(url, '_blank')
    }
  }
  //emptyQueue: Clears the queue and removes all videos from the queue.
  const emptyQueue = async () => {
    try {
      const res = await fetch("/api/streams/empty-queue", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spaceId: spaceId
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        refreshStreams();
        setIsEmptyQueueDialogOpen(false);
      } else {
        toast.error(data.message || "Failed to empty queue");
      }
    } catch (error) {
      console.error("Error emptying queue:", error);
      toast.error("An error occurred while emptying the queue");
    }
  };
  //removeSong: Removes a specific song from the queue. This function is only accessible to the creator.
  const removeSong = async (streamId: string) => {
    try {
      const res = await fetch(`/api/streams/remove?streamId=${streamId}&spaceId=${spaceId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Song removed successfully");
        refreshStreams();
      } else {
        toast.error("Failed to remove song");
      }
    } catch (error) {
      toast.error("An error occurred while removing the song");
    }
  };
  return (
    <div className="flex flex-col min-h-screen bg-[#121212] text-gray-200">
      <Appbar />
      <div className='mx-auto text-2xl bg-gradient-to-r rounded-lg from-indigo-600 to-violet-800 font-bold'>
        {spaceName}
      </div>
      <div className="flex justify-center px-5 md:px-10 xl:px-20">
        <div className="grid grid-cols-1 gap-y-5 lg:gap-x-5 lg:grid-cols-5 w-screen py-5 lg:py-8">
          <div className="col-span-3 order-2 lg:order-1">
            <div className="flex flex-col md:flex-row justify-between mb-4">
              <h2 className="text-2xl font-bold text-white mb-2 md:mb-0">
                Upcoming Songs
              </h2>
              <div className="flex space-x-2">
                <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button onClick={() => setIsOpen(true)} className="bg-purple-700 hover:bg-purple-800 text-white">
                      <Share2 className="mr-2 h-4 w-4" /> Share
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent className="w-48 sm:max-w-md">
                    <DropdownMenuLabel>Share to Social Media</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleShare('whatsapp')}>
                      <div className="flex items-center space-x-2">
                        <MessageCircle className="h-6 w-6 text-green-500" />
                        <span>WhatsApp</span>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => handleShare('twitter')}>
                      <div className="flex items-center space-x-2">
                        <Twitter className="h-6 w-6 text-blue-400" />
                        <span>Twitter</span>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => handleShare('instagram')}>
                      <div className="flex items-center space-x-2">
                        <Instagram className="h-6 w-6 text-pink-500" />
                        <span>Instagram</span>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => handleShare('clipboard')}>
                      <div className="flex items-center space-x-2">
                        <span>Copy Link to Clipboard</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {isCreator && (
                  <Button
                    onClick={() => setIsEmptyQueueDialogOpen(true)}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium flex items-center px-4 py-2 rounded-md shadow-md transition duration-200 ease-in-out hover:scale-[1.02] active:scale-100"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Empty Queue
                  </Button>
                )}
              </div>
            </div>
            {/* if the queue is empty, it shows a message saying "No videos in queue". If there are videos, it displays them with upvote/downvote buttons and an option to remove the video if the user is the creator. */}
            {queue.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700 shadow-lg">
                <CardContent className="p-4 flex flex-col md:flex-row md:space-x-3">
                  <p className="text-center py-8 text-gray-400">
                    No videos in queue
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {queue.map((video) => (
                  <Card
                    key={video.id}
                    className="bg-gray-800 border-gray-700 shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <CardContent className="p-4 flex flex-col md:flex-row md:space-x-3">
                      <Image
                        width={160}
                        height={160}
                        src={video.smallImg}
                        alt={`Thumbnail for ${video.title}`}
                        className="md:w-40 mb-5 md:mb-0 object-cover rounded-md"
                      />
                      <div className="flex-grow">
                        <h3 className="font-semibold text-white text-lg mb-2">
                          {video.title}
                        </h3>
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">
                            {video.title}
                          </span>
                          <div className="flex items-center space-x-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleVote(
                                  video.id,
                                  video.haveUpvoted ? false : true,
                                )
                              }
                              className="flex items-center space-x-1 bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
                            >
                              {video.haveUpvoted ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronUp className="h-4 w-4" />
                              )}
                              <span>{video.upvotes}</span>
                            </Button>
                            {isCreator && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeSong(video.id)}
                                className="bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
       
          <div className="col-span-2 order-1 lg:order-2">
            <div className="space-y-4">
              <Card className="bg-gray-800 border-gray-700 shadow-lg">
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-2xl font-bold text-white">Add a song</h2>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <Input
                      type="text"
                      placeholder="Paste YouTube link here"
                      value={inputLink}
                      onChange={(e) => setInputLink(e.target.value)}
                      className="bg-gray-700 text-white border-gray-600 placeholder-gray-400"
                    />
                    <Button
                      disabled={loading}
                      type="submit"
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                    >
                      {loading ? "Loading..." : "Add to Queue"}
                    </Button>
                  </form>
                  {inputLink && inputLink.match(YT_REGEX) && !loading && (
                    <div className="mt-4">
                      <LiteYouTubeEmbed
                        title=""
                        id={inputLink.split("?v=")[1]}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="bg-gray-800 border-gray-700 shadow-lg">
                <CardContent className="p-6 space-y-4">
                  <h2 className="text-2xl font-bold text-white">Now Playing</h2>
                  {currentVideo ? (
                    <div>
                      {playVideo ? (
                        <div
                          ref={videoPlayerRef}
                          className="w-full aspect-video"
                        />
                      ) : (
                        <>
                          <Image
                            src={currentVideo.bigImg}
                            className="w-full aspect-video object-cover rounded-md"
                            alt={currentVideo.title}
                          />
                          <p className="mt-2 text-center font-semibold text-white">
                            {currentVideo.title}
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-gray-400">
                      No video playing
                    </p>
                  )}
                  {playVideo && (
                    <Button
                      disabled={playNextLoader}
                      onClick={playNext}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white transition-colors"
                    >
                      <Play className="mr-2 h-4 w-4" />{" "}
                      {playNextLoader ? "Loading..." : "Play next"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Dialog
        open={isEmptyQueueDialogOpen}
        onOpenChange={setIsEmptyQueueDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Empty Queue</DialogTitle>
            <DialogDescription>
              Are you sure you want to empty the queue? This will remove all
              songs from the queue. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEmptyQueueDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={emptyQueue}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Empty Queue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}