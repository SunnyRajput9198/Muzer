"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation"; // Import useSearchParams
import { useEffect } from "react"; // Import useEffect

import { SignInFlow } from "@/types/auth-types";
import AuthScreen from "@/components/auth/authscreen";

export default function AuthPage() {
  const searchParams = useSearchParams(); // Get searchParams dynamically
  const formType = searchParams?.get("authType") as SignInFlow; // Access authType safely
  const session = useSession();
  const router = useRouter();

  // Use useEffect to handle the redirection
  useEffect(() => {
    if (session.status === "authenticated") {
      router.push("/");
    }
  }, [session.status, router]); // Depend on session status and router

  // Render the AuthScreen if the user is not authenticated
  return <AuthScreen authType={formType} />;
}
