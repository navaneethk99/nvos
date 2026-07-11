import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/vm-config", () => ({ getVmConfig: () => ({ controlUrl: "https://control.test", controlSecret: "secret", baseDomain: "vm.nvos.in" }) }));

import { ControlServiceError, createVm } from "@/lib/vm-control-client";

describe("VM control client", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("sends the secret only as a bearer authorization header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ vmId: "vm-1", slug: "milo-river-stone", hostname: "milo-river-stone.vm.nvos.in", status: "running" })));
    vi.stubGlobal("fetch", fetchMock);
    await createVm({ vmId: "vm-1", slug: "milo-river-stone", userId: "user-1" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://control.test/internal/vms");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer secret");
  });
  it("normalizes non-success control errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("no", { status: 401 })));
    await expect(createVm({ vmId: "vm-1", slug: "milo-river-stone", userId: "user-1" })).rejects.toMatchObject({ kind: "authentication" } satisfies Partial<ControlServiceError>);
  });
});
