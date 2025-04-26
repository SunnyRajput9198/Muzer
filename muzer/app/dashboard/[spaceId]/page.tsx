"use client";

import { use } from "react";
import { useEffect, useState } from "react";
import { useSocket } from "@/context/socket-context";
import StreamView from "@/components/StreamView";
import ErrorScreen from "@/components/ErrorScreen";
import LoadingScreen from "@/components/LoadingScreen";

export default function Component({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params);
  const { socket, user, loading, setUser, connectionError } = useSocket();

  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [loading1, setLoading1] = useState(true);

  // Fetch the host/creator ID for the given space
  useEffect(() => {
    if (!spaceId) {
      console.error("spaceId is missing");
      return;
    }

    const fetchHostId = async () => {
      try {
        const response = await fetch(`/api/spaces/?spaceId=${spaceId}`);
        const data = await response.json();
        console.log("data",data)

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

    fetchHostId();
  }, [spaceId]);
console.log("creatorId",creatorId)
console.log("user",user)
console.log("socket",socket)
  // Generate token server-side and send join-room over socket
  useEffect(() => {
    if (user && socket && creatorId) {
      const joinRoom = async () => {
        try {
          console.log("Making POST request to /api/generate-token with:", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ creatorId, userId: user.id }),
          });
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
  }, [spaceId, creatorId, socket]);

  if (connectionError) return <ErrorScreen>Cannot connect to socket server</ErrorScreen>;
  if (loading || loading1) return <LoadingScreen />;
  if (!user) return <ErrorScreen>Please log in...</ErrorScreen>;
  if (user.id !== creatorId) return <ErrorScreen>You are not the creator of this space</ErrorScreen>;

  return <StreamView creatorId={creatorId!} playVideo={true} spaceId={spaceId} />;
}

export const dynamic = "auto";
