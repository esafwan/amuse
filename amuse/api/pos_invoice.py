"""POS Invoice API — Individual transaction tracking with ERPNext consolidation.

This module wraps ERPNext's POS Invoice doctype for Amuse's SPA frontend.
POS Invoices provide:
- Individual transaction tracking (vs consolidated Sales Invoices)
- Proper return handling (return_against POS Invoice)
- Change amount tracking for cash payments
- Loyalty points integration
- Consolidation into Sales Invoices via POS Closing Entry

All methods are @frappe.whitelist() for frontend access via
POST /api/method/amuse.api.pos_invoice.<method>
"""

from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _
from frappe.utils import flt


# -----------------------------------------------------------------------------
# CRUD Operations
# -----------------------------------------------------------------------------

@frappe.whitelist()
def create_pos_invoice(doc: str | dict) -> dict[str, Any]:
    """Create a new POS Invoice in Draft status.
    
    Args:
        doc: JSON string or dict with POS Invoice fields + items
        
    Required fields:
        - customer: Customer name
        - pos_profile: POS Profile name
        - company: Company name
        - items: List of {item_code, qty, rate, ...}
        
    Optional fields:
        - payments: List of {mode_of_payment, amount}
        - loyalty_points: Points to redeem
        - discount_amount: Invoice-level discount
        - additional_discount_percentage: Percentage discount
        
    Returns:
        Created POS Invoice as dict
        
    Example:
        >>> create_pos_invoice({
        ...     "customer": "Walk-in Customer",
        ...     "pos_profile": "Main Counter",
        ...     "company": "Test Company",
        ...     "items": [{"item_code": "BURGER", "qty": 2, "rate": 10.0}],
        ...     "payments": [{"mode_of_payment": "Cash", "amount": 20.0}]
        ... })
    """
    if isinstance(doc, str):
        doc = json.loads(doc)
    
    doc["doctype"] = "POS Invoice"
    doc.setdefault("docstatus", 0)
    
    # Track POS Opening Entry if provided
    if doc.get("pos_opening_entry"):
        # Validate opening entry belongs to user
        _validate_opening_entry(doc["pos_opening_entry"])
    
    # Ensure payments if POS invoice
    if not doc.get("payments") and flt(doc.get("grand_total", 0)) > 0:
        # Auto-create payment using default MOP from POS Profile
        _ensure_pos_invoice_payments(doc)
    
    pi = frappe.get_doc(doc)
    pi.insert()
    
    return pi.as_dict()


@frappe.whitelist()
def submit_pos_invoice(name: str) -> dict[str, Any]:
    """Submit a Draft POS Invoice.
    
    This triggers:
    - Stock ledger updates
    - GL entries for payments
    - Loyalty points accrual/redemption
    - Consolidation eligibility
    
    Args:
        name: POS Invoice name (e.g., "POS-INV-2026-00001")
        
    Returns:
        Submitted POS Invoice as dict
    """
    pi = frappe.get_doc("POS Invoice", name)
    
    if pi.docstatus != 0:
        frappe.throw(_("POS Invoice must be in Draft status to submit"))
    
    pi.submit()
    return pi.as_dict()


@frappe.whitelist()
def cancel_pos_invoice(name: str) -> dict[str, Any]:
    """Cancel a submitted POS Invoice.
    
    Can only cancel if not yet consolidated into a Sales Invoice.
    
    Args:
        name: POS Invoice name
        
    Returns:
        Cancelled POS Invoice as dict
    """
    pi = frappe.get_doc("POS Invoice", name)
    
    if pi.consolidated_invoice:
        frappe.throw(
            _("Cannot cancel POS Invoice already consolidated into Sales Invoice {0}").format(
                pi.consolidated_invoice
            )
        )
    
    pi.cancel()
    return pi.as_dict()


@frappe.whitelist()
def get_pos_invoice(name: str) -> dict[str, Any]:
    """Get a single POS Invoice document.
    
    Args:
        name: POS Invoice name
        
    Returns:
        POS Invoice document as dict with child tables
    """
    return frappe.get_doc("POS Invoice", name).as_dict()


# -----------------------------------------------------------------------------
# Listing & Search
# -----------------------------------------------------------------------------

@frappe.whitelist()
def list_pos_invoices(
    filters: str | dict | None = None,
    fields: str | list | None = None,
    limit_page_length: int = 20,
    limit_start: int = 0,
    order_by: str = "posting_date desc, name desc",
) ) -> list[dict]:
    """List POS Invoices with optional filters.
    
    Args:
        filters: Dict or JSON string of filters
        fields: Fields to return (default: common fields)
        limit_page_length: Page size
        limit_start: Offset for pagination
        order_by: Sort order
        
    Returns:
        List of POS Invoice dicts
    """
    if isinstance(filters, str):
        filters = json.loads(filters)
    if isinstance(fields, str):
        fields = json.loads(fields)
    
    if not fields:
        fields = [
            "name",
            "customer",
            "customer_name",
            "posting_date",
            "grand_total",
            "status",
            "docstatus",
            "consolidated_invoice",
            "pos_profile",
            "company",
            "currency",
            "is_return",
            "return_against",
        ]
    
    return frappe.get_list(
        "POS Invoice",
        filters=filters,
        fields=fields,
        limit_page_length=limit_page_length,
        limit_start=limit_start,
        order_by=order_by,
    )


@frappe.whitelist()
def get_pos_invoices_for_session(pos_opening_entry: str) -> list[dict]:
    """Get all POS Invoices for a POS Opening Entry (session).
    
    Used by POS Closing Entry to reconcile payments.
    
    Args:
        pos_opening_entry: POS Opening Entry name
        
    Returns:
        List of POS Invoice dicts for the session
    """
    return frappe.get_all(
        "POS Invoice",
        filters={
            "pos_opening_entry": pos_opening_entry,
            "docstatus": 1,  # Only submitted
            "is_return": 0,  # Exclude returns (handled separately)
        },
        fields=[
            "name",
            "customer",
            "grand_total",
            "posting_date",
            "status",
            "consolidated_invoice",
        ],
        order_by="posting_date, name",
    )


# -----------------------------------------------------------------------------
# Payment & Totals
# -----------------------------------------------------------------------------

def _ensure_pos_invoice_payments(doc: dict) -> None:
    """Auto-create payment row if missing."""
    pos_profile = doc.get("pos_profile")
    if not pos_profile:
        return
    
    # Get default MOP from POS Profile
    default_mop = frappe.db.get_value(
        "POS Profile Payment",
        {"parent": pos_profile, "default": 1},
        "mode_of_payment",
    )
    
    if not default_mop:
        # Get first MOP from profile
        mop_list = frappe.db.get_all(
            "POS Profile Payment",
            filters={"parent": pos_profile},
            fields=["mode_of_payment"],
            order_by="idx",
            limit=1,
        )
        if mop_list:
            default_mop = mop_list[0].mode_of_payment
    
    if default_mop:
        grand_total = flt(doc.get("grand_total", 0))
        doc["payments"] = [{"mode_of_payment": default_mop, "amount": grand_total}]


@frappe.whitelist()
def get_pos_invoice_totals(pos_opening_entry: str) -> dict[str, Any]:
    """Get aggregated totals for POS Invoices in a session.
    
    Used by closing entry preview.
    
    Args:
        pos_opening_entry: POS Opening Entry name
        
    Returns:
        Dict with totals by payment mode and overall
    """
    # Get all POS Invoices for session
    invoices = frappe.get_all(
        "POS Invoice",
        filters={
            "pos_opening_entry": pos_opening_entry,
            "docstatus": 1,
        },
        fields=["name", "grand_total", "change_amount"],
    )
    
    if not invoices:
        return {
            "invoice_count": 0,
            "total_amount": 0.0,
            "net_amount": 0.0,
            "change_amount": 0.0,
            "by_payment_mode": {},
        }
    
    invoice_names = [inv.name for inv in invoices]
    
    # Get payment breakdown
    payments = frappe.db.sql(
        """
        SELECT 
            mode_of_payment,
            SUM(amount) as total
        FROM `tabSales Invoice Payment`
        WHERE parenttype = 'POS Invoice'
          AND parent IN %(invoices)s
        GROUP BY mode_of_payment
        """,
        {"invoices": invoice_names},
        as_dict=True,
    )
    
    total_grand = sum(flt(inv.grand_total) for inv in invoices)
    total_change = sum(flt(inv.change_amount) for inv in invoices)
    
    return {
        "invoice_count": len(invoices),
        "total_amount": total_grand,
        "net_amount": total_grand - total_change,
        "change_amount": total_change,
        "by_payment_mode": {p.mode_of_payment: flt(p.total) for p in payments},
    }


# -----------------------------------------------------------------------------
# Utilities
# -----------------------------------------------------------------------------

def _validate_opening_entry(pos_opening_entry: str) -> None:
    """Validate POS Opening Entry exists and is open."""
    opening = frappe.db.get_value(
        "POS Opening Entry",
        pos_opening_entry,
        ["status", "user"],
        as_dict=True,
    )
    
    if not opening:
        frappe.throw(_("POS Opening Entry not found"))
    
    if opening.status != "Open":
        frappe.throw(_("POS Opening Entry is not open"))
    
    # Optional: validate user owns the session
    if opening.user != frappe.session.user:
        # Allow privileged users
        if "System Manager" not in frappe.get_roles():
            frappe.throw(_("You can only create invoices for your own POS session"))


@frappe.whitelist()
def check_pos_invoice_status(name: str) -> dict[str, Any]:
    """Check status of POS Invoice (consolidated, returnable, etc.).
    
    Args:
        name: POS Invoice name
        
    Returns:
        Status dict with:
        - status: Doc status
        - is_consolidated: Whether merged into Sales Invoice
        - consolidated_invoice: Sales Invoice name if consolidated
        - is_returnable: Whether can create return
        - can_cancel: Whether can cancel
    """
    pi = frappe.db.get_value(
        "POS Invoice",
        name,
        ["docstatus", "status", "consolidated_invoice", "is_return", "return_against"],
        as_dict=True,
    )
    
    if not pi:
        frappe.throw(_("POS Invoice not found"))
    
    is_consolidated = bool(pi.consolidated_invoice)
    
    return {
        "docstatus": pi.docstatus,
        "status": pi.status,
        "is_consolidated": is_consolidated,
        "consolidated_invoice": pi.consolidated_invoice,
        "is_return": pi.is_return,
        "return_against": pi.return_against,
        "is_returnable": pi.docstatus == 1 and not pi.is_return and not is_consolidated,
        "can_cancel": pi.docstatus == 1 and not is_consolidated,
    }
