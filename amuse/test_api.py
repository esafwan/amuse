import frappe
from amuse.api.pos import get_pos_settings

def run():
    frappe.logger().info("Running API validation...")
    try:
        settings = get_pos_settings()
        return f"SUCCESS: POS Settings -> {settings.get('invoice_type', 'None')}"
    except Exception as e:
        return f"FAILED: {e}"
