"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateInstanceButton() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createInstance() {
    setError(null);
    setIsCreating(true);

    const response = await fetch("/api/instances", { method: "POST" });

    if (!response.ok) {
      setError("The instance could not be created. Please try again.");
      setIsCreating(false);
      return;
    }

    router.refresh();
    setIsCreating(false);
  }

  return (
    <div>
      <button
        className="inline-flex items-center justify-center gap-3 rounded-full bg-[#3973ff] px-5 py-3 font-mono text-xs font-semibold tracking-wide text-white transition hover:-translate-y-0.5 hover:bg-[#5889ff] disabled:cursor-wait disabled:opacity-70"
        disabled={isCreating}
        onClick={createInstance}
        type="button"
      >
        <span className="grid size-4 place-items-center rounded-full border border-current text-[11px]">+</span>
        {isCreating ? "CREATING..." : "NEW INSTANCE"}
      </button>
      {error ? <p className="mt-3 font-mono text-[11px] text-[#b24a38]">{error}</p> : null}
    </div>
  );
}
