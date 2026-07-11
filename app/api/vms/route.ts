import { and, desc, eq, lt, notInArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { type VmStatus, virtualMachine } from "@/db/schema";
import { ControlServiceError, createVm, getVmStatus } from "@/lib/vm-control-client";
import { getVmConfig } from "@/lib/vm-config";
import { publicVm, requireVmUser, controlFailureResponse } from "@/lib/vm-route";
import { generateUniqueVmSlug } from "@/lib/vm-slug";

// Provisioning waits for the proxy to verify desktop readiness.
export const maxDuration = 300;

const terminalStatuses: VmStatus[] = ["terminated", "failed"];

export async function GET() {
  const user = await requireVmUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // A control service outage must not leave old provisioning records blocking users forever.
  await db.update(virtualMachine).set({ status: "failed", failureReason: "Provisioning did not complete. Please try again.", updatedAt: new Date() })
    .where(and(eq(virtualMachine.userId, user.id), eq(virtualMachine.status, "provisioning"), lt(virtualMachine.createdAt, new Date(Date.now() - 10 * 60 * 1_000))));
  const storedVms = await db.select().from(virtualMachine).where(eq(virtualMachine.userId, user.id)).orderBy(desc(virtualMachine.createdAt));
  const vms = await Promise.all(storedVms.map(async (vm) => {
    if (vm.status !== "failed") return vm;
    try {
      const controlled = await getVmStatus(vm.id);
      const [updated] = await db.update(virtualMachine).set({
        status: controlled.status,
        instanceId: controlled.instanceId ?? vm.instanceId,
        privateIp: controlled.privateIp ?? vm.privateIp,
        failureReason: null,
        stoppedAt: controlled.status === "stopped" ? new Date() : vm.stoppedAt,
        terminatedAt: controlled.status === "terminated" ? new Date() : vm.terminatedAt,
        updatedAt: new Date(),
      }).where(eq(virtualMachine.id, vm.id)).returning();
      return updated;
    } catch (error) {
      // A failed launch has no EC2 tags to reconcile; retain its safe failure state.
      console.warn("Failed VM reconciliation was unavailable", { vmId: vm.id, errorKind: error instanceof ControlServiceError ? error.kind : error instanceof Error ? error.name : "UnknownError" });
      return vm;
    }
  }));
  return NextResponse.json({ vms: vms.map(publicVm) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST() {
  const user = await requireVmUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const active = await db.select({ id: virtualMachine.id }).from(virtualMachine)
    .where(and(eq(virtualMachine.userId, user.id), notInArray(virtualMachine.status, terminalStatuses))).limit(1);
  if (active[0]) return NextResponse.json({ error: "You already have an active VM." }, { status: 409 });

  try {
    const slug = await generateUniqueVmSlug(async (candidate) => !(await db.select({ id: virtualMachine.id }).from(virtualMachine).where(eq(virtualMachine.slug, candidate)).limit(1))[0]);
    const hostname = `${slug}.${getVmConfig().baseDomain}`;
    let vm: typeof virtualMachine.$inferSelect;
    try {
      [vm] = await db.insert(virtualMachine).values({ userId: user.id, slug, hostname, status: "provisioning" }).returning();
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "23505") return NextResponse.json({ error: "You already have an active VM." }, { status: 409 });
      throw error;
    }

    try {
      const controlled = await createVm({ vmId: vm.id, slug, userId: user.id });
      const [updated] = await db.update(virtualMachine).set({ instanceId: controlled.instanceId, privateIp: controlled.privateIp, hostname: controlled.hostname, status: controlled.status, updatedAt: new Date() }).where(eq(virtualMachine.id, vm.id)).returning();
      return NextResponse.json({ vm: publicVm(updated) }, { status: controlled.status === "provisioning" || controlled.status === "starting" ? 202 : 201 });
    } catch (error) {
      const outcomeUnknown = error instanceof ControlServiceError && (
        error.kind === "timeout" || error.statusCode === undefined
      );
      if (outcomeUnknown) {
        // The proxy may have accepted the request even though its response was
        // interrupted. Preserve provisioning so status polling can reconcile it.
        const [pending] = await db.update(virtualMachine).set({
          status: "provisioning",
          failureReason: null,
          updatedAt: new Date(),
        }).where(eq(virtualMachine.id, vm.id)).returning();
        console.warn("VM provisioning outcome is unknown; awaiting reconciliation", {
          vmId: vm.id,
          userId: user.id,
          errorKind: error.kind,
        });
        return NextResponse.json({ vm: publicVm(pending) }, { status: 202 });
      }
      await db.update(virtualMachine).set({ status: "failed", failureReason: "Unable to provision the VM. Please try again.", updatedAt: new Date() }).where(eq(virtualMachine.id, vm.id));
      console.error("VM provisioning failed", {
        vmId: vm.id,
        userId: user.id,
        errorKind: error instanceof ControlServiceError ? error.kind : error instanceof Error ? error.name : "UnknownError",
        controlStatusCode: error instanceof ControlServiceError ? error.statusCode : undefined,
      });
      return controlFailureResponse(error);
    }
  } catch (error) {
    console.error("VM creation failed", { userId: user.id, errorKind: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: "Unable to create a VM." }, { status: 500 });
  }
}
