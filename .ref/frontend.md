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

## 4.2 Layout Style

Primary shell:

* left navigation rail
* top global header
* command/search bar
* page content area
* optional right contextual panel

Preferred pattern:

* **two-pane layout** for most data-heavy screens
* **three-pane layout** only where necessary
* drawers/modals for quick actions
* full-page forms only for complex creation/edit flows

## 4.3 State Model

* server state: React Query
* local UI state: component state / lightweight store
* form state: dedicated form layer
* global state only for session, theme, workspace preferences, and app-wide selections

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
