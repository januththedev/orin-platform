import { lookup } from "node:dns/promises";
import { assertPublicAddress } from "./ip-policy.js";

export interface OriginPathRule { readonly origin: string; readonly pathPrefixes: readonly string[]; }
export interface OutboundPolicy {
  readonly profile: "cloud" | "local";
  readonly allowlist: readonly OriginPathRule[];
  readonly maxRedirects: number;
  readonly connectTimeoutMs: number;
  readonly totalTimeoutMs: number;
  readonly maxResponseBytes: number;
  readonly allowedContentTypes: readonly string[];
}
export interface ResolvedAddress { readonly address: string; readonly family: 4 | 6; }
export interface DnsResolver { resolveAll(hostname: string): Promise<readonly ResolvedAddress[]>; }
export interface ValidatedTarget { readonly url: URL; readonly addresses: readonly ResolvedAddress[]; }
const defaultResolver: DnsResolver = {
  async resolveAll(hostname) {
    const results = await lookup(hostname, { all: true, verbatim: true });
    return results.map((result) => ({ address: result.address, family: result.family === 6 ? 6 : 4 }));
  },
};
function pathAllowed(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`);
}
export async function validateOutboundUrl(rawUrl: string, policy: OutboundPolicy, resolver: DnsResolver = defaultResolver): Promise<ValidatedTarget> {
  const url = new URL(rawUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error("unsupported URL scheme");
  if (url.username || url.password) throw new Error("embedded URL credentials are forbidden");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("non-default URL port is forbidden");
  const rule = policy.allowlist.find((entry) => entry.origin === url.origin);
  if (!rule || !rule.pathPrefixes.some((prefix) => pathAllowed(url.pathname, prefix))) throw new Error("URL is not in the provider registry");
  const literal = url.hostname.replace(/^\[|\]$/g, "");
  let addresses: readonly ResolvedAddress[];
  if (/^[0-9.]+$/.test(literal) || literal.includes(":")) {
    addresses = [{ address: literal, family: literal.includes(":") ? 6 : 4 }];
  } else {
    addresses = await resolver.resolveAll(literal);
  }
  if (addresses.length === 0) throw new Error("DNS returned no addresses");
  for (const address of addresses) assertPublicAddress(address.address);
  return { url, addresses };
}
export function normalizeResultLink(rawUrl: string): URL {
  const url = new URL(rawUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) throw new Error("unsafe result link");
  const literal = url.hostname.replace(/^\[|\]$/g, "");
  if (/^[0-9.]+$/.test(literal) || literal.includes(":")) assertPublicAddress(literal);
  return url;
}
