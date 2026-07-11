import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireVmUser } = vi.hoisted(() => ({ requireVmUser: vi.fn() }));

vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/schema", () => ({ virtualMachine: {} }));
vi.mock("@/lib/vm-control-client", () => ({ createVm: vi.fn(), getVmStatus: vi.fn() }));
vi.mock("@/lib/vm-config", () => ({ getVmConfig: () => ({ baseDomain: "vm.nvos.in" }) }));
vi.mock("@/lib/vm-route", () => ({ controlFailureResponse: vi.fn(), publicVm: vi.fn(), requireVmUser }));
vi.mock("@/lib/vm-slug", () => ({ generateUniqueVmSlug: vi.fn() }));
vi.mock("@/lib/vm-status", () => ({ isTransitionalVmStatus: vi.fn() }));

import { POST } from "@/app/api/vms/route";

describe("POST /api/vms", () => {
  beforeEach(() => requireVmUser.mockReset());

  it("returns 400 for a missing or unsupported plan", async () => {
    requireVmUser.mockResolvedValue({ id: "user-1" });

    for (const body of [{ name: "Workspace" }, { name: "Workspace", plan: "m7i.large" }]) {
      const response = await POST(new Request("http://localhost/api/vms", { method: "POST", body: JSON.stringify(body) }));
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Enter a valid name and select a supported plan." });
    }
  });
});
