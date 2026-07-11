"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  canStartComputer,
  type PolledComputerStatus,
  startComputerStatusPolling,
} from "./computer-status-poller";

const stageMessages = {
  starting: "Starting Ubuntu",
  "configuring-network": "Configuring network",
  "preparing-desktop": "Preparing desktop",
  ready: "Your computer is ready",
} as const;

const stageProgress = {
  starting: 18,
  "configuring-network": 42,
  "preparing-desktop": 74,
  ready: 100,
} as const;

const stageEta = {
  starting: "~8 MIN",
  "configuring-network": "~5 MIN",
  "preparing-desktop": "~2 MIN",
  ready: "READY",
} as const;

const stageLogMessages = {
  starting: "EC2 instance is booting Ubuntu",
  "configuring-network": "Public network address assigned",
  "preparing-desktop": "Docker desktop service is preparing",
  ready: "noVNC endpoint accepted the readiness check",
} as const;

function createStatusLog(message: string) {
  return `${new Date().toLocaleTimeString("en-US", { hour12: false })}  ${message}`;
}

export function CreateInstanceButton() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [stage, setStage] = useState<keyof typeof stageMessages>("starting");
  const [statusLogs, setStatusLogs] = useState<string[]>([]);
  const activeInstanceId = useRef<string | null>(null);
  const stopPollingRef = useRef<(() => void) | null>(null);

  function stopPolling() {
    stopPollingRef.current?.();
    stopPollingRef.current = null;
  }

  useEffect(() => stopPolling, []);

  async function createInstance() {
    if (!canStartComputer(activeInstanceId.current, isCreating)) {
      return;
    }

    setError(null);
    setStatusMessage(null);
    setStage("starting");
    setStatusLogs([]);
    setIsCreating(true);

    let response: Response;
    try {
      response = await fetch("/api/computers/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
    } catch {
      setError("The instance could not be created. Please try again.");
      setIsCreating(false);
      return;
    }

    if (!response.ok) {
      setError("The instance could not be created. Please try again.");
      setIsCreating(false);
      return;
    }

    let launchedComputer: { instanceId?: unknown };
    try {
      launchedComputer = (await response.json()) as { instanceId?: unknown };
    } catch {
      setError("The instance could not be created. Please try again.");
      setIsCreating(false);
      return;
    }
    if (typeof launchedComputer.instanceId !== "string") {
      setError("The instance could not be created. Please try again.");
      setIsCreating(false);
      return;
    }

    activeInstanceId.current = launchedComputer.instanceId;
    setStatusMessage(stageMessages.starting);
    setStatusLogs([
      createStatusLog(`Launch request accepted for ${launchedComputer.instanceId}`),
      createStatusLog(stageLogMessages.starting),
    ]);
    router.refresh();

    stopPollingRef.current = startComputerStatusPolling({
      getStatus: async () => {
        const instanceId = activeInstanceId.current;
        if (!instanceId) {
          throw new Error("Polling has stopped.");
        }

        const statusResponse = await fetch(`/api/computers/${instanceId}/status`, {
          cache: "no-store",
        });
        if (!statusResponse.ok) {
          throw new Error("Status request failed.");
        }

        return (await statusResponse.json()) as PolledComputerStatus;
      },
      onStatus: (status) => {
        if (status.stage in stageMessages) {
          const nextStage = status.stage as keyof typeof stageMessages;
          setStage(nextStage);
          setStatusMessage(stageMessages[nextStage]);
          setStatusLogs((logs) => {
            const nextLog = createStatusLog(stageLogMessages[nextStage]);
            return logs.at(-1)?.endsWith(stageLogMessages[nextStage])
              ? logs
              : [...logs, nextLog];
          });
        }

        if (status.stage === "ready" && status.desktopUrl) {
          activeInstanceId.current = null;
          window.location.assign(status.desktopUrl);
          return;
        }

        if (status.stage === "failed" || status.stage === "terminated") {
          stopPolling();
          activeInstanceId.current = null;
          setIsCreating(false);
          setError("The computer could not be prepared. Please try again.");
        }
      },
      onTimeout: () => {
        stopPolling();
        activeInstanceId.current = null;
        setIsCreating(false);
        setError("The computer is taking too long to prepare. Please try again.");
      },
    });
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
      {isCreating && statusMessage ? (
        <div
          aria-live="polite"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#0d2236] text-[#f4f0e4]"
          role="dialog"
        >
          <section className="grid min-h-full lg:grid-cols-[minmax(360px,.8fr)_minmax(0,1.2fr)]">
            <div className="relative flex min-h-[42vh] flex-col overflow-hidden border-b border-[#b9e7d2]/20 bg-[#17344f] p-7 sm:p-10 lg:min-h-screen lg:border-b-0 lg:border-r">
              <div className="absolute -left-20 -top-20 size-64 rounded-full border border-[#b9e7d2]/15" />
              <p className="relative font-mono text-[10px] tracking-[.18em] text-[#b9e7d2]">NVOS / COMPUTER PROVISIONING</p>
              <div className="relative my-auto py-12">
                <p className="font-mono text-[10px] tracking-[.14em] text-[#f4f0e4]/50">CURRENT OPERATION</p>
                <h2 className="mt-4 max-w-md text-5xl leading-[.9] tracking-[-.06em] sm:text-6xl">{statusMessage}</h2>
                <p className="mt-6 font-mono text-[10px] tracking-[.14em] text-[#b9e7d2]/70">ETA</p>
                <p className="mt-1 font-[Impact,Haettenschweiler,Arial_Narrow_Bold,sans-serif] text-7xl leading-none text-[#f6c95d]">{stageEta[stage]}</p>
              </div>
              <div className="relative">
                <div className="h-3 overflow-hidden bg-[#0d2236] p-[3px]">
                  <div className="h-full bg-[#b9e7d2] transition-[width] duration-700 ease-out" style={{ width: `${stageProgress[stage]}%` }} />
                </div>
                <div className="mt-3 flex justify-between font-mono text-[9px] tracking-[.14em] text-[#f4f0e4]/45"><span>LAUNCH</span><span>NETWORK</span><span>DESKTOP</span></div>
                <p className="mt-7 font-mono text-[10px] tracking-[.1em] text-[#f4f0e4]/45">YOUR DESKTOP OPENS AUTOMATICALLY WHEN READY.</p>
              </div>
            </div>

            <div className="flex min-h-[58vh] flex-col bg-[#081521] p-5 sm:p-8 lg:min-h-screen">
              <div className="flex items-center justify-between border-b border-[#b9e7d2]/20 pb-4 font-mono text-[10px] tracking-[.14em] text-[#b9e7d2]">
                <span>LIVE PROVISIONING STATUS</span>
                <span className="flex items-center gap-2 text-[#f4f0e4]/50"><i className="size-1.5 animate-pulse rounded-full bg-[#b9e7d2]" />CONNECTED</span>
              </div>
              <div className="mt-5 flex-1 overflow-auto font-mono text-xs leading-7 text-[#b9e7d2]/85 sm:text-sm">
                <p className="text-[#f4f0e4]/40">nvos@control-plane:~$ watch computer-status</p>
                {statusLogs.map((log) => <p key={log}>{log}</p>)}
                <p className="animate-pulse text-[#f6c95d]">_</p>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
