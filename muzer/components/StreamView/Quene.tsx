import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Share2, Trash2, X } from "lucide-react";
import { useSocket } from "@/context/socket-context";
import { toast } from "sonner";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAutoAnimate } from "@formkit/auto-animate/react";

type Props = {
  queue: Video[];
  creatorId: string;
  userId: string;
  isCreator: boolean;
  spaceId: string
};

export default function Queue({ queue, isCreator, creatorId, userId, spaceId }: Props) {
  const { sendMessage } = useSocket();
  const [isEmptyQueueDialogOpen, setIsEmptyQueueDialogOpen] = useState(false);
  const [parent] = useAutoAnimate();

  function handleVote(id: string, isUpvote: boolean) {
    sendMessage("cast-vote", {
      vote: isUpvote ? "upvote" : "downvote",
      streamId: id,
      userId,
      creatorId,
      spaceId
    });
  }

  const handleShare = () => {
    const shareableLink = `${window.location.origin}/spaces/${spaceId}`;
    navigator.clipboard.writeText(shareableLink).then(
      () => {
        toast.success("Link copied to clipboard!");
      },
      (err) => {
        console.error("Could not copy text: ", err);
        toast.error("Failed to copy link. Please try again.");
      },
    );
  };

  const emptyQueue = async () => {
    sendMessage("empty-queue", {
      spaceId: spaceId,
    });
    setIsEmptyQueueDialogOpen(false);
  };

  const removeSong = async (streamId: string) => {
    sendMessage("remove-song", {
      streamId,
      userId,
      spaceId,
    });
  };

  return (
    <>
      <div className="col-span-3 ">
        <div className="space-y-4">
          <div className="flex flex-col items-start justify-between space-y-4 sm:flex-row sm:items-center sm:space-y-0">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-purple-400 tracking-tight mb-4">
              Upcoming Songs
            </h2>


            <div className="flex space-x-4">
              <Button
                onClick={handleShare}
                className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white hover:brightness-110 transition-all duration-300 font-semibold px-4 py-2 rounded-lg shadow-md"
              >
                <Share2 className="mr-2 h-4 w-4" /> Share
              </Button>

              {isCreator && (
                <Button
                  onClick={() => setIsEmptyQueueDialogOpen(true)}
                  className="bg-gray-800 hover:bg-red-600 text-white border border-red-500 hover:border-transparent transition-all duration-200 font-semibold px-4 py-2 rounded-md shadow"
                >
                  <Trash2 className="mr-2 h-4 w-4 text-red-400 group-hover:text-white transition-colors" />
                  Empty Queue
                </Button>

              )}
            </div>
          </div>
          {queue.length === 0 && (
            <Card className="w-full">
              <CardContent className="p-4">
                <p className="py-8 text-center">No videos in queue</p>
              </CardContent>
            </Card>
          )}
          <div className="space-y-4" ref={parent}>
            <div
              ref={parent}
              className="grid grid-cols-1 sm:grid-cols-2 gap-6"
            >
              {queue.map((video) => (
                <Card
                  key={video.id}
                  className="bg-[#2c2c2c] border border-gray-700 relative group overflow-hidden"
                >
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-white truncate max-w-full">
                      {video.title}
                    </h3>

                    {/* Buttons below the title */}
                    <div className="mt-4 flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVote(video.id, !video.haveUpvoted)}
                      >
                        {video.haveUpvoted ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUp className="h-4 w-4" />
                        )}
                        <span className="ml-1">{video.upvotes}</span>
                      </Button>

                      {isCreator && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeSong(video.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Thumbnail shown on hover */}
                    <Image
                      height={100}
                      width={200}
                      src={video.smallImg}
                      alt={`Thumbnail for ${video.title}`}

                      className="absolute bottom-2 right-2 w-40 rounded-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 border border-white/10 shadow-lg"

                    />
                  </CardContent>

                </Card>

              ))}
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
            <Button onClick={emptyQueue} variant="destructive">
              Empty Queue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}