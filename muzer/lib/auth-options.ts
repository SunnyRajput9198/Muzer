import type { NextAuthOptions} from "next-auth";
import {hash,compare} from "./scrypt";
import Credentials from "next-auth/providers/credentials";
import { generateAppToken } from "./auth-utils"; // ✅ Adjust the path if needed
import { emailSchema, passwordSchema } from "../schema/cridentials-schema";
import { PrismaClientInitializationError } from "@prisma/client/runtime/library";
import { PrismaClient } from "@prisma/client";
const prisma =new PrismaClient();
console.log("✅ Prisma client initialized.");
export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" }
      },
async authorize(credentials) {
  console.log("[Authorize] called with credentials:", credentials);
  
  if (!credentials || !credentials.email || !credentials.password) {
    console.log("[Authorize] Missing credentials or fields. Returning null.");
    return null;
  }

  const emailValidation = emailSchema.safeParse(credentials.email);
  if (!emailValidation.success) {
    console.log("[Authorize] Email validation failed:", emailValidation.error);
    return null;
  }

  const passwordValidation = passwordSchema.safeParse(credentials.password);
  if (!passwordValidation.success) {
    console.log("[Authorize] Password validation failed:", passwordValidation.error);
    return null;
  }

  try {
    console.log("[Authorize] Searching for user in DB by email:", emailValidation.data);
    const user = await prisma.user.findUnique({
      where: { email: emailValidation.data }
    });
    console.log("[Authorize] User found:", user);

    if (!user) {
      console.log("[Authorize] User not found, creating new user");
      const hashedPassword = await hash(passwordValidation.data);
      const newUser = await prisma.user.create({
        data: {
          email: emailValidation.data,
          password: hashedPassword,
          provider: "Credentials"
        }
      });
      console.log("[Authorize] New user created:", newUser);
      return newUser;
    }

    if (!user.password) {
      console.log("[Authorize] User exists but has no password, hashing and updating");
      const hashedPassword = await hash(passwordValidation.data);
      const updatedUser = await prisma.user.update({
        where: { email: emailValidation.data },
        data: { password: hashedPassword }
      });
      console.log("[Authorize] User password updated:", updatedUser);
      return updatedUser;
    }

    console.log("[Authorize] Verifying password");
    const passwordVerification = await compare(passwordValidation.data, user.password);
    if (!passwordVerification) {
      console.log("[Authorize] Password verification failed");
      throw new Error("Invalid password");
    }
    console.log("[Authorize] Password verified successfully");
    return user;

  } catch (error) {
    if (error instanceof PrismaClientInitializationError) {
      console.log("[Authorize] Prisma client initialization error:", error.message);
      throw new Error("Internal server error");
    }
    console.log("[Authorize] Unexpected error in authorize function:", error);
    throw error;
  }
}


,
    })
  ],
  debug: true,
   // Redirect to custom login page
  pages: {
    signIn: "/auth"
  },
   // Secret used to sign the JWT token
  secret: process.env.NEXTAUTH_SECRET ?? "secret",
// Store session info in JWT instead of DB
//what is sessionThe session callback is a function that NextAuth runs whenever a session is created or accessed — for example, when:1.A user logs in.2.The client requests their session (via getSession() or useSession()).
  session: {
    strategy: "jwt"
  },
   // Callback functions to control JWT/session logic
  callbacks: {
 async jwt({ token, account, user }) {
  console.log("[JWT Callback] token before update:", token);
  if (user?.id) {
    token.id = user.id;
    console.log("[JWT Callback] User ID assigned to token:", token.id);
  }

  if (!token.appToken && token.id) {
    const creatorId = user.id;
    const appToken = generateAppToken({ userId: token.id, creatorId });
    token.appToken = appToken;
    console.log("[JWT Callback] App token generated:", token.appToken);
  }
  return token;
},

async session({ session, token }) {
  console.log("[Session Callback] Token received:", token);
  if (token.id) session.user.id = token.id;
  if (token.appToken) {
    session.user.token = token.appToken;
    console.log("[Session Callback] App token added to session user:", session.user.token);
  }
  console.log("[Session Callback] Session object:", session);
  return session;
},
}
  }