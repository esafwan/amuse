import frappe

def create_pending_price_change_log(context):
    """
    Creates the immutable event shell first
    """
    doc = frappe.get_doc({
        "doctype": "Price Change Log",
        "item": context.get("item"),
        "company": context.get("company"),
        "price_list": context.get("price_list"),
        "currency": context.get("currency"),
        "change_type": context.get("change_type"),
        "changed_by": frappe.session.user,
        "source_of_change": context.get("source_of_change"),
        "previous_rate": context.get("previous_rate"),
        "previous_valid_from": context.get("previous_valid_from"),
        "previous_valid_upto": context.get("previous_valid_upto"),
        "previous_enabled": context.get("previous_enabled"),
        "new_rate": context.get("new_rate"),
        "new_valid_from": context.get("new_valid_from"),
        "new_valid_upto": context.get("new_valid_upto"),
        "new_enabled": context.get("new_enabled"),
        "change_reason": context.get("change_reason"),
        "notes": context.get("notes"),
        "snapshot_status": "Pending"
    })
    doc.insert(ignore_permissions=True)
    return doc.name

def mark_snapshot_completed(log_name, payload):
    doc = frappe.get_doc("Price Change Log", log_name)
    doc.update(payload)
    doc.snapshot_status = "Completed"
    doc.save(ignore_permissions=True)

def mark_snapshot_failed(log_name, error_text):
    frappe.db.set_value("Price Change Log", log_name, "snapshot_status", "Failed")
