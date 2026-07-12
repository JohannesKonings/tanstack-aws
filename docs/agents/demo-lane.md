# Demo lane agent workflow (v1)

Cloud agents working on the **demo lane** todos flow should use the canonical local path below. Vocabulary matches `CONTEXT.md` (**demo lane**, **production lane**, **todos backend**).

## Canonical local workflow

No AWS account, AWS credentials, `blocks dev`, or CDK deploy is required for demo lane v1.

1. **Install dependencies** (after pull or first clone): `vp install`
2. **Start dev server**: `vp dev`
3. **Open the todos demo**: navigate to `/demo/db-todo`
4. **Verify the loop**: create, list, update, and delete todos through the UI

`vp dev` is the single entry point. A custom Vite plugin spawns the **todos backend** (Blocks `DistributedTable` + `ApiNamespace`) as a local sidecar; TanStack Start REST routes at `/demo/api/todos` act as a facade over that backend. The TanStack DB collection keeps using `fetch` — see [ADR-0001](../adr/0001-aws-blocks-todos-integration.md) for the Vite sidecar + REST facade pattern.

## What not to do (v1)

| Avoid                               | Why                                                       |
| ----------------------------------- | --------------------------------------------------------- |
| `blocks dev`                        | Local dev is orchestrated by `vp dev`, not the Blocks CLI |
| AWS credentials / `cdk deploy`      | Demo lane v1 is local-only                                |
| Blocks sandbox / shareable AWS URLs | Out of v1 scope — deferred to a follow-up                 |
| Direct Blocks imports in React      | UI talks to `/demo/api/todos` REST, not Blocks RPC        |

## Production lane (separate)

The **production lane** is the existing custom CDK deployment for permanent and ephemeral AWS stages (main, prod, feature branches). Todos Blocks constructs embed in that stack via `BlocksBackend`, but that path is not part of the demo lane v1 agent workflow.

## Automated verification

The full-stack smoke test exercises the same path without a browser:

```bash
vp test src/webapp/routes/demo/-db-todo.smoke.test.ts
```

This spawns the Blocks sidecar, hits `/demo/api/todos` REST handlers, and renders the db-todo route against live sidecar data.
