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

import { POST } from "@/app/api/computers/start/route";

describe("POST /api/computers/start", () => {
  beforeEach(() => {
    getSession.mockReset();
    insert.mockReset();
    launchEphemeralComputer.mockReset();
  });

  it("rejects an unsupported preset", async () => {
    const response = await POST(
      new Request("http://localhost/api/computers/start", {
        method: "POST",
        body: JSON.stringify({ preset: "large" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(launchEphemeralComputer).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/computers/start", {
        method: "POST",
        body: '{"preset":',
      }),
    );

    expect(response.status).toBe(400);
    expect(launchEphemeralComputer).not.toHaveBeenCalled();
  });

  it("requires a signed-in user before launching", async () => {
    getSession.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost/api/computers/start", { method: "POST" }),
    );

    expect(response.status).toBe(401);
    expect(launchEphemeralComputer).not.toHaveBeenCalled();
  });

  it("returns only the safe launch response", async () => {
    getSession.mockResolvedValue({ user: { id: "user-test" } });
    launchEphemeralComputer.mockResolvedValue({
      instanceId: "i-test",
      state: "pending",
      instanceType: "t3.micro",
      credentials: "must-not-be-returned",
    });
    const values = vi.fn().mockResolvedValue(undefined);
    insert.mockReturnValue({ values });

    const response = await POST(
      new Request("http://localhost/api/computers/start", { method: "POST" }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      instanceId: "i-test",
      state: "pending",
      instanceType: "t3.micro",
    });
    expect(values).toHaveBeenCalledWith({
      id: "i-test",
      name: "workspace-i-test",
      region: "Asia South",
      machineType: "t3.micro",
      status: "pending",
      userId: "user-test",
    });
  });
});
