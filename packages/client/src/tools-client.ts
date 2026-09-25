import { OrinServerClient, type ServerClientOptions } from "./base-client.js";
export class ToolsSearchClient {
  readonly #client: OrinServerClient;
  constructor(options: ServerClientOptions) { this.#client = new OrinServerClient(options); }
  searchPublic(body: unknown) { return this.#client.request(`/api/search?${new URLSearchParams({ q: String((body as { query: string }).query), n: String((body as { n: number }).n) })}`); }
  searchPrivate(body: unknown, serviceAuthorization: string) { return this.#client.request("/api/search", { method: "POST", headers: { "content-type": "application/json", "x-orin-service-assertion": serviceAuthorization, "cache-control": "no-store", "referrer-policy": "no-referrer" }, body: JSON.stringify(body) }); }
}
