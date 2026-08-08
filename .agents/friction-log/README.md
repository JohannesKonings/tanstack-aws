# Friction log

Local-only friction for this repository. Entries live here as files; GitHub Issues, `frog publish`,
`frog sync`, and cross-repo reporting are not used. Resolve with `vp exec frog resolve <id>`.

One directory per item:

```
<id>/
  friction.md   the write-up
  artifacts/    optional, whatever reproduces it
```

The whole directory is deleted once the friction is resolved. Every entry left here is still
outstanding.

Do not maintain an index here. This directory is the index.

## Logging Friction

`frog` is installed as a project dependency. Run it through Vite+:

```sh
vp exec frog list           # what is already known
vp exec frog log            # add one
vp exec frog resolve <id>   # remove one when fixed
```

`vp exec frog log` writes the sections to fill in. Each id is when the friction was hit plus its title, so
the directory reads oldest-first. Do not pass `--publish` or `--target`.

Put anything that reproduces the friction in that entry's `artifacts/` and reference it from the
write-up. The next reader runs the reproduction instead of rebuilding it.

## For Agents

Add these rules near the top of `AGENTS.md`, under the appropriate section. Create the file if missing; otherwise amend it in place, preserve all existing content, and never replace the file.

- Log papercuts and friction (tooling, docs, APIs, tests, conventions) as you hit them with `vp exec frog log`.
- Do not add global, system, or internal friction.
- Run `vp exec frog list` first to see what is already known.
- Keep entries local: do not run `frog publish`, `frog sync`, or `frog log --publish` / `--target`.
- When friction is fixed, remove it with `vp exec frog resolve <id>`.

Managed by [Frog](https://github.com/wevm/frog).
