import "server-only";

import { DescribeInstancesCommand } from "@aws-sdk/client-ec2";

import { getEc2Client } from "@/lib/aws/ec2";

export async function getEphemeralComputerStates(
  instanceIds: readonly string[],
): Promise<Record<string, string>> {
  if (instanceIds.length === 0) {
    return {};
  }

  const response = await getEc2Client().send(
    new DescribeInstancesCommand({ InstanceIds: [...instanceIds] }),
  );
  const states: Record<string, string> = {};

  for (const reservation of response.Reservations ?? []) {
    for (const currentInstance of reservation.Instances ?? []) {
      if (currentInstance.InstanceId && currentInstance.State?.Name) {
        states[currentInstance.InstanceId] = currentInstance.State.Name;
      }
    }
  }

  return states;
}
