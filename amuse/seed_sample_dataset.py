"""Rich QA seed: Amuse-scoped users (shared password), Items, Customers, Sales Invoices.

Assumes Group 2 DocTypes exist (migrate + ``seed_default_amuse_roles`` already ran).

Run::

  bench --site <site> execute amuse.seed_sample_dataset.run
  bench --site <site> execute amuse.seed_sample_dataset.run \\
    --kwargs "{'company': 'My Company', 'password': 'admin'}"

All seeded **non-Administrator** users share one password (default ``AmuseSeed!2026``).
Override with ``password=`` (e.g. ``admin`` if your policy allows).

Idempotent: skips users/items/customers/invoices that already exist (by email / item_code / name / title).
"""

from __future__ import annotations

import frappe
from frappe.utils.password import update_password

# ---------------------------------------------------------------------------
# Defaults (override via run(...))
# ---------------------------------------------------------------------------

DEFAULT_PASSWORD = "AmuseSeed!2026"

# (email, first_name, last_name, Amuse Role **document name** = role_name field)
SEED_USERS: list[tuple[str, str, str, str]] = [
	("amuse.seed.admin@amuse-seed.local", "Seed", "Amuse Admin", "Amuse Admin"),
	("amuse.seed.admin2@amuse-seed.local", "Seed", "Amuse Admin 2", "Amuse Admin"),
	("amuse.seed.manager@amuse-seed.local", "Seed", "Park Manager", "Park Manager"),
	("amuse.seed.supervisor@amuse-seed.local", "Seed", "Supervisor", "Supervisor"),
	("amuse.seed.cashier@amuse-seed.local", "Seed", "Cashier", "Cashier"),
	("amuse.seed.cashier2@amuse-seed.local", "Seed", "Cashier Two", "Cashier"),
	("amuse.seed.viewer@amuse-seed.local", "Seed", "Viewer", "Viewer"),
]

# item_code, item_name, standard_rate
SEED_ITEMS: list[tuple[str, str, float]] = [
	("AMUSE-S-01", "Seed — Day Pass Adult", 899.0),
	("AMUSE-S-02", "Seed — Day Pass Child", 549.0),
	("AMUSE-S-03", "Seed — Fast Lane Add-on", 199.0),
	("AMUSE-S-04", "Seed — Parking Full Day", 120.0),
	("AMUSE-S-05", "Seed — Combo Meal", 249.0),
	("AMUSE-S-06", "Seed — Souvenir Cap", 399.0),
	("AMUSE-S-07", "Seed — Arcade Credits 100", 100.0),
	("AMUSE-S-08", "Seed — Rain Poncho", 79.0),
	("AMUSE-S-09", "Seed — Locker Rental", 60.0),
	("AMUSE-S-10", "Seed — Photo Package", 450.0),
]

SEED_CUSTOMERS: list[tuple[str, str]] = [
	("Amuse Seed — Riverdale Family", "Individual"),
	("Amuse Seed — Oakwood Schools", "Commercial"),
	("Amuse Seed — Priya Nair", "Individual"),
	("Amuse Seed — Weekend Club", "Commercial"),
	("Amuse Seed — Marcus Chen", "Individual"),
]


def _resolve_company(override: str | None) -> str | None:
	if override and frappe.db.exists("Company", override):
		return override
	return frappe.db.get_value("Company", {}, "name")


def _territory() -> str:
	return (
		frappe.db.get_value("Territory", {"is_group": 0}, "name")
		or frappe.db.get_value("Territory", {}, "name")
		or "India"
	)


def _ledger_bundle(company: str) -> dict:
	"""Warehouse + accounts for Item defaults and SI lines (best-effort)."""
	co = frappe.get_cached_doc("Company", company)
	wh = frappe.db.get_value(
		"Warehouse",
		{"company": company, "disabled": 0, "is_group": 0},
		"name",
		order_by="modified desc",
	)
	inc = co.default_income_account
	cogs = frappe.db.get_value(
		"Account",
		{
			"company": company,
			"account_type": "Cost of Goods Sold",
			"is_group": 0,
			"disabled": 0,
		},
		"name",
		order_by="name asc",
	)
	cc = frappe.db.get_value(
		"Cost Center",
		{"company": company, "is_group": 0, "disabled": 0},
		"name",
		order_by="name asc",
	)
	pl = co.default_price_list or frappe.db.get_value("Price List", {"selling": 1}, "name") or "Standard Selling"
	cur = co.default_currency or "INR"
	return {
		"warehouse": wh,
		"income_account": inc,
		"cogs_account": cogs,
		"cost_center": cc,
		"price_list": pl,
		"currency": cur,
	}


def _si_naming_series(company: str) -> str:
	ns = frappe.db.get_value(
		"Sales Invoice", {"company": company, "docstatus": ("!=", 2)}, "naming_series"
	)
	return ns or "ACC-SINV-.YYYY.-"


def _ensure_user_with_amuse_role(email: str, first: str, last: str, amuse_role: str, password: str) -> str:
	if frappe.db.exists("User", email):
		return f"user skip (exists): {email}"
	user = frappe.get_doc(
		{
			"doctype": "User",
			"email": email,
			"first_name": first,
			"last_name": last,
			"send_welcome_email": 0,
			"user_type": "System User",
			"enabled": 1,
		}
	)
	user.insert(ignore_permissions=True)
	update_password(email, password)

	if not frappe.db.exists("DocType", "Amuse User Role"):
		return f"user ok: {email} (Amuse User Role DocType missing — run migrate)"
	if not frappe.db.exists("Amuse Role", amuse_role):
		return f"user ok: {email} (no Amuse Role {amuse_role!r} — run seed_default_amuse_roles / install)"
	if not frappe.db.exists("Amuse User Role", {"user": email}):
		frappe.get_doc(
			{
				"doctype": "Amuse User Role",
				"user": email,
				"amuse_role": amuse_role,
				"enabled": 1,
				"invited_by": frappe.session.user,
			}
		).insert(ignore_permissions=True)
	return f"user ok: {email} → {amuse_role}"


def _ensure_items(company: str, bundle: dict) -> list[str]:
	lines: list[str] = []
	stock_ok = bool(bundle["warehouse"] and bundle["income_account"] and bundle["cogs_account"])
	for code, item_name, rate in SEED_ITEMS:
		if frappe.db.exists("Item", code):
			lines.append(f"item skip: {code}")
			continue
		row = {
			"company": company,
			"income_account": bundle["income_account"],
			"selling_cost_center": bundle["cost_center"],
			"default_cogs_account": bundle["cogs_account"],
		}
		if bundle["warehouse"]:
			row["default_warehouse"] = bundle["warehouse"]

		doc = frappe.get_doc(
			{
				"doctype": "Item",
				"item_code": code,
				"item_name": item_name,
				"item_group": "Products",
				"stock_uom": "Nos",
				"is_stock_item": 1 if stock_ok else 0,
				"include_item_in_manufacturing": 0,
				"item_defaults": [row],
			}
		)
		doc.insert(ignore_permissions=True)

		if not frappe.db.exists(
			"Item Price",
			{"item_code": code, "price_list": bundle["price_list"], "uom": "Nos"},
		):
			frappe.get_doc(
				{
					"doctype": "Item Price",
					"item_code": code,
					"uom": "Nos",
					"price_list": bundle["price_list"],
					"selling": 1,
					"currency": bundle["currency"],
					"price_list_rate": rate,
				}
			).insert(ignore_permissions=True)

		lines.append(f"item ok: {code}")
	return lines


def _stock_in(company: str, warehouse: str) -> list[str]:
	out: list[str] = []
	if not warehouse:
		return ["stock skip: no warehouse"]
	for code, _, _ in SEED_ITEMS:
		if not frappe.db.exists("Item", code):
			continue
		is_stock = frappe.db.get_value("Item", code, "is_stock_item")
		if not is_stock:
			continue
		qty = frappe.db.get_value(
			"Bin", {"item_code": code, "warehouse": warehouse}, "actual_qty"
		) or 0
		if qty >= 50:
			continue
		se = frappe.get_doc(
			{
				"doctype": "Stock Entry",
				"stock_entry_type": "Material Receipt",
				"company": company,
				"items": [
					{
						"item_code": code,
						"t_warehouse": warehouse,
						"qty": 200,
						"basic_rate": 1.0,
					}
				],
			}
		)
		se.insert(ignore_permissions=True)
		se.submit()
		out.append(f"stock ok: {code}")
	return out or ["stock ok (no receipts needed)"]


def _ensure_customers() -> list[str]:
	territory = _territory()
	out: list[str] = []
	for name, group in SEED_CUSTOMERS:
		existing = frappe.db.get_value("Customer", {"customer_name": name}, "name")
		if existing:
			out.append(f"customer skip: {name}")
			continue
		frappe.get_doc(
			{
				"doctype": "Customer",
				"customer_name": name,
				"customer_type": "Company" if group == "Commercial" else "Individual",
				"customer_group": group,
				"territory": territory,
			}
		).insert(ignore_permissions=True)
		out.append(f"customer ok: {name}")
	return out


def _si_line(item_code: str, qty: float, rate: float, bundle: dict) -> dict:
	row: dict = {
		"item_code": item_code,
		"qty": qty,
		"rate": rate,
	}
	if bundle.get("warehouse"):
		row["warehouse"] = bundle["warehouse"]
	if bundle.get("cost_center"):
		row["cost_center"] = bundle["cost_center"]
	return row


def _ensure_invoices(company: str, bundle: dict) -> list[str]:
	out: list[str] = []
	cust_rows = [
		(frappe.db.get_value("Customer", {"customer_name": n}, "name"), n) for n, _ in SEED_CUSTOMERS
	]
	cust_rows = [(k, n) for k, n in cust_rows if k]
	if len(cust_rows) < 2:
		return ["invoices skip: need at least 2 customers"]

	ns = _si_naming_series(company)
	today = frappe.utils.today()
	due = frappe.utils.add_days(today, 14)

	specs: list[tuple[str, str, str, list[dict], int]] = [
		(
			"AMUSE-SEED-INV-DRAFT",
			"Amuse Seed — Draft Invoice (QA)",
			cust_rows[0][0],
			[
				_si_line("AMUSE-S-01", 2, 899, bundle),
				_si_line("AMUSE-S-05", 3, 249, bundle),
			],
			0,
		),
		(
			"AMUSE-SEED-INV-A",
			"Amuse Seed — Submitted Invoice A",
			cust_rows[1][0],
			[
				_si_line("AMUSE-S-02", 4, 549, bundle),
				_si_line("AMUSE-S-03", 2, 199, bundle),
			],
			1,
		),
		(
			"AMUSE-SEED-INV-B",
			"Amuse Seed — Submitted Invoice B",
			cust_rows[2][0],
			[
				_si_line("AMUSE-S-06", 1, 399, bundle),
				_si_line("AMUSE-S-10", 1, 450, bundle),
				_si_line("AMUSE-S-07", 2, 100, bundle),
			],
			1,
		),
	]

	for po_no, label, customer, items, submit in specs:
		if frappe.db.exists("Sales Invoice", {"po_no": po_no}):
			out.append(f"invoice skip: {label}")
			continue
		# Drop lines for missing items (partial seed)
		items = [r for r in items if frappe.db.exists("Item", r["item_code"])]
		if not items:
			out.append(f"invoice skip (no items): {label}")
			continue
		si = frappe.get_doc(
			{
				"doctype": "Sales Invoice",
				"po_no": po_no,
				"company": company,
				"customer": customer,
				"posting_date": today,
				"due_date": due,
				"naming_series": ns,
				"items": items,
			}
		)
		try:
			si.insert(ignore_permissions=True)
			if submit:
				si.submit()
			out.append(f"invoice ok: {label} ({'submitted' if submit else 'draft'})")
		except Exception as e:
			frappe.db.rollback()
			out.append(f"invoice ERROR: {label} — {e!s}")

	return out


def run(company: str | None = None, password: str | None = None) -> str:
	"""Execute full seed; returns a newline-separated report."""
	pwd = password or DEFAULT_PASSWORD
	lines: list[str] = [
		"=== Amuse seed_sample_dataset ===",
		f"Site: {frappe.local.site}",
		f"Shared password for seed users: {pwd}",
	]

	co = _resolve_company(company)
	if not co:
		lines.append("ERROR: No Company on site.")
		return "\n".join(lines)
	lines.append(f"Company: {co}")

	bundle = _ledger_bundle(co)
	lines.append(
		"Ledger hints: wh={wh}, inc={inc}, cogs={cogs}, cc={cc}, pl={pl}".format(
			wh=bundle["warehouse"],
			inc=bundle["income_account"],
			cogs=bundle["cogs_account"],
			cc=bundle["cost_center"],
			pl=bundle["price_list"],
		)
	)

	for email, fn, ln, role in SEED_USERS:
		try:
			lines.append(_ensure_user_with_amuse_role(email, fn, ln, role, pwd))
		except Exception as e:
			frappe.db.rollback()
			lines.append(f"user ERROR {email}: {e!s}")

	for row in _ensure_items(co, bundle):
		lines.append(row)

	for row in _stock_in(co, bundle["warehouse"] or ""):
		lines.append(row)

	for row in _ensure_customers():
		lines.append(row)

	for row in _ensure_invoices(co, bundle):
		lines.append(row)

	frappe.db.commit()
	lines.append("Done.")
	return "\n".join(lines)
