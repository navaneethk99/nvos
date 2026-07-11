import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { virtualMachine } from "@/db/schema";
import { startVm } from "@/lib/vm-control-client";
import { controlFailureResponse, findOwnedVm, publicVm, requireVmUser } from "@/lib/vm-route";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireVmUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const result = await findOwnedVm(id, user.id);
  if (result.response) return result.response;
  const vm = result.vm!;
  if (vm.status !== "stopped") return NextResponse.json({ error: "This VM cannot be started from its current state." }, { status: 400 });
  const [pending] = await db.update(virtualMachine).set({ status: "starting", failureReason: null, updatedAt: new Date() }).where(eq(virtualMachine.id, id)).returning();
  try {
    const controlled = await startVm(id);
    const [updated] = await db.update(virtualMachine).set({ status: controlled.status, updatedAt: new Date() }).where(eq(virtualMachine.id, id)).returning();
    return NextResponse.json({ vm: publicVm(updated) }, { status: updated.status === "starting" ? 202 : 200 });
  } catch (error) {
    await db.update(virtualMachine).set({ status: "stopped", updatedAt: new Date() }).where(eq(virtualMachine.id, id));
    console.error("VM start failed", { vmId: pending.id, errorKind: error instanceof Error ? error.name : "UnknownError" });
    return controlFailureResponse(error);
  }
}
