---
name: billing-system
description: >
  Sales Invoice management including creation, submission, cancellation, 
  payment entry processing, and party details resolution. Handles both 
  POS-generated and manual invoices. Consult this skill for invoice CRUD, 
  payment workflows, tax calculations, or customer billing logic.
category: features
---

# Billing System

## Overview

The Billing System handles the complete sales invoice lifecycle from draft creation through payment reconciliation. It provides:

- Invoice CRUD operations (Create, Read, Update via re-creation, Delete via cancel)
- Party details resolution (taxes, price lists, receivable accounts)
- Item pricing and tax calculation
- Payment Entry generation and submission
- Pricing rule application

## Key Files

### Backend

| File | Purpose |
|------|---------|
| `amuse/api/billing.py` | Invoice and Payment Entry API endpoints |
| `amuse/permissions.py` | Query conditions for invoice visibility |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/src/pages/Billing.tsx` | Invoice list and detail view |
| `frontend/src/hooks/useInvoice.ts` | React Query hooks for billing operations |

## How It Works

### Invoice Creation Flow

```
Client prepares invoice dict with items
              ↓
    create_invoice() - Draft status
              ↓
    Optional: submit_invoice() - Submitted
              ↓
    Optional: create_payment() + submit_payment()
```

### Party Defaults Resolution

```
get_invoice_defaults(customer, company)
              ↓
    Calls erpnext.accounts.party.get_party_details()
              ↓
    Returns: receivable account, price list, taxes, addresses
```

### Item Details Resolution

```
get_item_details(item_code, customer, price_list, company, qty)
              ↓
    Calls erpnext.stock.get_item_details.get_item_details()
              ↓
    Returns: price, UOM, tax template, stock info
```

### Payment Flow

```
Submitted Invoice
       ↓
get_payment_entry(invoice_name) - Builds draft Payment Entry
       ↓
create_payment(doc) - Save as draft
       ↓
submit_payment(name) - Submit and reconcile
```

## Extension Points

### Adding Invoice Fields

1. Extend the `create_invoice()` method to accept additional fields
2. Update frontend invoice preparation in `Billing.tsx` or `POSView.tsx`

### Custom Payment Methods

Payment methods are configured in ERPNext (Mode of Payment doctype) and referenced via POS Profile or company defaults.

### Invoice Numbering

Follows ERPNext naming series configuration. No custom logic in Amuse.

### Returns

Returns are handled via `amuse/api/returns.py`:

```python
# Create return
create_return(
    invoice_type="Sales Invoice",
    invoice_name="SI-2026-00001",
    items=[{"item_code": "ITEM", "qty": 1}]  # Partial return
)

# Full return (no items specified)
create_return(
    invoice_type="POS Invoice", 
    invoice_name="POS-2026-00001"
)
```

Returns work for both Sales Invoices and POS Invoices.

## Dependencies

- **ERPNext**: Sales Invoice, Payment Entry, Party, Taxes
- **pos-system**: Shares invoice creation for POS sales
- **customer-management**: Uses customer search and party details
- **permissions-rbac**: `billing.view`, `billing.create`, `billing.submit`, `billing.cancel` capabilities

## Gotchas

1. **POS Payment Auto-Creation**: For POS invoices, if no payments array is provided, the system automatically creates a full-amount payment using the POS Profile's default Mode of Payment. See `_ensure_pos_payments()` in `billing.py`.

2. **is_created_using_pos Flag**: Invoices created via POS must have `is_created_using_pos: 1` for proper POS Closing Entry inclusion. This is set automatically in `create_invoice()`.

3. **Draft vs Submitted**: Invoices are created in Draft status. They must be explicitly submitted to affect GL entries and inventory.

4. **Cancellation Cascade**: Cancelling an invoice may fail if linked Payment Entries exist. Payment Entries must be cancelled first (ERPNext standard behavior).

5. **JSON String Parameters**: Several methods accept filters/fields as either dicts or JSON strings for flexibility with HTTP clients. The backend normalizes with `json.loads()` if string.
