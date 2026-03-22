---
title: "feat: Amuse — Pricing Intelligence Core (Phase 3)"
type: feat
status: draft
date: 2026-03-22
depends_on: "2026-03-22-002-feat-amuse-billing-pos-plan"
---

# Phase 3: Pricing Intelligence Core

Follows the reference documentation architecture to decouple structural price observation from the native ERP system.

## 1. DocTypes
- Create `Price Change Log`
- Create `Price Change Reason`
- Create `Pricing Settings`

## 2. ERPNext Custom Field Patches
- Create standard Python patch for `Item Price` custom fields.

## 3. Services & Jobs
- Implement `price_change_detector.py`
- Implement `price_change_logger.py`
- Implement `snapshot_jobs.py`
- Implement `analytics_snapshot.py`

## 4. Hooks Wiring
- Attach `doc_events` to `Item Price` -> `handle_item_price_change`
- Attach `scheduler_events` for daily reconciliation.
