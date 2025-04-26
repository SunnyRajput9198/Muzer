"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/context/socket-context";
import StreamView from "@/components/StreamView";
import ErrorScreen from "@/components/ErrorScreen";
import LoadingScreen from "@/components/LoadingScreen";
import { useRouter } from "next/navigation";

export default function Page({ params }: { params: { spaceId: string } }) {
  const { spaceId } = params;
  const router = useRouter();

  const { user, setUser, loading, sendMessage, connectionError } = useSocket();

  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [loadingSpace, setLoadingSpace] = useState(true);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false); // Track if user joined

  // Fetch host/creator ID
  useEffect(() => {
    const fetchHostId = async () => {
      try {
        const res = await fetch(`/api/spaces/?spaceId=${spaceId}`);
        const data = await res.json();

        if (!res.ok || !data.success) throw new Error(data.message || "Failed to fetch host ID");

        setCreatorId(data.hostId);
      } catch (err) {
        console.error("Error fetching host ID:", err);
      } finally {
        setLoadingSpace(false);
      }
    };

    fetchHostId();
  }, [spaceId]);

  // Generate token securely via API & join room
  useEffect(() => {
    const joinRoom = async () => {
      if (!user?.id || !creatorId || !user?.token || hasJoinedRoom) return;

      try {
        const res = await fetch("/api/generate-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creatorId,
            userId: user.id,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) throw new Error(data.message || "Token generation failed");

        const token = data.token;
        setUser({ ...user, token });
        sendMessage("join-room", { token, spaceId });
        setHasJoinedRoom(true); // Mark as joined
      } catch (error) {
        console.error("Error generating token or joining room:", error);
      }
    };

    joinRoom();
  }, [user?.id, creatorId, spaceId, sendMessage, user?.token, setUser, hasJoinedRoom]);

  // UI states
  if (connectionError) return <ErrorScreen>Unable to connect to WebSocket server.</ErrorScreen>;
  if (loading || loadingSpace) return <LoadingScreen />;
  if (!user) return <ErrorScreen>Please log in.</ErrorScreen>;

  // Redirect creator to dashboard
  if (user.id === creatorId) {
    router.push(`/dashboard/${spaceId}`);
    return null;
  }

  return (
    <StreamView creatorId={creatorId!} playVideo={false} spaceId={spaceId} />
  );
}

export const dynamic = "auto";
