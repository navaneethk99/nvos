import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/vm-config", () => ({ getVmConfig: () => ({ controlUrl: "https://control.test", controlSecret: "secret", baseDomain: "vm.nvos.in" }) }));

import { ControlServiceError, createVm, createWindowsDesktopLaunch, terminateVm } from "@/lib/vm-control-client";

describe("VM control client", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("sends the secret only as a bearer authorization header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ vmId: "vm-1", slug: "milo-river-stone", hostname: "milo-river-stone.vm.nvos.in", status: "running" })));
    vi.stubGlobal("fetch", fetchMock);
    await createVm({ vmId: "vm-1", slug: "milo-river-stone", userId: "user-1", plan: "micro", os: "ubuntu" });
    expect(fetchMock.mock.calls[0][0]).toBe("https://control.test/internal/vms");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer secret");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ vmId: "vm-1", slug: "milo-river-stone", userId: "user-1", plan: "micro", os: "ubuntu" });
  });
  it("normalizes non-success control errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("no", { status: 401 })));
    await expect(createVm({ vmId: "vm-1", slug: "milo-river-stone", userId: "user-1", plan: "micro", os: "ubuntu" })).rejects.toMatchObject({ kind: "authentication" } satisfies Partial<ControlServiceError>);
  });

  it("sends valid JSON for bodyless control actions", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ vmId: "vm-1", slug: "milo-river-stone", hostname: "milo-river-stone.vm.nvos.in", status: "terminated" })));
    vi.stubGlobal("fetch", fetchMock);
    await terminateVm("vm-1");
    expect(fetchMock.mock.calls[0][1].body).toBe("{}");
  });

  it("sends only the VM and user IDs for a Windows desktop launch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ launchUrl: "https://guacamole.test/#/client/json/c/nvos-vm-1?token=short-token" })));
    vi.stubGlobal("fetch", fetchMock);
    await createWindowsDesktopLaunch("vm-1", "user-1");
    expect(fetchMock.mock.calls[0][0]).toBe("https://control.test/internal/vms/vm-1/windows-desktop");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ userId: "user-1" });
  });
});
