import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

const handler = NextAuth({
    providers: [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID??"",// assigned empty string to prevent build error
          clientSecret: process.env.GOOGLE_CLIENT_SECRET??"",
        })
      ]
})

export { handler as GET, handler as POST }