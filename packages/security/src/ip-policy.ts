import ipaddr from "ipaddr.js";

export function parseAddress(value: string): ipaddr.IPv4 | ipaddr.IPv6 {
  return ipaddr.parse(value);
}
export function isPublicAddress(value: string): boolean {
  let address: ipaddr.IPv4 | ipaddr.IPv6;
  try { address = parseAddress(value); } catch { return false; }
  if (address.kind() === "ipv4") {
    const v4 = address as ipaddr.IPv4;
    return !v4.range() || v4.range() === "unicast";
  }
  const v6 = address as ipaddr.IPv6;
  if (v6.isIPv4MappedAddress()) return isPublicAddress(v6.toIPv4Address().toString());
  return v6.range() === "unicast";
}
export function assertPublicAddress(value: string): void {
  if (!isPublicAddress(value)) throw new Error(`non-public address rejected: ${value}`);
}
