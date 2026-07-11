import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/config";

describe("control configuration", () => {
  it("requires a 32-character hexadecimal Guacamole JSON secret", () => {
    expect(() => loadConfig({ NVOS_CONTROL_SECRET: "control-secret", GUACAMOLE_PUBLIC_URL: "https://desktop.test", GUACAMOLE_JSON_SECRET: "not-hex" })).toThrow("GUACAMOLE_JSON_SECRET must be exactly 32 hexadecimal characters.");
    const config = loadConfig({ NVOS_CONTROL_SECRET: "control-secret", GUACAMOLE_URL: "http://private.test/guacamole/", GUACAMOLE_PUBLIC_URL: "https://desktop.test/guacamole/", GUACAMOLE_JSON_SECRET: "0123456789abcdef0123456789abcdef" });
    expect(config.guacamoleJsonSecret).toBe("0123456789abcdef0123456789abcdef");
    expect(config.guacamoleUrl).toBe("http://private.test/guacamole");
    expect(config.guacamolePublicUrl).toBe("https://desktop.test/guacamole");
  });
});
