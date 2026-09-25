import { validateOutboundUrl, type DnsResolver, type OutboundPolicy } from "./url-policy.js";

export interface SafeFetchResponse { readonly status: number; readonly headers: Readonly<Record<string, string>>; readonly body: Uint8Array; readonly url: string; }
export type Requester = (url: URL, init: { method: string; headers: Record<string, string>; body?: string; signal: AbortSignal; maxBytes: number }) => Promise<SafeFetchResponse>;
export async function safeFetch(rawUrl: string, init: RequestInit, policy: OutboundPolicy, requester: Requester, resolver?: DnsResolver): Promise<SafeFetchResponse> {
  let current = new URL(rawUrl);
  let redirects = 0;
  while (true) {
    await validateOutboundUrl(current.toString(), policy, resolver);
    const response = await requester(current, { method: init.method ?? "GET", headers: Object.fromEntries(Object.entries(init.headers ?? {})), body: typeof init.body === "string" ? init.body : undefined, signal: init.signal ?? AbortSignal.timeout(policy.totalTimeoutMs), maxBytes: policy.maxResponseBytes });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.location;
    if (!location || ++redirects > policy.maxRedirects) throw new Error("redirect policy exceeded");
    current = new URL(location, current);
  }
}
