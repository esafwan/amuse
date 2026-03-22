**Frontend product + implementation spec** 

A couple of grounding assumptions first: **TanStack Query v5** is the current React Query line and is designed for server-state fetching, caching, mutations, and invalidation in React. Also, if by “reactSDK” you mean the current OpenAI Apps/ChatGPT UI path, the official model is the **Apps SDK / MCP Apps UI** approach, where UI components run in an iframe and communicate with the host via the Apps bridge. That makes it reasonable to **keep any React SDK integration dormant behind an adapter**, while the main operations frontend is built as a normal React application first. ([TanStack][1])

# Frontend Specification

## Operations Platform for Billing, Customer, Product, and Daily Workflows

## 1. Purpose

Build a **React-based operations frontend** where all daily work happens through a **clean, linear, high-quality UI** rather than through fragmented ERP forms. The frontend should become the primary operator surface for:

* billing and collections
* customers and CRM-style views
* products and pricing
* orders / invoices / subscriptions / service operations
* support and exceptions
* approvals and task-driven work

ERPNext remains the transactional backend and source of truth, while the new frontend becomes the operator-focused interaction layer.

---

## 2. Product Goal

The frontend must feel like a **modern operational workspace**, not a direct rendering of ERP documents.

It should optimize for:

* speed of execution
* low cognitive load
* predictable navigation
* linear task completion
* strong search and filtering
* contextual actions
* fewer full-page form experiences
* better visibility across related business objects

---

## 3. Core Design Principles

### 3.1 Work should feel linear

Every major workflow should guide the user from:
**find → inspect → act → confirm → continue**

### 3.2 Documents are backend objects, not frontend UX

The UI should not expose raw ERPNext DocType complexity unless needed.

### 3.3 Screen design should prefer:

* list + detail
* timeline + actions
* summary + exceptions
* workflow state + next action

### 3.4 React Query is the primary server-state layer

Use TanStack Query for:

* queries
* mutations
* cache invalidation
* optimistic updates where safe
* background refetch
* shared query keys per domain ([TanStack][2])

### 3.5 React SDK / Apps SDK support stays optional

Keep any ChatGPT/OpenAI-specific UI integration behind a separate adapter layer. The core app must not depend on host-specific embedding. This is important because Apps SDK components are host-embedded UI with a bridge model, while your ops app should remain standalone first. ([OpenAI Developers][3])

---

## 4. Frontend Architecture Intent

## 4.1 App Type

A **single React app** with modular domains.

Suggested domain modules:

* Dashboard
* Customers
* Billing
* Products
* Pricing
* Orders / Sales
* Collections
* Operations
* Tasks / Approvals
* Reports
* Settings

## 4.2 Layout Style (Mobile-First Operations App)

Primary shell architecture has evolved to a Mobile-first standard to optimize focus and touch targets:

* **`.app` wrapper**: The global container.
* **`.bottom-nav`**: Replaces the left rail, housing constant navigation elements (e.g. Home, Dashboard, POS, Customers).
* **`.screen active`**: The primary contextual view.
* **`.topbar`**: Screen-specific headers containing title and quick-actions (search/add).
* **`.scroll-area`**: The scrollable content region within a screen.

Preferred structural patterns:
* **`.list-item` feeds**: For tables, customers, invoices, and ledgers.
* **`.metric-row` / `.metric`**: For KPI strips.
* **Fixed Overlays (`.customer-detail open`)**: For detail/inspector views that slide over the main view without full routing.
* **Floating Bars (`.cart-bar`)**: For persistent contextual states (like a POS Cart).

## 4.3 State Model

* server state: React Query
* local UI state: component state / lightweight store
* form state: dedicated form layer
* global state only for session, theme, workspace preferences, and app-wide selections

## 4.4 Design System & Aesthetics (Compound Engineering)

To ensure cohesive compound engineering across all future components, operations apps **must** adhere strictly to the custom Design System injected into `index.css`. Tailoring new screens should rely on these core CSS variables rather than arbitrary Tailwind utilities:

**Typography**: `DM Sans` (Google Fonts)
**Spacing/Radii**: `14px` (Standard components), `10px` (Small elements)

**Color Palette Tokens**:
* Backgrounds: `--bg` (#F7F6F3), `--surface` (#FFFFFF), `--surface-2` (#EEEDEA)
* Typography: `--text-1` (#1B1B18), `--text-2` (#6E6E69), `--text-3` (#A3A29D)
* Accents: `--accent` (#1D6B4F), `--accent-bg` (#E4F2EC), `--accent-text` (#145239)
* Signal Colors: `--red`, `--amber`, `--blue` (and their `-bg` counterparts)
* Borders: `--border` (rgba(0,0,0,0.08))

**Core Atoms**:
* `.card`: Elevated surface grouping information.
* `.pill`: Status indicators (variants: `.pill-gray`, `.pill-green`, `.pill-red`, `.pill-amber`).
* `.chip-row` & `.chip`: Horizontal filtering mechanisms.
* `.search-box`: Specialized input bars with prepended icons.

---

## 5. Navigation Model

## 5.1 Main Navigation

Top-level sections:

* Home
* Customers
* Billing
* Products
* Pricing
* Sales
* Collections
* Operations
* Reports
* Settings

## 5.2 Secondary Navigation

Inside each module, use tabs or sub-nav:
Example under Billing:

* Overview
* Invoices
* Payments
* Credit Notes
* Aging
* Exceptions

## 5.3 Global Search

Must support:

* customer
* invoice
* phone
* email
* item
* SKU
* order
* payment ref
* ticket / case
* subscription / contract

Search result UI should be grouped by type.

---

## 6. Primary Screen Inventory

## 6.1 Home / Operations Dashboard

### Purpose

Give each operator a clean starting point.

### Sections

* my tasks
* pending approvals
* today’s billing issues
* overdue payments
* recent customers
* recent invoices
* alerts / failed jobs / sync issues
* KPI strip
* quick actions

### Key actions

* create customer
* create invoice
* record payment
* search anything
* resolve exception

---

## 6.2 Customer List Screen

### Purpose

Main workspace for customer discovery and filtering.

### Layout

* left filter rail or top filter bar
* central table/list
* optional detail preview panel

### Columns

* customer name
* segment / group
* phone
* email
* location
* account status
* outstanding
* last invoice date
* tags
* assigned owner

### Features

* saved views
* bulk actions
* export
* quick status chips
* inline notes indicator

---

## 6.3 Customer 360 Screen

### Purpose

Unified customer detail screen.

### Layout

Header + summary cards + tabbed content

### Header

* name
* account status
* owner
* quick actions
* warning flags

### Summary cards

* outstanding balance
* lifetime billing
* active subscriptions/contracts
* last order/invoice
* open issues/tasks

### Tabs

* Overview
* Billing
* Orders
* Products
* Timeline
* Notes
* Tasks
* Documents

### Actions

* create invoice
* collect payment
* add note
* assign task
* edit profile
* open communication log

---

## 6.4 Billing Overview Screen

### Purpose

Control center for finance-facing operations.

### Widgets

* total invoices today
* unpaid invoices
* overdue amount
* payment collection today
* credit notes
* exception queue

### Panels

* aging summary
* invoice status distribution
* payment method trend
* collection tasks

---

## 6.5 Invoice List Screen

### Layout

Filter bar + invoice table + right quick preview

### Filters

* status
* customer
* date range
* amount range
* overdue
* payment status
* branch/company
* salesperson / owner

### Table columns

* invoice no
* customer
* issue date
* due date
* total
* outstanding
* status
* payment state
* actions

### Actions

* view
* edit draft
* send/share
* record payment
* create credit note
* add internal note

---

## 6.6 Invoice Detail Screen

### Layout

Header + summary + line items + right action rail

### Sections

* invoice header
* customer summary
* line items
* taxes / discounts
* payments applied
* activity timeline
* notes
* related docs

### Action rail

* collect payment
* resend invoice
* add adjustment
* mark exception
* create follow-up task

---

## 6.7 Payment Collection Screen

### Purpose

Give collections team a focused workspace.

### Views

* overdue list
* promised payments
* partial payments
* disputes
* high-value overdue

### Features

* call / follow-up log
* status updates
* next action date
* collection notes
* assign owner
* mark dispute reason

---

## 6.8 Product List Screen

### Purpose

Fast product visibility and maintenance.

### Columns

* item name
* SKU/code
* category
* price
* status
* stock relevance if any
* active plans / bundles
* updated at

### Actions

* add product
* edit product
* manage price
* tag product
* archive/deactivate

---

## 6.9 Product Detail Screen

### Tabs

* Overview
* Pricing
* Bundles / linked items
* Sales usage
* History
* Notes

### Summary

* current selling price
* pricing rules present
* active discounts
* last updated
* billing impact

---

## 6.10 Pricing Workspace

This is important because it should not look like raw ERPNext pricing forms.

### Views

* current price list by product
* upcoming price changes
* recent changes
* discount erosion
* promotion view
* affected products/customers

### Screens inside module

* Price List Explorer
* Product Pricing Detail
* Price Change Register
* Price Impact Analytics
* Discount Attribution Analysis

### Actions

* create/update item price
* schedule future price
* apply pricing rule
* compare before/after
* inspect realized price erosion

---

## 6.11 Order / Sales Workspace

If billing depends on sales flow, include:

* order list
* quote list
* fulfillment state
* conversion to invoice
* approval blockers

---

## 6.12 Tasks / Approvals Workspace

### Purpose

Make work execution linear.

### Views

* assigned to me
* awaiting approval
* blocked
* overdue
* completed recently

### Actions

* approve
* reject
* request change
* comment
* open related object

---

## 6.13 Exception Center

This is one of the highest-value screens.

### Use cases

* failed invoice sync
* pricing mismatch
* payment mismatch
* duplicate customer
* invalid state transitions
* backend validation failures

### Layout

Queue list + detail + suggested fix action

---

## 6.14 Reports / Analytics

Operational, not BI-heavy at first.

### Core report screens

* billing performance
* overdue collections
* customer revenue
* product sales
* pricing impact
* discount erosion
* operator productivity

---

## 7. Shared UI Patterns

## 7.1 List Screen Pattern

Every list screen should include:

* title
* KPI strip
* filters
* search
* saved views
* table/list
* bulk actions
* row quick actions
* row click to open detail

## 7.2 Detail Screen Pattern

Every detail screen should include:

* sticky header
* status chips
* summary cards
* timeline
* tabs
* contextual actions
* related entities

## 7.3 Quick Action Pattern

Frequently used tasks should open in:

* drawer for medium complexity
* modal for quick confirm/entry
* full page only if the task is dense

## 7.4 Timeline Pattern

All important entities should support a consistent timeline:

* creation
* update
* note
* payment
* invoice issued
* dispute raised
* task assigned
* approval action

---

## 8. Key Frontend Features

## 8.1 Command Bar

Global quick action/search:

* search customer/invoice/product
* create invoice
* create customer
* record payment
* open last viewed
* go to module

## 8.2 Saved Views

Operators can save filters and columns.

## 8.3 Keyboard-Driven Flows

Important for ops users:

* open search
* next row
* approve
* open details
* record payment
* save draft

## 8.4 Bulk Actions

On lists:

* assign owner
* tag
* export
* send reminders
* archive
* mark reviewed

## 8.5 Activity & Audit Context

Not just raw logs. Show:

* who changed what
* when
* what matters now

## 8.6 Contextual Right Panel

For:

* notes
* tasks
* recent activity
* related docs
* warnings
* suggested next action

## 8.7 Progressive Disclosure

Do not show all ERP fields at once.
Default:

* summary first
* advanced only when needed

---

## 9. API Thinking

## 9.1 API Philosophy

Do not make the frontend assemble ERP screens from many raw DocType endpoints if avoidable.

Prefer **frontend-oriented service APIs**:

* aggregated
* shaped for screen needs
* stable contracts
* fewer round trips

This is especially important if React Query will manage cache/query invalidation aggressively; API shape should match screen composition, not backend table structure. ([TanStack][2])

## 9.2 API Layers

### A. Raw CRUD APIs

For basic entity operations:

* customer
* invoice
* product
* item price
* payment entry
* task

### B. Screen APIs

For composed screens:

* customer_360
* invoice_detail_bundle
* billing_dashboard_summary
* pricing_workspace_summary
* exception_center_queue

### C. Action APIs

For workflow actions:

* record_payment
* send_invoice
* assign_task
* approve_document
* apply_price_change
* retry_failed_sync

---

## 10. Suggested API Groups

## 10.1 Customers

* list customers
* get customer summary
* get customer 360
* create customer
* update customer
* get customer timeline
* get customer billing summary

## 10.2 Billing

* billing dashboard summary
* list invoices
* get invoice detail bundle
* create invoice draft
* update invoice draft
* submit invoice
* record payment
* get aging summary
* get collection queue

## 10.3 Products

* list products
* get product detail
* create/update product
* get product pricing summary
* get linked sales/billing usage

## 10.4 Pricing

* list current prices
* get product price history
* create/update price
* get price impact summary
* get discount erosion summary
* list pricing rules applied
* list upcoming scheduled prices

## 10.5 Tasks / Approvals

* list tasks
* assign task
* resolve task
* list approvals
* approve/reject action

## 10.6 Exceptions

* list exceptions
* get exception detail
* retry / resolve exception
* assign exception

---

## 11. React Query Strategy

## 11.1 Query Key Convention

Use domain-first keys:

* `['customers', filters]`
* `['customer', id]`
* `['customer360', id]`
* `['invoices', filters]`
* `['invoice', id]`
* `['billingDashboard', filters]`
* `['product', id]`
* `['pricingWorkspace', filters]`

## 11.2 Mutation Pattern

Each mutation should define:

* optimistic behavior only when safe
* invalidation targets
* toast / feedback behavior
* rollback behavior

## 11.3 Cache Strategy

* list/detail cache separation
* invalidate narrow scopes where possible
* prefetch likely next screens
* stale time based on domain volatility

## 11.4 Background Refresh

Use for:

* dashboards
* queues
* task lists
* exception screens

---

## 12. Agent Guidance for Implementation

The agent should treat the frontend as a **domain-driven operational shell**, not a collection of forms.

### Agent priorities

1. Define route map
2. Define layout system
3. Define domain folders
4. Define design system primitives
5. Define query key strategy
6. Define API client contract
7. Build list/detail templates
8. Build dashboard primitives
9. Build workflow actions
10. Add advanced analytics views later

### Agent should not:

* mirror ERPNext form layouts one-to-one
* expose all fields by default
* use document-centric naming everywhere
* tightly couple components to one backend payload shape
* let host-specific SDK concerns leak into core UI

---

## 13. Component/System Breakdown

## 13.1 App Shell Components

* AppShell
* SidebarNav
* Topbar
* CommandBar
* WorkspaceHeader
* ContextPanel

## 13.2 Data Display Components

* DataTable
* EntityList
* SummaryCard
* KPIStrip
* StatusBadge
* Timeline
* EmptyState
* ExceptionBanner

## 13.3 Interaction Components

* QuickActionDrawer
* ConfirmModal
* AssignmentPopover
* FilterBuilder
* SavedViewSelector
* SearchResultPanel

## 13.4 Domain Components

* CustomerSummaryHeader
* CustomerBillingPanel
* InvoiceLineItemsCard
* PaymentActionPanel
* ProductPricingPanel
* PriceImpactCard
* DiscountBreakdownCard

---

## 14. Layout Recommendations by Screen Type

## 14.1 Dashboard

* vertical sections
* small cards first
* queues below
* recent items side-by-side

## 14.2 List Screen

* title + KPI strip
* filters row
* main table
* detail preview optional

## 14.3 Detail Screen

* sticky header
* summary area
* tabs
* right contextual rail

## 14.4 Workflow Screen

* left task queue
* center work pane
* right help/context pane

---

## 15. UX Tone

The frontend should feel:

* clean
* calm
* linear
* premium
* business-credible
* fast
* low-noise

Avoid:

* excessive colors
* heavy ERP clutter
* deeply nested navigation
* multi-step hidden actions
* too many exposed system terms

---

## 16. Dormant React SDK Strategy

Keep a **host adapter layer** only.

Meaning:

* do not design the app around embedded host runtime
* keep a small integration boundary for future ChatGPT/App SDK use
* any host-specific bridge APIs should be isolated behind a provider or integration module

This fits the current Apps SDK model, where component rendering and host communication are specific to the embedded environment and should not dictate your core architecture. ([OpenAI Developers][3])

Suggested adapter concern areas:

* auth/session bridge
* theme bridge
* host actions
* structured tool/result rendering
* host event sync

---

## 17. Delivery Phasing for the Agent

## Phase 1

Foundation

* app shell
* routing
* auth/session
* API client
* React Query setup
* design primitives
* customers list/detail
* invoices list/detail
* dashboard MVP

## Phase 2

Operational core

* payments
* product management
* pricing workspace
* tasks/approvals
* exception center

## Phase 3

Optimization

* saved views
* keyboard workflows
* advanced analytics
* embedded/dormant SDK adapter
* deeper operator productivity features

---

## 18. Final Build Intent

The frontend is not just an admin panel.
It is an **operations operating system** over ERPNext.

Its success should be judged by:

* fewer clicks per task
* faster issue resolution
* lower training time
* better visibility
* smoother work across billing, customers, products, and pricing
* ability to scale daily operations without exposing backend complexity

If you want, I can turn this into a **developer-facing folder structure + route map + API contract matrix** next.

[1]: https://tanstack.com/query/v5/docs/react/overview?utm_source=chatgpt.com "Overview | TanStack Query React Docs"
[2]: https://tanstack.com/query/v5/docs/react/quick-start?utm_source=chatgpt.com "Quick Start | TanStack Query React Docs"
[3]: https://developers.openai.com/apps-sdk/plan/components/?utm_source=chatgpt.com "Design components – Apps SDK"

Design referring to below:
``` 
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Amuse — Frontend Vision Prototype</title>
<style>
  :root {
    --color-background-primary: #ffffff;
    --color-background-secondary: #f5f5f3;
    --color-background-tertiary: #ececea;
    --color-background-info: #E6F1FB;
    --color-background-success: #EAF3DE;
    --color-background-warning: #FAEEDA;
    --color-background-danger: #FCEBEB;
    --color-text-primary: #1a1a1a;
    --color-text-secondary: #6b6b6b;
    --color-text-tertiary: #9b9b9b;
    --color-text-info: #185FA5;
    --color-text-success: #3B6D11;
    --color-text-warning: #854F0B;
    --color-text-danger: #A32D2D;
    --color-border-primary: rgba(0,0,0,0.4);
    --color-border-secondary: rgba(0,0,0,0.3);
    --color-border-tertiary: rgba(0,0,0,0.15);
    --border-radius-md: 8px;
    --border-radius-lg: 12px;
    --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --color-background-primary: #1a1a1a;
      --color-background-secondary: #252525;
      --color-background-tertiary: #303030;
      --color-background-info: #042C53;
      --color-background-success: #173404;
      --color-background-warning: #412402;
      --color-background-danger: #501313;
      --color-text-primary: #e8e8e8;
      --color-text-secondary: #a0a0a0;
      --color-text-tertiary: #707070;
      --color-text-info: #85B7EB;
      --color-text-success: #97C459;
      --color-text-warning: #EF9F27;
      --color-text-danger: #F09595;
      --color-border-primary: rgba(255,255,255,0.4);
      --color-border-secondary: rgba(255,255,255,0.3);
      --color-border-tertiary: rgba(255,255,255,0.15);
    }
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: var(--font-sans); color: var(--color-text-primary); background: var(--color-background-tertiary); display:flex; align-items:center; justify-content:center; min-height:100vh; padding:24px; }
  .shell { display:grid; grid-template-columns:52px minmax(0,1fr); min-height:680px; max-width:960px; width:100%; border:0.5px solid var(--color-border-tertiary); border-radius:var(--border-radius-lg); overflow:hidden; background:var(--color-background-primary); position:relative; }
  .rail { background:var(--color-background-secondary); display:flex; flex-direction:column; align-items:center; padding:12px 0; gap:2px; border-right:0.5px solid var(--color-border-tertiary); }
  .rail-item { width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:var(--border-radius-md); cursor:pointer; transition:background .12s; position:relative; }
  .rail-item:hover, .rail-item.active { background:var(--color-background-tertiary); }
  .rail-item.active::before { content:''; position:absolute; left:-1px; top:8px; bottom:8px; width:2px; border-radius:1px; background:var(--color-text-primary); }
  .rail-icon { width:18px; height:18px; stroke:var(--color-text-secondary); fill:none; stroke-width:1.5; stroke-linecap:round; stroke-linejoin:round; }
  .rail-item.active .rail-icon { stroke:var(--color-text-primary); }
  .main { display:flex; flex-direction:column; overflow:hidden; }
  .topbar { height:44px; display:flex; align-items:center; padding:0 16px; gap:12px; border-bottom:0.5px solid var(--color-border-tertiary); flex-shrink:0; }
  .breadcrumb { font-size:13px; color:var(--color-text-secondary); }
  .breadcrumb strong { font-weight:500; color:var(--color-text-primary); }
  .cmd-trigger { margin-left:auto; display:flex; align-items:center; gap:6px; padding:5px 12px; border-radius:var(--border-radius-md); background:var(--color-background-secondary); font-size:12px; color:var(--color-text-tertiary); cursor:pointer; transition:all .12s; border:0.5px solid transparent; }
  .cmd-trigger:hover { border-color:var(--color-border-secondary); color:var(--color-text-secondary); }
  .cmd-trigger kbd { font-family:var(--font-sans); font-size:11px; padding:1px 5px; border-radius:4px; border:0.5px solid var(--color-border-secondary); background:var(--color-background-primary); }
  .page { flex:1; overflow-y:auto; padding:20px; }
  .kpi-strip { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-bottom:20px; }
  .kpi { background:var(--color-background-secondary); border-radius:var(--border-radius-md); padding:12px 14px; cursor:pointer; transition:background .1s; }
  .kpi:hover { background:var(--color-background-tertiary); }
  .kpi-label { font-size:12px; color:var(--color-text-secondary); margin-bottom:2px; }
  .kpi-val { font-size:20px; font-weight:500; }
  .kpi-delta { font-size:11px; margin-top:2px; }
  .kpi-up { color:var(--color-text-success); }
  .kpi-down { color:var(--color-text-danger); }
  .section-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
  .section-title { font-size:14px; font-weight:500; }
  .section-link { font-size:12px; color:var(--color-text-info); cursor:pointer; }
  .tbl { width:100%; border-collapse:collapse; font-size:13px; }
  .tbl th { text-align:left; font-weight:400; font-size:12px; color:var(--color-text-tertiary); padding:8px 10px; border-bottom:0.5px solid var(--color-border-tertiary); }
  .tbl td { padding:8px 10px; border-bottom:0.5px solid var(--color-border-tertiary); }
  .tbl tr { cursor:pointer; transition:background .08s; }
  .tbl tbody tr:hover { background:var(--color-background-secondary); }
  .pill { display:inline-block; font-size:11px; padding:2px 8px; border-radius:10px; font-weight:500; }
  .pill-green { background:var(--color-background-success); color:var(--color-text-success); }
  .pill-amber { background:var(--color-background-warning); color:var(--color-text-warning); }
  .pill-red { background:var(--color-background-danger); color:var(--color-text-danger); }
  .pill-blue { background:var(--color-background-info); color:var(--color-text-info); }
  .pill-gray { background:var(--color-background-secondary); color:var(--color-text-secondary); }
  .two-col { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:16px; }
  .card { background:var(--color-background-primary); border:0.5px solid var(--color-border-tertiary); border-radius:var(--border-radius-lg); padding:14px 16px; }
  .queue-item { display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:0.5px solid var(--color-border-tertiary); }
  .queue-item:last-child { border-bottom:none; }
  .queue-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
  .queue-text { font-size:13px; flex:1; }
  .queue-meta { font-size:11px; color:var(--color-text-tertiary); }
  .hidden { display:none; }
  .cmd-overlay { position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.35); z-index:100; display:flex; align-items:flex-start; justify-content:center; padding-top:80px; }
  .cmd-box { width:420px; background:var(--color-background-primary); border-radius:var(--border-radius-lg); border:0.5px solid var(--color-border-secondary); overflow:hidden; }
  .cmd-input { width:100%; padding:14px 16px; border:none; outline:none; font-size:14px; background:transparent; color:var(--color-text-primary); font-family:var(--font-sans); }
  .cmd-results { border-top:0.5px solid var(--color-border-tertiary); padding:6px; }
  .cmd-result { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:var(--border-radius-md); cursor:pointer; font-size:13px; }
  .cmd-result:hover, .cmd-result.sel { background:var(--color-background-secondary); }
  .cmd-type { font-size:11px; color:var(--color-text-tertiary); min-width:56px; }
  .pricing-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:0.5px solid var(--color-border-tertiary); }
  .pricing-row:last-child { border-bottom:none; }
  .pr-name { font-size:13px; font-weight:500; flex:1; }
  .pr-price { font-size:13px; font-weight:500; min-width:60px; text-align:right; }
  .pr-change { font-size:12px; min-width:50px; text-align:right; }
  .pr-bar { height:4px; border-radius:2px; background:var(--color-background-secondary); width:80px; overflow:hidden; }
  .pr-bar-fill { height:100%; border-radius:2px; }
  .tab-row { display:flex; gap:0; border-bottom:0.5px solid var(--color-border-tertiary); margin-bottom:14px; }
  .tab-btn { padding:8px 14px; font-size:13px; cursor:pointer; color:var(--color-text-secondary); border-bottom:2px solid transparent; transition:all .1s; background:none; border-top:none; border-left:none; border-right:none; font-family:var(--font-sans); }
  .tab-btn.active { color:var(--color-text-primary); font-weight:500; border-bottom-color:var(--color-text-primary); }
  .tab-btn:hover { color:var(--color-text-primary); }
  .timeline-item { display:flex; gap:10px; padding:8px 0; }
  .tl-dot-wrap { display:flex; flex-direction:column; align-items:center; width:16px; flex-shrink:0; }
  .tl-dot { width:8px; height:8px; border-radius:50%; background:var(--color-border-secondary); flex-shrink:0; margin-top:4px; }
  .tl-line { flex:1; width:1px; background:var(--color-border-tertiary); margin-top:4px; }
  .tl-content { flex:1; }
  .tl-text { font-size:13px; }
  .tl-time { font-size:11px; color:var(--color-text-tertiary); }
  .screen-label { font-size:11px; letter-spacing:0.06em; text-transform:uppercase; color:var(--color-text-tertiary); margin-bottom:12px; }
</style>
</head>
<body>
<div class="shell" id="app">
  <div class="rail">
    <div class="rail-item active" data-screen="home" onclick="go('home')"><svg class="rail-icon" viewBox="0 0 20 20"><path d="M3 10L10 3l7 7"/><path d="M5 9v7a1 1 0 001 1h3v-4h2v4h3a1 1 0 001-1V9"/></svg></div>
    <div class="rail-item" data-screen="customers" onclick="go('customers')"><svg class="rail-icon" viewBox="0 0 20 20"><circle cx="10" cy="7" r="3"/><path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg></div>
    <div class="rail-item" data-screen="billing" onclick="go('billing')"><svg class="rail-icon" viewBox="0 0 20 20"><rect x="3" y="4" width="14" height="12" rx="1.5"/><path d="M3 8h14"/><path d="M7 12h3"/></svg></div>
    <div class="rail-item" data-screen="pricing" onclick="go('pricing')"><svg class="rail-icon" viewBox="0 0 20 20"><path d="M10 3v14M6 7l4-4 4 4M6 13l4 4 4-4"/></svg></div>
    <div class="rail-item" data-screen="exceptions" onclick="go('exceptions')"><svg class="rail-icon" viewBox="0 0 20 20"><path d="M10 3l7.5 13H2.5L10 3z"/><path d="M10 9v3"/><circle cx="10" cy="14" r="0.5"/></svg></div>
    <div style="flex:1"></div>
    <div class="rail-item" onclick="go('home')"><svg class="rail-icon" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7"/><path d="M10 7v3l2 2"/></svg></div>
  </div>

  <div class="main">
    <div class="topbar">
      <span class="breadcrumb" id="breadcrumb"><strong>Home</strong></span>
      <div class="cmd-trigger" onclick="toggleCmd()">Search or jump to... <kbd>K</kbd></div>
    </div>

    <div class="page" id="page-home">
      <div class="screen-label">Operations dashboard</div>
      <div class="kpi-strip">
        <div class="kpi"><div class="kpi-label">Revenue today</div><div class="kpi-val">&#8377;1.24L</div><div class="kpi-delta kpi-up">+12% vs yesterday</div></div>
        <div class="kpi"><div class="kpi-label">Visitors</div><div class="kpi-val">342</div><div class="kpi-delta kpi-up">+8%</div></div>
        <div class="kpi"><div class="kpi-label">ARPV</div><div class="kpi-val">&#8377;362</div><div class="kpi-delta kpi-down">-3%</div></div>
        <div class="kpi"><div class="kpi-label">Combo adoption</div><div class="kpi-val">41%</div><div class="kpi-delta kpi-up">+5pp</div></div>
      </div>
      <div class="two-col">
        <div class="card">
          <div class="section-head"><span class="section-title">Price changes this week</span><span class="section-link" onclick="go('pricing')">View all</span></div>
          <div class="pricing-row"><span class="pr-name">Water park access</span><span class="pr-change kpi-up">+&#8377;50</span><span class="pr-price">&#8377;350</span></div>
          <div class="pricing-row"><span class="pr-name">All ride access combo</span><span class="pr-change kpi-down">-&#8377;50</span><span class="pr-price">&#8377;749</span></div>
          <div class="pricing-row"><span class="pr-name">4D motion theater</span><span class="pr-change" style="color:var(--color-text-tertiary)">&mdash;</span><span class="pr-price">&#8377;100</span></div>
        </div>
        <div class="card">
          <div class="section-head"><span class="section-title">Exception queue</span><span class="section-link" onclick="go('exceptions')">Resolve</span></div>
          <div class="queue-item"><div class="queue-dot" style="background:var(--color-text-danger)"></div><div class="queue-text">Failed snapshot: Bumper cars regime</div><div class="queue-meta">2h ago</div></div>
          <div class="queue-item"><div class="queue-dot" style="background:var(--color-text-warning)"></div><div class="queue-text">Pricing mismatch: Kids play combo</div><div class="queue-meta">4h ago</div></div>
          <div class="queue-item"><div class="queue-dot" style="background:var(--color-text-info)"></div><div class="queue-text">Pending approval: Drop tower reprice</div><div class="queue-meta">1d ago</div></div>
        </div>
      </div>
      <div style="margin-top:16px;">
        <div class="card">
          <div class="section-head"><span class="section-title">Today's invoices</span><span class="section-link" onclick="go('billing')">All invoices</span></div>
          <table class="tbl"><thead><tr><th>Invoice</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead><tbody>
            <tr><td style="font-weight:500">INV-2026-0342</td><td>Walk-in #1087</td><td>&#8377;799</td><td><span class="pill pill-green">Paid</span></td></tr>
            <tr><td style="font-weight:500">INV-2026-0341</td><td>Al Rashid family</td><td>&#8377;1,547</td><td><span class="pill pill-green">Paid</span></td></tr>
            <tr><td style="font-weight:500">INV-2026-0340</td><td>Skyline Tours (group)</td><td>&#8377;12,400</td><td><span class="pill pill-amber">Partial</span></td></tr>
            <tr><td style="font-weight:500">INV-2026-0339</td><td>Walk-in #1086</td><td>&#8377;299</td><td><span class="pill pill-green">Paid</span></td></tr>
          </tbody></table>
        </div>
      </div>
    </div>

    <div class="page hidden" id="page-customers">
      <div class="screen-label">Customers</div>
      <div class="kpi-strip">
        <div class="kpi"><div class="kpi-label">Total customers</div><div class="kpi-val">1,847</div></div>
        <div class="kpi"><div class="kpi-label">New this month</div><div class="kpi-val">124</div></div>
        <div class="kpi"><div class="kpi-label">Avg. lifetime value</div><div class="kpi-val">&#8377;2,340</div></div>
        <div class="kpi"><div class="kpi-label">Repeat rate</div><div class="kpi-val">18%</div></div>
      </div>
      <div class="card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <input type="text" placeholder="Search customers..." style="flex:1;font-size:13px;padding:7px 12px;border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);background:var(--color-background-primary);color:var(--color-text-primary);font-family:var(--font-sans);">
          <button style="font-size:12px;padding:7px 14px;border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);background:transparent;color:var(--color-text-primary);cursor:pointer;font-family:var(--font-sans);">+ New customer</button>
        </div>
        <table class="tbl"><thead><tr><th>Name</th><th>Phone</th><th>Visits</th><th>Lifetime revenue</th><th>Last visit</th></tr></thead><tbody>
          <tr><td style="font-weight:500">Skyline Tours</td><td>+971 50 XXX 4421</td><td>12</td><td>&#8377;86,400</td><td>Today</td></tr>
          <tr><td style="font-weight:500">Al Rashid family</td><td>+971 55 XXX 8832</td><td>4</td><td>&#8377;6,188</td><td>Today</td></tr>
          <tr><td style="font-weight:500">Priya Menon</td><td>+91 98XX XXX 201</td><td>3</td><td>&#8377;4,247</td><td>18 Mar</td></tr>
          <tr><td style="font-weight:500">Dubai School Trip (DPS)</td><td>+971 4 XXX 1100</td><td>2</td><td>&#8377;24,800</td><td>15 Mar</td></tr>
        </tbody></table>
      </div>
    </div>

    <div class="page hidden" id="page-billing">
      <div class="screen-label">Billing</div>
      <div class="kpi-strip">
        <div class="kpi"><div class="kpi-label">Invoices today</div><div class="kpi-val">47</div></div>
        <div class="kpi"><div class="kpi-label">Revenue today</div><div class="kpi-val">&#8377;1.24L</div></div>
        <div class="kpi"><div class="kpi-label">Outstanding</div><div class="kpi-val">&#8377;18,200</div></div>
        <div class="kpi"><div class="kpi-label">Collection rate</div><div class="kpi-val">96%</div></div>
      </div>
      <div class="tab-row">
        <button class="tab-btn active">All invoices</button>
        <button class="tab-btn">Unpaid</button>
        <button class="tab-btn">Overdue</button>
        <button class="tab-btn">Credit notes</button>
      </div>
      <div class="card" style="padding:0;">
        <table class="tbl"><thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Amount</th><th>Outstanding</th><th>Status</th></tr></thead><tbody>
          <tr><td style="font-weight:500">INV-2026-0342</td><td>Walk-in #1087</td><td>22 Mar</td><td>&#8377;799</td><td>&#8377;0</td><td><span class="pill pill-green">Paid</span></td></tr>
          <tr><td style="font-weight:500">INV-2026-0340</td><td>Skyline Tours</td><td>22 Mar</td><td>&#8377;12,400</td><td>&#8377;6,200</td><td><span class="pill pill-amber">Partial</span></td></tr>
          <tr><td style="font-weight:500">INV-2026-0338</td><td>Dubai School Trip</td><td>21 Mar</td><td>&#8377;24,800</td><td>&#8377;12,000</td><td><span class="pill pill-red">Overdue</span></td></tr>
          <tr><td style="font-weight:500">INV-2026-0335</td><td>Walk-in #1082</td><td>21 Mar</td><td>&#8377;499</td><td>&#8377;0</td><td><span class="pill pill-green">Paid</span></td></tr>
          <tr><td style="font-weight:500">INV-2026-0334</td><td>Priya Menon</td><td>20 Mar</td><td>&#8377;1,547</td><td>&#8377;0</td><td><span class="pill pill-green">Paid</span></td></tr>
        </tbody></table>
      </div>
    </div>

    <div class="page hidden" id="page-pricing">
      <div class="screen-label">Pricing workspace</div>
      <div class="kpi-strip">
        <div class="kpi"><div class="kpi-label">Active prices</div><div class="kpi-val">14</div></div>
        <div class="kpi"><div class="kpi-label">Changes this month</div><div class="kpi-val">3</div></div>
        <div class="kpi"><div class="kpi-label">Price realization</div><div class="kpi-val">87%</div><div class="kpi-delta kpi-down">-2pp</div></div>
        <div class="kpi"><div class="kpi-label">Discount erosion</div><div class="kpi-val">&#8377;14.2K</div></div>
      </div>
      <div class="tab-row">
        <button class="tab-btn active">Current prices</button>
        <button class="tab-btn">Recent changes</button>
        <button class="tab-btn">Discount erosion</button>
        <button class="tab-btn">Before / after</button>
      </div>
      <div class="card" style="padding:0;">
        <table class="tbl"><thead><tr><th>Item</th><th>Tier</th><th>Base price</th><th>Avg. realized</th><th>Realization</th><th>Last changed</th></tr></thead><tbody>
          <tr><td style="font-weight:500">Water park access</td><td><span class="pill pill-amber">Premium</span></td><td>&#8377;350</td><td>&#8377;328</td><td><span style="color:var(--color-text-warning)">94%</span></td><td>20 Mar</td></tr>
          <tr><td style="font-weight:500">Aquarium tunnel</td><td><span class="pill pill-blue">Standard</span></td><td>&#8377;100</td><td>&#8377;82</td><td><span style="color:var(--color-text-danger)">82%</span></td><td>15 Feb</td></tr>
          <tr><td style="font-weight:500">Haunted house</td><td><span class="pill pill-blue">Standard</span></td><td>&#8377;100</td><td>&#8377;97</td><td><span style="color:var(--color-text-success)">97%</span></td><td>10 Jan</td></tr>
          <tr><td style="font-weight:500">4D motion theater</td><td><span class="pill pill-blue">Standard</span></td><td>&#8377;100</td><td>&#8377;91</td><td><span style="color:var(--color-text-success)">91%</span></td><td>10 Jan</td></tr>
          <tr><td style="font-weight:500">Gyroscope ride</td><td><span class="pill pill-green">Value</span></td><td>&#8377;40</td><td>&#8377;38</td><td><span style="color:var(--color-text-success)">95%</span></td><td>10 Jan</td></tr>
          <tr><td style="font-weight:500">Inflatable play zone</td><td><span class="pill pill-green">Value</span></td><td>&#8377;30</td><td>&#8377;24</td><td><span style="color:var(--color-text-danger)">80%</span></td><td>10 Jan</td></tr>
        </tbody></table>
      </div>
      <div class="two-col" style="margin-top:14px;">
        <div class="card">
          <div class="section-title" style="margin-bottom:10px;">Discount attribution (this month)</div>
          <div class="pricing-row"><span class="pr-name">Combo bundle discounts</span><div class="pr-bar"><div class="pr-bar-fill" style="width:62%;background:var(--color-text-info)"></div></div><span class="pr-price">&#8377;8.8K</span></div>
          <div class="pricing-row"><span class="pr-name">Pricing rule discounts</span><div class="pr-bar"><div class="pr-bar-fill" style="width:22%;background:var(--color-text-warning)"></div></div><span class="pr-price">&#8377;3.1K</span></div>
          <div class="pricing-row"><span class="pr-name">Manual / invoice-level</span><div class="pr-bar"><div class="pr-bar-fill" style="width:12%;background:var(--color-text-danger)"></div></div><span class="pr-price">&#8377;1.7K</span></div>
          <div class="pricing-row"><span class="pr-name">Coupon codes</span><div class="pr-bar"><div class="pr-bar-fill" style="width:4%;background:var(--color-text-secondary)"></div></div><span class="pr-price">&#8377;0.6K</span></div>
        </div>
        <div class="card">
          <div class="section-title" style="margin-bottom:10px;">Price change timeline</div>
          <div class="timeline-item"><div class="tl-dot-wrap"><div class="tl-dot" style="background:var(--color-text-info)"></div><div class="tl-line"></div></div><div class="tl-content"><div class="tl-text">Water park access &#8377;300 &rarr; &#8377;350</div><div class="tl-time">20 Mar &mdash; Seasonal revision &mdash; by Safwan</div></div></div>
          <div class="timeline-item"><div class="tl-dot-wrap"><div class="tl-dot" style="background:var(--color-text-warning)"></div><div class="tl-line"></div></div><div class="tl-content"><div class="tl-text">All ride access &#8377;799 &rarr; &#8377;749</div><div class="tl-time">18 Mar &mdash; Demand adjustment &mdash; by Safwan</div></div></div>
          <div class="timeline-item"><div class="tl-dot-wrap"><div class="tl-dot"></div></div><div class="tl-content"><div class="tl-text">Bird aviary &#8377;80 &rarr; &#8377;100</div><div class="tl-time">15 Feb &mdash; Margin correction &mdash; by Salim</div></div></div>
        </div>
      </div>
    </div>

    <div class="page hidden" id="page-exceptions">
      <div class="screen-label">Exception center</div>
      <div class="kpi-strip" style="grid-template-columns:repeat(3,minmax(0,1fr));">
        <div class="kpi"><div class="kpi-label">Open exceptions</div><div class="kpi-val" style="color:var(--color-text-danger)">5</div></div>
        <div class="kpi"><div class="kpi-label">Resolved today</div><div class="kpi-val">3</div></div>
        <div class="kpi"><div class="kpi-label">Avg. resolution time</div><div class="kpi-val">2.4h</div></div>
      </div>
      <div class="card" style="padding:0;">
        <table class="tbl"><thead><tr><th>Exception</th><th>Type</th><th>Severity</th><th>Age</th><th>Action</th></tr></thead><tbody>
          <tr><td style="font-weight:500">Snapshot failed: Bumper cars price regime</td><td>Job failure</td><td><span class="pill pill-red">Critical</span></td><td>2h</td><td style="color:var(--color-text-info);cursor:pointer">Retry</td></tr>
          <tr><td style="font-weight:500">Kids play combo: realized &lt; 70% of base</td><td>Pricing anomaly</td><td><span class="pill pill-amber">Warning</span></td><td>4h</td><td style="color:var(--color-text-info);cursor:pointer">Inspect</td></tr>
          <tr><td style="font-weight:500">Drop tower reprice pending approval</td><td>Approval blocked</td><td><span class="pill pill-blue">Info</span></td><td>1d</td><td style="color:var(--color-text-info);cursor:pointer">Approve</td></tr>
          <tr><td style="font-weight:500">Duplicate customer: Walk-in #1082 / #1084</td><td>Data quality</td><td><span class="pill pill-amber">Warning</span></td><td>2d</td><td style="color:var(--color-text-info);cursor:pointer">Merge</td></tr>
          <tr><td style="font-weight:500">Invoice sync failed: INV-2026-0336</td><td>Sync failure</td><td><span class="pill pill-red">Critical</span></td><td>3d</td><td style="color:var(--color-text-info);cursor:pointer">Retry</td></tr>
        </tbody></table>
      </div>
    </div>
  </div>

  <div class="cmd-overlay hidden" id="cmd-overlay" onclick="toggleCmd()">
    <div class="cmd-box" onclick="event.stopPropagation()">
      <input class="cmd-input" placeholder="Search customers, invoices, products..." id="cmd-input" oninput="filterCmd(this.value)">
      <div class="cmd-results" id="cmd-results">
        <div class="cmd-result sel"><span class="cmd-type">Customer</span> Skyline Tours</div>
        <div class="cmd-result"><span class="cmd-type">Invoice</span> INV-2026-0342</div>
        <div class="cmd-result"><span class="cmd-type">Product</span> Water park access</div>
        <div class="cmd-result"><span class="cmd-type">Action</span> Record payment</div>
        <div class="cmd-result"><span class="cmd-type">Action</span> Create invoice</div>
      </div>
    </div>
  </div>
</div>

<script>
var pages = ['home','customers','billing','pricing','exceptions'];
var labels = { home:'Home', customers:'Customers', billing:'Billing', pricing:'Pricing', exceptions:'Exceptions' };
function go(name) {
  pages.forEach(function(p) {
    document.getElementById('page-'+p).classList.toggle('hidden', p!==name);
  });
  document.querySelectorAll('.rail-item[data-screen]').forEach(function(el) {
    el.classList.toggle('active', el.dataset.screen===name);
  });
  document.getElementById('breadcrumb').innerHTML = '<strong>'+labels[name]+'</strong>';
}
function toggleCmd() {
  var ov = document.getElementById('cmd-overlay');
  ov.classList.toggle('hidden');
  if(!ov.classList.contains('hidden')) {
    var inp = document.getElementById('cmd-input');
    inp.value = '';
    setTimeout(function(){ inp.focus(); }, 50);
    filterCmd('');
  }
}
var allResults = [
  {type:'Customer', text:'Skyline Tours'},
  {type:'Customer', text:'Al Rashid family'},
  {type:'Customer', text:'Priya Menon'},
  {type:'Invoice', text:'INV-2026-0342'},
  {type:'Invoice', text:'INV-2026-0340'},
  {type:'Product', text:'Water park access'},
  {type:'Product', text:'Haunted house'},
  {type:'Product', text:'Aquarium tunnel'},
  {type:'Action', text:'Record payment'},
  {type:'Action', text:'Create invoice'},
  {type:'Action', text:'New customer'},
];
function filterCmd(q) {
  var container = document.getElementById('cmd-results');
  var lower = q.toLowerCase();
  var matches = allResults.filter(function(r){ return !q || r.text.toLowerCase().indexOf(lower)!==-1 || r.type.toLowerCase().indexOf(lower)!==-1; });
  container.innerHTML = matches.slice(0,6).map(function(r,i){
    return '<div class="cmd-result'+(i===0?' sel':'')+'"><span class="cmd-type">'+r.type+'</span> '+r.text+'</div>';
  }).join('');
}
document.addEventListener('keydown', function(e) {
  if((e.metaKey||e.ctrlKey) && e.key==='k') { e.preventDefault(); toggleCmd(); }
  if(e.key==='Escape') { document.getElementById('cmd-overlay').classList.add('hidden'); }
});
</script>
</body>
</html>```