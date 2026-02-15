# Repository Guidelines

## Project Structure & Module Organization
This repository is currently documentation-first. The primary artifact is `PRD/StreamlinePRO.md` (MVP scope, requirements, and acceptance criteria). Keep product documentation under `PRD/`; if you add specs, create one file per topic (for example, `PRD/AuthAndRoles.md`). Use `StreamlinePRO/` for backend-related working files such as deployment notes, helper scripts, and environment templates. Avoid mixing rough notes with canonical specs; place temporary notes in a separate directory such as `notes/` if needed.

## Build, Test, and Development Commands
There is no application build pipeline yet (no `package.json`, `Makefile`, or test runner in repo root).
Use these commands for contributor workflow:
- `rg --files`: list project files quickly.
- `sed -n '1,120p' PRD/StreamlinePRO.md`: review PRD sections before editing.
- `npx markdownlint-cli2 "**/*.md"`: lint Markdown (if Node tooling is available).
- `npx prettier --check "**/*.md"`: check Markdown formatting.

## Backend Access & Server Safety
Backend server access:
- `ssh -i "/Users/himanshu/Downloads/Oracle Ubuntu/ssh-key-2025-06-08.key" ubuntu@141.148.218.107`

Safety policy for all contributors:
- Never delete anything on the backend server, even if permission is given in chat.
- Avoid destructive commands on the server (`rm`, `find -delete`, `git clean -fd`, or similar).
- Prefer read-only diagnostics first, then explicit non-destructive changes.

## Coding Style & Naming Conventions
Use clear, requirement-oriented Markdown:
- ATX headings (`##`), short sections, and task-focused bullets.
- Keep acceptance criteria explicit and testable.
- Use consistent product terms from the PRD (for example, `My Tasks`, `Waiting`, `Done`).

File naming conventions:
- Keep PRD documents in `PRD/`.
- Use descriptive `PascalCase.md` names to match current convention (example: `StreamlinePRO.md`).

## Testing Guidelines
Testing is currently document QA:
- Validate internal consistency (in-scope vs out-of-scope features).
- Ensure each user story has matching acceptance criteria.
- Run Markdown lint/format checks before opening a PR.

## Commit & Pull Request Guidelines
No Git history exists in this directory yet, so adopt Conventional Commits going forward:
- `docs(prd): clarify recurring task behavior`
- `docs(requirements): add project privacy acceptance criteria`

PRs should include:
- Brief summary of changes.
- Files/sections touched (for example, `PRD/StreamlinePRO.md`).
- Reason for change and expected product impact.
- Screenshots only when adding visual artifacts or mockups.
