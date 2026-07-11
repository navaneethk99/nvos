import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/config";

describe("control configuration", () => {
  it("requires a 32-character hexadecimal Guacamole JSON secret", () => {
    expect(() => loadConfig({ NVOS_CONTROL_SECRET: "control-secret", GUACAMOLE_JSON_SECRET: "not-hex" })).toThrow("GUACAMOLE_JSON_SECRET must be exactly 32 hexadecimal characters.");
    expect(loadConfig({ NVOS_CONTROL_SECRET: "control-secret", GUACAMOLE_JSON_SECRET: "0123456789abcdef0123456789abcdef" }).guacamoleJsonSecret).toBe("0123456789abcdef0123456789abcdef");
  });
});
