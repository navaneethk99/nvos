import { DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();

vi.mock("@/lib/aws/ec2", () => ({
  getEc2Client: () => ({ send }),
}));

import {
  ComputerNotFoundError,
  InvalidComputerIdError,
  getComputerStatus,
} from "@/lib/aws/get-computer-status";

const instanceId = "i-0123456789abcdef0";
const nvosTags = [
  { Key: "Project", Value: "nvos" },
  { Key: "ManagedBy", Value: "nvos-backend" },
  { Key: "Ephemeral", Value: "true" },
];

function ec2Response(currentInstance?: Record<string, unknown>) {
  return {
    Reservations: currentInstance ? [{ Instances: [currentInstance] }] : [],
  };
}

describe("getComputerStatus", () => {
  beforeEach(() => {
    send.mockReset();
    vi.unstubAllGlobals();
  });

  it("rejects malformed IDs without calling AWS", async () => {
    await expect(getComputerStatus("not-an-instance")).rejects.toBeInstanceOf(
      InvalidComputerIdError,
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("does not expose missing or untagged instances", async () => {
    send.mockResolvedValueOnce(ec2Response());
    await expect(getComputerStatus(instanceId)).rejects.toBeInstanceOf(
      ComputerNotFoundError,
    );

    send.mockResolvedValueOnce(
      ec2Response({ InstanceId: instanceId, State: { Name: "running" }, Tags: [] }),
    );
    await expect(getComputerStatus(instanceId)).rejects.toBeInstanceOf(
      ComputerNotFoundError,
    );
  });

  it("queries only the requested instance ID and maps pending safely", async () => {
    send.mockResolvedValue(
      ec2Response({ InstanceId: instanceId, State: { Name: "pending" }, Tags: nvosTags }),
    );

    await expect(getComputerStatus(instanceId)).resolves.toEqual({
      instanceId,
      state: "pending",
      stage: "starting",
      ready: false,
    });
    expect(send.mock.calls[0][0]).toBeInstanceOf(DescribeInstancesCommand);
    expect(send.mock.calls[0][0].input).toEqual({ InstanceIds: [instanceId] });
  });

  it("retries a transient DescribeInstances failure without widening the query", async () => {
    send
      .mockRejectedValueOnce(new Error("write EPROTO: bad record mac"))
      .mockResolvedValueOnce(
        ec2Response({ InstanceId: instanceId, State: { Name: "pending" }, Tags: nvosTags }),
      );

    await expect(getComputerStatus(instanceId)).resolves.toMatchObject({
      stage: "starting",
      ready: false,
    });
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls.every(([command]) => command.input.InstanceIds?.[0] === instanceId)).toBe(true);
  });

  it("reports network configuration without exposing an address", async () => {
    send.mockResolvedValue(
      ec2Response({ InstanceId: instanceId, State: { Name: "running" }, Tags: nvosTags }),
    );

    await expect(getComputerStatus(instanceId)).resolves.toEqual({
      instanceId,
      state: "running",
      stage: "configuring-network",
      ready: false,
    });
  });

  it("keeps the address private while the desktop endpoint is unavailable", async () => {
    send.mockResolvedValue(
      ec2Response({
        InstanceId: instanceId,
        State: { Name: "running" },
        PublicIpAddress: "203.0.113.25",
        Tags: nvosTags,
      }),
    );
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(getComputerStatus(instanceId)).resolves.toEqual({
      instanceId,
      state: "running",
      stage: "preparing-desktop",
      ready: false,
    });
  });

  it("returns only the safe desktop URL after a successful endpoint response", async () => {
    send.mockResolvedValue(
      ec2Response({
        InstanceId: instanceId,
        State: { Name: "running" },
        PublicIpAddress: "203.0.113.25",
        PrivateIpAddress: "10.0.0.4",
        Tags: nvosTags,
      }),
    );
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetch);

    await expect(getComputerStatus(instanceId)).resolves.toEqual({
      instanceId,
      state: "running",
      stage: "ready",
      ready: true,
      desktopUrl: "http://203.0.113.25:6080/",
    });
    expect(fetch).toHaveBeenCalledWith("http://203.0.113.25:6080/", {
      cache: "no-store",
      signal: expect.any(AbortSignal),
    });
  });

  it("maps stopped and terminated computers without probing the desktop", async () => {
    send.mockResolvedValueOnce(
      ec2Response({ InstanceId: instanceId, State: { Name: "stopped" }, Tags: nvosTags }),
    );
    await expect(getComputerStatus(instanceId)).resolves.toMatchObject({
      stage: "failed",
      ready: false,
    });

    send.mockResolvedValueOnce(
      ec2Response({ InstanceId: instanceId, State: { Name: "terminated" }, Tags: nvosTags }),
    );
    await expect(getComputerStatus(instanceId)).resolves.toMatchObject({
      stage: "terminated",
      ready: false,
    });
  });
});
