# Todos Blocks cutover (permanent stages)

Human-triggered, one-time migration for **permanent stages** (`main`, `prod`). Ephemeral feature stages start with an empty Blocks todos table and **do not** run this script.

This follows [ADR 0001](../adr/0001-aws-blocks-todos-integration.md): migration is **not** automated via a CDK custom resource.

## Prerequisites

- AWS credentials with read access to the retained legacy todos table and write access to the Blocks todos table
- Region: `us-east-2` (`WORKLOAD_REGION`) unless overridden with `AWS_REGION`
- BlocksBackend deployed for the target stage ([#48](https://github.com/JohannesKonings/tanstack-aws/issues/48))

## Cutover sequence

1. **RETAIN deploy** — Deploy the CDK change that removes `WebappDatabaseTodos` from the stack while retaining the existing DynamoDB table in AWS (default DynamoDB removal policy).
2. **CDK swap** — Confirm `BlocksBackend` is live for the stage (nested stack + Blocks todos table).
3. **Migrate** — Run the one-time script (this document).
4. **Verify** — Exercise `/demo/db-todo` CRUD on the deployed stage and compare row counts.

## Run migration

```bash
# main
vp run migrate:todos -- --stage main

# prod
vp run migrate:todos -- --stage prod
```

`APP_STAGE` is accepted when `--stage` is omitted:

```bash
APP_STAGE=main vp run migrate:todos
```

### Output

The script prints:

- `Read` — legacy rows scanned (`pk = 'TODO'`)
- `Written` — rows copied into the Blocks table
- `Skipped` — invalid legacy rows or rows that already exist in the Blocks table (idempotent re-runs)

### Table resolution

| Table                | Default resolution                                                 | Override                      |
| -------------------- | ------------------------------------------------------------------ | ----------------------------- |
| Legacy (source)      | `ListTables` prefix `TanstackAwsStack-<stage>-WebappDatabaseTodos` | `LEGACY_DDB_TODOS_TABLE_NAME` |
| Blocks (destination) | `TanstackAwsStack-<stage>-BlocksBackend-tanstack-aws-todos-todos`  | `BLOCKS_DDB_TODOS_TABLE_NAME` |

Row shape is identical in both tables (`pk`, `sk`, `id`, `name`, `status`). The script uses conditional writes (`attribute_not_exists`) so re-running after partial success is safe.

## Verify

1. Open the deployed webapp todos demo (`/demo/db-todo`).
2. Create, update, and delete a todo.
3. Optionally compare legacy vs Blocks row counts (both should match after a successful first run).

## After verification

The retained legacy `WebappDatabaseTodos` table can be deleted manually once you are satisfied with the Blocks data. Keep it until verification is complete.

## Ephemeral stages

Feature-branch stages (`feature-*`) skip migration automatically:

```text
Ephemeral stage "feature-checkout" — migration skipped (permanent stages only: main, prod).
```
