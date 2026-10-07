# TanStack DS Registry Package

External shadcn registry publishing adapted TanStack Design System components for apps in this monorepo.

## Registry

**Registry item**:
A named entry in `registry.json` (e.g. `button`, `theme`) installable via `shadcn add @tanstack-ds/<item>`.
_Avoid_: npm package export, direct import

**Upstream catalog**:
The official copy-paste registry at [tanstack.com/ds](https://tanstack.com/ds). Check here when adding or refreshing registry items; track mappings in `UPSTREAM.md`.
_Avoid_: tanstack.com repo sync script, wipe-overwrite vendored tree
