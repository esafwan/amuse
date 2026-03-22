"""Customer API — search, CRUD, and party details for the billing UI.

All methods are ``@frappe.whitelist()`` so the React SPA can call them via
``POST /api/method/amuse.api.customers.<name>``.
"""

from __future__ import annotations

import json
from typing import Any

import frappe


# ---------------------------------------------------------------------------
# Search / list
# ---------------------------------------------------------------------------

@frappe.whitelist()
def search_customers(
	txt: str = "",
	filters: str | dict | None = None,
	page_length: int = 20,
) -> list[dict]:
	"""Typeahead search for Customer (link-field style).

	Uses ``frappe.desk.search.search_link`` for the same autocomplete
	experience as Desk link fields.
	"""
	if isinstance(filters, str):
		filters = json.loads(filters)

	from frappe.desk.search import search_link

	return search_link(
		doctype="Customer",
		txt=txt,
		filters=filters,
		page_length=page_length,
	)


@frappe.whitelist()
def list_customers(
	filters: str | dict | None = None,
	fields: str | list | None = None,
	limit_page_length: int = 20,
	limit_start: int = 0,
	order_by: str = "modified desc",
	search: str | None = None,
) -> list[dict]:
	"""List Customers with optional filters.

	*filters* and *fields* can be JSON strings.

	*search* applies a broad match on name, email, or mobile (for list + pagination).
	"""
	if isinstance(filters, str):
		filters = json.loads(filters)
	if isinstance(fields, str):
		fields = json.loads(fields)

	filters_dict: dict = dict(filters or {})

	if not fields:
		fields = [
			"name",
			"customer_name",
			"customer_group",
			"territory",
			"default_currency",
			"default_price_list",
			"mobile_no",
			"email_id",
		]

	or_filters = None
	if search and search.strip():
		term = f"%{search.strip()}%"
		or_filters = [
			["customer_name", "like", term],
			["email_id", "like", term],
			["mobile_no", "like", term],
		]

	return frappe.get_list(
		"Customer",
		filters=filters_dict,
		or_filters=or_filters,
		fields=fields,
		limit_page_length=limit_page_length,
		limit_start=limit_start,
		order_by=order_by,
	)


@frappe.whitelist()
def list_customer_groups() -> list[str]:
	"""Return assignable Customer Group names for filter chips (non-group nodes)."""
	rows = frappe.get_all(
		"Customer Group",
		filters={"is_group": 0},
		fields=["name"],
		order_by="name",
	)
	return [r.name for r in rows]


# ---------------------------------------------------------------------------
# Read / write
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_customer(name: str) -> dict[str, Any]:
	"""Return a single Customer document as dict."""
	return frappe.get_doc("Customer", name).as_dict()


@frappe.whitelist()
def create_customer(doc: str | dict) -> dict[str, Any]:
	"""Create a new Customer.

	*doc* must include at least ``customer_name`` and ``customer_type``.
	"""
	if isinstance(doc, str):
		doc = json.loads(doc)

	doc["doctype"] = "Customer"
	customer = frappe.get_doc(doc)
	customer.insert()
	return customer.as_dict()


@frappe.whitelist()
def update_customer(name: str, data: str | dict) -> dict[str, Any]:
	"""Update an existing Customer.

	*data* is a dict (or JSON string) of fields to set.
	"""
	if isinstance(data, str):
		data = json.loads(data)

	customer = frappe.get_doc("Customer", name)
	customer.update(data)
	customer.save()
	return customer.as_dict()


# ---------------------------------------------------------------------------
# Party details (for invoice header defaults)
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_party_details(
	customer: str,
	company: str,
	posting_date: str | None = None,
) -> dict[str, Any]:
	"""Return customer defaults for a billing context.

	Fills receivable account, price list, payment terms template,
	taxes, addresses, and contact for the given customer + company.

	Delegates to ``erpnext.accounts.party.get_party_details``.
	"""
	from erpnext.accounts.party import get_party_details as _get

	return _get(
		party=customer,
		party_type="Customer",
		company=company,
		doctype="Sales Invoice",
		posting_date=posting_date or frappe.utils.today(),
		fetch_payment_terms_template=True,
	)


# ---------------------------------------------------------------------------
# Address display
# ---------------------------------------------------------------------------

@frappe.whitelist()
def get_address_display(address_name: str) -> str:
	"""Return the formatted address display string.

	Delegates to ``frappe.contacts.doctype.address.address.get_address_display``.
	"""
	from frappe.contacts.doctype.address.address import get_address_display as _get

	return _get(address_name)
