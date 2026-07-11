import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app";
import type { ControlConfig } from "../src/config";

const config: ControlConfig = { awsRegion: "ap-south-1", launchTemplateId: "lt-test", controlSecret: "test-secret", vmBaseDomain: "vm.nvos.in", caddyAdminUrl: "http://127.0.0.1:2019", host: "127.0.0.1", port: 3001 };
const vm = { vmId: "vm-1", instanceId: "i-1", privateIp: "172.31.1.4", status: "running" as const, hostname: "terry-bobby-black.vm.nvos.in", url: "https://terry-bobby-black.vm.nvos.in" };

describe("control API", () => {
  it("requires bearer authentication on health and VM operations", async () => {
    const service = { create: vi.fn().mockResolvedValue(vm), start: vi.fn(), stop: vi.fn(), terminate: vi.fn(), status: vi.fn() } as never;
    const app = buildApp(config, { service });
    await expect(app.inject({ method: "GET", url: "/health" }).then((response) => response.statusCode)).resolves.toBe(401);
    await expect(app.inject({ method: "POST", url: "/internal/vms", payload: { vmId: "vm-1", slug: "terry-bobby-black", userId: "user-1" } }).then((response) => response.statusCode)).resolves.toBe(401);
    await app.close();
  });

  it("validates creation and calls the service only after authentication", async () => {
    const create = vi.fn().mockResolvedValue(vm);
    const service = { create, start: vi.fn(), stop: vi.fn(), terminate: vi.fn(), status: vi.fn() } as never;
    const app = buildApp(config, { service });
    const response = await app.inject({ method: "POST", url: "/internal/vms", headers: { authorization: "Bearer test-secret" }, payload: { vmId: "vm-1", slug: "terry-bobby-black", userId: "user-1" } });
    expect(response.statusCode).toBe(201);
    expect(create).toHaveBeenCalledWith("vm-1", "terry-bobby-black", "user-1");
    await app.close();
  });
});
