# Copyright (c) 2026, AkhilamInc and Contributors
# See license.txt


def before_tests():
	"""Prepare master data required by ordercapture_ocr integration tests."""
	from ordercapture_ocr.ordercapture_ocr.tests.test_helpers import ensure_test_site_masters

	ensure_test_site_masters()
