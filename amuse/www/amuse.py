import frappe

no_cache = 1

def get_context(context):
    """Injects exactly what frappe-react-sdk / frappe-js-sdk needs to bootstrap
    without requiring a separate /api/method/login call on page load."""
    context.boot_json = frappe.as_json(frappe.boot.get_bootinfo())
    context.csrf_token = frappe.sessions.get_csrf_token()
