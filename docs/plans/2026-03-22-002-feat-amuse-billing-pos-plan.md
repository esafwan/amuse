---
title: "feat: Amuse — Billing & POS (React + ERPNext Backend)"
type: feat
status: draft
date: 2026-03-22
depends_on: "2026-03-22-001-feat-amuse-frappe-app-react-frontend-plan"
---

# feat: Amuse — Billing & POS (React + ERPNext Backend)

Build the billing and POS functionality for the Amuse app using the Compound Engineering methodology. This plan focuses strictly on step-by-step un-implemented steps to be executed only after approval.

## Context
This feature connects the React frontend to ERPNext's sales and pricing engine. No custom DocTypes are added for billing—we solely utilize ERPNext's `Sales Invoice`, `Payment Entry`, `POS Profile`, etc.

---

## Execution Steps (DO NOT IMPLEMENT YET)

### Step 1: Backend Integration Analysis (via MCP & Docker)
Before writing code, we must understand the baseline system over the Frappe instance:
1. **Query via MCP:** List all existing `Company`, `POS Profile`, and `Item` documents to ensure ERPNext is populated for testing.
2. **Read Settings:** Fetch `POS Settings` to determine if POS bills as `POS Invoice` or `Sales Invoice`.
3. **Verify Auth:** In browser, login to Desk and ensure the React SPA at `/amuse` picks up the correct `csrf_token` and boots successfully without requesting a separate login.

### Step 2: Phase 2A — Python API Layer (`amuse/api/*.py`)
1. Create `amuse/api/billing.py` with `@frappe.whitelist()` functions wrapping `erpnext.accounts.party.get_party_details` and `frappe.client.insert("Sales Invoice", ...)`.
2. Create `amuse/api/pos.py` wrapping POS abstractions (`check_opening_entry`, `create_opening_voucher`, `get_items`, `get_stock_availability`).
3. Create `amuse/api/customers.py` wrapping search autocomplete (`frappe.desk.search.search_link`) and customer CRUD.
4. Add `required_apps = ["erpnext"]` to `hooks.py`.
5. **Validation:** Run `docker exec -it fdocker_devcontainer-frappe-1 bash -c "cd /workspace/development/ainative && bench execute amuse.api.pos.get_pos_settings"` via console to test the Python RPC layer.

### Step 3: Phase 2B — React Hooks (`frontend/src/hooks/`)
1. Create `useInvoice.ts`: implement `useInvoiceList()`, `useInvoice(name)`, `useCreateInvoice()`, and `useSubmitInvoice()` using TanStack Query, calling `amuse.api.billing.*`.
2. Create `useCustomer.ts`: implement `useCustomerSearch(txt)`, `useCreateCustomer()`, calling `amuse.api.customers.*`.
3. Create `usePOS.ts`: implement `useOpeningEntry()`, `usePOSItems()`, calling `amuse.api.pos.*`.
4. **Validation:** Run an isolated vitest or use console logs hooked up to browser devtools to ensure React Query hits `/api/method/` correctly.

### Step 4: Phase 2C — React UI Screens (`frontend/src/pages/`)
1. **Invoice Views:** Implement `/billing` (list view filtering `status="Draft"`) and `/billing/new` (form view selecting a Customer via search, adding Items, showing grand total, and supporting Save/Submit).
2. **Customer Views:** Implement `/customers` (list view) and `/customers/new` (basic fields: `customer_name`, `customer_group`).
3. **POS Views:** Implement `/pos`.
   - Show POS Opening dialog if `useOpeningEntry()` returns no entries.
   - Show item catalog grid if open.
   - Implement Cart interactions and a Payment modal matching `POS16.md` flow.
4. **Build & Bundle:** Run `docker exec -it fdocker_devcontainer-frappe-1 bash -c "cd /workspace/development/ainative/apps/amuse && bench build --app amuse"`.

### Step 5: End-to-End Browser Testing
1. Navigate to `/amuse` via browser.
2. Click `/customers`, create a test customer.
3. Click `/pos`, handle the Opening Entry prompt (supply amounts).
4. Add items to the cart, invoke payment modal, submit invoice.
5. Watch network tab for 200 OK on `create_invoice` and `submit_invoice`.
6. Go back to Desk, verify `Sales Invoice` and `Payment Entry` GL ledgers exist for the transaction.
7. Capture any issues into `docs/solutions/` via `compound-docs` skill.
