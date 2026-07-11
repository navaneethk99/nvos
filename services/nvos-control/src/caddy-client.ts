export type CaddyRoute = {
  match?: Array<{ host?: string[] }>;
  handle?: Array<{ handler?: string; upstreams?: Array<{ dial?: string }> }>;
  terminal?: boolean;
};

export class CaddyClient {
  constructor(private readonly adminUrl: string, private readonly fetchImpl: typeof fetch = fetch) {}

  async listRoutes(): Promise<CaddyRoute[]> {
    const response = await this.fetchImpl(`${this.adminUrl}/config/apps/http/servers/srv0/routes`);
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`Caddy route listing failed with HTTP ${response.status}.`);
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error("Caddy route listing returned invalid data.");
    return data as CaddyRoute[];
  }

  async addRoute(host: string, privateIp: string) {
    await this.removeRoute(host);
    const route: CaddyRoute = {
      match: [{ host: [host] }],
      handle: [{ handler: "reverse_proxy", upstreams: [{ dial: `${privateIp}:6080` }] }],
      terminal: true,
    };
    const response = await this.fetchImpl(`${this.adminUrl}/config/apps/http/servers/srv0/routes/-`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(route),
    });
    if (!response.ok) throw new Error(`Caddy route creation failed with HTTP ${response.status}.`);
  }

  async removeRoute(host: string) {
    const routes = await this.listRoutes();
    const indexes = routes.flatMap((route, index) => route.match?.some((matcher) => matcher.host?.includes(host)) ? [index] : []);
    for (const index of indexes.reverse()) {
      const response = await this.fetchImpl(`${this.adminUrl}/config/apps/http/servers/srv0/routes/${index}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`Caddy route removal failed with HTTP ${response.status}.`);
    }
  }
}
