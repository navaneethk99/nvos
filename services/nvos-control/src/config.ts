export type ControlConfig = {
  awsRegion: string;
  launchTemplateId: string;
  windowsLaunchTemplateId: string;
  guacamoleUrl: string;
  guacamoleUsername: string;
  guacamolePassword: string;
  guacamoleRdpPassword: string;
  controlSecret: string;
  vmBaseDomain: string;
  caddyAdminUrl: string;
  host: string;
  port: number;
};

function required(name: string, env: NodeJS.ProcessEnv) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function loadConfig(env = process.env): ControlConfig {
  const port = Number(env.NVOS_CONTROL_PORT ?? "3001");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("NVOS_CONTROL_PORT must be a valid port number.");
  const vmBaseDomain = env.NVOS_VM_BASE_DOMAIN?.trim() || "vm.nvos.in";
  if (!/^[a-z0-9.-]+$/i.test(vmBaseDomain)) throw new Error("NVOS_VM_BASE_DOMAIN must be a valid hostname.");
  return {
    awsRegion: env.AWS_REGION?.trim() || "ap-south-1",
    launchTemplateId: env.NVOS_EC2_LAUNCH_TEMPLATE_ID?.trim() || "",
    windowsLaunchTemplateId: env.AWS_WINDOWS_LAUNCH_TEMPLATE_ID?.trim() || "",
    guacamoleUrl: (env.GUACAMOLE_URL?.trim() || "").replace(/\/$/, ""),
    guacamoleUsername: env.GUACAMOLE_USERNAME?.trim() || "",
    guacamolePassword: env.GUACAMOLE_PASSWORD ?? "",
    guacamoleRdpPassword: env.GUACAMOLE_RDP_PASSWORD ?? "",
    controlSecret: required("NVOS_CONTROL_SECRET", env),
    vmBaseDomain,
    caddyAdminUrl: (env.CADDY_ADMIN_URL?.trim() || "http://127.0.0.1:2019").replace(/\/$/, ""),
    host: env.NVOS_CONTROL_HOST?.trim() || "127.0.0.1",
    port,
  };
}
