import frappe

def process_regime_snapshot(log_name):
    """
    Computes closed-period metrics for previous price regime
    WITHOUT overriding backend SI calculations.
    """
    doc = frappe.get_doc("Price Change Log", log_name)
    
    # 1. Define window
    valid_from = doc.previous_valid_from
    valid_upto = doc.previous_valid_upto
    days = frappe.utils.date_diff(valid_upto, valid_from) if valid_from and valid_upto else 0
    
    # Stub: Querying the ERPNext Sales Invoice Items asynchronously goes here
    # aggregate_regime_sales()
    # calculate_price_realization()
    # attribute_discount()
    
    payload = {
        "days_active": days,
        "transaction_count": 0,
        "invoice_count": 0,
        "total_qty": 0.0,
        "total_revenue": 0.0,
        "expected_revenue_at_base_price": 0.0,
        "average_realized_price": 0.0,
        "total_discount_value": 0.0,
        "unique_customers": 0,
    }
    
    return payload
