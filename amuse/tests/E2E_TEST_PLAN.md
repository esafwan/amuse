# Amuse — end-to-end test plan

**Also surfaced in:** workspace `AGENTS.md`, `Docs/compound-engineering/TESTING.md`, and `compound-engineering.local.md`.

This document maps **UI routes** → **React hooks / API** → **Python methods** → **ERPNext DocTypes**, and lists how to verify each layer.

## Current site snapshot (amuse.localhost)

Run:

```bash
bench --site amuse.localhost execute amuse.verify_site.run
```

As of last check, transactional data may be **empty** (no Items, Customers, Sales Invoices, POS Profiles) while **Company** and chart scaffolding exist. The SPA should show **empty states** and still load without API errors. Seed ERPNext master data (Items, Customers, POS Profile, opening entry) before expecting POS/checkout E2E to succeed.

---

## 1. Automated checks (implement / run)

| ID | Layer | What to run | Pass criteria |
|----|--------|-------------|----------------|
| A1 | API (server) | `bench --site <site> run-tests --module amuse.tests.test_api_smoke --lightmode` | All tests OK (skipped OK if no Price Change Log) |
| A2 | DB + API | `bench --site <site> execute amuse.verify_site.run` | No `ERROR` lines; counts match expectations after seeding |
| A3 | HTTP / REST | Optional: `curl` with session cookie or API key to `/api/method/amuse.api.billing.list_invoices` | `message` is JSON list |
| A4 | MCP | `user-frappe` `list_documents` / `call_method` against same site as bench | Same data as A2 (note: MCP URL must point at this site) |

---

## 2. UI route matrix (manual or browser automation)

| Route | Primary UI | Hooks / client | Backend method(s) | Data expectations |
|-------|------------|------------------|---------------------|-------------------|
| `/amuse/dashboard` | KPIs, quick actions, static demo rows | Mixed; billing list optional | `list_invoices` if wired | Demo list may be static; invoice section empty if no SI |
| `/amuse/billing` | Invoice list + detail | `useInvoiceList`, `useInvoiceDetails`, `useSubmitInvoice` | `amuse.api.billing.list_invoices`, `get_invoice`, `submit_invoice` | Rows = `tabSales Invoice` |
| `/amuse/pos` | POS grid, cart, checkout | `useOpeningEntry`, `usePOSProfile`, `usePOSItems`, `useCreateInvoice` | `check_opening`, `get_profile`, `get_items`, `create_invoice` | Needs **POS Profile**, **Items**, **price list**, often **opening entry** |
| `/amuse/customers` | Customer list | `useCustomerList` / search | `list_customers`, `search_customers`, `get_customer` | Rows = `tabCustomer` |
| `/amuse/pricing` | Price change logs | `usePricing` | `get_price_change_log_list`, `get_price_change_log`, `trigger_snapshot_rebuild`, `get_price_regime_summary` | `Price Change Log` docs |
| `/amuse/exceptions` | Exceptions / jobs UI | pricing hooks | same + jobs | Depends on logs / queue |

**Browser smoke (each route):** no uncaught errors in console; network `POST /api/method/...` returns 200 and JSON without `exc`.

---

## 3. End-to-end flows (after seed data)

1. **Browse invoices** — Open Billing → list loads → open one row → detail shows line items.  
2. **Submit draft invoice** — If draft exists → Submit → status updates (Desk validation).  
3. **POS sale** — Opening entry active → items load → add to cart → checkout → `create_invoice` → new SI in Billing.  
4. **Customers** — List/search returns Desk-consistent rows.  
5. **Pricing** — Log list loads; opening a log loads detail; optional rebuild queues job.

---

## 4. Gaps / notes

- **No fixtures** in `hooks.py` for demo data; use ERPNext **Opening / Item / Customer** setup or custom seed scripts.  
- **MCP `user-frappe`** must target the same Frappe base URL as the site under test; otherwise counts will disagree with `bench`.  
- **`bench run-tests`** without `--lightmode` may pull heavy ERPNext test dependencies; prefer **`--lightmode`** for Amuse smoke tests.

---

## 5. Browser automation and auth

- The SPA calls `/api/method/amuse.api.*` with **`X-Frappe-CSRF-Token`** and the user’s **session cookie**.
- A browser tab that is **not logged in** to Frappe will typically see **`403`** on those endpoints even if the page shell loads.
- Automated browser checks should either: **log in via Desk first**, or use **API key** auth (REST) instead of the SPA `fetch` path.
- **`user-frappe` MCP** uses API keys against `FRAPPE_URL`; align that URL with the site you compare to `bench` (see §4).

---

## 6. Commands reference

```bash
# API smoke (fast)
bench --site amuse.localhost run-tests --module amuse.tests.test_api_smoke --lightmode

# Idempotent demo seed (items, prices, POS Profile, POS opening session, customer, stock, draft SI)
bench --site amuse.localhost execute amuse.seed_demo.run

# DB counts + in-process API calls
bench --site amuse.localhost execute amuse.verify_site.run

# Read-only SQL validation
bench --site amuse.localhost mariadb -e "SELECT COUNT(*) FROM \`tabSales Invoice\`;"
```

## 7. Post-seed verification (done after `seed_demo`)

- **Bench:** `verify_site` shows non-zero Customer / Item / Sales Invoice counts; `list_invoices` returns rows.
- **MariaDB:** e.g. draft `ACC-SINV-2026-00001` for `Amuse Demo Customer`.
- **MCP:** `list_documents` on `Sales Invoice` / `Item` matches; `call_method` `amuse.api.billing.list_invoices` returns the same invoice.
