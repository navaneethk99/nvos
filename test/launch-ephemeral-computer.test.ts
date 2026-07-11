import { RunInstancesCommand } from "@aws-sdk/client-ec2";
import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();

vi.mock("@/lib/aws/ec2", () => ({
  getEc2Client: () => ({ send }),
}));

vi.mock("@/lib/aws/ec2-launch-config", () => ({
  getEc2LaunchConfiguration: () => ({
    amiId: "ami-test",
    instanceType: "t3.micro",
    keyName: "test-key",
    securityGroupId: "sg-test",
    subnetId: "subnet-test",
  }),
}));

import { launchEphemeralComputer } from "@/lib/aws/launch-ephemeral-computer";

describe("launchEphemeralComputer", () => {
  beforeEach(() => {
    send.mockReset();
  });

  it("launches one disposable instance and returns a safe response", async () => {
    send.mockResolvedValue({
      Instances: [
        {
          InstanceId: "i-test",
          State: { Name: "pending" },
          ImageId: "ami-test",
          PrivateIpAddress: "10.0.0.10",
        },
      ],
    });

    await expect(launchEphemeralComputer("t3.medium")).resolves.toEqual({
      instanceId: "i-test",
      state: "pending",
      instanceType: "t3.medium",
    });

    expect(send).toHaveBeenCalledTimes(1);
    const command = send.mock.calls[0][0];
    expect(command).toBeInstanceOf(RunInstancesCommand);
    expect(command.input).toMatchObject({
      ImageId: "ami-test",
      InstanceType: "t3.medium",
      KeyName: "test-key",
      MinCount: 1,
      MaxCount: 1,
      NetworkInterfaces: [
        {
          DeviceIndex: 0,
          AssociatePublicIpAddress: true,
          DeleteOnTermination: true,
          Groups: ["sg-test"],
          SubnetId: "subnet-test",
        },
      ],
      TagSpecifications: [
        {
          ResourceType: "instance",
          Tags: [
            { Key: "Name", Value: "nvos-session" },
            { Key: "Project", Value: "nvos" },
            { Key: "ManagedBy", Value: "nvos-backend" },
            { Key: "Ephemeral", Value: "true" },
          ],
        },
        {
          ResourceType: "volume",
          Tags: [
            { Key: "Name", Value: "nvos-session" },
            { Key: "Project", Value: "nvos" },
            { Key: "ManagedBy", Value: "nvos-backend" },
            { Key: "Ephemeral", Value: "true" },
          ],
        },
      ],
    });
    expect(command.input).not.toHaveProperty("BlockDeviceMappings");
  });
});
