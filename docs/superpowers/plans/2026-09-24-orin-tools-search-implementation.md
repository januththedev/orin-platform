# Orin Tools Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver hardened keyless web search while preserving anonymous `GET /api/search` compatibility, adding private no-store `POST /api/search` for Chat, and disabling public code execution.

**Architecture:** A Vercel adapter constructs one injected search handler. Public GET is anonymous and explicitly non-sensitive because the query is in the URL. Private POST keeps the query in a no-store body and requires a short-lived Core service assertion. Exact provider origins/path prefixes, trusted proxy metadata, Upstash quotas, DNS/redirect safety, eight-second orchestration, normalized untrusted citations, and redacted telemetry are mandatory.

**Tech Stack:** Node 22, TypeScript 5, Vercel Functions, Upstash Redis, platform contracts/security/observability, Vitest, deterministic fake upstreams, Vercel fake preview.

## Global Constraints

- Work in `D:\Orin_ECOSYS\orin-tools` on `release/platform-v1.0.0-tools` from baseline `991fa5b65143efa2a813f9e959d49f7b47e5990f`.
- Set local Git author to `Januth Nimnal <nimnaljanuth@gmail.com>`.
- First implementation commit pins immutable `platform-v1.0.0`; if absent, stop rather than duplicate contracts/security helpers.
- GET remains public and non-sensitive; Chat must use POST only.
- No request field can select a provider host, base URL, path, scheme, port, redirect, or arbitrary fetch target.
- No Map/fail-open quota, cache, or health fallback in production.
- `/api/run` returns 410 `ORIN_RUN_DISABLED` and performs no Compiler Explorer/Godbolt call.
- PR tests use fixtures/fakes and make zero live provider, Redis, or Vercel production calls.

---

## File map

**Create**

- `.gitmodules`, `vendor/orin-platform`, `orin-platform.consumer.json`
- `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`, `.env.example`
- `src/platform-boundary.ts`
- `src/search/{types,errors,config,request,metadata,assertion,quota,registry,url-guard,fetch,weather,providers,normalize,orchestrator,http,telemetry,handler,production}.ts`
- `test/helpers/{fakes,sign,http}.ts`
- `test/fixtures/**`
- `test/unit/{request,assertion,quota,registry,weather,normalize,telemetry}.test.ts`
- `test/security/{url-guard,prompt-injection,secret-scan}.test.ts`
- `test/integration/search-handler.test.ts`
- `test/contract/{run-disabled,vercel-config,documentation}.test.ts`

**Modify**

- `api/search.ts` (thin production adapter), `api/run.ts` (deny stub), `vercel.json`
- `README.md`, `index.html`, `docs/search-api.html`, `docs/introduction.html`, `opensearch.xml`, `sitemap.xml`, `docs/code-execution.html`

**Delete**

- `sandbox-quickstart/test-search.ts` because it prints raw live queries
- active run examples/claims and any old process-local search implementation

## Task 1: Pin platform contracts and establish the TypeScript test harness

- [ ] **Step 1: Add and check out the platform submodule**

```bash
git submodule add https://github.com/januththedev/orin-platform.git vendor/orin-platform
git -C vendor/orin-platform checkout platform-v1.0.0
```

Expected: exact tagged SHA, no drift prefix.

- [ ] **Step 2: Write failing harness/contract tests**

Tests must import platform search/error/event contracts, validate platform fixtures, assert no run client export, and fail against the current no-manifest repository.

- [ ] **Step 3: Run red**

```bash
npm run test:contract
```

Expected: missing package/test setup.

- [ ] **Step 4: Create package configuration**

Use npm, matching the rest of the first slice. `package.json` scripts:

```json
{
  "name": "orin-tools",
  "private": true,
  "version": "2.0.0",
  "type": "module",
  "engines": { "node": ">=22.18.0" },
  "scripts": {
    "dev": "vercel dev",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:unit": "vitest run test/unit",
    "test:security": "vitest run test/security",
    "test:contract": "vitest run test/contract",
    "test:integration": "vitest run test/integration",
    "check": "npm run typecheck && npm run test"
  },
  "dependencies": {
    "@upstash/redis": "1.35.6",
    "@vercel/blob": "2.3.2"
  },
  "devDependencies": {
    "@types/node": "22.19.15",
    "typescript": "5.9.3",
    "vitest": "3.2.4",
    "vercel": "48.10.0"
  }
}
```

The test config forbids live network and supplies deterministic fake defaults.

- [ ] **Step 5: Install with approval, verify green, and commit**

```bash
npm install
npm run typecheck
npm run test:contract
git add .gitmodules vendor/orin-platform package.json package-lock.json tsconfig.json vitest.config.ts orin-platform.consumer.json test/contract
git commit -m "test: pin platform contracts and add search harness"
```

## Task 2: Define config, request, error, and HTTP boundaries

**Interfaces:** `loadSearchConfig`, `parseSearchRequest`, `SearchHttpError`, header/CORS/cookie rendering.

- [ ] **Step 1: Write failing tests**

Cover GET/POST methods, content type, identity/gzip, 4096-byte boundary, gzip bomb, query 512/513 code points, `n=1/10` and invalid values, locale `en|si|ta`, safe-search values, unknown fields, POST query-string rejection, no-store/no-referrer headers, exact CORS, and error redaction.

- [ ] **Step 2: Run red**

```bash
npm run test:unit -- request
```

Expected: missing modules.

- [ ] **Step 3: Implement exact fixed limits**

```ts
export const SEARCH_LIMITS = {
  queryCodePoints: 512,
  requestBytes: 4096,
  responseBytes: 1024 * 1024,
  upstreamBodyBytes: 2 * 1024 * 1024,
  totalDeadlineMs: 8000,
  maxProviderAttempts: 3,
  maxResults: 10,
} as const;
```

- [ ] **Step 4: Implement environment parsing**

Cloud requires profile/provider mode, Upstash URL/token, quota/log/cookie/assertion keys, allowed origins, and positive global RPS/daily values no higher than 50/100000. Preview requires fake mode. `SEARXNG_URL` is local-profile only and must match the exact local registry.

- [ ] **Step 5: Implement errors and headers**

All errors use the platform envelope. Responses set:

```text
Content-Type: application/json
Cache-Control: no-store
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'none'; frame-ancestors 'none'
X-Request-Id
X-Trace-Id
```

- [ ] **Step 6: Verify green and commit**

```bash
npm run test:unit -- request
git add src/search/types.ts src/search/errors.ts src/search/config.ts src/search/request.ts src/search/http.ts
git commit -m "feat(search): add strict config request and HTTP boundary"
```

## Task 3: Add service assertions, trusted metadata, and durable quotas

**Interfaces:** `verifyServiceAssertion`, `TrustedAddressAdapter`, `QuotaStore`, atomic global/address/cookie/account limits.

- [ ] **Step 1: Write failing tests**

Cover assertion missing/malformed/bad signature/wrong issuer/audience/scope/expiry/skew, 30/500 address, 60/1000 cookie, 60/1000 account, global ceilings, UTC key rotation, invalid/duplicate cookie, Upstash outage 503, and zero provider fetch on every rejection.

- [ ] **Step 2: Run red**

```bash
npm run test:unit -- assertion quota
```

Expected: missing modules.

- [ ] **Step 3: Implement assertion format**

`X-Orin-Service-Assertion` is compact HMAC-SHA-256 with:

```text
iss=orin-core
aud=orin-tools-search
sub=<internal account/service subject>
scope=tools:search
iat, exp, jti
```

TTL is at most 300 seconds, clock skew at most 30 seconds, and failures return the same generic 401. GET ignores an assertion and remains public.

- [ ] **Step 4: Implement trusted address and signed cookie**

Use only deployment-adapter trusted proxy metadata; ignore direct client-supplied forwarding headers. Cookie is random opaque 256-bit value, signed, host-only, HttpOnly, Secure in cloud, SameSite=Lax, path `/api/search`, maximum age 30 days.

- [ ] **Step 5: Implement atomic Upstash quotas**

Use one atomic script to increment minute/day buckets and set expiry. Any Redis error returns 503 before provider access. No raw address, cookie, or subject is stored or logged; keys use daily keyed hashes.

- [ ] **Step 6: Verify green and commit**

```bash
npm run test:unit -- assertion quota
git add src/search/metadata.ts src/search/assertion.ts src/search/quota.ts
git commit -m "feat(search): add service assertions and durable quotas"
```

## Task 4: Add provider registry, DNS/redirect safety, and bounded fetch

**Interfaces:** `ProviderRegistry`, `assertRegistryUrl`, `normalizeResultLink`, `safeProviderFetch`.

- [ ] **Step 1: Write failing security tests**

Cover exact origin/path boundary, `/searchx` rejection, private/reserved/alternate IP forms, mixed DNS, private redirect, redirect limit, cross-origin auth stripping, content type, Content-Length, streamed body limit, and slow response.

- [ ] **Step 2: Run red**

```bash
npm run test:security -- url-guard
```

Expected: missing registry/guard/fetch.

- [ ] **Step 3: Implement frozen registry**

Cloud entries are deployment-owned exact origins/path prefixes for selected SearXNG, Google News RSS, Wikipedia, DuckDuckGo HTML, Open-Meteo geocoding, and Open-Meteo forecast. Preview uses `fake` adapters. Local adds only the exact configured SearXNG origin/path.

- [ ] **Step 4: Implement safe fetch**

Use platform URL guard/pinning, manual redirects, 3-second per-attempt timeout, 2 MiB body cap, accepted content types, and the overall operation deadline. Retry only connection/408/429/5xx within remaining budget.

- [ ] **Step 5: Verify green and commit**

```bash
npm run test:security -- url-guard
git add src/search/registry.ts src/search/url-guard.ts src/search/fetch.ts src/platform-boundary.ts
git commit -m "feat(search): add registry-only redirect-safe fetching"
```

## Task 5: Implement weather-first orchestration, normalization, and prompt boundary

**Interfaces:** `extractWeatherIntent`, fixed provider adapters, `normalizeCitations`, `executeSearchPlan`.

- [ ] **Step 1: Write failing tests**

Cover English/Sinhala/Tamil weather terms, `weather in Kandy tomorrow`, missing location, no hard-coded Colombo, weather failure never falls back to news, general/news/definition fallback plans, at most three upstream bodies, HTML/control stripping, publication time UTC, deduplication, unsafe links, 1 MiB response cap, and prompt-injection content remaining untrusted.

- [ ] **Step 2: Run red**

```bash
npm run test:unit -- weather normalize
npm run test:security -- prompt-injection
```

Expected: missing modules.

- [ ] **Step 3: Implement fixed adapters**

`providers.ts` owns SearXNG/Google News/Wikipedia/DuckDuckGo/Open-Meteo response parsers. It performs no URL selection and no arbitrary link fetch.

- [ ] **Step 4: Implement weather and general plans**

Weather is geocode then forecast only. General search uses one primary and at most two fallbacks. All-provider failure returns `ORIN_SEARCH_UNAVAILABLE` with “current information could not be verified.”

- [ ] **Step 5: Implement normalized citations**

Every citation contains `id`, `title`, `source`, `provider`, `url`, `snippet`, `published_at|null`, `retrieved_at`, `kind`, and `trust: "untrusted"`. `results` is a compatibility alias of `citations`.

- [ ] **Step 6: Verify green and commit**

```bash
npm run test:unit -- weather normalize
npm run test:security -- prompt-injection
git add src/search/weather.ts src/search/providers.ts src/search/normalize.ts src/search/orchestrator.ts
git commit -m "feat(search): add weather-first citations and untrusted evidence"
```

## Task 6: Assemble handler, telemetry, and production bindings

**Interfaces:** `createSearchHandler` and thin `api/search.ts` adapter.

- [ ] **Step 1: Write failing integration tests**

Assert order: method/request → trusted address → global/address/cookie quota → POST assertion → account quota → cookie → provider plan → normalize/render. Cover 401/429/503/504, weather, fallback, body overflow, no cache, and no query in POST URL/log/response.

- [ ] **Step 2: Run red**

```bash
npm run test:integration
```

Expected: missing handler.

- [ ] **Step 3: Implement handler and telemetry**

Telemetry includes only event envelope, keyed query hash/length, provider IDs/outcomes, result count, quota scope, duration, and stable error code. It never logs query, title, snippet, URL, raw address, cookie, assertion, Redis error, environment value, or provider body.

- [ ] **Step 4: Bind production adapters**

`production.ts` validates environment and constructs Upstash/platform guard/platform event adapters. Missing production dependencies throw at startup; no fallback Map exists.

- [ ] **Step 5: Replace route and run stub**

`api/search.ts` becomes a thin adapter. `api/run.ts` returns 410 for every method:

```ts
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(410).json({
    error: {
      code: "ORIN_RUN_DISABLED",
      message: "Public code execution is disabled.",
      retryable: false,
      request_id: getRequestId(req),
    },
  });
}
```

- [ ] **Step 6: Verify green and commit**

```bash
npm run test:integration
npm run typecheck
git add src/search/handler.ts src/search/production.ts src/search/telemetry.ts api/search.ts api/run.ts
git commit -m "feat(search): assemble hardened public and private handler"
```

## Task 7: Configure Vercel and truthful documentation

- [ ] **Step 1: Write failing Vercel/docs contract tests**

Require search max duration 10 seconds, no active run function, public GET warning, private POST/no-store guidance, no run/unlimited/compiler claims, and disabled execution page.

- [ ] **Step 2: Run red**

```bash
npm run test:contract -- vercel-config documentation run-disabled
```

Expected: current run/duration/copy failures.

- [ ] **Step 3: Update config and docs**

`vercel.json` keeps only `api/search.ts` at 10 seconds. Update README/search docs/index/OpenSearch/sitemap. Rewrite code-execution page as disabled. Delete the raw-query smoke test.

- [ ] **Step 4: Run full gate**

```bash
npm run typecheck
npm run test:unit
npm run test:security
npm run test:integration
npm run test:contract
npm run check
ORIN_PROVIDER_MODE=fake npx vercel build
```

Expected: all pass, build contains search only, live provider call count is zero.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs(search): publish bounded public and private search"
```

## Task 8: Push and open the Tools PR

- [ ] **Step 1: Push**

```bash
git config user.name "Januth Nimnal"
git config user.email "nimnaljanuth@gmail.com"
git push -u origin release/platform-v1.0.0-tools
```

- [ ] **Step 2: Open PR with evidence**

PR records platform SHA, run-disabled evidence, GET/POST privacy behavior, quota/security tests, fake preview, and rollback flag.

- [ ] **Step 3: Merge only after required checks**

Deploy with `search_v2` disabled.

## Requirement-to-task coverage

- Public GET and private POST privacy: Tasks 2, 6, 7.
- Durable quotas and fail-closed state: Task 3.
- Fixed provider registry and SSRF/redirect defense: Task 4.
- Weather-first multilingual search: Task 5.
- Untrusted citations/prompt boundary: Task 5.
- Privacy-safe telemetry: Task 6.
- Public execution disabled: Tasks 6–7.
- Push/preview/merge: Task 8.
