"""Billing API — thin wrappers over ERPNext Sales Invoice and Payment Entry RPCs.

All methods are ``@frappe.whitelist()`` so the React SPA can call them via
``POST /api/method/amuse.api.billing.<name>``.
"""

from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _


# ---------------------------------------------------------------------------
# Invoice defaults (customer → party details + taxes)
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_invoice_defaults(
	customer: str,
	company: str,
	posting_date: str | None = None,
) -> dict[str, Any]:
	"""Return party defaults (receivable account, price list, taxes, etc.)
	for a given *customer* and *company*.

	Delegates to ``erpnext.accounts.party.get_party_details``.
	"""
	from erpnext.accounts.party import get_party_details

	return get_party_details(
		party=customer,
		party_type="Customer",
		company=company,
		doctype="Sales Invoice",
		posting_date=posting_date or frappe.utils.today(),
		fetch_payment_terms_template=True,
		party_address=None,
		shipping_address=None,
	)


# ---------------------------------------------------------------------------
# Item pricing
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_item_details(
	item_code: str,
	customer: str,
	price_list: str,
	company: str,
	qty: float = 1,
	posting_date: str | None = None,
) -> dict[str, Any]:
	"""Get item pricing, UOM, tax template, etc. for a Sales Invoice line.

	Delegates to ``erpnext.stock.get_item_details.get_item_details``.
	"""
	from erpnext.stock.get_item_details import get_item_details as _get

	args = {
		"item_code": item_code,
		"customer": customer,
		"company": company,
		"doctype": "Sales Invoice",
		"selling_price_list": price_list,
		"price_list_currency": frappe.db.get_value("Price List", price_list, "currency"),
		"transaction_date": posting_date or frappe.utils.today(),
		"posting_date": posting_date or frappe.utils.today(),
		"qty": qty,
		"conversion_rate": 1,
		"plc_conversion_rate": 1,
	}
	return _get(args)


# ---------------------------------------------------------------------------
# Invoice CRUD
# ---------------------------------------------------------------------------

@frappe.whitelist()
def create_invoice(doc: str | dict) -> dict[str, Any]:
	"""Create a new *Sales Invoice* in Draft status.

	*doc* can be a JSON string or a dict with Sales Invoice fields + ``items``.
	Returns the saved document as dict.
	"""
	if isinstance(doc, str):
		doc = json.loads(doc)

	doc["doctype"] = "Sales Invoice"
	doc.setdefault("docstatus", 0)

	si = frappe.get_doc(doc)
	si.insert()
	return si.as_dict()


@frappe.whitelist()
def submit_invoice(name: str) -> dict[str, Any]:
	"""Submit a Draft Sales Invoice.

	Runs full ERPNext validation (``calculate_taxes_and_totals``, GL posting, etc.).
	"""
	si = frappe.get_doc("Sales Invoice", name)
	si.submit()
	return si.as_dict()


@frappe.whitelist()
def cancel_invoice(name: str) -> dict[str, Any]:
	"""Cancel a submitted Sales Invoice."""
	si = frappe.get_doc("Sales Invoice", name)
	si.cancel()
	return si.as_dict()


@frappe.whitelist()
def get_invoice(name: str) -> dict[str, Any]:
	"""Return a single Sales Invoice document as dict."""
	return frappe.get_doc("Sales Invoice", name).as_dict()


@frappe.whitelist()
def list_invoices(
	filters: str | dict | None = None,
	fields: str | list | None = None,
	limit_page_length: int = 20,
	limit_start: int = 0,
	order_by: str = "posting_date desc, name desc",
) -> list[dict]:
	"""List Sales Invoices with optional filters.

	*filters* and *fields* can be JSON strings (as sent by the React client).
	"""
	if isinstance(filters, str):
		filters = json.loads(filters)
	if isinstance(fields, str):
		fields = json.loads(fields)

	if not fields:
		fields = [
			"name",
			"customer",
			"customer_name",
			"posting_date",
			"grand_total",
			"outstanding_amount",
			"status",
			"currency",
			"docstatus",
		]

	return frappe.get_list(
		"Sales Invoice",
		filters=filters,
		fields=fields,
		limit_page_length=limit_page_length,
		limit_start=limit_start,
		order_by=order_by,
	)


# ---------------------------------------------------------------------------
# Payment Entry helpers
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_payment_entry(invoice_name: str) -> dict[str, Any]:
	"""Build a draft Payment Entry from a submitted Sales Invoice.

	Delegates to ``erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry``.
	"""
	from erpnext.accounts.doctype.payment_entry.payment_entry import (
		get_payment_entry as _get_pe,
	)

	pe = _get_pe("Sales Invoice", invoice_name)
	return pe.as_dict()


@frappe.whitelist()
def create_payment(doc: str | dict) -> dict[str, Any]:
	"""Create and optionally submit a Payment Entry.

	*doc* must include ``payment_type``, ``party_type``, ``party``,
	``paid_amount``, ``paid_from`` / ``paid_to``, and ``references``.
	"""
	if isinstance(doc, str):
		doc = json.loads(doc)

	doc["doctype"] = "Payment Entry"
	pe = frappe.get_doc(doc)
	pe.insert()
	return pe.as_dict()


@frappe.whitelist()
def submit_payment(name: str) -> dict[str, Any]:
	"""Submit a draft Payment Entry."""
	pe = frappe.get_doc("Payment Entry", name)
	pe.submit()
	return pe.as_dict()


# ---------------------------------------------------------------------------
# Taxes & pricing rules (optional helpers)
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_taxes_and_charges(template_name: str) -> list[dict]:
	"""Expand a Sales Taxes and Charges Template into child rows.

	Delegates to ``erpnext.controllers.accounts_controller.get_taxes_and_charges``.
	"""
	from erpnext.controllers.accounts_controller import get_taxes_and_charges as _get

	return _get("Sales Taxes and Charges Template", template_name)


@frappe.whitelist()
def apply_pricing_rule(items: str | list) -> list[dict]:
	"""Apply pricing rules to a list of line-item dicts.

	Delegates to ``erpnext.accounts.doctype.pricing_rule.pricing_rule.apply_pricing_rule``.
	"""
	from erpnext.accounts.doctype.pricing_rule.pricing_rule import (
		apply_pricing_rule as _apply,
	)

	if isinstance(items, str):
		items = json.loads(items)

	return _apply(items)
