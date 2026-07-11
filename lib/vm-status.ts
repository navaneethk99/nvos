import type { VmStatus } from "@/db/schema";

export const transitionalVmStatuses = new Set<VmStatus>([
  "provisioning", "starting", "stopping", "terminating",
]);

export const stableVmStatuses = new Set<VmStatus>([
  "running", "stopped", "failed", "terminated",
]);

export function isTransitionalVmStatus(status: VmStatus) {
  return transitionalVmStatuses.has(status);
}

export function isStableVmStatus(status: VmStatus) {
  return stableVmStatuses.has(status);
}

export function vmStatusLabel(status: VmStatus) {
  return status.replace(/(^|-)\w/g, (letter) => letter.toUpperCase());
}

export function vmStatusBadgeVariant(status: VmStatus) {
  if (status === "running") return "success";
  if (status === "failed" || status === "terminated") return "danger";
  if (status === "stopped") return "neutral";
  return "pending";
}

export function allowedVmActions(status: VmStatus) {
  return {
    start: status === "stopped",
    stop: status === "running",
    terminate: status !== "terminated" && status !== "terminating",
    open: status === "running",
  };
}

export function getVmUrl(slug: string, baseDomain = "vm.nvos.in") {
  return `https://${slug}.${baseDomain}`;
}
