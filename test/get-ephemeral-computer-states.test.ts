import { DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();

vi.mock("@/lib/aws/ec2", () => ({
  getEc2Client: () => ({ send }),
}));

import { getEphemeralComputerStates } from "@/lib/aws/get-ephemeral-computer-states";

describe("getEphemeralComputerStates", () => {
  beforeEach(() => {
    send.mockReset();
  });

  it("returns each EC2 state from the requested instances", async () => {
    send.mockResolvedValue({
      Reservations: [
        {
          Instances: [
            { InstanceId: "i-running", State: { Name: "running" } },
            { InstanceId: "i-pending", State: { Name: "pending" } },
          ],
        },
      ],
    });

    await expect(
      getEphemeralComputerStates(["i-running", "i-pending"]),
    ).resolves.toEqual({
      "i-running": "running",
      "i-pending": "pending",
    });

    const command = send.mock.calls[0][0];
    expect(command).toBeInstanceOf(DescribeInstancesCommand);
    expect(command.input).toEqual({
      InstanceIds: ["i-running", "i-pending"],
    });
  });

  it("does not call EC2 when there are no instances", async () => {
    await expect(getEphemeralComputerStates([])).resolves.toEqual({});

    expect(send).not.toHaveBeenCalled();
  });
});
