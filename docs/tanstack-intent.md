# TanStack Intent in This Repo

This project uses TanStack Intent as a consumer workflow so agent skills shipped by installed packages can be loaded automatically for matching tasks.

TanStack Intent is installed locally as a dev dependency (not executed via `dlx`) so project automation uses a pinned, reviewed version from `package.json`.

## What is configured

- `AGENTS.md` contains an `intent-skills` block between:
  - `<!-- intent-skills:start -->`
  - `<!-- intent-skills:end -->`
- `package.json` exposes helper scripts:
  - `vp run intent:list`
  - `vp run intent:list:json`
  - `vp run intent:install`
- Local install command:
  - `vp add -D @tanstack/intent`

## Day-to-day workflow

1. Discover installed skill packages:
   - `vp run intent:list`
2. If dependencies changed, regenerate guidance text:
   - `vp run intent:install`
3. Update the `intent-skills` block in `AGENTS.md` based on discovered paths.

## Regenerate mappings after dependency updates

After running `vp install` or changing TanStack package versions:

1. Run `vp run intent:list:json` and review discovered package/skill paths.
2. Refresh the `AGENTS.md` mapping block so `task` and `load` entries match currently installed paths.

## Troubleshooting

### `No intent-enabled packages found.`

- Confirm dependencies are installed: `vp install`
- Re-run discovery: `vp run intent:list`
- Check that `node_modules` exists in the project root.
- If packages are installed globally only, install project-local dependencies so local paths can be mapped.

### Permission error from `pnpm dlx`

This repo no longer relies on `dlx` for Intent commands. Install/update the local package with `vp add -D @tanstack/intent` and run scripts through `vp run ...`.

### `stale` command is unavailable

The locally installed `@tanstack/intent` version may only provide `list` and `install`. If `stale` is required, wait for your cooldown window and then upgrade the local dependency with `vp add -D @tanstack/intent`.
