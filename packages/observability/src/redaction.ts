const forbidden = /prompt|response|content|token|secret|authorization|cookie|email|query|path|file|key/i;
export function redactMetadata(value: Readonly<Record<string, unknown>>): Record<string, string | number | boolean | null> {
  const output: Record<string, string | number | boolean | null> = {};
  for (const [key, item] of Object.entries(value)) {
    if (forbidden.test(key)) continue;
    if (typeof item === "string") output[key] = item.length > 256 ? `${item.slice(0, 256)}…` : item;
    else if (typeof item === "number" || typeof item === "boolean" || item === null) output[key] = item;
  }
  return output;
}
