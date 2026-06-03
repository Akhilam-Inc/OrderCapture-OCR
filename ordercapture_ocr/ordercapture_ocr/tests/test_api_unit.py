# Copyright (c) 2026, AkhilamInc and Contributors
# See license.txt

from datetime import date

import pandas as pd

from frappe.tests import UnitTestCase
from ordercapture_ocr.api import (
	_process_bb_items,
	_process_flipkart_items,
	convert_string_with_inr,
	get_default_prompt,
	parse_date,
	prepare_dynamic_prompt,
)


class TestAPIUnit(UnitTestCase):
	def test_convert_string_with_inr(self):
		self.assertEqual(convert_string_with_inr("₹1,234.50"), 1234.50)
		self.assertEqual(convert_string_with_inr("INR 99"), 99.0)

	def test_parse_date_prefers_day_first(self):
		self.assertEqual(parse_date("15/01/2024"), date(2024, 1, 15))
		self.assertEqual(parse_date("2024-01-15"), date(2024, 1, 15))
		self.assertIsNone(parse_date("not-a-date", "also-invalid"))

	def test_process_bb_items(self):
		item_details = pd.DataFrame(
			[
				{
					"SKU Code": "SKU-1",
					"Description": "Test Item",
					"Quantity": 2,
					"Basic Cost": 100,
					"GST Amount": 36,
					"Landing Cost": 118,
					"Total Value": 236,
					"MRP": "₹150.00",
				}
			]
		)
		items = _process_bb_items(item_details)

		self.assertEqual(len(items), 1)
		self.assertEqual(items[0]["itemCode"], "SKU-1")
		self.assertEqual(items[0]["qty"], 2)
		self.assertEqual(items[0]["gst"], 18)
		self.assertEqual(items[0]["plRate"], 150.0)

	def test_process_flipkart_items(self):
		item_details = pd.DataFrame(
			[
				{
					"FSN/ISBN13": "FSN-1",
					"Title": "Flipkart Item",
					"Quantity": 1,
					"Supplier Price": "₹200.00",
					"Tax Amount": "₹36.00",
					"Total Amount": 236,
				}
			]
		)
		items = _process_flipkart_items(item_details)

		self.assertEqual(len(items), 1)
		self.assertEqual(items[0]["itemCode"], "FSN-1")
		self.assertEqual(items[0]["rate"], 200.0)
		self.assertEqual(items[0]["gst"], 36.0)
		self.assertEqual(items[0]["landing_rate"], 236.0)

	def test_get_default_prompt(self):
		prompt = get_default_prompt()
		self.assertIn("Order Number", prompt)
		self.assertIn("json", prompt.lower())

	def test_prepare_dynamic_prompt_without_mappings(self):
		prompt = prepare_dynamic_prompt()
		self.assertTrue(prompt)
		self.assertIn("Order Number", prompt)
