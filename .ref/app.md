# Amuse - Application Context

## Overview

**Amuse** is a Frappe v16 (edge16) custom app for running parks, theme parks, and entertainment venues. It sits on top of ERPNext as an operational intelligence layer.

## Architecture

- **Framework:** Frappe v16 / ERPNext v16
- **Backend:** Python 3.14+
- **Frontend:** React (TanStack Query v5) - standalone operations platform
- **Database:** MariaDB (Frappe default) or PostgreSQL
- **Background Jobs:** Frappe RQ (Redis Queue) via `frappe.enqueue`
- **API Style:** API-first via `@frappe.whitelist()` methods

## Key Modules

### 1. Pricing Intelligence (Backend)
Spec: `.ref/frappe.md`

Custom ERPNext app layer that:
- Tracks structural price changes on `Item Price`
- Snapshots prior-price performance when a price changes
- Separates base price vs realized price erosion from discounts/promotions
- Exposes APIs first so Desk UI, custom app UI, website, and POS can consume the same contract

**New DocTypes:**
- `Price Change Log` - Immutable event ledger
- `Price Change Reason` - Optional master for categorizing reasons
- `Pricing Settings` - Singleton for behavior flags

**Service Layers:**
- Detection (price change hooks on `Item Price`)
- Event Logging (immutable log creation)
- Snapshot Analytics (closed-period metrics)
- Discount Attribution (source separation)
- Customer Metrics (customer-level analysis)
- Jobs (background snapshot execution)
- Reconciliation (catch missed events, repair failures)

**API Namespaces:**
- `amuse.api.price_change` - Price change log CRUD and history
- `amuse.api.analytics` - Regime summaries, comparisons, trends
- `amuse.api.dashboard` - Dashboard overview, KPI tiles
- `amuse.api.pos` - POS/mobile pricing context

### 2. Operations Frontend
Spec: `.ref/frontend.md`

React-based operations platform where daily work happens through a clean, linear, high-quality UI rather than fragmented ERP forms.

**Domain Modules:**
- Dashboard, Customers, Billing, Products, Pricing, Sales, Collections, Operations, Tasks/Approvals, Reports, Settings

**Key Screens:**
- Home/Operations Dashboard
- Customer List + Customer 360
- Billing Overview + Invoice List/Detail
- Payment Collection
- Product List/Detail
- Pricing Workspace (Price List Explorer, Price Change Register, Price Impact Analytics)
- Tasks/Approvals Workspace
- Exception Center
- Reports/Analytics

**Tech Stack:**
- React with TanStack Query v5 for server-state
- Domain-first query key convention
- Screen-oriented APIs (not raw DocType CRUD)
- Command bar, saved views, keyboard-driven flows

## Implementation Phases

### Phase 1 - Foundation
- DocTypes + custom fields on Item Price
- Hooks + pending log creation
- Snapshot job + basic APIs
- Frontend: app shell, routing, API client, React Query setup
- Frontend: customers list/detail, invoices list/detail, dashboard MVP

### Phase 2 - Operational Core
- Discount attribution + dashboard APIs
- Reconciliation job + governance
- Frontend: payments, products, pricing workspace, tasks/approvals, exception center

### Phase 3 - Optimization
- Backfill utilities + POS APIs
- Comparison views + approval workflow
- Frontend: saved views, keyboard workflows, advanced analytics

## Development

```bash
# Frappe bench commands
bench get-app amuse
bench --site [sitename] install-app amuse
bench --site [sitename] migrate
bench build --app amuse

# Run tests
bench --site [sitename] run-tests --app amuse

# Development server
bench start
```

## Solution Documentation

Solved problems are documented in `docs/solutions/` using the `compound-docs` skill. See `docs/solutions/README.md` for search instructions.
