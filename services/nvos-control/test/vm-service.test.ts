import { DescribeInstancesCommand, RunInstancesCommand } from "@aws-sdk/client-ec2";
import { describe, expect, it, vi } from "vitest";
import type { ControlConfig } from "../src/config";
import { VmService } from "../src/vm-service";

const config: ControlConfig = { awsRegion: "ap-south-1", launchTemplateId: "lt-test", controlSecret: "secret", vmBaseDomain: "vm.nvos.in", caddyAdminUrl: "http://127.0.0.1:2019", host: "127.0.0.1", port: 3001 };

describe("VmService", () => {
  it("overrides the launch template instance type for the selected plan and creates the Caddy route", async () => {
    const instance = { InstanceId: "i-123", PrivateIpAddress: "172.31.1.4", PublicIpAddress: "13.1.2.3", State: { Name: "running" } };
    const send = vi.fn(async (command: unknown) => command instanceof RunInstancesCommand ? { Instances: [instance] } : command instanceof DescribeInstancesCommand ? { Reservations: [{ Instances: [instance] }] } : {});
    const caddy = { addRoute: vi.fn(), removeRoute: vi.fn() } as never;
    const service = new VmService({ send } as never, caddy, config, { info: vi.fn(), error: vi.fn() }, vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    const result = await service.create("vm-1", "terry-bobby-black", "user-1", "medium");
    const launch = send.mock.calls[0][0] as RunInstancesCommand;
    expect(launch.input.LaunchTemplate).toEqual({ LaunchTemplateId: "lt-test", Version: "$Latest" });
    expect(launch.input.InstanceType).toBe("t3.medium");
    expect(launch.input.TagSpecifications?.[0].Tags).toContainEqual({ Key: "nvos:vm-id", Value: "vm-1" });
    expect(caddy.addRoute).toHaveBeenCalledWith("terry-bobby-black.vm.nvos.in", "172.31.1.4");
    expect(result).toMatchObject({ instanceId: "i-123", slug: "terry-bobby-black", status: "running" });
  });
});
