import { OrinServerClient, type ServerClientOptions } from "./base-client.js";
const aliases = new Set(["orin-cheap", "orin-balanced", "orin-thinking", "orin-coding"]);
export class RouterClient {
  readonly #client: OrinServerClient;
  constructor(options: ServerClientOptions) { this.#client = new OrinServerClient(options); }
  listModels() { return this.#client.request("/v1/models"); }
  async chat(body: { model: string; messages: unknown[]; stream?: boolean }) {
    if (!aliases.has(body.model)) throw new Error("ORIN_MODEL_NOT_FOUND");
    return this.#client.request("/v1/chat/completions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  }
  generateImage(body: unknown) { return this.#client.request("/v1/images/generations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); }
}
