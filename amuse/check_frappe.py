import frappe

def run():
    frappe.logger().info("Starting check_frappe...")
    
    companies = frappe.get_all("Company", fields=["name"])
    profiles = frappe.get_all("POS Profile", fields=["name", "company", "warehouse"])
    items =frappe.get_all("Item", fields=["name", "item_name"], limit=5)
    
    try:
        settings = frappe.get_single("POS Settings").as_dict()
        invoice_type = settings.get("invoice_type", "Not Set")
    except Exception:
        invoice_type = "Not Setup"

    result = f"""
--- SYSTEM STATUS ---
Companies: {companies}
POS Profiles: {profiles}
Sample Items: {items}
POS Invoice Type: {invoice_type}
---------------------
"""
    return result
