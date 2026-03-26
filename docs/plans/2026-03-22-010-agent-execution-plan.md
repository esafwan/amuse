# Amuse — Agent Execution Plan

> **Date:** 2026-03-22
> **Last progress sync:** 2026-03-23
> **Status:** Active execution plan
> **Method:** Compound Engineering
> **Source branch:** [`claude/agent-execution-plan-ycBCA`](https://github.com/esafwan/amuse/tree/claude/agent-execution-plan-ycBCA)
> **Product analysis:** [`docs/product-analysis.md`](../product-analysis.md)
> **Repository:** [github.com/esafwan/amuse](https://github.com/esafwan/amuse)

---

## Executive Summary

This plan addresses the **critical gaps** identified in `docs/product-analysis.md` and adds a **capability-based permissions system** modeled after HUF's proven implementation. Work is organized into **6 objective groups** ordered by dependency and impact. Each group contains atomic, independently testable tasks.

---

## Objective Group 1: Wire Critical Backend Infrastructure (P0 — Blockers)

**Goal:** Make the existing code actually work. These are 1-line to 50-line fixes that unblock everything downstream.

### 1.1 Register Item Price hook in `hooks.py`

**File:** `amuse/hooks.py`

```python
doc_events = {
    "Item Price": {
        "on_update": "amuse.services.price_change_detector.handle_item_price_change"
    }
}
```

**Why:** Without this, price changes in ERPNext Desk are silently ignored. The entire Pricing Intelligence module produces no data.

**Verification:** Change an Item Price in Desk → confirm a `Price Change Log` record is created with status "Pending".

### 1.2 Implement `analytics_snapshot.process_regime_snapshot()`

**File:** `amuse/services/analytics_snapshot.py`

**What to implement:**
1. Query `Sales Invoice Item` records for the price regime window (between `valid_from` and `valid_upto` of the Item Price)
2. Filter by `item_code` matching the Price Change Log's item
3. Aggregate: `total_qty`, `total_revenue` (sum of `amount`), `average_realized_price` (revenue / qty)
4. Count `unique_customers` and `new_customers` (first-time buyers during regime)
5. Compute `revenue_per_customer` (revenue / unique_customers)
6. Leave discount attribution fields for Objective Group 4

**Verification:** Trigger snapshot rebuild on an existing Price Change Log → confirm non-zero metrics appear.

### 1.3 Implement discount attribution computation

**File:** `amuse/services/analytics_snapshot.py` (extend `process_regime_snapshot`)

**What to implement:**
Populate the 8 discount attribution fields in `Price Change Log`:
- `pricing_rule_discount_value` — from `Sales Invoice Item.pricing_rules`
- `coupon_discount_value` — from `Sales Invoice.coupon_code`
- `promo_discount_value` — from `Sales Invoice.additional_discount_percentage` where linked to a Promotional Scheme
- `manual_discount_value` — from `Sales Invoice Item.discount_percentage` where no pricing rule
- `residual_discount_value` — difference between total discount and attributed discount

**Verification:** Create invoices with various discount types → trigger snapshot → confirm attribution fields sum to total discount.

---

## Objective Group 2: Capability-Based Permissions & Roles (P1 — Modeled after HUF)

**Goal:** Implement a complete role-based access control system following HUF's three-layer architecture: Capabilities → Amuse Roles → Frappe Roles.

### 2.1 Define Amuse Capability Catalogue

**New file:** `amuse/permissions.py`

```python
CAPABILITIES = {
    # POS
    "pos.use": "Use POS",
    "pos.open_session": "Open POS Session",
    "pos.close_session": "Close POS Session",
    "pos.apply_discount": "Apply Manual Discounts",
    "pos.void_transaction": "Void a Transaction",

    # Billing
    "billing.view": "View Invoices",
    "billing.create": "Create Invoices",
    "billing.submit": "Submit Invoices",
    "billing.cancel": "Cancel Invoices",
    "billing.create_payment": "Create Payment Entries",

    # Customers
    "customers.view": "View Customers",
    "customers.create": "Create Customers",
    "customers.edit": "Edit Customers",

    # Tickets (Phase B prep — define capabilities now, implement later)
    "tickets.view": "View Tickets",
    "tickets.issue": "Issue Tickets",
    "tickets.redeem": "Redeem Tickets",
    "tickets.void": "Void Tickets",
    "tickets.view_capacity": "View Capacity",

    # Pricing Intelligence
    "pricing.view": "View Price Change Logs",
    "pricing.edit_prices": "Edit Item Prices",
    "pricing.trigger_snapshot": "Trigger Snapshot Rebuild",
    "pricing.view_analytics": "View Pricing Analytics",

    # Reports
    "reports.view": "View Reports",
    "reports.export": "Export Reports",

    # Users & Roles
    "users.invite": "Invite Users",
    "users.manage": "Manage Users",
    "roles.manage": "Manage Roles",

    # System
    "system.settings": "Manage Settings",
    "system.exceptions": "View Exception Center",
}
```

### 2.2 Define Default Amuse Roles

| Role | Target User | Capabilities |
|---|---|---|
| **Amuse Admin** | Park owner / IT admin | ALL capabilities |
| **Park Manager** | Operations manager | Everything except `users.manage`, `roles.manage`, `system.settings` |
| **Supervisor** | Shift supervisor | POS (all), Billing (all), Customers (all), Tickets (all), Pricing (view only), Reports (view + export) |
| **Cashier** | Front-desk operator | `pos.use`, `pos.open_session`, `billing.view`, `billing.create`, `billing.submit`, `billing.create_payment`, `customers.view`, `customers.create`, `tickets.view`, `tickets.issue`, `tickets.redeem` |
| **Viewer** | Read-only stakeholder | `billing.view`, `customers.view`, `tickets.view`, `pricing.view`, `reports.view` |

### 2.3 Create DocTypes

**DocType: Amuse Role**
- Fields: `role_name` (Data, unique), `description` (Small Text), `is_system_role` (Check), `frappe_role` (Link → Role), `permissions` (Table → Amuse Role Permission)
- Naming: by `role_name`

**DocType: Amuse Role Permission** (Child Table)
- Fields: `capability` (Select — populated from `CAPABILITIES` keys), `label` (Read Only — auto-populated from `CAPABILITIES` values)

**DocType: Amuse User Role** (Assignment Bridge)
- Fields: `user` (Link → User, unique), `full_name` (Read Only, fetch from User), `amuse_role` (Link → Amuse Role), `enabled` (Check, default 1), `invited_by` (Link → User, read only), `invited_on` (Datetime, read only)

### 2.4 Create Permissions API

**New file:** `amuse/api/permissions.py`

| Endpoint | Method | Requires Capability |
|---|---|---|
| `get_me()` | GET | (any logged-in user) |
| `get_users()` | GET | `users.manage` |
| `invite_user(email, full_name, amuse_role)` | POST | `users.invite` |
| `update_user_role(user, amuse_role)` | POST | `users.manage` |
| `set_user_enabled(user, enabled)` | POST | `users.manage` |
| `get_amuse_roles()` | GET | `users.manage` OR `roles.manage` |
| `get_capabilities_catalogue()` | GET | `roles.manage` |
| `create_amuse_role(role_name, description, capabilities)` | POST | `roles.manage` |
| `update_amuse_role(role_name, capabilities, description)` | POST | `roles.manage` |

### 2.5 Core Permission Logic

**File:** `amuse/permissions.py`

```python
def has_capability(user, capability):
    """Central capability checker — cached per request."""
    if user == "Administrator":
        return True
    if "System Manager" in frappe.get_roles(user):
        return True
    capabilities = get_user_capabilities(user)  # cached
    return capability in capabilities

def get_user_capabilities(user):
    """Fetch all capabilities for user from their Amuse Role."""
    # Check cache first
    # Fetch Amuse User Role → Amuse Role → permissions child table
    # Return set of capability strings

def check_app_permission():
    """Controls visibility on Frappe apps screen."""
    user = frappe.session.user
    return user == "Administrator" or "System Manager" in frappe.get_roles(user) \
        or bool(get_user_amuse_role(user))
```

### 2.6 Register Permission Hooks in `hooks.py`

```python
permission_query_conditions = {
    "Sales Invoice": "amuse.permissions.get_invoice_query_conditions",
    "Price Change Log": "amuse.permissions.get_pcl_query_conditions",
}

add_to_apps_screen = [
    {
        "name": "amuse",
        "logo": "/assets/amuse/logo.png",
        "title": "Amuse",
        "route": "/amuse",
        "has_permission": "amuse.permissions.check_app_permission",
    }
]
```

### 2.7 Amuse User Role Controller — Frappe Role Sync

**File:** `amuse/amuse/doctype/amuse_user_role/amuse_user_role.py`

On insert/update:
1. Fetch `frappe_role` from the linked `Amuse Role`
2. Remove any previously-synced Amuse Frappe roles from the user
3. If `enabled`, add the new `frappe_role` to the user
4. Bust capability cache

### 2.8 Seed Default Roles on Install

**File:** `amuse/install.py` (new, called from `hooks.py` → `after_install`)

Create the 5 default roles with `is_system_role = 1` and their capability mappings. Create backing Frappe Roles if they don't exist.

---

## Objective Group 3: Frontend Permissions & User Management UI

**Goal:** Gate the frontend based on capabilities and provide user/role management pages.

### 3.1 Permissions Context

**New file:** `frontend/src/contexts/PermissionsContext.tsx`

```typescript
interface PermissionsContextType {
  amuseRole: string | null;
  capabilities: string[];
  isLoading: boolean;
  hasCapability: (cap: string) => boolean;
  refresh: () => Promise<void>;
}
```

- Calls `amuse.api.permissions.get_me` on mount
- Caches role + capabilities in React state
- Provides `usePermissions()` hook

### 3.2 Mount PermissionsProvider in App.tsx

Wrap routes with `PermissionsProvider` inside the existing `BrowserRouter` / route tree.

### 3.3 Capability-Gated Navigation

**File:** `frontend/src/shell/AppShell.tsx`

Update nav items to include `capability` field:

```typescript
const navItems = [
  { label: "Home", path: "/", icon: Home, capability: null },
  { label: "Sell", path: "/pos", icon: ShoppingCart, capability: "pos.use" },
  { label: "Tickets", path: "/tickets", icon: Ticket, capability: "tickets.view" },
  { label: "Customers", path: "/customers", icon: Users, capability: "customers.view" },
  { label: "Reports", path: "/reports", icon: BarChart, capability: "reports.view" },
];

// Secondary nav (settings/hamburger)
const secondaryNavItems = [
  { label: "Pricing", path: "/pricing", icon: TrendingUp, capability: "pricing.view" },
  { label: "Users", path: "/users", icon: UserPlus, capability: "users.manage" },
  { label: "Exceptions", path: "/exceptions", icon: AlertTriangle, capability: "system.exceptions" },
  { label: "Settings", path: "/settings", icon: Settings, capability: "system.settings" },
];
```

Filter based on `hasCapability()`.

### 3.4 Users Page

**New file:** `frontend/src/pages/UsersPage.tsx`

Features (mirroring HUF):
- **User list** — table with: Name, Email, Role (badge), Status (Active/Disabled), Invited by, Date
- **Invite dialog** — Email + Full Name + Role selector dropdown → calls `invite_user`
- **Role change** — Dropdown on role badge → calls `update_user_role`
- **Enable/Disable toggle** — Switch → calls `set_user_enabled`
- **Gate:** Requires `users.manage` capability

### 3.5 Roles Page

**New file:** `frontend/src/pages/RolesPage.tsx`

Features:
- **Role cards** — one per role, showing: name, description, system badge, grouped capability badges
- **Create role** (for Admin) — dialog with name, description, capability multi-select
- **Edit role capabilities** (for Admin) — expand card to toggle capabilities
- **Gate:** Requires `roles.manage` capability

### 3.6 Add Routes

**File:** `frontend/src/App.tsx`

```typescript
<Route path="/users" element={<RequireAuth><UsersPage /></RequireAuth>} />
<Route path="/roles" element={<RequireAuth><RolesPage /></RequireAuth>} />
```

### 3.7 Permissions API Hook

**New file:** `frontend/src/hooks/usePermissions.ts`

TanStack Query wrappers for all permissions API endpoints:
- `useUserList()`
- `useInviteUser()`
- `useUpdateUserRole()`
- `useSetUserEnabled()`
- `useRoleList()`
- `useCapabilitiesCatalogue()`

---

## Objective Group 4: POS & Billing Completion (P0-P1)

**Goal:** Complete the operational modules so they're fully usable.

### 4.1 POS Print Receipt

**Files:** `frontend/src/pages/POSView.tsx`, `frontend/src/lib/print.ts`

1. After successful payment in checkout modal, show receipt summary screen
2. Add "Print Receipt" button that calls `print.ts` with invoice data
3. Add "New Sale" button to start fresh cart
4. Receipt format: company name, date, items table, totals, payment method, thank-you message

### 4.2 Invoice Creation Form in Billing

**File:** `frontend/src/pages/Billing.tsx`

1. Add "New Invoice" button (gated by `billing.create` capability)
2. Dialog/form with: Customer selector, Item lines (item + qty + rate), Notes
3. Use existing `billing.get_item_details` API for line item price lookup
4. Submit calls `billing.create_invoice` → optionally `billing.submit_invoice`
5. On success, refresh invoice list

### 4.3 Action Gating on POS and Billing

- "Cancel Invoice" button: only visible if `billing.cancel` capability
- "Apply Discount" in POS: only visible if `pos.apply_discount` capability
- "Void Transaction" in POS: only visible if `pos.void_transaction` capability
- "Submit Invoice": only visible if `billing.submit` capability

---

## Objective Group 5: Navigation Restructure & UX Polish

**Goal:** Restructure navigation per the product analysis recommendations.

### 5.1 Primary Nav Reorganization

Change bottom nav from `Home | POS | Pricing | Customers | Exceptions` to:

```
Home | Sell | Tickets | Customers | Reports
```

Move `Pricing`, `Users`, `Exceptions`, `Settings` to a secondary hamburger/settings menu accessible from the top bar or a "More" tab.

### 5.2 Tickets Page Placeholder

**New file:** `frontend/src/pages/TicketsPage.tsx`

Create a placeholder page with:
- "Coming Soon" state with description of ticket features
- This satisfies the nav slot now; full implementation is Phase B

### 5.3 Reports Page Placeholder

**New file:** `frontend/src/pages/ReportsPage.tsx`

Create a placeholder page listing planned reports:
- Daily Revenue Summary
- Capacity Utilization
- Customer Cohort
- Discount Erosion
- Item Popularity

### 5.4 Settings Page

**New file:** `frontend/src/pages/SettingsPage.tsx`

- Link to Pricing Settings (opens Frappe desk form)
- App version info
- Quick links to Frappe desk admin pages

### 5.5 Error Boundaries

Wrap each page component with a React Error Boundary that shows a friendly error message instead of a white screen.

---

## Objective Group 6: Technical Debt & Hardening

**Goal:** Clean up known debt items from the product analysis.

### 6.1 Namespace TanStack Query Cache Keys

**Files:** All hooks in `frontend/src/hooks/`

Add `amuse:` prefix to all query keys:
```typescript
// Before
queryKey: ["invoices", filters]
// After
queryKey: ["amuse", "invoices", filters]
```

### 6.2 Fix `seed_demo.py` Company Hardcoding

**File:** `amuse/seed_demo.py`

Accept `company` as optional parameter, default to first company in system.

### 6.3 Fix `verify_site.py` Logging

**File:** `amuse/verify_site.py`

Replace bare `print()` with `frappe.logger()` or structured JSON output.

### 6.4 Delete or Implement Stub DocType JS Files

**Files:** `amuse/doctype/*/[name].js`

For each stub JS file: if empty/boilerplate, delete it. If it has meaningful scaffolding, implement or leave a TODO comment.

---

## Execution Order & Dependencies

```
Group 1 (Backend Infra)     ─── no dependencies, do FIRST
  │
  ├── 1.1 Wire hook            (standalone, ~5 lines)
  ├── 1.2 Implement snapshot   (standalone, ~80 lines)
  └── 1.3 Discount attribution (depends on 1.2)

Group 2 (Permissions Backend) ─── parallel with Group 1
  │
  ├── 2.1 Capability catalogue (standalone)
  ├── 2.2 Default roles design (standalone, informs 2.3)
  ├── 2.3 Create DocTypes      (depends on 2.1, 2.2)
  ├── 2.4 Permissions API      (depends on 2.3, 2.5)
  ├── 2.5 Core permission logic(depends on 2.1)
  ├── 2.6 Register hooks       (depends on 2.5)
  ├── 2.7 UserRole controller  (depends on 2.3)
  └── 2.8 Seed defaults        (depends on 2.3, 2.2)

Group 3 (Permissions Frontend) ─── depends on Group 2
  │
  ├── 3.1 PermissionsContext   (depends on 2.4)
  ├── 3.2 Mount provider       (depends on 3.1)
  ├── 3.3 Gated navigation     (depends on 3.1)
  ├── 3.4 Users page           (depends on 3.1, 2.4)
  ├── 3.5 Roles page           (depends on 3.1, 2.4)
  ├── 3.6 Add routes           (depends on 3.4, 3.5)
  └── 3.7 Permissions hook     (depends on 2.4)

Group 4 (POS & Billing)       ─── parallel with Groups 2-3
  │
  ├── 4.1 Print receipt        (standalone)
  ├── 4.2 Invoice creation form(standalone)
  └── 4.3 Action gating        (depends on 3.1)

Group 5 (Nav & UX)            ─── depends on Group 3
  │
  ├── 5.1 Nav restructure      (depends on 3.3)
  ├── 5.2 Tickets placeholder  (standalone)
  ├── 5.3 Reports placeholder  (standalone)
  ├── 5.4 Settings page        (standalone)
  └── 5.5 Error boundaries     (standalone)

Group 6 (Tech Debt)           ─── parallel anytime
  │
  ├── 6.1 Cache key namespacing(standalone)
  ├── 6.2 seed_demo fix        (standalone)
  ├── 6.3 verify_site fix      (standalone)
  └── 6.4 Stub JS cleanup      (standalone)
```

---

## Parallel Execution Strategy

An agent should execute in this order for maximum parallelism:

```
Sprint 1 (Foundation):
  ├── Group 1 (all tasks)          — backend fixes
  ├── Group 2.1-2.3, 2.5          — permissions core + DocTypes
  └── Group 6 (all tasks)          — tech debt (independent)

Sprint 2 (Permissions Complete):
  ├── Group 2.4, 2.6-2.8          — permissions API + hooks + seed
  ├── Group 4.1-4.2               — POS receipt + invoice form
  └── Group 5.2-5.5               — placeholder pages + error boundaries

Sprint 3 (Frontend Integration):
  ├── Group 3 (all tasks)          — frontend permissions
  ├── Group 4.3                    — action gating (needs 3.1)
  └── Group 5.1                    — nav restructure (needs 3.3)
```

---

## Amuse Role Definitions (Detailed)

### Cashier
The front-line operator at a POS terminal. Can sell, collect payment, look up customers, and issue tickets. Cannot cancel invoices, apply manual discounts, or access analytics.

```
pos.use, pos.open_session, pos.close_session
billing.view, billing.create, billing.submit, billing.create_payment
customers.view, customers.create
tickets.view, tickets.issue, tickets.redeem
```

### Supervisor
Shift leader who oversees cashiers. Has all Cashier capabilities plus: can cancel invoices, apply manual discounts, void transactions, and view reports.

```
(all Cashier capabilities) +
pos.apply_discount, pos.void_transaction
billing.cancel
customers.edit
tickets.void, tickets.view_capacity
reports.view, reports.export
```

### Park Manager
Operations manager. Has all Supervisor capabilities plus: pricing intelligence, user invitation, and exception monitoring.

```
(all Supervisor capabilities) +
pricing.view, pricing.edit_prices, pricing.trigger_snapshot, pricing.view_analytics
users.invite
system.exceptions
```

### Amuse Admin
Full access to everything including system settings, user management, and role management.

```
ALL capabilities
```

### Viewer
Read-only stakeholder (e.g., investor, auditor). Can view but not modify anything.

```
billing.view
customers.view
tickets.view, tickets.view_capacity
pricing.view, pricing.view_analytics
reports.view
```

---

## Success Criteria

After executing this plan, the Amuse app will:

1. **Track price changes automatically** when Item Prices are modified in ERPNext Desk
2. **Show real analytics** in the Pricing Workspace (revenue, qty, customer metrics, discount attribution)
3. **Have 5 distinct roles** (Admin, Manager, Supervisor, Cashier, Viewer) with capability-based access control
4. **Allow user management** from the frontend (invite, assign role, enable/disable)
5. **Gate all UI actions** based on the logged-in user's capabilities
6. **Print receipts** from POS checkout
7. **Create invoices** from the Billing page (not just POS)
8. **Have a clean navigation structure** with primary ops nav and secondary admin nav
9. **Be resilient** with error boundaries on every page
10. **Have clean technical foundations** (namespaced cache keys, parameterized seeds, proper logging)

---

## Files to Create (New)

| File | Purpose |
|---|---|
| `amuse/permissions.py` | Capability catalogue + core permission logic |
| `amuse/api/permissions.py` | Whitelisted permission management endpoints |
| `amuse/install.py` | Post-install seed for default roles |
| `amuse/amuse/doctype/amuse_role/` | Role DocType (JSON + py + test) |
| `amuse/amuse/doctype/amuse_role_permission/` | Role Permission child table DocType |
| `amuse/amuse/doctype/amuse_user_role/` | User-Role bridge DocType (JSON + py + test) |
| `frontend/src/contexts/PermissionsContext.tsx` | React permissions context + provider |
| `frontend/src/hooks/usePermissions.ts` | TanStack Query hooks for permission APIs |
| `frontend/src/pages/UsersPage.tsx` | User management page |
| `frontend/src/pages/RolesPage.tsx` | Role management page |
| `frontend/src/pages/TicketsPage.tsx` | Placeholder for future ticketing |
| `frontend/src/pages/ReportsPage.tsx` | Placeholder for future reports |
| `frontend/src/pages/SettingsPage.tsx` | App settings page |

## Files to Modify (Existing)

| File | Change |
|---|---|
| `amuse/hooks.py` | Add `doc_events`, `permission_query_conditions`, update `add_to_apps_screen`, add `after_install` |
| `amuse/services/analytics_snapshot.py` | Implement real aggregation logic |
| `frontend/src/App.tsx` | Add new routes, wrap with PermissionsProvider |
| `frontend/src/shell/AppShell.tsx` | Restructure nav, add capability gating |
| `frontend/src/pages/POSView.tsx` | Add print receipt, action gating |
| `frontend/src/pages/Billing.tsx` | Add invoice creation form, action gating |
| `frontend/src/hooks/*.ts` | Namespace query keys |
| `amuse/seed_demo.py` | Parameterize company |
| `amuse/verify_site.py` | Use proper logging |

---

## Progress log (living — compound handoff)

*Synced with implementation reality in the workspace. Update when a group materially advances.*

| Group | Focus | Status | Notes |
|-------|--------|--------|--------|
| **1** | Backend infra (hooks, snapshot, attribution) | **Done** | Item Price hooks + company resolution from Item Default; snapshot + discount buckets; `seed_pricing_intel_demo` for QA. |
| **2** | Capabilities, DocTypes, permissions API | **Done** | `amuse/permissions.py`, Amuse Role / Amuse Role Permission / Amuse User Role, `api/permissions.py`, hooks (`permission_query_conditions`, `add_to_apps_screen.has_permission`, `after_install` + `after_migrate` seed), Frappe role sync on user bridge. Smoke tests in `test_api_smoke.py`. |
| **3** | Frontend permissions, Users/Roles pages | **Done** | `PermissionsProvider` + `usePermissions`, `get_me` via TanStack Query (`amuse` query keys), gated bottom nav + `/more` hub, `UsersPage` / `RolesPage` / `SettingsPage`, `api/permissions.ts` + `usePermissions` mutations. |
| **4** | POS print receipt, Billing new invoice, gating | **Partial** | POS panel UX fixed; print receipt flow + new invoice form + capability gating still open. |
| **5** | Nav restructure, placeholders, error boundaries | **Not started** | Nav still Home·POS·Pricing·Customers·Exceptions. |
| **6** | Tech debt (query keys, seed, verify_site, JS stubs) | **Not started** | |

### Compound engineering links

- **Verification commands** (bench / tests): `amuse/tests/E2E_TEST_PLAN.md` (includes **when the browser cannot reach the site**: Docker shell vs local bench). Also `amuse/tests/test_api_smoke.py`, `amuse/verify_site.py`.
- **Single narrative:** gaps in [`product-analysis.md`](../product-analysis.md) §2 → objectives here → success criteria § below → progress table above.

---

## Document history

| Date | Change |
|------|--------|
| 2026-03-22 | Plan authored on branch `claude/agent-execution-plan-ycBCA`. |
| 2026-03-22 | Merged into `docs/plans/` with metadata, GitHub links, and living progress log. |
| 2026-03-22 | Progress log: Group 1 partial; verification pointer updated to `E2E_TEST_PLAN.md` (bench/Docker when browser fails). |
| 2026-03-22 | Group 1.3: `process_regime_snapshot` attributes line and distributed discounts; `promotional_scheme_discount_value` remains 0 pending clearer ERPNext linkage. |
| 2026-03-23 | Group 2 complete: capability catalogue, Amuse Role / Amuse Role Permission / Amuse User Role, permissions API, hooks, install + after_migrate seed, Frappe role sync, API smoke tests. |
| 2026-03-23 | Group 3 complete: PermissionsContext, gated nav, More/Users/Roles/Settings pages, permission API client + hooks; `get_amuse_roles` returns `capabilities` per role for the SPA. |

