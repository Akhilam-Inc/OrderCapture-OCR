# Copyright (c) 2026, AkhilamInc and Contributors
# See license.txt

import frappe
from frappe.tests import IntegrationTestCase
from ordercapture_ocr.ordercapture_ocr.sales_order_api import (
	attach_file_to_doc,
	check_custom_field_exists,
	get_customer_item_code,
	parse_iso_date,
)
from ordercapture_ocr.ordercapture_ocr.tests.test_helpers import get_or_create_test_customer


class TestSalesOrderAPI(IntegrationTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		cls.customer = get_or_create_test_customer()

	def test_parse_iso_date(self):
		self.assertEqual(parse_iso_date("2024-03-05"), "2024-03-05")
		self.assertEqual(parse_iso_date("2024-3-5"), "2024-3-5")
		self.assertIsNone(parse_iso_date(None))
		self.assertIsNone(parse_iso_date(""))

	def test_get_customer_item_code_maps_active_items(self):
		item_code = frappe.db.get_value("Item", {}, "name")
		if not item_code:
			self.skipTest("No Item records available")

		customer_item_code = f"CUST-ITEM-{frappe.generate_hash(length=6)}"
		mapping = frappe.get_doc(
			{
				"doctype": "Customer Item Code Mapping",
				"customer": self.customer,
				"customer_item_code": customer_item_code,
				"item_code": item_code,
				"active": 1,
			}
		).insert(ignore_permissions=True)

		response = {
			"Customer": {"customer": self.customer},
			"orderDetails": [{"itemCode": customer_item_code}],
		}
		result = get_customer_item_code(response)

		self.assertEqual(result[customer_item_code], item_code)
		mapping.delete(ignore_permissions=True)

	def test_get_customer_item_code_returns_empty_for_unmapped_items(self):
		"""Unmapped items throw internally but are caught and return {}."""
		response = {
			"Customer": {"customer": self.customer},
			"orderDetails": [{"itemCode": f"UNMAPPED-{frappe.generate_hash(length=8)}"}],
		}

		self.assertEqual(get_customer_item_code(response), {})

	def test_check_custom_field_exists(self):
		self.assertTrue(check_custom_field_exists("customer", "Sales Order"))
		self.assertFalse(
			check_custom_field_exists(f"nonexistent_{frappe.generate_hash(length=6)}", "Sales Order")
		)

	def test_attach_file_to_doc_requires_source(self):
		ocr_doc = frappe.get_doc(
			{"doctype": "OCR Document Processor", "status": "Pending", "customer": self.customer}
		).insert(ignore_permissions=True)

		with self.assertRaises(frappe.ValidationError):
			attach_file_to_doc("OCR Document Processor", ocr_doc.name)

	def test_attach_file_to_doc_with_content(self):
		ocr_doc = frappe.get_doc(
			{"doctype": "OCR Document Processor", "status": "Pending", "customer": self.customer}
		).insert(ignore_permissions=True)

		file_name = attach_file_to_doc(
			"OCR Document Processor",
			ocr_doc.name,
			file_content="hello ocr",
			filename=f"ocr-test-{frappe.generate_hash(length=6)}.txt",
		)

		file_doc = frappe.get_doc("File", file_name)
		self.assertEqual(file_doc.attached_to_doctype, "OCR Document Processor")
		self.assertEqual(file_doc.attached_to_name, ocr_doc.name)

	def test_attach_file_to_doc_content_without_filename(self):
		ocr_doc = frappe.get_doc(
			{"doctype": "OCR Document Processor", "status": "Pending", "customer": self.customer}
		).insert(ignore_permissions=True)

		with self.assertRaises(frappe.ValidationError):
			attach_file_to_doc("OCR Document Processor", ocr_doc.name, file_content="data")
