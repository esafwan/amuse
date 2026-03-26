---
name: pos-system
description: >
  The Point of Sale (POS) system for theme park operations including session 
  management (opening/closing shifts), item catalog browsing, cart management, 
  barcode search, stock checking, and payment processing. Consult this skill 
  when working on POS UI, session flows, checkout logic, or receipt handling.
category: features
---

# POS System

## Overview

The POS System provides a complete point-of-sale experience for theme park staff to process sales. It wraps ERPNext's native POS functionality with a custom React SPA interface. The system handles:

- Session lifecycle (opening/closing shifts)
- Item browsing and search
- Cart management and checkout
- Barcode/serial number scanning
- Stock availability checks
- Payment reconciliation

## Key Files

### Backend (Python/Frappe)

| File | Purpose |
|------|---------|
| `amuse/api/pos.py` | Main POS API endpoints - session management, items, checkout |
| `amuse/hooks.py` | Doc events for item price changes |

### Frontend (React/TypeScript)

| File | Purpose |
|------|---------|
| `frontend/src/pages/POSView.tsx` | Main POS page with session UI, cart, and checkout |
| `frontend/src/hooks/usePOS.ts` | React Query hooks for POS data and mutations |
| `frontend/src/hooks/useInvoice.ts` | Invoice creation hooks used during checkout |

## How It Works

### Session Management Flow

1. **Check Opening** - `check_opening()` verifies if user has active POS session
2. **Open Session** - `create_opening()` creates POS Opening Entry with float amounts
3. **Active Session** - User browses items, adds to cart, processes sales
4. **Close Session** - `submit_pos_closing()` reconciles payments and closes shift

### Item Catalog Flow

```
User selects POS Profile
        ↓
get_profile() loads price list, warehouse, customer groups
        ↓
get_items() fetches paginated items with pricing
        ↓
User browses by item group or searches
```

### Checkout Flow

```
Cart items → create_invoice() → Draft Sales Invoice
                                    ↓
                      submit_invoice() → Submitted Invoice
                                    ↓
                         Print receipt / Next sale
```

### Key API Methods

| Method | Purpose |
|--------|---------|
| `check_opening` | Check for active POS sessions |
| `create_opening` | Start new shift with opening floats |
| `get_closing_preview` | Preview closing reconciliation |
| `submit_pos_closing` | Submit end-of-shift closing |
| `get_items` | Fetch item catalog with prices |
| `search_barcode` | Lookup by barcode/serial/batch |
| `check_stock` | Real-time stock availability |
| `get_past_orders` | Recent transactions lookup |

## Extension Points

### Adding Payment Methods

1. Configure in ERPNext: Mode of Payment
2. Add to POS Profile payment methods
3. Opening float form auto-populates from profile

### Custom Receipt Format

Modify `frontend/src/pages/POSView.tsx` - search for receipt generation in checkout handler.

### Adding Item Filters

Extend `get_items()` in `amuse/api/pos.py` with additional filter parameters.

## Dependencies

- **ERPNext**: Core POS functionality (POS Profile, POS Opening/Closing Entry)
- **billing-system**: Shares invoice creation logic
- **permissions-rbac**: `pos.use`, `pos.open_session`, `pos.close_session` capabilities
- **react-query-patterns**: Uses shared mutation patterns

## Gotchas

1. **Payment Reconciliation**: ERPNext requires at least one payment row for POS invoices. The backend auto-creates a payment row using the default Mode of Payment if missing.

2. **Item Group Resolution**: When no item_group is provided, the system resolves from POS Profile's parent group or falls back to the Item Group tree root.

3. **Session Ownership**: Only the session owner (or privileged users like Administrator/System Manager) can close a shift.

4. **Stock Check Timing**: Stock is checked at add-to-cart time, not continuously. Race conditions possible in high-volume scenarios.

5. **Barcode Search**: Delegates to ERPNext's complex barcode resolution which handles serial numbers, batch numbers, and traditional barcodes.
