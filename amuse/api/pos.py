"""POS API — thin wrappers over ERPNext Point of Sale RPCs.

Mirrors the server calls that ERPNext's POS page makes so the Amuse React
POS screen can bootstrap a session, browse items, check stock, and review
past orders via ``POST /api/method/amuse.api.pos.<name>``.
"""

from __future__ import annotations

import json
from typing import Any

import frappe


# ---------------------------------------------------------------------------
# Session management (opening / closing entries)
# ---------------------------------------------------------------------------

@frappe.whitelist()
def check_opening(user: str | None = None) -> list[dict]:
	"""Check for open POS Opening Entries for the given user.

	Returns a list of dicts (``name``, ``company``, ``pos_profile``,
	``period_start_date``).  An empty list means the user must open a new
	session before using POS.

	Delegates to ``erpnext.selling.page.point_of_sale.point_of_sale.check_opening_entry``.
	"""
	from erpnext.selling.page.point_of_sale.point_of_sale import check_opening_entry

	return check_opening_entry(user=user or frappe.session.user)


@frappe.whitelist()
def create_opening(
	pos_profile: str,
	company: str,
	balance_details: str | list,
) -> dict[str, Any]:
	"""Create and submit a POS Opening Entry.

	*balance_details* is a JSON array of ``{ mode_of_payment, opening_amount }``.

	Delegates to ``erpnext.selling.page.point_of_sale.point_of_sale.create_opening_voucher``.
	"""
	from erpnext.selling.page.point_of_sale.point_of_sale import (
		create_opening_voucher,
	)

	if isinstance(balance_details, list):
		balance_details = json.dumps(balance_details)

	return create_opening_voucher(
		pos_profile=pos_profile,
		company=company,
		balance_details=balance_details,
	)


# ---------------------------------------------------------------------------
# POS Profile data
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_profile(pos_profile: str) -> dict[str, Any]:
	"""Return the full POS Profile with expanded customer groups.

	Delegates to ``erpnext.selling.page.point_of_sale.point_of_sale.get_pos_profile_data``.
	"""
	from erpnext.selling.page.point_of_sale.point_of_sale import (
		get_pos_profile_data,
	)

	return get_pos_profile_data(pos_profile=pos_profile)


@frappe.whitelist()
def get_pos_settings() -> dict[str, Any]:
	"""Return POS Settings (single) — invoice_type, invoice_fields, etc."""
	return frappe.get_single("POS Settings").as_dict()


# ---------------------------------------------------------------------------
# Item catalog
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_items(
	price_list: str,
	pos_profile: str,
	item_group: str | None = None,
	search_term: str | None = None,
	start: int = 0,
	page_length: int = 40,
) -> dict[str, Any]:
	"""Paginated item catalog with prices and stock for the POS grid.

	Delegates to ``erpnext.selling.page.point_of_sale.point_of_sale.get_items``.

	ERPNext requires a concrete **item_group** (root of the POS browser). The SPA
	often omits it; we resolve the POS profile's parent group or the Item Group
	tree root, matching the standard POS page behaviour.
	"""
	from erpnext.selling.page.point_of_sale.point_of_sale import (
		get_items as _get_items,
	)
	from erpnext.selling.page.point_of_sale.point_of_sale import (
		get_parent_item_group as _parent_item_group,
	)
	from frappe.utils.nestedset import get_root_of

	ig = (item_group or "").strip() or None
	if not ig:
		ig = _parent_item_group(pos_profile)
	if not ig or not frappe.db.exists("Item Group", ig):
		ig = get_root_of("Item Group")

	st = (search_term or "").strip()

	return _get_items(
		start=start,
		page_length=page_length,
		price_list=price_list,
		item_group=ig,
		pos_profile=pos_profile,
		search_term=st,
	)


@frappe.whitelist()
def get_parent_item_group(pos_profile: str) -> str | None:
	"""Return the root Item Group for the POS item browser.

	Delegates to ``erpnext.selling.page.point_of_sale.point_of_sale.get_parent_item_group``.
	"""
	from erpnext.selling.page.point_of_sale.point_of_sale import (
		get_parent_item_group as _get,
	)

	return _get(pos_profile=pos_profile)


# ---------------------------------------------------------------------------
# Stock availability
# ---------------------------------------------------------------------------

@frappe.whitelist()
def check_stock(item_code: str, warehouse: str) -> list:
	"""Return ``[available_qty, is_stock_item, allow_negative_stock]`` for an item.

	Delegates to ``erpnext.accounts.doctype.pos_invoice.pos_invoice.get_stock_availability``.
	"""
	from erpnext.accounts.doctype.pos_invoice.pos_invoice import (
		get_stock_availability,
	)

	return get_stock_availability(item_code=item_code, warehouse=warehouse)


# ---------------------------------------------------------------------------
# Past orders
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_past_orders(
	search_term: str | None = None,
	status: str | None = None,
	limit: int = 20,
) -> list[dict]:
	"""Return recent POS invoices and POS-created Sales Invoices.

	Delegates to ``erpnext.selling.page.point_of_sale.point_of_sale.get_past_order_list``.
	"""
	from erpnext.selling.page.point_of_sale.point_of_sale import (
		get_past_order_list,
	)

	return get_past_order_list(
		search_term=search_term,
		status=status,
		limit=limit,
	)


# ---------------------------------------------------------------------------
# Barcode / serial search
# ---------------------------------------------------------------------------

@frappe.whitelist()
def search_barcode(search_value: str) -> dict[str, Any] | None:
	"""Barcode / serial / batch number scan helper.

	Delegates to ``erpnext.selling.page.point_of_sale.point_of_sale.search_for_serial_or_batch_or_barcode_number``.
	"""
	from erpnext.selling.page.point_of_sale.point_of_sale import (
		search_for_serial_or_batch_or_barcode_number,
	)

	return search_for_serial_or_batch_or_barcode_number(search_value=search_value)


# ---------------------------------------------------------------------------
# Customer info (POS-specific updates)
# ---------------------------------------------------------------------------

@frappe.whitelist()
def set_customer_info(
	fieldname: str,
	customer: str,
	value: str,
) -> None:
	"""Update a Customer or Contact field from the POS screen.

	Delegates to ``erpnext.selling.page.point_of_sale.point_of_sale.set_customer_info``.
	"""
	from erpnext.selling.page.point_of_sale.point_of_sale import (
		set_customer_info as _set,
	)

	return _set(fieldname=fieldname, customer=customer, value=value)
