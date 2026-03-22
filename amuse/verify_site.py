"""Site verification for Amuse + ERPNext data and API wiring.

Run:
  bench --site amuse.localhost execute amuse.verify_site.run

Prints DB counts and calls each Amuse API once (no assertions — suitable for ops checks).
"""

from __future__ import annotations

import json

import frappe

from amuse.api import billing as billing_api
from amuse.api import customers as customers_api
from amuse.api import pos as pos_api
from amuse.api import price_change as price_change_api


def run():
    """Return a report string; safe for `bench execute` (runs as Administrator)."""
    lines = []
    lines.append("=== Amuse / ERPNext site check ===")
    lines.append(f"Site: {frappe.local.site}")

    counts = {
        "Company": frappe.db.count("Company"),
        "Customer": frappe.db.count("Customer"),
        "Item": frappe.db.count("Item"),
        "Sales Invoice": frappe.db.count("Sales Invoice"),
        "POS Profile": frappe.db.count("POS Profile"),
        "Price Change Log": frappe.db.count("Price Change Log"),
    }
    lines.append("Counts: " + json.dumps(counts, indent=2))

    lines.append("--- API smoke (in-process) ---")
    try:
        inv = billing_api.list_invoices(limit_page_length=3)
        lines.append(f"list_invoices: {len(inv)} rows")
    except Exception as e:
        lines.append(f"list_invoices ERROR: {e}")

    try:
        cust = customers_api.list_customers(limit_page_length=3)
        lines.append(f"list_customers: {len(cust)} rows")
    except Exception as e:
        lines.append(f"list_customers ERROR: {e}")

    try:
        pos_api.get_pos_settings()
        lines.append("get_pos_settings: ok")
    except Exception as e:
        lines.append(f"get_pos_settings ERROR: {e}")

    try:
        o = pos_api.check_opening()
        lines.append(f"check_opening: {len(o)} open sessions")
    except Exception as e:
        lines.append(f"check_opening ERROR: {e}")

    try:
        pcl = price_change_api.get_price_change_log_list()
        lines.append(
            f"get_price_change_log_list: ok, data={len(pcl.get('data', []))} rows"
        )
    except Exception as e:
        lines.append(f"get_price_change_log_list ERROR: {e}")

    return "\n".join(lines)


if __name__ == "__main__":
    frappe.init(site="amuse.localhost")
    frappe.connect()
    print(run())
