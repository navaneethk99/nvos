import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { instance } from "@/db/schema";
import { auth } from "@/lib/auth";
import { terminateEphemeralComputer } from "@/lib/aws/terminate-ephemeral-computer";

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/instances/[instanceId]">,
) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { instanceId } = await context.params;
  const matchingInstances = await db
    .select({ id: instance.id })
    .from(instance)
    .where(and(eq(instance.id, instanceId), eq(instance.userId, session.user.id)));

  if (!matchingInstances[0]) {
    return NextResponse.json({ error: "Instance not found." }, { status: 404 });
  }

  try {
    const terminatedComputer = await terminateEphemeralComputer(instanceId);

    await db
      .update(instance)
      .set({ status: terminatedComputer.state })
      .where(and(eq(instance.id, instanceId), eq(instance.userId, session.user.id)));

    return NextResponse.json({
      instanceId: terminatedComputer.instanceId,
      state: terminatedComputer.state,
    });
  } catch (error) {
    console.error("Failed to terminate instance", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Unable to terminate the instance." },
      { status: 500 },
    );
  }
}
