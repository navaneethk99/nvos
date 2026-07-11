import "server-only";

function required(name: "NVOS_CONTROL_URL" | "NVOS_CONTROL_SECRET") {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}.`);
  }
  return value;
}

export function getVmConfig() {
  const controlUrl = required("NVOS_CONTROL_URL");
  const controlSecret = required("NVOS_CONTROL_SECRET");
  const baseDomain = process.env.NVOS_VM_BASE_DOMAIN?.trim() || "vm.nvos.in";

  if (!/^[a-z0-9.-]+$/i.test(baseDomain)) {
    throw new Error("NVOS_VM_BASE_DOMAIN must be a valid hostname.");
  }

  return { controlUrl: controlUrl.replace(/\/$/, ""), controlSecret, baseDomain };
}
