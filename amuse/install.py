"""Install-time seeding for Amuse (default Frappe + Amuse roles)."""

from __future__ import annotations

import frappe

from amuse.permissions import ALL_CAPABILITY_KEYS, CAPABILITIES


def _ensure_frappe_role(name: str) -> None:
	if frappe.db.exists("Role", name):
		return
	doc = frappe.get_doc(
		{
			"doctype": "Role",
			"role_name": name,
			"desk_access": 1,
		}
	)
	doc.insert(ignore_permissions=True)


def seed_default_amuse_roles() -> None:
	"""Idempotent: create backing Frappe Roles and Amuse Role docs with capability rows."""
	if not frappe.db.exists("DocType", "Amuse Role"):
		return

	_specs: list[tuple[str, str, str, frozenset[str]]] = [
		(
			"Amuse Admin",
			"Amuse Admin",
			"Park owner / IT admin — full Amuse capabilities.",
			ALL_CAPABILITY_KEYS,
		),
		(
			"Park Manager",
			"Amuse Park Manager",
			"Operations manager — all capabilities except user/role/system settings admin.",
			frozenset(
				ALL_CAPABILITY_KEYS
				- {
					"users.manage",
					"roles.manage",
					"system.settings",
				}
			),
		),
		(
			"Supervisor",
			"Amuse Supervisor",
			"Shift supervisor — full POS, billing, customers, tickets; pricing view; reports.",
			frozenset(
				{
					"pos.use",
					"pos.open_session",
					"pos.close_session",
					"pos.apply_discount",
					"pos.void_transaction",
					"billing.view",
					"billing.create",
					"billing.submit",
					"billing.cancel",
					"billing.create_payment",
					"customers.view",
					"customers.create",
					"customers.edit",
					"tickets.view",
					"tickets.issue",
					"tickets.redeem",
					"tickets.void",
					"tickets.view_capacity",
					"pricing.view",
					"reports.view",
					"reports.export",
				}
			),
		),
		(
			"Cashier",
			"Amuse Cashier",
			"Front-desk operator.",
			frozenset(
				{
					"pos.use",
					"pos.open_session",
					"pos.close_session",
					"billing.view",
					"billing.create",
					"billing.submit",
					"billing.create_payment",
					"customers.view",
					"customers.create",
					"tickets.view",
					"tickets.issue",
					"tickets.redeem",
				}
			),
		),
		(
			"Viewer",
			"Amuse Viewer",
			"Read-only stakeholder.",
			frozenset(
				{
					"billing.view",
					"customers.view",
					"tickets.view",
					"tickets.view_capacity",
					"pricing.view",
					"pricing.view_analytics",
					"reports.view",
				}
			),
		),
	]

	for role_name, frappe_role, description, caps in _specs:
		_ensure_frappe_role(frappe_role)
		if frappe.db.exists("Amuse Role", role_name):
			continue
		doc = frappe.get_doc(
			{
				"doctype": "Amuse Role",
				"role_name": role_name,
				"description": description,
				"is_system_role": 1,
				"frappe_role": frappe_role,
			}
		)
		for cap in sorted(caps):
			if cap not in CAPABILITIES:
				continue
			doc.append("permissions", {"capability": cap, "label": CAPABILITIES[cap]})
		doc.insert(ignore_permissions=True)


def _validate_fixtures_installed() -> None:
	"""Verify that ERPNext customizations via fixtures were properly loaded."""
	required_fields = [
		("Item Price", "custom_change_reason"),
		("Item Price", "custom_change_notes"),
		("Item Price", "custom_last_price_change_log"),
	]
	
	missing = []
	for doctype, fieldname in required_fields:
		field_id = f"{doctype}-{fieldname}"
		if not frappe.db.exists("Custom Field", field_id):
			missing.append(f"{doctype}.{fieldname}")
	
	if missing:
		frappe.throw(
			_("Amuse fixtures not properly loaded. Missing custom fields: {0}").format(
				", ".join(missing)
			)
		)


def after_install() -> None:
	seed_default_amuse_roles()
	_validate_fixtures_installed()


def after_migrate() -> None:
	"""Sites that installed Amuse before Group 2 still get default roles after migrate."""
	seed_default_amuse_roles()
