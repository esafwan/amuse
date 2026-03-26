---
name: frontend-architecture
description: >
  React SPA architecture including routing, authentication guards, 
  app shell layout, bottom navigation, and page structure. Consult 
  this skill for route setup, navigation, auth flows, or layout changes.
category: ui
---

# Frontend Architecture

## Overview

The Amuse frontend is a React Single Page Application (SPA) built with:

- **Vite**: Build tool and dev server
- **React Router**: Client-side routing
- **TanStack Query**: Server state management
- **Lucide React**: Icon library
- **CSS Variables**: Theming system

## Key Files

| File | Purpose |
|------|---------|
| `frontend/src/main.tsx` | Entry point - renders App |
| `frontend/src/App.tsx` | Router setup, route definitions, providers |
| `frontend/src/shell/AppShell.tsx` | Main layout with bottom navigation |
| `frontend/src/shell/PermissionsLayout.tsx` | Provides permissions context |
| `frontend/src/shell/ThemeToggle.tsx` | Dark/light mode toggle |
| `frontend/src/auth/RequireAuth.tsx` | Authentication guard |
| `frontend/index.html` | HTML template |
| `frontend/vite.config.ts` | Vite configuration |

## How It Works

### Application Bootstrap

```
main.tsx
    ↓
ReactDOM renders <App />
    ↓
QueryClientProvider wraps router
    ↓
BrowserRouter with basename="/amuse"
    ↓
Route tree with guards
```

### Route Structure

```
/                    → Redirect to /dashboard
/dashboard           → Dashboard home
/pos                 → Point of Sale
/billing             → Invoice management
/customers           → Customer directory
/pricing             → Price change logs
/exceptions          → Exception center
/more                → Additional options
/users               → User management
/roles               → Role management
/settings            → App settings
```

### Guard Hierarchy

```
RequireAuth (validates Frappe session)
       ↓
PermissionsLayout (loads capabilities)
       ↓
AppShell (renders nav + outlet)
       ↓
Page Component
```

### Navigation Structure

The bottom nav shows items filtered by capability:

```typescript
const NAV_ITEMS = [
    { name: 'Home', path: '/dashboard', icon: Home, capability: null },
    { name: 'Sell', path: '/pos', icon: ShoppingCart, capability: 'pos.use' },
    { name: 'Pricing', path: '/pricing', icon: Tag, capability: 'pricing.view' },
    { name: 'Customers', path: '/customers', icon: Users, capability: 'customers.view' },
    { name: 'Exceptions', path: '/exceptions', icon: ReceiptText, capability: 'system.exceptions' },
    { name: 'More', path: '/more', icon: LayoutGrid, capability: null },
]
```

## Extension Points

### Adding New Routes

1. Create page component in `frontend/src/pages/`
2. Import in `App.tsx`
3. Add Route inside PermissionsLayout > AppShell:
```typescript
<Route path="mypage" element={<MyPage />} />
```

### Adding Nav Items

1. Add to `NAV_ITEMS` in `AppShell.tsx`:
```typescript
{ name: 'MyPage', path: '/mypage', icon: MyIcon, capability: 'my.feature' }
```

2. Add capability to backend catalog if needed

### Custom Route Guards

Create a new layout component:
```typescript
export default function ManagerLayout() {
    const { hasCapability } = usePermissions()
    if (!hasCapability('system.manager')) {
        return <Navigate to="/dashboard" />
    }
    return <Outlet />
}
```

## Dependencies

- **react-router-dom**: Routing
- **@tanstack/react-query**: Server state
- **lucide-react**: Icons
- **clsx**: Conditional class names
- **permissions-rbac**: Capability checks

## Gotchas

1. **Basename Required**: The app runs at `/amuse` path, so `BrowserRouter` uses `basename="/amuse"`. All internal routes are relative to this.

2. **Frappe Session Check**: `RequireAuth` calls `/api/method/frappe.auth.get_logged_user` to validate session before rendering app.

3. **Guest Redirect**: Unauthenticated users are redirected to `/login` with return URL preserved.

4. **Navigation Active State**: Uses React Router's `NavLink` with `isActive` callback for styling.

5. **Exception Badge**: The Exceptions nav item shows a dot badge - currently static (line 44 in AppShell.tsx), should be dynamic.

6. **CSS Class Conventions**: Uses kebab-case CSS classes defined in `index.css`. Component-scoped styles go in `App.css`.
