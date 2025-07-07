"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/context/socket-context";
import StreamView from "@/components/StreamView";
import ErrorScreen from "@/components/ErrorScreen";
import LoadingScreen from "@/components/LoadingScreen";
import { useRouter } from "next/navigation";

interface SegmentParams {
  spaceId: string;
}

export default function Page({ params }: { params: SegmentParams }) {
  const { spaceId } = params;
  const router = useRouter();

  const { user, setUser, loading, sendMessage, connectionError } = useSocket();

  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [loadingSpace, setLoadingSpace] = useState(true);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [tokenFetchError, setTokenFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHostId = async () => {
      try {
        const res = await fetch(`/api/spaces?spaceId=${spaceId}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to fetch host ID");
        }

        setCreatorId(data.hostId);
      } catch (err: any) {
        console.error("Error fetching host ID:", err);
      } finally {
        setLoadingSpace(false);
      }
    };
    fetchHostId();
  }, [spaceId]);

  useEffect(() => {
   const joinRoom = async () => {
  if (!user?.id || !creatorId || hasJoinedRoom) return;

  try {
    const res = await fetch("/api/generate-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creatorId }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Token generation failed");
    }

    const token = data.token;
    setUser({ ...user, token });

    sendMessage("join-room", {
      token,
      spaceId,
      userId: user.id,
      creatorId,
    });

    setHasJoinedRoom(true);
  } catch (error: any) {
    console.error("Error generating token or joining room:", error);
    setTokenFetchError(error.message || "Failed to generate token");
  }
};


    joinRoom();
  }, [user?.id, creatorId, spaceId, sendMessage, setUser, hasJoinedRoom]);

  if (connectionError) return <ErrorScreen>Unable to connect to WebSocket server.</ErrorScreen>;
  if (loading || loadingSpace) return <LoadingScreen />;
  if (!user) return <ErrorScreen>Please log in.</ErrorScreen>;
  if (tokenFetchError) return <ErrorScreen>{tokenFetchError}</ErrorScreen>;

  if (user.id === creatorId) {
    router.push(`/dashboard/${spaceId}`);
    return null;
  }

  return <StreamView creatorId={creatorId!} playVideo={false} spaceId={spaceId} />;
}

export const dynamic = "auto";
