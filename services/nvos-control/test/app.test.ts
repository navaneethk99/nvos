import { describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app";
import type { ControlConfig } from "../src/config";

const config: ControlConfig = { awsRegion: "ap-south-1", launchTemplateId: "lt-test", windowsLaunchTemplateId: "lt-windows", guacamoleUrl: "http://guacamole.test", guacamolePublicUrl: "https://desktop.test", guacamoleUsername: "guacadmin", guacamolePassword: "secret", guacamoleRdpPassword: "windows-secret", guacamoleJsonSecret: "0123456789abcdef0123456789abcdef", controlSecret: "test-secret", vmBaseDomain: "vm.nvos.in", caddyAdminUrl: "http://127.0.0.1:2019", host: "127.0.0.1", port: 3001 };
const vm = { vmId: "vm-1", slug: "terry-bobby-black", instanceId: "i-1", privateIp: "172.31.1.4", status: "running" as const, hostname: "terry-bobby-black.vm.nvos.in", url: "https://terry-bobby-black.vm.nvos.in" };

describe("control API", () => {
  it("requires bearer authentication on health and VM operations", async () => {
    const service = { create: vi.fn().mockResolvedValue(vm), start: vi.fn(), stop: vi.fn(), terminate: vi.fn(), status: vi.fn() } as never;
    const app = buildApp(config, { service });
    await expect(app.inject({ method: "GET", url: "/health" }).then((response) => response.statusCode)).resolves.toBe(401);
    await expect(app.inject({ method: "POST", url: "/internal/vms", payload: { vmId: "vm-1", slug: "terry-bobby-black", userId: "user-1", plan: "micro" } }).then((response) => response.statusCode)).resolves.toBe(401);
    await app.close();
  });

  it("validates creation and calls the service only after authentication", async () => {
    const create = vi.fn().mockResolvedValue(vm);
    const service = { create, start: vi.fn(), stop: vi.fn(), terminate: vi.fn(), status: vi.fn() } as never;
    const app = buildApp(config, { service });
    const response = await app.inject({ method: "POST", url: "/internal/vms", headers: { authorization: "Bearer test-secret" }, payload: { vmId: "vm-1", slug: "terry-bobby-black", userId: "user-1", plan: "small", os: "windows" } });
    expect(response.statusCode).toBe(201);
    expect(create).toHaveBeenCalledWith("vm-1", "terry-bobby-black", "user-1", "small", "windows");
    await app.close();
  });

  it("rejects unsupported plans before calling the service", async () => {
    const create = vi.fn();
    const service = { create, start: vi.fn(), stop: vi.fn(), terminate: vi.fn(), status: vi.fn() } as never;
    const app = buildApp(config, { service });
    const response = await app.inject({ method: "POST", url: "/internal/vms", headers: { authorization: "Bearer test-secret" }, payload: { vmId: "vm-1", slug: "terry-bobby-black", userId: "user-1", plan: "c7i.large" } });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "A supported VM plan is required." });
    expect(create).not.toHaveBeenCalled();
    await app.close();
  });

  it("rejects unsupported operating systems before calling the service", async () => {
    const create = vi.fn();
    const service = { create, start: vi.fn(), stop: vi.fn(), terminate: vi.fn(), status: vi.fn() } as never;
    const app = buildApp(config, { service });
    const response = await app.inject({ method: "POST", url: "/internal/vms", headers: { authorization: "Bearer test-secret" }, payload: { vmId: "vm-1", slug: "terry-bobby-black", userId: "user-1", plan: "micro", os: "macos" } });
    expect(response.statusCode).toBe(400);
    expect(create).not.toHaveBeenCalled();
    await app.close();
  });

  it("creates Windows desktop launches only through the internal authenticated endpoint", async () => {
    const createWindowsDesktopLaunch = vi.fn().mockResolvedValue({ launchUrl: "https://guacamole.test/#/client/json/c/nvos-vm-1?token=short-token" });
    const service = { create: vi.fn(), createWindowsDesktopLaunch, start: vi.fn(), stop: vi.fn(), terminate: vi.fn(), status: vi.fn() } as never;
    const app = buildApp(config, { service });
    const response = await app.inject({ method: "POST", url: "/internal/vms/vm-1/windows-desktop", headers: { authorization: "Bearer test-secret" }, payload: { userId: "user-1" } });
    expect(response.statusCode).toBe(200);
    expect(createWindowsDesktopLaunch).toHaveBeenCalledWith("vm-1", "user-1");
    await app.close();
  });
});
