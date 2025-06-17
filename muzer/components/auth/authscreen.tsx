"use client";

import { useState } from "react";
import { SignInFlow } from "@/types/auth-types";
import SigninCard from "./sign-in-card";
import SignupCard from "./sign-up-card";

export default function AuthScreen({ authType }: { authType?: SignInFlow }) {
  const [formType, setFormType] = useState<SignInFlow>(authType || "signIn");
  return (
    <div className=" w-full h-full flex items-center justify-center gap-5 bg-[#121212]">
      <div className="w-full md:h-auto md:w-[420px] px-4">
        {formType === "signIn" ? (
          <SigninCard setFormType={setFormType} />
        ) : (
          <SignupCard setFormType={setFormType} />
        )}
      </div>
    </div>
  );
}