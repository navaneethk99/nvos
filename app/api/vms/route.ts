import { and, desc, eq, lt } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { virtualMachine } from "@/db/schema";
import { ControlServiceError, createVm, getVmStatus } from "@/lib/vm-control-client";
import { getVmConfig } from "@/lib/vm-config";
import { INSTANCE_TYPES, isVmPlan } from "@/lib/vm-plan";
import { publicVm, requireVmUser, controlFailureResponse } from "@/lib/vm-route";
import { generateUniqueVmSlug } from "@/lib/vm-slug";
import { isTransitionalVmStatus } from "@/lib/vm-status";

// Provisioning waits for the proxy to verify desktop readiness.
export const maxDuration = 300;

function parseCreateRequest(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { name, description, plan } = value as Record<string, unknown>;
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanDescription = typeof description === "string" ? description.trim() : "";
  if (!cleanName || cleanName.length > 80 || cleanDescription.length > 500 || !isVmPlan(plan)) return null;
  return { name: cleanName, description: cleanDescription || null, plan };
}

export async function GET() {
  const user = await requireVmUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // A control service outage must not leave old provisioning records blocking users forever.
  await db.update(virtualMachine).set({ status: "failed", failureReason: "Provisioning did not complete. Please try again.", updatedAt: new Date() })
    .where(and(eq(virtualMachine.userId, user.id), eq(virtualMachine.status, "provisioning"), lt(virtualMachine.createdAt, new Date(Date.now() - 10 * 60 * 1_000))));
  const storedVms = await db.select().from(virtualMachine).where(eq(virtualMachine.userId, user.id)).orderBy(desc(virtualMachine.createdAt));
  let vms = storedVms;
  for (const activeVm of storedVms.filter((vm) => isTransitionalVmStatus(vm.status))) {
    try {
      const controlled = await getVmStatus(activeVm.id);
      const [updated] = await db.update(virtualMachine).set({
        status: controlled.status,
        instanceId: controlled.instanceId ?? activeVm.instanceId,
        privateIp: controlled.privateIp ?? activeVm.privateIp,
        failureReason: null,
        stoppedAt: controlled.status === "stopped" ? new Date() : activeVm.stoppedAt,
        terminatedAt: controlled.status === "terminated" ? new Date() : activeVm.terminatedAt,
        updatedAt: new Date(),
      }).where(eq(virtualMachine.id, activeVm.id)).returning();
      vms = vms.map((vm) => vm.id === updated.id ? updated : vm);
    } catch (error) {
      console.warn("Active VM reconciliation was unavailable", {
        vmId: activeVm.id,
        errorKind: error instanceof ControlServiceError ? error.kind : error instanceof Error ? error.name : "UnknownError",
      });
    }
  }
  return NextResponse.json({ vms: vms.map(publicVm) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await requireVmUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let input: ReturnType<typeof parseCreateRequest>;
  try { input = parseCreateRequest(await request.json()); } catch { input = null; }
  if (!input) return NextResponse.json({ error: "Enter a valid name and select a supported plan." }, { status: 400 });

  try {
    const slug = await generateUniqueVmSlug(async (candidate) => !(await db.select({ id: virtualMachine.id }).from(virtualMachine).where(eq(virtualMachine.slug, candidate)).limit(1))[0]);
    const hostname = `${slug}.${getVmConfig().baseDomain}`;
    let vm: typeof virtualMachine.$inferSelect;
    try {
      [vm] = await db.insert(virtualMachine).values({ userId: user.id, name: input.name, description: input.description, plan: input.plan, instanceType: INSTANCE_TYPES[input.plan], slug, hostname, status: "provisioning" }).returning();
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "23505") return NextResponse.json({ error: "That VM address is already in use. Please retry." }, { status: 409 });
      throw error;
    }

    try {
      const controlled = await createVm({ vmId: vm.id, slug, userId: user.id, plan: input.plan });
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
