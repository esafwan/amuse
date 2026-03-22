import frappe
from amuse.services.price_change_logger import mark_snapshot_completed, mark_snapshot_failed
from amuse.services.analytics_snapshot import process_regime_snapshot

def run_price_regime_snapshot(log_name):
    try:
        payload = process_regime_snapshot(log_name)
        mark_snapshot_completed(log_name, payload)
    except Exception as e:
        frappe.log_error(title="Snapshot Job Failed", message=frappe.get_traceback())
        mark_snapshot_failed(log_name, str(e))
