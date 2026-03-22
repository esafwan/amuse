import frappe
from amuse.api.price_change import get_standard_response

@frappe.whitelist(allow_guest=False)
def get_price_regime_summary(log_name):
    doc = frappe.get_doc("Price Change Log", log_name)
    return get_standard_response({
        "total_revenue": doc.total_revenue,
        "total_qty": doc.total_qty,
        "total_discount_value": doc.total_discount_value,
        "days_active": doc.days_active,
        "unique_customers": doc.unique_customers,
        "average_realized_price": doc.average_realized_price
    })
