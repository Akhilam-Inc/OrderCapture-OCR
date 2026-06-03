# Copyright (c) 2026, AkhilamInc and Contributors
# See license.txt

import frappe


def get_or_create_test_customer(customer_name="_Test OCR Customer"):
	"""Return an existing ERPNext test customer or create a minimal one."""
	if frappe.db.exists("Customer", customer_name):
		return customer_name

	customer = frappe.new_doc("Customer")
	customer.customer_name = customer_name
	customer.customer_type = "Individual"
	customer.customer_group = frappe.db.get_value("Customer Group", {}, "name") or "All Customer Groups"
	customer.territory = frappe.db.get_value("Territory", {}, "name") or "All Territories"
	customer.insert(ignore_permissions=True)
	return customer.name


def make_address_for_customer(
	customer,
	address_title=None,
	address_line1="OCR Test Address Line 1",
	city="Mumbai",
):
	"""Create an Address linked to the given Customer via Dynamic Link."""
	address_title = address_title or f"OCR-{frappe.generate_hash(length=6)}"
	address = frappe.get_doc(
		{
			"doctype": "Address",
			"address_title": address_title,
			"address_type": "Billing",
			"address_line1": address_line1,
			"city": city,
			"state": "Maharashtra",
			"country": frappe.db.get_value("Country", {"name": ("!=", "")}, "name") or "India",
			"links": [{"link_doctype": "Customer", "link_name": customer}],
		}
	)
	address.insert(ignore_permissions=True)
	return address.name
