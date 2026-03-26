# Copyright (c) 2026, Tridz and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document

from amuse.permissions import CAPABILITIES, clear_all_capability_caches


class AmuseRole(Document):
	def validate(self):
		for row in self.permissions or []:
			if row.capability and row.capability not in CAPABILITIES:
				frappe.throw(_("Invalid capability: {0}").format(row.capability))
			row.label = CAPABILITIES.get(row.capability or "", "") or row.label

	def on_update(self):
		clear_all_capability_caches()
