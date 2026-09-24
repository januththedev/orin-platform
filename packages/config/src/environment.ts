import { ConfigError } from "./config-error.js";

export type RuntimeProfile = "cloud" | "local";
export type ProviderMode = "fake" | "live";
export type DeploymentEnvironment = "development" | "preview" | "production" | "test";
export interface FeatureFlags {
  readonly identityV2: boolean;
  readonly routerV2: boolean;
  readonly searchV2: boolean;
  readonly chatV2: boolean;
}
export interface PlatformConfig {
  readonly profile: RuntimeProfile;
  readonly providerMode: ProviderMode;
  readonly deployment: DeploymentEnvironment;
  readonly features: FeatureFlags;
  readonly contractVersion: "1.0.0";
}
function enumValue<T extends string>(name: string, value: string | undefined, values: readonly T[], fallback: T): T {
  if (value === undefined) return fallback;
  if (!values.includes(value as T)) throw new ConfigError(`${name} has an invalid value`, [name]);
  return value as T;
}
function boolValue(name: string, value: string | undefined): boolean {
  if (value === undefined || value === "0" || value === "false") return false;
  if (value === "1" || value === "true") return true;
  throw new ConfigError(`${name} must be one of 1,0,true,false`, [name]);
}
export function loadPlatformConfig(env: Readonly<Record<string, string | undefined>>, deployment: DeploymentEnvironment): PlatformConfig {
  const profile = enumValue("ORIN_RUNTIME_PROFILE", env.ORIN_RUNTIME_PROFILE, ["cloud", "local"] as const, "cloud");
  const providerMode = enumValue("ORIN_PROVIDER_MODE", env.ORIN_PROVIDER_MODE, ["fake", "live"] as const, "fake");
  if (deployment === "preview" && providerMode !== "fake") throw new ConfigError("Preview requires ORIN_PROVIDER_MODE=fake", ["ORIN_PROVIDER_MODE"]);
  return {
    profile,
    providerMode,
    deployment,
    features: {
      identityV2: boolValue("ORIN_FEATURE_IDENTITY_V2", env.ORIN_FEATURE_IDENTITY_V2),
      routerV2: boolValue("ORIN_FEATURE_ROUTER_V2", env.ORIN_FEATURE_ROUTER_V2),
      searchV2: boolValue("ORIN_FEATURE_SEARCH_V2", env.ORIN_FEATURE_SEARCH_V2),
      chatV2: boolValue("ORIN_FEATURE_CHAT_V2", env.ORIN_FEATURE_CHAT_V2),
    },
    contractVersion: "1.0.0",
  };
}
export function assertSecretPresence(env: Readonly<Record<string, string | undefined>>, names: readonly string[]): void {
  const missing = names.filter((name) => !env[name]);
  if (missing.length) throw new ConfigError("Required secrets are missing", missing);
}
