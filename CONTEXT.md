# TanStack AWS

Examples demonstrating TanStack libraries on AWS, with a fast local-first path for agents and a full CDK path for production-style deployment.

## Language

**Demo lane**:
The AWS Blocks-based path for local development and sandbox deployment — fast feedback, no production CDK required.
_Avoid_: Local deploy, blocks mode, dev stack

**Production lane**:
The existing custom CDK deployment for permanent and ephemeral AWS stages (main, prod, feature branches).
_Avoid_: Real deploy, CDK path, legacy stack

**Demo lane v1**:
TanStack Start hosting plus a single todos data flow — local CRUD loop without persons, SSE, or AI.

**Todos backend**:
The todos API and storage — implemented with AWS Blocks `DistributedTable` and `ApiNamespace`, replacing the custom DynamoDB table and DDB client in every lane (local, sandbox, and production CDK).
_Avoid_: ddb-todos, blocks-todos, dual backend

**Todos production integration**:
Blocks embedded in the existing CDK stack via `BlocksBackend` — same `cdk deploy` workflow and stage lifecycle as today.
_Avoid_: Separate Blocks app, blocks-only deploy

**Todos data migration**:
On permanent stages, existing DynamoDB todos are migrated once (RETAIN old table → script → Blocks cutover). Ephemeral stages skip migration.
_Avoid_: Dual-read, big-bang redeploy, data loss

**Local dev**:
Vite+ (`vp dev`) is the single entry point. A custom Vite plugin spawns the Blocks local backend as a sidecar and proxies todo API traffic to it.
_Avoid_: blocks dev, dual dev servers, npm run dev

**Todos API boundary**:
TanStack Start REST routes (`/demo/api/todos`) are a facade over Blocks `ApiNamespace` — the collection keeps using `fetch`; handlers translate REST ↔ Blocks RPC.
_Avoid_: Direct Blocks imports in React, raw JSON-RPC in the UI

**Todos storage**:
`DistributedTable` — structured schema, query-based list access, aligned with Blocks' todo patterns and the existing `pk`/`sk` layout.
_Avoid_: KVStore, key-prefix scan

**Demo lane deploy progression (v1)**:
Local only — `vp dev` is sufficient to open the webapp, CRUD todos, and verify the loop. Sandbox and shareable AWS URLs are out of v1 scope.
_Avoid_: blocks sandbox, three-rung ladder

**Todos data migration (execution)**:
A one-time manual script (`vp run migrate:todos --stage <stage>`), human-triggered on permanent stages before or after the CDK cutover deploy.
_Avoid_: Custom resource Lambda, automated silent migration
