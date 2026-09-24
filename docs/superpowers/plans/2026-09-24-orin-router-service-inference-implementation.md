# Orin Router Service Inference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the divergent `orin-router-service` control plane with a hardened, stateless, Vercel-compatible inference dependency that accepts only Core service assertions, exposes exactly four free model aliases, and records durable provider-attempt facts.

**Architecture:** `Orin-AI` mints a short-lived usage-scoped service assertion for every billable Router call. Router verifies it and introspects Core, reserves no user quota itself, resolves immutable fresh zero-price catalog snapshots, filters candidates through Upstash state, attempts at most three providers before stream commit, and records provider attempts/outbox events transactionally. The target has five Vercel functions: three public and two private internal.

**Tech Stack:** Node 22, TypeScript 5, Vercel Functions, Neon Postgres, Upstash Redis, `@upstash/redis`, `undici`, platform security/contracts, Node test runner, Vercel fake preview.

## Global Constraints

- Work in `D:\Orin_ECOSYS\orin-router-service` on `release/platform-v1.0.0-router` from the recorded baseline `9907eaac9a2f2a7df400b04a3240d849d5326a05`.
- Set local Git author to `Januth Nimnal <nimnaljanuth@gmail.com>`.
- First commit must pin the immutable `platform-v1.0.0` submodule; if absent, stop rather than copying constants.
- Public request model values are exactly `orin-cheap`, `orin-balanced`, `orin-thinking`, and `orin-coding`.
- No user gateway keys, wildcard routes, raw provider model IDs, BYOK, dashboard, or public model selection in this slice.
- Every billable request carries a Core `usage_reservation_id`; Router never increments or refunds canonical user usage.
- No in-memory production rate, health, circuit, cooldown, quarantine, or usage fallback.
- Tests use injected fake Core, DNS, HTTP, clock, Redis, database, and provider adapters; no live call.
- Target Vercel function count is exactly five.

---

## File map

**Create**

- `.gitmodules`, `vendor/orin-platform`, `orin-platform.consumer.json`
- `src/contracts.ts`, `src/service-auth.ts`, `src/runtime.ts`, `src/catalog.ts`, `src/provider-registry.ts`, `src/crypto.ts`, `src/aliases.ts`
- `src/redis-state.ts`, `src/attempts.ts`, `src/events.ts`, `src/sse.ts`, `src/stream-session.ts`
- `migrations/001_canonical_router.sql`, `migrations/002_router_indexes_rls.sql`, `migrations/003_seed_aliases.sql`, `migrations/004_legacy_quarantine.sql`
- `api/v1/images/generations.ts`, `api/internal/catalog/refresh.ts`, `api/internal/attempts/[requestId].ts`
- `test/contract.test.mjs`, `test/auth.test.mjs`, `test/config.test.mjs`, `test/validation.test.mjs`, `test/catalog.test.mjs`, `test/url-guard.test.mjs`, `test/state.test.mjs`, `test/attempts-outbox.test.mjs`, `test/routing.test.mjs`, `test/providers.test.mjs`, `test/sse.test.mjs`, `test/http-routes.test.mjs`, `test/v1-contract.test.mjs`, `test/vercel-config.test.mjs`, `test/function-budget.test.mjs`, `test/sql-static.test.mjs`

**Modify**

- `package.json`, `package-lock.json`, `.env.example`, `README.md`, `docs/api.html`, `docs/introduction.html`, `vercel.json`
- `src/config.ts`, `src/errors.ts`, `src/types.ts`, `src/store.ts`, `src/validate.ts`, `src/router.ts`, `src/providers.ts`, `src/service.ts`
- `api/v1/chat/completions.ts`, `api/v1/models.ts`
- `index.html` (script-free API landing page only)

**Delete after compatibility gate**

- `api/providers.ts`, `api/keys.ts`, `api/logs.ts`, `api/stats.ts`, `api/_ctx.ts`
- `src/auth.ts`, `src/keys.ts`, `src/ratelimit.ts`, `schema.sql`
- `ui/orin.js`, `ui/router.css`, `ui/components.css`, `ui/tokens.css`
- `docs/authentication.html`, `docs/providers.html`, `docs/routing.html`
- old wildcard/user-key tests replaced by the new contract/state suites

## Task 1: Pin platform contracts and enforce repository gates

**Interfaces:** `src/contracts.ts` re-exports platform aliases, errors, service claims, events, and request/response models without duplicated constants.

- [ ] **Step 1: Add the platform release as a pinned submodule**

```bash
git submodule add https://github.com/januththedev/orin-platform.git vendor/orin-platform
git -C vendor/orin-platform checkout platform-v1.0.0
```

Expected: `git submodule status` prints the tagged SHA with no `+` or `-` prefix.

- [ ] **Step 2: Write the failing contract test**

`test/contract.test.mjs` must import `src/contracts.ts`, validate every `fixtures/v1/valid` file, reject every invalid file, assert the alias set/order, and prove no MCP/gateway-key/run export exists.

- [ ] **Step 3: Run red**

```bash
npm run test:contract
```

Expected: missing contracts facade/fixtures.

- [ ] **Step 4: Create the facade and scripts**

`src/contracts.ts` must only re-export from `../vendor/orin-platform/packages/contracts/dist/index.js` and generated Router types. Add `test:contract`, `test:security`, `test:sql`, `test:preview`, and `check` scripts.

- [ ] **Step 5: Verify green and commit**

```bash
npm run test:contract
git add .gitmodules vendor/orin-platform orin-platform.consumer.json src/contracts.ts test package.json package-lock.json
git commit -m "test: pin canonical platform contract"
```

## Task 2: Replace legacy auth/config/validation with the service contract

**Interfaces:** produces `ServicePrincipal`, `ServiceAuthenticator`, `CoreIntrospector`, strict `loadConfig`, and request validators.

- [ ] **Step 1: Write failing auth/config/validation tests**

Cover missing/wrong issuer/audience/type/scope, wrong algorithm, `alg:none`, unknown key ID, expired token, token-version mismatch, missing usage reservation, introspection outage, old session/MCP/user-gateway token rejection, unknown body fields, prototype keys, compressed body, raw model ID, wildcard, message/count/content caps, and invalid image fields.

- [ ] **Step 2: Run red**

```bash
npm test -- auth config validation
```

Expected: failures against legacy auth/user-key behavior.

- [ ] **Step 3: Implement service authentication**

Required assertion:

```ts
export interface ServicePrincipal {
  readonly accountId: string;
  readonly scopes: readonly string[];
  readonly subject: string;
  readonly tokenId: string;
  readonly expiresAt: Date;
  readonly usageReservationId: string;
}
```

Strict claims:

```text
iss=orin-core, aud=orin-router, typ=service, scope=router:invoke,
jti, iat, exp, token_version, auth_method, account_id, usage_reservation_id
```

Local signature verification uses `ORIN_ROUTER_SERVICE_SIGNING_KEY` and key ID. Every billable request calls the injected Core introspection endpoint; unavailable/revoked returns 503 before provider access. GET may cache local verification for at most 60 seconds but still requires service auth.

- [ ] **Step 4: Implement strict config and validation**

Production requires:

```text
DATABASE_URL
ORIN_ROUTER_SERVICE_SIGNING_KEY
ORIN_ROUTER_SERVICE_KEY_ID
ORIN_CORE_INTROSPECTION_URL
ORIN_CORE_CLIENT_ID
ORIN_CORE_CLIENT_SECRET
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
ORIN_ROUTER_REDIS_HASH_KEY
ORIN_PROVIDER_KEK_CURRENT
ORIN_PROVIDER_KEK_PREVIOUS
ORIN_PROVIDER_MODE
CRON_SECRET
```

`ORIN_PROVIDER_KEK_PREVIOUS` is optional during normal operation and is required only when the previous version must remain readable during a rotation window. Missing current key material or an unknown required version fails startup.

Remove `TOKEN_ENCRYPTION_KEY`, `ROUTER_MASTER_KEY`, and `ROUTER_COOLDOWN_MS` from production requirements.

- [ ] **Step 5: Verify green and commit**

```bash
npm test -- auth config validation
git add src/service-auth.ts src/config.ts src/errors.ts src/validation.ts src/http.ts .env.example test package.json
git commit -m "feat: replace legacy auth with strict Core service contract"
```

## Task 3: Add catalog snapshots, four aliases, provider registry, and encrypted keys

**Interfaces:** `CatalogStore`, `ProviderRegistry`, `isCatalogEntryEligible`, `encryptProviderSecret`, and `ChatExecutor` candidate input.

- [ ] **Step 1: Write failing catalog/registry/crypto tests**

Cover explicit numeric zero prices, unknown/missing/stale/paid price, required capabilities, six-hour expiry, latest failed refresh poisoning, immutable source hash, fake/live registry only, DNS/rebinding/redirect/private-target rejection, current/previous KEK reads, current-only writes, and no plaintext/DEK in stored record.

- [ ] **Step 2: Run red**

```bash
npm test -- catalog url-guard crypto
```

Expected: missing catalog/registry/crypto modules.

- [ ] **Step 3: Add SQL migrations**

`001_canonical_router.sql` creates:

- `orin_router.provider_pools`
- `provider_catalog_snapshots`
- `catalog_models`
- `catalog_refresh_runs`
- `router_aliases`
- `router_chain_candidates`
- `provider_attempts`
- `provider_key_incidents`
- `service_credential_metadata`
- `orin_platform.outbox`

`002_router_indexes_rls.sql` adds FKs, checks, indexes, forced RLS, and least-privilege grants. `003_seed_aliases.sql` inserts only the four aliases. `004_legacy_quarantine.sql` renames/revokes legacy provider/key/log tables without dropping them.

- [ ] **Step 4: Implement catalog policy**

```ts
export function isCatalogEntryEligible(
  model: CatalogModelV1,
  capability: "text" | "image_generation",
  now: Date,
): boolean {
  const ageMs = now.getTime() - Date.parse(model.fetched_at);
  const price = capability === "text"
    ? model.prices.prompt === 0 && model.prices.completion === 0
    : model.prices.image === 0;
  return ageMs >= 0
    && ageMs <= 6 * 60 * 60 * 1000
    && model.source_status === "success"
    && model.capabilities.includes(capability)
    && price;
}
```

- [ ] **Step 5: Implement provider registry and encryption**

Registry contains only `openrouter` in live and `fake` in preview. No request field can select host, path, base URL, or adapter. Provider credentials use random DEK, AES-256-GCM, AAD, current/previous KEK read, and current-only write.

- [ ] **Step 6: Verify green and commit**

```bash
npm test -- catalog url-guard crypto sql-static
git add src/catalog.ts src/provider-registry.ts src/crypto.ts src/aliases.ts src/types.ts src/store.ts src/validate.ts migrations test
git commit -m "feat: add immutable free catalog and provider registry"
```

## Task 4: Add durable Upstash state and transactional attempt/outbox facts

**Interfaces:** `DistributedState`, `beginProviderAttempt`, `finishProviderAttempt`, `enqueueOutbox`.

- [ ] **Step 1: Write failing state/outbox tests**

Cover global/account/candidate rate keys, Retry-After, 5-minute failure window, 60-second cooldown doubling to 15 minutes, three-failure open circuit, one half-open lease, 401/403 quarantine, 24-hour alert expiry without auto-enable, operator release after live test, Upstash outage 503, transaction rollback, idempotency, and no prompt/completion/provider key in payload.

- [ ] **Step 2: Run red**

```bash
npm test -- state attempts-outbox
```

Expected: missing Redis/outbox modules.

- [ ] **Step 3: Implement atomic distributed state**

Use Upstash EVAL/atomic scripts. Production has no Map fallback. The test fake is injected and is not imported by production runtime.

- [ ] **Step 4: Implement transactional attempt/outbox writes**

`beginProviderAttempt` inserts started attempt and full shared event envelope in one SQL transaction. `finishProviderAttempt` updates attempt facts and inserts the final event in one transaction. Finalization failure after provider work returns `ORIN_USAGE_STATE_UNAVAILABLE` and leaves the started row for Core reconciliation.

- [ ] **Step 5: Verify green and commit**

```bash
npm test -- state attempts-outbox
git add src/redis-state.ts src/attempts.ts src/events.ts src/store.ts test
git commit -m "feat: add durable routing state and attempt outbox"
```

## Task 5: Enforce bounded pre-commit routing and correct SSE state

**Interfaces:** `ChatExecutor.execute`, `ImageExecutor.execute`, `SseParser`, `StreamSession`.

- [ ] **Step 1: Write failing routing/provider/SSE tests**

Assert maximum three attempts, 20-second attempt and 45-second operation deadlines, retry rules, 401/403 quarantine, no retry for 400/404, precommit failover, no postcommit failover, CRLF/multiline/final buffer, malformed JSON, cancellation, provider `[DONE]`, one typed terminal, one `[DONE]`, and no A+B output mixing.

- [ ] **Step 2: Run red**

```bash
npm test -- routing providers sse
```

Expected: failures against request-local/unbounded routing.

- [ ] **Step 3: Implement bounded routing**

Filter candidates by fresh catalog eligibility, enabled pool, Redis state, and quotas. Start no more than three actual provider attempts. Commit to one provider immediately before the first public semantic event.

- [ ] **Step 4: Implement `SseParser` and `StreamSession`**

```ts
export class StreamSession {
  private state: "precommit" | "streaming" | "done" = "precommit";
  async emit(event: SemanticEvent): Promise<void> {
    if (this.state === "done") throw new Error("stream already terminal");
    if (this.state === "precommit") await this.commit();
    this.state = "streaming";
    await this.writer.event(event);
  }
  async finishError(error: ErrorEnvelopeV1): Promise<void> {
    if (this.state === "done") return;
    if (this.state === "precommit") await this.commit();
    await this.writer.event(error);
    await this.writer.done();
    this.state = "done";
  }
}
```

- [ ] **Step 5: Verify green and commit**

```bash
npm test -- routing providers sse
git add src/router.ts src/providers.ts src/service.ts src/sse.ts src/stream-session.ts test
git commit -m "feat: enforce bounded precommit routing and SSE"
```

## Task 6: Expose only canonical `/v1` and private internal routes

**Interfaces:** exact five-function Vercel deployment and Core reconciliation API.

- [ ] **Step 1: Write failing route/config/function-budget tests**

Assert three public routes, two internal routes, authentication/validation before `writeHead`, no direct `/api/v1` public access, exactly five Vercel function entries, canonical aliases only, and no dashboard/admin routes.

- [ ] **Step 2: Run red**

```bash
npm test -- http-routes v1-contract vercel-config function-budget
```

Expected: legacy six-function topology.

- [ ] **Step 3: Implement public handlers**

- `GET /v1/models` returns exactly four aliases and availability only.
- `POST /v1/chat/completions` accepts only text role messages and exact alias.
- `POST /v1/images/generations` accepts exact alias, bounded prompt, `n=1`, allowlisted size, and `response_format=b64_json` only as an internal transport field; public response never exposes base64.

Authentication, validation, usage-state, catalog, and rate checks occur before provider access or headers.

- [ ] **Step 4: Implement internal handlers**

- `/api/internal/catalog/refresh` requires `CRON_SECRET` and refreshes official metadata.
- `/api/internal/attempts/:requestId` requires service auth and returns only privacy-safe provider-attempt facts for Core's 10-minute reconciler.

- [ ] **Step 5: Set Vercel topology**

`vercel.json` declares only:

```json
{
  "functions": {
    "api/v1/chat/completions.ts": { "maxDuration": 60 },
    "api/v1/images/generations.ts": { "maxDuration": 60 },
    "api/v1/models.ts": { "maxDuration": 10 },
    "api/internal/catalog/refresh.ts": { "maxDuration": 30 },
    "api/internal/attempts/[requestId].ts": { "maxDuration": 10 }
  },
  "rewrites": [
    { "source": "/v1/chat/completions", "destination": "/api/v1/chat/completions" },
    { "source": "/v1/images/generations", "destination": "/api/v1/images/generations" },
    { "source": "/v1/models", "destination": "/api/v1/models" }
  ],
  "crons": [{ "path": "/api/internal/catalog/refresh", "schedule": "0 */2 * * *" }]
}
```

- [ ] **Step 6: Verify green and commit**

```bash
npm test -- http-routes v1-contract vercel-config function-budget
git add api src/runtime.ts vercel.json test
git commit -m "feat: expose canonical Router v1 and private control routes"
```

## Task 7: Remove deferred dashboard code and document the inference service

- [ ] **Step 1: Add failing documentation/static tests**

Forbid `localStorage`, user key minting, wildcard/model explorer, provider CRUD, raw model IDs, and stale dashboard route names in deployable files. Require service assertion/four-alias/no-direct-provider documentation.

- [ ] **Step 2: Run red**

```bash
npm test -- docs
```

Expected: legacy dashboard content.

- [ ] **Step 3: Delete/replace deferred files**

Keep `index.html` only as a script-free API landing page. Delete old UI scripts/styles and dashboard docs. Rewrite README/API docs for service auth, four aliases, internal reconciliation, and deferred product phases.

- [ ] **Step 4: Verify full gate**

```bash
npm run typecheck
npm test
npm run test:security
npm run test:sql
ORIN_PROVIDER_MODE=fake npm run test:preview
npx vercel build
git diff --check
```

Expected: all tests pass, build reports exactly five functions, and no live provider/DB/Redis call occurs.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove deferred dashboard and stale claims"
```

## Task 8: Push and open the Router PR

- [ ] **Step 1: Set identity and push**

```bash
git config user.name "Januth Nimnal"
git config user.email "nimnaljanuth@gmail.com"
git push -u origin release/platform-v1.0.0-router
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --base main --head release/platform-v1.0.0-router --title "feat: deliver canonical Orin Router inference" --body-file docs/releases/router-v1.1.0-pr.md
```

PR body records platform tag/SHA, migrations, fake-preview evidence, security tests, deferred surfaces, and rollback.

- [ ] **Step 3: Verify and merge through required checks**

Do not merge until platform, contract, security, SQL, preview, and Vercel checks are green. Deploy with `router_v2` disabled.

## Requirement-to-task coverage

- Platform pin and no duplicated contracts: Task 1.
- Core service auth/introspection: Task 2.
- Four aliases and fresh zero-price catalog: Task 3.
- Durable state and attempt/outbox reconciliation: Task 4.
- Max-three precommit routing and SSE correctness: Task 5.
- `/v1`, image, private refresh/reconciliation, five functions: Task 6.
- Deferred dashboard/user keys/BYOK/wildcards removed: Task 7.
- Push, PR, preview, merge evidence: Task 8.
