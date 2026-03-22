import frappe

def get_standard_response(data):
    return {
        "ok": True,
        "data": data,
        "meta": {"generated_at": frappe.utils.now()}
    }

@frappe.whitelist(allow_guest=False)
def get_price_change_log_list(item=None, limit_start=0, limit_page_length=20):
    filters = {}
    if item:
        filters["item"] = item
        
    logs = frappe.get_all(
        "Price Change Log",
        filters=filters,
        fields=["name", "item", "item_name", "change_timestamp", "change_type", "snapshot_status", "changed_by"],
        limit_start=limit_start,
        limit_page_length=limit_page_length,
        order_by="change_timestamp desc"
    )
    return get_standard_response(logs)

@frappe.whitelist(allow_guest=False)
def get_price_change_log(name):
    doc = frappe.get_doc("Price Change Log", name)
    return get_standard_response(doc.as_dict())

@frappe.whitelist(allow_guest=False)
def trigger_snapshot_rebuild(log_name):
    frappe.db.set_value("Price Change Log", log_name, "snapshot_status", "Pending")
    frappe.enqueue("amuse.jobs.snapshot_jobs.run_price_regime_snapshot", queue="long", log_name=log_name)
    return get_standard_response({"status": "queued"})
