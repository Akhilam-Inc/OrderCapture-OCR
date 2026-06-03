# Copyright (c) 2026, AkhilamInc and Contributors
# See license.txt

from unittest.mock import patch

import frappe
from frappe.client import validate_link_and_fetch
from frappe.contacts.doctype.address.address import address_query
from frappe.desk.search import search_widget
from frappe.tests import IntegrationTestCase
from frappe.utils import set_request
from ordercapture_ocr.api import get_customer_addresses, get_item_details_with_fallback, set_value
from ordercapture_ocr.ordercapture_ocr.tests.test_helpers import (
	get_or_create_test_customer,
	make_address_for_customer,
)


class TestAPI(IntegrationTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		cls.customer = get_or_create_test_customer()

	def setUp(self):
		super().setUp()
		self.address_name = make_address_for_customer(self.customer)

	def test_get_customer_addresses_returns_linked_address(self):
		addresses = get_customer_addresses(self.customer)
		names = {row["name"] for row in addresses}

		self.assertIn(self.address_name, names)
		self.assertEqual(
			frappe.db.get_value("Address", self.address_name, "address_line1"),
			addresses[0]["address_line1"]
			if len(addresses) == 1
			else next(a["address_line1"] for a in addresses if a["name"] == self.address_name),
		)

	def test_get_customer_addresses_empty_for_unknown_customer(self):
		unknown_customer = f"_Test OCR Missing {frappe.generate_hash(length=8)}"
		self.assertEqual(get_customer_addresses(unknown_customer), [])

	def test_direct_address_filter_raises_permission_error(self):
		"""Regression: Frappe 16 rejects link_doctype filters on Address directly."""
		with self.assertRaises(frappe.PermissionError):
			search_widget(
				"Address",
				"",
				filters={"link_doctype": "Customer", "link_name": self.customer},
				for_link_validation=True,
			)

	def test_address_query_finds_customer_address(self):
		results = address_query(
			"Address",
			"",
			"name",
			0,
			20,
			{"link_doctype": "Customer", "link_name": self.customer},
		)
		result_names = {row[0] for row in results}

		self.assertIn(self.address_name, result_names)

	def test_validate_link_and_fetch_with_address_query(self):
		"""Matches process_files.js: custom query + customer filters."""
		set_request(method="POST")
		result = validate_link_and_fetch(
			"Address",
			self.address_name,
			query="frappe.contacts.doctype.address.address.address_query",
			filters={"link_doctype": "Customer", "link_name": self.customer},
		)

		self.assertEqual(result.get("name"), self.address_name)

	def test_validate_link_and_fetch_rejects_unlinked_address(self):
		other_customer = get_or_create_test_customer("_Test OCR Other Customer")
		other_address = make_address_for_customer(other_customer, address_title="OCR-Other")

		set_request(method="POST")
		result = validate_link_and_fetch(
			"Address",
			other_address,
			query="frappe.contacts.doctype.address.address.address_query",
			filters={"link_doctype": "Customer", "link_name": self.customer},
		)

		self.assertEqual(result, {})

	def test_set_value_updates_ocr_document(self):
		doc = frappe.get_doc(
			{
				"doctype": "OCR Document Processor",
				"status": "Pending",
				"customer": self.customer,
			}
		).insert(ignore_permissions=True)

		set_value(
			"OCR Document Processor",
			doc.name,
			{"status": "Processed", "customer_address": self.address_name},
		)

		self.assertEqual(frappe.db.get_value("OCR Document Processor", doc.name, "status"), "Processed")
		self.assertEqual(
			frappe.db.get_value("OCR Document Processor", doc.name, "customer_address"),
			self.address_name,
		)

	def test_get_item_details_with_fallback_missing_item_code(self):
		result = get_item_details_with_fallback({})
		self.assertEqual(result, {"price_list_rate": 0})

	def test_get_item_details_with_fallback_unknown_item(self):
		result = get_item_details_with_fallback(
			{"item_code": f"NONEXISTENT-{frappe.generate_hash(length=8)}"}
		)
		self.assertEqual(result, {"price_list_rate": 0})

	@patch("ordercapture_ocr.api.original_get_item_details")
	def test_get_item_details_with_fallback_existing_item(self, mock_get_item_details):
		mock_get_item_details.return_value = {"price_list_rate": 99}

		item_code = frappe.db.get_value("Item", {}, "name")
		if not item_code:
			self.skipTest("No Item records available for fallback test")

		result = get_item_details_with_fallback({"item_code": item_code})
		self.assertEqual(result["price_list_rate"], 99)
		mock_get_item_details.assert_called_once()
