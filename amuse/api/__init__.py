import frappe
@frappe.whitelist()
def test_tool(test_param):
    return f"Hello {test_param}"
