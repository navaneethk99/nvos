import { NextResponse } from "next/server";

import { createWindowsDesktopLaunch } from "@/lib/vm-control-client";
import { controlFailureResponse, findOwnedVm, requireVmUser } from "@/lib/vm-route";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const user = await requireVmUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const owned = await findOwnedVm(id, user.id);
  if ("response" in owned && owned.response) return owned.response;
  if (owned.vm.os !== "windows") return NextResponse.json({ error: "This VM does not use Windows desktop integration." }, { status: 400 });
  if (owned.vm.status !== "running") return NextResponse.json({ error: "The Windows VM is not running." }, { status: 409 });
  try {
    return NextResponse.json(await createWindowsDesktopLaunch(owned.vm.id, user.id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return controlFailureResponse(error);
  }
}
