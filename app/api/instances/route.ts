import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { instance } from "@/db/schema";
import { auth } from "@/lib/auth";
import { launchEphemeralComputer } from "@/lib/aws/launch-ephemeral-computer";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const launchedComputer = await launchEphemeralComputer();
    const createdInstance = {
      id: launchedComputer.instanceId,
      name: `workspace-${launchedComputer.instanceId.slice(-6)}`,
      region: "Asia South",
      machineType: launchedComputer.instanceType,
      status: launchedComputer.state,
      userId: session.user.id,
    };

    await db.insert(instance).values(createdInstance);

    return NextResponse.json({
      instanceId: launchedComputer.instanceId,
      state: launchedComputer.state,
      instanceType: launchedComputer.instanceType,
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create instance", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Unable to create an instance." },
      { status: 500 },
    );
  }
}
