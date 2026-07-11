import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, select, update, terminateEphemeralComputer } = vi.hoisted(() => ({
  getSession: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  terminateEphemeralComputer: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn(),
  eq: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession } },
}));

vi.mock("@/db", () => ({
  db: { select, update },
}));

vi.mock("@/db/schema", () => ({
  instance: { id: "id", userId: "userId" },
}));

vi.mock("@/lib/aws/terminate-ephemeral-computer", () => ({
  terminateEphemeralComputer,
}));

import { DELETE } from "@/app/api/instances/[instanceId]/route";

const context = { params: Promise.resolve({ instanceId: "i-test" }) };

describe("DELETE /api/instances/[instanceId]", () => {
  beforeEach(() => {
    getSession.mockReset();
    select.mockReset();
    update.mockReset();
    terminateEphemeralComputer.mockReset();
  });

  it("does not terminate an instance the user does not own", async () => {
    getSession.mockResolvedValue({ user: { id: "user-test" } });
    select.mockReturnValue({ from: () => ({ where: () => [] }) });

    const response = await DELETE(new Request("http://localhost"), context);

    expect(response.status).toBe(404);
    expect(terminateEphemeralComputer).not.toHaveBeenCalled();
  });

  it("terminates an owned instance and returns safe fields", async () => {
    getSession.mockResolvedValue({ user: { id: "user-test" } });
    select.mockReturnValue({ from: () => ({ where: () => [{ id: "i-test" }] }) });
    terminateEphemeralComputer.mockResolvedValue({
      instanceId: "i-test",
      state: "shutting-down",
    });
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn().mockReturnValue({ where });
    update.mockReturnValue({ set });

    const response = await DELETE(new Request("http://localhost"), context);

    expect(terminateEphemeralComputer).toHaveBeenCalledWith("i-test");
    expect(set).toHaveBeenCalledWith({ status: "shutting-down" });
    expect(where).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      instanceId: "i-test",
      state: "shutting-down",
    });
  });
});
