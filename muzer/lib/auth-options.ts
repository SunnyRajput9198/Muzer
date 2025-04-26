import { NextAuthOptions, Session } from "next-auth";
import bcrypt from "bcryptjs";
import { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import { emailSchema, passwordSchema } from "../schema/cridentials-schema";
import { PrismaClientInitializationError } from "@prisma/client/runtime/library";
import { PrismaClient } from "@prisma/client";


const prisma =new PrismaClient();

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
    }),
     // Custom credentials-based provider (email + password)
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" }
      },
      async authorize(credentials) {
        // Ensure both email and password are provided
        if (!credentials || !credentials.email || !credentials.password) {
          return null;
        }
   // Validate email using Zod schema
        const emailValidation = emailSchema.safeParse(credentials.email);

        if (!emailValidation.success) {
          throw new Error("Invalid email");
        }
// Validate password using Zod schema
        const passwordValidation = passwordSchema.safeParse(credentials.password);

        if (!passwordValidation.success) {
          throw new Error(passwordValidation.error.issues[0].message);
        }

        try {
          // Try finding user in DB by email
          const user = await prisma.user.findUnique({
            where: {
              email: emailValidation.data
            }
          });
// If user doesn't exist, register new one
          if (!user) {
            const hashedPassword = await bcrypt.hash(passwordValidation.data, 10);

            const newUser = await prisma.user.create({
              data: {
                email: emailValidation.data,
                password: hashedPassword,
                provider: "Credentials"
              }
            });

            return newUser;
          }
// If user exists but doesn't have password At that time, no password was set — because Google handles authentication.
// Now, the same user tries to log in using email + password.the system finds the user by email but sees user.password === null.
// so why hash?Because this is not just a login, it’s also// A user trying to add a password to their existing OAuth account.
          if (!user.password) {
            const hashedPassword = await bcrypt.hash(passwordValidation.data, 10);

            const authUser = await prisma.user.update({
              where: {
                email: emailValidation.data
              },
              data: {
                password: hashedPassword
              }
            });
            return authUser;
          }
// Compare provided password with stored hash
          const passwordVerification = await bcrypt.compare(passwordValidation.data, user.password);

          if (!passwordVerification) {
            throw new Error("Invalid password");
          }

          return user;
        } catch (error) {
          if (error instanceof PrismaClientInitializationError) {
            throw new Error("Internal server error");
          }
          // console.log(error);
          throw error;
        }

      },
    })
  ],
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
     // Called when JWT is created or updated// type of callbacks func 1.jwt() – called when JWT is created or updated 
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.email = profile.email as string;
        token.id = account.access_token;
      }
      return token;
    },
      // Called whenever a session is checked or created
    async session({ session, token }: {
      session: Session,
      token: JWT;
    }) {
      try {
        // Add user ID to session.user using token.email
        const user = await prisma.user.findUnique({
          where: {
            email: token.email
          }
        });

        if (user) {
          session.user.id = user.id;
        }
      } catch (error) {
        if (error instanceof PrismaClientInitializationError) {
          throw new Error("Internal server error");
        }
        console.log(error);
        throw error;
      }
      return session;
    },
    //signIn is also a type of callback function// Triggered when user signs in (e.g., via Google)
    async signIn({ account, profile }) {

      try {
        // Check if user already exists in DB
        if (account?.provider === "google") {

          const user = await prisma.user.findUnique({
            where: {
              email: profile?.email!,
            }
          });
  // If user doesn't exist, create new user from Google profile
          if (!user) {
            const newUser = await prisma.user.create({
              data: {
                email: profile?.email!,
                name: profile?.name || undefined,
                provider: "Google"
              }
            });
          }
        }
        return true;
      } catch (error) {
        console.log(error);
        //throw error;
        return false;
      }
    }
  }
} satisfies NextAuthOptions;

/* Explanation:read if you have time
1. **Imports:**
   - `NextAuthOptions`, `Session`, `JWT`: Types from `next-auth` that are used to define the options and types for authentication and sessions.
   - `bcryptjs`: A library for hashing and comparing passwords securely.
   - `Credentials`, `GoogleProvider`: Providers for `next-auth`. GoogleProvider is for authenticating using Google, and Credentials is for email/password authentication.
   - `emailSchema`, `passwordSchema`: Validation schemas for email and password using a validation library (likely Zod).
   - `PrismaClientInitializationError`, `PrismaClient`: These are used to interact with the Prisma ORM, which is used to connect to the database.

2. **`authOptions` Configuration:**
   - **`providers`**: Defines two authentication providers:
     - **GoogleProvider**: Used for OAuth authentication through Google. Client ID and Secret are pulled from environment variables.
     - **Credentials**: Used for email/password-based authentication. It validates email and password inputs and either finds or creates the user.
   
3. **`authorize` function (Credentials provider)**:
   - The `authorize` function is called when a user attempts to sign in using credentials. It performs the following tasks:
     - Validates the email and password using `emailSchema` and `passwordSchema`.
     - Checks if a user exists with the given email.
     - If the user doesn't exist, it creates a new user and hashes their password.
     - If the user exists but doesn't have a password, it hashes the provided password and updates the user.
     - Verifies the provided password using `bcrypt.compare` and throws an error if the password is invalid.

4. **`pages.signIn`**:
   - Customizes the sign-in page URL, which is `/auth` in this case.

5. **Session Configuration**:
   - **`session.strategy: "jwt"`**: Defines how session management is handled using JWT tokens instead of a session cookie.
   
6. **`callbacks`**:
   - **`jwt`**: This callback is executed when a JWT is generated. It adds user information like email and ID to the token.
   - **`session`**: This callback is executed when the session object is being created. It adds the user's ID to the session object.
   - **`signIn`**: This callback is executed during the sign-in process. If the provider is Google, it checks if the user exists in the database, and if not, it creates a new user with the email and name from the Google profile.

7. **Error Handling**: 
   - The code catches errors at various stages (validation, database queries) and throws relevant error messages. If the Prisma client encounters an issue, it throws a "Internal server error" message.

8. **Prisma Client**: 
   - Prisma is used for database interactions. It is used to find or create users, and the `PrismaClientInitializationError` is caught to handle database initialization errors.*/