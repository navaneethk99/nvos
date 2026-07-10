import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { instance } from "@/db/schema";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = crypto.randomUUID();
  const createdInstance = {
    id,
    name: `workspace-${id.slice(0, 6)}`,
    region: "Asia South",
    machineType: "Standard / 4 vCPU / 8 GB",
    status: "running",
    userId: session.user.id,
  };

  await db.insert(instance).values(createdInstance);

  return NextResponse.json(createdInstance, { status: 201 });
}
