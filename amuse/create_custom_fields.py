import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def run():
    frappe.logger().info("Injecting Amuse Custom Fields into ERPNext Item Price...")
    
    custom_fields = {
        "Item Price": [
            dict(fieldname="custom_brand", label="Brand", fieldtype="Link", options="Brand", insert_after="item_name"),
            dict(fieldname="custom_channel", label="Channel", fieldtype="Data", insert_after="custom_brand"),
            dict(fieldname="custom_location", label="Location", fieldtype="Data", insert_after="custom_channel"),
            dict(fieldname="amuse_context", label="Pricing Intelligence Context", fieldtype="Section Break", insert_after="currency"),
            dict(fieldname="custom_change_reason", label="Change Reason", fieldtype="Link", options="Price Change Reason", insert_after="amuse_context"),
            dict(fieldname="custom_change_notes", label="Change Notes", fieldtype="Small Text", insert_after="custom_change_reason"),
            dict(fieldname="custom_last_price_change_log", label="Last Price Change Log", fieldtype="Link", options="Price Change Log", read_only=1, insert_after="custom_change_notes")
        ]
    }
    
    create_custom_fields(custom_fields)
    frappe.db.commit()
    return "Custom Fields applied to Item Price."
