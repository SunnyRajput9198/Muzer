import jwt from "jsonwebtoken";

type TokenPayload = {
  userId: string;
  creatorId: string;
};

// ✅ Utility to generate token with provided secret (optional fallback to env)
export const generateAppToken = (
  payload: TokenPayload,
  secret: string = process.env.JWT_SECRET_KEY || process.env.NEXTAUTH_SECRET!
): string => {
  if (!secret) {
    throw new Error("Missing JWT secret");
  }

  return jwt.sign(payload, secret, {
    expiresIn: "24h",
  });
};

// ✅ Utility to verify token with provided secret (optional fallback to env)
export const verifyAppToken = (
  token: string,
  secret: string = process.env.JWT_SECRET_KEY || process.env.NEXTAUTH_SECRET!
): (TokenPayload & { iat: number; exp: number }) | null => {
  try {
    return jwt.verify(token, secret) as TokenPayload & { iat: number; exp: number };
  } catch (err) {
    console.error("Token verification failed:", err);
    return null;
  }
};
