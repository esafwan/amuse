# Amuse — end-to-end test plan

**Also surfaced in:** workspace `AGENTS.md`, `Docs/compound-engineering/TESTING.md`, and `compound-engineering.local.md`.

This document maps **UI routes** → **React hooks / API** → **Python methods** → **ERPNext DocTypes**, and lists how to verify each layer.

## When the site is not reachable in the browser

If `http://amuse.localhost:8002` (or your site URL) fails to load, or the IDE browser shows a Chrome error page, **do not treat verification as blocked** until you confirm the runtime environment.

1. **Check whether `bench` is on `PATH`:** `command -v bench`
2. **Check whether Docker is on `PATH`:** `command -v docker`

**If Docker is available** (typical frappe_docker / devcontainer layout), the Frappe site may only run inside the app container. Open a shell there, then run the same `bench --site …` commands as below.

Example (adjust the container name to match `docker ps`; one common name is `fdocker_devcontainer-frappe-1`):

```bash
docker exec -it fdocker_devcontainer-frappe-1 bash -c "cd /workspace/development/ainative/apps/amuse && exec bash"
```

From that shell, `bench` should resolve and the repo path should match your mounted workspace. Then run the checks in §6 (e.g. `run-tests`, `verify_site`).

**If `bench` is on `PATH` and Docker is not** (local bench install), use the bench tree that contains this app — for this workspace that is usually `/workspace/development/ainative`. From that directory, ensure the dev server is running (`bench start` or your usual process manager) so the site answers HTTP, then re-run browser or CLI checks.

---

## Current site snapshot (amuse.localhost)

Run:

```bash
bench --site amuse.localhost execute amuse.verify_site.run
```

As of last check, transactional data may be **empty** (no Items, Customers, Sales Invoices, POS Profiles) while **Company** and chart scaffolding exist. The SPA should show **empty states** and still load without API errors. Seed ERPNext master data (Items, Customers, POS Profile, opening entry) before expecting POS/checkout E2E to succeed.

**Bulk sample data (users + items + customers + invoices):** after `bench migrate` (Amuse Role DocTypes present), run:

```bash
bench --site <site> execute amuse.seed_sample_dataset.run
# optional: --kwargs "{'company': 'Your Company', 'password': 'admin'}"
```

See `amuse/seed_sample_dataset.py` for seeded emails and default password.

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
| `/amuse/pos` | Open shift, grid, cart, checkout, close shift | `usePOSProfiles`, `useCreateOpeningEntry`, `useOpeningEntry`, `useClosingPreview`, `useSubmitPosClosing`, `usePOSProfile`, `usePOSItems`, `useCreateInvoice` | `list_pos_profiles`, `create_opening`, `check_opening`, `get_closing_preview`, `submit_pos_closing`, `get_profile`, `get_items`, `create_invoice` | **Sales Invoice** POS mode: `is_created_using_pos` on SI (set in API) for **POS Closing Entry**. Submit draft POS invoices before close. |
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
- If you need to **log in at the Frappe login page** (Desk) to clear **`403 Forbidden`** on API calls, the **develop** environment uses user **`Administrator`** / password **`admin`**. Do not assume these credentials elsewhere; staging and production must use real accounts.
- Automated browser checks should either: **log in via Desk first**, or use **API key** auth (REST) instead of the SPA `fetch` path.
- **`user-frappe` MCP** uses API keys against `FRAPPE_URL`; align that URL with the site you compare to `bench` (see §4).
- If the console reports **`Cannot set properties of null (setting 'innerHTML')`** on a route, the Amuse **source** does not use `innerHTML`; it is often a **browser extension**, **cached legacy bundle**, or **third-party script**. Hard-refresh, disable extensions for the site, or run `bench build --app amuse` and retry before treating it as an app bug.

---

## 6. Commands reference

```bash
# API smoke (fast)
bench --site amuse.localhost run-tests --module amuse.tests.test_api_smoke --lightmode

# Idempotent demo seed (items, prices, POS Profile, POS opening session, customer, stock, draft SI)
bench --site amuse.localhost execute amuse.seed_demo.run

# Optional company override (defaults to Funtartica or first Company)
bench --site amuse.localhost execute amuse.seed_demo.run --kwargs "{'company': 'Funtartica'}"

# Pricing Intelligence E2E: submit demo SI, bump Item Price, run snapshot (after seed_demo)
bench --site amuse.localhost execute amuse.seed_pricing_intel_demo.run

# DB counts + in-process API calls
bench --site amuse.localhost execute amuse.verify_site.run

# Read-only SQL validation
bench --site amuse.localhost mariadb -e "SELECT COUNT(*) FROM \`tabSales Invoice\`;"
```

## 7. Post-seed verification (done after `seed_demo`)

- **Bench:** `verify_site` shows non-zero Customer / Item / Sales Invoice counts; `list_invoices` returns rows.
- **MariaDB:** e.g. draft `ACC-SINV-2026-00001` for `Amuse Demo Customer`.
- **MCP:** `list_documents` on `Sales Invoice` / `Item` matches; `call_method` `amuse.api.billing.list_invoices` returns the same invoice.
