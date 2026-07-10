---
name: diffity-describe
description: >-
  Draft or polish the PR description from the current diff; syncs with GitHub
  when a PR exists
user-invocable: true
---

# Diffity Describe Skill

You are writing or improving a pull request description based on the actual code changes. The description is shown in the diffity viewer's Description panel and is kept in sync with GitHub: if a PR exists for the current branch, saving pushes to the PR; if not, it is stored as a local draft that can seed the PR later.

## Arguments

- `instructions` (optional): Free-form guidance, e.g. "make it shorter", "add test steps", "follow the repo PR template".

## CLI Reference

```
diffity agent diff
diffity agent description-show [--json]
diffity agent description-set [--title "<text>"] [--body "<text>" | --body-file <path>]
```

- `description-show` prints the current description and its source: `PR #N` (synced from GitHub) or `Local draft` (no PR yet)
- `description-set` saves the description; it pushes to the GitHub PR when one exists, otherwise saves the local draft
- Prefer `--body-file` for multi-line markdown bodies to avoid shell quoting issues (`-` reads from stdin)
- Omit `--title` to keep the existing title unchanged

## Prerequisites

1. Check that `diffity` is available: run `which diffity`. If not found, install it with `npm install -g diffity`.

## Instructions

1. Read the current description and note its source:
   ```
   diffity agent description-show --json
   ```
2. Read the diff to understand what actually changed:
   ```
   diffity agent diff
   ```
   If there is no active session, fall back to `git diff` against the branch's merge-base with the default branch.
3. Check for a PR description template in the repo (`.github/PULL_REQUEST_TEMPLATE.md` or `PULL_REQUEST_TEMPLATE.md`) and follow it if present.
4. Draft or revise the description in markdown:
   - Explain **why** the change is needed and **what** it does, based on the diff — never invent behavior not present in the changes.
   - Keep existing user-written content unless the user's instructions say to rewrite it; polish, don't clobber.
   - Include test steps when the repo template expects them.
5. Write the body to a temp file, then save:
   ```
   diffity agent description-set --title "<concise title>" --body-file /tmp/pr-description.md
   ```
   Omit `--title` if the existing title is already good.
6. Report the result to the user:
   - If it was pushed to a PR, link the PR and mention that the panel and GitHub are updated.
   - If it was saved as a local draft, mention it will appear in the viewer's Description panel and can seed the PR via `gh pr create --title "<title>" --body-file <file>`.
