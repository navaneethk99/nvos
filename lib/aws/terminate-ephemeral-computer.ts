import "server-only";

import { TerminateInstancesCommand } from "@aws-sdk/client-ec2";

import { getEc2Client } from "@/lib/aws/ec2";

export type TerminatedComputer = {
  instanceId: string;
  state: string;
};

export async function terminateEphemeralComputer(
  instanceId: string,
): Promise<TerminatedComputer> {
  const response = await getEc2Client().send(
    new TerminateInstancesCommand({ InstanceIds: [instanceId] }),
  );
  const terminatedInstance = response.TerminatingInstances?.find(
    (currentInstance) => currentInstance.InstanceId === instanceId,
  );

  if (!terminatedInstance?.CurrentState?.Name) {
    throw new Error("EC2 did not return the terminated instance details.");
  }

  return {
    instanceId,
    state: terminatedInstance.CurrentState.Name,
  };
}
