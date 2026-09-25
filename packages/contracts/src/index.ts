export { PLATFORM_CONTRACT_VERSION } from "./version.js";
export type { PlatformContractVersion } from "./version.js";
export type { EventEnvelopeV1, ErrorEnvelopeV1, ModelAliasV1, SearchRequestV1 } from "./types.js";
export { MCP_SCOPES, assertExactScopes, parseScopes } from "./scope.js";
export { isCatalogEntryEligible } from "./model-eligibility.js";
export { createContractValidator } from "./validation.js";
export type { ContractKind } from "./validation.js";
