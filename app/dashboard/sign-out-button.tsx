"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function SignOutButton({ className = "" }: { className?: string }) {
  const [isPending, setIsPending] = useState(false);

  async function signOut() {
    setIsPending(true);
    await authClient.signOut({ fetchOptions: { onSuccess: () => window.location.assign("/") } });
    setIsPending(false);
  }

  return (
    <button
      className={`font-mono text-[11px] tracking-wide transition disabled:cursor-wait ${className}`}
      disabled={isPending}
      onClick={signOut}
      type="button"
    >
      {isPending ? "SIGNING OUT..." : "SIGN OUT"}
    </button>
  );
}
