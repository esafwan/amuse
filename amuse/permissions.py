"""Capability catalogue and resolution for Amuse (Group 2 — modeled after HUF)."""

from __future__ import annotations

import frappe

CAPABILITIES: dict[str, str] = {
	# POS
	"pos.use": "Use POS",
	"pos.open_session": "Open POS Session",
	"pos.close_session": "Close POS Session",
	"pos.apply_discount": "Apply Manual Discounts",
	"pos.void_transaction": "Void a Transaction",
	# Billing
	"billing.view": "View Invoices",
	"billing.create": "Create Invoices",
	"billing.submit": "Submit Invoices",
	"billing.cancel": "Cancel Invoices",
	"billing.create_payment": "Create Payment Entries",
	# Customers
	"customers.view": "View Customers",
	"customers.create": "Create Customers",
	"customers.edit": "Edit Customers",
	# Tickets (Phase B prep)
	"tickets.view": "View Tickets",
	"tickets.issue": "Issue Tickets",
	"tickets.redeem": "Redeem Tickets",
	"tickets.void": "Void Tickets",
	"tickets.view_capacity": "View Capacity",
	# Pricing Intelligence
	"pricing.view": "View Price Change Logs",
	"pricing.edit_prices": "Edit Item Prices",
	"pricing.trigger_snapshot": "Trigger Snapshot Rebuild",
	"pricing.view_analytics": "View Pricing Analytics",
	# Reports
	"reports.view": "View Reports",
	"reports.export": "Export Reports",
	# Users & Roles
	"users.invite": "Invite Users",
	"users.manage": "Manage Users",
	"roles.manage": "Manage Roles",
	# System
	"system.settings": "Manage Settings",
	"system.exceptions": "View Exception Center",
}

ALL_CAPABILITY_KEYS: frozenset[str] = frozenset(CAPABILITIES.keys())


def capability_select_options() -> str:
	"""Newline-separated options for Select fields (DocType JSON should stay in sync)."""
	return "\n".join(sorted(CAPABILITIES.keys()))


def _is_superuser(user: str) -> bool:
	if not user or user == "Guest":
		return False
	if user == "Administrator":
		return True
	return "System Manager" in frappe.get_roles(user)


def _fetch_user_capabilities(user: str) -> set[str]:
	if _is_superuser(user):
		return set(ALL_CAPABILITY_KEYS)
	if not frappe.db.exists("DocType", "Amuse User Role"):
		return set()
	row = frappe.db.get_value(
		"Amuse User Role",
		{"user": user, "enabled": 1},
		["name", "amuse_role"],
		as_dict=True,
	)
	if not row or not row.amuse_role:
		return set()
	perms = frappe.get_all(
		"Amuse Role Permission",
		filters={"parent": row.amuse_role, "parenttype": "Amuse Role"},
		pluck="capability",
	)
	out: set[str] = set()
	for c in perms:
		if c and c in CAPABILITIES:
			out.add(c)
	return out


def bust_capability_cache(user: str | None) -> None:
	if not hasattr(frappe.local, "_amuse_user_capabilities"):
		return
	cache: dict = getattr(frappe.local, "_amuse_user_capabilities", {})
	if user is None:
		cache.clear()
	elif user in cache:
		del cache[user]


def clear_all_capability_caches() -> None:
	bust_capability_cache(None)


def get_user_capabilities(user: str) -> set[str]:
	if not hasattr(frappe.local, "_amuse_user_capabilities"):
		frappe.local._amuse_user_capabilities = {}
	cache: dict[str, set[str]] = frappe.local._amuse_user_capabilities
	if user not in cache:
		cache[user] = _fetch_user_capabilities(user)
	return cache[user]


def has_capability(user: str, capability: str) -> bool:
	if capability not in CAPABILITIES:
		return False
	if _is_superuser(user):
		return True
	return capability in get_user_capabilities(user)


def get_user_amuse_role(user: str) -> str | None:
	"""Return enabled `Amuse Role` name linked to user, or None."""
	if not user or user == "Guest":
		return None
	if not frappe.db.exists("DocType", "Amuse User Role"):
		return None
	return frappe.db.get_value(
		"Amuse User Role",
		{"user": user, "enabled": 1},
		"amuse_role",
	)


def _has_amuse_assignment(user: str) -> bool:
	return bool(
		frappe.db.exists(
			"Amuse User Role",
			{"user": user, "enabled": 1},
		)
	)


def check_app_permission() -> bool:
	"""Controls visibility on Frappe apps screen."""
	user = frappe.session.user
	if user == "Administrator":
		return True
	if "System Manager" in frappe.get_roles(user):
		return True
	return bool(get_user_amuse_role(user))


def get_invoice_query_conditions(user: str) -> str:
	"""Restrict Sales Invoice list when Amuse user lacks billing/POS visibility."""
	if not user or user == "Guest":
		return "1=0"
	if _is_superuser(user):
		return ""
	if not _has_amuse_assignment(user):
		return ""
	if has_capability(user, "billing.view") or has_capability(user, "billing.create"):
		return ""
	if has_capability(user, "billing.submit") or has_capability(user, "billing.cancel"):
		return ""
	if has_capability(user, "pos.use"):
		return ""
	return "1=0"


def get_pcl_query_conditions(user: str) -> str:
	"""Restrict Price Change Log list when Amuse user lacks pricing.view."""
	if not user or user == "Guest":
		return "1=0"
	if _is_superuser(user):
		return ""
	if not _has_amuse_assignment(user):
		return ""
	if has_capability(user, "pricing.view"):
		return ""
	return "1=0"


def get_all_amuse_frappe_role_names() -> list[str]:
	if not frappe.db.exists("DocType", "Amuse Role"):
		return []
	return [
		r
		for r in frappe.get_all("Amuse Role", pluck="frappe_role")
		if r
	]


def sync_frappe_roles_for_user(user_email: str, new_frappe_role: str | None, enabled: bool) -> None:
	"""Remove every Amuse-managed Frappe Role from user, then optionally add the active one."""
	if not user_email or not frappe.db.exists("User", user_email):
		return
	amuse_roles = set(get_all_amuse_frappe_role_names())
	if not amuse_roles:
		return
	user_doc = frappe.get_doc("User", user_email)
	current_role_names = {r.role for r in (user_doc.roles or [])}
	for role in amuse_roles & current_role_names:
		user_doc.remove_roles(role)
	if enabled and new_frappe_role and new_frappe_role in amuse_roles:
		user_doc.add_roles(new_frappe_role)
	user_doc.save(ignore_permissions=True)
