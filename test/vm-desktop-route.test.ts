import { beforeEach, describe, expect, it, vi } from "vitest";

const { createWindowsDesktopLaunch, findOwnedVm, requireVmUser } = vi.hoisted(() => ({
  createWindowsDesktopLaunch: vi.fn(),
  findOwnedVm: vi.fn(),
  requireVmUser: vi.fn(),
}));

vi.mock("@/lib/vm-control-client", () => ({ createWindowsDesktopLaunch }));
vi.mock("@/lib/vm-route", () => ({
  controlFailureResponse: vi.fn(),
  findOwnedVm,
  requireVmUser,
}));

import { POST } from "@/app/api/vms/[id]/desktop/route";

describe("POST /api/vms/:id/desktop", () => {
  beforeEach(() => {
    createWindowsDesktopLaunch.mockReset();
    findOwnedVm.mockReset();
    requireVmUser.mockReset();
  });

  it("launches only an owned running Windows VM", async () => {
    requireVmUser.mockResolvedValue({ id: "user-1" });
    findOwnedVm.mockResolvedValue({ vm: { id: "vm-1", os: "windows", status: "running" } });
    createWindowsDesktopLaunch.mockResolvedValue({ launchUrl: "https://guacamole.test/#/client/json/c/nvos-vm-1?token=short-token" });
    const response = await POST(new Request("http://localhost/api/vms/vm-1/desktop", { method: "POST" }), { params: Promise.resolve({ id: "vm-1" }) });
    expect(response.status).toBe(200);
    expect(createWindowsDesktopLaunch).toHaveBeenCalledWith("vm-1", "user-1");
    await expect(response.json()).resolves.toEqual({ launchUrl: "https://guacamole.test/#/client/json/c/nvos-vm-1?token=short-token" });
  });

  it("rejects Ubuntu VMs without calling the control service", async () => {
    requireVmUser.mockResolvedValue({ id: "user-1" });
    findOwnedVm.mockResolvedValue({ vm: { id: "vm-1", os: "ubuntu", status: "running" } });
    const response = await POST(new Request("http://localhost/api/vms/vm-1/desktop", { method: "POST" }), { params: Promise.resolve({ id: "vm-1" }) });
    expect(response.status).toBe(400);
    expect(createWindowsDesktopLaunch).not.toHaveBeenCalled();
  });
});
