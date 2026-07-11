import { describe, expect, it, vi } from "vitest";
import { CaddyClient } from "../src/caddy-client";

describe("CaddyClient", () => {
  it("removes only the matching host route and appends a WebSocket-capable reverse proxy", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { match: [{ host: ["other.vm.nvos.in"] }] },
        { match: [{ host: ["terry-bobby-black.vm.nvos.in"] }] },
      ])))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const client = new CaddyClient("http://127.0.0.1:2019", fetchMock);
    await client.addRoute("terry-bobby-black.vm.nvos.in", "172.31.1.4");
    expect(fetchMock.mock.calls[1][0]).toContain("/routes/1");
    const route = JSON.parse(fetchMock.mock.calls[2][1].body as string);
    expect(route).toMatchObject({ match: [{ host: ["terry-bobby-black.vm.nvos.in"] }], handle: [{ handler: "reverse_proxy", upstreams: [{ dial: "172.31.1.4:6080" }] }] });
  });
});
