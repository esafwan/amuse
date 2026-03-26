"""Returns API — Handle returns and credit notes for Sales and POS Invoices.

Supports:
- Full returns (all items)
- Partial returns (specific items/qty)
- Returns against POS Invoices (creates return POS Invoice)
- Returns against Sales Invoices (creates Credit Note)
- Validation that original invoice is submitted

All methods are @frappe.whitelist() for frontend access.
"""

from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _
from frappe.utils import flt


# -----------------------------------------------------------------------------
# Main Return API
# -----------------------------------------------------------------------------

@frappe.whitelist()
def create_return(
    invoice_type: str,
    invoice_name: str,
    items: str | list | None = None,
    reason: str | None = None,
) -> dict[str, Any]:
    """Create a return/credit note against an invoice.
    
    Args:
        invoice_type: "Sales Invoice" or "POS Invoice"
        invoice_name: Original invoice name
        items: Optional list of {item_code, qty} for partial returns.
               If None/empty, returns all items (full return).
        reason: Optional return reason text
        
    Returns:
        Return document (POS Invoice or Sales Invoice) as dict
        
    Raises:
        frappe.ValidationError: If invoice not found, not submitted, or already returned
        
    Example:
        >>> create_return(
        ...     "POS Invoice",
        ...     "POS-INV-2026-00001",
        ...     items=[{"item_code": "BURGER", "qty": 1}]
        ... )
    """
    if invoice_type not in ("Sales Invoice", "POS Invoice"):
        frappe.throw(_("Invoice type must be 'Sales Invoice' or 'POS Invoice'"))
    
    # Parse items if string
    if isinstance(items, str):
        items = json.loads(items) if items else None
    
    # Validate original invoice
    original = _validate_original_invoice(invoice_type, invoice_name)
    
    # Create return using ERPNext's built-in logic
    if invoice_type == "POS Invoice":
        return_doc = _create_pos_invoice_return(original, items, reason)
    else:
        return_doc = _create_sales_invoice_return(original, items, reason)
    
    return return_doc.as_dict()


@frappe.whitelist()
def submit_return(name: str, invoice_type: str) -> dict[str, Any]:
    """Submit a return document.
    
    Args:
        name: Return document name
        invoice_type: "Sales Invoice" or "POS Invoice"
        
    Returns:
        Submitted return document as dict
    """
    doctype = invoice_type  # Return is same doctype as original
    
    doc = frappe.get_doc(doctype, name)
    
    if not doc.is_return:
        frappe.throw(_("Document is not marked as a return"))
    
    if doc.docstatus != 0:
        frappe.throw(_("Return must be in Draft status"))
    
    doc.submit()
    return doc.as_dict()


@frappe.whitelist()
def get_returnable_items(invoice_type: str, invoice_name: str) -> list[dict]:
    """Get items that can be returned from an invoice.
    
    Filters out already-returned quantities.
    
    Args:
        invoice_type: "Sales Invoice" or "POS Invoice"
        invoice_name: Original invoice name
        
    Returns:
        List of items with:
        - item_code
        - item_name
        - original_qty
        - returned_qty
        - remaining_qty (returnable)
    """
    # Get original items
    original_items = frappe.get_all(
        f"{invoice_type} Item",
        filters={"parent": invoice_name},
        fields=["item_code", "item_name", "qty", "rate", "amount"],
    )
    
    if not original_items:
        return []
    
    # Get already returned quantities
    returned_qty_map = _get_returned_quantities(invoice_type, invoice_name)
    
    result = []
    for item in original_items:
        returned = returned_qty_map.get(item.item_code, 0)
        remaining = flt(item.qty) - returned
        
        if remaining > 0:
            result.append({
                "item_code": item.item_code,
                "item_name": item.item_name,
                "rate": item.rate,
                "original_qty": flt(item.qty),
                "returned_qty": returned,
                "remaining_qty": remaining,
            })
    
    return result


@frappe.whitelist()
def list_returns(
    invoice_type: str | None = None,
    original_invoice: str | None = None,
    limit_page_length: int = 20,
    limit_start: int = 0,
) -> list[dict]:
    """List return documents.
    
    Args:
        invoice_type: Filter by "Sales Invoice" or "POS Invoice"
        original_invoice: Filter by original invoice name
        limit_page_length: Page size
        limit_start: Offset
        
    Returns:
        List of return documents
    """
    filters = {"is_return": 1, "docstatus": ["<", 2]}  # Not cancelled
    
    if original_invoice:
        filters["return_against"] = original_invoice
    
    doctypes = [invoice_type] if invoice_type else ["Sales Invoice", "POS Invoice"]
    
    results = []
    for doctype in doctypes:
        returns = frappe.get_all(
            doctype,
            filters=filters,
            fields=[
                "name",
                "customer",
                "posting_date",
                "grand_total",
                "return_against",
                "docstatus",
            ],
            limit_page_length=limit_page_length,
            limit_start=limit_start,
            order_by="posting_date desc, name desc",
        )
        for r in returns:
            r["doctype"] = doctype
        results.extend(returns)
    
    # Sort combined results
    results.sort(key=lambda x: (x["posting_date"], x["name"]), reverse=True)
    return results[:limit_page_length]


# -----------------------------------------------------------------------------
# Internal Implementation
# -----------------------------------------------------------------------------

def _validate_original_invoice(invoice_type: str, invoice_name: str) -> Any:
    """Validate original invoice exists and is submitted.
    
    Returns:
        Original document
    """
    if not frappe.db.exists(invoice_type, invoice_name):
        frappe.throw(_("{0} {1} not found").format(invoice_type, invoice_name))
    
    doc = frappe.get_doc(invoice_type, invoice_name)
    
    if doc.docstatus != 1:
        frappe.throw(_("Original invoice must be submitted to create a return"))
    
    if doc.is_return:
        frappe.throw(_("Cannot create return against another return"))
    
    return doc


def _create_pos_invoice_return(
    original: Any,
    items: list | None,
    reason: str | None,
) -> Any:
    """Create return POS Invoice using ERPNext logic."""
    from erpnext.accounts.doctype.pos_invoice.pos_invoice import make_sales_return
    
    # Create return document
    return_doc = make_sales_return(original.name)
    
    # Apply partial return if specified
    if items:
        _apply_partial_return(return_doc, items)
    
    # Add reason
    if reason:
        return_doc.return_reason = reason
    
    return_doc.insert()
    return return_doc


def _create_sales_invoice_return(
    original: Any,
    items: list | None,
    reason: str | None,
) -> Any:
    """Create return Sales Invoice (Credit Note) using ERPNext logic."""
    from erpnext.accounts.doctype.sales_invoice.sales_invoice import make_sales_return
    
    # Create return document
    return_doc = make_sales_return(original.name)
    
    # Apply partial return if specified
    if items:
        _apply_partial_return(return_doc, items)
    
    # Add reason
    if reason:
        return_doc.return_reason = reason
    
    return_doc.insert()
    return return_doc


def _apply_partial_return(return_doc: Any, items: list) -> None:
    """Filter and adjust quantities for partial return.
    
    Args:
        return_doc: Return document (will be modified)
        items: List of {item_code, qty} to return
    """
    # Build lookup of requested returns
    return_qty_map = {item["item_code"]: flt(item["qty"]) for item in items}
    
    # Filter items to only those being returned
    filtered_items = []
    for item in return_doc.items:
        if item.item_code in return_qty_map:
            requested_qty = return_qty_map[item.item_code]
            original_qty = abs(flt(item.qty))  # Return docs have negative qty
            
            # Validate requested qty doesn't exceed original
            if requested_qty > original_qty:
                frappe.throw(
                    _("Return qty {0} exceeds original qty {1} for item {2}").format(
                        requested_qty, original_qty, item.item_code
                    )
                )
            
            # Set return quantity (negative)
            item.qty = -requested_qty
            filtered_items.append(item)
    
    if not filtered_items:
        frappe.throw(_("No valid items specified for return"))
    
    return_doc.items = filtered_items


def _get_returned_quantities(invoice_type: str, invoice_name: str) -> dict[str, float]:
    """Get total returned quantities by item code.
    
    Returns:
        Dict mapping item_code to total returned qty
    """
    returns = frappe.get_all(
        invoice_type,
        filters={
            "is_return": 1,
            "return_against": invoice_name,
            "docstatus": 1,  # Only submitted returns
        },
        fields=["name"],
    )
    
    if not returns:
        return {}
    
    return_names = [r.name for r in returns]
    
    # Sum returned quantities
    items = frappe.db.sql(
        f"""
        SELECT 
            item_code,
            SUM(ABS(qty)) as returned_qty
        FROM `tab{invoice_type} Item`
        WHERE parent IN %(returns)s
        GROUP BY item_code
        """,
        {"returns": return_names},
        as_dict=True,
    )
    
    return {item.item_code: flt(item.returned_qty) for item in items}


# -----------------------------------------------------------------------------
# Validation Helpers
# -----------------------------------------------------------------------------

@frappe.whitelist()
def validate_return_eligibility(invoice_type: str, invoice_name: str) -> dict[str, Any]:
    """Check if an invoice can be returned.
    
    Returns:
        Dict with:
        - eligible: bool
        - reason: str (if not eligible)
        - returnable_items: list of items that can be returned
    """
    try:
        _validate_original_invoice(invoice_type, invoice_name)
    except Exception as e:
        return {
            "eligible": False,
            "reason": str(e),
            "returnable_items": [],
        }
    
    returnable_items = get_returnable_items(invoice_type, invoice_name)
    
    if not returnable_items:
        return {
            "eligible": False,
            "reason": _("All items have already been returned"),
            "returnable_items": [],
        }
    
    return {
        "eligible": True,
        "reason": None,
        "returnable_items": returnable_items,
    }
