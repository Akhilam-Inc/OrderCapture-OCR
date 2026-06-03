# Copyright (c) 2026, AkhilamInc and Contributors
# See license.txt

import frappe


def _get_test_customer_group():
	"""Return a non-group Customer Group that exists on the site."""
	for name in ("_Test Customer Group", "Individual", "Commercial"):
		if frappe.db.exists("Customer Group", name) and not frappe.db.get_value(
			"Customer Group", name, "is_group"
		):
			return name

	return frappe.db.get_value("Customer Group", {"is_group": 0}, "name", order_by="creation asc")


def _get_test_territory():
	"""Return a non-group Territory that exists on the site."""
	for name in ("_Test Territory", "India"):
		if frappe.db.exists("Territory", name) and not frappe.db.get_value("Territory", name, "is_group"):
			return name

	return frappe.db.get_value("Territory", {"is_group": 0}, "name", order_by="creation asc")


def _ensure_customer_group():
	customer_group = _get_test_customer_group()
	if customer_group:
		return customer_group

	if not frappe.db.exists("Customer Group", "All Customer Groups"):
		frappe.get_doc(
			{
				"doctype": "Customer Group",
				"customer_group_name": "All Customer Groups",
				"is_group": 1,
			}
		).insert(ignore_permissions=True)

	doc = frappe.get_doc(
		{
			"doctype": "Customer Group",
			"customer_group_name": "_Test OCR Customer Group",
			"parent_customer_group": "All Customer Groups",
			"is_group": 0,
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.name


def _ensure_territory():
	territory = _get_test_territory()
	if territory:
		return territory

	if not frappe.db.exists("Territory", "All Territories"):
		frappe.get_doc(
			{
				"doctype": "Territory",
				"territory_name": "All Territories",
				"is_group": 1,
			}
		).insert(ignore_permissions=True)

	doc = frappe.get_doc(
		{
			"doctype": "Territory",
			"territory_name": "_Test OCR Territory",
			"parent_territory": "All Territories",
			"is_group": 0,
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.name


def get_or_create_test_customer(customer_name="_Test OCR Customer"):
	"""Return an existing customer or create one with valid master links."""
	if frappe.db.exists("Customer", customer_name):
		return customer_name

	if customer_name != "_Test Customer" and frappe.db.exists("Customer", "_Test Customer"):
		return "_Test Customer"

	customer = frappe.new_doc("Customer")
	customer.customer_name = customer_name
	customer.customer_type = "Individual"
	customer.customer_group = _ensure_customer_group()
	customer.territory = _ensure_territory()
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
	country = "India" if frappe.db.exists("Country", "India") else frappe.db.get_value("Country", {}, "name")
	address = frappe.get_doc(
		{
			"doctype": "Address",
			"address_title": address_title,
			"address_type": "Billing",
			"address_line1": address_line1,
			"city": city,
			"state": "Maharashtra",
			"country": country,
			"links": [{"link_doctype": "Customer", "link_name": customer}],
		}
	)
	address.insert(ignore_permissions=True)
	return address.name
