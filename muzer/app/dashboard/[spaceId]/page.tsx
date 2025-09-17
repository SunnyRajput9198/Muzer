// File: app/dashboard/[spaceId]/page.tsx

"use client"; // Ensure this is the very first line

import { useEffect, useState } from "react";
import { useSocket } from "@/context/socket-context";
import StreamView from "@/components/StreamView";
import ErrorScreen from "@/components/ErrorScreen";
import LoadingScreen from "@/components/LoadingScreen";

// Your PageProps interface (keep this as it is correct for your component)
interface PageProps {
  params: {
    spaceId: string;
  };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function Page({ params }: PageProps) {
  const { spaceId } = params;
  const { socket, user, loading, setUser, connectionError } = useSocket();

  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [loading1, setLoading1] = useState(true);

  useEffect(() => {
    const fetchHostId = async () => {
      try {
        const response = await fetch(`/api/spaces/?spaceId=${spaceId}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to retrieve space's host id");
        }

        setCreatorId(data.hostId);
      } catch (error) {
        console.error("Error fetching host ID:", error);
      } finally {
        setLoading1(false);
      }
    };

    if (spaceId) fetchHostId();
  }, [spaceId]);

  useEffect(() => {
    if (user && socket && creatorId) {
      const joinRoom = async () => {
        try {
          const res = await fetch("/api/generate-token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              creatorId,
              userId: user.id,
            }),
          });

          const data = await res.json();

          if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to generate token");
          }

          const token = data.token;

          socket.send(
            JSON.stringify({
              type: "join-room",
              data: {
                token,
                spaceId,
                userId: user.id,
                creatorId: creatorId!,
              },
            })
          );

          if (!user.token) {
            setUser({ ...user, token });
          }
        } catch (err) {
          console.error("Token generation error:", err);
        }
      };

      joinRoom();
    }
  }, [spaceId, creatorId, socket, user, setUser]);

  if (connectionError) return <ErrorScreen>Cannot connect to socket server</ErrorScreen>;
  if (loading || loading1) return <LoadingScreen />;
  if (!user) return <ErrorScreen>Please log in...</ErrorScreen>;
  // if (creatorId && user.id !== creatorId) return <ErrorScreen>You are not the creator of this space</ErrorScreen>;

  return <StreamView creatorId={creatorId!} playVideo={true} spaceId={spaceId} />;
}

export const dynamic = "auto";
