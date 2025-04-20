"use client"// kyuki onclick use hua hai
import { signIn, useSession,signOut } from "next-auth/react"
export default function Appbar() {
    //usesession must be wrapped inside a sessionProvider
    const session = useSession();//useSession() is a React hook provided by NextAuth.js that allows you to access the current user's session (authentication info) on the client side.
// Typical Use Cases of useSession():
// 1. Redirecting the user to a specific page after login
// 2. Displaying the user's name or email address
// 3. Displaying the user's profile picture

    return (
        <div>
            <div className="flex  justify-between">
                <div>
                    Mizo
                </div>
                <div>
                 {session.data?.user && <button className="m-2 p-2 bg-blue-400" onClick={()=>signOut()}>Log Out</button>}
                    {!session.data?.user && <button className="m-2 p-2 bg-blue-400" onClick={()=>signIn()}>Sign In</button>}
                </div>
            </div>
        </div>
    )
}