import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaClient } from "@prisma/client"
import prisma from "@/lib/db"

const handler = NextAuth({
    providers: [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID??"",// assigned empty string to prevent build error
          clientSecret: process.env.GOOGLE_CLIENT_SECRET??"",
        })
      ],
      secret:process.env.NEXTAUTH_SECRET??"",
      callbacks: {
        async signIn(params){
          if(!params.user.email){
            return false
          }
          try{
            await prisma.user.create({
              data:{
                email:params.user.email??"",
                Provider:"Google"
              }
            })
            return true
          }catch(e){
            return false

          }
          return true
        }
}})

export { handler as GET, handler as POST }