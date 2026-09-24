# Orin Platform Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and release `orin-platform` v1.0.0 as the canonical cross-language contract, security, client, observability, compatibility, and UI source consumed by Core/Chat, Router, and Tools.

**Architecture:** JSON Schema Draft 2020-12 is the only wire-format source of truth. An npm workspace builds small TypeScript packages, deterministic code generation emits committed TypeScript/Python/Rust models, and a Git tag distributes the release to consumer submodules. Runtime policy is dependency-injected so tests never contact external services.

**Tech Stack:** Node 22, npm 11, TypeScript 5.9, JSON Schema 2020-12, Ajv 8, Quicktype Core 26, `jose`, `ipaddr.js`, Node test runner, Python `unittest`, Rust `cargo test`, GitHub Actions.

## Global Constraints

- Work from `D:\Orin_ECOSYS\orin-platform` on branch `release/platform-v1.0.0` created from the approved design branch.
- Set local Git author to `Januth Nimnal <nimnaljanuth@gmail.com>` before the first implementation commit.
- Do not run live provider, Neon, Redis, Vercel, search, TTS, image, or network calls in tests.
- Do not add MCP clients, user Router keys, public run clients, or a notes parser.
- Runtime packages must not depend on a consumer repository.
- Schema source files are canonical; generated files are committed but never hand-edited.
- Security-sensitive errors and logs must never contain secret values, raw prompts, queries, paths, cookies, tokens, or provider response bodies.

---

## File map

**Create root/tooling**

- `package.json`, `package-lock.json`, `.npmrc`, `tsconfig.json`, `.gitignore`, `README.md`
- `tools/codegen/generate.mjs`, `tools/codegen/local-schema-store.mjs`, `tools/codegen/normalize.mjs`
- `tools/contracts/check-schemas.mjs`, `tools/contracts/check-compatibility.mjs`, `tools/contracts/verify-consumer-manifest.mjs`
- `tools/test/run-node-tests.mjs`, `tools/security/scan-secrets.mjs`, `tools/release/verify-release.mjs`
- `.github/workflows/ci.yml`, `.github/workflows/consumer-contract.yml`, `.github/workflows/release.yml`

**Create contracts**

- `packages/contracts/schemas/*.v1.schema.json`, `packages/contracts/schemas/catalog.v1.json`
- `packages/contracts/src/{index,version,validation,model-eligibility,scope}.ts`
- `packages/contracts/test/{schema,fixtures,semantic,registry}.test.mjs`
- `contracts/error-codes.v1.json`, `contracts/compatibility.v1.json`
- `schemas/registry.v1.json`, `schemas/events/event-catalog.v1.json`, `schemas/database/*.v1.json`

**Create runtime packages**

- `packages/client/src/{index,base-client,credentials,errors,sse,core-client,router-client,tools-client}.ts`
- `packages/config/src/{index,config-error,environment,feature-flags,profiles}.ts`
- `packages/security/src/{index,ip-policy,url-policy,safe-fetch,token-verifier,envelope,secret}.ts`
- `packages/observability/src/{index,event,redaction,json-logger,telemetry,outbox}.ts`
- `packages/ui/styles/{tokens,primitives,layout,accessibility}.css`
- `packages/notes/src/index.ts` (reservation only)

**Create generated/fixtures/manifests**

- `packages/contracts/src/generated/v1.ts`
- `sdks/python/**`, `sdks/rust/**`
- `fixtures/v1/{valid,invalid}/**`, `fixtures/consumers/*.consumer.json`
- `product/manifest.v1.json`, `product/compatibility-matrix.v1.json`, `generated/artifact-manifest.v1.json`
- `orin-platform.consumer.json`

## Task 1: Initialize the deterministic workspace

**Files:** root manifests, all workspace package manifests, test runner.

**Interfaces:** Produces npm scripts `build`, `typecheck`, `codegen`, `codegen:check`, `schemas:check`, `compat:check`, `test`, `scan:secrets`, `check`, and package exports consumed by every later task.

- [ ] **Step 1: Write the failing workspace smoke test**

Create `tools/test/runner-self-test.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";

test("workspace exposes contract version 1.0.0", async () => {
  const version = await import("../../packages/contracts/dist/version.js");
  assert.equal(version.PLATFORM_CONTRACT_VERSION, "1.0.0");
});
```

- [ ] **Step 2: Run it and verify red**

Run:

```bash
npm run test:node -- tools
```

Expected: failure because workspace files and `packages/contracts/dist/version.js` do not exist.

- [ ] **Step 3: Create root configuration**

`package.json`:

```json
{
  "name": "orin-platform",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "npm@11.6.2",
  "engines": { "node": ">=22.18.0" },
  "workspaces": ["packages/*"],
  "scripts": {
    "build": "tsc -b",
    "typecheck": "tsc -b --pretty false",
    "codegen": "node tools/codegen/generate.mjs",
    "codegen:check": "node tools/codegen/generate.mjs --check",
    "schemas:check": "node tools/contracts/check-schemas.mjs",
    "compat:check": "node tools/contracts/check-compatibility.mjs",
    "test:node": "npm run build && node tools/test/run-node-tests.mjs",
    "test:python": "python -m unittest discover -s sdks/python/tests -p \"test_*.py\"",
    "test:rust": "cargo test --manifest-path sdks/rust/Cargo.toml --locked",
    "test": "npm run typecheck && npm run test:node && npm run test:python && npm run test:rust",
    "scan:secrets": "node tools/security/scan-secrets.mjs",
    "check": "npm run codegen:check && npm run schemas:check && npm run test && npm run scan:secrets",
    "release:verify": "node tools/release/verify-release.mjs"
  },
  "devDependencies": {
    "@types/node": "22.19.15",
    "quicktype-core": "26.0.0",
    "typescript": "5.9.3"
  }
}
```

Create `.npmrc`:

```ini
engine-strict=true
save-exact=true
fund=false
package-lock=true
```

Create each `packages/*/package.json` with `"private": true`, exact `0.1.0` version, `exports` pointing to `dist`, and internal dependencies only where listed in this plan.

- [ ] **Step 4: Implement the workspace test runner**

`tools/test/run-node-tests.mjs` must discover `packages/*/test/*.test.mjs`, spawn `node --test`, forward arguments, and return the child exit code.

- [ ] **Step 5: Install with approval, build, and verify green**

Run only after dependency-install approval:

```bash
npm install
npm run build
npm run test:node -- tools
```

Expected: exit `0`; no external request.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .npmrc tsconfig.json .gitignore packages tools
git commit -m "chore(platform): initialize deterministic npm workspace"
```

## Task 2: Define canonical v1 schemas and fixtures

**Files:** all `packages/contracts/schemas/*.json`, schema tests, valid/invalid fixtures.

**Interfaces:** Produces `CommonV1`, `TokenClaimsV1`, `EventEnvelopeV1`, `ErrorEnvelopeV1`, `ChatRequestV1`, `SearchRequestV1`, and manifest definitions.

- [ ] **Step 1: Write failing schema/fixture tests**

Tests must assert:

```js
assert.equal(validate("SearchRequestV1", valid).valid, true);
assert.equal(validate("SearchRequestV1", { ...valid, query: "x".repeat(513) }).valid, false);
assert.equal(validate("TokenClaimsV1", mcpWithExtraScope).valid, true, "schema accepts claims; semantic test rejects scope");
assert.throws(() => assertExactScopes("models:read chat:generate usage:read admin", MCP_SCOPES));
```

Also reject unknown object properties, raw Router model IDs, stale/paid catalog entries, event prompt metadata, error envelopes without request ID, Chat base64 media, and first-slice manifests containing deferred products.

- [ ] **Step 2: Run red**

```bash
npm run schemas:check
```

Expected: missing schema catalog failure.

- [ ] **Step 3: Create the canonical schemas**

Every schema uses Draft 2020-12, strict `additionalProperties: false`, canonical `$id` under `https://schemas.orinai.org/platform/1.0.0/`, and RFC 3339 timestamps.

The error schema must be exactly:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.orinai.org/platform/1.0.0/errors.v1.schema.json",
  "type": "object",
  "additionalProperties": false,
  "required": ["error"],
  "properties": {
    "error": {
      "type": "object",
      "additionalProperties": false,
      "required": ["code", "message", "retryable", "retry_after", "request_id"],
      "properties": {
        "code": { "type": "string", "enum": ["ORIN_VALIDATION_FAILED", "ORIN_AUTHENTICATION_REQUIRED", "ORIN_AUTHORIZATION_DENIED", "ORIN_MODEL_NOT_FOUND", "ORIN_PROVIDER_EXHAUSTED", "ORIN_RATE_LIMIT_STATE_UNAVAILABLE", "ORIN_STREAM_TERMINAL_ERROR", "ORIN_STORAGE_FAILURE", "ORIN_INTERNAL"] },
        "message": { "type": "string", "maxLength": 256 },
        "retryable": { "type": "boolean" },
        "retry_after": { "type": ["integer", "null"], "minimum": 0 },
        "request_id": { "$ref": "common.v1.schema.json#/$defs/RequestIdV1" }
      }
    }
  }
}
```

The four aliases are the exact enum in `models.v1.schema.json`:

```json
["orin-cheap", "orin-balanced", "orin-thinking", "orin-coding"]
```

- [ ] **Step 4: Add sanitized fixtures**

Every fixture must contain synthetic IDs only. Invalid fixtures include paid/stale/missing-price catalogs, extra MCP scope, raw model request, overlong query, prompt metadata, missing error request ID, base64 attachment, and deferred capability in a first-slice manifest.

- [ ] **Step 5: Verify green**

```bash
npm run schemas:check
npm run test:node -- contracts
```

Expected: all valid fixtures pass and all invalid fixtures fail for the named reason.

- [ ] **Step 6: Commit**

```bash
git add packages/contracts/schemas packages/contracts/test fixtures contracts
git commit -m "feat(contracts): define canonical v1 JSON schemas"
```

## Task 3: Add version registry, compatibility checks, and generated clients

**Files:** registry, event/error catalogs, codegen scripts, generated TS/Python/Rust.

**Interfaces:** Produces `PLATFORM_CONTRACT_VERSION`, generated model modules, compatibility matrix, artifact hashes.

- [ ] **Step 1: Write failing registry/codegen tests**

Tests must prove registry paths exist, IDs are unique, a breaking schema change without a major bump fails, generated output is deterministic, and `--check` performs no writes.

- [ ] **Step 2: Run red**

```bash
npm run compat:check
npm run codegen:check
```

Expected: missing registry and generated files.

- [ ] **Step 3: Implement schema registry and compatibility checker**

`schemas/registry.v1.json` lists schema path, `$id`, version, language outputs, and compatibility class. The checker classifies removed properties/enums/required fields as breaking and added optional fields/enums as additive.

- [ ] **Step 4: Implement deterministic Quicktype generation**

`tools/codegen/generate.mjs` must:

1. read `packages/contracts/schemas/catalog.v1.json`;
2. validate local `$ref` resolution;
3. generate TypeScript interfaces, Python dataclasses/Pydantic-compatible models, and Rust Serde structs;
4. prepend generator/version/source-hash/contract-version headers;
5. normalize LF;
6. generate compatibility matrix and artifact hashes;
7. in `--check` mode, compare in memory and exit `1` without writing.

- [ ] **Step 5: Generate and test all languages**

```bash
npm run codegen
npm run codegen:check
npm run test:python
npm run test:rust
```

Expected: all languages consume the same fixture manifest and pass.

- [ ] **Step 6: Commit**

```bash
git add schemas contracts tools/codegen packages/contracts/src/generated sdks generated product
git commit -m "build(contracts): generate cross-language v1 models"
```

## Task 4: Implement strict configuration and feature flags

**Files:** `packages/config/**`, tests.

**Interfaces:** Produces `loadPlatformConfig`, `assertSecretPresence`, `FeatureFlags`, and `RuntimeProfile`.

- [ ] **Step 1: Write failing config tests**

Cover invalid enum values, preview/live mismatch, required production values, secret-name-only errors, exact boolean syntax, and all flags defaulting false.

- [ ] **Step 2: Run red**

```bash
npm run test:node -- config
```

Expected: missing exports.

- [ ] **Step 3: Implement strict parsing**

```ts
export interface FeatureFlags {
  readonly identityV2: boolean;
  readonly routerV2: boolean;
  readonly searchV2: boolean;
  readonly chatV2: boolean;
}

export function parseBoolean(name: string, raw: string | undefined, fallback = false): boolean {
  if (raw === undefined) return fallback;
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  throw new ConfigError(`${name} must be one of 1,0,true,false`);
}
```

`assertSecretPresence` reports only names and never reads values into error text.

- [ ] **Step 4: Verify green and commit**

```bash
npm run test:node -- config
git add packages/config
git commit -m "feat(config): add strict profiles and feature flags"
```

## Task 5: Implement DNS-pinned outbound security and token/encryption policy

**Files:** `packages/security/**`, tests.

**Interfaces:** Produces `validateOutboundUrl`, `safeFetch`, `verifyPlatformToken`, `encryptSecret`, `decryptSecret`.

- [ ] **Step 1: Write failing URL/IP/token tests**

Include FTP, credentials, malformed/decimal/hex/octal IPv4, all non-global IPv4/IPv6 ranges, IPv4-mapped private IPv6, mixed public/private DNS, redirect-to-private, oversized/slow/content-type failures, `alg:none`, attacker-controlled `jku`, wrong issuer/audience/type/scope, unknown key version, and AAD tamper.

- [ ] **Step 2: Run red**

```bash
npm run test:node -- security
```

Expected: missing security exports.

- [ ] **Step 3: Implement policy-driven IP/URL validation**

`safeFetch` must use manual redirects and injected DNS/transport. It must never use global fetch for provider/search requests, validate every redirect, strip authorization/cookies cross-origin, enforce total bytes/time/content type, and connect to the exact validated address.

- [ ] **Step 4: Implement token and envelope policy**

The verifier must require explicit issuer, audience, type, algorithms, scopes, and key resolver. `jose` verifies signature; the code enforces semantic claims. Envelope encryption uses random 256-bit DEK, AES-256-GCM, random nonce, AAD, key version, current/previous KEK read, and current-only write.

- [ ] **Step 5: Verify green and commit**

```bash
npm run test:node -- security
git add packages/security
git commit -m "feat(security): add DNS-pinned outbound and secret policy"
```

## Task 6: Implement events, redaction, logging, and required outbox

**Files:** `packages/observability/**`, tests.

**Interfaces:** Produces `createEvent`, `redactMetadata`, `DurableEventStore`, and `withRequiredEvent`.

- [ ] **Step 1: Write failing observability tests**

Assert every envelope field, null optional IDs, error code on failed/denied outcome, recursive sensitive-key redaction, scalar/size bounds, one-line JSON logs, append-before-operation, and zero protected operations when append fails.

- [ ] **Step 2: Run red**

```bash
npm run test:node -- observability
```

Expected: missing exports.

- [ ] **Step 3: Implement minimal durable gate**

```ts
export async function withRequiredEvent<T>(
  store: DurableEventStore,
  event: EventEnvelopeV1,
  operation: () => Promise<T>,
): Promise<T> {
  await store.append(event);
  return operation();
}
```

Telemetry export is best-effort only after the durable append.

- [ ] **Step 4: Verify green and commit**

```bash
npm run test:node -- observability
git add packages/observability
git commit -m "feat(observability): add durable privacy-safe events"
```

## Task 7: Implement base HTTP/SSE client and first-slice adapters

**Files:** `packages/client/**`, tests.

**Interfaces:** Produces `OrinServerClient`, `readSse`, `CoreClient`, `RouterClient`, `ToolsSearchClient`.

- [ ] **Step 1: Write failing HTTP/SSE tests**

Cover request/correlation IDs, injected credentials, no storage API references, GET retries, no POST retry without idempotency, abort, sanitized errors, CRLF/multiline/final-buffer SSE, one terminal, no post-terminal data, and cancellation.

- [ ] **Step 2: Run red**

```bash
npm run test:node -- client
```

Expected: missing client exports.

- [ ] **Step 3: Implement clients**

- Public Tools search uses GET.
- Private Tools search uses POST body and forbids query-string input.
- Router accepts only four aliases and authenticates before opening a stream.
- Core device/session clients use the exact platform routes.
- No MCP, Router key-management, or run method is exported.

- [ ] **Step 4: Verify green and commit**

```bash
npm run test:node -- client
git add packages/client
git commit -m "feat(client): add authenticated HTTP SSE and service adapters"
```

## Task 8: Add UI tokens, reserved notes, and product/consumer manifests

**Files:** `packages/ui/**`, `packages/notes/**`, `product/**`, consumer fixtures.

**Interfaces:** Produces product integration classifications and exact compatibility matrix.

- [ ] **Step 1: Write failing manifest/UI tests**

Assert exact first-slice set, all other repositories contract-only, no deferred capabilities, required UI accessibility/focus/reduced-motion/no-remote-import rules, and notes exports only version/status.

- [ ] **Step 2: Run red**

```bash
npm run test:node -- ui
npm run test:node -- notes
npm run test:node -- contracts
```

Expected: missing files/exports.

- [ ] **Step 3: Implement manifests and UI**

`product/manifest.v1.json` marks only `orin-platform`, `orin-ai`, `orin-router-service`, and `orin-tools` as `first-slice`. The other ten products are `contract-only` with null minimum versions and no capabilities.

- [ ] **Step 4: Verify green and commit**

```bash
npm run codegen
npm run test:node -- ui
npm run test:node -- notes
npm run test:node -- contracts
git add packages/ui packages/notes product fixtures/consumers
git commit -m "feat(manifest): classify first-slice product compatibility"
```

## Task 9: Add CI, secret scanning, and release verification

**Files:** workflows and tools.

- [ ] **Step 1: Write failing tool self-tests**

Use generated temp fixtures to prove secret values are redacted, generated drift fails, deferred first-slice capability fails, tag/version mismatch fails, and release decision cannot remain pending.

- [ ] **Step 2: Run red**

```bash
npm run scan:secrets
npm run release:verify
```

Expected: missing scripts.

- [ ] **Step 3: Implement pinned CI and release workflow**

CI runs Node 22, Python 3.11/3.12, Rust stable, schema/codegen/tests, Gitleaks, and consumer fixture validation. Actions are pinned by SHA. Release workflow runs only for `platform-v*` tags, requires a clean generated tree, and publishes release metadata without npm publication.

- [ ] **Step 4: Verify full platform gate**

```bash
npm run check
npm run release:verify
```

Expected: exit `0`, no live provider/network access beyond dependency installation.

- [ ] **Step 5: Commit**

```bash
git add .github tools package.json package-lock.json orin-platform.consumer.json
git commit -m "ci: enforce generated security and release gates"
```

## Task 10: Publish the immutable platform release

- [ ] **Step 1: Run clean verification**

```bash
npm ci
npm run check
git diff --exit-code
git status --short
```

Expected: tests pass and working tree is clean.

- [ ] **Step 2: Create/push the GitHub repository and branch**

```bash
gh repo create januththedev/orin-platform --public --source . --remote origin
git push -u origin release/platform-v1.0.0
gh pr create --base main --head release/platform-v1.0.0 --title "platform: release contract v1.0.0"
```

Expected: PR URL is recorded in the release log.

- [ ] **Step 3: Merge through CI**

Use the repository's normal branch-protection/review process. Do not bypass failed checks.

- [ ] **Step 4: Tag the merged commit**

```bash
git switch main
git pull --ff-only
git tag -a platform-v1.0.0 -m "Orin platform contract release v1.0.0"
git push origin platform-v1.0.0
```

Expected: immutable tag points at merged `main` commit.

- [ ] **Step 5: Record release evidence**

Record tag, SHA, schema/contract versions, fixture digest, generated artifact hashes, Node/Python/Rust versions, and CI run URL.

- [ ] **Step 6: Commit release log if needed**

```bash
git add docs/releases/platform-v1.0.0.md
git commit -m "docs: record platform v1.0.0 release evidence"
```

## Requirement-to-task coverage

- Canonical identity/token/model/event/error/search/chat contracts: Tasks 2–3.
- Strict cloud/local configuration and flags: Task 4.
- SSRF, redirect, token, and envelope policy: Task 5.
- Shared privacy-safe durable events/outbox: Task 6.
- Core/Router/Tools HTTP/SSE clients: Task 7.
- Shared Orin UI and notes reservation: Task 8.
- Product/consumer compatibility and CI/release: Tasks 8–10.
- No MCP/key/run/notes-parser scope leakage: Tasks 7–9.
