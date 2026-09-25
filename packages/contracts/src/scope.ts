export const MCP_SCOPES = ["models:read", "chat:generate", "usage:read"] as const;
export type McpScope = (typeof MCP_SCOPES)[number];
export function parseScopes(scope: string): string[] {
  return [...new Set(scope.trim().split(/\s+/).filter(Boolean))].sort();
}
export function assertExactScopes(actualScope: string, expectedScopes: readonly string[]): void {
  const actual = parseScopes(actualScope);
  const expected = [...expectedScopes].sort();
  if (actual.length !== expected.length || actual.some((scope, index) => scope !== expected[index])) {
    throw new Error("scope set does not match the required scope set");
  }
}
