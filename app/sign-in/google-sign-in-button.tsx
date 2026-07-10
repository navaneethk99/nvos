"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function GoogleSignInButton() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function signInWithGoogle() {
    setError(null);
    setIsPending(true);

    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });

    if (result.error) {
      setError(result.error.message ?? "Google sign-in could not be started.");
      setIsPending(false);
    }
  }

  return (
    <div>
      <button
        className="group flex w-full items-center justify-center gap-3 rounded-full bg-[#3973ff] px-6 py-4 font-mono text-[13px] font-semibold tracking-wide text-white shadow-[5px_5px_0_#f6c95d] transition hover:-translate-y-0.5 hover:bg-[#5889ff] disabled:cursor-wait disabled:opacity-70"
        disabled={isPending}
        onClick={signInWithGoogle}
        type="button"
      >
        <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
          <path d="M21.35 12.23c0-.71-.06-1.23-.2-1.77H12v3.35h5.37c-.11.83-.72 2.08-2.08 2.92l-.02.11 3.03 2.3.21.02c1.91-1.72 2.84-4.25 2.84-6.93Z" fill="#fff" />
          <path d="M12 21.5c2.63 0 4.84-.85 6.45-2.32l-3.07-2.43c-.82.56-1.92.95-3.38.95a5.86 5.86 0 0 1-5.56-4.02l-.1.01-3.15 2.39-.04.1A9.66 9.66 0 0 0 12 21.5Z" fill="#b9e7d2" />
          <path d="M6.44 13.68A5.76 5.76 0 0 1 6.11 12c0-.58.12-1.15.32-1.68l-.01-.11-3.18-2.43-.1.05A9.44 9.44 0 0 0 2.5 12c0 1.5.36 2.91.64 4.17l3.3-2.49Z" fill="#f6c95d" />
          <path d="M12 6.3c1.84 0 3.08.78 3.79 1.43l2.76-2.64C16.83 3.5 14.63 2.5 12 2.5a9.66 9.66 0 0 0-8.85 5.33l3.29 2.54A5.88 5.88 0 0 1 12 6.3Z" fill="#fff" />
        </svg>
        {isPending ? "CONNECTING TO GOOGLE" : "CONTINUE WITH GOOGLE"}
      </button>
      {error ? (
        <p className="mt-4 border-l-2 border-[#f6c95d] pl-3 font-mono text-xs leading-relaxed text-[#f4f0e4]/75" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
