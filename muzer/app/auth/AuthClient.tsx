'use client';

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { SignInFlow } from "@/types/auth-types";
import AuthScreen from "@/components/auth/authscreen";

export default function AuthClient() {
  const searchParams = useSearchParams();
  const formType = searchParams?.get("authType") as SignInFlow;
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session.status === "authenticated") {
      router.push("/");
    }
  }, [session.status, router]);

  return <AuthScreen authType={formType} />;
}
