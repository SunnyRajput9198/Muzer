"use client"// kyuki onclick use hua hai
import { signIn, useSession,signOut } from "next-auth/react"
import { Button } from "@/app/components/ui/button";
export default function Appbar() {
    //usesession must be wrapped inside a sessionProvider
    const session = useSession();//useSession() is a React hook provided by NextAuth.js that allows you to access the current user's session (authentication info) on the client side.
// Typical Use Cases of useSession():
// 1. Redirecting the user to a specific page after login
// 2. Displaying the user's name or email address
// 3. Displaying the user's profile picture

    return (
        <div>
            <div className="flex  justify-between px-20">
                <div className="text-lg font-bold flex flex-col justify-center text-white">
                    Muzer
                </div>
                <div>
                 {session.data?.user && <Button className="bg-purple-600 text-white hovering:bg-purple-700" onClick={()=>signOut()}>Sign Out</Button>}
                    {!session.data?.user && <Button className="bg-purple-600 text-white hovering:bg-purple-700" onClick={()=>signIn()}>Sign In</Button>}
                </div>
            </div>
        </div>
    )
}