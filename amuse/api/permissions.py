"""Whitelisted permissions API for the Amuse SPA (Group 2)."""

from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _

from amuse.permissions import (
	CAPABILITIES,
	get_user_capabilities,
	has_capability,
)


def _require_login() -> str:
	user = frappe.session.user
	if user == "Guest":
		frappe.throw(_("Not permitted"), frappe.PermissionError)
	return user


def _require_capability(capability: str) -> str:
	user = _require_login()
	if not has_capability(user, capability):
		frappe.throw(_("Not permitted"), frappe.PermissionError)
	return user


def _require_any_capability(*capabilities: str) -> str:
	user = _require_login()
	if not any(has_capability(user, c) for c in capabilities):
		frappe.throw(_("Not permitted"), frappe.PermissionError)
	return user


def _parse_capabilities_arg(raw: str | list | None) -> list[str]:
	if raw is None:
		return []
	if isinstance(raw, list):
		return [str(x).strip() for x in raw if str(x).strip()]
	if isinstance(raw, str):
		raw = raw.strip()
		if not raw:
			return []
		try:
			parsed = json.loads(raw)
			if isinstance(parsed, list):
				return [str(x).strip() for x in parsed if str(x).strip()]
		except json.JSONDecodeError:
			pass
		return [s.strip() for s in raw.split(",") if s.strip()]
	return []


@frappe.whitelist()
def get_me() -> dict[str, Any]:
	user = _require_login()
	aur = frappe.db.get_value(
		"Amuse User Role",
		{"user": user},
		["name", "amuse_role", "enabled"],
		as_dict=True,
	)
	role_label = None
	if aur and aur.amuse_role:
		role_label = frappe.db.get_value("Amuse Role", aur.amuse_role, "role_name")
	caps = sorted(get_user_capabilities(user))
	return {
		"user": user,
		"full_name": frappe.db.get_value("User", user, "full_name"),
		"amuse_user_role": aur.name if aur else None,
		"amuse_role": aur.amuse_role if aur else None,
		"amuse_role_label": role_label,
		"enabled": bool(aur.enabled) if aur else True,
		"capabilities": caps,
	}


@frappe.whitelist()
def get_users() -> list[dict[str, Any]]:
	_require_capability("users.manage")
	if not frappe.db.exists("DocType", "Amuse User Role"):
		return []
	return frappe.get_all(
		"Amuse User Role",
		fields=[
			"name",
			"user",
			"full_name",
			"amuse_role",
			"enabled",
			"invited_by",
			"invited_on",
			"modified",
		],
		order_by="modified desc",
	)


@frappe.whitelist()
def invite_user(email: str, full_name: str, amuse_role: str) -> dict[str, Any]:
	_require_capability("users.invite")
	email = (email or "").strip().lower()
	full_name = (full_name or "").strip()
	if not email or not full_name or not amuse_role:
		frappe.throw(_("Email, full name, and Amuse Role are required"))
	if frappe.db.exists("User", email):
		frappe.throw(_("User already exists"))
	if not frappe.db.exists("Amuse Role", amuse_role):
		frappe.throw(_("Unknown Amuse Role"))

	parts = full_name.split(None, 1)
	first = parts[0]
	last = parts[1] if len(parts) > 1 else ""

	user = frappe.get_doc(
		{
			"doctype": "User",
			"email": email,
			"first_name": first,
			"last_name": last,
			"send_welcome_email": 0,
			"user_type": "System User",
		}
	)
	user.insert(ignore_permissions=True)

	aur = frappe.get_doc(
		{
			"doctype": "Amuse User Role",
			"user": email,
			"amuse_role": amuse_role,
			"enabled": 1,
			"invited_by": frappe.session.user,
			"invited_on": frappe.utils.now(),
		}
	)
	aur.insert(ignore_permissions=True)

	return {"ok": True, "user": email, "amuse_user_role": aur.name}


@frappe.whitelist()
def update_user_role(user: str, amuse_role: str) -> dict[str, Any]:
	_require_capability("users.manage")
	user = (user or "").strip()
	if not user or not amuse_role:
		frappe.throw(_("User and Amuse Role are required"))
	if not frappe.db.exists("Amuse Role", amuse_role):
		frappe.throw(_("Unknown Amuse Role"))
	name = frappe.db.get_value("Amuse User Role", {"user": user}, "name")
	if not name:
		frappe.throw(_("No Amuse User Role for this user"))
	doc = frappe.get_doc("Amuse User Role", name)
	doc.amuse_role = amuse_role
	doc.save(ignore_permissions=True)
	return {"ok": True, "name": doc.name}


@frappe.whitelist()
def set_user_enabled(user: str, enabled: int | bool) -> dict[str, Any]:
	_require_capability("users.manage")
	user = (user or "").strip()
	if not user:
		frappe.throw(_("User is required"))
	name = frappe.db.get_value("Amuse User Role", {"user": user}, "name")
	if not name:
		frappe.throw(_("No Amuse User Role for this user"))
	doc = frappe.get_doc("Amuse User Role", name)
	doc.enabled = 1 if enabled in (1, True, "1", "true", "True") else 0
	doc.save(ignore_permissions=True)
	return {"ok": True, "name": doc.name, "enabled": bool(doc.enabled)}


@frappe.whitelist()
def get_amuse_roles() -> list[dict[str, Any]]:
	_require_any_capability("users.manage", "roles.manage")
	if not frappe.db.exists("DocType", "Amuse Role"):
		return []
	roles = frappe.get_all(
		"Amuse Role",
		fields=["name", "role_name", "description", "is_system_role", "frappe_role"],
		order_by="role_name asc",
	)
	out: list[dict[str, Any]] = []
	for row in roles:
		caps = frappe.get_all(
			"Amuse Role Permission",
			filters={"parent": row.name, "parenttype": "Amuse Role"},
			pluck="capability",
			order_by="idx asc",
		)
		out.append({**row, "capabilities": caps or []})
	return out


@frappe.whitelist()
def get_capabilities_catalogue() -> dict[str, Any]:
	_require_capability("roles.manage")
	return {
		"capabilities": [{"key": k, "label": CAPABILITIES[k]} for k in sorted(CAPABILITIES.keys())],
	}


@frappe.whitelist()
def create_amuse_role(
	role_name: str,
	description: str | None = None,
	capabilities: str | list | None = None,
) -> dict[str, Any]:
	_require_capability("roles.manage")
	role_name = (role_name or "").strip()
	if not role_name:
		frappe.throw(_("Role name is required"))
	if frappe.db.exists("Amuse Role", role_name):
		frappe.throw(_("An Amuse Role with this name already exists"))

	frappe_role_name = f"Amuse Custom {role_name}"
	# Avoid collision with existing Role
	suffix = 1
	base = frappe_role_name
	while frappe.db.exists("Role", frappe_role_name):
		suffix += 1
		frappe_role_name = f"{base} {suffix}"

	role_doc = frappe.get_doc(
		{
			"doctype": "Role",
			"role_name": frappe_role_name,
			"desk_access": 1,
		}
	)
	role_doc.insert(ignore_permissions=True)

	doc = frappe.get_doc(
		{
			"doctype": "Amuse Role",
			"role_name": role_name,
			"description": description or "",
			"is_system_role": 0,
			"frappe_role": frappe_role_name,
		}
	)
	for cap in _parse_capabilities_arg(capabilities):
		if cap not in CAPABILITIES:
			frappe.throw(_("Unknown capability: {0}").format(cap))
		doc.append("permissions", {"capability": cap, "label": CAPABILITIES[cap]})
	doc.insert(ignore_permissions=True)
	return {"ok": True, "name": doc.name}


@frappe.whitelist()
def update_amuse_role(
	role_name: str,
	capabilities: str | list | None = None,
	description: str | None = None,
) -> dict[str, Any]:
	_require_capability("roles.manage")
	role_name = (role_name or "").strip()
	if not role_name or not frappe.db.exists("Amuse Role", role_name):
		frappe.throw(_("Unknown Amuse Role"))
	doc = frappe.get_doc("Amuse Role", role_name)
	if description is not None:
		doc.description = description
	if capabilities is not None:
		parsed = _parse_capabilities_arg(capabilities)
		for cap in parsed:
			if cap not in CAPABILITIES:
				frappe.throw(_("Unknown capability: {0}").format(cap))
		doc.permissions = []
		for cap in sorted(set(parsed)):
			doc.append("permissions", {"capability": cap, "label": CAPABILITIES[cap]})
	doc.save(ignore_permissions=True)
	return {"ok": True, "name": doc.name}
