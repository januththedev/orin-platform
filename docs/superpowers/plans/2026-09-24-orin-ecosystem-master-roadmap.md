# Orin Ecosystem Master Implementation Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement each approved plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the fourteen Orin repositories into one coordinated ecosystem while delivering the approved platform/Core/Chat vertical slice before enabling the remaining products.

**Architecture:** A new `orin-platform` repository is the versioned source of truth for contracts, generated models, security policy, observability, and Orin UI. Product repositories remain independently deployable and consume one immutable platform release through pinned Git submodules. Vercel hosts stateless services; local or dedicated persistent runtimes host Agent execution and interactive terminal streaming.

**Tech Stack:** GitHub, Git submodules, npm/Node 22, TypeScript, JSON Schema Draft 2020-12, React/Vite, Neon Auth/Postgres, Vercel Functions/Blob, Upstash Redis, Playwright, Vitest, Python `unittest`, Rust `cargo test`.

## Global Constraints

- Use Git author `Januth Nimnal <nimnaljanuth@gmail.com>` in every repository.
- Never place a usable secret, token, private key, provider key, or credential-shaped literal in source, tests, fixtures, examples, logs, or plans.
- Server-side outbound requests use only registered HTTP(S) origins/path prefixes and reject private, loopback, link-local, metadata, reserved, credential-bearing, ambiguous, and unsafe redirect targets.
- The first slice has exactly four product consumers: `orin-platform`, `Orin-AI`, `orin-router-service`, and `orin-tools`.
- MCP, user Router keys/dashboard, public code execution, Console, Agent, Orin Code, Automations, and the ecosystem hub remain contract-only until their own approved spec/plan gate.
- All first-slice PR CI uses fake providers and makes no live model, search, TTS, image, Neon, Redis, or Vercel production call.
- Production code never falls back to in-memory rate limits, health state, quota state, auth revocation state, or plaintext secret storage.
- Existing destructive or outward-facing actions require the durable release gates in this roadmap.

---

## Phase 0 — Emergency containment

**Plan:** `2026-09-24-orin-first-slice-release-implementation.md`

- [ ] Fix the `Orin-Router` delegated-password authentication bypass and crash path.
- [ ] Require Router API-key authentication and secure cookies on every public deployment.
- [ ] Disable public `orin-tools/api/run.ts` before any Chat integration.
- [ ] Disable Console live terminal sharing until its persistent-stream security design is approved.
- [ ] Remove credential-shaped source literals and rotate every potentially exposed value.
- [ ] Record baseline commit SHAs, Vercel projects, active routes, and deployment state.

**Exit evidence:** P0 issue list has no open item, disabled endpoints return stable errors, and every rotated secret is present only in the deployment secret service.

## Phase 1 — Platform contract release

**Plan:** `2026-09-24-orin-platform-contracts-implementation.md`

- [ ] Implement canonical v1 JSON Schemas, fixtures, compatibility registry, and generated TypeScript/Python/Rust models.
- [ ] Implement strict config, DNS-pinned URL policy, token verification, envelope encryption, event redaction/outbox, HTTP/SSE client, Core/Router/Tools clients, and UI tokens.
- [ ] Add product/consumer manifests, CI, secret scanning, release verification, and compatibility matrix generation.
- [ ] Create and push `januththedev/orin-platform`.
- [ ] Merge through PR and create immutable annotated tag `platform-v1.0.0`.
- [ ] Push the release manifest containing tag, commit SHA, schema versions, fixture digest, and supported consumers.

**Exit evidence:** `npm run check` passes, generated artifacts are current, cross-language fixture tests pass, and the tagged SHA is reproducible from a clean clone.

## Phase 2 — Cloud Router inference dependency

**Plan:** `2026-09-24-orin-router-service-inference-implementation.md`

- [ ] Pin `platform-v1.0.0` through `vendor/orin-platform`.
- [ ] Replace user keys/wildcards with strict Core service assertions and introspection.
- [ ] Implement exact four aliases and six-hour official zero-price catalog snapshots.
- [ ] Implement Upstash rate/health/cooldown/circuit/quarantine state.
- [ ] Implement max-three-attempt pre-commit routing and robust SSE terminal state.
- [ ] Add transactional provider-attempt/outbox facts and Core reconciliation lookup.
- [ ] Add public models/chat/images routes and private catalog/attempt routes with exactly five Vercel functions.
- [ ] Merge and deploy with `router_v2` disabled.

**Exit evidence:** Contract/security/SQL/Vercel tests pass in fake mode, no provider/chat output is mixed after stream commit, and Core can reconcile every started attempt by request ID.

## Phase 3 — Tools search dependency

**Plan:** `2026-09-24-orin-tools-search-implementation.md`

- [ ] Pin `platform-v1.0.0` through `vendor/orin-platform`.
- [ ] Preserve anonymous GET search as explicitly non-sensitive compatibility behavior.
- [ ] Add no-store private POST search with a short-lived Core service assertion.
- [ ] Add exact provider registry, trusted-proxy/address handling, signed anonymous cookies, and Upstash quotas.
- [ ] Enforce query/body/result/deadline caps and fail closed when quota state is unavailable.
- [ ] Implement weather-first orchestration and normalized untrusted citations.
- [ ] Replace `/api/run` with a testable 410 deny stub.
- [ ] Merge and deploy with `search_v2` disabled.

**Exit evidence:** GET/POST contract, quota, SSRF, redirect, prompt-injection, weather, documentation, and Vercel tests pass with zero live provider calls.

## Phase 4 — Core identity, sessions, and normalized data

**Plan:** `2026-09-24-orin-core-chat-implementation.md`

- [ ] Pin the same platform SHA and add contract/function-budget CI.
- [ ] Add role-scoped Neon schemas, migrations, RLS, canonical outbox, and usage ledger.
- [ ] Implement Neon identity projection and provider/legacy linking without email auto-merge.
- [ ] Implement OAuth/PKCE BFF sessions, rotation overlap, account-state invalidation, and step-up revocation.
- [ ] Implement device start/details/approve/token/refresh with hashed codes and OS secret handoff.
- [ ] Add normalized conversations/messages/memories/tombstones and reversible history migration.
- [ ] Add private media upload/finalization/download and deletion worker.
- [ ] Keep all v2 production flags disabled.

**Exit evidence:** Identity/session/device concurrency, RLS, outbox-before-action, migration restore/replay, private-media, and function-budget tests pass in isolated infrastructure.

## Phase 5 — Complete Orin Chat vertical slice

Continue `2026-09-24-orin-core-chat-implementation.md`.

- [ ] Route all text and classifier calls through cloud Router aliases.
- [ ] Route image generation through Router and store output as a private Chat attachment.
- [ ] Route freshness search through no-store Tools POST and render honest verified/unverified state.
- [ ] Implement English, Sinhala, and Tamil with server TTS and explicit browser fallback.
- [ ] Replace localStorage bearer/history/base64 media with cookie sessions, normalized APIs, and bounded IndexedDB.
- [ ] Enforce one canonical usage reservation/finalization/refund per action.
- [ ] Add full fake-preview E2E, security, migration, and truthful documentation tests.
- [ ] Deploy Core/Router/Tools with flags off, run canaries, then enable `chat_v2`.

**Exit evidence:** All approved Chat acceptance criteria pass on a Vercel preview and production canary with no direct provider-key path in `Orin-AI`.

## Phase 6 — Full Router product

Create a new design/spec/plan before implementation.

- [ ] Provider and key management with envelope encryption and one-time gateway-key reveal.
- [ ] Durable usage/cost, logs, model explorer, routing graph, playground, and live provider tests.
- [ ] Ordered exact/wildcard resolution, BYOK/platform pool policy, and explicit 90-day key deprecation.
- [ ] OpenAI-compatible breadth required by supported clients.

**Exit criterion:** A user can configure providers, mint `orin_...` keys, test models, inspect routing/cost, and use the same key from an OpenAI client without exposing provider secrets.

## Phase 7 — MCP

Create a new design/spec/plan before implementation.

- [ ] Core-enforced `models:read`, `chat:generate`, and `usage:read` scopes.
- [ ] Correct usage endpoint contract and hosted HTTP transport.
- [ ] Installable stdio package with build lifecycle and stderr-only diagnostics.
- [ ] Aggregate payload limits, failed-auth limits, resource limits, and package-install smoke tests.

**Exit criterion:** `npx` and hosted MCP clients work with a scoped token and cannot bypass scopes through direct Core calls.

## Phase 8 — Public code execution

Create a new threat model/spec/plan before implementation.

- [ ] Replace Compiler Explorer delegation with Orin-controlled isolated execution.
- [ ] Define language catalog, CPU/memory/process/network/time policy, durable global quotas, stdout/stderr/exit contract, and abuse monitoring.
- [ ] Keep `/api/run` disabled until this phase passes penetration/security tests.

**Exit criterion:** Public callers receive bounded sandboxed execution with no host/filesystem access and no unbounded upstream work.

## Phase 9 — Orin Console

Create a new design/spec/plan before implementation.

- [ ] Dedicated persistent terminal bridge outside short-lived Vercel functions.
- [ ] Ordered PTY/tmux byte stream with ANSI colors, resize, cwd, exit state, disconnect, and replay.
- [ ] Safe session creation/renewal, public port URLs, scheduled 24-hour deletion, quotas, and orphan cleanup.
- [ ] Read-only/live share grants, revocation, and accurate secret/data disclosure.
- [ ] Account namespace and exact Core authentication contract.

**Exit criterion:** A browser behaves like a real terminal, replays faithfully, renews without orphaning sandboxes, and enforces sharing/retention policy.

## Phase 10 — Orin Agent

Create a new design/spec/plan before implementation.

- [ ] Versioned capability, run, event, approval, output, artifact, reconnect, and error contracts.
- [ ] Secure local pairing that does not leave a host-RCE key in public-origin browser storage.
- [ ] Working web-to-local CORS/PNA/SSE, plan/tool timeline, approvals, final output, artifacts, and run history.
- [ ] Truthful local execution versus external model/search/browser data residency.

**Exit criterion:** The hosted UI can assign a real task to the local gateway, pause/resume approvals, use tools/browser, and deliver downloadable artifacts.

## Phase 11 — Orin Code

Create separate plans for the Windows workspace, CLI, and VS Code extension after selecting the canonical runtime.

- [ ] One generated account/client contract and refresh lifecycle.
- [ ] One canonical Windows agent/tool runtime with enforced workspace path boundaries.
- [ ] Real Chat/Cowork/Agent modes, project context, artifacts, MCP sessions, Computer Use, and safe phone approval grants.
- [ ] CLI secret storage and device refresh parity.
- [ ] VS Code extension context, history, commands, and terminal/project integration.
- [ ] Signed release/update pipeline and coordinated compatibility matrix.

**Exit criterion:** Windows app, CLI, and extension share one account, protocol, data model, approval semantics, and version matrix.

## Phase 12 — Orin Automations and shared notes

Create a new design/spec/plan before implementation.

- [ ] Input/output schemas and immutable pipeline manifests.
- [ ] Generated steps/code/integrations with readable diffs and approval bound to an exact hash.
- [ ] Sandboxed execution, secret broker, egress allowlist, retry/idempotency, monitoring, and incident history.
- [ ] Lossless Logseq-compatible Markdown parser/serializer, stable block/page IDs, conflict rules, attachments, and provenance.
- [ ] Shared notes integration in Orin Code and Automations.

**Exit criterion:** A user can draft, review, approve, run, monitor, and edit a pipeline whose notes remain compatible with Logseq and Orin Code.

## Phase 13 — Ecosystem hub and coordinated releases

Create a final release spec/plan.

- [ ] Generate the product catalog from the platform manifest.
- [ ] Unify product cards, links, SEO files, creator page for Januth Nimnal, and machine-readable metadata.
- [ ] Coordinate versions, preview URLs, canary evidence, release health, and rollback status.
- [ ] Publish only capabilities whose product gate has passed.

**Exit criterion:** `orinai.org` accurately lists every live product and link, with no scaffold or deferred feature presented as working.

## Requirement-to-phase coverage

- Shared account, quotas, logs, contracts, and UI: Phases 1–5.
- Orin Chat: Phase 5.
- Orin Router: Phases 2 and 6.
- Orin Tools: Phases 3 and 8.
- Orin MCP: Phase 7.
- Orin Agent: Phase 10.
- Orin Code app/CLI/VS Code: Phase 11.
- Orin Automations/notes: Phase 12.
- Orin Ecosystem/creator hub: Phase 13.
- Console: Phase 9.
- Vercel and shared release delivery: all phases through the release plan.
