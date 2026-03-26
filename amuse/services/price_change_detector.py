import frappe
from amuse.services.price_change_logger import create_pending_price_change_log


def _resolve_company_for_item_price(doc, user: str | None = None) -> str:
    """
    Resolve company for Price Change Log with proper multi-company support.
    
    Resolution order:
    1. Item's default company (from Item Default child table)
    2. User's permitted company (from User Permission)
    3. Session company (if price list has company restriction)
    4. Global default company
    5. Error (don't guess randomly)
    
    Args:
        doc: Item Price document
        user: User to check permissions for (default: current user)
        
    Returns:
        Company name
        
    Raises:
        frappe.ValidationError: If company cannot be determined
    """
    from frappe import _
    
    # Priority 1: Item's default company
    item_code = getattr(doc, "item_code", None)
    if item_code:
        item_defaults = frappe.get_all(
            "Item Default",
            filters={"parent": item_code, "parenttype": "Item"},
            fields=["company"],
            limit=1,
        )
        if item_defaults and item_defaults[0].company:
            return item_defaults[0].company
    
    # Priority 2: User's permitted company
    user = user or frappe.session.user
    user_permissions = frappe.defaults.get_user_permissions(user)
    
    if user_permissions and "Company" in user_permissions:
        permitted = user_permissions["Company"]
        if permitted:
            # Return first permitted company
            return permitted[0].get("doc") if isinstance(permitted[0], dict) else permitted[0]
    
    # Priority 3: Get from Price List's company (if restricted)
    price_list = getattr(doc, "price_list", None)
    if price_list:
        # Check if price list is company-specific
        pl_company = frappe.db.get_value("Price List", price_list, "company")
        if pl_company:
            return pl_company
    
    # Priority 4: Global default
    global_default = frappe.db.get_single_value("Global Defaults", "default_company")
    if global_default and frappe.db.exists("Company", global_default):
        return global_default
    
    # Fail explicitly - don't guess
    frappe.throw(
        _(
            "Company could not be determined for Price Change Log. "
            "Please set a default company in Global Defaults or "
            "configure Item Defaults for item {0}."
        ).format(item_code or "Unknown"),
        title=_("Company Resolution Error"),
    )


def handle_item_price_change(doc, method=None):
    if not doc.get_doc_before_save():
        # Complete New Item Price configuration
        context = extract_change_context(doc, None, change_type="New Price")
        log_name = create_pending_price_change_log(context)
        doc.db_set("custom_last_price_change_log", log_name)
        return

    old_doc = doc.get_doc_before_save()
    if is_structural_price_change(doc, old_doc):
        change_type = "Rate Change"
        if doc.price_list_rate != old_doc.price_list_rate:
            change_type = "Rate Change"
        elif doc.valid_from != old_doc.valid_from or doc.valid_upto != old_doc.valid_upto:
            change_type = "Validity Change"
        
        context = extract_change_context(doc, old_doc, change_type)
        log_name = create_pending_price_change_log(context)
        
        doc.db_set("custom_last_price_change_log", log_name)
        
        # Enqueue the background snapshot snapshot_job.py
        # Checking if job queue runs
        frappe.enqueue(
            "amuse.jobs.snapshot_jobs.run_price_regime_snapshot",
            queue="long",
            log_name=log_name
        )


def is_structural_price_change(doc, old_doc):
    if doc.price_list_rate != old_doc.price_list_rate:
        return True
    if doc.valid_from != old_doc.valid_from or doc.valid_upto != old_doc.valid_upto:
        return True
    return False

def extract_change_context(doc, old_doc, change_type):
    return {
        "item": doc.item_code,
        "company": _resolve_company_for_item_price(doc),
        "price_list": doc.price_list,
        "currency": doc.currency,
        "change_type": change_type,
        "source_of_change": "Item Price Form",
        "change_reason": doc.custom_change_reason,
        "notes": doc.custom_change_notes,
        
        "previous_rate": old_doc.price_list_rate if old_doc else 0.0,
        "previous_valid_from": old_doc.valid_from if old_doc else None,
        "previous_valid_upto": old_doc.valid_upto if old_doc else None,
        "previous_enabled": 1,
        
        "new_rate": doc.price_list_rate,
        "new_valid_from": doc.valid_from,
        "new_valid_upto": doc.valid_upto,
        "new_enabled": 1,
    }
