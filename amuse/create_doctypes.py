import frappe

def run():
    frappe.logger().info("Creating Amuse DocTypes...")
    
    # 1. Price Change Reason
    if not frappe.db.exists("DocType", "Price Change Reason"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "Price Change Reason",
            "module": "Amuse",
            "custom": 0,
            "istable": 0,
            "naming_rule": "Expression",
            "autoname": "format:{reason_code}",
            "fields": [
                {"fieldname": "reason_code", "label": "Reason Code", "fieldtype": "Data", "reqd": 1, "unique": 1},
                {"fieldname": "reason_name", "label": "Reason Name", "fieldtype": "Data", "reqd": 1},
                {"fieldname": "is_active", "label": "Is Active", "fieldtype": "Check", "default": "1"}
            ],
            "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}]
        })
        doc.insert()
        frappe.db.commit()
    
    # 2. Pricing Settings
    if not frappe.db.exists("DocType", "Pricing Settings"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "Pricing Settings",
            "module": "Amuse",
            "custom": 0,
            "issingle": 1,
            "fields": [
                {"fieldname": "enable_price_change_tracking", "label": "Enable Price Change Tracking", "fieldtype": "Check", "default": "1"},
                {"fieldname": "enable_discount_attribution", "label": "Enable Discount Attribution", "fieldtype": "Check", "default": "1"},
                {"fieldname": "enable_customer_metrics", "label": "Enable Customer Metrics", "fieldtype": "Check", "default": "1"},
                {"fieldname": "long_job_queue_name", "label": "Long Job Queue", "fieldtype": "Data", "default": "long"},
                {"fieldname": "item_pricing_options", "fieldtype": "Section Break", "label": "Allocation Methods"},
                {"fieldname": "line_discount_allocation_method", "label": "Line Discount Allocation", "fieldtype": "Select", "options": "Net Line Amount\nQty-weighted Base Amount"},
                {"fieldname": "invoice_discount_allocation_method", "label": "Invoice Discount Allocation", "fieldtype": "Select", "options": "Net Line Amount\nQty-weighted Base Amount"},
                {"fieldname": "minimum_days_for_comparison", "label": "Minimum Days For Comparison", "fieldtype": "Int", "default": "7"},
                {"fieldname": "default_company", "label": "Default Company", "fieldtype": "Link", "options": "Company"}
            ],
            "permissions": [{"role": "System Manager", "read": 1, "write": 1}]
        })
        doc.insert()
        frappe.db.commit()

    # 3. Price Change Log
    if not frappe.db.exists("DocType", "Price Change Log"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "Price Change Log",
            "module": "Amuse",
            "custom": 0,
            "istable": 0,
            "naming_rule": "Expression",
            "autoname": "format:PCL-{item}-{MM}{YY}-{####}",
            "fields": [
                {"fieldname": "item", "label": "Item", "fieldtype": "Link", "options": "Item", "reqd": 1, "in_list_view": 1},
                {"fieldname": "item_name", "label": "Item Name", "fieldtype": "Data", "fetch_from": "item.item_name"},
                {"fieldname": "price_list", "label": "Price List", "fieldtype": "Link", "options": "Price List", "in_list_view": 1},
                {"fieldname": "brand", "label": "Brand", "fieldtype": "Link", "options": "Brand"},
                {"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "reqd": 1},
                {"fieldname": "currency", "label": "Currency", "fieldtype": "Link", "options": "Currency"},
                {"fieldname": "territory", "label": "Territory", "fieldtype": "Link", "options": "Territory"},
                
                {"fieldname": "change_ctx", "fieldtype": "Section Break", "label": "Change Info"},
                {"fieldname": "change_timestamp", "label": "Change Timestamp", "fieldtype": "Datetime", "in_list_view": 1},
                {"fieldname": "change_type", "label": "Change Type", "fieldtype": "Select", "options": "Rate Change\nValidity Change\nEnabled State Change\nNew Price"},
                {"fieldname": "changed_by", "label": "Changed By", "fieldtype": "Link", "options": "User"},
                {"fieldname": "source_of_change", "label": "Source of Change", "fieldtype": "Data"},
                {"fieldname": "change_reason", "label": "Change Reason", "fieldtype": "Link", "options": "Price Change Reason"},
                {"fieldname": "notes", "label": "Notes", "fieldtype": "Small Text"},
                {"fieldname": "approval_reference", "label": "Approval Ref", "fieldtype": "Data"},
                
                {"fieldname": "old_price_col", "fieldtype": "Column Break"},
                {"fieldname": "previous_item_price", "label": "Previous Item Price Ref", "fieldtype": "Data"},
                {"fieldname": "previous_rate", "label": "Previous Rate", "fieldtype": "Currency", "options": "currency", "in_list_view": 1},
                {"fieldname": "previous_valid_from", "label": "Previous Valid From", "fieldtype": "Date"},
                {"fieldname": "previous_valid_upto", "label": "Previous Valid Upto", "fieldtype": "Date"},
                {"fieldname": "previous_enabled", "label": "Previous Enabled", "fieldtype": "Check"},
                
                {"fieldname": "new_price_col", "fieldtype": "Column Break"},
                {"fieldname": "new_item_price", "label": "New Item Price Ref", "fieldtype": "Data"},
                {"fieldname": "new_rate", "label": "New Rate", "fieldtype": "Currency", "options": "currency", "in_list_view": 1},
                {"fieldname": "new_valid_from", "label": "New Valid From", "fieldtype": "Date"},
                {"fieldname": "new_valid_upto", "label": "New Valid Upto", "fieldtype": "Date"},
                {"fieldname": "new_enabled", "label": "New Enabled", "fieldtype": "Check"},

                {"fieldname": "analytics_sec", "fieldtype": "Section Break", "label": "Prior Price Analytics (Computed)"},
                {"fieldname": "days_active", "label": "Days Active", "fieldtype": "Int"},
                {"fieldname": "transaction_count", "label": "Transaction Count", "fieldtype": "Int"},
                {"fieldname": "invoice_count", "label": "Invoice Count", "fieldtype": "Int"},
                {"fieldname": "total_qty", "label": "Total Quantity Sold", "fieldtype": "Float"},
                {"fieldname": "total_revenue", "label": "Total Revenue", "fieldtype": "Currency", "options": "currency"},
                {"fieldname": "expected_revenue_at_base_price", "label": "Expected Revenue @ Base Price", "fieldtype": "Currency", "options": "currency"},
                {"fieldname": "average_realized_price", "label": "Avg Realized Price", "fieldtype": "Currency", "options": "currency"},
                
                {"fieldname": "attr_sec", "fieldtype": "Section Break", "label": "Discount Attribution"},
                {"fieldname": "total_discount_value", "label": "Total Discount Value", "fieldtype": "Currency", "options": "currency"},
                {"fieldname": "discount_pct_vs_base", "label": "Discount % vs Base", "fieldtype": "Percent"},
                {"fieldname": "pricing_rule_discount_value", "label": "Pricing Rule Discount", "fieldtype": "Currency", "options": "currency"},
                {"fieldname": "promotional_scheme_discount_value", "label": "Promotional Scheme Discount", "fieldtype": "Currency", "options": "currency"},
                {"fieldname": "coupon_discount_value", "label": "Coupon Discount", "fieldtype": "Currency", "options": "currency"},
                {"fieldname": "invoice_level_discount_value", "label": "Invoice-level Discount", "fieldtype": "Currency", "options": "currency"},
                {"fieldname": "manual_discount_value", "label": "Manual Discount", "fieldtype": "Currency", "options": "currency"},
                {"fieldname": "residual_discount_value", "label": "Residual Discount", "fieldtype": "Currency", "options": "currency"},
                
                {"fieldname": "cust_sec", "fieldtype": "Section Break", "label": "Customer Metrics"},
                {"fieldname": "unique_customers", "label": "Unique Customers", "fieldtype": "Int"},
                {"fieldname": "new_customers", "label": "New Customers", "fieldtype": "Int"},
                {"fieldname": "revenue_per_customer", "label": "Revenue per Customer", "fieldtype": "Currency", "options": "currency"},
                
                {"fieldname": "ctrl_sec", "fieldtype": "Section Break", "label": "System Control"},
                {"fieldname": "snapshot_status", "label": "Snapshot Status", "fieldtype": "Select", "options": "Pending\nCompleted\nFailed", "default": "Pending", "in_list_view": 1},
                {"fieldname": "job_id", "label": "Job ID", "fieldtype": "Data", "read_only": 1},
                {"fieldname": "regime_hash", "label": "Regime Hash", "fieldtype": "Data", "read_only": 1, "unique": 1}
            ],
            "permissions": [{"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1}]
        })
        doc.insert()
        frappe.db.commit()

    return "Created Phase 3 DocTypes successfully."
