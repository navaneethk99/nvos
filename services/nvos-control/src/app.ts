import { EC2Client } from "@aws-sdk/client-ec2";
import Fastify, { type FastifyInstance } from "fastify";

import { CaddyClient } from "./caddy-client";
import type { ControlConfig } from "./config";
import { VmService, VmServiceError } from "./vm-service";

type Dependencies = { service?: VmService };
type CreateBody = { vmId?: unknown; slug?: unknown; userId?: unknown };

function isSlug(value: unknown): value is string { return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+){2,3}$/.test(value); }

export function buildApp(config: ControlConfig, dependencies: Dependencies = {}): FastifyInstance {
  const app = Fastify({ logger: true });
  const service = dependencies.service ?? new VmService(new EC2Client({ region: config.awsRegion }), new CaddyClient(config.caddyAdminUrl), config, app.log);

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
    const { vmId, slug, userId } = request.body ?? {};
    if (typeof vmId !== "string" || !isSlug(slug) || typeof userId !== "string") return reply.code(400).send({ error: "Invalid VM request." });
    return reply.code(201).send(await service.create(vmId, slug, userId));
  });

  app.post<{ Params: { id: string } }>("/internal/vms/:id/start", async (request) => service.start(request.params.id));
  app.post<{ Params: { id: string } }>("/internal/vms/:id/stop", async (request) => service.stop(request.params.id));
  const terminate = async (id: string) => service.terminate(id);
  app.delete<{ Params: { id: string } }>("/internal/vms/:id", async (request) => terminate(request.params.id));
  // Compatibility for the existing dashboard client, which currently sends POST.
  app.post<{ Params: { id: string } }>("/internal/vms/:id/terminate", async (request) => terminate(request.params.id));
  app.get<{ Params: { id: string } }>("/internal/vms/:id", async (request) => service.status(request.params.id));

  return app;
}
