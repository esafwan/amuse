"""POS API — thin wrappers over ERPNext Point of Sale RPCs.

Mirrors the server calls that ERPNext's POS page makes so the Amuse React
POS screen can bootstrap a session, browse items, check stock, and review
past orders via ``POST /api/method/amuse.api.pos.<name>``.
"""

from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _
from frappe.utils import flt


def _is_privileged_pos_user() -> bool:
	return frappe.session.user == "Administrator" or "System Manager" in frappe.get_roles()


def _get_opening_or_throw(name: str):
	if not name or not frappe.db.exists("POS Opening Entry", name):
		frappe.throw(_("POS Opening Entry not found."))
	return frappe.get_doc("POS Opening Entry", name)


def _assert_can_access_opening(opening) -> None:
	if opening.user != frappe.session.user and not _is_privileged_pos_user():
		frappe.throw(_("You can only manage your own POS shift."), frappe.PermissionError)


def _ensure_payment_reconciliation_from_opening_if_empty(closing, opening) -> None:
	"""If no sales occurred, ERPNext returns no payment rows; seed from opening floats."""
	if closing.get("payment_reconciliation") and len(closing.payment_reconciliation) > 0:
		return
	for bd in opening.balance_details or []:
		closing.append(
			"payment_reconciliation",
			{
				"mode_of_payment": bd.mode_of_payment,
				"opening_amount": flt(bd.opening_amount),
				"expected_amount": 0.0,
				"closing_amount": flt(bd.opening_amount),
			},
		)


def _parse_payment_table(raw: str | list | None) -> list[dict] | None:
	if raw is None or raw == "":
		return None
	if isinstance(raw, str):
		return json.loads(raw)
	return raw


def _apply_closing_amounts(closing, user_rows: list[dict] | None) -> None:
	"""Set closing_amount on each reconciliation row (physical count end of shift)."""
	if not user_rows:
		for row in closing.payment_reconciliation:
			row.closing_amount = flt(row.opening_amount) + flt(row.expected_amount)
		return
	by_mop = {r["mode_of_payment"]: flt(r.get("closing_amount", 0)) for r in user_rows}
	for row in closing.payment_reconciliation:
		if row.mode_of_payment in by_mop:
			row.closing_amount = by_mop[row.mode_of_payment]


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


@frappe.whitelist()
def list_pos_profiles() -> list[dict]:
	"""POS profiles the current user may use (applicable users, or all if privileged)."""
	user = frappe.session.user
	if _is_privileged_pos_user():
		return frappe.get_all(
			"POS Profile",
			fields=["name", "company"],
			order_by="name asc",
			limit=100,
		)
	return frappe.db.sql(
		"""
		SELECT pp.name, pp.company
		FROM `tabPOS Profile` pp
		INNER JOIN `tabPOS Profile User` ppu
			ON ppu.parent = pp.name AND ppu.user = %(user)s
		ORDER BY pp.name
		LIMIT 100
		""",
		{"user": user},
		as_dict=True,
	)


@frappe.whitelist()
def get_closing_preview(pos_opening_entry: str) -> dict[str, Any]:
	"""Build an in-memory POS Closing Entry (not saved) for review in the SPA.
	
	Includes both POS Invoices and Sales Invoices (express mode) in the preview.
	"""
	opening = _get_opening_or_throw(pos_opening_entry)
	if opening.status != "Open":
		frappe.throw(_("Selected POS Opening Entry is not open."))
	_assert_can_access_opening(opening)
	from erpnext.accounts.doctype.pos_closing_entry.pos_closing_entry import (
		make_closing_entry_from_opening,
	)

	closing = make_closing_entry_from_opening(opening)
	_ensure_payment_reconciliation_from_opening_if_empty(closing, opening)
	_apply_closing_amounts(closing, None)
	
	# Add POS Invoice summary to the response
	closing_dict = closing.as_dict()
	closing_dict["pos_invoice_summary"] = _get_pos_invoice_summary(pos_opening_entry)
	closing_dict["sales_invoice_summary"] = _get_sales_invoice_summary(pos_opening_entry)
	
	return closing_dict


@frappe.whitelist()
def submit_pos_closing(
	pos_opening_entry: str,
	payment_reconciliation: str | list | None = None,
) -> dict[str, Any]:
	"""Create and submit POS Closing Entry with concurrency protection.
	
	Args:
		pos_opening_entry: POS Opening Entry name
		payment_reconciliation: Payment counts by mode
		
	Returns:
		Submitted closing entry as dict
		
	Raises:
		frappe.ValidationError: If session already being closed
	"""
	# Acquire lock to prevent concurrent closing attempts
	opening = _acquire_closing_lock(pos_opening_entry)
	
	try:
		_assert_can_access_opening(opening)
		
		from erpnext.accounts.doctype.pos_closing_entry.pos_closing_entry import (
			make_closing_entry_from_opening,
		)

		closing = make_closing_entry_from_opening(opening)
		_ensure_payment_reconciliation_from_opening_if_empty(closing, opening)
		user_rows = _parse_payment_table(payment_reconciliation)
		_apply_closing_amounts(closing, user_rows)
		
		# Link POS Invoices to closing entry
		_link_pos_invoices_to_closing(pos_opening_entry, closing)
		
		closing.insert()
		closing.submit()
		
		return closing.as_dict()
		
	except Exception:
		# Release lock on failure
		_release_closing_lock(pos_opening_entry)
		raise


def _acquire_closing_lock(pos_opening_entry: str) -> Any:
	"""Acquire exclusive lock on POS Opening Entry.
	
	Uses database row locking and status check to prevent race conditions.
	"""
	# Use FOR UPDATE to lock the row
	opening_data = frappe.db.sql(
		"""
		SELECT name, status, user, company, pos_profile 
		FROM `tabPOS Opening Entry` 
		WHERE name = %s 
		FOR UPDATE
		""",
		(pos_opening_entry,),
		as_dict=True,
	)
	
	if not opening_data:
		frappe.throw(_("POS Opening Entry not found"))
	
	opening = opening_data[0]
	
	if opening.status != "Open":
		frappe.throw(
			_(
				"POS Opening Entry is already being closed or is closed. Status: {0}"
			).format(opening.status),
			title=_("Session Already Closing"),
		)
	
	# Set status to "Closing" to prevent other attempts
	frappe.db.set_value(
		"POS Opening Entry",
		pos_opening_entry,
		{"status": "Closing", "closing_in_progress_by": frappe.session.user},
		update_modified=False,
	)
	frappe.db.commit()
	
	return opening


def _release_closing_lock(pos_opening_entry: str) -> None:
	"""Release lock and reset status on failure."""
	frappe.db.set_value(
		"POS Opening Entry",
		pos_opening_entry,
		{"status": "Open", "closing_in_progress_by": None},
		update_modified=False,
	)
	frappe.db.commit()


def _get_pos_invoice_summary(pos_opening_entry: str) -> dict[str, Any]:
	"""Get summary of POS Invoices for the session."""
	invoices = frappe.get_all(
		"POS Invoice",
		filters={
			"pos_opening_entry": pos_opening_entry,
			"docstatus": 1,
		},
		fields=["name", "customer", "grand_total", "posting_date", "consolidated_invoice"],
	)
	
	return {
		"count": len(invoices),
		"total": sum(flt(inv.grand_total) for inv in invoices),
		"consolidated": len([inv for inv in invoices if inv.consolidated_invoice]),
		"pending": len([inv for inv in invoices if not inv.consolidated_invoice]),
		"invoices": invoices[:10],  # First 10 for preview
	}


def _get_sales_invoice_summary(pos_opening_entry: str) -> dict[str, Any]:
	"""Get summary of Sales Invoices (express mode) for the session."""
	invoices = frappe.get_all(
		"Sales Invoice",
		filters={
			"pos_opening_entry": pos_opening_entry,
			"docstatus": 1,
			"is_pos": 1,
		},
		fields=["name", "customer", "grand_total", "posting_date"],
	)
	
	return {
		"count": len(invoices),
		"total": sum(flt(inv.grand_total) for inv in invoices),
		"invoices": invoices[:10],
	}


def _link_pos_invoices_to_closing(pos_opening_entry: str, closing: Any) -> None:
	"""Link POS Invoices to the closing entry for consolidation."""
	pos_invoices = frappe.get_all(
		"POS Invoice",
		filters={
			"pos_opening_entry": pos_opening_entry,
			"docstatus": 1,
			"consolidated_invoice": ["is", "not set"],
		},
		pluck="name",
	)
	
	for pi_name in pos_invoices:
		closing.append("pos_invoices", {"pos_invoice": pi_name})


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
