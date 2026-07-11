import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { virtualMachine } from "@/db/schema";
import { stopVm } from "@/lib/vm-control-client";
import { controlFailureResponse, findOwnedVm, publicVm, requireVmUser } from "@/lib/vm-route";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireVmUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const result = await findOwnedVm(id, user.id);
  if (result.response) return result.response;
  const vm = result.vm!;
  if (vm.status !== "running") return NextResponse.json({ error: "This VM cannot be stopped from its current state." }, { status: 400 });
  const [pending] = await db.update(virtualMachine).set({ status: "stopping", updatedAt: new Date() }).where(eq(virtualMachine.id, id)).returning();
  try {
    const controlled = await stopVm(id);
    const stopped = controlled.status === "stopped";
    const [updated] = await db.update(virtualMachine).set({ status: controlled.status, stoppedAt: stopped ? new Date() : null, updatedAt: new Date() }).where(eq(virtualMachine.id, id)).returning();
    return NextResponse.json({ vm: publicVm(updated) }, { status: stopped ? 200 : 202 });
  } catch (error) {
    await db.update(virtualMachine).set({ status: "running", updatedAt: new Date() }).where(eq(virtualMachine.id, id));
    console.error("VM stop failed", { vmId: pending.id, errorKind: error instanceof Error ? error.name : "UnknownError" });
    return controlFailureResponse(error);
  }
}
