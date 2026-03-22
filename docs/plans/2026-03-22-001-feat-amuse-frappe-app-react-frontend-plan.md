---
title: "feat: Amuse — Frappe App Foundation with React Frontend and Auth"
type: feat
status: active
date: 2026-03-22
---

# feat: Amuse — Frappe App Foundation with React Frontend and Auth

Build the foundational scaffold for the **Amuse** Frappe v16 app: a working Python backend wired to a React + TanStack Query v5 frontend, with Frappe session-based authentication injected at page load. This establishes the integration seam that all future ERPNext features will layer onto incrementally.

## Acceptance Criteria

- [ ] `frontend/` is initialized with Vite + React + TypeScript
- [ ] Vite `outDir` points to `../amuse/public/frontend/`, base path is `/assets/amuse/frontend/`
- [ ] `bench build --app amuse` compiles and serves React assets correctly
- [ ] `amuse/amuse/www/amuse.html` + `amuse/amuse/www/amuse.py` serve the SPA; `amuse.py` injects `boot_json` and `csrf_token` into `window.frappe`
- [ ] `hooks.py` has `website_route_rules` catch-all routing `/amuse/<path:app_path>` → `amuse`
- [ ] `BrowserRouter` uses `basename="/amuse"`
- [ ] TanStack Query v5 installed and `QueryClientProvider` configured
- [ ] Frappe API client reads `csrf_token` from `window.frappe.csrf_token`, attaches it to all mutating requests
- [ ] If user is already logged into Frappe Desk, React app loads authenticated (no separate login)
- [ ] If session is absent, redirect to Frappe's `/login` page
- [ ] `RequireAuth` wrapper guards all app routes
- [ ] App shell renders: sidebar nav, topbar, main content area
- [ ] At least one authenticated API call confirms backend ↔ frontend integration (`frappe.client.get_logged_user`)
- [ ] `amuse/amuse/public/frontend/` is added to `.gitignore` (generated build output)
- [ ] Pre-commit hooks pass (`ruff`, `eslint`, `prettier`)

## Context

Current state: `amuse/` is a `bench new-app` scaffold — `hooks.py` is all commented out, `frontend/` is empty.

The integration pattern (based on Frappe CRM / HUF reference apps):
- React app lives in `frontend/`, compiled by Vite
- Vite outputs to `amuse/public/frontend/` — Frappe serves these at `/assets/amuse/frontend/`
- `amuse/amuse/www/amuse.html` is the SPA entry point (Vite's built `index.html` copied here)
- `amuse/amuse/www/amuse.py` runs on every page request, injects `window.frappe.boot` (session data, roles, site config) and `window.frappe.csrf_token`
- `hooks.py` catch-all route forwards all `/amuse/*` paths to `amuse.html` so React Router handles sub-routing
- `BrowserRouter` uses `basename="/amuse"` so links like `<Link to="/customers">` resolve to `/amuse/customers`
- No separate login is needed if the user is already logged into Frappe Desk — `frappe-js-sdk` or the raw client picks up the injected boot context

## MVP

### Directory layout after this plan is complete

```
amuse/amuse/
├── api/
│   └── health.py               ← ping() endpoint for integration check
├── public/
│   └── frontend/               ← Vite build output (gitignored, generated)
│       ├── index.html
│       ├── assets/
│       │   ├── index-[hash].js
│       │   └── index-[hash].css
└── www/
    ├── amuse.html              ← copied from Vite build by copy-html-entry script
    └── amuse.py                ← injects boot_json + csrf_token into window.frappe

frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx
    ├── App.tsx                 ← BrowserRouter basename="/amuse" + routes
    ├── api/
    │   ├── client.ts           ← callMethod() wrapping /api/method/
    │   └── auth.ts             ← getCurrentUser(), logout()
    ├── auth/
    │   └── RequireAuth.tsx     ← session guard, redirect to /login
    ├── shell/
    │   ├── AppShell.tsx        ← SidebarNav + Topbar + <Outlet />
    │   ├── SidebarNav.tsx
    │   └── Topbar.tsx
    └── pages/
        ├── Dashboard.tsx       ← stub
        ├── Customers.tsx       ← stub
        └── Billing.tsx         ← stub
```

### `vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/assets/amuse/frontend/',
  build: {
    outDir: '../amuse/public/frontend',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/assets': 'http://127.0.0.1:8000',
    },
  },
})
```

### `package.json` (root-level delegator)

```json
{
  "scripts": {
    "build-frontend": "cd frontend && yarn install && yarn build"
  }
}
```

### `frontend/package.json` build script

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build && node scripts/copy-html-entry.js",
    "preview": "vite preview"
  }
}
```

### `frontend/scripts/copy-html-entry.js`

```javascript
// Copies Vite's built index.html to amuse/amuse/www/amuse.html
import { copyFileSync } from 'fs'
const src = '../amuse/public/frontend/index.html'
const dest = '../amuse/amuse/www/amuse.html'
copyFileSync(src, dest)
console.log('Copied index.html → amuse/amuse/www/amuse.html')
```

### `amuse/amuse/www/amuse.py`

```python
import frappe

no_cache = 1

def get_context(context):
    context.boot_json = frappe.as_json(frappe.boot.get_bootinfo())
    context.csrf_token = frappe.sessions.get_csrf_token()
```

### `amuse/amuse/www/amuse.html`

The initial file is a placeholder — replaced on every `yarn build` by the copy script. Vite's generated `index.html` must include the Frappe context bootstrap:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Amuse</title>
</head>
<body>
  <script>
    window.frappe = {}
    window.frappe.boot = {{ boot_json }}
    window.frappe.csrf_token = "{{ csrf_token }}"
  </script>
  <div id="root"></div>
  <!-- Vite injects script tags here during build -->
</body>
</html>
```

> **Note:** Vite's build replaces this template. The `boot_json`/`csrf_token` injection uses Frappe's Jinja templating — the `www/amuse.py` `get_context()` populates these variables before the page is served.

### `amuse/hooks.py` additions

```python
website_route_rules = [
    {"from_route": "/amuse/<path:app_path>", "to_route": "amuse"},
]

add_to_apps_screen = [
    {
        "name": "amuse",
        "logo": "/assets/amuse/logo.png",
        "title": "Amuse",
        "route": "/amuse",
    }
]
```

### `frontend/src/api/client.ts`

```typescript
declare global {
  interface Window {
    frappe: { csrf_token: string; boot: Record<string, unknown> }
  }
}

const BASE = '/api/method'

export async function callMethod<T>(
  method: string,
  params?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${BASE}/${method}`, {
    method: params ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Frappe-CSRF-Token': window.frappe.csrf_token,
    },
    body: params ? JSON.stringify(params) : undefined,
  })
  const json = await res.json()
  if (!res.ok || json.exc) throw new Error(json.exc || 'API error')
  return json.message as T
}
```

### `frontend/src/auth/RequireAuth.tsx`

```typescript
// Reads window.frappe.boot — if boot.name === "Guest" or boot is absent → window.location = '/login'
// Using injected boot data avoids a network round-trip at load time.
// Fall back to calling frappe.client.get_logged_user if boot is not available (e.g. dev proxy mode).
```

### `frontend/src/App.tsx`

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'

export default function App() {
  return (
    <BrowserRouter basename="/amuse">
      <Routes>
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="billing" element={<Billing />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

### `amuse/amuse/api/health.py`

```python
import frappe

@frappe.whitelist()
def ping() -> dict:
    return {"ok": True, "data": {"user": frappe.session.user}, "meta": {}}
```

## Sources

- Architecture intent: `.ref/app.md`, `.ref/frontend.md`
- Frappe web routes / www: https://docs.frappe.io/framework/user/en/website/web-pages
- Frappe whitelist methods: https://docs.frappe.io/framework/user/en/guides/integration/rest_api
- TanStack Query v5: https://tanstack.com/query/v5/docs/react/quick-start
- Reference integration pattern: HUF / Frappe CRM app model (provided in user context)
