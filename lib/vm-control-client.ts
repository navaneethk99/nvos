import "server-only";

import { getVmConfig } from "@/lib/vm-config";
import type { VmStatus } from "@/db/schema";
import type { VmPlan } from "@/lib/vm-plan";

// noVNC readiness can take several minutes after EC2 reports running.
// Keep this below the route's platform execution limit.
const timeoutMs = 270_000;

export class ControlServiceError extends Error {
  constructor(
    message: string,
    readonly kind: "timeout" | "authentication" | "conflict" | "validation" | "internal",
    readonly statusCode?: number,
  ) {
    super(message);
    this.name = "ControlServiceError";
  }
}

export type ControlVm = {
  vmId: string;
  slug: string;
  hostname: string;
  instanceId?: string;
  privateIp?: string;
  status: VmStatus;
  url?: string;
};

function isVmStatus(value: unknown): value is VmStatus {
  return typeof value === "string" && ["provisioning", "starting", "running", "stopping", "stopped", "terminating", "terminated", "failed"].includes(value);
}

function parseControlVm(value: unknown): ControlVm {
  if (!value || typeof value !== "object") throw new ControlServiceError("The VM control service returned an invalid response.", "internal");
  const data = value as Record<string, unknown>;
  if (typeof data.vmId !== "string" || typeof data.slug !== "string" || typeof data.hostname !== "string" || !isVmStatus(data.status)) {
    throw new ControlServiceError("The VM control service returned an invalid response.", "internal");
  }
  return {
    vmId: data.vmId,
    slug: data.slug,
    hostname: data.hostname,
    instanceId: typeof data.instanceId === "string" ? data.instanceId : undefined,
    privateIp: typeof data.privateIp === "string" ? data.privateIp : undefined,
    status: data.status,
    url: typeof data.url === "string" ? data.url : undefined,
  };
}

async function request(path: string, method: "GET" | "POST", body?: unknown) {
  const { controlSecret, controlUrl } = getVmConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${controlUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${controlSecret}`, "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
      signal: controller.signal,
    });
    if (!response.ok) {
      const kind = response.status === 401 || response.status === 403 ? "authentication" : response.status === 409 ? "conflict" : response.status === 400 || response.status === 422 ? "validation" : "internal";
      throw new ControlServiceError("The VM control service could not complete the request.", kind, response.status);
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new ControlServiceError("The VM control service returned invalid JSON.", "internal"); }
    return parseControlVm(data);
  } catch (error) {
    if (error instanceof ControlServiceError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") throw new ControlServiceError("The VM control service timed out.", "timeout");
    throw new ControlServiceError("The VM control service is unavailable.", "internal");
  } finally {
    clearTimeout(timer);
  }
}

export function createVm(input: { vmId: string; slug: string; userId: string; plan: VmPlan }) { return request("/internal/vms", "POST", input); }
export function startVm(vmId: string) { return request(`/internal/vms/${encodeURIComponent(vmId)}/start`, "POST"); }
export function stopVm(vmId: string) { return request(`/internal/vms/${encodeURIComponent(vmId)}/stop`, "POST"); }
export function terminateVm(vmId: string) { return request(`/internal/vms/${encodeURIComponent(vmId)}/terminate`, "POST"); }
export function getVmStatus(vmId: string) { return request(`/internal/vms/${encodeURIComponent(vmId)}`, "GET"); }
