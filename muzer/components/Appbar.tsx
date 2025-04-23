"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

// Add props type
type AppbarProps = {
  isSpectator?: boolean;
};

export default function Appbar({ isSpectator = false }: AppbarProps) {
  const session = useSession();

  return (
    <div>
      <div className="flex justify-between px-20 py-4 bg-gray-900 text-white">
        <div className="text-lg font-bold flex flex-col justify-center">
          Muzer {isSpectator && "(Spectator Mode)"}
        </div>
        <div>
          {session.data?.user ? (
            <Button
              className="bg-purple-600 text-white hover:bg-purple-700"
              onClick={() => signOut()}
            >
              Sign Out
            </Button>
          ) : (
            <Button
              className="bg-purple-600 text-white hover:bg-purple-700"
              onClick={() => signIn()}
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
