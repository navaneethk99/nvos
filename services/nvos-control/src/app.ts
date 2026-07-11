import { EC2Client } from "@aws-sdk/client-ec2";
import Fastify, { type FastifyInstance } from "fastify";

import { CaddyClient } from "./caddy-client";
import type { ControlConfig } from "./config";
import { GuacamoleClient } from "./guacamole-client";
import { GuacamoleJsonAuthClient } from "./guacamole-json-auth";
import { VmService, VmServiceError, type VmOperatingSystem } from "./vm-service";

type Dependencies = { service?: VmService };
type CreateBody = { vmId?: unknown; slug?: unknown; userId?: unknown; plan?: unknown; os?: unknown };

const INSTANCE_TYPES = {
  micro: "t3.micro",
  small: "t3.small",
  medium: "c7i-flex.large",
  large: "m7i-flex.large",
} as const;

type VmPlan = keyof typeof INSTANCE_TYPES;

function isSlug(value: unknown): value is string { return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+){2,3}$/.test(value); }
function isVmPlan(value: unknown): value is VmPlan { return typeof value === "string" && value in INSTANCE_TYPES; }
function isVmOperatingSystem(value: unknown): value is VmOperatingSystem { return value === "ubuntu" || value === "windows"; }

export function buildApp(config: ControlConfig, dependencies: Dependencies = {}): FastifyInstance {
  const app = Fastify({ logger: true });
  const service = dependencies.service ?? new VmService(
    new EC2Client({ region: config.awsRegion }),
    new CaddyClient(config.caddyAdminUrl),
    config,
    app.log,
    new GuacamoleClient(config.guacamoleUrl, config.guacamoleUsername, config.guacamolePassword, config.guacamoleRdpPassword),
    new GuacamoleJsonAuthClient(config.guacamoleUrl, config.guacamoleJsonSecret, config.guacamoleRdpPassword),
  );

  app.addHook("onRequest", async (request, reply) => {
    const expected = `Bearer ${config.controlSecret}`;
    if (request.headers.authorization !== expected) return reply.code(401).send({ error: "Unauthorized" });
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof VmServiceError) return reply.code(error.statusCode).send({ error: error.message });
    app.log.error({ err: error }, "Unhandled control-service error");
    return reply.code(500).send({ error: "Internal control service error." });
  });

  app.get("/health", async () => ({ status: "ok" }));

  app.post<{ Body: CreateBody }>("/internal/vms", async (request, reply) => {
    const { vmId, slug, userId, plan, os } = request.body ?? {};
    const vmOs = os ?? "ubuntu";
    if (typeof vmId !== "string" || !isSlug(slug) || typeof userId !== "string" || !isVmPlan(plan) || !isVmOperatingSystem(vmOs)) return reply.code(400).send({ error: "A supported VM plan is required." });
    return reply.code(201).send(await service.create(vmId, slug, userId, plan, vmOs));
  });

  app.post<{ Params: { id: string } }>("/internal/vms/:id/start", async (request) => service.start(request.params.id));
  app.post<{ Params: { id: string } }>("/internal/vms/:id/stop", async (request) => service.stop(request.params.id));
  const terminate = async (id: string) => service.terminate(id);
  app.delete<{ Params: { id: string } }>("/internal/vms/:id", async (request) => terminate(request.params.id));
  // Compatibility for the existing dashboard client, which currently sends POST.
  app.post<{ Params: { id: string } }>("/internal/vms/:id/terminate", async (request) => terminate(request.params.id));
  app.get<{ Params: { id: string } }>("/internal/vms/:id", async (request) => service.status(request.params.id));
  app.post<{ Params: { id: string }; Body: { userId?: unknown } }>("/internal/vms/:id/windows-desktop", async (request, reply) => {
    if (typeof request.body?.userId !== "string") return reply.code(400).send({ error: "A VM user is required." });
    return service.createWindowsDesktopLaunch(request.params.id, request.body.userId);
  });

  return app;
}
