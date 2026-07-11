import "server-only";

import { DescribeInstancesCommand, type Instance } from "@aws-sdk/client-ec2";

import { getEc2Client } from "@/lib/aws/ec2";

export type ComputerStage =
  | "starting"
  | "configuring-network"
  | "preparing-desktop"
  | "ready"
  | "failed"
  | "terminated";

export type ComputerStatus = {
  instanceId: string;
  state: string;
  stage: ComputerStage;
  ready: boolean;
  desktopUrl?: string;
};

export class InvalidComputerIdError extends Error {
  constructor() {
    super("Invalid EC2 instance ID.");
    this.name = "InvalidComputerIdError";
  }
}

export class ComputerNotFoundError extends Error {
  constructor() {
    super("Computer not found.");
    this.name = "ComputerNotFoundError";
  }
}

const instanceIdPattern = /^i-(?:[0-9a-f]{8}|[0-9a-f]{17})$/;

function isNvosComputer(currentInstance: Instance) {
  const tags = new Map(
    (currentInstance.Tags ?? [])
      .filter((tag) => tag.Key && tag.Value)
      .map((tag) => [tag.Key!, tag.Value!]),
  );

  return (
    tags.get("Project") === "nvos" &&
    tags.get("ManagedBy") === "nvos-backend" &&
    tags.get("Ephemeral") === "true"
  );
}

function findMatchingInstance(
  reservations: Array<{ Instances?: Instance[] }> | undefined,
  instanceId: string,
) {
  for (const reservation of reservations ?? []) {
    const currentInstance = reservation.Instances?.find(
      (candidate) => candidate.InstanceId === instanceId,
    );

    if (currentInstance) {
      return currentInstance;
    }
  }
}

async function isDesktopReady(publicIpAddress: string) {
  try {
    const response = await fetch(`http://${publicIpAddress}:6080/`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function describeInstance(instanceId: string) {
  let lastError: unknown;

  // DescribeInstances is read-only, so one immediate retry is safe for transient TLS failures.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await getEc2Client().send(
        new DescribeInstancesCommand({ InstanceIds: [instanceId] }),
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export async function getComputerStatus(
  instanceId: string,
): Promise<ComputerStatus> {
  if (!instanceIdPattern.test(instanceId)) {
    throw new InvalidComputerIdError();
  }

  const response = await describeInstance(instanceId);
  const currentInstance = findMatchingInstance(response.Reservations, instanceId);

  if (!currentInstance || !isNvosComputer(currentInstance)) {
    throw new ComputerNotFoundError();
  }

  const state = currentInstance.State?.Name ?? "unknown";

  if (state === "pending") {
    return { instanceId, state, stage: "starting", ready: false };
  }

  if (state === "shutting-down" || state === "terminated") {
    return { instanceId, state, stage: "terminated", ready: false };
  }

  if (state !== "running") {
    return { instanceId, state, stage: "failed", ready: false };
  }

  if (!currentInstance.PublicIpAddress) {
    return { instanceId, state, stage: "configuring-network", ready: false };
  }

  if (!(await isDesktopReady(currentInstance.PublicIpAddress))) {
    return { instanceId, state, stage: "preparing-desktop", ready: false };
  }

  return {
    instanceId,
    state,
    stage: "ready",
    ready: true,
    desktopUrl: `http://${currentInstance.PublicIpAddress}:6080/`,
  };
}
