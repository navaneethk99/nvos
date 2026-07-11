import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { virtualMachine } from "@/db/schema";
import { getVmStatus, terminateVm } from "@/lib/vm-control-client";
import { controlFailureResponse, findOwnedVm, publicVm, requireVmUser } from "@/lib/vm-route";
import { isTransitionalVmStatus } from "@/lib/vm-status";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireVmUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const result = await findOwnedVm(id, user.id);
  if (result.response) return result.response;
  let vm = result.vm!;
  if (isTransitionalVmStatus(vm.status)) {
    try {
      const controlled = await getVmStatus(id);
      const [updated] = await db.update(virtualMachine).set({ status: controlled.status, instanceId: controlled.instanceId ?? vm.instanceId, privateIp: controlled.privateIp ?? vm.privateIp, stoppedAt: controlled.status === "stopped" ? new Date() : vm.stoppedAt, terminatedAt: controlled.status === "terminated" ? new Date() : vm.terminatedAt, updatedAt: new Date() }).where(eq(virtualMachine.id, id)).returning();
      vm = updated;
    } catch (error) {
      console.warn("VM status reconciliation failed", { vmId: id, errorKind: error instanceof Error ? error.name : "UnknownError" });
    }
  }
  return NextResponse.json({ vm: publicVm(vm) }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireVmUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const result = await findOwnedVm(id, user.id);
  if (result.response) return result.response;
  const vm = result.vm!;
  if (vm.status === "terminated") return NextResponse.json({ vm: publicVm(vm) });
  if (vm.status === "terminating") return NextResponse.json({ vm: publicVm(vm) }, { status: 202 });
  if (!vm.instanceId) {
    const [updated] = await db.update(virtualMachine).set({ status: "terminated", terminatedAt: new Date(), updatedAt: new Date() }).where(eq(virtualMachine.id, id)).returning();
    return NextResponse.json({ vm: publicVm(updated) });
  }
  await db.update(virtualMachine).set({ status: "terminating", updatedAt: new Date() }).where(eq(virtualMachine.id, id)).returning();
  try {
    const controlled = await terminateVm(id);
    const [updated] = await db.update(virtualMachine).set({ status: controlled.status === "terminated" ? "terminated" : "terminating", terminatedAt: controlled.status === "terminated" ? new Date() : null, updatedAt: new Date() }).where(eq(virtualMachine.id, id)).returning();
    return NextResponse.json({ vm: publicVm(updated) }, { status: updated.status === "terminated" ? 200 : 202 });
  } catch (error) {
    await db.update(virtualMachine).set({ status: vm.status, updatedAt: new Date() }).where(eq(virtualMachine.id, id));
    console.error("VM termination failed", { vmId: id, errorKind: error instanceof Error ? error.name : "UnknownError" });
    return controlFailureResponse(error);
  }
}
