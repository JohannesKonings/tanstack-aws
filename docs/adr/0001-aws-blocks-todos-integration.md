---
status: accepted
---

# AWS Blocks for todos with Vite sidecar and REST facade

TanStack AWS adopts AWS Blocks for the todos demo only (v1), while persons, SSE, AI, and hosting stay on the existing custom CDK production lane. Todos use `DistributedTable` and `ApiNamespace` in `aws-blocks/`, embedded in the CDK stack via `BlocksBackend` for production deploys.

Local development does not use the Blocks CLI as a separate entry point. Instead, `vp dev` orchestrates a custom Vite plugin that spawns the Blocks local backend as a sidecar. TanStack Start REST routes at `/demo/api/todos` translate to Blocks RPC — the TanStack DB collection keeps using `fetch`, not direct Blocks imports in React.

## Considered options

- **Canonical Blocks pattern** (frontend imports `api` from `aws-blocks/`): rejected because this repo teaches TanStack Start server routes and REST-backed collections; persons and other demos still follow that model.
- **Blocks `npm run dev` as the local entry point**: rejected — cloud agents should run one command (`vp dev`) aligned with the existing Vite+ toolchain.
- **KVStore**: rejected in favour of `DistributedTable` for structured todos and list-by-query access patterns.
- **Separate Blocks CDK app**: rejected — todos Blocks constructs embed in `lib/tanstack-aws.ts` to preserve stage lifecycle and GitHub CDK workflows.
- **Sandbox in v1**: deferred — local dev is sufficient to open the webapp, CRUD todos, and verify the loop; shareable AWS URLs are a follow-up.

## Consequences

- Permanent-stage cutover requires a human-triggered one-time migration script after a RETAIN deploy; ephemeral stages start fresh.
- A REST ↔ RPC translation layer lives in Nitro route handlers until an in-process Blocks integration spike (optional) may remove the sidecar HTTP hop.
