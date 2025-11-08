"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowRight, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SpaceCardProps {
  space: {
    id: string;
    name: string;
  };
  handleDeleteSpace: (id: string) => void;
}

export default function SpacesCard({
  space,
  handleDeleteSpace,
}: SpaceCardProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [spaceToDelete, setSpaceToDelete] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState<string | null>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, spaceId: string) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setMousePosition({ x, y })
  }

  const handleMouseEnter = (spaceId: string) => {
    setIsHovered(spaceId)
  }

  const handleMouseLeave = () => {
    setIsHovered(null)
  }
  const handleDeleteClick = (id: string) => {
    setSpaceToDelete(id);
    setIsDialogOpen(true);
  };

  const confirmDelete = () => {
    if (spaceToDelete) {
      handleDeleteSpace(spaceToDelete);
      setSpaceToDelete(null);
      setIsDialogOpen(false);
    }
  };
   // Calculate tilt angles
  const rotateX = isHovered
    ? ((mousePosition.y - 100) / 100) * -8
    : 0;
  const rotateY = isHovered
    ? ((mousePosition.x - 150) / 150) * 8
    : 0;
  const scale = isHovered ? 1.03 : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 md:p-6"
    >
       <Card
        className="w-full max-w-3xl overflow-hidden rounded-3xl border border-blue-800 bg-[#121212] transition-all duration-300 ease-in-out hover:shadow-[0_10px_30px_rgba(37,99,235,0.3)]"
        style={{
          transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
          transition: isHovered ? "transform 0.1s ease-out" : "transform 0.3s ease-out",
        }}
        // @ts-ignore
        onMouseMove={handleMouseMove}
        // @ts-ignore
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <CardContent className="p-0">
          <motion.div
            className="relative h-52 w-full sm:h-64 md:h-72 lg:h-80 xl:h-96"
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.4 }}
          >
            <Image
              src={"/lady.png"}
              alt={space.name}
              layout="fill"
              objectFit="cover"
              className="rounded-t-3xl"
            />
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/70 to-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            />
            <motion.div
              className="absolute bottom-0 left-0 right-0 p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-md">
                {space.name}
              </h2>
            </motion.div>
          </motion.div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-3 p-5 sm:flex-row sm:justify-between sm:space-y-0 sm:space-x-4">
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto rounded-lg border border-blue-500 bg-blue-600 text-white font-medium shadow-md hover:bg-blue-700 hover:shadow-blue-500/40 transition-all"
            onClick={() => router.push(`/dashboard/${space.id}`)}
          >
            <ArrowRight className="mr-2 h-5 w-5" />
            View Space
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="lg"
                className="w-full sm:w-auto rounded-lg border border-red-500 bg-red-600 text-white hover:bg-red-700 hover:shadow-md hover:shadow-red-500/40"
                onClick={() => handleDeleteClick(space.id)}
              >
                <Trash2 className="mr-2 h-5 w-5" />
                Delete Space
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 text-white border border-zinc-700">
              <DialogHeader>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this space? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-full rounded-lg bg-red-600 text-white hover:bg-red-700 hover:shadow-md hover:shadow-red-500/40 sm:w-auto"
                  onClick={confirmDelete}
                >
                  Confirm
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
