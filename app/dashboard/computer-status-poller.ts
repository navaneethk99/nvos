export type PolledComputerStatus = {
  stage: "starting" | "configuring-network" | "preparing-desktop" | "ready" | "failed" | "terminated";
  desktopUrl?: string;
};

export const pollIntervalMs = 5_000;
export const pollTimeoutMs = 10 * 60 * 1_000;

export function canStartComputer(activeInstanceId: string | null, isCreating: boolean) {
  return !activeInstanceId && !isCreating;
}

export function startComputerStatusPolling({
  getStatus,
  onStatus,
  onTimeout,
}: {
  getStatus: () => Promise<PolledComputerStatus>;
  onStatus: (status: PolledComputerStatus) => void;
  onTimeout: () => void;
}) {
  let stopped = false;
  let interval: ReturnType<typeof setInterval> | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const stop = () => {
    stopped = true;
    if (interval) {
      clearInterval(interval);
      interval = undefined;
    }
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }
  };

  const poll = async () => {
    try {
      const status = await getStatus();
      if (stopped) {
        return;
      }

      onStatus(status);
      if (
        status.stage === "ready" ||
        status.stage === "failed" ||
        status.stage === "terminated"
      ) {
        stop();
      }
    } catch {
      // Poll again after transient transport and route failures.
    }
  };

  interval = setInterval(() => void poll(), pollIntervalMs);
  timeout = setTimeout(() => {
    if (!stopped) {
      stop();
      onTimeout();
    }
  }, pollTimeoutMs);
  void poll();

  return stop;
}
