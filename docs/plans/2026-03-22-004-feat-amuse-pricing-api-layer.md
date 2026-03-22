---
title: "feat: Amuse — Pricing Intelligence API Layer (Phase 4)"
type: feat
status: draft
date: 2026-03-22
depends_on: "2026-03-22-003-feat-amuse-pricing-intelligence-core"
---

# Phase 4: Pricing Intelligence API Layer

This phase focuses on safely exposing the internal pricing intelligence service layer to external consumers (specifically the React operations frontend and the POS integration) using Frappe's `@frappe.whitelist` routing.

## 1. Price Change APIs (`amuse/api/price_change.py`)
These endpoints expose the immutable logs and allow timeline reconstruction.
- `@frappe.whitelist(allow_guest=False)`: `get_price_change_log_list(filters)` -> Returns paginated logs.
- `@frappe.whitelist(allow_guest=False)`: `get_price_change_log(name)` -> Returns a single log's context.
- `@frappe.whitelist(allow_guest=False)`: `get_item_price_history(item_code)` -> Returns chronological regimes for timeline UI.
- `@frappe.whitelist(allow_guest=False)`: `trigger_snapshot_rebuild(name)` -> Admin re-trigger.

## 2. Analytics APIs (`amuse/api/analytics.py`)
These endpoints expose the snapshot metrics aggregated by the background jobs.
- `@frappe.whitelist(allow_guest=False)`: `get_price_regime_summary(log_name)`
- `@frappe.whitelist(allow_guest=False)`: `get_before_after_comparison(log_name)`

## 3. UI React Query Mapping (Frontend)
- Create `frontend/src/api/pricing.ts` providing isomorphic typings for these Frappe endpoints.
- Map endpoints to TanStack React Query Hooks (`usePriceChangeLogs()`, `useItemPriceHistory()`).

## Standard Response Wrapper
All APIs will conform to the strict JSON response shape:
```python
return {
    "ok": True,
    "data": { ... },
    "meta": { "generated_at": frappe.utils.now() }
}
```
