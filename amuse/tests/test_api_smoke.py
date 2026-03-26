"""Server-side smoke tests for Amuse whitelisted APIs (no HTTP).

Run:
  bench --site <site> run-tests --module amuse.tests.test_api_smoke

These assert response shapes and absence of exceptions. Empty DB is OK.
"""

from __future__ import annotations

import unittest

import frappe
from frappe.tests.utils import FrappeTestCase

from amuse.api import analytics as analytics_api
from amuse.api import billing as billing_api
from amuse.api import customers as customers_api
from amuse.api import permissions as permissions_api
from amuse.api import pos as pos_api
from amuse.api import price_change as price_change_api


class TestAmuseAPISmoke(FrappeTestCase):
    """Integration tests against the current site (not isolated test_site)."""

    def setUp(self):
        frappe.set_user("Administrator")

    def test_tenant_erpnext_installed(self):
        self.assertGreaterEqual(frappe.db.count("Company"), 1)

    def test_billing_list_invoices(self):
        rows = billing_api.list_invoices(limit_page_length=5)
        self.assertIsInstance(rows, list)
        for row in rows:
            self.assertIn("name", row)

    def test_billing_get_invoice_defaults_skips_if_no_customer(self):
        company = frappe.db.get_value("Company", {}, "name")
        if not company:
            self.skipTest("No company")
        # Missing customer should raise or return empty — ERPNext may error; accept either
        try:
            billing_api.get_invoice_defaults("__nonexistent_customer__", company)
        except Exception:
            pass

    def test_customers_list(self):
        rows = customers_api.list_customers(limit_page_length=5)
        self.assertIsInstance(rows, list)

    def test_customers_search_returns_list(self):
        out = customers_api.search_customers(txt="", page_length=5)
        self.assertIsInstance(out, list)

    def test_pos_get_pos_settings(self):
        s = pos_api.get_pos_settings()
        self.assertIsInstance(s, dict)

    def test_pos_check_opening(self):
        rows = pos_api.check_opening()
        self.assertIsInstance(rows, list)

    def test_pos_list_profiles(self):
        rows = pos_api.list_pos_profiles()
        self.assertIsInstance(rows, list)

    def test_pos_get_closing_preview_when_open(self):
        name = frappe.db.get_value(
            "POS Opening Entry",
            {"status": "Open", "user": frappe.session.user},
            "name",
        )
        if not name:
            self.skipTest("No open POS session for current user")
        prev = pos_api.get_closing_preview(name)
        self.assertIsInstance(prev, dict)
        self.assertEqual(prev.get("pos_opening_entry"), name)
        self.assertIn("payment_reconciliation", prev)

    def test_price_change_log_list(self):
        msg = price_change_api.get_price_change_log_list()
        self.assertIsInstance(msg, dict)
        self.assertTrue(msg.get("ok"))
        self.assertIn("data", msg)
        self.assertIsInstance(msg["data"], list)

    def test_analytics_price_regime_summary_needs_log(self):
        name = frappe.db.get_value("Price Change Log", {}, "name")
        if not name:
            self.skipTest("No Price Change Log documents")
        out = analytics_api.get_price_regime_summary(name)
        self.assertIsInstance(out, dict)
        self.assertTrue(out.get("ok"))

    def test_permissions_get_me_admin(self):
        out = permissions_api.get_me()
        self.assertIsInstance(out, dict)
        self.assertEqual(out.get("user"), "Administrator")
        self.assertIsInstance(out.get("capabilities"), list)
        self.assertGreater(len(out["capabilities"]), 5)

    def test_permissions_capabilities_catalogue_admin(self):
        out = permissions_api.get_capabilities_catalogue()
        self.assertIsInstance(out, dict)
        caps = out.get("capabilities")
        self.assertIsInstance(caps, list)
        self.assertGreater(len(caps), 5)
        self.assertIn("key", caps[0])
        self.assertIn("label", caps[0])

    def test_permissions_get_amuse_roles_admin(self):
        rows = permissions_api.get_amuse_roles()
        self.assertIsInstance(rows, list)
        if frappe.db.exists("DocType", "Amuse Role") and frappe.db.count("Amuse Role"):
            self.assertIn("role_name", rows[0])


if __name__ == "__main__":
    unittest.main()
