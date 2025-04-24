"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/context/socket-context";
import jwt from "jsonwebtoken";
import StreamView from "@/components/StreamView";
import ErrorScreen from "@/components/ErrorScreen";
import LoadingScreen from "@/components/LoadingScreen";
import { useRouter, useSearchParams } from "next/navigation"; // Import useSearchParams
import { useSearchParams as useNextSearchParams } from "next/navigation"; // For accessing params dynamically

export default function Component() {
  const searchParams = useNextSearchParams(); // Get params dynamically
  const spaceId = searchParams?.get("spaceId"); // Access spaceId safely from the params
  const { socket, user, loading, setUser, connectionError } = useSocket();
  const [creatorId, setCreatorId] = useState<string>();
  const [loading1, setLoading1] = useState(true);
  const router = useRouter();

  // Log to see the params dynamically
  console.log(spaceId);

  useEffect(() => {
    if (spaceId) {
      async function fetchHostId() {
        try {
          const response = await fetch(`/api/spaces/?spaceId=${spaceId}`, {
            method: "GET",
          });
          const data = await response.json();
          if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to retrieve space's host id");
          }
          setCreatorId(data.hostId);
        } catch (error) {
          console.error(error);
        } finally {
          setLoading1(false);
        }
      }
      fetchHostId();
    }
  }, [spaceId]);

  useEffect(() => {
    if (user && socket && creatorId) {
      const token =
        user.token ||
        jwt.sign(
          {
            creatorId: creatorId,
            userId: user?.id,
          },
          process.env.NEXT_PUBLIC_SECRET || "",
          {
            expiresIn: "24h",
          }
        );

      socket?.send(
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
    }
  }, [user, spaceId, creatorId, socket]);

  if (connectionError) {
    return <ErrorScreen>Cannot connect to socket server</ErrorScreen>;
  }

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <ErrorScreen>Please Log in....</ErrorScreen>;
  }

  if (loading1) {
    return <LoadingScreen />;
  }

  if (creatorId === user.id) {
    router.push(`/dashboard/${spaceId}`);
  }

  return <StreamView creatorId={creatorId as string} playVideo={false} spaceId={spaceId as string} />;
}

export const dynamic = "auto";
