import { beforeEach, describe, expect, it, vi } from "vitest";

const { createVm, db, generateUniqueVmSlug, publicVm, requireVmUser } = vi.hoisted(() => ({
  createVm: vi.fn(),
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
  generateUniqueVmSlug: vi.fn(),
  publicVm: vi.fn((vm) => vm),
  requireVmUser: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("@/db", () => ({ db }));
vi.mock("@/db/schema", () => ({ virtualMachine: {} }));
vi.mock("@/lib/vm-control-client", () => ({ createVm, getVmStatus: vi.fn() }));
vi.mock("@/lib/vm-config", () => ({ getVmConfig: () => ({ baseDomain: "vm.nvos.in" }) }));
vi.mock("@/lib/vm-route", () => ({
  controlFailureResponse: vi.fn(),
  isVmOperatingSystem: (value: unknown) => value === "ubuntu" || value === "windows",
  publicVm,
  requireVmUser,
}));
vi.mock("@/lib/vm-slug", () => ({ generateUniqueVmSlug }));
vi.mock("@/lib/vm-status", () => ({ isTransitionalVmStatus: vi.fn() }));

import { parseCreateRequest, POST } from "@/app/api/vms/route";

describe("POST /api/vms", () => {
  beforeEach(() => {
    requireVmUser.mockReset();
    createVm.mockReset();
    db.insert.mockReset();
    db.select.mockReset();
    db.update.mockReset();
    generateUniqueVmSlug.mockReset();
    publicVm.mockClear();
  });

  it("returns 400 for a missing or unsupported plan", async () => {
    requireVmUser.mockResolvedValue({ id: "user-1" });

    for (const body of [{ name: "Workspace" }, { name: "Workspace", plan: "m7i.large" }]) {
      const response = await POST(new Request("http://localhost/api/vms", { method: "POST", body: JSON.stringify(body) }));
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Enter a valid name and select a supported plan." });
    }
  });

  it("defaults the operating system to Ubuntu and accepts Windows", () => {
    expect(parseCreateRequest({ name: "Workspace", plan: "micro" })).toMatchObject({ os: "ubuntu" });
    expect(parseCreateRequest({ name: "Workspace", plan: "micro", os: "windows" })).toMatchObject({ os: "windows" });
    expect(parseCreateRequest({ name: "Workspace", plan: "micro", os: "macos" })).toBeNull();
  });

  it("forwards Windows creation requests to the control service", async () => {
    const storedVm = {
      id: "vm-1",
      name: "Windows workspace",
      description: null,
      plan: "small",
      os: "windows",
      instanceType: "t3.small",
      slug: "terry-bobby-black",
      hostname: "terry-bobby-black.vm.nvos.in",
      status: "provisioning",
    };
    requireVmUser.mockResolvedValue({ id: "user-1" });
    generateUniqueVmSlug.mockResolvedValue("terry-bobby-black");
    db.select.mockReturnValue({ from: () => ({ where: () => ({ limit: vi.fn().mockResolvedValue([]) }) }) });
    db.insert.mockReturnValue({ values: () => ({ returning: vi.fn().mockResolvedValue([storedVm]) }) });
    db.update.mockReturnValue({ set: () => ({ where: () => ({ returning: vi.fn().mockResolvedValue([{ ...storedVm, status: "running", instanceId: "i-123", privateIp: "172.31.1.4" }]) }) }) });
    createVm.mockResolvedValue({ vmId: "vm-1", slug: "terry-bobby-black", hostname: "terry-bobby-black.vm.nvos.in", instanceId: "i-123", privateIp: "172.31.1.4", status: "running" });

    const response = await POST(new Request("http://localhost/api/vms", {
      method: "POST",
      body: JSON.stringify({ name: "Windows workspace", plan: "small", os: "windows" }),
    }));

    expect(response.status).toBe(201);
    expect(createVm).toHaveBeenCalledWith({ vmId: "vm-1", slug: "terry-bobby-black", userId: "user-1", plan: "small", os: "windows" });
    await expect(response.json()).resolves.toMatchObject({ vm: { ...storedVm, status: "running" } });
  });
});
