import { authOptions } from "@/lib/auth-options";
import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client"; // Import Prisma for type utilities

// Define a type for the Stream object with its upvote count for in-memory sorting.
// This matches what Prisma returns when including `_count` for upvotes.
type StreamWithUpvoteCount = Prisma.StreamGetPayload<{
  include: {
    _count: {
      select: {
        upvotes: true;
      };
    };
  };
}>;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user.id) {
    return NextResponse.json(
      {
        message: "Unauthenticated",
      },
      {
        status: 403,
      },
    );
  }
  const user = session.user;
  const spaceId = req.nextUrl.searchParams.get("spaceId");

  // Validate spaceId
  if (!spaceId) {
    return NextResponse.json(
      {
        message: "Missing spaceId",
      },
      {
        status: 400,
      },
    );
  }

  // Fetch all streams that are not yet played for the current user and space.
  // We include the _count of upvotes to sort them in memory.
  const streams: StreamWithUpvoteCount[] = await db.stream.findMany({
    where: {
      userId: user.id,
      played: false,
      spaceId: spaceId,
    },
    include: {
      _count: {
        select: {
          upvotes: true,
        },
      },
    },
  });

  // Sort the streams in memory by the number of upvotes in descending order.
  // The stream with the highest upvote count will be the first element.
  const sortedStreams = streams.sort((a, b) => b._count.upvotes - a._count.upvotes);

  // Get the most upvoted stream. This will be undefined if no streams are found.
  const mostUpvotedStream = sortedStreams[0];

  // Perform database operations only if a mostUpvotedStream is found.
  if (mostUpvotedStream) {
    await Promise.all([
      db.currentStream.upsert({
        where: {
          spaceId: spaceId, // Ensure spaceId is passed correctly
        },
        update: {
          userId: user.id,
          streamId: mostUpvotedStream.id,
          spaceId: spaceId,
        },
        create: {
          userId: user.id,
          streamId: mostUpvotedStream.id,
          spaceId: spaceId,
        },
      }),
      db.stream.update({
        where: {
          id: mostUpvotedStream.id, // Use the ID of the most upvoted stream
        },
        data: {
          played: true,
          playedTs: new Date(),
        },
      }),
    ]);
  } else {
    // Handle the case where there are no streams to play
    // You might want to update currentStream to null or a default state,
    // or return a specific response indicating no more songs in the queue.
    // For now, let's upsert currentStream with a null streamId if no stream is found.
    await db.currentStream.upsert({
      where: {
        spaceId: spaceId,
      },
      update: {
        userId: user.id,
        streamId: null, // No stream to play
        spaceId: spaceId,
      },
      create: {
        userId: user.id,
        streamId: null, // No stream to play
        spaceId: spaceId,
      },
    });
  }

  return NextResponse.json({
    stream: mostUpvotedStream, // This will be null if no streams were found
  });
}