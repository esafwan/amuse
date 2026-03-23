import frappe
from frappe.utils import flt


def process_regime_snapshot(log_name):
    """
    Computes closed-period metrics for the previous price regime from submitted
    Sales Invoices (line-level), without altering ERPNext SI calculations.
    """
    doc = frappe.get_doc("Price Change Log", log_name)

    valid_from = doc.previous_valid_from
    valid_upto = doc.previous_valid_upto
    days = (
        frappe.utils.date_diff(valid_upto, valid_from)
        if valid_from and valid_upto
        else 0
    )

    item = doc.item
    company = doc.company

    if not valid_from or not valid_upto or not item or not company:
        return _snapshot_payload(
            days_active=days,
            aggregates=_empty_aggregates(),
        )

    agg = _aggregate_sales_invoice_lines(
        item=item,
        company=company,
        valid_from=valid_from,
        valid_upto=valid_upto,
    )

    total_qty = flt(agg["total_qty"])
    total_revenue = flt(agg["total_revenue"])
    item_level_discount = flt(agg["item_level_discount"])
    distributed_company = flt(agg["distributed_company"])
    total_discount_value = item_level_discount + distributed_company

    pricing_rule_discount_value = flt(agg["pricing_rule_discount_value"])
    manual_discount_value = flt(agg["manual_discount_value"])
    invoice_level_discount_value = flt(agg["invoice_level_discount_value"])
    coupon_discount_value = flt(agg["coupon_discount_value"])
    promotional_scheme_discount_value = 0.0

    attributed = (
        pricing_rule_discount_value
        + manual_discount_value
        + invoice_level_discount_value
        + coupon_discount_value
        + promotional_scheme_discount_value
    )
    residual_discount_value = max(0.0, flt(total_discount_value - attributed))

    previous_rate = flt(doc.previous_rate or 0)
    expected_revenue_at_base_price = previous_rate * total_qty
    average_realized_price = (
        total_revenue / total_qty if total_qty else 0.0
    )
    unique_customers = int(agg["unique_customers"] or 0)
    new_customers = _count_new_customers_for_item(
        item=item,
        company=company,
        valid_from=valid_from,
        valid_upto=valid_upto,
    )
    revenue_per_customer = (
        total_revenue / unique_customers if unique_customers else 0.0
    )

    discount_pct_vs_base = 0.0
    if expected_revenue_at_base_price > 0:
        discount_pct_vs_base = (
            (expected_revenue_at_base_price - total_revenue)
            / expected_revenue_at_base_price
            * 100.0
        )

    return _snapshot_payload(
        days_active=days,
        aggregates={
            "transaction_count": int(agg["transaction_count"] or 0),
            "invoice_count": int(agg["invoice_count"] or 0),
            "total_qty": total_qty,
            "total_revenue": total_revenue,
            "expected_revenue_at_base_price": expected_revenue_at_base_price,
            "average_realized_price": average_realized_price,
            "total_discount_value": total_discount_value,
            "discount_pct_vs_base": discount_pct_vs_base,
            "pricing_rule_discount_value": pricing_rule_discount_value,
            "promotional_scheme_discount_value": promotional_scheme_discount_value,
            "coupon_discount_value": coupon_discount_value,
            "invoice_level_discount_value": invoice_level_discount_value,
            "manual_discount_value": manual_discount_value,
            "residual_discount_value": residual_discount_value,
            "unique_customers": unique_customers,
            "new_customers": new_customers,
            "revenue_per_customer": revenue_per_customer,
        },
    )


def _empty_aggregates():
    return {
        "transaction_count": 0,
        "invoice_count": 0,
        "total_qty": 0.0,
        "total_revenue": 0.0,
        "expected_revenue_at_base_price": 0.0,
        "average_realized_price": 0.0,
        "total_discount_value": 0.0,
        "discount_pct_vs_base": 0.0,
        "pricing_rule_discount_value": 0.0,
        "promotional_scheme_discount_value": 0.0,
        "coupon_discount_value": 0.0,
        "invoice_level_discount_value": 0.0,
        "manual_discount_value": 0.0,
        "residual_discount_value": 0.0,
        "unique_customers": 0,
        "new_customers": 0,
        "revenue_per_customer": 0.0,
    }


def _snapshot_payload(days_active, aggregates):
    """Build update dict for Price Change Log (matches DocType field names)."""
    base = _empty_aggregates()
    base.update(aggregates)
    return {
        "days_active": days_active,
        "transaction_count": base["transaction_count"],
        "invoice_count": base["invoice_count"],
        "total_qty": base["total_qty"],
        "total_revenue": base["total_revenue"],
        "expected_revenue_at_base_price": base["expected_revenue_at_base_price"],
        "average_realized_price": base["average_realized_price"],
        "total_discount_value": base["total_discount_value"],
        "discount_pct_vs_base": base["discount_pct_vs_base"],
        "pricing_rule_discount_value": base["pricing_rule_discount_value"],
        "promotional_scheme_discount_value": base["promotional_scheme_discount_value"],
        "coupon_discount_value": base["coupon_discount_value"],
        "invoice_level_discount_value": base["invoice_level_discount_value"],
        "manual_discount_value": base["manual_discount_value"],
        "residual_discount_value": base["residual_discount_value"],
        "unique_customers": base["unique_customers"],
        "new_customers": base["new_customers"],
        "revenue_per_customer": base["revenue_per_customer"],
    }


def _aggregate_sales_invoice_lines(item, company, valid_from, valid_upto):
    """Sum metrics and discount buckets for one item in the regime window."""
    rows = frappe.db.sql(
        """
        SELECT
            COALESCE(SUM(sii.qty), 0) AS total_qty,
            COALESCE(SUM(sii.base_net_amount), 0) AS total_revenue,
            COALESCE(SUM(
                GREATEST(
                    0,
                    COALESCE(sii.base_amount, 0) - COALESCE(sii.base_net_amount, 0)
                )
            ), 0) AS item_level_discount,
            COALESCE(SUM(
                COALESCE(sii.distributed_discount_amount, 0)
                * COALESCE(si.conversion_rate, 1)
            ), 0) AS distributed_company,
            COALESCE(SUM(
                CASE
                    WHEN NULLIF(TRIM(IFNULL(sii.pricing_rules, '')), '') IS NOT NULL
                    THEN GREATEST(
                        0,
                        COALESCE(sii.base_amount, 0) - COALESCE(sii.base_net_amount, 0)
                    )
                    ELSE 0
                END
            ), 0) AS pricing_rule_discount_value,
            COALESCE(SUM(
                CASE
                    WHEN NULLIF(TRIM(IFNULL(sii.pricing_rules, '')), '') IS NULL
                    AND (
                        IFNULL(sii.discount_percentage, 0) > 0
                        OR IFNULL(sii.discount_amount, 0) > 0
                    )
                    THEN GREATEST(
                        0,
                        COALESCE(sii.base_amount, 0) - COALESCE(sii.base_net_amount, 0)
                    )
                    ELSE 0
                END
            ), 0) AS manual_discount_value,
            COALESCE(SUM(
                CASE
                    WHEN IFNULL(si.coupon_code, '') != ''
                    THEN COALESCE(sii.distributed_discount_amount, 0)
                        * COALESCE(si.conversion_rate, 1)
                    ELSE 0
                END
            ), 0) AS coupon_discount_value,
            COALESCE(SUM(
                CASE
                    WHEN IFNULL(si.coupon_code, '') = ''
                    THEN COALESCE(sii.distributed_discount_amount, 0)
                        * COALESCE(si.conversion_rate, 1)
                    ELSE 0
                END
            ), 0) AS invoice_level_discount_value,
            COUNT(*) AS transaction_count,
            COUNT(DISTINCT si.name) AS invoice_count,
            COUNT(DISTINCT si.customer) AS unique_customers
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si
            ON si.name = sii.parent
            AND si.docstatus = 1
            AND IFNULL(si.is_return, 0) = 0
            AND si.company = %(company)s
            AND si.posting_date >= %(valid_from)s
            AND si.posting_date <= %(valid_upto)s
        WHERE sii.parenttype = 'Sales Invoice'
          AND sii.item_code = %(item)s
        """,
        {
            "item": item,
            "company": company,
            "valid_from": valid_from,
            "valid_upto": valid_upto,
        },
        as_dict=True,
    )
    return rows[0] if rows else {}


def _count_new_customers_for_item(item, company, valid_from, valid_upto):
    """
    Customers who bought this item in the window and whose first submitted
    invoice for the company falls in the same window.
    """
    row = frappe.db.sql(
        """
        SELECT COUNT(DISTINCT si.customer) AS cnt
        FROM `tabSales Invoice Item` sii
        INNER JOIN `tabSales Invoice` si
            ON si.name = sii.parent
            AND si.docstatus = 1
            AND IFNULL(si.is_return, 0) = 0
            AND si.company = %(company)s
            AND si.posting_date >= %(valid_from)s
            AND si.posting_date <= %(valid_upto)s
        INNER JOIN (
            SELECT customer, MIN(posting_date) AS first_date
            FROM `tabSales Invoice`
            WHERE docstatus = 1
              AND company = %(company)s
            GROUP BY customer
        ) fc ON fc.customer = si.customer
        WHERE sii.parenttype = 'Sales Invoice'
          AND sii.item_code = %(item)s
          AND fc.first_date >= %(valid_from)s
          AND fc.first_date <= %(valid_upto)s
        """,
        {
            "item": item,
            "company": company,
            "valid_from": valid_from,
            "valid_upto": valid_upto,
        },
        as_dict=True,
    )
    if not row:
        return 0
    return int(row[0].get("cnt") or 0)
