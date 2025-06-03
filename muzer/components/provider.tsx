"use client";

import { SessionProvider } from "next-auth/react";
import { SocketContextProvider } from "@/context/socket-context";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes/dist/types";
//core idea behind this is to wrap children with SessionProvider and SocketContextProvider
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SocketContextProvider>{children}</SocketContextProvider>
    </SessionProvider>
  );
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
