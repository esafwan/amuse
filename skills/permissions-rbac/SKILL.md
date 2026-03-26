---
name: permissions-rbac
description: >
  Role-based access control system with capabilities, Amuse Roles, 
  user-role assignments, and permission queries. Provides fine-grained 
  access control beyond standard Frappe roles. Consult this skill for 
  authorization, user management, role configuration, or capability checks.
category: features
---

# Permissions & RBAC System

## Overview

The RBAC system provides a capability-based permission model layered on top of Frappe's standard role system. Key features:

- **Capabilities**: Fine-grained permissions (e.g., `pos.use`, `billing.create`)
- **Amuse Roles**: Role definitions with capability assignments
- **Amuse User Roles**: User-to-role assignments
- **Permission Queries**: Database-level filtering based on capabilities
- **Frappe Role Sync**: Automatic Frappe Role assignment based on Amuse Role

## Key Files

### Backend

| File | Purpose |
|------|---------|
| `amuse/permissions.py` | Core permission logic, capability catalog, query conditions |
| `amuse/api/permissions.py` | User/role management API endpoints |
| `amuse/amuse/doctype/amuse_role/` | Amuse Role doctype (role definitions) |
| `amuse/amuse/doctype/amuse_user_role/` | Amuse User Role doctype (assignments) |
| `amuse/amuse/doctype/amuse_role_permission/` | Child table for capability assignments |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/src/contexts/PermissionsContext.tsx` | React context for permissions state |
| `frontend/src/hooks/usePermissions.ts` | React Query hooks for permission data |
| `frontend/src/api/permissions.ts` | API client functions |
| `frontend/src/shell/PermissionsLayout.tsx` | Layout wrapper providing permissions context |
| `frontend/src/pages/UsersPage.tsx` | User management UI |
| `frontend/src/pages/RolesPage.tsx` | Role management UI |

## How It Works

### Capability Catalog

All capabilities are defined in `CAPABILITIES` dict in `permissions.py`:

```python
CAPABILITIES = {
    "pos.use": "Use POS",
    "pos.open_session": "Open POS Session",
    "billing.create": "Create Invoices",
    "customers.view": "View Customers",
    # ... etc
}
```

### User Capability Resolution

```
User requests action
       ↓
has_capability(user, capability) called
       ↓
Is superuser (Administrator/System Manager)? → Yes → Allowed
       ↓
Fetch user's Amuse Role from Amuse User Role
       ↓
Get capabilities from Amuse Role Permission child table
       ↓
Check if requested capability in list
```

### Permission Query Conditions

For list views, database-level filtering is applied via `permission_query_conditions` in hooks:

```python
permission_query_conditions = {
    "Sales Invoice": "amuse.permissions.get_invoice_query_conditions",
    "Price Change Log": "amuse.permissions.get_pcl_query_conditions",
}
```

### Frappe Role Synchronization

When a user is assigned an Amuse Role:
1. The linked Frappe Role is added to the User's roles
2. Previous Amuse-managed roles are removed
3. Ensures Desk access permissions align with Amuse permissions

## Extension Points

### Adding New Capabilities

1. Add to `CAPABILITIES` dict in `permissions.py`:
```python
"myfeature.action": "Description of action"
```

2. Use in code:
```python
_require_capability("myfeature.action")
```

3. Frontend check:
```typescript
const { hasCapability } = usePermissions()
hasCapability('myfeature.action')
```

### Creating System Roles

System roles (like "Cashier", "Manager") are created via the Roles UI:
- They get a corresponding Frappe Role auto-created
- Capabilities are assigned via the permission table

## Dependencies

- **ERPNext**: Uses Frappe's User and Role doctypes
- **All features**: Every feature checks capabilities

## Gotchas

1. **Superuser Override**: Administrator and System Manager bypass all capability checks (`_is_superuser()`).

2. **No Amuse Assignment = No App Access**: Users without an Amuse User Role assignment cannot see the Amuse app on the Frappe apps screen (`check_app_permission()`).

3. **Permission Caching**: Capabilities are cached per-request in `frappe.local._amuse_user_capabilities`. Call `bust_capability_cache(user)` after role changes.

4. **Frappe Role Naming**: Custom Amuse roles create Frappe roles with prefix "Amuse Custom {role_name}" to avoid collisions.

5. **Query Conditions Are Restrictive**: The `get_invoice_query_conditions` returns "1=0" to deny all access if user lacks billing/POS capabilities. This is intentional - deny by default.

6. **Invited Users**: New users invited via `invite_user()` are created with `send_welcome_email: 0` - you must manually trigger welcome emails.

7. **Role Updates Are Immediate**: Changing a role's capabilities affects all users with that role immediately (no cache beyond request scope).
