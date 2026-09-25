import { OrinServerClient, type ServerClientOptions } from "./base-client.js";
export class CoreClient {
  readonly #client: OrinServerClient;
  constructor(options: ServerClientOptions) { this.#client = new OrinServerClient(options); }
  startDeviceAuthorization(body: unknown) { return this.#client.request("/api/auth/device/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }
  approveDeviceAuthorization(body: unknown) { return this.#client.request("/api/auth/device/approve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }
  pollDeviceToken(body: unknown) { return this.#client.request("/api/auth/device/token", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }
  listSessions() { return this.#client.request("/api/account/sessions"); }
  rotateSession() { return this.#client.request("/api/auth/session/rotate", { method: "POST" }); }
}
