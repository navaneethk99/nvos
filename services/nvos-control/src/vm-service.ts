import {
  DescribeInstancesCommand,
  type EC2Client,
  RunInstancesCommand,
  StartInstancesCommand,
  StopInstancesCommand,
  TerminateInstancesCommand,
  type Instance,
} from "@aws-sdk/client-ec2";

import type { ControlConfig } from "./config";
import { CaddyClient } from "./caddy-client";

const stateTimeoutMs = 10 * 60 * 1_000;
const desktopTimeoutMs = 5 * 60 * 1_000;
const pollMs = 3_000;

const INSTANCE_TYPES = {
  micro: "t3.micro",
  small: "t3.small",
  medium: "c7i-flex.large",
  large: "m7i-flex.large",
} as const;

type VmPlan = keyof typeof INSTANCE_TYPES;
export type VmOperatingSystem = "ubuntu" | "windows";

export class VmServiceError extends Error {
  constructor(message: string, readonly statusCode = 502) { super(message); this.name = "VmServiceError"; }
}

export type VmResult = { vmId: string; slug: string; instanceId: string; privateIp: string; status: "running" | "stopped" | "terminated"; hostname: string; url: string };
type Logger = { info: (data: object, message?: string) => void; error: (data: object, message?: string) => void };

function sleep(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

export class VmService {
  constructor(
    private readonly ec2: EC2Client,
    private readonly caddy: CaddyClient,
    private readonly config: ControlConfig,
    private readonly logger: Logger,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private hostname(slug: string) { return `${slug}.${this.config.vmBaseDomain}`; }
  private launchTemplateId(os: VmOperatingSystem) {
    const launchTemplateId = os === "ubuntu" ? this.config.launchTemplateId : this.config.windowsLaunchTemplateId;
    if (!launchTemplateId) {
      const variable = os === "ubuntu" ? "NVOS_EC2_LAUNCH_TEMPLATE_ID" : "AWS_WINDOWS_LAUNCH_TEMPLATE_ID";
      throw new VmServiceError(`${os} is not configured: missing ${variable}.`, 500);
    }
    return launchTemplateId;
  }
  private result(vmId: string, slug: string, instance: Instance, status: VmResult["status"]): VmResult {
    if (!instance.InstanceId || !instance.PrivateIpAddress) throw new VmServiceError("EC2 did not return an instance ID and private IP.");
    const hostname = this.hostname(slug);
    return { vmId, slug, instanceId: instance.InstanceId, privateIp: instance.PrivateIpAddress, status, hostname, url: `https://${hostname}` };
  }

  private async findInstance(vmId: string) {
    const response = await this.ec2.send(new DescribeInstancesCommand({ Filters: [{ Name: "tag:nvos:vm-id", Values: [vmId] }] }));
    const instance = response.Reservations?.flatMap((reservation) => reservation.Instances ?? [])[0];
    if (!instance) throw new VmServiceError("VM instance was not found.", 404);
    return instance;
  }

  private async waitForState(instanceId: string, expected: "running" | "terminated") {
    const deadline = Date.now() + stateTimeoutMs;
    while (Date.now() < deadline) {
      const response = await this.ec2.send(new DescribeInstancesCommand({ InstanceIds: [instanceId] }));
      const instance = response.Reservations?.flatMap((reservation) => reservation.Instances ?? [])[0];
      if (instance?.State?.Name === expected) return instance;
      await sleep(pollMs);
    }
    throw new VmServiceError(`Timed out waiting for EC2 instance to become ${expected}.`, 504);
  }

  private async waitForDesktop(privateIp: string) {
    const deadline = Date.now() + desktopTimeoutMs;
    while (Date.now() < deadline) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5_000);
      try {
        const response = await this.fetchImpl(`http://${privateIp}:6080/`, { signal: controller.signal });
        if (response.status === 200) return;
      } catch { /* noVNC is still starting */ } finally { clearTimeout(timer); }
      await sleep(pollMs);
    }
    throw new VmServiceError("Desktop did not become healthy before the timeout.", 504);
  }

  async create(vmId: string, slug: string, userId: string, plan: VmPlan, os: VmOperatingSystem) {
    const instanceType = INSTANCE_TYPES[plan];
    const launchTemplateId = this.launchTemplateId(os);
    this.logger.info({ vmId, slug, userId, plan, instanceType }, "Launching instance");
    let instanceId: string | undefined;
    try {
      const launched = await this.ec2.send(new RunInstancesCommand({
        LaunchTemplate: { LaunchTemplateId: launchTemplateId, Version: "$Latest" },
        InstanceType: instanceType,
        MinCount: 1, MaxCount: 1,
        TagSpecifications: [{ ResourceType: "instance", Tags: [
          { Key: "nvos:vm-id", Value: vmId }, { Key: "nvos:slug", Value: slug }, { Key: "nvos:user-id", Value: userId }, { Key: "nvos:os", Value: os },
        ] }],
      }));
      instanceId = launched.Instances?.[0]?.InstanceId;
      if (!instanceId) throw new VmServiceError("EC2 did not return an instance ID.");
      this.logger.info({ vmId, userId, os, plan, instanceType, launchTemplateId, instanceId }, "EC2 instance launched");
      const instance = await this.waitForState(instanceId, "running");
      this.logger.info({ vmId, userId, plan, instanceType, instanceId, publicIp: instance.PublicIpAddress }, "Instance running");
      if (!instance.PrivateIpAddress) throw new VmServiceError("EC2 instance has no private IP.");
      await this.waitForDesktop(instance.PrivateIpAddress);
      this.logger.info({ vmId, instanceId }, "Desktop ready");
      const host = this.hostname(slug);
      this.logger.info({ vmId, host }, "Creating Caddy route");
      await this.caddy.addRoute(host, instance.PrivateIpAddress);
      return this.result(vmId, slug, instance, "running");
    } catch (error) {
      this.logger.error({ vmId, userId, os, plan, instanceType, launchTemplateId, instanceId, error: error instanceof Error ? error.message : "Unknown error" }, "Provisioning failed");
      if (instanceId) {
        try { await this.ec2.send(new TerminateInstancesCommand({ InstanceIds: [instanceId] })); }
        catch (cleanupError) { this.logger.error({ vmId, instanceId, error: cleanupError instanceof Error ? cleanupError.message : "Unknown error" }, "Failed to terminate orphaned instance"); }
      }
      if (error instanceof VmServiceError) throw error;
      throw new VmServiceError("AWS failed to provision the VM.");
    }
  }

  async start(vmId: string) {
    const instance = await this.findInstance(vmId);
    const slug = instance.Tags?.find((tag) => tag.Key === "nvos:slug")?.Value;
    if (!instance.InstanceId || !slug) throw new VmServiceError("VM metadata is incomplete.");
    if (instance.State?.Name !== "running") {
      this.logger.info({ vmId, instanceId: instance.InstanceId }, "Starting instance");
      await this.ec2.send(new StartInstancesCommand({ InstanceIds: [instance.InstanceId] }));
    }
    const running = await this.waitForState(instance.InstanceId, "running");
    if (!running.PrivateIpAddress) throw new VmServiceError("EC2 instance has no private IP.");
    await this.waitForDesktop(running.PrivateIpAddress);
    this.logger.info({ vmId, host: this.hostname(slug) }, "Creating Caddy route");
    await this.caddy.addRoute(this.hostname(slug), running.PrivateIpAddress);
    return this.result(vmId, slug, running, "running");
  }

  async stop(vmId: string) {
    const instance = await this.findInstance(vmId);
    const slug = instance.Tags?.find((tag) => tag.Key === "nvos:slug")?.Value;
    if (!instance.InstanceId || !slug) throw new VmServiceError("VM metadata is incomplete.");
    this.logger.info({ vmId, instanceId: instance.InstanceId }, "Stopping instance");
    if (instance.State?.Name !== "stopped") await this.ec2.send(new StopInstancesCommand({ InstanceIds: [instance.InstanceId] }));
    this.logger.info({ vmId, host: this.hostname(slug) }, "Removing Caddy route");
    await this.caddy.removeRoute(this.hostname(slug));
    return this.result(vmId, slug, { ...instance, PrivateIpAddress: instance.PrivateIpAddress ?? "0.0.0.0" }, "stopped");
  }

  async terminate(vmId: string) {
    const instance = await this.findInstance(vmId);
    const slug = instance.Tags?.find((tag) => tag.Key === "nvos:slug")?.Value;
    if (!instance.InstanceId || !slug) throw new VmServiceError("VM metadata is incomplete.");
    this.logger.info({ vmId, host: this.hostname(slug) }, "Removing Caddy route");
    await this.caddy.removeRoute(this.hostname(slug));
    if (instance.State?.Name !== "terminated") {
      this.logger.info({ vmId, instanceId: instance.InstanceId }, "Terminating instance");
      await this.ec2.send(new TerminateInstancesCommand({ InstanceIds: [instance.InstanceId] }));
    }
    const terminated = await this.waitForState(instance.InstanceId, "terminated");
    return this.result(vmId, slug, { ...terminated, PrivateIpAddress: terminated.PrivateIpAddress ?? instance.PrivateIpAddress ?? "0.0.0.0" }, "terminated");
  }

  async status(vmId: string) {
    const instance = await this.findInstance(vmId);
    const slug = instance.Tags?.find((tag) => tag.Key === "nvos:slug")?.Value;
    if (!slug) throw new VmServiceError("VM metadata is incomplete.");
    const state = instance.State?.Name;
    if (state === "running") return this.result(vmId, slug, instance, "running");
    if (state === "stopped") return this.result(vmId, slug, { ...instance, PrivateIpAddress: instance.PrivateIpAddress ?? "0.0.0.0" }, "stopped");
    if (state === "terminated") return this.result(vmId, slug, { ...instance, PrivateIpAddress: instance.PrivateIpAddress ?? "0.0.0.0" }, "terminated");
    throw new VmServiceError(`VM is currently ${state ?? "unknown"}.`, 409);
  }
}
