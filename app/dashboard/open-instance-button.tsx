"use client";

import { useState } from "react";

type ComputerStatus = {
  stage: "starting" | "configuring-network" | "preparing-desktop" | "ready" | "failed" | "terminated";
  desktopUrl?: string;
};

export function OpenInstanceButton({ instanceId }: { instanceId: string }) {
  const [isOpening, setIsOpening] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function openInstance() {
    setIsOpening(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/computers/${instanceId}/status`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Status request failed.");
      }

      const status = (await response.json()) as ComputerStatus;
      if (status.stage === "ready" && status.desktopUrl) {
        window.location.assign(status.desktopUrl);
        return;
      }

      setMessage(
        status.stage === "failed" || status.stage === "terminated"
          ? "Desktop is unavailable."
          : "Desktop is still preparing.",
      );
    } catch {
      setMessage("Desktop status is temporarily unavailable.");
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end">
      <button
        className="border border-[#0d2236]/30 px-3 py-2 font-mono text-[10px] tracking-[.12em] transition hover:border-[#3973ff] hover:bg-[#3973ff] hover:text-white disabled:cursor-wait disabled:opacity-70"
        disabled={isOpening}
        onClick={openInstance}
        type="button"
      >
        {isOpening ? "OPENING..." : "OPEN"}
      </button>
      {message ? <p className="mt-2 max-w-36 text-right font-mono text-[9px] text-[#b24a38]">{message}</p> : null}
    </div>
  );
}
