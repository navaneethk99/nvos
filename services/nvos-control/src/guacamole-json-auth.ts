import { createCipheriv, createHmac } from "node:crypto";

type JsonAuthSession = { authToken: string; dataSource: string };
type JsonAuthConnection = { identifier?: string; name?: string };

export class GuacamoleJsonAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuacamoleJsonAuthError";
  }
}

export function encryptGuacamoleJsonAuthPayload(secret: string, payload: object) {
  const key = Buffer.from(secret, "hex");
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const signature = createHmac("sha256", key).update(plaintext).digest();
  const cipher = createCipheriv("aes-128-cbc", key, Buffer.alloc(16));
  return Buffer.concat([cipher.update(Buffer.concat([signature, plaintext])), cipher.final()]).toString("base64");
}

export function createWindowsJsonAuthPayload(vmId: string, userId: string, privateIp: string, rdpPassword: string, now: number) {
  const connectionName = `nvos-${vmId}`;
  return {
    username: `nvos-${userId}-${vmId}`,
    expires: now + 60_000,
    connections: {
      [connectionName]: {
        protocol: "rdp",
        parameters: {
          hostname: privateIp,
          port: "3389",
          username: "Administrator",
          password: rdpPassword,
          security: "any",
          "ignore-cert": "true",
        },
      },
    },
  };
}

export class GuacamoleJsonAuthClient {
  constructor(
    private readonly internalUrl: string,
    private readonly publicUrl: string,
    private readonly secret: string,
    private readonly rdpPassword: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  private assertConfigured() {
    if (!this.internalUrl || !this.publicUrl || !this.rdpPassword || !/^[a-fA-F0-9]{32}$/.test(this.secret)) {
      throw new GuacamoleJsonAuthError("Guacamole JSON authentication is not configured.");
    }
  }

  private connectionName(vmId: string) { return `nvos-${vmId}`; }

  async createWindowsLaunch(vmId: string, userId: string, privateIp: string) {
    this.assertConfigured();
    const connectionName = this.connectionName(vmId);
    const payload = createWindowsJsonAuthPayload(vmId, userId, privateIp, this.rdpPassword, this.now());
    const data = encryptGuacamoleJsonAuthPayload(this.secret, payload);
    const tokenResponse = await this.fetchImpl(`${this.internalUrl}/api/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data }).toString(),
    });
    if (!tokenResponse.ok) throw new GuacamoleJsonAuthError("Guacamole JSON authentication failed.");
    const session: unknown = await tokenResponse.json();
    if (!session || typeof session !== "object" || typeof (session as JsonAuthSession).authToken !== "string" || typeof (session as JsonAuthSession).dataSource !== "string") throw new GuacamoleJsonAuthError("Guacamole JSON authentication returned invalid data.");
    const { authToken, dataSource } = session as JsonAuthSession;
    const connectionsResponse = await this.fetchImpl(`${this.internalUrl}/api/session/data/${encodeURIComponent(dataSource)}/connections?token=${encodeURIComponent(authToken)}`);
    if (!connectionsResponse.ok) throw new GuacamoleJsonAuthError("Guacamole connection lookup failed.");
    const connections: unknown = await connectionsResponse.json();
    if (!connections || typeof connections !== "object" || Array.isArray(connections)) throw new GuacamoleJsonAuthError("Guacamole connection lookup returned invalid data.");
    const identifier = Object.entries(connections as Record<string, JsonAuthConnection>).find(([, connection]) => connection.name === connectionName)?.[0];
    if (!identifier) throw new GuacamoleJsonAuthError("Guacamole JSON connection was not created.");
    return { launchUrl: `${this.publicUrl}/#/client/${encodeURIComponent(dataSource)}/c/${encodeURIComponent(identifier)}?token=${encodeURIComponent(authToken)}` };
  }
}
