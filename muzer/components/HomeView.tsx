"use client";
import { toast } from "sonner";
import Appbar from "@/components/Appbar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useEffect, useMemo, useState, useCallback } from "react";
import CardSkeleton from "@/components/ui/cardskeleton";
import SpacesCard from "./SpaceCard";

interface Space {
  endTime?: Date | null;
  hostId: string;
  id: string;
  isActive: boolean;
  name: string;
  startTime: Date | null;
}

export default function HomeView() {
  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = useState(false);
  const [spaceName, setSpaceName] = useState("");
  const [spaces, setSpaces] = useState<Space[] | null>(null);
  const [loading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSpaces = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/spaces");
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to fetch spaces");
        }

        setSpaces(data.spaces);
      } catch (error) {
        toast.error("Error fetching spaces");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpaces();
  }, []);

  const handleCreateSpace = async () => {
    setIsCreateSpaceOpen(false);
    try {
      const response = await fetch(`/api/spaces`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ spaceName }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to create space");
      }

      setSpaces((prev) => (prev ? [...prev, data.space] : [data.space]));
      toast.success(data.message);
    } catch (error: any) {
      toast.error(error.message || "Error Creating Space");
    }
  };

  const handleDeleteSpace = useCallback(async (spaceId: string) => {
    try {
      const response = await fetch(`/api/spaces/?spaceId=${spaceId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete space");
      }

      setSpaces((prev) => prev?.filter((s) => s.id !== spaceId) || []);
      toast.success(data.message);
    } catch (error: any) {
      toast.error(error.message || "Error Deleting Space");
    }
  }, []);

  const renderSpaces = useMemo(() => {
    if (loading) {
      return (
        <>
          <CardSkeleton />
          <CardSkeleton />
        </>
      );
    }

    if (spaces && spaces.length > 0) {
      return spaces.map((space) => (
        <SpacesCard
          key={space.id}
          space={space}
          handleDeleteSpace={handleDeleteSpace}
        />
      ));
    }

    return (
      <p className="text-center text-muted-foreground text-xl mt-10">
        No spaces available. Create one to get started!
      </p>
    );
  }, [loading, spaces, handleDeleteSpace]);

  return (
    <div className="flex min-h-screen flex-col bg-[#121212]  text-white">
      <Appbar />
      <div className="w-full px-8 pt-1 pb-12">
        {/* Title */}
        <h1 className="text-center text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-300 text-6xl md:text-7xl font-extrabold ">
          My Spaces
        </h1>
        {/* CTA */}
        <div className="flex justify-center mt-10">
          <Button
            onClick={() => setIsCreateSpaceOpen(true)}
            className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 hover:from-yellow-500 hover:to-yellow-500 text-black px-6 py-3 text-lg rounded-xl shadow-lg shadow-yellow-500/20 transition duration-200"
          >
            + Create New Space
          </Button>

        </div>


        {/* Spaces Grid */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7 w-full">
          {renderSpaces}
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={isCreateSpaceOpen} onOpenChange={setIsCreateSpaceOpen}>
        <DialogContent className="bg-zinc-900 text-white border border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center font-semibold">
              Create a New Space
            </DialogTitle>
          </DialogHeader>

          <div className="mt-6">
            <label htmlFor="spaceName" className="block mb-2 text-sm font-medium">
              Name of the Space
            </label>
            <input
              id="spaceName"
              type="text"
              placeholder="e.g. Late Night Vibes"
              value={spaceName}
              onChange={(e) => setSpaceName(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsCreateSpaceOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSpace}
              className="bg-purple-600 text-white hover:bg-purple-700"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
