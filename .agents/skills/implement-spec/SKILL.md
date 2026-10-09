---
name: implement-spec
description: 'Implement the result of /to-spec and /to-tickets in code.'
disable-model-invocation: true
---

You have been provided a spec. This spec should have tickets associated with it, describing how to implement the spec.

The issue tracker should have been provided to you. If not, tell the user to run `/setup-matt-pocock-skills`.

The goal is the entire spec implemented on a single **integration branch**, with every ticket resolved the way the issue tracker closes work.

The tickets are not a list of steps. They are a **task graph** with blocking relationships between them. This means there is always a **frontier** of tickets which are ready to be grabbed.

Communication to and from subagents should be sparse. Communicate primarily through **context pointers**: to the spec, tickets, research notes, and previous commits. Don't duplicate information already available via pointers.

**Implementer subagents** should be run in the background where possible for maximum concurrency.

The **primary checkout** is the working tree the user has open. It stays on the integration branch for the whole run. Ticket work happens in linked worktrees of this same repo, under `.worktrees/`, so edits stay inside the workspace.

## Steps

1. Read the spec and tickets to understand the task graph. Done when you can name the frontier.

2. (optional) Use an **exploration subagent** to conduct any exploration required by the tickets - relevant codebase files or external documentation. It writes markdown notes in `.explore/` at the root of the primary checkout and leaves them uncommitted. Linked worktrees omit untracked files from the primary checkout, so every later context pointer uses the absolute path of the note. Done when those notes exist, or when the tickets need no exploration. Leave `.explore/` in place at the end of the run.

3. Take the integration branch from the branch already checked out in the primary checkout. This step is done when that checkout is on a non-default branch, the tree is clean, and `.gitignore` contains `.worktrees/` and `.explore/`. Until then, stop with the matching ask below.
   - The default branch name is the part after `origin/` from `git symbolic-ref --short refs/remotes/origin/HEAD`. When that ref is missing, use `main` if `refs/heads/main` exists, otherwise `master`.
   - When `git branch --show-current` is empty, or it equals the default branch name, ask the user to switch the primary checkout to the branch they want. Creating that branch and checking it out belong to the user. Ask this whether the tree is clean or dirty.
   - When the integration branch is checked out and the primary checkout has uncommitted changes, ask the user to clear them.
   - When `.gitignore` lacks a `.worktrees/` line or an `.explore/` line, and `.gitignore` itself has no other uncommitted edits, add the missing lines and commit `.gitignore` alone on the integration branch with the message `Ignore agent worktrees and exploration notes.` When `.gitignore` already has unrelated uncommitted edits, ask the user to clear those first. When both lines are already present, skip the commit.

4. Use **implementer subagents** to implement each frontier ticket, each in its own linked worktree. `<ticket-id>` is the GitHub issue number, or the local ticket stem such as `01-slug`. From the primary checkout, at the integration branch tip:

   `git worktree add -b implement/<ticket-id> .worktrees/<ticket-id> <integration-branch>`

   The primary checkout stays on the integration branch. Each worktree uses its `implement/<ticket-id>` branch.

   Each implementer subagent:
   - confirms its worktree is based on the integration branch before starting, and resets onto it if not;
   - calls the Skill tool with `tdd` to build the ticket;
   - merges the integration branch tip into its own branch before reporting done

   Done when the subagent reports done and its branch contains the ticket's commits.

5. Once an **implementer subagent** completes, merge its work to the integration branch with a **merger subagent** running in the primary checkout. If the issue tracker closes work through PRs, or the user asks for one, open a draft PR after the first merge (a branch with no commits ahead of the default branch can't open one), marked as closing the spec and tickets. Then, when the worktree is clean:

   `git worktree remove .worktrees/<ticket-id>`
   `git branch -d implement/<ticket-id>`

   When the worktree still has uncommitted changes, stop and report it, and leave the worktree and branch in place. Done when the ticket is merged and the worktree is gone, or when you have stopped on a dirty worktree.

6. If this changes the **frontier** of available tickets, kick off more **implementer subagents** to work on the new tickets. This allows for maximum concurrency. Done when every newly ready ticket has a subagent.

7. Once all tickets are complete, call the Skill tool with `code-review` on the integration branch, in the primary checkout. Fix every issue the review raises with a single **implementer subagent** in that same checkout, committing the fixes on the integration branch. Done when those fixes are committed, or when the review raised nothing to fix.

8. If a draft PR exists, mark it ready for review. Otherwise, resolve each ticket the way the issue tracker closes work, and report the integration branch. Done when the PR or the tracker matches that outcome.

9. Remove any leftover implementer worktrees and their `implement/<ticket-id>` branches the same way as step 5. Leave the integration branch and `.explore/` in place. Done when no implementer worktrees remain.
