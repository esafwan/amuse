import frappe
from amuse.services.price_change_logger import create_pending_price_change_log


def _resolve_company_for_item_price(doc) -> str | None:
    """
    Standard Item Price has no company field; Price Change Log requires company.
    Resolve from Item defaults, then global default, then any Company.
    """
    c = getattr(doc, "company", None)
    if c:
        return c
    item_code = getattr(doc, "item_code", None)
    if item_code:
        row = frappe.db.get_value(
            "Item Default",
            {"parent": item_code, "parenttype": "Item"},
            "company",
        )
        if row:
            return row
    c = frappe.db.get_single_value("Global Defaults", "default_company")
    if c and frappe.db.exists("Company", c):
        return c
    return frappe.db.get_value("Company", {}, "name")


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
