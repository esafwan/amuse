---
name: customer-management
description: >
  Customer CRUD operations, search/typeahead, party details resolution, 
  and address management. Provides the customer directory for POS and 
  billing workflows. Consult this skill for customer forms, search logic, 
  or address handling.
category: features
---

# Customer Management

## Overview

The Customer Management system provides a complete customer directory with:

- Customer CRUD (Create, Read, Update)
- Typeahead search for POS/billing workflows
- Party details resolution (taxes, price lists, payment terms)
- Address display formatting
- Customer group filtering

## Key Files

### Backend

| File | Purpose |
|------|---------|
| `amuse/api/customers.py` | Customer API endpoints |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/src/pages/Customers.tsx` | Customer list and management UI |
| `frontend/src/hooks/useCustomer.ts` | React Query hooks for customer data |

## How It Works

### Customer Search Flow

```
User types in search field
         ↓
search_customers(txt, filters, page_length)
         ↓
Uses frappe.desk.search.search_link() for link-field style search
         ↓
Returns autocomplete results
```

### Customer Listing with Pagination

```
list_customers(filters, fields, limit, offset, search)
         ↓
Supports text search across name/email/mobile
         ↓
Returns paginated results
```

### Party Details for Invoicing

```
get_party_details(customer, company, posting_date)
         ↓
Calls erpnext.accounts.party.get_party_details()
         ↓
Returns: receivable account, price list, tax template, addresses
```

## Extension Points

### Adding Customer Fields

1. Add field to ERPNext Customer doctype (if standard)
2. Or use Custom Field for app-specific data
3. Update `create_customer()` and `update_customer()` to handle new fields

### Custom Search Fields

Modify `list_customers()` OR filters to include additional fields:

```python
or_filters = [
    ["customer_name", "like", term],
    ["email_id", "like", term],
    ["mobile_no", "like", term],
    ["custom_field", "like", term],  # Add this
]
```

### Customer Groups

Customer groups are managed in ERPNext. `list_customer_groups()` returns non-group nodes for filter chips.

## Dependencies

- **ERPNext**: Customer, Customer Group, Address, Contact
- **billing-system**: Provides party details for invoice creation
- **pos-system**: Uses customer search for POS customer selection
- **permissions-rbac**: `customers.view`, `customers.create`, `customers.edit` capabilities

## Gotchas

1. **Search is Case-Insensitive**: Uses SQL `LIKE` which is case-insensitive in MySQL/MariaDB.

2. **Guest Customer**: POS transactions can use a default walk-in customer. This is configured in the POS Profile.

3. **Address Formatting**: `get_address_display()` delegates to Frappe's address formatter which uses the country's address template.

4. **Customer vs Contact**: Customer stores basic info. Email/phone may be on linked Contact records depending on ERPNext configuration.

5. **No Delete API**: Customer deletion is not exposed via API. Set customer as disabled instead.
