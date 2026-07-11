"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function TerminateInstanceButton({ instanceId }: { instanceId: string }) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConfirming) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isTerminating) {
        setIsConfirming(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isConfirming, isTerminating]);

  async function terminateInstance() {
    setError(null);
    setIsTerminating(true);

    const response = await fetch(`/api/instances/${instanceId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setError("The instance could not be terminated. Please try again.");
      setIsTerminating(false);
      return;
    }

    router.refresh();
    setIsConfirming(false);
    setIsTerminating(false);
  }

  return (
    <div className="inline-flex flex-col items-end">
      <button
        className="border border-[#b24a38]/50 px-3 py-2 font-mono text-[10px] tracking-[.12em] text-[#b24a38] transition hover:bg-[#b24a38] hover:text-white disabled:cursor-wait disabled:opacity-70"
        disabled={isTerminating}
        onClick={() => {
          setError(null);
          setIsConfirming(true);
        }}
        type="button"
      >
        TERMINATE
      </button>
      {isConfirming ? (
        <div
          aria-labelledby={`terminate-title-${instanceId}`}
          aria-modal="true"
          className="fixed inset-0 z-[70] grid place-items-center bg-[#0d2236]/70 p-5"
          role="dialog"
        >
          <div className="w-full max-w-md border border-[#b24a38]/60 bg-[#f4f0e4] p-6 text-left shadow-[9px_9px_0_#b24a38] sm:p-8">
            <p className="font-mono text-[10px] tracking-[.16em] text-[#b24a38]">SESSION / TERMINATION</p>
            <h2 className="mt-3 font-[Impact,Haettenschweiler,Arial_Narrow_Bold,sans-serif] text-4xl leading-[.85] tracking-[-.02em] text-[#0d2236]" id={`terminate-title-${instanceId}`}>
              END THIS<br />
              SESSION?
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-[#0d2236]/70">
              This permanently terminates the cloud computer and cannot be undone.
            </p>
            {error ? <p className="mt-4 border-l-2 border-[#b24a38] pl-3 font-mono text-[11px] text-[#b24a38]">{error}</p> : null}
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                autoFocus
                className="border border-[#0d2236]/30 px-4 py-3 font-mono text-[11px] tracking-[.12em] text-[#0d2236] transition hover:border-[#0d2236] disabled:cursor-wait disabled:opacity-70"
                disabled={isTerminating}
                onClick={() => setIsConfirming(false)}
                type="button"
              >
                KEEP SESSION
              </button>
              <button
                className="bg-[#b24a38] px-4 py-3 font-mono text-[11px] font-semibold tracking-[.12em] text-white transition hover:bg-[#933829] disabled:cursor-wait disabled:opacity-70"
                disabled={isTerminating}
                onClick={terminateInstance}
                type="button"
              >
                {isTerminating ? "TERMINATING..." : "TERMINATE SESSION"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
