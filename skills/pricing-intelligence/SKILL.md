---
name: pricing-intelligence
description: >
  Price change tracking, logging, and analytics. Automatically detects 
  Item Price modifications, creates immutable change logs, and computes 
  regime snapshots showing revenue impact of price changes. Consult this 
  skill for price history, change auditing, or pricing analytics.
category: features
---

# Pricing Intelligence System

## Overview

The Pricing Intelligence system provides complete audit and analytics capabilities for price changes:

- **Automatic Change Detection**: Hooks into Item Price save events
- **Immutable Audit Log**: Every structural price change is logged
- **Change Reasons**: Track why prices changed
- **Regime Analytics**: Compute revenue metrics for price periods
- **Background Snapshots**: Async computation of historical impact

## Key Files

### Backend

| File | Purpose |
|------|---------|
| `amuse/services/price_change_detector.py` | Detects and handles Item Price changes |
| `amuse/services/price_change_logger.py` | Creates and updates Price Change Logs |
| `amuse/services/analytics_snapshot.py` | Computes regime analytics from Sales Invoices |
| `amuse/api/price_change.py` | API endpoints for price change queries |
| `amuse/api/analytics.py` | API endpoints for price analytics |
| `amuse/jobs/snapshot_jobs.py` | Background job runner for snapshots |
| `amuse/hooks.py` | Doc events wiring (Item Price on_insert/on_update) |
| `amuse/amuse/doctype/price_change_log/` | Price Change Log doctype |
| `amuse/amuse/doctype/price_change_reason/` | Price Change Reason doctype |
| `amuse/amuse/doctype/pricing_settings/` | Pricing Settings doctype |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/src/pages/PricingWorkspace.tsx` | Price change log viewer and management |
| `frontend/src/pages/PriceImpactDashboard.tsx` | Price impact analytics dashboard |
| `frontend/src/hooks/usePricing.ts` | React Query hooks for pricing data |
| `frontend/src/api/pricing.ts` | API client functions |

## How It Works

### Change Detection Flow

```
User saves Item Price in ERPNext
           ↓
Doc event triggered (on_insert or on_update)
           ↓
handle_item_price_change() called
           ↓
Is structural change? (rate, valid_from, valid_upto)
           ↓
extract_change_context() builds change record
           ↓
create_pending_price_change_log() creates log
           ↓
Background job enqueued for snapshot computation
```

### Regime Snapshot Computation

```
Background job runs
           ↓
process_regime_snapshot(log_name)
           ↓
Query Sales Invoice lines for item in date range
           ↓
Compute aggregates: qty, revenue, discounts, customers
           ↓
Calculate realized price vs expected at base price
           ↓
Update Price Change Log with snapshot data
```

### Metrics Computed

| Metric | Description |
|--------|-------------|
| `total_revenue` | Net revenue from invoices |
| `total_qty` | Units sold |
| `average_realized_price` | Revenue / Qty |
| `total_discount_value` | All discounts applied |
| `unique_customers` | Distinct customers |
| `new_customers` | First-time buyers |
| `pricing_rule_discount_value` | Auto-applied discounts |
| `manual_discount_value` | Line-level manual discounts |
| `coupon_discount_value` | Coupon code discounts |

## Extension Points

### Adding Custom Change Reasons

Add records to Price Change Reason doctype via Desk or fixtures.

### Custom Snapshot Metrics

Extend `_aggregate_sales_invoice_lines()` in `analytics_snapshot.py` with additional SQL aggregations.

### Triggering Manual Snapshots

```python
from amuse.jobs.snapshot_jobs import run_price_regime_snapshot
frappe.enqueue("amuse.jobs.snapshot_jobs.run_price_regime_snapshot", 
               queue="long", log_name="PCL-00001")
```

## Dependencies

- **ERPNext**: Item Price, Sales Invoice, Sales Invoice Item
- **permissions-rbac**: `pricing.view`, `pricing.edit_prices`, `pricing.trigger_snapshot`
- **analytics-snapshot**: Background job infrastructure

## Gotchas

1. **Company Resolution**: Item Price has no company field, but Price Change Log requires it. Resolution order:
   - Item Default company
   - Global Defaults default_company
   - Any existing Company

2. **Snapshot Status Lifecycle**: 
   - `Pending` → `Completed` (or `Failed`)
   - Failed snapshots can be re-triggered via API

3. **Date Range Boundaries**: The regime snapshot uses inclusive date range (`>= valid_from AND <= valid_upto`).

4. **Return Invoices Excluded**: Sales Invoice lines from returns (`is_return=1`) are explicitly excluded.

5. **Currency Handling**: All aggregations use base currency (company currency) fields (`base_net_amount`, etc.) for consistency.

6. **Change Type Classification**:
   - `New Price` - First-time price setup
   - `Rate Change` - Price rate modified
   - `Validity Change` - Date range modified

7. **Custom Fields Required**: The ERPNext Item Price doctype must have custom fields `custom_change_reason` and `custom_change_notes`.
