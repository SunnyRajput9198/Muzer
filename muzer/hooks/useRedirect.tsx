import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

//This is a custom hook called useRedirect that redirects unauthenticated users to the homepage (/).
//  It's primarily used to protect routes or pages from being accessed by users who are not logged in.

export default function useRedirect() {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (session.status === "unauthenticated") {
      router.push("/");
    }
  }, [session]);
}