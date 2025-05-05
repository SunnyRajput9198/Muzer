"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/context/socket-context";
import StreamView from "@/components/StreamView";
import ErrorScreen from "@/components/ErrorScreen";
import LoadingScreen from "@/components/LoadingScreen";
import { useRouter } from "next/navigation";
//@ts-expect-error
import { SegmentParams } from "../../.next/types/app/spaces/page"; // Import SegmentParams

export default function Page({ params }: { params: SegmentParams }) {
  const { spaceId } = params;
  const router = useRouter();

  const { user, setUser, loading, sendMessage, connectionError } = useSocket();

  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [loadingSpace, setLoadingSpace] = useState(true);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false); // Track if user joined
  const [tokenFetchError, setTokenFetchError] = useState<string | null>(null); // State for token fetch errors

  // Fetch host/creator ID
  useEffect(() => {
    const fetchHostId = async () => {
      try {
        const res = await fetch(`/api/spaces?spaceId=${spaceId}`); // Corrected query parameter format
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to fetch host ID");
        }

        setCreatorId(data.hostId);
      } catch (err: any) {
        console.error("Error fetching host ID:", err);
        // Consider showing an error to the user, perhaps using a state variable and an ErrorScreen component
      } finally {
        setLoadingSpace(false);
      }
    };

    fetchHostId();
  }, [spaceId]);

  // Generate token securely via API & join room
  useEffect(() => {
    const joinRoom = async () => {
      if (!user?.id || !creatorId || hasJoinedRoom) return; // Removed user?.token from here

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

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Token generation failed");
        }

        const token = data.token;
        setUser({ ...user, token }); // Update user object with the token
        sendMessage("join-room", { token, spaceId, userId: user.id }); // Send join-room message to server
        setHasJoinedRoom(true); // Mark as joined
      } catch (error: any) {
        console.error("Error generating token or joining room:", error);
        setTokenFetchError(error.message || "Failed to generate token"); // Set error state
      }
    };

    joinRoom();
  }, [user?.id, creatorId, spaceId, sendMessage, setUser, hasJoinedRoom]); // Removed user?.token

  // UI states
  if (connectionError) return <ErrorScreen>Unable to connect to WebSocket server.</ErrorScreen>;
  if (loading || loadingSpace) return <LoadingScreen />;
  if (!user) return <ErrorScreen>Please log in.</ErrorScreen>;
  if (tokenFetchError) return <ErrorScreen>{tokenFetchError}</ErrorScreen>; // Display token fetch error

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