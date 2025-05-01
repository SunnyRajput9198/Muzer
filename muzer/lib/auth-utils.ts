import jwt from 'jsonwebtoken';

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY!; // Ensure this is set

export const generateAppToken = (payload: { userId: string; creatorId: string }) => {
    return jwt.sign(
        {
            ...payload,
            iat: Date.now(),
        },
        JWT_SECRET_KEY,
        {
            expiresIn: '24h',
        }
    );
};

export const verifyAppToken = (token: string) => {
  try {
    const verified = jwt.verify(token, JWT_SECRET_KEY) as { userId: string, creatorId: string, iat: number, exp?: number };
    return verified;
  } catch (error) {
    return null; // Or throw an error, depending on your needs
  }
}
