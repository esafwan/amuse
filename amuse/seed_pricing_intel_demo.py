"""Seed + exercise Pricing Intelligence end-to-end: Item Price change, PCL, snapshot.

Run:
  bench --site amuse.localhost execute amuse.seed_pricing_intel_demo.run

Requires demo items from `seed_demo` (AMUSE-DEMO-TKT, Standard Selling price list).
Idempotent: bumps rate slightly each run; safe for QA.
"""

from __future__ import annotations

import frappe

from amuse.jobs.snapshot_jobs import run_price_regime_snapshot

ITEM_CODE = "AMUSE-DEMO-TKT"
PRICE_LIST = "Standard Selling"


def _submit_draft_si_if_any() -> str | None:
    """Submit one draft Sales Invoice for the demo customer so SI metrics exist."""
    from amuse.seed_demo import CUSTOMER_NAME

    name = frappe.db.get_value(
        "Sales Invoice",
        {"customer": CUSTOMER_NAME, "docstatus": 0},
        "name",
    )
    if not name:
        return None
    doc = frappe.get_doc("Sales Invoice", name)
    doc.submit()
    frappe.db.commit()
    return name


def run() -> str:
    frappe.set_user("Administrator")
    lines: list[str] = ["=== Amuse seed_pricing_intel_demo ===", f"Site: {frappe.local.site}"]

    if not frappe.db.exists("Item", ITEM_CODE):
        lines.append(f"ERROR: Item {ITEM_CODE!r} not found. Run amuse.seed_demo.run first.")
        return "\n".join(lines)

    try:
        sub = _submit_draft_si_if_any()
        lines.append(f"Submitted draft SI: {sub or '(none found)'}")
    except Exception as e:
        lines.append(f"Submit draft SI: skipped ({e})")

    ip_name = frappe.db.get_value(
        "Item Price",
        {"item_code": ITEM_CODE, "price_list": PRICE_LIST, "selling": 1},
        "name",
    )
    if not ip_name:
        lines.append("ERROR: Item Price not found for demo item / price list.")
        return "\n".join(lines)

    # Ensure previous regime window includes historical SI posting dates (bypass hook noise).
    frappe.db.set_value(
        "Item Price",
        ip_name,
        {
            "valid_from": "2026-01-01",
            "valid_upto": "2026-12-31",
        },
    )
    frappe.db.commit()

    doc = frappe.get_doc("Item Price", ip_name)
    old_rate = float(doc.price_list_rate or 0)
    doc.price_list_rate = old_rate + 10.0
    doc.save()
    frappe.db.commit()

    log_name = frappe.db.get_value("Item Price", ip_name, "custom_last_price_change_log")
    lines.append(f"Item Price rate: {old_rate} -> {doc.price_list_rate}")
    lines.append(f"Price Change Log: {log_name or '(missing)'}")

    if log_name:
        run_price_regime_snapshot(log_name)
        frappe.db.commit()
        pcl = frappe.get_doc("Price Change Log", log_name)
        lines.append(f"snapshot_status: {pcl.snapshot_status}")
        lines.append(
            f"metrics: qty={pcl.total_qty} revenue={pcl.total_revenue} "
            f"discount_total={pcl.total_discount_value}"
        )

    lines.append("Done.")
    return "\n".join(lines)


if __name__ == "__main__":
    frappe.init(site="amuse.localhost")
    frappe.connect()
    print(run())
