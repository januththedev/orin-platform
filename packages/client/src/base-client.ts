export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
export interface CredentialProvider { (): Promise<{ authorization: string } | null>; }
export interface ServerClientOptions { readonly baseUrl: string | URL; readonly fetch: FetchLike; readonly credentials?: CredentialProvider; readonly timeoutMs?: number; }
export class OrinApiError extends Error { readonly code: string; readonly requestId: string; readonly retryable: boolean; constructor(code: string, message: string, requestId: string, retryable: boolean) { super(message); this.name = "OrinApiError"; this.code = code; this.requestId = requestId; this.retryable = retryable; } }
export class OrinServerClient {
  readonly baseUrl: URL;
  readonly #fetch: FetchLike;
  readonly #credentials?: CredentialProvider;
  readonly #timeoutMs: number;
  constructor(options: ServerClientOptions) { this.baseUrl = new URL(options.baseUrl); this.#fetch = options.fetch; this.#credentials = options.credentials; this.#timeoutMs = options.timeoutMs ?? 30_000; }
  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    const credential = await this.#credentials?.();
    if (credential) headers.set("authorization", credential.authorization);
    const response = await this.#fetch(new URL(path, this.baseUrl), { ...init, headers, signal: init.signal ?? AbortSignal.timeout(this.#timeoutMs) });
    const requestId = response.headers.get("x-request-id") ?? "unknown-request";
    if (!response.ok) {
      let code = "ORIN_INTERNAL"; let message = "Request failed"; let retryable = false;
      try { const body = await response.json() as { error?: { code?: string; message?: string; retryable?: boolean } }; code = body.error?.code ?? code; message = body.error?.message ?? message; retryable = body.error?.retryable ?? false; } catch { /* sanitized fallback */ }
      throw new OrinApiError(code, message, requestId, retryable);
    }
    return await response.json() as T;
  }
}
