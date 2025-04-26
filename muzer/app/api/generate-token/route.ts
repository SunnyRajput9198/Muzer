import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import jwt from 'jsonwebtoken';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions); // Pass authOptions directly here in app router
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const reqBody = await req.json(); // Use req.json() to parse the request body
    const { creatorId } = reqBody;

    if (!creatorId) {
      return NextResponse.json({ success: false, message: 'Missing creatorId' }, { status: 400 });
    }

    const token = jwt.sign(
      {
        userId: session.user.id,
        creatorId: creatorId,
        iat: Date.now(),
      },
      process.env.JWT_SECRET_KEY!,
      {
        expiresIn: '24h',
      }
    );

    return NextResponse.json({ success: true, token: token }, { status: 200 });

  } catch (error: any) {
    console.error('Error in /api/generate-token:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate token: ' + error.message },
      { status: 500 }
    );
  }
}
