# Orin Platform and Chat Vertical Slice Design

**Date:** 2026-09-24  
**Status:** Approved in design review; awaiting written-spec approval  
**Scope:** Shared platform foundation, Orin Core/Chat, the Router inference dependency required by Chat, and the Tools search dependency required by Chat

## 1. Executive decision

Orin will become a federated ecosystem with one versioned platform contract rather than fourteen repositories that independently invent authentication, model names, errors, logs, and storage.

The agreed decisions are:

- **Repository model:** one new `orin-platform` repository is the source of truth; product repositories remain independently deployable and consume pinned platform artifacts.
- **Identity:** Neon Auth is the only human identity authority. Orin Core owns account projection, quotas, authorization, session exchange, and product credentials.
- **Deployment:** Vercel hosts stateless web products and APIs. Persistent local or dedicated runtimes own the Agent gateway and interactive terminal stream.
- **Data:** a shared control plane exposes identity, model definitions, usage, audit events, shared notes, UI tokens, and correlation IDs. Product content remains private unless explicitly shared.
- **Cloud Router:** `orin-router-service` is the canonical public, multi-tenant Router. `Orin-Router` is not a second cloud backend; it remains a separately labeled legacy/self-hosted edition unless a later decision retires it.
- **First vertical slice:** finish Orin Chat end to end using hardened Router inference and Tools search dependencies. Full Router administration, MCP, public code execution, Console, Agent, Code, Automations, and hub rollout are later gated subprojects.

The immediate goal is not to make every marketing claim true at once. The immediate goal is to establish the contracts and one complete user journey that every later product can reuse without repeating the current incompatibilities.

## 2. Audit findings that drive the design

The fourteen repositories were inspected locally without installing dependencies or running repository code. The main findings are structural, not isolated bugs:

- `Orin-AI` is the real Orin Chat application, but Google sign-in was removed, freshness search is disabled by default, the four model chains are not selected by intent, and several routes are stale or broken.
- `orin-code-site` is a static Orin Code marketing site, not an application.
- `orin-ecosystem` is a mostly static product hub with inconsistent product manifests.
- `orin-router-service` and `Orin-Router` are independent routers with incompatible key formats, authentication, storage, routing engines, and deployment models.
- `orin-router-service` does not expose its documented public `/v1` path, commits SSE headers before authentication, can combine partial output from two providers, and uses request-local rate-limit/health state.
- `Orin-Router` contains a critical authentication bypass in its delegated-password path and defaults to unauthenticated public API access when `REQUIRE_API_KEY` is false.
- `orin-console` drives a real tmux process inside a sandbox, but it polls screen snapshots rather than streaming a browser PTY. Its authentication expects token and database formats that the current Core does not issue.
- `orin-tools` has real search and execution routes. Search is usable with hardening. `/api/run` delegates execution to Compiler Explorer and lacks durable public-abuse controls.
- `orin-mcp` has a credible MCP implementation, but its usage call targets a nonexistent Core route, its scopes are not enforced at the source API, its stdio logging can corrupt the protocol, and its documented `npx` binary is not built.
- `orin-agent` is a large rebranded Hermes runtime. `orin-agent-web` expects incompatible event, session, approval, output, and artifact contracts, so the browser-to-local flow is not operational.
- `orin-automations` is a five-file static scaffold. It contains no pipeline compiler, approval model, executor, scheduler, notes engine, or Orin Code integration.
- `Orin-Code` contains two different desktop products. Its CLI and VS Code extension are separate prototypes with incomplete token refresh and no shared SDK or protocol.
- Browser and local clients store long-lived credentials in `localStorage` or plaintext files. Several outbound URLs lack the required public-host validation. Actual secret-shaped literals exist in source and must be removed and rotated.

These findings make a patch-in-place approach unsafe. A stable platform contract and containment step must precede feature expansion.

## 3. Scope

### 3.1 Included in this specification

This specification covers the first complete vertical slice. Its mandatory consumers are exactly `orin-platform`, `Orin-AI` (Core/Chat), `orin-router-service`, and `orin-tools`. Every other repository is contract-only during this slice: it may pin and inspect schemas, but it does not integrate, deploy, or claim compatibility until its gated phase.

The first slice contains:

1. `orin-platform` contracts, generated TypeScript/Python/Rust clients, configuration validation, event/error schemas, security policy, and Orin UI tokens/components. The notes parser is reserved for its later subproject and is not part of this acceptance gate.
2. Neon-backed Orin Core identity projection, account migration, session exchange, quotas, device authorization, and token verification. Token claim and scope schemas are defined now; user-facing MCP and Router key-management clients are later integrations.
3. Orin Chat account, conversation, media, language, TTS, image, search, and usage flows.
4. The minimal hardened `orin-router-service` inference surface required by Chat: public `/v1`, four chain aliases, zero-price model selection, ordered failover, streaming semantics, durable health/rate state, and platform-owned provider pools. User-minted `orin_...` gateway-key management is a later Router product phase.
5. The hardened `orin-tools` search route required by Chat. Public `/api/run` remains disabled in this slice.
6. Normalized Chat persistence, private object storage, explicit deletion, shared control-plane events, and privacy-safe telemetry.
7. Cross-repository contract tests for the four mandatory consumers, Vercel preview end-to-end tests, security tests, migrations, feature flags, and release gates.

### 3.2 Explicitly deferred

The following are not implemented in this vertical slice:

- The complete Router provider/key/usage/log/model-explorer/routing-graph/playground dashboard. This specification supplies only the inference dependency and its stable contract.
- MCP client integration and hosted/stdio packaging. Orin Core defines and tests the `mcp` token contract, but `orin-mcp` does not become a mandatory first-slice consumer.
- Public keyless code execution.
- Console's persistent terminal bridge and replayable PTY history.
- Agent Web's run, approval, browser, output, and artifact flow.
- Windows Code workspace canonicalization, CLI refresh, and VS Code extension parity.
- Automation drafting, execution, and Logseq-compatible notes UI.
- Product-hub release coordination and creator/product manifest generation.

These are not discarded. They are separate specifications that consume the contracts created here.

## 4. System architecture

```text
                              orin-platform
                 contracts · client · config · observability
                    security policy · notes · UI components
                                  |
                pinned generated/versioned artifacts
          _________________________|__________________________
         |                         |                          |
     Vercel services          Product clients          Persistent runtimes
  Core + Chat + Router       CLI · VS Code · Code      Agent local gateway
  MCP · Tools · static hubs  Windows desktop           Console terminal bridge
```

### 4.1 Runtime boundaries

**Vercel services**

- Orin Core authorization, session, account, usage, and shared event APIs.
- Orin Chat frontend and serverless APIs.
- Cloud Router inference and later control-plane APIs.
- MCP HTTP transport.
- Tools search and, only after a separate security design, sandboxed run.
- Static product, documentation, and ecosystem sites.

**Persistent runtimes**

- The Agent gateway runs on the user's machine and owns local tool execution.
- Console owns interactive terminal streaming and Sandbox lifecycle coordination outside short-lived Vercel functions.
- A future self-hosted Router edition may run as a container, but it is not part of the public cloud control plane.

### 4.2 Repository ownership

| Repository | Canonical responsibility |
|---|---|
| `orin-platform` | Schemas, generated clients, auth/URL policy, event/error contracts, shared notes core, and Orin UI source |
| `Orin-AI` | Orin Core and Orin Chat |
| `orin-router-service` | Canonical public multi-tenant cloud Router and `/v1` gateway |
| `Orin-Router` | Separate legacy/self-hosted Router; P0 containment only until separately redesigned |
| `orin-tools` | Shared search; keyless run remains disabled until an Orin-controlled sandbox exists |
| `orin-mcp` | Hosted and local MCP adapters over Core and Router |
| `orin-console` | Vercel control plane plus persistent terminal bridge and replay log |
| `orin-agent` | Local autonomous-agent runtime and its versioned gateway |
| `orin-agent-web` | Static control UI using short-lived pairing credentials |
| `Orin-Code` | One canonical Windows coding workspace; legacy divergent surfaces migrate or are retired |
| `orin-code-cli` | Thin generated client for account, chat, tools, and project operations |
| `orin-code-vscode` | Thin VS Code client using the same generated contract and secret storage |
| `orin-code-site` | Static Orin Code product and documentation site |
| `orin-ecosystem` | Generated product hub, links, machine-readable manifest, and creator page |
| `orin-automations` | Approval-gated pipeline compiler/runtime and Logseq-compatible notes UI |

## 5. `orin-platform` design

The first release distributes shared source through a pinned `orin-platform` Git submodule/tag. This avoids depending on an unverified npm organization or private registry while contracts are stabilizing. Generated TypeScript, Python, and Rust artifacts are committed only when the platform release is intentionally cut.

The repository contains:

- `packages/contracts`: JSON Schema/OpenAPI definitions for identities, tokens, models, events, errors, product capabilities, and shared notes.
- `packages/client`: generated and hand-maintained base clients with authentication, streaming normalization, timeouts, retries, correlation IDs, and typed errors.
- `packages/config`: typed environment schemas, `cloud` and `local` profiles, feature-flag definitions, and secret-presence validation.
- `packages/security`: outbound URL/DNS/redirect guard and shared security-policy helpers.
- `packages/observability`: event construction, redaction, local JSON logging, and telemetry export.
- `packages/notes`: reserved namespace and schema version for the later Logseq-compatible Markdown parse/serialize core. No parser implementation or notes acceptance test is part of the first slice.
- `packages/ui`: canonical Orin UI tokens, primitives, layout helpers, and accessibility defaults. Each product supplies only its accent and product-specific composition.
- `schemas`: database and event schema versions.
- `fixtures`: sanitized cross-language contract fixtures containing no usable credentials.

Contract changes require a schema version, compatibility classification, generated artifact update, and consumer impact check. Breaking changes use a new major contract version and a 90-day migration window.

## 6. Identity and session design

### 6.1 Human identity

Neon Auth owns email/password and Google authentication. Orin Core projects a Neon issuer/subject pair into a stable internal Orin account ID.

Core maintains an `identity_links` table with a unique active `(issuer, subject)` mapping to one Orin account and a unique active mapping for each legacy account. Normalized email is unique only within an auth provider and is not a cross-provider merge key.

A signed-in Neon identity can attach a second provider identity by completing a fresh, state-bound authentication ceremony for that provider in a separate transaction. Core requires both the existing session and the new provider result, verifies PKCE, `state`, `nonce`, issuer, subject, and requested scopes, then atomically maps the new `(issuer, subject)` to the existing Orin account. The new provider result is valid for five minutes and may be consumed only once. This is how email/password and Google identities converge without trusting a matching email address.

Each identity or legacy link has an explicit state: `unlinked`, `pending_verification`, `linked`, `blocked`, or `merged`. A link attempt is processed in this precedence:

1. **Fresh provider proof:** link a second Neon provider identity as described above.
2. **In-app legacy proof:** the signed-in Neon user enters the existing Orin password and Core validates it with the existing password verifier.
3. **One-time migration code:** after successful legacy proof, an administrator or automated migration job may issue a random code. It expires after 15 minutes, is stored only as a hash, is single-use, is bound to the legacy account, Neon issuer/subject, and migration purpose, and has a maximum of five failed attempts.
4. **Administrator batch migration:** an audited import may pre-stage a link but cannot activate it without one of the preceding proofs.

The final link runs in one database transaction that rechecks all affected identity/account states, writes the link and audit event, and invalidates conflicting legacy credentials. If a target Neon identity already maps to a different Orin account, Core does not auto-merge: it marks the operation `blocked`, preserves both accounts, and requires an explicit administrator-assisted merge with dual approval, a recorded reason, and reversible mappings. A successful administrator merge moves product references in one transaction and leaves redirect aliases for both old IDs.

Email/password and Google login converge on one Orin account only after this link state is resolved. Raw email remains profile data, not a foreign key. Rollout proceeds through pre-stage, proof, link, credential disablement, and observation states; any stage can be reversed until legacy credentials are disabled, after which rollback uses the recorded reverse mapping rather than deleting the new link.

Account state changes follow the explicit session matrix in §6.2 and always create a security audit event.

### 6.2 Browser sessions

Products use Authorization Code with PKCE through Orin Core and a backend-for-frontend session. `GET /api/auth/authorize` accepts only a registered client ID, exact HTTPS redirect URI, response type `code`, PKCE `S256` challenge, one-use 256-bit `state`, and provider `nonce`; the authorization transaction expires after ten minutes. `/api/auth/callback` consumes `state` once, rejects replay or redirect mismatch, verifies the issuer/signature/nonce, and creates the BFF session. The callback never receives or exposes a bearer token to browser JavaScript.

Account state has an explicit session matrix:

| Account state | Existing BFF/device sessions | New sessions and billable work |
|---|---|---|
| `active` | Allowed | Allowed |
| `credential_changed` | All revoked after the current response completes | Reauthentication required |
| `security_hold` | All revoked immediately | Denied |
| `merge_pending` | Read-only/export only | Denied until merge completes or is rolled back |
| `deletion_pending` | Read-only/export only for 30 days | Denied |
| `closed` | All revoked | Denied permanently |

`GET /api/account/sessions` lists non-secret session metadata. Revoking the current session requires only the valid BFF session. Revoking all sessions or another session requires `POST /api/auth/step-up`: the user completes a fresh Neon authentication ceremony within five minutes, and Core issues a five-minute, one-use, audience-bound step-up token carrying account, session, `auth_time`, and authentication-method references. The revoke endpoint atomically consumes that token; expired, replayed, wrong-audience, or weaker-than-required authentication returns 401/403 and revokes nothing. Session listing/revocation writes an audit event and takes effect on the next request; there is no undefined token-policy fallback.

- An opaque 256-bit BFF session handle is stored in a host-only, `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
- The database stores only its keyed hash plus account, product, creation time, last-use time, absolute expiry, idle expiry, rotation generation, and state (`active`, `rotating`, `revoked`, or `expired`).
- Absolute lifetime is 30 days from creation. Idle lifetime is seven days. Rotation runs through an idempotent `POST /api/auth/session/rotate` endpoint at most once every 24 hours, coordinated by the BFF with a distributed lock. The transaction stores the new current hash and the prior hash with a 60-second overlap. Concurrent requests and browser tabs may present either hash during that overlap. A hash older than the overlap indicates reuse and revokes the family; ordinary concurrency does not.
- The BFF exchanges the handle for a 15-minute audience-specific access credential held only in server memory. Browser JavaScript never receives the access or session credential.
- A presented revoked, expired, wrong-product, or superseded handle fails closed. The immediately previous handle is accepted only during its 60-second overlap; any older handle revokes the active family and creates a security audit event.
- Logout revokes the server session and clears product state. A 401 clears local product state and returns the user to sign-in.

BFF requests validate the server-side session on every call. Other services may cache signed-token verification for at most 60 seconds. Token minting, credential reveal, account linking, key rotation, and other high-risk operations use uncached Core introspection.

### 6.3 Device and service credentials

Orin Code desktop, CLI, and VS Code use this device protocol:

1. The client calls `POST /api/auth/device/start` with its PKCE verifier challenge, client ID, requested scopes, and product/client version. Core returns a 256-bit device code plus an eight-character Crockford base-32 user code (`XXXX-XXXX`, 40 bits), an eight-minute expiry, and a five-second minimum polling interval.
2. The client opens the returned HTTPS verification URL with only the user code in the URL fragment. The browser signs in with Neon/Orin, shows account, client, and scopes, and requires an explicit approval.
3. An authenticated browser calls `POST /api/auth/device/approve` with the normalized user code, selected account, selected scopes, and approval idempotency key. A code permits five failed approval attempts; the endpoint permits 20 attempts per client and account per hour and 30 per trusted network address per hour, returns the same response for missing/expired/wrong codes, and locks the code after repeated failure.
4. The client calls `POST /api/auth/device/token`. Core validates PKCE `S256`, consumes the one-use code, and returns a 15-minute access token plus a refresh token with a 30-day absolute and 14-day idle lifetime. Token polling is limited to 12 requests per client per minute and 60 per trusted network address per hour. Pending, denied, expired, and rate-limited results use stable error codes.
5. The client stores refresh material only in Windows Credential Manager or VS Code SecretStorage. Every refresh rotates the token. Core keeps the immediately previous hash valid for a 60-second overlap; a token older than that overlap revokes the family. Scope changes, account-state changes, or reaching either expiry require full device reauthorization. Browser `localStorage` and plaintext JSON credential files are not supported.

A device may request only the scopes needed by its product: `chat:use`, `account:read`, `tools:use`, and `code:use`. Core intersects requested and allowed scopes, displays the final set during approval, and rejects later use outside that set.

Every token contains:

```text
iss, sub, aud, typ, jti, iat, exp, scope,
token_version, auth_method
```

Token types are distinct and cannot be substituted:

- `session`: BFF access only.
- `device`: approved desktop/CLI/VS Code access with product scopes.
- `mcp`: exactly `models:read`, `chat:generate`, and `usage:read`.
- `router`: permission to invoke a Router key; management operations use separate management credentials.
- `service`: server-to-server identity, stored only in a deployment secret service.

Core defines the `mcp` token type and its three scopes in this slice and proves that a token of another type cannot claim them. Enforcement in the MCP routes and the MCP client adapter belongs to the later MCP gate; it is not part of first-slice acceptance.

The later user Router-key contract reserves the `orin_` prefix, at least 256 bits of random entropy, hash-only storage, one-time reveal, rotation, and revocation. The first slice uses only a non-user `service` credential for Chat-to-Router calls.

Other services verify signed tokens and consult Core revocation/introspection for high-risk operations. They never query Core's database directly. Revocation or authorization-store failure is fail-closed.

## 7. Data and storage design

### 7.1 Storage boundaries

The first slice uses Neon Postgres with separate least-privilege roles, schemas, and row-level policies:

- Neon Auth-managed identity tables.
- `orin_identity`: account projection, identity/legacy links, sessions, device grants, token registry metadata, and versioned provider consents. A consent record binds account, provider ID, policy version, data categories, purposes/products, client, granted time, expiry, and revocation time.
- `orin_chat`: conversations, messages, attachments, memories, and deletion tombstones.
- `orin_router`: provider pools, catalog snapshots, routing health, provider attempts, and service credentials metadata.
- `orin_platform`: canonical usage ledger, control-plane events, audit records, product manifest, transactional outbox, and migration state.

Database access is explicit:

| Runtime role | Allowed writes | Forbidden access |
|---|---|---|
| Core identity | Identity/session tables, canonical usage, audit, outbox | Raw provider-key material and Router health internals |
| Chat | Owned `orin_chat` rows and a Chat usage outbox | Other accounts, identity credentials, provider keys |
| Router | `orin_router` rows and provider-attempt outbox | Chat content and identity credentials |
| Tools | No private product-data access; optional sanitized search metrics | Chat/account content |
| Reporting | Read-only approved projections | Raw credentials and private message content |

Row-level policies require the internal account ID and product namespace. Cross-product reporting reads approved projections rather than base tables. Administrative access uses a time-limited break-glass role and is audited. It can read operational metadata but not raw secrets or private message/attachment content. Emergency private-content access requires two administrators, a written reason, a maximum 15-minute grant, explicit account/user notification, and its own audit record.

Event records use random request IDs and internal pseudonymous account IDs; email, external provider account IDs, and stable device fingerprints are not event identifiers. `session_id` is a random, non-secret internal correlation surrogate and never contains or reproduces a BFF handle, refresh token, access-token ID, device code, or credential value.

Product data is private by schema and service role. The shared control plane stores metadata, not raw private content.

Binary media uses a storage adapter:

- Vercel Blob is the initial cloud adapter, configured as a private bucket with public access disabled. Local Agent and terminal runtimes use an encrypted local adapter in their later phases.
- Database rows contain owner, object key, detected MIME type, byte size, SHA-256 checksum, creation time, retention class, and deletion state.
- The first slice accepts images up to 10 MiB and generated/cached audio up to 25 MiB. It does not accept arbitrary documents.
- Upload and generation handlers verify ownership, quota, length, detected file signature, and decodability. MIME from the client is advisory only. Active content and mismatched signatures are rejected.
- Downloads are server-mediated. After authorization, Core issues a very short-lived signed URL or streams the object. Responses use `Content-Disposition`, `X-Content-Type-Options: nosniff`, a restrictive content policy, and never public bucket URLs.
- Image/attachment deletion first commits a server tombstone, then the server finalizer removes database references, private objects, and TTS cache objects with retry/backoff. Connected clients receive the tombstone, purge matching IndexedDB entries, and acknowledge the purge. Offline clients must purge on their next authenticated sync; the server records pending client acknowledgements for 90 days and never claims an unreachable device was cleared.
- Message-owned attachments are deleted with the message. Unattached generated TTS cache objects expire after 30 days. Account deletion enters a 30-day recovery window, then purges remaining private rows and objects.
- Media is not embedded as base64 in chat JSON or browser local storage.

### 7.2 Chat records

The current `historyBlob` model is replaced by normalized records through a reversible migration state machine:

- `conversations`: account, title, model chain preference, timestamps, and deletion state.
- `messages`: conversation, role, content reference or bounded text, language, citations, timestamps, and model/tool provenance.
- `attachments`: owner, object key, MIME, size, checksum, and retention.
- `memories`: explicit opt-in account or conversation memory with source message and expiry.
- `usage_ledger`: a compatibility view of the canonical platform usage record; Chat never owns an independent counter.

Migration states are:

1. `legacy_only`: current behavior remains authoritative.
2. `shadow_write`: every legacy mutation is also written to normalized tables with a source version and idempotency key; reads still come from legacy.
3. `backfill`: resumable workers copy legacy conversations/messages, record checksums/counts, and quarantine malformed records without dropping them.
4. `verify`: per-account counts, latest timestamps, message hashes, attachment references, and deletion state must match or the account remains on legacy reads.
5. `normalized_primary_dual_write`: normalized rows are authoritative and every change is also reverse-written to legacy throughout the full 90-day client-compatibility window.
6. `normalized_only`: after the 90-day client compatibility window and successful reconciliation, reverse writes stop.

Rollback before `normalized_primary_dual_write` returns reads to a verified legacy snapshot. Rollback during the dual-write window returns reads to legacy and continues reverse synchronization.

Before entering `normalized_only`, Core creates nightly encrypted logical snapshots of the normalized identity/Chat projections in private object storage and retains 90 daily snapshots plus the append-only normalized change log for at least 180 days. Snapshot creation is verified by checksum and count reconciliation. If a post-cutover rollback is required, Core restores the latest verified snapshot into an isolated database and replays every retained change-log event into a new legacy projection; normalized data remains authoritative until the projection passes verification. The recovery objective is four hours and the replay-based point-in-time recovery objective is zero lost committed changes. A restore-and-replay drill is mandatory before cutover and quarterly thereafter; failure blocks `normalized_only`. Deletion tombstones propagate in both directions and are never removed merely because an older record reappears.

A bounded IndexedDB cache supports UI continuity. Neon is authoritative for signed-in accounts. Deletion is an explicit server operation with a tombstone; an empty merge is not treated as deletion and deleted content cannot reappear during a later sync.

## 8. Orin Chat model and feature flow

### 8.1 Intent-based model chains

A lightweight intent classifier runs in Orin Core and selects one public chain alias:

- `orin-cheap`: short classification, translation, extraction, and simple factual turns.
- `orin-balanced`: the default general assistant path.
- `orin-thinking`: multi-step reasoning, planning, and research synthesis.
- `orin-coding`: code generation, debugging, review, and repository-oriented work.

The classifier uses deterministic prompt and attachment signals first. If rules are ambiguous, Core invokes the `orin-cheap` alias through `orin-router-service`; Core never calls a model provider directly. The user may override the chain; the automatic result, override, confidence, and reason code are logged without storing raw prompt text.

Every generative model call follows the same mandatory path:

```text
Core / Chat -> authenticated orin-router-service /v1
            -> platform-owned provider key -> provider
```

Text, classifier fallback, and image generation all use this path. Router exposes an OpenAI-compatible image-generation route for this first slice. TTS and search are not generative model routes: TTS uses the dedicated Core TTS adapter and search uses the Tools adapter. No component is permitted to hold an independent platform model-key pool.

Each alias is a Router chain, not a hard-coded model. Router accepts only models whose canonical provider catalog says the prompt and image services are priced at zero. If no eligible model exists, the response reports unavailability rather than silently selecting a paid model or claiming unlimited service.

### 8.2 Streaming and failover

Router authenticates and validates before committing response headers. It may fail over only before the first response byte or semantic event. Once output is committed, failure returns a typed terminal error and does not concatenate another provider's output.

A stream ends exactly once. The adapter handles multiline SSE, a final unterminated data buffer, `[DONE]`, cancellation, and provider disconnects. Provider-attempt writes use a transactional outbox; they are not detached fire-and-forget inserts.

#### Catalog and free-price eligibility

Router stores immutable catalog snapshots with `provider`, `fetched_at`, `source_version`, source response hash, model ID, capabilities, context limit, and prompt/image prices. OpenRouter snapshots come from the official OpenRouter model endpoint; another provider may be eligible only when its official metadata endpoint supplies an equivalent zero price and capability record.

A snapshot is eligible for at most six hours. Missing price, unknown price, stale price, missing capability, or a catalog-fetch failure makes the model ineligible. Router never assumes that an unpriced model is free. All four public aliases are free-only in this slice. If no eligible candidate remains, the request ends with `ORIN_PROVIDER_EXHAUSTED`.

#### Alias resolution and routing state machine

The first slice accepts only these exact public aliases; it does not accept user wildcard patterns or raw provider model IDs:

| Input | Resolution |
|---|---|
| `orin-cheap` | Ordered platform-owned cheap chain |
| `orin-balanced` | Ordered platform-owned balanced chain |
| `orin-thinking` | Ordered platform-owned thinking chain |
| `orin-coding` | Ordered platform-owned coding chain |
| Anything else | `ORIN_MODEL_NOT_FOUND` before provider access |

For each request Router:

1. Resolves the exact alias and loads its ordered candidate IDs.
2. Rejects candidates with stale/unknown price, missing capability, open circuit, active cooldown, or exhausted provider/key quota.
3. Starts at most three attempts. Before the first committed response byte or semantic event, each attempt has a 20-second deadline and the complete routing operation has a 45-second deadline.
4. Treats connection failure, timeout before commit, HTTP 408, 429, and 5xx as retryable. It honors `Retry-After` only when it fits the remaining deadline. HTTP 400, 404, 401, or 403 fails the attempt without blindly trying the same invalid model/key; 401/403 moves the provider key to `quarantined` with reason, owner, incident event, and a maximum 24-hour expiry. Quarantined keys are never auto-selected. An operator may release one only after the provider configuration/credential was changed and a live health test succeeds; release, test result, and operator identity are audited. Expiry raises an alert but does not re-enable the key.
5. Applies a 60-second cooldown after 429/5xx, doubling to a maximum of 15 minutes. Three failures within five minutes open the circuit; one half-open probe is allowed after cooldown.
6. Commits to one provider after the first response byte or semantic event. Later failure produces a typed terminal stream error and never starts another provider.
7. Enforces rate limits in Vercel KV/Upstash Redis REST using keys scoped to account, route, provider, model, and provider-key fingerprint. Provider-wide platform limits are applied in addition to account limits. Production startup fails when the shared state store is not configured; in-memory limiting is forbidden.

Every provider attempt records latency, status, retryability, token/image units, and estimated provider cost, including a failed attempt that the provider may have billed. A Chat request reserves one user quota unit before inference and finalizes that single unit once regardless of internal provider retries.

#### Usage ownership

`orin_platform.usage_ledger` is the canonical user/action ledger. It has a unique idempotency key composed of source product, action type, and source event ID. Core is the only writer of user quota and free-unit consumption. Router owns provider-attempt facts in `orin_router.provider_attempts`; a transactional outbox projects those facts into reporting but never charges the user twice. Control-plane events describe lifecycle and audit outcomes and are not a second usage counter. Chat and other clients only display server-returned usage.

Core atomically reserves quota and creates a pending usage record before any billable provider or TTS action. If reservation cannot be durably recorded, the action fails before the provider call. Completion, failure, and refund transitions are idempotent. A reconciler runs every 60 seconds: after 10 minutes pending it queries Router/provider attempt state by request ID; after 24 hours without a definitive result it marks the user reservation `expired_unreconciled`, refunds it, and retains an operator-visible exception. A late provider-cost attempt may still arrive later, but it cannot consume a second user unit. Provider attempts that may have incurred cost remain recorded even when the user action is refunded.

### 8.3 Freshness search

A freshness detector uses the server clock and relative concepts such as today, latest, current, this week, live scores, weather, prices, schedules, and recent releases. It does not hard-code years.

Chat calls the keyless Tools search endpoint through the platform's service egress policy and receives normalized results containing title, source, URL, snippet, publication time when available, and retrieval time. `GET /api/search` remains intentionally public and anonymous for compatibility, but it is explicitly non-sensitive: its query appears in browser history and infrastructure URL logs, so the landing page and API docs warn callers not to use it for confidential text. Chat never uses GET. Chat/private integrations use `POST /api/search` with the query in a no-store request body, `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, and a short-lived signed service assertion for account quota separation. The public endpoint must remain safe when no assertion is present. Application, proxy, analytics, and error logs record only a keyed query hash/length and never the query text; this cannot retroactively remove a public GET query from infrastructure access logs, which is why private Chat uses POST.

Both public methods accept a query of at most 512 Unicode code points, `n` from 1 through 10, supported locale/safe-search values, and a compressed request below 4 KiB. They enforce an eight-second total deadline, at most two upstream fallback bodies of 2 MiB each, and a normalized response no larger than 1 MiB. Durable Upstash/Redis keys use a daily-rotated keyed hash of the address obtained from the deployment adapter's trusted proxy metadata (client-supplied forwarding headers are ignored) and a signed anonymous client cookie: 30 requests/minute and 500/day per address, 60/minute and 1,000/day per cookie. Production requires positive `ORIN_TOOLS_GLOBAL_RPS` and `ORIN_TOOLS_GLOBAL_DAILY` values no higher than 50 requests/second and 100,000 requests/day; startup fails when they are absent, non-numeric, zero, negative, or above those safety ceilings. If Upstash/Redis is unavailable, public search returns 503 and never falls back to process memory or an unlimited path. Raw addresses are not stored in logs. Exceeding a quota returns 429; repeated abuse is blocked without revealing whether a user code or account exists. Search content is labeled untrusted data, not instructions; the model prompt must ignore commands, tool requests, policy changes, and credential requests found in retrieved text. Only normalized evidence may inform the answer, and the answer cites the sources used. When required search fails, the response clearly reports that current information could not be verified. General knowledge may be offered only with an explicit non-current label.

Tools uses a deployment-owned provider registry containing exact origin and path-prefix allowlists. The default cloud registry includes the chosen public search, news, Wikipedia, and Open-Meteo endpoints. A self-hosted search engine requires the `local` profile and an operator allowlist. User text and model output can choose search terms and result count only; they cannot choose a host, scheme, port, path prefix, redirect target, or arbitrary URL to fetch. Redirects are accepted only when the final origin/path remains in the provider registry. Result-page links are normalized to HTTP/HTTPS, rendered as untrusted links, and are not fetched by the server.

Every outbound search-engine URL is validated by the platform URL guard. Search result links must be HTTP/HTTPS and are rendered without executable URL schemes.

### 8.4 Languages

The interface and assistant support English, Sinhala, and Tamil. `Auto` detects the user's language from the conversation and preserves it until the user changes it. UI strings, speech input locale, model instruction, TTS locale, citations, and error messages use explicit language tags. Code, identifiers, URLs, and technical names are not translated.

### 8.5 TTS and images

TTS uses a server adapter with multilingual voice selection. Audio is cached in object storage and served with a short-lived authorized URL. Browser speech is a visible fallback only.

Image generation calls `orin-router-service/v1/images/generations`; Chat has no direct image-provider key. Router admits only catalog entries with a current zero image price, stores completed output as an attachment, and records one provider attempt. Core records one user usage entry. A failed image request does not leave a broken assistant message or increment usage twice.

#### External provider processing

Before any model, search, TTS, or image adapter is enabled, its registry entry records provider legal entity, endpoint, data categories sent, retention period, training-use policy, processing region, subprocessors, deletion support, and last policy-review date. Adapters send only the content required for the action: search receives the normalized query rather than the conversation, TTS receives only the selected text, and image generation receives the minimum prompt/reference set.

A free provider that may retain or train on requests is labeled as such in the privacy UI and requires explicit account-level consent before private conversation content is sent. The consent is stored in `orin_identity.provider_consents` with the provider, policy version, data categories, purposes/products, client, timestamp, expiry, and revocation. Every outbound private-data request resolves an active matching consent and records that policy version in the audit event; a policy-version change requires new consent. Without consent, Chat may use deterministic local features and synthetic public prompts but does not transmit the user's private content. Product copy never claims that cloud Chat or search is local-only. Provider deletion requests are recorded and executed where supported, and the registry blocks an adapter whose policy review has expired.

## 9. Shared event, logging, and error design

### 9.1 Event envelope

The four mandatory first-slice consumers—Core/Chat, cloud Router inference, Tools search, and `orin-platform` test fixtures—emit the same versioned event shape. Deferred repositories receive the schema but do not integrate until their gated phase:

```text
schema_version, event_id, type, occurred_at,
product, source, request_id, trace_id, correlation_id,
account_id, session_id, run_id,
outcome, duration_ms, error_code, redacted_metadata
```

`request_id` identifies one operation. `trace_id` follows it across services. `run_id` identifies a longer Agent, terminal, or automation job.

Operational JSON logs are written to stdout or rotating local files according to runtime and are best-effort diagnostics only. A protected event must first commit to the durable `orin_platform.outbox`; an ephemeral Vercel process-local buffer never authorizes an authentication, billing, upload, or sharing action. Sentry receives sanitized errors and traces when configured. A durable `orin_platform.events` ledger stores control-plane audit, usage, security, and lifecycle events. Raw prompts, responses, terminal input, file content, access tokens, provider keys, environment values, and share secrets are excluded by default.

Administrative access to cross-product events is audited.

### 9.2 Error envelope

Internal APIs return:

```json
{
  "error": {
    "code": "ORIN_PROVIDER_EXHAUSTED",
    "message": "No eligible provider is currently available.",
    "retryable": true,
    "retry_after": 30,
    "request_id": "..."
  }
}
```

OpenAI-compatible routes translate this shape while preserving the request ID. Stable error families include authentication, authorization, validation, quota, rate limit, provider exhaustion, upstream timeout, unsafe URL, storage failure, conflict, and internal fault. Internal stack traces, SQL, provider bodies, and secrets never reach clients.

### 9.3 Failure policy

| Failure | Required behavior |
|---|---|
| Revocation/authorization store unavailable | Reject protected request |
| Rate-limit store unavailable | Reject protected Router/Chat calls with 503 and `ORIN_RATE_LIMIT_STATE_UNAVAILABLE`; no in-memory or fail-open grace mode is permitted in production |
| Public-search quota store unavailable | Reject both GET and POST search with 503 and no upstream provider access; never use a local limiter or bypass mode |
| Router unavailable | Chat reports Router unavailability and does not bypass it |
| Freshness search unavailable | Mark current information unverified; do not present stale knowledge as current |
| TTS unavailable | Offer browser speech fallback and record provider failure |
| Image generation/storage unavailable | Fail the image action without a partial message or duplicate usage |
| Telemetry unavailable | A protected action continues only after its privacy-safe event commits to the durable `orin_platform.outbox`; stdout/local buffers never satisfy this requirement. If the outbox is unavailable, fail closed for authentication changes, billable calls, uploads, and shares. A cache-only read may continue with a degraded-service indicator. |
| Local Agent/terminal disconnect | Stop privileged work, persist recoverable state, and require explicit resume |

## 10. Security design

### 10.1 Outbound requests

The shared URL guard:

- Allows only HTTP and HTTPS.
- Rejects embedded credentials, unsupported schemes, malformed ports, and ambiguous numeric hosts.
- Resolves DNS and rejects loopback, private, link-local, multicast, unspecified, documentation, cloud-metadata, and other reserved IPv4/IPv6 destinations.
- Pins the validated address for the connection where the runtime permits it.
- Revalidates every redirect and limits redirect count.
- Enforces connect/read deadlines, response-size limits, and allowed content types.

Cloud profiles default to public destinations only. Local providers and self-hosted search require an explicit `local` profile and allowlist.

### 10.2 Browser and secrets

- Strict CSP, explicit CORS origins, CSRF protection, secure host-only cookies, and no bearer token in browser storage.
- Production secrets exist only in Vercel environment variables and OS secret services.
- Source, examples, fixtures, and tests contain no usable credential literals.
- Cloud provider credentials use envelope encryption with a random 256-bit data-encryption key per credential and AES-256-GCM authenticated encryption. The key-encryption key is supplied by the deployment secret service, never stored beside ciphertext. Each record stores key version and account/provider/key ID as authenticated associated data.
- Key rotation rewraps data-encryption keys without exposing provider secrets. Reads support the current and previous key version during migration; writes use only the current version. Missing key material or an unknown required version fails closed and creates an operator alert.
- User gateway-key hash-only storage, one-time reveal, and rotation are reserved for the later Router key-management gate. Secret reveal is never returned to a browser in that later flow.
- Account, file, object, share, and terminal operations are authorized server-side.

### 10.3 Emergency containment before deployment

The following occur before the new vertical slice is deployed:

1. Fix the `Orin-Router` delegated-password authentication bypass and crash path.
2. Require API-key authentication and secure cookies on every public Router instance.
3. Disable public `/api/run` and any Console live-share path until its dedicated security design is approved.
4. Remove credential-shaped literals and rotate every value that may have been exposed.
5. Stop deploying clients that use stale Firebase/Clerk/custom-password contracts.
6. Enforce required secret-service presence; fail deployment rather than falling back to plaintext or development defaults.

## 11. Testing strategy

### 11.1 Platform contract tests

`orin-platform` owns sanitized fixtures and generated-client tests for:

- Token claims, token types, scopes, expiry, rotation, revocation, and account isolation.
- Canonical model aliases, capabilities, pricing eligibility, and chain mapping.
- Event and error envelopes across TypeScript, Python, and Rust.
- URL parsing, DNS outcomes, IPv4/IPv6 classification, redirects, and content limits.
- Feature flags and Cloud versus Local configuration.
- Product-manifest classification that keeps deferred repositories contract-only during the first slice.

### 11.2 Product contract tests

The four mandatory first-slice consumers run the platform compatibility suite. Other repositories are exempt until their integration gate. Core, Router, and Tools additionally test:

- Neon email/password and Google account projection, legacy-link state transitions, one-time-code expiry/reuse, blocked cross-account collisions, and reversible merge mappings.
- Legacy account link rules and rollback.
- Authorization `state`/`nonce`/PKCE binding, exact callback routing, replay rejection, 30-day absolute/seven-day idle BFF expiry, idempotent 24-hour rotation, 60-second overlap across concurrent tabs, older-generation reuse, five-minute one-use step-up for remote revocation, and account-state invalidation.
- Device start/approve/token, 256-bit device codes, 40-bit formatted user codes, approval-attempt/client/address limits, PKCE `S256`, one-use/eight-minute codes, polling errors, scope intersection, 30-day/14-day refresh lifecycle, rotation overlap/reuse, reauthorization, and service-token audience separation. Core token-schema tests reserve `mcp` and user `router` token types, but their product clients and key-management flows are later gates.
- Exact public-alias resolution, rejection of unknown/raw model IDs, and ordered failover. Wildcard/BYOK resolution is reserved for the later Router product gate.
- No failover after the first committed stream event.
- Distributed rate limits, health/cooldown state, three-attempt deadlines, provider-key quarantine/expiry/operator release, and canonical usage idempotency/reservation/finalization with 10-minute reconciliation and 24-hour refund rules.
- Durable outbox enforcement before protected authentication, billable, upload, or share actions; failure tests prove ephemeral stdout/local buffers never authorize continuation.
- Public GET non-sensitive warnings and no-store POST/private Chat behavior, anonymous/service-assertion quota separation, trusted-proxy address handling, required global ceilings, fail-closed quota-store failure, query/result/body/deadline caps, exact provider-origin/path allowlists, redirect revalidation, versioned provider-consent persistence/enforcement, timeout, and upstream failure behavior.
- Conversation ownership, normalized history, shadow/backfill/verification, reverse synchronization throughout the 90-day compatibility window, encrypted snapshot/change-log retention, isolated restore-and-replay, attachments, memories, private-object authorization, content validation, and tombstone/client-cache deletion acknowledgement.

### 11.3 Security tests

- DNS rebinding, redirect-to-private, IPv4-mapped IPv6, alternate IP representation, metadata endpoint, oversized response, and slow-response cases.
- Cross-account object/message/conversation access.
- Break-glass metadata-only defaults, dual-approval/time-limited private-content access, notification, and audit enforcement.
- CSRF, CORS, CSP, cookie, and token-substitution cases.
- Secret scanning, signing/MAC key entropy, and proof that raw credentials are never persisted. Hash-only user gateway storage and one-time reveal are reserved for the later Router key-management gate.
- Prompt/tool boundary tests ensuring retrieved text cannot change tools or policy and freshness search cannot select an arbitrary outbound host.

### 11.4 Preview and canary tests

A Vercel preview requires `ORIN_PROVIDER_MODE=fake`; startup fails if a preview can resolve a live model, search, TTS, or image adapter. Deterministic fixtures and local fake upstreams serve every provider-backed flow below:

1. Email registration and login.
2. Google login with a Neon test account.
3. Session renewal and server logout.
4. Automatic selection of all four model chains.
5. Freshness search with visible citations.
6. Sinhala, Tamil, and English conversations.
7. TTS and browser fallback.
8. Image generation and object-storage attachment.
9. History reload and explicit deletion.
10. Usage and audit correlation.
11. Core BFF/device session rotation, account-state revocation, and deployment secret validation. MCP and user Router-key management are explicitly excluded.
12. Error, quota, rate-limit, and provider-exhaustion states.

PR CI never calls live providers. Nightly canaries use a dedicated synthetic account, environment-provided test credentials, at most 100 inference requests, 20 TTS actions, and 10 image actions per run. `ORIN_CANARY_MAX_SPEND` is required; missing budget configuration aborts the canary before provider access.

Production promotion uses deterministic cohorts:

1. 5% for at least 24 hours and 200 eligible requests.
2. 25% for at least 24 hours and 500 eligible requests.
3. 100% only after both observation windows pass.

A cohort automatically rolls back when any of these conditions holds: any confirmed credential/authorization/security event; user-usage reconciliation mismatch above 0.1%; unexpected 5xx rate above 2%; stream terminal-error rate above 3%; p95 time to first token above eight seconds; p95 freshness-search latency above ten seconds; or forecast spend/usage above the configured per-action budget by 20% for 15 minutes. The release controller records the metric window and reason and disables the relevant `identity_v2`, `router_v2`, `search_v2`, or `chat_v2` flag.

The supported-client matrix is generated from the product manifest. It lists exact platform contract, schema, and minimum client versions. Compatibility adapters support the current and immediately previous minor contract for 90 days; anything outside that matrix receives `ORIN_CLIENT_UNSUPPORTED` before authentication-dependent work begins.

## 12. Rollout and rollback

### Phase 0: Containment

Apply the emergency security changes, rotate affected credentials, disable unsafe public routes, and capture current deployment baselines.

### Phase 1: Platform

Create `orin-platform`, versioned schemas, generated clients, security helpers, event/error contracts, fixtures, and cross-repository CI.

### Phase 2: Core identity and data

Introduce Neon Auth, account migration, secure BFF/device sessions, token registry, normalized Chat tables, object storage, and compatibility adapters. Database migrations are additive and reversible.

### Phase 3: Router inference dependency

Make the public `/v1` path real, prevalidate streams, fix terminal-frame behavior, add durable health/rate state, enforce safe provider URLs, and expose the four chain aliases.

### Phase 4: Tools search dependency

Add the shared deadline, durable quotas, normalized citations, result-link validation, and weather-first behavior. Keep `/api/run` disabled.

### Phase 5: Chat

Enable the accepted flows behind centrally registered `chat_v2`, `identity_v2`, `router_v2`, and `search_v2` flags. Run preview E2E and security suites before production.

### Phase 6: Production canary

Deploy to a small production cohort, compare error/latency/usage metrics, then promote gradually. Feature flags, not manual production edits, control rollback.

### Compatibility

Legacy routes and payload shapes receive explicit adapters during a 90-day deprecation window. The adapters emit usage metrics so remaining clients are visible. A client outside the supported matrix is rejected with a stable migration error rather than silently misauthenticated.

## 13. Acceptance criteria

The first vertical slice is accepted only when all of the following are true:

1. `orin-platform` schemas and generated TypeScript, Python, and Rust fixtures pass the shared compatibility suite.
2. A user can register and log in with Neon email/password and Google identities, then link those two provider identities through fresh proof without relying on a matching email string.
3. A browser session can remain active for 30 days through rotating server-side state and can be revoked from another session.
4. A desktop/device flow can obtain scoped credentials that are stored only in an OS/VS Code secret service.
5. A prompt is automatically routed to `orin-cheap`, `orin-balanced`, `orin-thinking`, or `orin-coding`, and the chosen chain is visible in the shared audit event.
6. Only currently zero-price eligible models are used by the free chains; no silent paid fallback occurs.
7. A current-information prompt triggers no-store POST Tools search without placing the private query in a URL, returns visible citations, and represents search failure honestly; the public keyless GET compatibility route remains rate-limited and labeled non-sensitive.
8. English, Sinhala, and Tamil conversations work, and the selected language is preserved through text, TTS, and UI state.
9. TTS returns playable cached audio or a clearly labeled browser fallback.
10. Image generation stores a real object-storage attachment and records usage exactly once.
11. Conversation reload, cross-device sync, memory opt-in, explicit history deletion, reversible history migration, verified snapshot/change-log recovery, server tombstones/object deletion, and connected-client cache purge behave according to the normalized data model; an offline client purges on its next authenticated sync.
12. Chat content, attachments, and memories remain inaccessible across accounts and are absent from the shared control-plane event payload; private provider processing is disclosed and consent is enforced where required.
13. Model, search, TTS, image, auth, and device actions share correlation IDs and the canonical event/error contracts; canonical user usage is reserved/finalized exactly once while provider attempts remain separately auditable.
14. Cloud outbound requests reject private/reserved destinations and unsafe redirects; search/model/TTS adapters use only registered origins and path prefixes.
15. No usable credential literal exists in source, examples, fixtures, or tests.
16. The Vercel preview passes contract, security, browser, migration, and build gates.
17. Known P0 findings in the affected Chat/Core/Router/Tools repositories are closed.
18. User-facing privacy, retention, free-model, login, and storage claims match actual behavior.

## 14. Later gated subprojects

Each later subproject receives its own design and implementation plan after this specification is approved and the first slice is stable.

1. **Router product:** full provider/key management, live tests, durable usage/cost, logs, model explorer, routing graph, playground, key rotation, and hosted or BYOK policies.
2. **MCP:** hosted and packaged stdio clients, Core-enforced scopes, corrected usage contract, aggregate limits, protocol-safe logging, and package-install tests.
3. **Tools run:** Orin-controlled isolated execution, language catalog, resource/network policy, durable global quota, stdout/stderr/exit-code contract, and public launch.
4. **Console:** persistent terminal bridge, ordered PTY/tmux byte stream, colors and resize, public dev-server URLs, safe renewal, read-only/live sharing, 24-hour deletion, and replay.
5. **Agent:** authenticated capability discovery, versioned run/event/approval/output/artifact contracts, secure browser-to-local pairing, reconnectable event history, and truthful local-data disclosure.
6. **Orin Code:** one canonical Windows runtime, unified generated client, enforced workspace boundaries, real agent modes, project context, safe approvals, MCP session handling, CLI refresh, and VS Code parity.
7. **Automations and notes:** input/output schemas, immutable pipeline manifests, code/integration review, approval hash, sandboxed execution, retries, monitoring, and a lossless Logseq-compatible shared notes layer.
8. **Ecosystem release:** generated product manifest, consistent links, creator page, SEO files, coordinated versions, release health, and rollback status.

## 15. Consequences

This approach adds an initial platform repository and cross-repository release coordination. That cost is intentional: the current alternative has already produced incompatible auth, token, route, model, logging, and storage contracts across every product family.

The federated design preserves independent Vercel deployments and local runtimes while making shared behavior testable. It also allows old repositories to remain deployable while migrating behind explicit compatibility adapters, instead of requiring a high-risk big-bang cutover.

The most important product consequence is that feature availability becomes honest. A product capability is considered shipped only when its full path—UI, authorization, runtime, persistence, error handling, logging, and tests—works. Marketing pages are updated separately and cannot claim behavior before the corresponding acceptance gate passes.
