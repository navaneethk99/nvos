import { DescribeInstancesCommand, RunInstancesCommand, TerminateInstancesCommand } from "@aws-sdk/client-ec2";
import { EventEmitter } from "node:events";
import type { Socket } from "node:net";
import { describe, expect, it, vi } from "vitest";
import type { ControlConfig } from "../src/config";
import { VmService } from "../src/vm-service";

const config: ControlConfig = { awsRegion: "ap-south-1", launchTemplateId: "lt-ubuntu", windowsLaunchTemplateId: "lt-windows", guacamoleUrl: "http://guacamole.test", guacamolePublicUrl: "https://desktop.test", guacamoleUsername: "guacadmin", guacamolePassword: "secret", guacamoleRdpPassword: "windows-secret", guacamoleJsonSecret: "0123456789abcdef0123456789abcdef", controlSecret: "secret", vmBaseDomain: "vm.nvos.in", caddyAdminUrl: "http://127.0.0.1:2019", host: "127.0.0.1", port: 3001 };

type ReadinessOptions = {
  fetchImpl?: typeof fetch;
  connectImpl?: (options: { host: string; port: number }) => Socket;
};

function createService(overrides: Partial<ControlConfig> = {}, readiness: ReadinessOptions = {}, instanceOptions: { os?: "ubuntu" | "windows"; ownerId?: string; state?: string } = {}) {
  let state = instanceOptions.state ?? "running";
  const instance = { InstanceId: "i-123", PrivateIpAddress: "172.31.1.4", PublicIpAddress: "13.1.2.3", State: { Name: state }, Tags: [{ Key: "nvos:slug", Value: "terry-bobby-black" }, { Key: "nvos:os", Value: instanceOptions.os ?? "windows" }, { Key: "nvos:user-id", Value: instanceOptions.ownerId ?? "user-1" }] };
  const send = vi.fn(async (command: unknown) => {
    if (command instanceof RunInstancesCommand) return { Instances: [instance] };
    if (command instanceof TerminateInstancesCommand) {
      state = "terminated";
      return {};
    }
    if (command instanceof DescribeInstancesCommand) return { Reservations: [{ Instances: [{ ...instance, State: { Name: state } }] }] };
    return {};
  });
  const caddy = { addRoute: vi.fn(), removeRoute: vi.fn() } as never;
  const guacamole = { createRdpConnection: vi.fn().mockResolvedValue("42"), deleteRdpConnection: vi.fn().mockResolvedValue(undefined) };
  const guacamoleJsonAuth = { createWindowsLaunch: vi.fn().mockResolvedValue({ launchUrl: "https://guacamole.test/#/client/json/c/nvos-vm-1?token=token" }) };
  const logger = { info: vi.fn(), error: vi.fn() };
  const fetchImpl = readiness.fetchImpl ?? vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
  const service = new VmService({ send } as never, caddy, { ...config, ...overrides }, logger, guacamole, guacamoleJsonAuth, fetchImpl, readiness.connectImpl);
  return { caddy, fetchImpl, guacamole, guacamoleJsonAuth, logger, send, service };
}

describe("VmService", () => {
  it("keeps Ubuntu provisioning behavior while selecting the Ubuntu template and overriding the instance type", async () => {
    const { caddy, fetchImpl, logger, send, service } = createService();
    const result = await service.create("vm-1", "terry-bobby-black", "user-1", "medium", "ubuntu");
    const launch = send.mock.calls[0][0] as RunInstancesCommand;
    expect(launch.input.LaunchTemplate).toEqual({ LaunchTemplateId: "lt-ubuntu", Version: "$Latest" });
    expect(launch.input.InstanceType).toBe("c7i-flex.large");
    expect(launch.input.MinCount).toBe(1);
    expect(launch.input.MaxCount).toBe(1);
    expect(launch.input.TagSpecifications?.[0].Tags).toContainEqual({ Key: "nvos:vm-id", Value: "vm-1" });
    expect(launch.input.TagSpecifications?.[0].Tags).toContainEqual({ Key: "nvos:os", Value: "ubuntu" });
    expect(fetchImpl).toHaveBeenCalledWith("http://172.31.1.4:6080/", expect.any(Object));
    expect(caddy.addRoute).toHaveBeenCalledWith("terry-bobby-black.vm.nvos.in", "172.31.1.4");
    expect(logger.info).toHaveBeenCalledWith({ vmId: "vm-1", userId: "user-1", os: "ubuntu", plan: "medium", instanceType: "c7i-flex.large", launchTemplateId: "lt-ubuntu", instanceId: "i-123" }, "EC2 instance launched");
    expect(result).toMatchObject({ instanceId: "i-123", slug: "terry-bobby-black", status: "running" });
  });

  it("waits for Windows RDP without calling the Ubuntu HTTP check or creating a Caddy route", async () => {
    const socket = Object.assign(new EventEmitter(), { destroy: vi.fn(), end: vi.fn() }) as unknown as Socket;
    const connectImpl = vi.fn(() => {
      queueMicrotask(() => socket.emit("connect"));
      return socket;
    });
    const { caddy, fetchImpl, guacamole, send, service } = createService({}, { connectImpl });
    await service.create("vm-1", "terry-bobby-black", "user-1", "small", "windows");
    const launch = send.mock.calls[0][0] as RunInstancesCommand;
    expect(launch.input.LaunchTemplate).toEqual({ LaunchTemplateId: "lt-windows", Version: "$Latest" });
    expect(launch.input.InstanceType).toBe("t3.small");
    expect(launch.input.TagSpecifications?.[0].Tags).toContainEqual({ Key: "nvos:os", Value: "windows" });
    expect(connectImpl).toHaveBeenCalledWith({ host: "172.31.1.4", port: 3389 });
    expect(socket.end).toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(caddy.addRoute).not.toHaveBeenCalled();
    expect(guacamole.createRdpConnection).toHaveBeenCalledWith("vm-1", "172.31.1.4");
  });

  it("removes the Windows Guacamole connection after EC2 termination", async () => {
    const { caddy, guacamole, service } = createService();
    await service.terminate("vm-1");
    expect(guacamole.deleteRdpConnection).toHaveBeenCalledWith("vm-1");
    expect(caddy.removeRoute).not.toHaveBeenCalled();
  });

  it("creates a JSON-auth launch only for the Windows VM owner", async () => {
    const { guacamoleJsonAuth, service } = createService();
    await expect(service.createWindowsDesktopLaunch("vm-1", "user-1")).resolves.toEqual({ launchUrl: "https://guacamole.test/#/client/json/c/nvos-vm-1?token=token" });
    expect(guacamoleJsonAuth.createWindowsLaunch).toHaveBeenCalledWith("vm-1", "user-1", "172.31.1.4");
  });

  it("rejects Windows desktop launch requests for another user", async () => {
    const { service } = createService();
    await expect(service.createWindowsDesktopLaunch("vm-1", "other-user")).rejects.toMatchObject({ statusCode: 403 });
  });

  it("rejects JSON-auth launches for Ubuntu or stopped VMs", async () => {
    const ubuntu = createService({}, {}, { os: "ubuntu" });
    await expect(ubuntu.service.createWindowsDesktopLaunch("vm-1", "user-1")).rejects.toMatchObject({ statusCode: 400 });
    const stopped = createService({}, {}, { state: "stopped" });
    await expect(stopped.service.createWindowsDesktopLaunch("vm-1", "user-1")).rejects.toMatchObject({ statusCode: 409 });
  });

  it("fails before calling AWS when Windows is not configured", async () => {
    const { send, service } = createService({ windowsLaunchTemplateId: "" });
    await expect(service.create("vm-1", "terry-bobby-black", "user-1", "micro", "windows")).rejects.toThrow("windows is not configured: missing AWS_WINDOWS_LAUNCH_TEMPLATE_ID.");
    expect(send).not.toHaveBeenCalled();
  });

  it("fails before calling AWS when Ubuntu is not configured", async () => {
    const { send, service } = createService({ launchTemplateId: "" });
    await expect(service.create("vm-1", "terry-bobby-black", "user-1", "micro", "ubuntu")).rejects.toThrow("ubuntu is not configured: missing NVOS_EC2_LAUNCH_TEMPLATE_ID.");
    expect(send).not.toHaveBeenCalled();
  });
});
