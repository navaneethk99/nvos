import { describe, expect, it, vi } from "vitest";

import {
  canStartComputer,
  pollIntervalMs,
  pollTimeoutMs,
  startComputerStatusPolling,
} from "@/app/dashboard/computer-status-poller";

describe("computer status polling", () => {
  it("stops and reports a timeout after ten minutes", () => {
    vi.useFakeTimers();
    const getStatus = vi.fn().mockResolvedValue({ stage: "starting" });
    const onTimeout = vi.fn();

    startComputerStatusPolling({ getStatus, onStatus: vi.fn(), onTimeout });
    vi.advanceTimersByTime(pollTimeoutMs);

    expect(onTimeout).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(pollIntervalMs);
    expect(getStatus).toHaveBeenCalledTimes(121);
    vi.useRealTimers();
  });

  it("prevents duplicate launches while creating or polling", () => {
    expect(canStartComputer(null, false)).toBe(true);
    expect(canStartComputer("i-0123456789abcdef0", false)).toBe(false);
    expect(canStartComputer(null, true)).toBe(false);
  });
});
