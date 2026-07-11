import "server-only";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { type VmStatus, virtualMachine, vmOperatingSystems } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getVmUrl } from "@/lib/vm-status";
import { getVmConfig } from "@/lib/vm-config";

export async function requireVmUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export function publicVm(vm: typeof virtualMachine.$inferSelect) {
  return {
    id: vm.id, name: vm.name, description: vm.description, plan: vm.plan, os: vm.os, instanceType: vm.instanceType,
    slug: vm.slug, hostname: vm.hostname, status: vm.status,
    failureReason: vm.failureReason, createdAt: vm.createdAt, updatedAt: vm.updatedAt,
    stoppedAt: vm.stoppedAt, terminatedAt: vm.terminatedAt,
    url: getVmUrl(vm.slug, getVmConfig().baseDomain),
  };
}

export async function findOwnedVm(id: string, userId: string) {
  const rows = await db.select().from(virtualMachine).where(eq(virtualMachine.id, id));
  const vm = rows[0];
  if (!vm) return { response: NextResponse.json({ error: "VM not found." }, { status: 404 }) };
  if (vm.userId !== userId) return { response: NextResponse.json({ error: "You do not own this VM." }, { status: 403 }) };
  return { vm };
}

export function controlFailureResponse(error: unknown) {
  const kind = error && typeof error === "object" && "kind" in error ? (error as { kind: string }).kind : "internal";
  const status = kind === "timeout" ? 504 : 502;
  return NextResponse.json({ error: kind === "timeout" ? "The VM control service timed out." : "The VM control service is unavailable." }, { status });
}

export async function updateOwnedVm(id: string, userId: string, values: Partial<typeof virtualMachine.$inferInsert>) {
  const rows = await db.update(virtualMachine).set({ ...values, updatedAt: new Date() }).where(and(eq(virtualMachine.id, id), eq(virtualMachine.userId, userId))).returning();
  return rows[0];
}

export function isVmStatus(value: string): value is VmStatus {
  return ["provisioning", "starting", "running", "stopping", "stopped", "terminating", "terminated", "failed"].includes(value);
}

export function isVmOperatingSystem(value: unknown): value is (typeof vmOperatingSystems)[number] {
  return typeof value === "string" && vmOperatingSystems.includes(value as (typeof vmOperatingSystems)[number]);
}
