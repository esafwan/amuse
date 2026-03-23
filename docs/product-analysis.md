# Amuse — Product Analysis & Roadmap

> **Date:** 2026-03-22
> **Last progress sync:** 2026-03-22
> **Status:** Living document
> **Scope:** Full product review — current state, gaps, UI/UX, future roadmap
> **Source branch:** [`claude/product-analysis-documentation-7PmUh`](https://github.com/esafwan/amuse/tree/claude/product-analysis-documentation-7PmUh)
> **Repository:** [github.com/esafwan/amuse](https://github.com/esafwan/amuse)

---

## 1. What the Product Does Today

Amuse is an ERPNext-based management system for **water parks, theme parks, and amusement venues**. It is built as a Frappe app with a React/TypeScript SPA frontend.

### Operational modules (implemented)

| Module | What works today |
|---|---|
| **POS** | Session management, item catalog (`get_items` with resolved item group), cart + payment in **side panel** (same pattern as invoice/customer detail), checkout |
| **Billing** | Sales Invoice list, detail view, submit, cancel |
| **Customers** | Paginated list, server-side search (name/email/mobile), **API-driven Customer Group** filter chips, detail view |
| **Pricing Intelligence** | Price change log detection, pending/completed/failed status, KPI drill-down |
| **Exception Center** | Failed snapshot job list, manual retry trigger |
| **Dashboard** | Revenue KPIs, visitor estimate, recent invoices, quick action shortcuts |

### Infrastructure in place

- Three custom DocTypes: `Price Change Log`, `Price Change Reason`, `Pricing Settings`
- Custom fields injected into ERPNext's `Item Price` (channel, location, change reason, notes)
- Async background job queue (Redis/RQ) for analytics snapshot processing
- Demo data generator and site health check script
- Frappe session-based auth with CSRF token injection at SPA boot

---

## 2. Current Gaps & Weaknesses

### 2.1 Analytics are a stub

**Status (2026-03): Addressed.** `process_regime_snapshot()` aggregates submitted `Sales Invoice Item` rows for the prior regime window (qty, revenue, customer metrics, discount splits). Run `bench execute amuse.seed_pricing_intel_demo.run` after `seed_demo` to create a `Price Change Log` and a completed snapshot for QA.

**Residual risk**: KPI quality depends on Item Price `valid_from` / `valid_upto` covering invoice posting dates.

### 2.2 No Item Price hook wired in hooks.py

**Status (2026-03): Addressed.** `hooks.py` registers `Item Price` `on_insert` / `on_update` → `handle_item_price_change`. Standard Item Price rows have no `company` field; the detector resolves company from `Item Default` so `Price Change Log` inserts succeed.

### 2.3 Invoice creation has no frontend UI

`create_invoice` and `get_item_details` APIs are fully implemented but the Billing page has no "New Invoice" form. The only creation path is through POS.

### 2.4 POS has no offline/resilience mode

The POS relies entirely on live Frappe API calls. A network hiccup kills the session with no queuing or retry for cart submissions.

### 2.5 No access control / role awareness

All pages are identical regardless of whether the logged-in user is a Cashier, Supervisor, or Admin. There is no role-based UI hiding, no manager override flow, and no audit trail for manual discounts.

### 2.6 No ticket/admission model

The app targets parks but has no concept of a ticket (entry passes, timed slots, group packages, combo bundles). Items in the current model are generic ERPNext items with no capacity, validity, or redemption lifecycle.

### 2.7 Discount attribution is unimplemented

**Status (2026-03): Partially addressed.** Pricing-rule vs manual line discount, distributed discount split (coupon vs invoice-level), and residual are populated from `Sales Invoice` / `Sales Invoice Item`. `promotional_scheme_discount_value` stays at zero until ERPNext exposes a reliable per-line promotional linkage for this site’s configuration.

### 2.8 Mobile layout is incomplete

The responsive design was started (noted in planning docs) but the SPA currently renders a desktop-oriented bottom-nav layout that works on mobile screen sizes without true mobile-first adaptations (no swipe, no large tap targets, cramped tables).

### 2.9 No print/receipt path from POS

The earlier scaffold referred to `frontend/src/lib/print.ts`; **Billing** now uses `frontend/src/lib/printview.ts` to open Frappe **`/printview`** for Sales Invoices. The **POS** checkout success path still has no dedicated **Print receipt** / receipt summary step (tracked under execution plan §4.1).

### 2.10 No formal reports

There are no ERPNext Report DocTypes, no export-to-CSV, and no management summary views beyond the dashboard KPI cards.

---

## 3. UI/UX Organization — Recommended Improvements

### 3.1 Current navigation

The bottom nav has 5 items: Home · POS · Pricing · Customers · Exceptions.

**Problems**:
- "Exceptions" is a technical/ops concept, not an operator action — it does not belong in the primary nav.
- "Pricing" mixes operational monitoring (failed jobs) with strategic pricing decisions.
- There is no top-level "Tickets" or "Admissions" entry point.

### 3.2 Proposed navigation structure

```
Primary (bottom nav — operators)
├── Home          Dashboard / KPIs
├── Sell          POS entry point
├── Tickets       Admission & booking (new)
├── Customers     Customer directory
└── Reports       Analytics & exports (new)

Secondary (hamburger / settings — managers & admins)
├── Pricing       Price change logs + impact analysis
├── Inventory     Stock levels (via ERPNext)
├── Users         Staff management
├── Exceptions    Failed job monitor
└── Settings      App configuration
```

### 3.3 Role-based UI layers

| Role | Visible nav | Allowed actions |
|---|---|---|
| **Cashier** | Sell, Tickets, Customers | Create invoice, accept payment, search customer |
| **Supervisor** | + Home, Reports | Approve manual discounts, cancel invoices |
| **Manager** | + Pricing, Inventory | Edit prices, view analytics |
| **Admin** | All | Everything including Settings, Exceptions |

### 3.4 POS screen improvements

- Replace text-only item grid with image + name + price cards (image already supported by ERPNext Item)
- Add category tabs at top (e.g., Day Passes · Add-ons · F&B · Merchandise)
- Show stock/capacity indicator on item card
- Add barcode scan button (API already exists: `pos.search_barcode`)
- Post-payment screen: show receipt summary + "Print" + "New Sale" options

### 3.5 Customer detail improvements

- Show purchase history (link to Billing with customer filter)
- Show loyalty points balance (once loyalty module is added)
- Show active/valid tickets

---

## 4. Future Feature Roadmap

### Phase A — Fix foundations (immediate)

| Priority | Task | Status |
|---|---|---|
| P0 | Wire `Item Price` hooks in `hooks.py` | Done |
| P0 | Implement `process_regime_snapshot()` — SI aggregation for prior regime | Done |
| P0 | Add "New Invoice" form to Billing page | Open |
| P1 | Discount attribution in snapshot | Done (promotional scheme TBD) |
| P1 | Add print receipt action to POS checkout success state | Open |
| P1 | Add role-based access guards to frontend pages | Open |

### Phase B — Ticketing & Admissions

**New DocTypes needed:**

```
Ticket Type
  - name, description, item (Link → Item)
  - capacity_per_day (Int)
  - valid_for_days (Int)
  - is_timed_entry (Check)
  - entry_slots (Table → Ticket Slot)

Ticket
  - ticket_type (Link → Ticket Type)
  - customer (Link → Customer)
  - sales_invoice (Link → Sales Invoice)
  - valid_from (Datetime)
  - valid_until (Datetime)
  - status: Issued / Redeemed / Expired / Cancelled
  - redemption_code (Data, unique — QR/barcode value)
  - redeemed_at (Datetime)
  - redeemed_by (Link → User)

Ticket Slot
  - date (Date)
  - start_time (Time)
  - end_time (Time)
  - capacity (Int)
  - booked (Int, read-only)
```

**New API endpoints:**

```python
# amuse.api.tickets
issue_tickets(invoice_name)          # create Ticket records from paid invoice
validate_ticket(redemption_code)     # check status, mark Redeemed
get_ticket(name)                     # fetch ticket details
list_tickets(filters)                # search tickets
void_ticket(name, reason)            # cancel a ticket
get_capacity(ticket_type, date)      # remaining capacity for a date
```

**Frontend additions:**

- **Ticket Issuance**: POS checkout generates QR codes that can be printed or sent via SMS/email
- **Gate Scan**: Dedicated full-screen view for scanning QR codes at park entry (large camera button, green/red flash feedback)
- **Capacity Calendar**: Per-ticket-type calendar showing remaining slots per day

### Phase C — Loyalty & CRM

```
Loyalty Program
  - name, points_per_currency_unit (Float)
  - redemption_rate (Float — points per currency unit redeemed)
  - expiry_days (Int)
  - tier_rules (Table)

Loyalty Ledger
  - customer, program, points, type (Earned/Redeemed/Expired)
  - reference_invoice, reference_date
```

**UI additions:**
- Customer detail: points balance + transaction history
- POS checkout: show redeemable points, allow partial points redemption
- Birthday/anniversary trigger: automatic bonus points job

### Phase D — Advanced Analytics & Reporting

**Price Regime Analytics (complete the stub):**
- Revenue per day-active of regime
- Demand elasticity: qty-sold vs. price scatter across all historical regimes
- Optimal price suggestion: regression model using historical data
- Competitor comparison fields on `Price Change Log`

**Operational Reports:**
- Daily Revenue Summary (by item group, payment method, cashier)
- Capacity Utilization (tickets sold vs. capacity per day)
- Customer Cohort Report (new vs. returning by week)
- Discount Erosion Report (total discount value by type over time)
- Item Popularity Heatmap (by hour and day-of-week)

**Implementation approach:**
- Add ERPNext Report DocTypes for export-ready tabular reports
- Add a `Reports` page in the SPA with embedded chart views (Recharts or lightweight charting)
- Schedule daily snapshot job to pre-aggregate common queries

### Phase E — Integrations & Infrastructure

| Feature | Details |
|---|---|
| **RFID / NFC wristbands** | Map `Ticket.redemption_code` to wristband UID; gate reader calls `validate_ticket` |
| **Online booking** | Public-facing booking page (Frappe Web Form or external) that creates `Sales Invoice` in draft and issues `Ticket` on payment |
| **Payment gateway** | Stripe / Razorpay / local gateway integration for cashless transactions |
| **SMS/WhatsApp** | Send ticket QR on payment confirmation; send receipt; loyalty balance nudge |
| **Digital signage** | Read-only real-time capacity dashboard for display screens at entry gates |
| **Weather-based pricing** | Auto-suggest price change when weather forecast is sunny (integration with weather API) |

---

## 5. Data Model Evolution

### Current ERPNext documents used

```
Item                    → Park products (tickets, food, merchandise)
Item Price              → Price by price list
Customer                → Guest / group
Sales Invoice           → Transaction record
Payment Entry           → Payment confirmation
POS Profile             → Cashier station config
POS Opening Entry       → Shift session
Price List              → e.g., "Walk-in", "Group", "Online"
```

### Additions required for full feature set

```
Ticket Type             → Template for an admission product
Ticket                  → Individual issued pass (QR-linked)
Ticket Slot             → Timed entry capacity unit
Loyalty Program         → Points accumulation rules
Loyalty Ledger          → Points transaction history
Price Change Reason     → Already exists ✓
Price Change Log        → Already exists ✓
Pricing Settings        → Already exists ✓
```

---

## 6. Technical Debt to Address

| Debt | Location | Recommendation |
|---|---|---|
| All DocType JS files are stubs | `amuse/doctype/*/[name].js` | Implement or delete — stubs create confusion |
| `analytics_snapshot.py` returns zeros | `services/analytics_snapshot.py` | Implemented — see `process_regime_snapshot` |
| No hook registration | `hooks.py` | `doc_events` for `Item Price` registered |
| Frontend has no error boundaries | React pages | Add `<ErrorBoundary>` per page section |
| No loading skeleton screens | All list pages | Replace spinner with content skeleton for better perceived performance |
| `seed_demo.py` hardcodes company "Funtartica" | `seed_demo.py` | `run(company=None)` resolves default or first Company |
| `verify_site.py` uses bare `print()` | `verify_site.py` | Logs via `frappe.logger("amuse.verify_site")` |
| TanStack Query cache keys not namespaced | `frontend/src/hooks/` | Add prefix namespace to all query keys to avoid collisions |

---

## 7. Competitive Positioning

Amuse, when fully built, would compete with:

| Competitor | Strength | Amuse advantage |
|---|---|---|
| **Accesso** | Enterprise ticketing | ERPNext integration → single system for ops + finance |
| **Siriusware** | POS + ticketing | Open source, customizable, no per-transaction fee |
| **Gateway Ticketing** | Capacity management | Tighter pricing intelligence loop |
| **FareHarbor** | Online booking | On-premise option for privacy-sensitive operators |

Key differentiator: **pricing intelligence built into the core** — not just transactional ticketing, but a feedback loop between price changes and realized revenue outcomes. No mainstream competitor surfaces this in a single view.

---

## 8. Recommended Immediate Next Steps

1. **Wire the hook** — 5-line change in `hooks.py`. Without it, the pricing intelligence feature produces no data.
2. **Implement snapshot analytics** — write the Sales Invoice aggregation query in `analytics_snapshot.py` so the Pricing Workspace shows real numbers.
3. **Add role guards to frontend** — fetch current user's roles at boot (available in `frappe.boot`) and conditionally render nav items and action buttons.
4. **Create `Ticket` DocType + `issue_tickets` API** — this unlocks the core park use case and differentiates Amuse from a generic ERPNext POS setup.
5. **Print receipt from POS** — low effort, high operator value; align with Billing’s **`printview.ts`** pattern and add a post-payment receipt step (execution plan §4.1).

---

## 9. Compound engineering — how this documentation set compounds

**Compound engineering** (in this repo and the wider dev workspace) means: *artifacts are linked so each sprint makes the next cheaper* — product truth, execution order, verification, and retrospectives stay traceable.

| Principle | Application |
|-----------|-------------|
| **Traceability** | `docs/product-analysis.md` (what & why) ↔ `docs/plans/2026-03-22-010-agent-execution-plan.md` (how & order) ↔ `docs/solutions/**` (what broke & fix). |
| **Verification** | Every P0 task names a verification step (Desk, API, or `bench`). See `amuse/tests/E2E_TEST_PLAN.md`, `test_api_smoke.py`, `verify_site.py`. In the dev workspace, `Docs/compound-engineering/TESTING.md` lists copy-paste bench commands. |
| **Agent handoff** | Progress tables (§10 below, and in the execution plan) prevent two agents from implementing the same blocker differently. |
| **External reference** | [esafwan/amuse on GitHub](https://github.com/esafwan/amuse) — default remote `git@github.com:esafwan/amuse.git`. |

---

## 10. Implementation progress tracker (living)

*Update when merging significant work to `develop`. **Status:** Done | Partial | Not started.*

| ID | Area | Status | Notes / verification |
|----|------|--------|------------------------|
| PA-UX-01 | POS cart & payment as side panel | **Done** | Uses `customer-detail` pattern (full-screen mobile, right rail desktop); Cart → Payment steps. |
| PA-UX-02 | Billing print (Frappe printview) | **Done** | `frontend/src/lib/printview.ts` — `openPrintviewInNewTab('Sales Invoice', name)`. |
| PA-UX-03 | Theme control in nav rail | **Done** | Transparent control; full opacity on hover/focus; does not cover search. |
| PA-API-01 | POS `get_items` / `item_group` | **Done** | `amuse.api.pos.get_items` resolves parent/root Item Group before ERPNext call. |
| PA-API-02 | Customers API filters + pagination | **Done** | `list_customer_groups`, `list_customers` + `search`; infinite query + Load more. |
| PA-FE-01 | Shared loading / empty UI | **Partial** | `AppState` components; rollout incomplete across all pages. |
| PA-BE-01 | Item Price `doc_events` | **Not started** | Required for Pricing Intelligence pipeline. |
| PA-BE-02 | `process_regime_snapshot` aggregates | **Not started** | Still stub in `analytics_snapshot.py`. |
| PA-BE-03 | Discount attribution | **Not started** | Depends on PA-BE-02. |
| PA-PERM | Capabilities / Amuse Roles | **Not started** | Execution plan Groups 2–3. |
| PA-NAV | Nav restructure (Sell / Tickets / Reports) | **Not started** | Group 5; gated by permissions. |

---

## 11. Errata (branch snapshot vs current tree)

| Topic | Original branch text | Current codebase |
|-------|----------------------|------------------|
| Print helper | `frontend/src/lib/print.ts` | Use **`printview.ts`** for standard Frappe print URLs. |
| POS cart | Checkout “modal” | **Side panel** aligned with invoice/customer detail — not a bottom drawer. |
| §1 module table | “Customers: group filter” | **Dynamic** groups from `list_customer_groups` + **paginated** list. |

---

## Document history

| Date | Change |
|------|--------|
| 2026-03-22 | Imported full analysis from branch `claude/product-analysis-documentation-7PmUh`. |
| 2026-03-22 | Added §§9–11, progress tracker, compound-engineering alignment, errata, GitHub links. |
