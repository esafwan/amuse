ERPNext/Frappe already gives the base primitives we’ll build on: **Item Price** with **Valid From / Valid Upto**, **Pricing Rule**, **Promotional Scheme** that creates Pricing Rules, **Coupon Code**, and **RPC/REST access to whitelisted methods**. Frappe also supports **doc_events hooks**, **background jobs via `frappe.enqueue`**, and scheduled jobs via `scheduler_events`. ([Frappe Documentation][1])

---

# 1. Solution Summary

We will build a custom ERPNext app layer that does four things:

1. **Tracks structural price changes** on `Item Price`
2. **Snapshots prior-price performance** when a price changes
3. **Separates base price vs realized price erosion** from discounts/promotions
4. **Exposes APIs first** so Desk UI, custom app UI, website, and POS can all consume the same contract

This keeps ERPNext’s native pricing engine intact while adding the missing analytics and governance layer. Item Price remains the source of executable pricing; the custom app adds event history, attribution, and reporting on top. ([Frappe Documentation][1])

---

# 2. App Name

Suggested app name:

`pricing_intelligence`

---

# 3. File / Module Structure

```text
pricing_intelligence/
├─ pricing_intelligence/
│  ├─ hooks.py
│  ├─ api/
│  │  ├─ __init__.py
│  │  ├─ price_change.py
│  │  ├─ analytics.py
│  │  ├─ dashboard.py
│  │  └─ pos.py
│  ├─ services/
│  │  ├─ __init__.py
│  │  ├─ price_change_detector.py
│  │  ├─ price_change_logger.py
│  │  ├─ analytics_snapshot.py
│  │  ├─ discount_attribution.py
│  │  ├─ customer_metrics.py
│  │  └─ report_queries.py
│  ├─ jobs/
│  │  ├─ __init__.py
│  │  ├─ enqueue.py
│  │  ├─ snapshot_jobs.py
│  │  └─ reconciliation.py
│  ├─ doctype/
│  │  ├─ price_change_log/
│  │  │  ├─ price_change_log.json
│  │  │  ├─ price_change_log.py
│  │  │  └─ price_change_log.js
│  │  ├─ price_change_reason/
│  │  │  ├─ price_change_reason.json
│  │  │  └─ price_change_reason.py
│  │  └─ pricing_settings/
│  │     ├─ pricing_settings.json
│  │     └─ pricing_settings.py
│  ├─ patches/
│  │  ├─ add_custom_fields_to_item_price.py
│  │  └─ backfill_price_change_logs.py
│  ├─ public/
│  │  └─ js/
│  │     └─ price_change_log_dashboard.js
│  ├─ report/
│  │  ├─ price_change_register/
│  │  ├─ price_regime_performance/
│  │  ├─ price_realization_analysis/
│  │  └─ discount_erosion_report/
│  └─ utils/
│     ├─ dates.py
│     ├─ money.py
│     ├─ allocation.py
│     └─ validators.py
```

---

# 4. New DocTypes

## 4.1 `Price Change Log`

Main immutable event ledger.

### Core fields

* `item` (Link: Item)
* `item_name`
* `item_group`
* `brand`
* `company`
* `price_list`
* `currency`
* `channel`
* `territory`
* `location`
* `change_type`
* `change_timestamp`
* `changed_by`
* `source_of_change`

### Previous price snapshot

* `previous_item_price`
* `previous_rate`
* `previous_valid_from`
* `previous_valid_upto`
* `previous_enabled`

### New price snapshot

* `new_item_price`
* `new_rate`
* `new_valid_from`
* `new_valid_upto`
* `new_enabled`

### Business context

* `change_reason`
* `notes`
* `approval_reference`

### Closed-price analytics

* `days_active`
* `first_sale_date`
* `last_sale_date`
* `transaction_count`
* `invoice_count`
* `total_qty`
* `total_revenue`
* `expected_revenue_at_base_price`
* `average_realized_price`
* `revenue_per_day`
* `qty_per_day`
* `revenue_per_transaction`
* `qty_per_transaction`
* `unique_customers`
* `new_customers`
* `revenue_per_customer`

### Discount attribution

* `total_discount_value`
* `discount_pct_vs_base`
* `pricing_rule_discount_value`
* `promotional_scheme_discount_value`
* `coupon_discount_value`
* `invoice_level_discount_value`
* `manual_discount_value`
* `residual_discount_value`

### Control fields

* `snapshot_status` (`Pending`, `Completed`, `Failed`)
* `job_id`
* `regime_hash`

---

## 4.2 `Price Change Reason`

Optional master.

Fields:

* `reason_code`
* `reason_name`
* `is_active`

Examples:

* Margin Correction
* Seasonal Revision
* Promo Rollback
* Competitor Response
* Data Correction

---

## 4.3 `Pricing Settings`

Singleton for behavior flags.

Fields:

* `enable_price_change_tracking`
* `enable_discount_attribution`
* `enable_customer_metrics`
* `long_job_queue_name`
* `line_discount_allocation_method`
* `invoice_discount_allocation_method`
* `minimum_days_for_comparison`
* `default_company`

---

# 5. Custom Fields on Existing DocTypes

## 5.1 `Item Price`

Add custom fields:

* `custom_brand`
* `custom_channel`
* `custom_location`
* `custom_change_reason`
* `custom_change_notes`
* `custom_last_price_change_log`

These are for context only. Native Item Price remains unchanged functionally. Item Price already supports date-bounded pricing, which we’ll use as the regime boundary. ([Frappe Documentation][1])

## 5.2 `Sales Invoice` / `Sales Invoice Item`

No mandatory functional change.

Optional:

* `Sales Invoice.custom_coupon_code_snapshot`
* `Sales Invoice Item.custom_realized_discount_source`

Only if you want stronger attribution later.

---

# 6. Hooks

Use Frappe `doc_events` in `hooks.py`. Frappe supports document event hooks for plugging into lifecycle events. ([Frappe Documentation][2])

## `hooks.py`

```python
doc_events = {
    "Item Price": {
        "after_insert": "pricing_intelligence.services.price_change_detector.handle_item_price_change",
        "on_update": "pricing_intelligence.services.price_change_detector.handle_item_price_change",
    }
}

scheduler_events = {
    "daily": [
        "pricing_intelligence.jobs.reconciliation.run_daily_reconciliation"
    ]
}
```

Use background jobs for heavy work with `frappe.enqueue`; Frappe documents this pattern and supports queue selection such as `short`, `default`, and `long`. ([Frappe Documentation][3])

---

# 7. Core Function Map

## 7.1 Detection Layer

### File

`pricing_intelligence/services/price_change_detector.py`

### Functions

* `handle_item_price_change(doc, method=None)`
* `is_structural_price_change(doc, old_doc) -> bool`
* `extract_change_context(doc, old_doc) -> dict`
* `build_regime_key(doc, old_doc) -> str`

### Responsibility

* Compare current `Item Price` with old state
* Decide whether this is a meaningful structural change
* Enqueue snapshot job

---

## 7.2 Event Logging Layer

### File

`pricing_intelligence/services/price_change_logger.py`

### Functions

* `create_pending_price_change_log(change_context) -> str`
* `mark_snapshot_completed(log_name, snapshot_payload)`
* `mark_snapshot_failed(log_name, error_text)`

### Responsibility

* Write immutable event shell first
* Update only system-controlled snapshot fields

---

## 7.3 Snapshot Analytics Layer

### File

`pricing_intelligence/services/analytics_snapshot.py`

### Functions

* `build_previous_regime_window(change_context) -> dict`
* `get_sales_lines_for_regime(filters) -> list`
* `aggregate_regime_sales(lines) -> dict`
* `calculate_normalized_metrics(aggregate) -> dict`
* `calculate_price_realization(aggregate) -> dict`

### Responsibility

* Compute closed-period metrics for previous price regime

---

## 7.4 Discount Attribution Layer

### File

`pricing_intelligence/services/discount_attribution.py`

### Functions

* `attribute_discount_sources(lines) -> dict`
* `get_pricing_rule_impact(lines) -> dict`
* `get_coupon_impact(lines) -> dict`
* `get_promotional_scheme_impact(lines) -> dict`
* `allocate_invoice_level_discount(invoice, invoice_lines) -> dict`
* `compute_residual_discount(attribution) -> dict`

### Responsibility

* Split realized discount impact into known sources

Promotional Scheme is especially relevant because ERPNext uses it to create Pricing Rules, so attribution should treat those as related but distinguishable sources if business wants that view. ([Frappe Documentation][4])

---

## 7.5 Customer Metrics Layer

### File

`pricing_intelligence/services/customer_metrics.py`

### Functions

* `get_unique_customer_count(lines) -> int`
* `get_new_customer_count(lines, item_code=None) -> int`
* `calculate_revenue_per_customer(total_revenue, unique_customers) -> float`

### Responsibility

* Join line items to parent Sales Invoice to derive customer-level counts

---

## 7.6 Job Layer

### File

`pricing_intelligence/jobs/snapshot_jobs.py`

### Functions

* `run_price_regime_snapshot(price_change_log_name)`
* `run_bulk_backfill(from_date=None, to_date=None, item=None)`
* `retry_failed_snapshot(price_change_log_name)`

### Responsibility

* Background execution only

---

## 7.7 Reconciliation Layer

### File

`pricing_intelligence/jobs/reconciliation.py`

### Functions

* `run_daily_reconciliation()`
* `find_missing_logs()`
* `find_pending_logs()`
* `repair_incomplete_snapshots()`

### Responsibility

* Catch missed events, fix failed jobs, and keep analytics healthy

---

# 8. API-First Design

Frappe supports two useful layers here: standard REST resource APIs and `/api/method/...` calls for whitelisted methods. For app UI, custom frontend, and POS, the cleanest approach is to expose **whitelisted service APIs** first. ([Frappe Documentation][5])

## API namespace

Use whitelisted methods under:

`pricing_intelligence.api.*`

---

## 8.1 Price Change APIs

### File

`pricing_intelligence/api/price_change.py`

### Methods

#### `get_price_change_log_list`

Returns paginated list.

**Endpoint**
`/api/method/pricing_intelligence.api.price_change.get_price_change_log_list`

**Params**

* `item`
* `price_list`
* `brand`
* `channel`
* `from_date`
* `to_date`
* `snapshot_status`
* `limit_start`
* `limit_page_length`

#### `get_price_change_log`

Returns one full record with analytics.

**Endpoint**
`/api/method/pricing_intelligence.api.price_change.get_price_change_log`

**Params**

* `name`

#### `get_item_price_history`

Returns regime history for one item.

**Endpoint**
`/api/method/pricing_intelligence.api.price_change.get_item_price_history`

**Params**

* `item`
* `price_list`
* `brand`
* `channel`

#### `trigger_snapshot_rebuild`

Manual admin rebuild.

**Endpoint**
`/api/method/pricing_intelligence.api.price_change.trigger_snapshot_rebuild`

**Params**

* `name`

---

## 8.2 Analytics APIs

### File

`pricing_intelligence/api/analytics.py`

### Methods

#### `get_price_regime_summary`

For dashboard cards and item detail page.

#### `get_before_after_comparison`

Returns prior regime vs current regime.

#### `get_discount_erosion_summary`

Returns expected vs realized revenue metrics.

#### `get_price_realization_trend`

Time series for dashboard / chart.

#### `get_top_positive_price_changes`

Best-performing price changes by normalized revenue impact.

#### `get_top_negative_price_changes`

Worst-performing price changes.

---

## 8.3 Dashboard APIs

### File

`pricing_intelligence/api/dashboard.py`

### Methods

* `get_dashboard_overview`
* `get_kpi_tiles`
* `get_recent_price_changes`
* `get_governance_summary`

---

## 8.4 POS / App APIs

### File

`pricing_intelligence/api/pos.py`

These are useful if POS or a mobile app wants pricing insight, warnings, or summaries.

### Methods

* `get_current_price_context(item, price_list, customer=None)`
* `get_realized_price_breakdown(item, invoice=None)`
* `get_last_price_change_for_item(item, price_list=None)`
* `get_discount_warning_context(item, price_list=None)`

These do not replace pricing execution; they expose pricing intelligence for UI hints.

---

# 9. API Response Shape

Use a stable envelope.

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "generated_at": "2026-03-22 10:30:00",
    "filters": {}
  }
}
```

For lists:

```json
{
  "ok": true,
  "data": {
    "items": [],
    "count": 120
  },
  "meta": {}
}
```

---

# 10. UI Mapping

## 10.1 Desk DocType UI

`Price Change Log` form:

* event context
* previous/new price
* closed-price metrics
* discount attribution
* job status
* audit info

## 10.2 Query Reports

Create:

* `price_change_register`
* `price_regime_performance`
* `price_realization_analysis`
* `discount_erosion_report`

## 10.3 Dashboard / Workspace

Workspace cards:

* Price Changes This Month
* Most Improved Price Regimes
* Most Discount-Eroded Items
* Pending / Failed Snapshot Jobs

## 10.4 Item Price form enhancements

Optional client-side indicators:

* “Previous price existed for 43 days”
* “Last change log: PCL-00034”
* “Reason required when changing active rate”

---

# 11. Data Calculation Rules

## 11.1 Regime definition

A regime is defined by:

* `item`
* `price_list`
* `brand/channel/location` if used
* rate and validity window

## 11.2 Sales unit

Base analytical unit:

* `Sales Invoice Item`

Customer identity comes from:

* parent `Sales Invoice`

## 11.3 Key calculations

* `transaction_count` = count of matching invoice item rows
* `invoice_count` = distinct invoice count
* `total_qty` = sum of qty
* `total_revenue` = sum of realized line amount
* `expected_revenue_at_base_price` = previous_rate × total_qty
* `total_discount_value` = expected - realized
* `days_active` = regime end - regime start
* `revenue_per_day` = total_revenue / days_active
* `average_realized_price` = total_revenue / total_qty
* `unique_customers` = distinct invoice customers

---

# 12. Allocation Rules

## 12.1 Invoice-level discount allocation

If ERPNext invoice-level additional discount is present, allocate to line items proportionally by either:

* net line amount, or
* quantity-weighted base amount

Make this configurable in `Pricing Settings`.

ERPNext supports additional discount on net total or grand total, so this needs an explicit allocation rule for your analytics layer. ([Frappe Documentation][5])

## 12.2 Manual discount residual

If a discount source cannot be confidently attributed to Pricing Rule, Coupon, or Promotional Scheme, classify it as:

* `manual_discount_value`, or
* `residual_discount_value`

---

# 13. Suggested Implementation Order

## Phase 1

* DocTypes
* custom fields on Item Price
* hooks
* pending log creation
* snapshot job
* basic APIs
* basic reports

## Phase 2

* discount attribution
* dashboard APIs
* reconciliation job
* governance enhancements

## Phase 3

* backfill utilities
* POS-facing APIs
* comparison views
* optional approval workflow

---

# 14. Exact Files to Create First

In order:

1. `pricing_intelligence/hooks.py`
2. `pricing_intelligence/doctype/price_change_log/*`
3. `pricing_intelligence/doctype/pricing_settings/*`
4. `pricing_intelligence/services/price_change_detector.py`
5. `pricing_intelligence/services/price_change_logger.py`
6. `pricing_intelligence/jobs/snapshot_jobs.py`
7. `pricing_intelligence/services/analytics_snapshot.py`
8. `pricing_intelligence/api/price_change.py`
9. `pricing_intelligence/api/analytics.py`
10. `pricing_intelligence/report/price_change_register/*`
11. `pricing_intelligence/patches/add_custom_fields_to_item_price.py`

---

# 15. Exact Functions to Implement First

In order:

1. `handle_item_price_change`
2. `is_structural_price_change`
3. `create_pending_price_change_log`
4. `run_price_regime_snapshot`
5. `build_previous_regime_window`
6. `get_sales_lines_for_regime`
7. `aggregate_regime_sales`
8. `mark_snapshot_completed`
9. `get_price_change_log_list`
10. `get_price_change_log`
11. `get_item_price_history`
12. `get_price_regime_summary`

---

# 16. API-First MVP Contract

For MVP, I’d expose only these first:

* `get_price_change_log_list`
* `get_price_change_log`
* `get_item_price_history`
* `get_price_regime_summary`
* `get_before_after_comparison`
* `trigger_snapshot_rebuild`

That is enough for:

* Desk UI
* custom React app
* POS side panel
* mobile app read-only use

---

# 17. Practical Recommendation

Do **not** start with dashboards.
Start with:

1. event capture,
2. immutable log,
3. background snapshot,
4. read APIs.

Once these are stable, everything else becomes easy.

Frappe’s documented hook model, whitelisted method model, and background jobs model are well-suited for exactly this split between transactional updates and asynchronous enrichment. ([Frappe Documentation][2])

If you want, I can next turn this into a **full folder-by-folder coding plan with DocType field schema JSON and method signatures**.

[1]: https://docs.frappe.io/erpnext/item-price?utm_source=chatgpt.com "Item Price - Documentation for Frappe Apps"
[2]: https://docs.frappe.io/framework/user/en/python-api/hooks?utm_source=chatgpt.com "Hooks - Documentation for Frappe Apps"
[3]: https://docs.frappe.io/framework/user/en/guides/app-development/running-background-jobs?utm_source=chatgpt.com "Running Background Jobs - Documentation for Frappe Apps"
[4]: https://docs.frappe.io/erpnext/promotional-scheme?utm_source=chatgpt.com "Promotional Scheme - Documentation for Frappe Apps"
[5]: https://docs.frappe.io/framework/user/en/guides/integration/rest_api?utm_source=chatgpt.com "Introduction - Documentation for Frappe Apps"
