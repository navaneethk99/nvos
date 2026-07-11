import { describe, expect, it, vi } from "vitest";

import { GuacamoleClient } from "../src/guacamole-client";

const session = { authToken: "token-123", dataSource: "postgresql" };

describe("GuacamoleClient", () => {
  it("authenticates with form credentials", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(session)))
      .mockResolvedValueOnce(new Response(JSON.stringify({})));
    const client = new GuacamoleClient("http://guacamole.test", "guacadmin", "secret", "windows-secret", fetchMock);

    await client.findConnectionByVmId("vm-1");

    expect(fetchMock.mock.calls[0]).toMatchObject([
      "http://guacamole.test/api/tokens",
      { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    ]);
    expect(fetchMock.mock.calls[0][1].body).toContain("username=guacadmin");
    expect(fetchMock.mock.calls[0][1].body).toContain("password=secret");
  });

  it("creates an RDP connection when no VM connection exists", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(session)))
      .mockResolvedValueOnce(new Response(JSON.stringify({})))
      .mockResolvedValueOnce(new Response(JSON.stringify({ identifier: "42" })));
    const client = new GuacamoleClient("http://guacamole.test", "guacadmin", "secret", "windows-secret", fetchMock);

    await expect(client.createRdpConnection("vm-1", "172.31.1.4")).resolves.toBe("42");

    expect(fetchMock.mock.calls[2][0]).toContain("/api/session/data/postgresql/connections?token=token-123");
    const body = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(body).toEqual({
      parentIdentifier: "ROOT",
      name: "nvos-vm-1",
      protocol: "rdp",
      parameters: { hostname: "172.31.1.4", port: "3389", username: "Administrator", password: "windows-secret", security: "any", "ignore-cert": "true" },
      attributes: {},
    });
  });

  it("deletes the existing RDP connection for a VM", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(session)))
      .mockResolvedValueOnce(new Response(JSON.stringify({ "42": { name: "nvos-vm-1" } })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = new GuacamoleClient("http://guacamole.test", "guacadmin", "secret", "windows-secret", fetchMock);

    await client.deleteRdpConnection("vm-1");

    expect(fetchMock.mock.calls[2]).toMatchObject([
      "http://guacamole.test/api/session/data/postgresql/connections/42?token=token-123",
      { method: "DELETE" },
    ]);
  });
});
