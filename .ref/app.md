# Amuse — Product Plan

**Pricing Intelligence & Governance Layer on ERPNext**
*For mid-sized amusement and leisure park operations*

---

## 1. What we're building

Amuse is a Frappe app that sits on top of ERPNext to track, analyze, and govern pricing changes — without touching or replacing any core ERP logic.

It acts as an event-driven pricing intelligence, analytics, and governance layer. It observes, logs, analyzes, and exposes APIs. It does not replace ERPNext's pricing engine, Sales Invoice lifecycle, or POS logic.

**Golden rule:** Never override ERPNext behavior — only extend via hooks and reads.

---

## 2. Who it's for

Mid-sized amusement and leisure parks running ERPNext — specifically:

- **Operations teams** who need faster daily workflows and less dependence on raw ERP forms
- **Pricing managers** who need visibility into when prices changed, why, and what happened after
- **Finance leads** who need to understand where discounts go and whether commercial decisions are working
- **Management** who need clear before/after pricing analysis without repeated manual invoice crunching

---

## 3. The problem

ERPNext preserves transactions well — invoice item rate, total amounts, discount effects — but does not natively model:

- When a base price changed
- Why it changed
- What the previous price achieved
- Whether the change improved outcomes
- How much realized sales performance was influenced by tactical discounting vs the structural price itself

This creates a blind spot in both pricing governance and performance analysis. Without an additional layer, businesses are forced to group sales by date ranges, infer pricing periods from raw invoices, and repeatedly crunch transaction data.

---

## 4. Core design principle

**Separate structural price from tactical discount.**

| Layer | What it is | Driven by |
|-------|-----------|-----------|
| **A — Base price** | The structural intended price | Item Price, Price List |
| **B — Discount / adjustment** | Any tactical deviation | Pricing Rule, Promotional Scheme, Coupon Code, customer group logic, territory logic, line discount, invoice-level discount, manual discount |
| **C — Realized price** | The final effective price in the transaction | Computed from invoice data |

This separation lets the business answer two distinct questions: *Was the base price right?* and *How much did discounting change the realized outcome?* Merging both into one analytical concept destroys clarity.

---

## 5. Ten key features

### 5.1 Price change detection
Hooks into ERPNext Item Price `after_insert` and `on_update` events. Automatically detects when an Item Price is created, updated, or disabled and triggers the logging pipeline.

### 5.2 Immutable price change ledger
Every price change gets a permanent, auditable log entry — who changed it, when, why, previous rate, new rate, and full context (channel, territory, location).

### 5.3 Change reason tracking
Standardized reason codes (seasonal revision, margin correction, competitor response, promotion rollback, correction, demand adjustment) via a simple master DocType.

### 5.4 Analytics snapshots
Background jobs compute revenue, quantity sold, days active, transaction count, and realized pricing metrics for each "price regime" — the period a given price was active.

### 5.5 Discount attribution
Breaks every discount into its source: pricing rule, coupon, promotional scheme, invoice-level, and manual/residual — so you know exactly where margin is leaking.

### 5.6 Customer metrics
Unique customers, new customers, revenue per customer — calculated per pricing period to measure the impact of each price change.

### 5.7 Dashboard APIs
KPI tiles, recent changes, exception summaries, and governance overview — all served under 200ms response targets.

### 5.8 POS context APIs
Real-time price context, last change date, and realized price breakdowns at point of sale — under 100ms.

### 5.9 Daily reconciliation
Scheduled job catches missed logs, retries failed snapshots, and repairs inconsistencies automatically.

### 5.10 Zero-intrusion architecture
Read-only relationship with ERPNext core. Never overrides a save, never recalculates an invoice, never modifies a pricing rule.

---

## 6. System boundaries

### ERPNext owns (never reimplement)

- Sales Invoice lifecycle
- Payment Entry / reconciliation
- Item / Item Price logic
- Pricing Rule execution
- POS logic

### Amuse owns

- Price change detection
- Event logging
- Analytics snapshot computation
- Discount attribution
- Monitoring + reconciliation
- API layer
- Frontend operations workspace

---

## 7. Core event flow

```
Item Price change
  → detect structural change (rate, validity, enable/disable)
  → create Price Change Log (status: Pending)
  → enqueue background snapshot job
  → compute analytics for previous price regime
  → enrich log with metrics + discount attribution
  → update log (status: Completed)
  → expose via API to dashboard / frontend
```

Snapshot computation runs async — it must never slow the operator or block save operations.

---

## 8. DocTypes

### 8.1 Price Change Log (core)

Immutable ledger. Key field groups:

**Identity:** item, item name, item group, brand, company, price list, currency

**Change info:** previous rate, new rate, change timestamp, change type, changed by, source of change

**Context:** channel, territory, location, change reason (link), notes, approval reference

**Previous price snapshot:** previous valid from/upto, previous enabled state

**New price snapshot:** new valid from/upto, new enabled state

**Performance snapshot (computed):** days active, first/last sale date, transaction count, invoice count, total quantity sold, total revenue, unique customers, new customers, revenue per day, quantity per day, revenue per transaction, revenue per customer, average realized selling price

**Discount attribution (computed):** expected revenue at base price, realized revenue, total discount value, discount % vs base, pricing rule discount value, promotional scheme discount value, coupon discount value, invoice-level discount value, manual discount value, residual discount value

**Control:** snapshot status (Pending / Completed / Failed), job ID, regime hash

### 8.2 Price Change Reason

Simple master: reason_code, reason_name, is_active.

Standard reasons: seasonal revision, margin correction, promotion rollback, correction, demand adjustment, competitor response.

### 8.3 Pricing Settings (singleton)

Controls: enable price change tracking, enable discount attribution, enable customer metrics, long job queue name, allocation method, minimum days for comparison, default company behavior.

---

## 9. Custom fields on ERPNext DocTypes

Added via patch only — no modification to core:

**Item Price:** custom_change_reason, custom_change_notes, custom_channel, custom_location, custom_last_price_change_log, custom_brand

**Sales Invoice (optional):** custom_coupon_code_snapshot

**Sales Invoice Item (optional):** custom_realized_discount_source

---

## 10. App structure

```
amuse/
├── amuse/
│   ├── hooks.py
│   ├── api/
│   │   ├── price_change.py
│   │   ├── analytics.py
│   │   ├── dashboard.py
│   │   └── pos.py
│   ├── services/
│   │   ├── price_change_detector.py
│   │   ├── price_change_logger.py
│   │   ├── analytics_snapshot.py
│   │   ├── discount_attribution.py
│   │   ├── customer_metrics.py
│   │   └── report_queries.py
│   ├── jobs/
│   │   ├── snapshot_jobs.py
│   │   └── reconciliation.py
│   ├── doctype/
│   │   ├── price_change_log/
│   │   ├── price_change_reason/
│   │   └── pricing_settings/
│   ├── patches/
│   │   ├── add_custom_fields_to_item_price.py
│   │   └── backfill_price_change_logs.py
│   ├── report/
│   │   ├── price_change_register/
│   │   ├── price_regime_performance/
│   │   ├── price_realization_analysis/
│   │   └── discount_erosion_report/
│   └── utils/
│       ├── api_response.py
│       ├── dates.py
│       ├── money.py
│       ├── allocation.py
│       └── validators.py
```

---

## 11. Service layer

### 11.1 Price change detector

- `handle_item_price_change(doc, method)` — entry point from hook
- `is_structural_price_change(doc, old_doc)` — filters noise (rate, validity, enable/disable changes only)
- `extract_change_context(doc, old_doc)` — pulls channel, territory, reason, notes
- `build_regime_key(doc)` — creates unique key for deduplication

### 11.2 Price change logger

- `create_pending_price_change_log(context)` — creates log with status Pending
- `mark_snapshot_completed(log_name, payload)` — enriches with analytics
- `mark_snapshot_failed(log_name, error)` — marks failure for retry

### 11.3 Analytics snapshot

- `build_previous_regime_window(log)` — determines date range for previous price
- `get_sales_lines_for_regime(window)` — fetches Sales Invoice Item lines
- `aggregate_regime_sales(lines)` — computes totals
- `calculate_normalized_metrics(aggregate)` — per-day, per-transaction, per-customer
- `calculate_price_realization(aggregate)` — realized vs expected at base price

**Critical:** Uses Sales Invoice and Sales Invoice Item data from ERPNext. Does NOT replicate pricing logic — reads computed values only.

### 11.4 Discount attribution

Splits discount into: pricing rule, coupon, promotional scheme, invoice-level, manual residual. Must align with ERPNext fields (discount_amount, pricing_rules, tax + net calculations).

- `attribute_discount_sources(lines)`
- `get_pricing_rule_impact(line)`
- `get_coupon_impact(line)`
- `get_promotional_scheme_impact(line)`
- `allocate_invoice_level_discount(invoice, lines)`
- `compute_residual_discount(line)`

### 11.5 Customer metrics

- `get_unique_customer_count(lines)` — from parent Sales Invoice
- `get_new_customer_count(lines, cutoff_date)` — first purchase within regime
- `calculate_revenue_per_customer(lines)`

---

## 12. Background jobs

### 12.1 Snapshot job

```python
def run_price_regime_snapshot(log_name):
    # idempotent, retry-safe, updates log status
```

Rules: check snapshot_status before running, skip if completed, safe retry on failure.

### 12.2 Reconciliation (daily)

```python
scheduler_events = {
    "daily": [
        "amuse.jobs.reconciliation.run_daily_reconciliation"
    ]
}
```

Finds missing logs, retries failed snapshots, repairs inconsistencies.

---

## 13. API layer

### 13.1 Response shape (all APIs)

```json
{ "ok": true, "data": {}, "meta": {} }
```

All APIs use `@frappe.whitelist()`. No raw DocType exposure.

### 13.2 Price change APIs

- `get_price_change_log_list` — filtered, paginated list
- `get_price_change_detail` — single log with full context
- `get_item_price_history` — timeline for a specific item
- `trigger_snapshot_rebuild` — manual re-run

### 13.3 Analytics APIs

- `get_price_regime_summary` — overview of a regime's performance
- `get_before_after_comparison` — side-by-side price impact
- `get_discount_erosion_summary` — where margin leaked
- `get_price_realization_trend` — realized vs base over time
- `get_top_positive_price_changes` / `get_top_negative_price_changes`

### 13.4 Dashboard APIs

- `get_dashboard_overview` — aggregated dashboard state
- `get_kpi_tiles` — summary metrics
- `get_recent_price_changes` — latest activity
- `get_governance_summary` — exception/compliance view

### 13.5 POS / App APIs

- `get_current_price_context` — current price + last change info
- `get_realized_price_breakdown` — how this item is actually selling
- `get_last_price_change_for_item` — quick lookup
- `get_discount_warning_context` — flags excessive discounting

---

## 14. Reports

| Report | Purpose |
|--------|---------|
| Price Change Register | Chronological log of all price changes with filters |
| Price Regime Performance | Revenue, quantity, and customer metrics per price period |
| Price Realization Analysis | Realized price vs base price, realization % |
| Discount Erosion Report | Where discounts are eroding margin, by source |
| Before vs After Comparison | Side-by-side impact of specific price changes |
| Pricing Governance Report | Frequency, patterns, compliance, anomalies |

### Dashboard KPIs

- Active price regimes
- Price changes this month
- Price realization %
- Top positive / negative price changes
- Most discount-eroded items
- Pending / failed snapshot jobs

---

## 15. Commercial context — amusement park pricing

### 15.1 Ride & experience pricing table

| Ride / experience | Category | Price (INR) | Tier |
|-------------------|----------|-------------|------|
| Water park access | Water park | 300 | Premium |
| Aquarium tunnel | Animal / experience | 100 | Standard |
| Bird aviary experience | Animal / experience | 100 | Standard |
| Mini jeep safari | Kids ride | 100 | Standard |
| Bumper cars | Family ride | 100 | Standard |
| 4D motion theater | Experience | 100 | Standard |
| Haunted house | Thrill / experience | 100 | Standard |
| Flying chair ride | Thrill ride | 100 | Standard |
| Rotating disk ride | Thrill ride | 100 | Standard |
| Gyroscope ride | Thrill ride | 40 | Value |
| Drop tower | Thrill ride | 40 | Value |
| Swan swing ride | Family ride | 40 | Value |
| Crazy bike / loop bike | Family ride | 30 | Value |
| Inflatable play zone | Kids ride | 30 | Value |

### 15.2 Tier grouping

- **Premium (₹300):** Water park access
- **Standard (₹100):** Aquarium, bird aviary, mini jeep safari, bumper cars, 4D theater, haunted house, flying chair, rotating disk
- **Value (₹30–40):** Gyroscope, drop tower, swan swing, crazy bike, inflatable play zone

### 15.3 Combo / bundle strategy

| Combo | Includes | Price (INR) | Individual total | Savings |
|-------|----------|-------------|-----------------|---------|
| All ride access | Every ride + water park | 799 | ~1,120 | ~29% |
| Water + ride combo | Water park + 3 standard rides | 499 | 600 | ~17% |
| Thrill seeker | Haunted house + drop tower + gyroscope + flying chair + rotating disk | 299 | 380 | ~21% |
| Family fun | Bumper cars + swan swing + inflatable zone + mini jeep safari | 249 | 270 | ~8% |
| Bird + aquarium | Bird aviary + aquarium tunnel | 149 | 200 | ~26% |
| Kids play | Inflatable zone + crazy bike + mini jeep safari | 129 | 160 | ~19% |

### 15.4 Pricing principles

- Combos priced 20–30% below individual sum for perceived savings
- Use psychological pricing (₹99, ₹149, ₹299 vs round numbers)
- Water park as premium anchor drives upsell to higher combos
- Family / kids combos positioned for different visitor segments
- All-access pass as top-tier option makes mid-tier combos look reasonable (decoy effect)

---

## 16. KPIs

### 16.1 Core pricing & sales KPIs (measurable today)

| # | KPI | Formula / description |
|---|-----|----------------------|
| 1 | Average revenue per visitor (ARPV) | Total revenue ÷ total visitors |
| 2 | Average ticket value | Avg. transaction size at counter |
| 3 | Pass mix % | % of visitors buying all-access vs combo vs single |
| 4 | Combo adoption rate | % of visitors buying any bundle |
| 5 | Attach rate | Avg. number of add-ons per visitor |
| 6 | Upgrade conversion % | Visitors who upgrade after entry ÷ total visitors |
| 7 | Water park penetration | Water park buyers ÷ total visitors |
| 8 | Revenue per ride | Revenue generated ÷ ride capacity or scans |
| 9 | Peak vs off-peak ARPV | Weekend vs weekday comparison |
| 10 | Combo cannibalization | Single ride revenue drop after combo launch |

### 16.2 Unlocked with phone capture (future)

| # | KPI | Formula / description |
|---|-----|----------------------|
| 11 | Repeat visit rate | Returning visitors ÷ total visitors |
| 12 | Time to return | Avg. days between visits |
| 13 | ARPV per customer | Lifetime revenue per unique guest |
| 14 | Offer redemption rate | Promo usage ÷ promos sent |

### 16.3 Operational KPIs (often missed)

- Unused entitlement % — paid-for rides not used
- Avg. scans per all-access guest
- Queue wait vs price sensitivity

### 16.4 Starter set (track only 5)

If you can only track five things: ARPV, pass mix %, attach rate, upgrade conversion %, revenue per ride.

---

## 17. Frontend vision

A modern React-based operations frontend that becomes the primary operator surface.

### 17.1 Modules

Home, Customers, Billing, Products, Pricing, Sales, Collections, Operations, Reports, Settings.

### 17.2 Key screens

- **Home / operations dashboard:** My tasks, approvals, billing alerts, overdue items, KPI strip, quick actions
- **Customer list + Customer 360:** Searchable workspace with tabs for overview, billing, orders, products, timeline, notes
- **Billing overview:** Invoice metrics, aging summary, collection status, exception queue
- **Invoice list + detail:** Power list with filters, quick preview, full detail with payments and timeline
- **Payment collection workspace:** Focused collections queue with follow-up logging
- **Product list + detail:** Product maintenance and pricing visibility
- **Pricing workspace:** Current prices, upcoming changes, recent changes, price history, discount erosion, before/after comparisons
- **Exception center:** Queue-based screen for mismatches, failed jobs, sync issues, pricing anomalies

### 17.3 Design principles

- Linear workflows: find → inspect → act → confirm → continue
- Summary first, advanced fields on demand (progressive disclosure)
- Backend DocTypes are not UI — frontend models how work actually happens
- Server state via TanStack Query v5, minimal global state
- API-first: screen-level APIs (customer_360, billing_dashboard_summary) not raw DocType fetches

### 17.4 Shared UI patterns

- **List pattern:** Title, KPI strip, filters, search, saved views, table, bulk actions, row actions
- **Detail pattern:** Sticky header, status chips, summary cards, tabs, timeline, contextual actions
- **Quick actions:** Drawers and modals over full-page flows

---

## 18. Performance rules

- Snapshot job < 30s for 1,000 invoices
- Dashboard APIs < 200ms
- POS APIs < 100ms

---

## 19. Error handling

- Never block Item Price save
- Log errors to Frappe error log
- Mark Price Change Log as Failed
- Retry via daily reconciliation job

---

## 20. Anti-patterns (strict)

- ❌ Modifying ERPNext core
- ❌ Duplicating pricing engine
- ❌ Recalculating invoice totals
- ❌ Direct SQL without service layer
- ❌ Exposing raw DocTypes to frontend

---

## 21. Delivery phases

### Phase 1 — Foundation

App shell, routing, auth/session, API client, React Query setup, design system primitives, basic customers list/detail, invoices list/detail, dashboard MVP, price change log capture, snapshot job, core APIs.

### Phase 2 — Operational core

Payments, product management, pricing workspace, tasks/approvals, exception center, discount attribution, governance reports.

### Phase 3 — Optimization

Saved views, keyboard workflows, advanced analytics, dormant host adapter (for future embedded integration), deeper productivity and automation features.

---

## 22. Success criteria

**Pricing intelligence is successful when:**
- Every price change is captured with who/when/why
- Before/after performance comparison is available without manual work
- Discount sources are attributed clearly
- Management can see a pricing narrative, not raw invoice dumps

**Frontend is successful when:**
- Fewer clicks to complete daily tasks
- Faster issue resolution
- Lower training effort for new operators
- Less dependence on backend ERP forms
- Better operational visibility

**The system as a whole is successful when the business can clearly answer:** What changed, when, why, what results the previous price achieved, how much came from structural price, how much came from discounting, and whether pricing decisions are improving outcomes.