# Copyright (c) 2026, AkhilamInc and Contributors
# See license.txt

import frappe

DEFAULT_TEST_COUNTRY = "India"
DEFAULT_ADDRESS_TEMPLATE = """{{ address_line1 }}<br>
{% if address_line2 %}{{ address_line2 }}<br>{% endif -%}
{{ city }}<br>
{% if state %}{{ state }}<br>{% endif -%}
{{ country }}<br>"""

_masters_ready = False


def ensure_test_site_masters():
	"""Idempotent setup for CI and fresh sites: country, address template, customer masters."""
	global _masters_ready
	if _masters_ready:
		return

	_ensure_country(DEFAULT_TEST_COUNTRY)
	_ensure_address_template(DEFAULT_TEST_COUNTRY)
	_ensure_customer_group()
	_ensure_territory()
	_ensure_item_group()
	_masters_ready = True


def _ensure_country(country=DEFAULT_TEST_COUNTRY):
	if frappe.db.exists("Country", country):
		return country

	frappe.get_doc({"doctype": "Country", "country_name": country}).insert(ignore_permissions=True)
	return country


def _ensure_address_template(country=DEFAULT_TEST_COUNTRY):
	_ensure_country(country)

	if frappe.db.exists("Address Template", country):
		return country

	frappe.get_doc(
		{
			"doctype": "Address Template",
			"country": country,
			"is_default": 1,
			"template": DEFAULT_ADDRESS_TEMPLATE,
		}
	).insert(ignore_permissions=True)
	return country


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


def get_test_country():
	"""Return a country that has an address template on the site."""
	ensure_test_site_masters()
	return DEFAULT_TEST_COUNTRY


def get_or_create_test_customer(customer_name="_Test OCR Customer"):
	"""Return an existing customer or create one with valid master links."""
	ensure_test_site_masters()

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


def _ensure_item_group():
	for name in ("Products", "All Item Groups", "_Test Item Group"):
		if frappe.db.exists("Item Group", name) and not frappe.db.get_value("Item Group", name, "is_group"):
			return name

	if not frappe.db.exists("Item Group", "All Item Groups"):
		frappe.get_doc(
			{"doctype": "Item Group", "item_group_name": "All Item Groups", "is_group": 1}
		).insert(ignore_permissions=True)

	doc = frappe.get_doc(
		{
			"doctype": "Item Group",
			"item_group_name": "_Test OCR Item Group",
			"parent_item_group": "All Item Groups",
			"is_group": 0,
		}
	)
	doc.insert(ignore_permissions=True)
	return doc.name


def get_test_item():
	"""Return any stock item, creating a minimal one if the site has none."""
	ensure_test_site_masters()

	item_code = frappe.db.get_value(
		"Item",
		{"disabled": 0, "is_stock_item": 1},
		"name",
		order_by="creation asc",
	)
	if item_code:
		return item_code

	item_code = "_Test OCR Item"
	if frappe.db.exists("Item", item_code):
		return item_code

	item = frappe.new_doc("Item")
	item.item_code = item_code
	item.item_name = item_code
	item.item_group = _ensure_item_group()
	item.stock_uom = frappe.db.get_value("UOM", {}, "name") or "Nos"
	item.is_stock_item = 1
	item.insert(ignore_permissions=True)
	return item.name


def make_address_for_customer(
	customer,
	address_title=None,
	address_line1="OCR Test Address Line 1",
	city="Mumbai",
	country=None,
):
	"""Create an Address linked to the given Customer via Dynamic Link."""
	ensure_test_site_masters()
	country = country or get_test_country()
	_ensure_address_template(country)

	address_title = address_title or f"OCR-{frappe.generate_hash(length=6)}"
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
