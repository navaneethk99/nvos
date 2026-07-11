import { TerminateInstancesCommand } from "@aws-sdk/client-ec2";
import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();

vi.mock("@/lib/aws/ec2", () => ({
  getEc2Client: () => ({ send }),
}));

import { terminateEphemeralComputer } from "@/lib/aws/terminate-ephemeral-computer";

describe("terminateEphemeralComputer", () => {
  beforeEach(() => {
    send.mockReset();
  });

  it("terminates the requested instance and returns safe fields", async () => {
    send.mockResolvedValue({
      TerminatingInstances: [
        {
          InstanceId: "i-test",
          CurrentState: { Name: "shutting-down" },
          PreviousState: { Name: "running" },
        },
      ],
    });

    await expect(terminateEphemeralComputer("i-test")).resolves.toEqual({
      instanceId: "i-test",
      state: "shutting-down",
    });

    const command = send.mock.calls[0][0];
    expect(command).toBeInstanceOf(TerminateInstancesCommand);
    expect(command.input).toEqual({ InstanceIds: ["i-test"] });
  });
});
