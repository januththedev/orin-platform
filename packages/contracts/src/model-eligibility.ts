export interface CatalogEntry {
  fetched_at: string;
  source_status: "success" | "failure";
  capabilities: string[];
  prices: { prompt: number | null; completion: number | null; image: number | null };
}
export function isCatalogEntryEligible(entry: CatalogEntry, capability: "text" | "image_generation", now = new Date()): boolean {
  const age = now.getTime() - Date.parse(entry.fetched_at);
  if (!Number.isFinite(age) || age < 0 || age > 6 * 60 * 60 * 1000) return false;
  if (entry.source_status !== "success" || !entry.capabilities.includes(capability)) return false;
  if (capability === "image_generation") return entry.prices.image === 0;
  return entry.prices.prompt === 0 && entry.prices.completion === 0;
}
