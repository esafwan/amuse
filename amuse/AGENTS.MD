# Amuse — Agent Guidelines (Compound Engineering)

**CRITICAL: ALL AI AGENTS (Gemini, Cursor, Claude, Opencode) MUST OBEY THESE RULES.** 
Any code assistant actively working in this repository must adopt the Compound Engineering methodology without exception.

## 1. No Premature Implementation
- **Plan First:** Always create or follow a detailed, step-by-step implementation plan (YAML frontmatter + markdown) in `docs/plans/` **before** writing any application code.
- **Break it down:** Break work into small, atomic tasks tracked via `task.md`.
- Wait for user approval on plans unless explicitly authorized to auto-proceed "phase by phase".

## 2. Using Frappe MCP & Data Skills
You have access to the Frappe backend via MCP and the `.agent/skills/frappe-data-access` skill. 
- **Query first:** Before assuming standard Frappe structures, use Frappe MCP to query metadata, doctypes, and settings directly.
- **Fallbacks:** If MCP auth fails, read the `frappe-data-access` skill to fix it, or fallback to REST API, bench console, or raw DB queries.

## 3. Bench & Container Testing
For end-to-end verification, you can run commands inside the running docker container:
- **Drop into container:** `docker exec -it fdocker_devcontainer-frappe-1 bash -c "cd /workspace/development/ainative/apps/amuse && exec bash"`
- **Bench commands:** In the container console, the bench path is `/workspace/development/ainative`. Run commands like `bench build --app amuse`, `bench --site [site] console`, or `bench execute`.
- **Bench build:** For frontend iterations, run `bench build --app amuse` inside the container or local mapping as appropriate to compile Vite outputs.

## 4. Browser-Wise Testing
- Always plan to perform manual browser-wise testing after completing UI or integration changes.
- Ensure the app behaves correctly in the browser, specifically checking API integration, CSRF tokens, authentication states, and React Query cache validation.

## 5. Capturing Problems (Compound Docs)
Any time of deep debugging or non-trivial fixes occur, use the `compound-docs` skill to capture the problem/fix in `docs/solutions/`.
- Validate the solution via MCP, bench console, or the browser UI before capturing it.
