"""Idempotent demo seed for Amuse QA: Items, prices, POS Profile, Customer, draft Sales Invoice.

Run:
  bench --site amuse.localhost execute amuse.seed_demo.run
  bench --site amuse.localhost execute amuse.seed_demo.run --kwargs "{'company': 'My Company'}"

Safe to run multiple times; skips existing documents by name.
Warehouse and account names match the default company preset (Funtartica / * - Fun).
"""

from __future__ import annotations

import frappe
from frappe import _

DEFAULT_COMPANY = "Funtartica"
PRICE_LIST = "Standard Selling"
WAREHOUSE = "Stores - Fun"
INCOME_ACCOUNT = "Sales - Fun"
COGS_ACCOUNT = "Cost of Goods Sold - Fun"
COST_CENTER = "Main - Fun"

ITEMS: list[tuple[str, str, float]] = [
    ("AMUSE-DEMO-TKT", "Demo Park Ticket", 499.0),
    ("AMUSE-DEMO-SN", "Demo Snack", 99.0),
]

CUSTOMER_NAME = "Amuse Demo Customer"
POS_PROFILE_NAME = "Amuse Demo POS"
WRITE_OFF_ACCOUNT = "Write Off - Fun"
CURRENCY = "INR"


def _resolve_company(override: str | None = None) -> str | None:
    """Prefer explicit name, then default preset, then any Company on the site."""
    if override and frappe.db.exists("Company", override):
        return override
    if frappe.db.exists("Company", DEFAULT_COMPANY):
        return DEFAULT_COMPANY
    return frappe.db.get_value("Company", {}, "name")


def _ensure_items(company: str) -> list[str]:
    created = []
    for item_code, item_name, rate in ITEMS:
        if frappe.db.exists("Item", item_code):
            continue
        doc = frappe.get_doc(
            {
                "doctype": "Item",
                "item_code": item_code,
                "item_name": item_name,
                "item_group": "Products",
                "stock_uom": "Nos",
                "is_stock_item": 1,
                "include_item_in_manufacturing": 0,
                "item_defaults": [
                    {
                        "company": company,
                        "default_warehouse": WAREHOUSE,
                        "income_account": INCOME_ACCOUNT,
                        "default_cogs_account": COGS_ACCOUNT,
                        "selling_cost_center": COST_CENTER,
                    }
                ],
            }
        )
        doc.insert()
        created.append(item_code)
        frappe.db.commit()

        ip = frappe.get_doc(
            {
                "doctype": "Item Price",
                "item_code": item_code,
                "uom": "Nos",
                "price_list": PRICE_LIST,
                "selling": 1,
                "currency": "INR",
                "price_list_rate": rate,
            }
        )
        ip.insert()
        frappe.db.commit()

    return created


def _stock_in(company: str) -> None:
    """Put qty on hand so Sales Invoice / POS can sell."""
    for item_code, _, _ in ITEMS:
        if not frappe.db.exists("Item", item_code):
            continue
        # Skip if already has stock (rough check via Bin)
        bin_name = frappe.db.get_value(
            "Bin",
            {"item_code": item_code, "warehouse": WAREHOUSE},
            "name",
        )
        qty = 0.0
        if bin_name:
            qty = frappe.db.get_value("Bin", bin_name, "actual_qty") or 0
        if qty >= 10:
            continue
        se = frappe.get_doc(
            {
                "doctype": "Stock Entry",
                "stock_entry_type": "Material Receipt",
                "company": company,
                "items": [
                    {
                        "item_code": item_code,
                        "t_warehouse": WAREHOUSE,
                        "qty": 500,
                        "basic_rate": 1.0,
                    }
                ],
            }
        )
        se.insert()
        se.submit()
        frappe.db.commit()


def _ensure_customer() -> str | None:
    existing = frappe.db.get_value(
        "Customer", {"customer_name": CUSTOMER_NAME}, "name"
    )
    if existing:
        return existing
    doc = frappe.get_doc(
        {
            "doctype": "Customer",
            "customer_name": CUSTOMER_NAME,
            "customer_type": "Individual",
            "customer_group": "Individual",
            "territory": "India",
        }
    )
    doc.insert()
    frappe.db.commit()
    return doc.name


def _ensure_pos_opening(company: str) -> str:
    """Submit POS Opening Entry for Administrator so POS screen sees an active session."""
    from amuse.api import pos as pos_api

    if pos_api.check_opening():
        return "already open"
    pos_api.create_opening(
        pos_profile=POS_PROFILE_NAME,
        company=company,
        balance_details=[{"mode_of_payment": "Cash", "opening_amount": 500}],
    )
    return "opened"


def _ensure_pos_profile(company: str, customer_name: str) -> str | None:
    """POS Profile for POS screen (get_items / get_profile). Requires explicit name (Prompt autoname)."""
    if frappe.db.exists("POS Profile", POS_PROFILE_NAME):
        return POS_PROFILE_NAME
    if not frappe.db.exists("Customer", customer_name):
        return None
    doc = frappe.get_doc(
        {
            "doctype": "POS Profile",
            "name": POS_PROFILE_NAME,
            "company": company,
            "warehouse": WAREHOUSE,
            "customer": customer_name,
            "selling_price_list": PRICE_LIST,
            "currency": CURRENCY,
            "payments": [{"default": 1, "mode_of_payment": "Cash"}],
            "write_off_account": WRITE_OFF_ACCOUNT,
            "write_off_cost_center": COST_CENTER,
            "write_off_limit": 50,
            "applicable_for_users": [{"default": 1, "user": "Administrator"}],
        }
    )
    doc.insert()
    frappe.db.commit()
    return doc.name


def _ensure_draft_invoice(company: str, customer_name: str) -> str | None:
    """One draft SI if none exist for demo customer."""
    found = frappe.db.exists(
        "Sales Invoice",
        {"customer": customer_name, "docstatus": 0},
    )
    if found:
        return found
    if not frappe.db.exists("Customer", customer_name):
        return None
    naming_series = "ACC-SINV-.YYYY.-"
    items = []
    for item_code, _, rate in ITEMS:
        items.append(
            {
                "item_code": item_code,
                "qty": 1,
                "rate": rate,
                "warehouse": WAREHOUSE,
            }
        )
    si = frappe.get_doc(
        {
            "doctype": "Sales Invoice",
            "company": company,
            "customer": customer_name,
            "posting_date": frappe.utils.today(),
            "due_date": frappe.utils.add_days(frappe.utils.today(), 7),
            "naming_series": naming_series,
            "items": items,
        }
    )
    si.insert()
    frappe.db.commit()
    return si.name


def run(company: str | None = None) -> str:
    """Seed demo data; returns a text report.

    :param company: Optional Company name. Defaults to ``Funtartica`` if present, else first Company.
    """
    lines: list[str] = ["=== Amuse seed_demo ===", f"Site: {frappe.local.site}"]
    co = _resolve_company(company)
    if not co:
        lines.append("ERROR: No Company found on site.")
        return "\n".join(lines)
    lines.append(f"Company: {co}")

    new_items = _ensure_items(co)
    lines.append(f"New items: {new_items or '(none — already present)'}")

    cust = _ensure_customer()
    lines.append(f"Customer: {cust}")

    try:
        pos = _ensure_pos_profile(co, cust) if cust else None
        lines.append(f"POS Profile: {pos or '(skipped)'}")
    except Exception as e:
        lines.append(f"POS Profile ERROR: {e}")
        frappe.db.rollback()

    try:
        if frappe.db.exists("POS Profile", POS_PROFILE_NAME):
            o = _ensure_pos_opening(co)
            lines.append(f"POS opening session: {o}")
    except Exception as e:
        lines.append(f"POS opening ERROR: {e}")
        frappe.db.rollback()

    try:
        _stock_in(co)
        lines.append("Stock entries: ok (material receipt where needed)")
    except Exception as e:
        lines.append(f"Stock entries WARNING: {e}")
        frappe.db.rollback()

    inv = _ensure_draft_invoice(co, cust) if cust else None
    lines.append(f"Draft Sales Invoice: {inv or '(skipped)'}")

    lines.append("Done.")
    return "\n".join(lines)


if __name__ == "__main__":
    frappe.init(site="amuse.localhost")
    frappe.connect()
    frappe.set_user("Administrator")
    print(run())
