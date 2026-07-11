type GuacamoleSession = { authToken: string; dataSource: string };
type GuacamoleConnection = { identifier?: string; name?: string };

export class GuacamoleClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuacamoleClientError";
  }
}

export class GuacamoleClient {
  constructor(
    private readonly url: string,
    private readonly username: string,
    private readonly password: string,
    private readonly rdpPassword: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private assertConfigured() {
    if (!this.url || !this.username || !this.password || !this.rdpPassword) {
      throw new GuacamoleClientError("Guacamole is not configured for Windows connections.");
    }
  }

  private connectionName(vmId: string) { return `nvos-${vmId}`; }

  private async authenticate(): Promise<GuacamoleSession> {
    this.assertConfigured();
    const response = await this.fetchImpl(`${this.url}/api/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: this.username, password: this.password }).toString(),
    });
    if (!response.ok) throw new GuacamoleClientError(`Guacamole authentication failed with HTTP ${response.status}.`);
    const data: unknown = await response.json();
    if (!data || typeof data !== "object") throw new GuacamoleClientError("Guacamole authentication returned invalid data.");
    const { authToken, dataSource } = data as Record<string, unknown>;
    if (typeof authToken !== "string" || typeof dataSource !== "string") throw new GuacamoleClientError("Guacamole authentication returned invalid data.");
    return { authToken, dataSource };
  }

  private connectionUrl(session: GuacamoleSession, identifier = "") {
    const path = `/api/session/data/${encodeURIComponent(session.dataSource)}/connections${identifier ? `/${encodeURIComponent(identifier)}` : ""}`;
    return `${this.url}${path}?token=${encodeURIComponent(session.authToken)}`;
  }

  private async findConnection(session: GuacamoleSession, name: string) {
    const response = await this.fetchImpl(this.connectionUrl(session));
    if (!response.ok) throw new GuacamoleClientError(`Guacamole connection listing failed with HTTP ${response.status}.`);
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new GuacamoleClientError("Guacamole connection listing returned invalid data.");
    return Object.entries(data as Record<string, GuacamoleConnection>).find(([identifier, connection]) => connection.name === name)?.[0];
  }

  async findConnectionByVmId(vmId: string) {
    const session = await this.authenticate();
    return this.findConnection(session, this.connectionName(vmId));
  }

  async createRdpConnection(vmId: string, privateIp: string) {
    const session = await this.authenticate();
    const name = this.connectionName(vmId);
    const existing = await this.findConnection(session, name);
    if (existing) return existing;
    const response = await this.fetchImpl(this.connectionUrl(session), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentIdentifier: "ROOT",
        name,
        protocol: "rdp",
        parameters: {
          hostname: privateIp,
          port: "3389",
          username: "Administrator",
          password: this.rdpPassword,
          security: "any",
          "ignore-cert": "true",
        },
        attributes: {},
      }),
    });
    if (!response.ok) throw new GuacamoleClientError(`Guacamole connection creation failed with HTTP ${response.status}.`);
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || typeof (data as GuacamoleConnection).identifier !== "string") throw new GuacamoleClientError("Guacamole connection creation returned invalid data.");
    return (data as GuacamoleConnection).identifier!;
  }

  async deleteRdpConnection(vmId: string) {
    const session = await this.authenticate();
    const identifier = await this.findConnection(session, this.connectionName(vmId));
    if (!identifier) return;
    const response = await this.fetchImpl(this.connectionUrl(session, identifier), { method: "DELETE" });
    if (!response.ok) throw new GuacamoleClientError(`Guacamole connection deletion failed with HTTP ${response.status}.`);
  }
}
