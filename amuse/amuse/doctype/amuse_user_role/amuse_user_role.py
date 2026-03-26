# Copyright (c) 2026, Tridz and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

from amuse.permissions import bust_capability_cache, sync_frappe_roles_for_user


class AmuseUserRole(Document):
	def before_insert(self):
		if not self.invited_by:
			self.invited_by = frappe.session.user
		if not self.invited_on:
			self.invited_on = frappe.utils.now()

	def after_insert(self):
		self._apply_frappe_role_sync()

	def on_update(self):
		self._apply_frappe_role_sync()

	def on_trash(self):
		sync_frappe_roles_for_user(self.user, None, enabled=False)
		bust_capability_cache(self.user)

	def _apply_frappe_role_sync(self) -> None:
		frappe_role = (
			frappe.db.get_value("Amuse Role", self.amuse_role, "frappe_role") if self.amuse_role else None
		)
		sync_frappe_roles_for_user(self.user, frappe_role, bool(self.enabled))
		bust_capability_cache(self.user)
