import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { instance } from "@/db/schema";
import { auth } from "@/lib/auth";
import { launchEphemeralComputer } from "@/lib/aws/launch-ephemeral-computer";

export const runtime = "nodejs";

type StartComputerRequest = {
  preset?: "basic";
};

async function parseStartComputerRequest(
  request: Request,
): Promise<StartComputerRequest> {
  if (!request.body) {
    return {};
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new Error("Invalid JSON request body.");
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => key !== "preset") ||
    ("preset" in body && body.preset !== "basic")
  ) {
    throw new Error("Unsupported start computer request.");
  }

  return body;
}

export async function POST(request: Request) {
  try {
    await parseStartComputerRequest(request);
  } catch (error) {
    console.warn("Rejected computer launch request", {
      reason: error instanceof Error ? error.message : "Unknown validation error",
    });

    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // This route invokes the launch service exactly once for each accepted request.
    const launchedComputer = await launchEphemeralComputer();

    await db.insert(instance).values({
      id: launchedComputer.instanceId,
      name: `workspace-${launchedComputer.instanceId.slice(-6)}`,
      region: "Asia South",
      machineType: launchedComputer.instanceType,
      status: launchedComputer.state,
      userId: session.user.id,
    });

    return NextResponse.json({
      instanceId: launchedComputer.instanceId,
      state: launchedComputer.state,
      instanceType: launchedComputer.instanceType,
    });
  } catch (error) {
    console.error("Failed to launch ephemeral EC2 computer", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Unable to start a computer." },
      { status: 500 },
    );
  }
}
