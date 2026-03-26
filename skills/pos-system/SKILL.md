---
name: pos-system
description: >
  The Point of Sale (POS) system for theme park operations including session 
  management (opening/closing shifts), item catalog browsing, cart management, 
  barcode search, stock checking, and payment processing. Now includes both 
  Standard Mode (POS Invoices) and Express Mode (Sales Invoices), plus return 
  handling. Consult this skill when working on POS UI, session flows, checkout 
  logic, receipt handling, or returns.
category: features
---

# POS System

## Overview

The POS System provides a complete point-of-sale experience for theme park staff to process sales. It supports **two modes**:

### Standard Mode (New - Recommended)
- Creates **POS Invoices** for each transaction
- Properly consolidates into Sales Invoices via POS Closing Entry
- Supports returns against individual transactions
- Provides individual receipt printing
- Follows ERPNext's standard POS architecture

### Express Mode (Legacy)
- Creates **Sales Invoices** directly
- Faster for simple scenarios
- Limited return capabilities
- Still supported for backward compatibility

## Key Files

### Backend (Python/Frappe)

| File | Purpose |
|------|---------|
| `amuse/api/pos.py` | Session management, items, closing entries (both modes) |
| `amuse/api/pos_invoice.py` | POS Invoice CRUD operations (Standard mode) |
| `amuse/api/returns.py` | Return handling for both SI and POS Invoice |
| `amuse/hooks.py` | Doc events, fixtures configuration |
| `amuse/fixtures/custom_field.json` | ERPNext customizations |

### Frontend (React/TypeScript)

| File | Purpose |
|------|---------|
| `frontend/src/pages/POSView.tsx` | Main POS page with mode toggle |
| `frontend/src/hooks/usePOS.ts` | React Query hooks for POS data |
| `frontend/src/hooks/useInvoice.ts` | Invoice creation hooks |

## How It Works

### Session Management Flow

```
User opens POS
       ↓
check_opening() - Any active session?
       ↓
Yes → Resume session | No → create_opening()
       ↓
Process sales (Standard or Express mode)
       ↓
submit_pos_closing() - With concurrency lock
```

### Standard Mode Flow (POS Invoice)

```
Create opening with invoice_mode="standard"
       ↓
For each sale:
  create_pos_invoice() → Draft POS Invoice
       ↓
  submit_pos_invoice() → Submitted
       ↓
Close session:
  submit_pos_closing() → POS Closing Entry
       ↓
  ERPNext consolidates POS Invoices → Sales Invoice(s)
```

### Express Mode Flow (Sales Invoice)

```
Create opening with invoice_mode="express"
       ↓
For each sale:
  create_invoice() → Draft Sales Invoice
       ↓
  submit_invoice() → Submitted
       ↓
Close session:
  submit_pos_closing() → References Sales Invoices directly
```

### Return Flow

```
User requests return
       ↓
validate_return_eligibility(original_invoice)
       ↓
Eligible?
  Yes → create_return(type, name, items)
       ↓
  Submit return document
       ↓
  Print credit note receipt
```

## Concurrency Protection

POS closing now uses **row-level locking** to prevent race conditions:

```python
# In submit_pos_closing():
opening = _acquire_closing_lock(pos_opening_entry)
# Sets status to "Closing", uses FOR UPDATE

try:
    # ... perform closing ...
except Exception:
    _release_closing_lock(pos_opening_entry)  # Reset on failure
    raise
```

## API Methods

### POS Invoice (Standard Mode)

| Method | Purpose |
|--------|---------|
| `create_pos_invoice` | Create draft POS Invoice |
| `submit_pos_invoice` | Submit (process stock/GL) |
| `cancel_pos_invoice` | Cancel if not consolidated |
| `list_pos_invoices` | Query with filters |
| `get_pos_invoices_for_session` | Session reconciliation |
| `get_pos_invoice_totals` | Payment aggregation |
| `check_pos_invoice_status` | Check consolidation status |

### Returns

| Method | Purpose |
|--------|---------|
| `create_return` | Create return/credit note |
| `submit_return` | Submit return |
| `get_returnable_items` | Check what's returnable |
| `validate_return_eligibility` | Pre-check validity |
| `list_returns` | Query returns |

### Session Management

| Method | Purpose |
|--------|---------|
| `check_opening` | Check for active sessions |
| `create_opening` | Start new shift |
| `get_closing_preview` | Preview with summaries |
| `submit_pos_closing` | Submit closing (with lock) |
| `get_items` | Item catalog |
| `search_barcode` | Barcode/serial lookup |

## Extension Points

### Adding New Payment Methods

1. Configure in ERPNext: Mode of Payment
2. Add to POS Profile payment methods
3. Opening float form auto-populates from profile

### Custom Receipt Format

Modify print templates in ERPNext:
- POS Invoice: `Print Format` for POS Invoice doctype
- Sales Invoice: Standard Sales Invoice print format

### Adding Invoice Mode Toggle

Update `frontend/src/pages/POSView.tsx`:

```typescript
// Add mode selector
const [invoiceMode, setInvoiceMode] = useState<'standard' | 'express'>('standard')

// Pass to opening creation
createOpening({
    pos_profile,
    company,
    balance_details,
    invoice_mode: invoiceMode  // New field
})
```

## Dependencies

- **ERPNext**: POS Invoice, POS Opening/Closing Entry, Sales Invoice
- **billing-system**: Shares express mode invoice logic
- **permissions-rbac**: `pos.use`, `pos.open_session`, `pos.close_session` capabilities
- **react-query-patterns**: Uses shared mutation patterns

## Gotchas

1. **POS Invoice vs Sales Invoice**: 
   - POS Invoices track individual transactions
   - POS Invoices get consolidated into Sales Invoices
   - Returns must be against the original document type

2. **Consolidation Timing**:
   - POS Invoices consolidate on POS Closing Entry submit
   - Once consolidated, POS Invoice cannot be cancelled
   - Check `consolidated_invoice` field

3. **Return Limitations**:
   - Can only return submitted (not draft) invoices
   - Cannot return an invoice that's already a return
   - Partial returns supported via `items` parameter

4. **Concurrency**:
   - Closing a session now acquires a database lock
   - If closing fails, status resets to "Open"
   - Don't manually modify `status` field

5. **Company Resolution**:
   - POS Invoices require explicit company
   - Inherits from POS Profile if not specified
   - Multi-company setups need proper user permissions

6. **Fixture Updates**:
   - Custom fields are now in `fixtures/custom_field.json`
   - Run `bench export-fixtures` after Desk changes
   - Fixtures auto-load on app install
