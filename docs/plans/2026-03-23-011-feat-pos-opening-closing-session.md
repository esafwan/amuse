---
title: "feat: POS session — opening, closing, and related operations"
type: feat
status: in_progress
date: 2026-03-23
depends_on:
  - "2026-03-22-002-feat-amuse-billing-pos-plan"
  - "2026-03-22-010-agent-execution-plan"
related_skills:
  - ".skills/syntax/frappe-syntax-whitelisted"
  - ".skills/syntax/frappe-syntax-controllers"
  - ".skills/testing/frappe-testing-unit"
  - ".skills/testing/frappe-testing-cicd"
compound_docs: ".claude/skills/compound-docs/SKILL.md"
---

# feat: POS session — opening, closing, and related operations

## Purpose

Deliver **first-class POS shift lifecycle** in the Amuse SPA: **open shift** (already partially wired), **close shift** (missing), and **related session UX** (status, balances, handoff hints), while **delegating accounting truth to ERPNext** (POS Opening Entry, POS Closing Entry, linked documents).

This plan is written for **Compound Engineering**: small verifiable objectives, explicit verification, a **living progress log**, and **post-resolution docs** in `docs/solutions/` when non-trivial issues are fixed.

---

## Compound Engineering — how this plan is maintained

| Practice | Application |
|----------|----------------|
| **Atomic objectives** | Each group below is independently testable (bench + browser + optional unit test). |
| **Verify before closing** | Every group lists pass criteria; no merge without them. |
| **Living document** | Update the **Progress log** table when a group materially advances. |
| **Institutional memory** | After non-trivial bugs (validation errors, ERPNext edge cases, multi-currency), capture a resolution under `docs/solutions/<category>/` using **compound-docs** (`.claude/skills/compound-docs/SKILL.md`) and YAML frontmatter per `schema.yaml`. |
| **Implementation skills** | Whitelisted APIs: `.skills/syntax/frappe-syntax-whitelisted`. DocType lifecycle: `.skills/syntax/frappe-syntax-controllers`. Tests: `.skills/testing/frappe-testing-unit` and `.skills/testing/frappe-testing-cicd`. |
| **E2E map** | Extend `amuse/tests/E2E_TEST_PLAN.md` when new routes or API contracts are added. |

---

## Current state (baseline)

| Area | Today | Gap |
|------|--------|-----|
| **Backend** | `amuse.api.pos.check_opening`, `create_opening`, `get_profile`, `get_items`, … | No whitelisted **close** path; no **session summary** (opening doc, posting time, expected vs counted cash). |
| **Frontend** | `POSView` uses `useOpeningEntry`; empty state when no session; no **Close shift** flow. | Opening may still be Desk-only mentally; closing entirely missing. |
| **ERPNext** | `POS Opening Entry`, `POS Closing Entry`, `point_of_sale.py` helpers for opening. | Closing is driven from **standard POS page** / DocType forms; we must **discover and wrap** the same entry points ERPNext uses (avoid inventing parallel GL logic). |
| **Billing coupling** | POS creates `Sales Invoice` with `is_pos`; payments auto-filled in `amuse.api.billing` for submit. | Closing entry behaviour may differ for **POS Invoice** vs **Sales Invoice** paths — **risk** to validate early. |

---

## Objective Group A — Discovery & contract (no feature UI yet)

**Goal:** Map ERPNext’s supported flows for closing and any required preconditions (draft invoices, consolidated invoices, merge logs).

**Tasks**

1. Trace **POS Closing Entry** creation in ERPNext (Desk POS or `pos_closing_entry.py`): required fields, `get_payment_reconciliation_details` or equivalent, link to **POS Opening Entry**.
2. Confirm site **POS Settings** (`invoice_type`, consolidation) impact on **Sales Invoice**-based Amuse POS.
3. Document the **minimal API surface** Amuse needs (method names, arguments, return shapes) in this file’s appendix or in `.ref/` if raw notes are long.

**Verification**

- Short written **appendix** in this plan (or linked note) listing callable ERPNext functions and constraints.
- `bench --site <site> console` one-liner proves a **test closing** path on a dev site (or documented “blocked by X” with ticket).

**compound-docs:** If discovery surfaces a non-obvious ERPNext constraint, add `docs/solutions/integration-issues/…` when resolved.

---

## Objective Group B — Backend: session lifecycle API

**Goal:** Extend `amuse/api/pos.py` with **whitelisted**, typed wrappers around ERPNext closing (and optional helpers for session metadata).

**Tasks**

1. Add **`get_opening_details(name)`** or enrich `check_opening` response if the SPA needs more than today’s list (e.g. opening entry name, period start, profile, company).
2. Add **`create_closing`** (name TBD) wrapping ERPNext’s established pattern:
   - Inputs: at minimum `pos_opening_entry` or opening name, `pos_profile`, `company`, **payment reconciliation** / counted amounts (shape TBD from Group A).
   - Output: submitted `POS Closing Entry` dict or clear error.
3. Optional: **`get_closing_preview`** (if ERPNext exposes reconciliation fetch without submit) to drive the close UI.
4. Follow **frappe-syntax-whitelisted**: stable argument types (`str | list | dict` + JSON strings where the SPA sends JSON), explicit docstrings, no business logic duplication beyond orchestration.

**Verification**

- `bench execute` smoke for each new method on a site with an **open** session.
- `amuse.tests.test_api_smoke` extended with **skipped** tests when no opening exists, or lightweight **unit tests** with mocked `frappe.get_doc` if appropriate per `.skills/testing/frappe-testing-unit`.

**compound-docs:** If a **ValidationError** (e.g. “pending invoices”) is common, document under `docs/solutions/logic-errors/` or `integration-issues/`.

---

## Objective Group C — Frontend: opening UX hardening

**Goal:** Operators can **start a shift from the SPA** without Desk, with clear validation errors.

**Tasks**

1. Replace or supplement **alert()-based** flows with in-app modal / inline errors (align with design tokens in `index.css`).
2. **Opening form:** POS profile (if multiple), company, **balance_details** per mode of payment from profile (mirror ERPNext opening voucher).
3. On success: invalidate **`useOpeningEntry`** / POS queries; show **session chip** (profile name, open since).

**Verification**

- Browser: open shift → grid loads; refresh → session persists.
- Network: `create_opening` returns 200; no uncaught console errors.

---

## Objective Group D — Frontend: closing UX

**Goal:** **Close shift** from SPA with reconciliation UI and post-close state.

**Tasks**

1. **Entry point:** “Close shift” in POS shell (top bar or panel) visible only when `check_opening` returns a session.
2. **Close modal:** show modes of payment from profile / opening; inputs for counted amounts; optional notes; call **`create_closing`**.
3. **After close:** clear local cart state; show **success** + link to Desk **POS Closing Entry** (optional); return to **no session** empty state.
4. Handle ERPNext errors (pending POS/SI documents) with readable copy and doc link if applicable.

**Verification**

- Browser: full cycle **open → sell (optional) → close** on demo site.
- `E2E_TEST_PLAN.md` row updated for POS session lifecycle.

---

## Objective Group E — Seed, E2E, and operator docs

**Goal:** Repeatable QA and handoff.

**Tasks**

1. Extend **`seed_demo`** or **`seed_pricing_intel_demo`** pattern: optional **`seed_pos_session`** helper or documented **bench** sequence for “open + close” dry run.
2. Update **`amuse/tests/E2E_TEST_PLAN.md`** §commands and §route matrix for close shift.
3. If **capability-based permissions** land (execution plan Group 2), gate **open/close** with `pos.open_session` / `pos.close_session`; until then, document “all authenticated users” behaviour.

**Verification**

- CI-friendly: `bench run-tests --module amuse.tests.test_api_smoke --lightmode` green.
- Manual checklist in E2E completed once per release candidate.

---

## Objective Group F — Permissions (when Group 2 exists)

**Goal:** Align with **execution plan** capabilities.

| Capability | Action |
|------------|--------|
| `pos.open_session` | Show / allow **Open shift** |
| `pos.close_session` | Show / allow **Close shift** |
| `pos.use` | POS catalog + cart (existing intent) |

Until `amuse/permissions.py` exists, **skip** implementation but keep hooks in this plan so Group 2 can wire quickly.

---

## Risks & decisions

| Risk | Mitigation |
|------|------------|
| **Sales Invoice vs POS Invoice** closing semantics | Validate in Group A; Amuse may need different ERPNext code paths per POS Settings. |
| **Consolidated / merge logs** | Closing may require no pending merge; surface ERPNext message verbatim + doc link. |
| **Multi-user / multi-profile** | `check_opening` is user-scoped; document that managers use correct Frappe user. |

---

## Suggested execution order

```
A (discovery) → B (API) → C (opening UX) → D (closing UX) → E (seed/E2E) → F (permissions, parallel when ready)
```

Groups **C** and **B** can overlap once opening field shapes are known; **D** depends on **B**.

---

## Success criteria (release-level)

1. Operator can **open** and **close** a POS session from `/amuse/pos` on a standard ERPNext retail setup used by the project.
2. No duplicate GL logic in Amuse — only **whitelisted wrappers** over ERPNext.
3. **E2E_TEST_PLAN** and **smoke tests** cover the new API surface.
4. Non-trivial production issues documented under **`docs/solutions/`** per compound-docs.

---

## Progress log (living)

| Group | Focus | Status | Notes |
|-------|--------|--------|--------|
| **A** | ERPNext closing discovery | **Done** | `make_closing_entry_from_opening`, `get_invoices` in `pos_closing_entry.py`; Sales Invoice path requires `is_created_using_pos`, submitted SI. |
| **B** | `pos.py` close + session API | **Done** | `list_pos_profiles`, `get_closing_preview`, `submit_pos_closing`; empty payment table backfilled from opening floats. |
| **C** | Opening UX | **Done** | SPA open-shift form from profile payment modes. |
| **D** | Closing UX | **Done** | Close shift modal + counted amounts; billing `create_invoice` sets `is_created_using_pos`. |
| **E** | Seed / E2E | **Partial** | Smoke tests + E2E matrix updated; seed unchanged. |
| **F** | Capability gates | **Blocked** | Until execution plan Group 2 |

---

## Document history

| Date | Change |
|------|--------|
| 2026-03-23 | Initial plan: POS opening/closing/session features under Compound Engineering. |
| 2026-03-23 | Implemented: `list_pos_profiles`, `get_closing_preview`, `submit_pos_closing`; POS UI open/close; `is_created_using_pos` on POS `create_invoice`. |

---

## Appendix: ERPNext hooks used

| Function | Module | Role |
|----------|--------|------|
| `make_closing_entry_from_opening(opening_doc)` | `erpnext.accounts.doctype.pos_closing_entry.pos_closing_entry` | Builds draft **POS Closing Entry** with `sales_invoices` / `pos_invoices` and `payment_reconciliation`. |
| `get_invoices(start, end, pos_profile, user)` | same | Lists submitted POS/SI rows in period for closing. |
| `check_opening_entry` / `create_opening_voucher` | `erpnext.selling.page.point_of_sale.point_of_sale` | Existing Amuse wrappers unchanged. |
