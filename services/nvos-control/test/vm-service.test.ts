import { DescribeInstancesCommand, RunInstancesCommand } from "@aws-sdk/client-ec2";
import { describe, expect, it, vi } from "vitest";
import type { ControlConfig } from "../src/config";
import { VmService } from "../src/vm-service";

const config: ControlConfig = { awsRegion: "ap-south-1", launchTemplateId: "lt-ubuntu", windowsLaunchTemplateId: "lt-windows", controlSecret: "secret", vmBaseDomain: "vm.nvos.in", caddyAdminUrl: "http://127.0.0.1:2019", host: "127.0.0.1", port: 3001 };

function createService(overrides: Partial<ControlConfig> = {}) {
  const instance = { InstanceId: "i-123", PrivateIpAddress: "172.31.1.4", PublicIpAddress: "13.1.2.3", State: { Name: "running" } };
  const send = vi.fn(async (command: unknown) => command instanceof RunInstancesCommand ? { Instances: [instance] } : command instanceof DescribeInstancesCommand ? { Reservations: [{ Instances: [instance] }] } : {});
  const caddy = { addRoute: vi.fn(), removeRoute: vi.fn() } as never;
  const logger = { info: vi.fn(), error: vi.fn() };
  const service = new VmService({ send } as never, caddy, { ...config, ...overrides }, logger, vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
  return { caddy, logger, send, service };
}

describe("VmService", () => {
  it("keeps Ubuntu provisioning behavior while selecting the Ubuntu template and overriding the instance type", async () => {
    const { caddy, logger, send, service } = createService();
    const result = await service.create("vm-1", "terry-bobby-black", "user-1", "medium", "ubuntu");
    const launch = send.mock.calls[0][0] as RunInstancesCommand;
    expect(launch.input.LaunchTemplate).toEqual({ LaunchTemplateId: "lt-ubuntu", Version: "$Latest" });
    expect(launch.input.InstanceType).toBe("c7i-flex.large");
    expect(launch.input.MinCount).toBe(1);
    expect(launch.input.MaxCount).toBe(1);
    expect(launch.input.TagSpecifications?.[0].Tags).toContainEqual({ Key: "nvos:vm-id", Value: "vm-1" });
    expect(launch.input.TagSpecifications?.[0].Tags).toContainEqual({ Key: "nvos:os", Value: "ubuntu" });
    expect(caddy.addRoute).toHaveBeenCalledWith("terry-bobby-black.vm.nvos.in", "172.31.1.4");
    expect(logger.info).toHaveBeenCalledWith({ vmId: "vm-1", userId: "user-1", os: "ubuntu", plan: "medium", instanceType: "c7i-flex.large", launchTemplateId: "lt-ubuntu", instanceId: "i-123" }, "EC2 instance launched");
    expect(result).toMatchObject({ instanceId: "i-123", slug: "terry-bobby-black", status: "running" });
  });

  it("selects the Windows launch template", async () => {
    const { send, service } = createService();
    await service.create("vm-1", "terry-bobby-black", "user-1", "small", "windows");
    const launch = send.mock.calls[0][0] as RunInstancesCommand;
    expect(launch.input.LaunchTemplate).toEqual({ LaunchTemplateId: "lt-windows", Version: "$Latest" });
    expect(launch.input.InstanceType).toBe("t3.small");
    expect(launch.input.TagSpecifications?.[0].Tags).toContainEqual({ Key: "nvos:os", Value: "windows" });
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
