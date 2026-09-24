# Orin Core and Chat Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `Orin-AI` into Neon-backed Orin Core and a complete Orin Chat vertical slice with secure BFF/device sessions, normalized private conversations, four-chain Router calls, private search, images, TTS, and canonical usage/events.

**Architecture:** One catch-all Core authentication function dispatches OAuth/PKCE BFF, account/session, identity-link, step-up, and device routes. Existing `api/chat.js` becomes the single Chat BFF/orchestrator. Neon schemas use separate roles/RLS, normalized history migrates reversibly, media uses private direct upload, and every generative call goes through `orin-router-service`; private freshness search uses no-store Tools POST.

**Tech Stack:** React 18, Vite 5, JavaScript API functions, TypeScript frontend, Neon Auth/Postgres, Vercel Functions/Blob, Node test runner, Vitest, Playwright, platform contracts/client/config/security/observability/UI.

## Global Constraints

- Work in `D:\Orin_ECOSYS\Orin-AI` on `release/platform-v1.0.0-core` from baseline `91fbb1644f6b94b6aba36f824ce341f5446a99a7`.
- Set local Git author to `Januth Nimnal <nimnaljanuth@gmail.com>`.
- Pin immutable `platform-v1.0.0`; never copy platform aliases, errors, event envelopes, or security policy into this repository.
- Browser JavaScript receives no bearer/session/refresh credential. BFF cookies are host-only, HttpOnly, Secure, and SameSite=Lax.
- Identity is linked only by fresh provider proof or legacy credential proof, never by matching email.
- All text/classifier/image generation goes through Router. Private search goes through no-store Tools POST. TTS uses the dedicated registered Core adapter.
- No Chat row, browser cache, event, or log contains base64 media, raw prompt, token, provider key, or private query.
- Legacy `orin_docs/historyBlob` remains readable through the full 90-day reversible migration window.
- Production flags start off. No live provider calls occur in PR/preview tests.
- Final Vercel function count must remain below 12; target 10.

---

## File map

**Create server**

- `.gitmodules`, `vendor/orin-platform`, `orin-platform.consumer.json`
- `api/auth/[...path].js`
- `api/_lib/{config,db,pkce,cookies,csrf,bff,identityRepository,sessionRepository,deviceFlow,chatRepository,chatMigration,platformRepository,consent,routerClient,toolsClient,ttsClient,storage,mediaValidation,intent,freshness,chatTurn,workers,legacyAdapters}.js`
- `scripts/db-migrate.mjs`, `scripts/check-vercel-functions.mjs`
- `migrations/0001_identity.*`, `0002_sessions_devices.*`, `0003_chat_normalized.*`, `0004_media_recovery.*`, `0005_platform_usage_events.*`, `0006_rls_functions_policies.*`, `admin/0000_roles.*`

**Create frontend/tests**

- `services/{apiClient,accountService,adminService,chatService,chatCache}.ts`
- `components/{AuthPanel,SessionList,IdentityLinkPanel,ConsentPanel,LanguageSelector,MediaAttachment}.tsx`
- `tests/contract/*`, `tests/unit/*`, `tests/security/*`, `tests/integration/*`, `tests/components/*`, `tests/e2e/*`
- `playwright.config.ts`

**Modify**

- `package.json`, `package-lock.json`, `vercel.json`, `tsconfig.json`, `vite.config.ts`, `.env.example`, `.env.local.example`, `README.md`
- `api/{admin,chat,desktop-sync,me,models,pc-link,telegram,telegram-code}.js`, `api/auth/google.js`
- `api/_lib/{auth,neonauth,crypto,http,ratelimit,passwords,identity,store,tg,pclink}.js`
- `App.tsx`, `index.tsx`, `index.html`, `index.css`, `tailwind.config.js`, `types.ts`, `translations.ts`, `config.ts`, `public/sw.js`
- `services/{cacheService,googleIntegrationService,notificationService}.ts`
- `components/{AppSidebar,AccountSettings,AdminPortal,APIControls,ChatWorkspace,DeviceAuthPage,LandingPage,PrivacyPage,VoiceAssistant}.tsx`
- `pc-app/{main.js,preload.js,package.json}`

**Delete only after compatibility migration**

- `api/auth/password.js`, `api/auth/neon.js`, `api/auth/device.js`
- `api/_lib/omni.js`, `api/_lib/schema.sql`
- `services/geminiService.ts`, `services/sessionService.ts`, `services/aiProviderService.ts`

## Task 1: Pin platform contracts, add test harness, and enforce the function budget

- [ ] **Step 1: Add/check out platform submodule**

```bash
git submodule add https://github.com/januththedev/orin-platform.git vendor/orin-platform
git -C vendor/orin-platform checkout platform-v1.0.0
```

- [ ] **Step 2: Write failing contract/function tests**

Validate all platform fixtures, assert imports use `vendor/orin-platform`, fail if browser code imports provider packages or `localStorage` token keys, and count deployable `api/*.js` functions.

- [ ] **Step 3: Run red**

```bash
npm run test:contract
npm run verify:functions
```

Expected: missing scripts/manifest and current 12-function count.

- [ ] **Step 4: Add scripts/dependencies**

Add `typecheck`, `test`, `test:platform`, `test:contract`, `test:unit`, `test:security`, `test:db`, `test:e2e`, `verify:functions`, `migrate:*`, and `check`. Add only platform file dependencies, Vitest/Playwright test dependencies, and a private image decoder selected after license/security check. Do not add direct generative model SDKs.

- [ ] **Step 5: Implement function counter allowlist**

Approved target:

```text
api/admin.js
api/chat.js
api/desktop-sync.js
api/me.js
api/models.js
api/pc-link.js
api/telegram.js
api/telegram-code.js
api/auth/[...path].js
api/auth/google.js
```

- [ ] **Step 6: Install with approval, verify, and commit**

```bash
npm install
npm run test:platform
npm run test:contract
npm run verify:functions
git add .gitmodules vendor/orin-platform package.json package-lock.json scripts tests/contract orin-platform.consumer.json
git commit -m "build(platform): pin Orin contracts and V2 gates"
```

## Task 2: Add strict configuration, database roles, schemas, RLS, and migration runner

- [ ] **Step 1: Write failing migration/static tests**

Check required tables/columns/constraints, no direct Chat role access to identity credentials, canonical usage uniqueness, forced RLS, hash-only credential columns, six migration states, and no destructive legacy drop.

- [ ] **Step 2: Run red**

```bash
npm run test:db -- static
```

Expected: missing migrations.

- [ ] **Step 3: Create migrations**

`0001_identity`: accounts, aliases, identity_links, provider_profiles, legacy credentials/identifiers, OAuth clients, auth transactions, provider results, migration codes, provider consents, account state history.

`0002_sessions_devices`: BFF sessions, step-up tokens, device authorizations/grants/refresh tokens, token registry.

`0003_chat_normalized`: conversations, messages, turns, attachments, memories, migration accounts/cursors/quarantine, sync operations.

`0004_media_recovery`: attachments, uploads, tombstones, client purge acknowledgements, recovery snapshots/drills.

`0005_platform_usage_events`: usage ledger, outbox, events, audit, change log, migration control.

`0006_rls_functions_policies`: forced RLS and controlled functions for BFF resolution, account state, usage, protected events, link activation, device consumption, tombstones.

- [ ] **Step 4: Implement migration runner**

It records checksummed migrations in `orin_platform.migration_control`, refuses down after normalized-only, and never modifies/drops legacy `orin_docs` rows.

- [ ] **Step 5: Verify green and commit**

```bash
npm run test:db -- static
git add migrations scripts/db-migrate.mjs api/_lib/db.js api/_lib/config.js
git commit -m "feat(db): add identity chat platform schemas and RLS"
```

## Task 3: Implement Neon identity projection and explicit identity linking

- [ ] **Step 1: Write failing identity tests**

Cover first Neon login, password+Google convergence through fresh provider proof, state/nonce/PKCE/replay, unclaimed legacy proof, one-time migration code, cross-account collision blocked, dual-approval merge aliases, reverse mapping, and no email auto-merge.

- [ ] **Step 2: Run red**

```bash
npm run test:unit -- identity-linking
```

Expected: missing repository/catch-all route.

- [ ] **Step 3: Implement identity repository and route handlers**

`identityRepository.js` atomically resolves `(issuer, subject)`, activates provider links, verifies legacy scrypt credentials, consumes migration codes, and records blocked collisions. `api/auth/[...path].js` dispatches account identity routes while keeping old action shapes behind a 90-day compatibility adapter.

- [ ] **Step 4: Implement account-state matrix**

Exact states/actions are active, credential_changed, security_hold, merge_pending, deletion_pending, and closed as defined in the spec. Every transition appends an audit event and updates session authorization.

- [ ] **Step 5: Verify green and commit**

```bash
npm run test:unit -- identity-linking
git add api/_lib/identityRepository.js api/_lib/identity.js api/_lib/neonauth.js api/auth/[...path].js test
git commit -m "feat(identity): link Neon providers without email auto-merge"
```

## Task 4: Implement PKCE BFF sessions, rotation, account bootstrap, and revocation

- [ ] **Step 1: Write failing session/security tests**

Cover exact redirect, state/nonce/PKCE, replay, 30-day absolute, seven-day idle, 24-hour rotation, 60-second previous-hash overlap, concurrent tabs, older-hash family revoke, CSRF/Origin, current/other/all session revoke, five-minute one-use step-up, account-state invalidation, and 401 session bootstrap.

- [ ] **Step 2: Run red**

```bash
npm run test:unit -- bff-rotation account-state
npm run test:security -- csrf-cors-cookie session-reuse
```

Expected: missing BFF modules.

- [ ] **Step 3: Implement authorize/callback/session routes**

`GET /api/auth/authorize` stores encrypted PKCE verifier, state hash, nonce hash, client, exact redirect, purpose, and ten-minute expiry. Callback consumes state once, verifies Neon result, creates BFF, sets cookie, and redirects without a browser token.

- [ ] **Step 4: Implement session/step-up APIs**

- `POST /api/auth/logout`
- `POST /api/auth/session/rotate`
- `GET /api/account/sessions`
- `DELETE /api/account/sessions/:id`
- `DELETE /api/account/sessions`
- `POST /api/auth/step-up`

Use the restricted DB functions and exact state/expiry rules.

- [ ] **Step 5: Replace `api/me.js` bootstrap**

Return internal account/session metadata, linked identity labels, permissions, CSRF token, usage summary, migration state, effective capabilities, and feature flags. Remove local bearer adoption.

- [ ] **Step 6: Verify green and commit**

```bash
npm run test:unit -- bff-rotation account-state
npm run test:security -- csrf-cors-cookie session-reuse
git add api/_lib/{pkce,cookies,csrf,bff,sessionRepository}.js api/auth/[...path].js api/me.js test
git commit -m "feat(auth): add PKCE BFF sessions and remote revocation"
```

## Task 5: Implement device authorization and Electron secret handoff

- [ ] **Step 1: Write failing device tests**

Cover 256-bit device code, exact 40-bit Crockford user code, eight-minute expiry, five-second polling, five approval failures, client/account/address limits, PKCE, one-use approval/token, 15-minute access, 30-day/14-day refresh, 60-second rotation overlap, reuse revoke, and reauthorization.

- [ ] **Step 2: Run red**

```bash
npm run test:unit -- device-flow
```

Expected: missing exact route contract.

- [ ] **Step 3: Implement device routes**

- `POST /api/auth/device/start`
- `POST /api/auth/device/details`
- `POST /api/auth/device/approve`
- `POST /api/auth/device/token`
- `POST /api/auth/device/refresh`

Store only keyed hashes. Browser receives no device code or refresh material.

- [ ] **Step 4: Implement Electron secret handoff**

Main process retains PKCE/refresh credentials in OS-backed `safeStorage`, polls device flow, and establishes the trusted Core web-session cookie. Preload exposes only signed-in/account/error state.

- [ ] **Step 5: Verify green and commit**

```bash
npm run test:unit -- device-flow
npm --prefix pc-app test
git add api/_lib/deviceFlow.js api/auth/[...path].js components/DeviceAuthPage.tsx pc-app
git commit -m "feat(auth): add scoped device flow and Electron secret handoff"
```

## Task 6: Add normalized Chat persistence and reversible history migration

- [ ] **Step 1: Write failing repository/migration tests**

Cover account isolation, bounded messages, tombstones, client purge acknowledgements, every migration state, shadow/backfill/verify, full 90-day reverse synchronization, daily encrypted snapshots, 180-day change log, isolated restore/replay, and no empty-merge deletion.

- [ ] **Step 2: Run red**

```bash
npm run test:unit -- chat-migration
npm run test:db -- migration
```

Expected: missing Chat repository/migration worker.

- [ ] **Step 3: Implement chat repository/resources**

`GET/PATCH/DELETE /api/chat` supports conversations/messages/memory/usage/tombstone resources. Browser never submits full history. Every delete writes a tombstone and change-log event.

- [ ] **Step 4: Implement migration worker**

Resumable per-account cursor, checksums/counts, quarantine, shadow write, normalized-primary read, legacy reverse write, snapshot/change-log recovery, and restore drill.

- [ ] **Step 5: Add bounded IndexedDB cache**

No token, base64, unbounded history, or cross-account key. Purge on tombstone and acknowledge after next authenticated sync.

- [ ] **Step 6: Verify green and commit**

```bash
npm run test:unit -- chat-migration
npm run test:db -- migration
git add api/_lib/{chatRepository,chatMigration}.js api/chat.js services/chatService.ts services/chatCache.ts components/AppSidebar.tsx tests
git commit -m "feat(chat): add normalized history and reversible migration"
```

## Task 7: Add private media, image generation, TTS, and language support

- [ ] **Step 1: Write failing media/TTS tests**

Cover direct signed upload, 10 MiB image/25 MiB audio, ownership, magic bytes/decodability, active-content rejection, private download headers, tombstone/finalizer, client purge acknowledgement, image saga cleanup, usage once, TTS locale/fallback, and no base64 persistence.

- [ ] **Step 2: Run red**

```bash
npm run test:unit -- media-validation
npm run test:integration -- media
```

Expected: missing storage/media routes.

- [ ] **Step 3: Implement private storage adapter**

Use canonical Vercel env `BLOB_READ_WRITE_TOKEN`. Production must fail if private direct upload/download cannot enforce ownership. Preview uses a deterministic fake adapter.

- [ ] **Step 4: Implement media/image/TTS actions**

- upload initiation/complete/download resources;
- `action=image.generate` through Router;
- `action=tts.generate` through registered TTS adapter;
- assistant language `auto|en|si|ta` with explicit BCP-47 locale.

Router returns image result; Chat owns and stores the attachment.

- [ ] **Step 5: Verify green and commit**

```bash
npm run test:unit -- media-validation
npm run test:integration -- media
git add api/_lib/{storage,mediaValidation,ttsClient}.js api/chat.js services components tests
git commit -m "feat(media): add private images multilingual TTS and deletion"
```

## Task 8: Route Chat through intent, Router, and private Tools search with canonical usage

- [ ] **Step 1: Write failing intent/freshness/client/usage tests**

Cover all four deterministic/ambiguous routes, cheap fallback through Router, no hard-coded year, freshness query minimization, no-store POST, service assertion, untrusted evidence, outbox-before-billable, reserve/finalize/refund idempotency, 10-minute reconciliation, 24-hour refund, and no direct provider call.

- [ ] **Step 2: Run red**

```bash
npm run test:unit -- intent freshness router-client tools-client usage-outbox
```

Expected: direct provider/legacy behavior.

- [ ] **Step 3: Implement `chatTurn` orchestration**

Order: BFF/account state → protected outbox → usage reservation → user message → language/intent/freshness → Tools POST if required → Router alias → assistant/citations/attachments → usage finalization → response.

- [ ] **Step 4: Remove direct generative providers from v2**

No direct OpenRouter/Groq/Gemini/Pollinations text or image path may be reachable when `chat_v2` is enabled. Disabled flags return stable capability errors, not insecure fallback.

- [ ] **Step 5: Implement reconciliation worker**

At 10 minutes query Router private attempt endpoint; at 24 hours mark expired/refund and retain late provider cost facts without second user charge.

- [ ] **Step 6: Verify green and commit**

```bash
npm run test:unit -- intent freshness router-client tools-client usage-outbox
git add api/_lib/{intent,freshness,routerClient,toolsClient,chatTurn,workers,consent}.js api/chat.js
git commit -m "feat(chat): route through Router Tools and canonical usage"
```

## Task 9: Replace frontend auth/history/media/localStorage behavior

- [ ] **Step 1: Write failing component/security tests**

Cover auth panel, session list/revoke, identity linking, consent, language, media failure, device approval, normalized history, no token/base64/PDF/TXT path, real 401 sign-in, cache tombstone purge, and three-language UI strings.

- [ ] **Step 2: Run red**

```bash
npm run test:components
```

Expected: missing components and current localStorage history/token behavior.

- [ ] **Step 3: Implement services/components**

Create `apiClient`, `accountService`, `chatService`, `chatCache`; add AuthPanel, SessionList, IdentityLinkPanel, ConsentPanel, LanguageSelector, MediaAttachment. All browser mutation requests use same-origin cookies, CSRF header, request IDs, and typed platform errors.

- [ ] **Step 4: Modify Chat/UI/App**

Remove browser bearer/profile/local history/base64 media/PDF/TXT upload and unlimited/no-signup/local-only/Gemini claims. Add chain/search status/language/media/consent UI. Preserve math, Telegram, downloads, themes, legal, and unrelated features.

- [ ] **Step 5: Fix service worker and browser config**

Remove missing Firebase import and never cache auth/API/media/callback responses. Remove browser exposure of model keys.

- [ ] **Step 6: Verify green and commit**

```bash
npm run typecheck
npm run test:components
npm run test:security
git add App.tsx index.tsx index.html public/sw.js services components types.ts translations.ts
git commit -m "feat(web): adopt secure sessions normalized media and truthful copy"
```

## Task 10: Remove obsolete routes/files after compatibility gates

- [ ] **Step 1: Add failing dead-code/static tests**

Fail while any v2 import reaches `omni.js`, `sessionService`, `geminiService`, custom password auth, direct provider package, base64 history, or empty-merge delete. Verify function allowlist still passes.

- [ ] **Step 2: Run red**

```bash
npm run test:contract -- obsolete
```

Expected: legacy references.

- [ ] **Step 3: Remove obsolete v2 paths**

Delete listed obsolete files only after compatibility adapters and all current/previous supported clients pass. Preserve unrelated dormant math/Telegram features.

- [ ] **Step 4: Verify full local gate**

```bash
npm run typecheck
npm run test:platform
npm run test:contract
npm run test:unit
npm run test:security
npm run test:db
npm run verify:functions
npm run build
git diff --check
```

Expected: no direct provider/browser bearer/base64 path, at most 10 functions, and all tests pass in fake mode.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove legacy browser auth and direct providers"
```

## Task 11: Add fake-preview E2E and canary evidence

- [ ] **Step 1: Implement deterministic preview adapters**

Preview must fail startup if any live model/search/TTS/image adapter can resolve. Fixtures cover auth/session, four aliases, pre/post-commit stream failure, weather, media, deletion, quota, outbox, and cross-account isolation.

- [ ] **Step 2: Add Playwright scenarios**

Email fixture login, Google fixture login/linking, session renewal/revoke, device approval, four chains, citations, three languages, TTS/browser fallback, image attachment, history reload/delete, usage/audit, and errors.

- [ ] **Step 3: Run full preview gate**

```bash
ORIN_PROVIDER_MODE=fake npm run test:e2e
npx vercel build
```

Expected: no live provider call and all scenarios pass.

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts tests/e2e
git commit -m "test: prove fake-provider Chat vertical slice"
```

## Task 12: Push Core/Chat PR and deploy with flags off

- [ ] **Step 1: Push**

```bash
git config user.name "Januth Nimnal"
git config user.email "nimnaljanuth@gmail.com"
git push -u origin release/platform-v1.0.0-core
gh pr create --base main --head release/platform-v1.0.0-core --title "feat: deliver Neon Core and Orin Chat v2" --body-file docs/releases/orin-chat-v4.1.0-pr.md
```

- [ ] **Step 2: Verify preview and migrations**

Run migration/RLS/session/migration/restore tests against an isolated Neon branch, deploy fake Vercel preview, and record URLs/logs.

- [ ] **Step 3: Merge only after required checks**

Deploy identity/schema code with `identity_v2`, `router_v2`, `search_v2`, and `chat_v2` disabled.

- [ ] **Step 4: Enable canaries in order**

After Router and Tools are merged and report the same platform SHA: `identity_v2` → `router_v2` → `search_v2` → `chat_v2`, using the approved 5%/25%/100% thresholds and automatic rollback rules.

## Requirement-to-task coverage

- Platform pin, config, migrations, RLS: Tasks 1–2.
- Neon email/Google convergence and migration: Task 3.
- 30-day BFF/session/revocation: Task 4.
- Device and one Orin account for desktop/CLI-ready flow: Task 5.
- Normalized private history and reversible migration: Task 6.
- Images, TTS, private storage, English/Sinhala/Tamil: Task 7.
- Four intent chains, freshness search, Router-only generation, usage/events: Task 8.
- Secure frontend/no localStorage token/base64: Task 9.
- Obsolete-path removal/function budget: Task 10.
- Preview/E2E/push/canary: Tasks 11–12.
