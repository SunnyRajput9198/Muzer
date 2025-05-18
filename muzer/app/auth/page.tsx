import { Suspense } from "react";
import AuthClient from "./AuthClient"; // Adjust path if needed

export default function AuthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthClient />
    </Suspense>
  );
}
