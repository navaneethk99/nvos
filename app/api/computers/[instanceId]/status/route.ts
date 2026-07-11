import { NextResponse } from "next/server";

import {
  ComputerNotFoundError,
  InvalidComputerIdError,
  getComputerStatus,
} from "@/lib/aws/get-computer-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
  context: { params: Promise<{ instanceId: string }> },
) {
  const { instanceId } = await context.params;

  try {
    const status = await getComputerStatus(instanceId);

    return NextResponse.json(status, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (
      error instanceof InvalidComputerIdError ||
      (error instanceof Error && error.name === "InvalidComputerIdError")
    ) {
      return NextResponse.json({ error: "Invalid instance ID." }, { status: 400 });
    }

    if (
      error instanceof ComputerNotFoundError ||
      (error instanceof Error && error.name === "ComputerNotFoundError")
    ) {
      return NextResponse.json({ error: "Computer not found." }, { status: 404 });
    }

    console.error("Failed to get computer status", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Unable to get computer status." },
      { status: 500 },
    );
  }
}
