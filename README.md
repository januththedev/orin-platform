# Orin Platform

Canonical contracts, generated models, client adapters, security policy, observability primitives, and Orin UI tokens for the Orin ecosystem.

## Release contract

- Contract version: `1.0.0`
- Distribution: pinned Git submodule/tag `platform-v1.0.0`
- First-slice consumers: `Orin-AI`, `orin-router-service`, and `orin-tools`
- Deferred surfaces: MCP clients, user Router keys, public code execution, and the notes parser

## Local verification

```bash
npm ci
npm run check
```

The verification suite is hermetic. It must not call a model provider, search provider, Neon, Redis, Vercel, TTS, image, or any other live service.

## Repository layout

- `packages/contracts`: JSON Schema and generated models
- `packages/config`: strict environment/profile/feature configuration
- `packages/security`: URL/IP/DNS policy, token verification, envelope encryption
- `packages/observability`: privacy-safe events and durable outbox gate
- `packages/client`: authenticated HTTP/SSE and first-slice service adapters
- `packages/ui`: framework-neutral Orin tokens and accessibility primitives
- `packages/notes`: reserved namespace only
- `fixtures`: sanitized cross-language contract fixtures
- `product`: product and compatibility manifests
