# Orin First-Slice Cross-Repository Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create, push, review, merge, deploy, canary, and verify the Orin platform/Core/Chat/Router/Tools release train across the relevant GitHub repositories using the approved identity and contracts.

**Architecture:** Platform is released first and pinned by one immutable tag/SHA. Router and Tools are merged with flags off, then Core/Chat is merged and enabled in dependency order. Every consumer PR proves recursive submodule checkout, same-SHA fixtures, fake-provider preview, security tests, migrations, and rollback evidence.

**Tech Stack:** GitHub CLI/Actions, Git submodules, Vercel CLI/projects, Neon Auth/Postgres branches, Upstash Redis, Vercel private Blob, release matrix, canary metrics.

## Global Constraints

- Git author is exactly `Januth Nimnal <nimnaljanuth@gmail.com>` in every local repository.
- User explicitly authorizes creating, editing, deleting, and pushing relevant Git repositories for this goal; destructive repository deletion still requires evidence that the repository is truly superseded and all unique work is archived.
- No direct push to consumer `main`; use feature/release branches and PRs.
- One immutable platform SHA is used by Core, Router, and Tools.
- Production flags start off. No manual production hotfixes.
- Vercel previews require `ORIN_PROVIDER_MODE=fake` and no live provider credentials.
- Secrets are configured only in Vercel/GitHub secret stores; plans/logs contain names only.
- Provider integrations whose current official retention/training/region terms cannot be verified remain disabled in production, not guessed.
- Do not mark the ecosystem goal complete until the final completion audit maps every user-requested product to working evidence.

---

## Repository and branch matrix

| Repository | Baseline | Branch | Planned version/release |
|---|---|---|---|
| `orin-platform` | design commit `d391e2e` plus approved plan commits | `release/platform-v1.0.0` | tag `platform-v1.0.0` |
| `orin-router-service` | `9907eaac9a2f2a7df400b04a3240d849d5326a05` | `release/platform-v1.0.0-router` | `1.1.0` |
| `orin-tools` | `991fa5b65143efa2a813f9e959d49f7b47e5990f` | `release/platform-v1.0.0-tools` | `2.0.0` |
| `Orin-AI` | `91fbb1644f6b94b6aba36f824ce341f5446a99a7` | `release/platform-v1.0.0-core` then `...-chat` | `4.1.0` |
| `Orin-Router` | baseline at containment time | `security/p0-auth-containment` | security patch only |

## Task 1: Record the authenticated GitHub target and local baselines

- [ ] **Step 1: Verify GitHub CLI identity**

```bash
command -v gh
gh --version
GH_HOST=github.com gh auth status --hostname github.com
GH_HOST=github.com gh api --hostname github.com user --jq .login
```

Expected: host `github.com`, active account `januththedev`, no token value printed.

- [ ] **Step 2: Set identity in all active repositories**

```bash
for repo in orin-platform Orin-AI orin-router-service orin-tools Orin-Router; do
  git -C "$repo" config user.name "Januth Nimnal"
  git -C "$repo" config user.email "nimnaljanuth@gmail.com"
done
```

- [ ] **Step 3: Record immutable baselines**

Create `docs/releases/first-slice-baselines.md` with repository, branch, SHA, dirty state, Vercel project, current public routes, and current release/version. Run:

```bash
for repo in orin-platform Orin-AI orin-router-service orin-tools Orin-Router; do
  printf '%s ' "$repo"
  git -C "$repo" rev-parse HEAD
  git -C "$repo" status --short
done
```

Expected: clean working trees except intentional plan/spec edits in `orin-platform`.

- [ ] **Step 4: Commit plan evidence**

```bash
git -C orin-platform add docs/superpowers docs/releases
git -C orin-platform commit -m "docs: add Orin first-slice implementation plans"
git -C orin-platform push -u origin design/platform-chat-foundation
```

If `origin` does not exist, complete Task 2 before this push.

## Task 2: Create and push `januththedev/orin-platform`

- [ ] **Step 1: Confirm the repository does not already exist**

```bash
GH_HOST=github.com gh repo view januththedev/orin-platform --json nameWithOwner,visibility,url
```

Expected before creation: not-found. If it exists, inspect default branch/protection and attach `origin` instead of creating a duplicate.

- [ ] **Step 2: Create the public repository and remote**

```bash
gh repo create januththedev/orin-platform --public --source . --remote origin --description "Canonical Orin platform contracts, clients, security, observability, and UI"
```

- [ ] **Step 3: Push the approved design branch**

```bash
git -C orin-platform push -u origin design/platform-chat-foundation
```

- [ ] **Step 4: Establish main through PR**

Create the repository default branch as `main` only through the normal PR flow or an explicit empty initial README commit if GitHub requires a base branch. Open a PR containing the approved spec and plans, run link/diff checks, and merge.

- [ ] **Step 5: Verify remote state**

```bash
git -C orin-platform fetch origin
git -C orin-platform remote -v
git -C orin-platform ls-remote origin refs/heads/main
```

Expected: exactly one `origin` using HTTPS and remote main matching merged local main.

## Task 3: Complete P0 containment before feature deployment

- [ ] **Step 1: Patch `Orin-Router` auth bypass**

Create `security/p0-auth-containment` in `D:\Orin_ECOSYS\Orin-Router`, add a failing test for missing `ADMIN_PASSWORD` fallback and arbitrary password acceptance, fix the scoped variables/reference error, set `REQUIRE_API_KEY=true`, and set `AUTH_COOKIE_SECURE=true` in remote HTTPS environment.

- [ ] **Step 2: Disable unsafe public routes**

- Tools `/api/run` returns the planned 410 deny stub before Chat integration.
- Console live sharing is disabled in deployment configuration until Phase 9 passes.
- Any public unauthenticated Router instance is protected or removed.

- [ ] **Step 3: Remove/rotate exposed credentials**

Use GitHub secret scanning and the platform secret scanner. Remove literal credential material. Rotate database, provider, OAuth, signing, Blob, and Telegram credentials through their providers. Record only rotated/not-rotated status and affected environment names.

- [ ] **Step 4: Push and merge the security PR**

```bash
git -C Orin-Router push -u origin security/p0-auth-containment
gh pr create --repo januththedev/Orin-Router --base main --head security/p0-auth-containment --title "security: close Router auth bypass" --body-file D:/Orin_ECOSYS/Orin-Router/docs/releases/p0-auth-containment.md
```

Merge only after auth/security tests and deployment smoke pass.

## Task 4: Release `orin-platform`

Execute `2026-09-24-orin-platform-contracts-implementation.md` in full.

- [ ] **Step 1: Open and merge the platform release PR**

PR must include generated artifact hashes, fixture digest, CI matrix, secret scan, release manifest, and exact first-slice consumer list.

- [ ] **Step 2: Tag the merge commit**

```bash
git -C orin-platform switch main
git -C orin-platform pull --ff-only
git -C orin-platform tag -a platform-v1.0.0 -m "Orin platform contract release v1.0.0"
git -C orin-platform push origin platform-v1.0.0
```

- [ ] **Step 3: Verify a clean clone**

```bash
git clone --branch platform-v1.0.0 --depth 1 https://github.com/januththedev/orin-platform.git orin-platform-release-check
cd orin-platform-release-check
npm ci
npm run check
```

Expected: all checks pass, generated tree clean, fixture digest matches release manifest.

- [ ] **Step 4: Record immutable evidence**

`docs/releases/platform-v1.0.0.md` records tag, commit SHA, contract/schema versions, fixture digest, generated hashes, tool versions, CI URL, and release URL.

## Task 5: Configure GitHub and Vercel delivery gates

- [ ] **Step 1: Add CODEOWNERS/branch protection**

Protect `main` in platform and consumers. Require PR, review, contract/security checks, no force-push, no tag mutation, and signed/verified release tags where supported. CODEOWNERS covers platform pins, auth, migrations, security, fixtures, and Vercel config.

- [ ] **Step 2: Add reusable consumer contract workflow**

Consumer workflow checks out submodules recursively, verifies the expected platform SHA/digest, runs the consumer compatibility command, and uploads `platform-contract-report.json`. It uses pinned action SHAs.

- [ ] **Step 3: Configure Vercel projects**

Map existing projects for Core/Chat, Router, and Tools. Store only:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

Preview configuration:

```text
ORIN_ENV=preview
ORIN_RUNTIME_PROFILE=cloud
ORIN_PROVIDER_MODE=fake
```

Do not inject live provider credentials.

- [ ] **Step 4: Configure secret-service integrations**

Production uses Vercel project environment and approved Neon/Upstash/Blob/provider accounts. Missing required secret causes startup failure; no plaintext/in-memory fallback.

## Task 6: Merge Router and Tools dependencies before Chat

- [ ] **Step 1: Execute and push Router plan**

Open Router PR with platform SHA, exact five-function evidence, SQL/security tests, fake preview, and deferred-surface proof. Keep `router_v2` off.

- [ ] **Step 2: Execute and push Tools plan**

Open Tools PR with GET/POST privacy, quota outage, SSRF/redirect, weather, citation, run-disabled, and fake-preview evidence. Keep `search_v2` off.

- [ ] **Step 3: Merge serial order**

Merge Router first, then Tools. Both deployments must report the same platform SHA and `/v1`/search preview URLs.

- [ ] **Step 4: Record compatibility row**

Update the generated matrix with Router/Tools PR URLs, preview URLs, test reports, migration state, and `planned → preview → supported-with-flags-off` status.

## Task 7: Merge Core/Chat identity/data and final vertical slice

- [ ] **Step 1: Execute Core identity/data tasks**

Deploy migrations and BFF/device/normalized-data code with every v2 flag off. Verify isolated Neon branch, RLS, session concurrency, device approval, migration snapshot/restore, and private-media deletion.

- [ ] **Step 2: Execute final Chat tasks**

Deploy Core/Chat preview using the merged Router and Tools preview URLs. Run fake-provider E2E for all approved Chat acceptance criteria.

- [ ] **Step 3: Push/open/merge the Core/Chat PR**

PR records the same platform SHA, migration evidence, function count, browser E2E, security suite, privacy copy, direct-provider absence, and rollback flags.

- [ ] **Step 4: Keep flags off until production preflight**

Production deploy verifies required secret names, database roles, private Blob capability, Upstash, Core introspection, provider catalog policy, TTS/search registry, and fake/live adapter separation.

## Task 8: Run production canaries and rollback gates

- [ ] **Step 1: Enable flags in order**

Use a stable account hash cohort:

```text
identity_v2
router_v2
search_v2
chat_v2
```

- [ ] **Step 2: Apply 5%/25%/100% windows**

- 5% for at least 24 hours and 200 eligible requests.
- 25% for at least 24 hours and 500 eligible requests.
- 100% only after both windows pass.

- [ ] **Step 3: Enforce automatic rollback**

Rollback for any confirmed credential/authz/security event, usage mismatch above 0.1%, unexpected 5xx above 2%, stream terminal errors above 3%, p95 TTFT above eight seconds, search p95 above ten seconds, or forecast spend/usage 20% over budget for 15 minutes.

Reverse flag order: `chat_v2` → implicated `search_v2`/`router_v2` → `identity_v2`; security/usage incident disables all.

## Task 9: Verify external provider policies before production enablement

- [ ] **Step 1: Verify Neon Auth against official current docs**

Record official package/endpoints, exact issuer/audience/JWKS, email/password and Google methods, PKCE/state/nonce behavior, account-linking semantics, session APIs, and required env names. If the current integration cannot be proven, keep `identity_v2` off.

- [ ] **Step 2: Verify Vercel private Blob GA behavior**

Record official package/API for private store, signed upload, private download, ownership, content validation, and size limits. If direct private upload cannot be proven, keep media/image/TTS production flags off.

- [ ] **Step 3: Verify each provider registry/policy**

For model catalog, search/news/Wikipedia/weather, and TTS, record official endpoint, auth, limits, pricing/free status, retention, training, region, subprocessors, deletion, and attribution. No production enablement with unknown policy.

- [ ] **Step 4: Store evidence without values**

Commit sanitized markdown/JSON with URLs, review dates, policy versions, and approved/redacted status. Store credentials only in secret services.

## Task 10: Complete first-slice release evidence

- [ ] **Step 1: Generate compatibility matrix**

Include platform tag/SHA, contracts/schemas, migrations, consumer versions, preview/canary evidence, flags, adapter version, and status.

- [ ] **Step 2: Tag consumer releases**

After canaries pass:

```bash
git -C Orin-AI tag -a v4.1.0 -m "Orin Core and Chat 4.1.0"
git -C orin-router-service tag -a v1.1.0 -m "Orin Router inference 1.1.0"
git -C orin-tools tag -a v2.0.0 -m "Orin Tools search 2.0.0"
```

Push tags only from merged immutable commits.

- [ ] **Step 3: Record deployment and rollback evidence**

Record Vercel deployment IDs/URLs, commit SHAs, migration IDs, canary windows/metrics, feature flag state, and rollback tag/deployment.

## Task 11: First-slice completion audit

- [ ] **Step 1: Prompt-to-artifact checklist**

Map every approved first-slice requirement to one or more of:

- passing test name and command output;
- source file/line implementing it;
- migration/schema version;
- Vercel deployment URL and route;
- canary metric window;
- privacy/retention documentation;
- compatibility matrix row.

- [ ] **Step 2: Verify no proxy signals**

A green build, plan, manifest, or PR alone is insufficient. The audit must show the actual user path, runtime response, durable state, auth/scope enforcement, event/usage record, and rollback evidence.

- [ ] **Step 3: Record gaps**

Any missing, partial, uncertain, or unverified requirement keeps first-slice status incomplete. Do not mark the larger ecosystem goal complete; proceed to the next approved product gate.

## Requirement-to-task coverage

- Git identity/baselines: Task 1.
- Create/push platform: Task 2.
- P0 containment: Task 3.
- Platform release: Task 4.
- CI/branch protection/Vercel: Task 5.
- Router/Tools merge order: Task 6.
- Core/Chat merge: Task 7.
- Canary/rollback: Task 8.
- Official provider/policy verification: Task 9.
- Release tags/evidence: Task 10.
- Requirement-level completion proof: Task 11.
