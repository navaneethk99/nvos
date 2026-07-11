import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, insert, launchEphemeralComputer } = vi.hoisted(() => ({
  getSession: vi.fn(),
  insert: vi.fn(),
  launchEphemeralComputer: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession } },
}));

vi.mock("@/db", () => ({
  db: { insert },
}));

vi.mock("@/db/schema", () => ({
  instance: "instance",
}));

vi.mock("@/lib/aws/launch-ephemeral-computer", () => ({
  launchEphemeralComputer,
}));

import { POST } from "@/app/api/instances/route";

describe("POST /api/instances", () => {
  beforeEach(() => {
    getSession.mockReset();
    insert.mockReset();
    launchEphemeralComputer.mockReset();
  });

  it("requires an authenticated user before launching", async () => {
    getSession.mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(401);
    expect(launchEphemeralComputer).not.toHaveBeenCalled();
  });

  it("launches once, saves the instance, and returns safe fields", async () => {
    getSession.mockResolvedValue({ user: { id: "user-test" } });
    launchEphemeralComputer.mockResolvedValue({
      instanceId: "i-0123456789abcdef0",
      state: "pending",
      instanceType: "t3.micro",
    });
    const values = vi.fn().mockResolvedValue(undefined);
    insert.mockReturnValue({ values });

    const response = await POST();

    expect(launchEphemeralComputer).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith("instance");
    expect(values).toHaveBeenCalledWith({
      id: "i-0123456789abcdef0",
      name: "workspace-bcdef0",
      region: "Asia South",
      machineType: "t3.micro",
      status: "pending",
      userId: "user-test",
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      instanceId: "i-0123456789abcdef0",
      state: "pending",
      instanceType: "t3.micro",
    });
  });
});
