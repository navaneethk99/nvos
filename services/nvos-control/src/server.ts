import { buildApp } from "./app";
import { loadConfig } from "./config";

async function main() {
  const config = loadConfig();
  const app = buildApp(config);
  await app.listen({ host: config.host, port: config.port });
}

void main().catch((error) => {
  console.error("Failed to start nvos-control", { error: error instanceof Error ? error.message : "Unknown error" });
  process.exitCode = 1;
});
