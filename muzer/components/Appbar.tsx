"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Music } from "lucide-react";
import Link from "next/link";
// Add props type
type AppbarProps = {
  isSpectator?: boolean;
};

export default function Appbar({ isSpectator = false }: AppbarProps) {
  const session = useSession();
  // Gets current user session via useSession().
  // Shows login/logout buttons based on whether the user is signed in.
  // If isSpectator is true, shows "Muzer (Spectator Mode)", else just "Muzer".
  return (
      <div className="flex justify-between px-20 py-4 bg-#121212 text-white">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Music className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Muzer{isSpectator ? " (Spectator Mode)" : ""}</span>
        </div>

        {/* Navigation */}
        <nav className="relative z-50 flex items-center justify-between p-6 md:p-8">
          <div className="flex items-center space-x-4">
            {session.data?.user ? (
              <Button variant="ghost" className="text-white hover:bg-white/10 " onClick={() => signOut()}>
                Sign Out
              </Button>) : (
              <Button variant="ghost" className="text-white hover:bg-white/10 " onClick={() => signIn()}>
                Sign In
              </Button>)}
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg shadow-purple-500/25">
              Get Started
            </Button>
          </div>
        </nav>
      </div>
  );
}
