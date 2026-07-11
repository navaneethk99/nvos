import { describe, expect, it, vi } from "vitest";

import { createWindowsJsonAuthPayload, encryptGuacamoleJsonAuthPayload, GuacamoleJsonAuthClient } from "../src/guacamole-json-auth";

describe("Guacamole JSON authentication", () => {
  it("matches the AES-128-CBC and HMAC-SHA256 test vector", () => {
    expect(encryptGuacamoleJsonAuthPayload("00112233445566778899aabbccddeeff", { username: "nvos-user-vm", expires: 1000, connections: {} })).toBe("TuHWn3BLn5yBceUvtoiRGWTwk0gkUXW6k1WeegWdbWAQDIQOMVXFMmw9WdOAceTEy1hsRxNqPWJ8+6Wm94vCdpktSt+5lBrE247ebM/Vej+R3KDOUnt/NUqKNkMTEK8G");
  });

  it("creates a unique, 60-second Windows-only payload", () => {
    const payload = createWindowsJsonAuthPayload("vm-1", "user-1", "172.31.1.4", "windows-secret", 1_000);
    expect(payload).toMatchObject({ username: "nvos-user-1-vm-1", expires: 61_000 });
    expect(payload.connections["nvos-vm-1"]).toMatchObject({ protocol: "rdp", parameters: { hostname: "172.31.1.4", port: "3389", username: "Administrator", security: "any", "ignore-cert": "true" } });
  });

  it("returns only a fragment-based launch URL after exchanging the encrypted payload", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ authToken: "short-token", dataSource: "json" })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ "nvos-vm-1": { name: "nvos-vm-1" } })));
    const client = new GuacamoleJsonAuthClient("https://guacamole.test", "0123456789abcdef0123456789abcdef", "windows-secret", fetchMock, () => 1_000);

    const launch = await client.createWindowsLaunch("vm-1", "user-1", "172.31.1.4");

    expect(launch).toEqual({ launchUrl: "https://guacamole.test/#/client/json/c/nvos-vm-1?token=short-token" });
    expect(JSON.stringify(launch)).not.toContain("windows-secret");
    expect(JSON.stringify(launch)).not.toContain("0123456789abcdef0123456789abcdef");
    expect(fetchMock.mock.calls[0][1].body).toMatch(/^data=/);
  });
});
