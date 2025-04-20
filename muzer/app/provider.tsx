"use client";
// isko provider ko layout.tsx me jake add krdo
import { SessionProvider } from "next-auth/react";
export function Providers({ children }: { children: React.ReactNode }) {
    return <SessionProvider>{children}</SessionProvider>;
}