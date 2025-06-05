import db from "@/lib/db";
import { authOptions } from "@/lib/auth-options";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client"; // Import Prisma for type utilities

// Define a type that accurately reflects the structure of the Stream object
// when it includes _count of upvotes and the upvotes relation.
type StreamWithAggregations = Prisma.StreamGetPayload<{
  include: {
    _count: {
      select: {
        upvotes: true;
      };
    };
    upvotes: {
      where: {
        userId: string; // The userId filter used in your query
      };
    };
    // Include all other scalar fields of your Stream model here
    // Example:
    id: string;
    url: string;
    extractedId: string;
    type: string;
    title: string;
    smallImg: string | null;
    bigImg: string | null;
    spaceId: string;
    userId: string;
    addedBy: string;
    played: boolean;
    createAt: Date;
    updateAt: Date;
  };
}>;


export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
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

  const streams = await db.stream.findMany({
    where: {
      userId: user.id,
    },
    include: {
      _count: {
        select: {
          upvotes: true,
        },
      },
      upvotes: {
        where: {
          userId: user.id,
        },
      },
    },
  });

  return NextResponse.json({
    // Cast the 'streams' array to the newly defined type.
    // This tells TypeScript the exact shape of each object within 'streams'.
    streams: (streams as StreamWithAggregations[]).map((stream) => {
      // Now, when you destructure 'stream', TypeScript knows the types
      // of '_count' and 'upvotes'.
      const { _count, upvotes, ...rest } = stream;
      return {
        ...rest,
        upvotes: _count.upvotes,
        haveUpvoted: upvotes.length > 0, // 'upvotes' now refers to the relation array itself
      };
    }),
  });
}