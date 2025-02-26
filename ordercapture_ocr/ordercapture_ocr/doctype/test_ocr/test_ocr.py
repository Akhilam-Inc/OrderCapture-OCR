import frappe
from frappe.model.document import Document
import json

class TestOCR(Document):
    pass
    # def run_test(self):
    #     frappe.show_progress('Running OCR Tests', 0, 100)
    #     frappe.freeze(message='Processing PDFs and comparing results...')

    #     try:
    #         # Get all PDF attachments
    #         pdf_attachments = frappe.get_all('File', 
    #             filters={
    #                 'attached_to_doctype': 'Test OCR',
    #                 'attached_to_name': self.name,
    #                 'file_url': ['like', '%.pdf']
    #             },
    #             fields=['name', 'file_url', 'file_name']
    #         )

    #         # Get test results JSON file
    #         test_results_file = frappe.get_all('File',
    #             filters={
    #                 'attached_to_doctype': 'Test OCR', 
    #                 'attached_to_name': self.name,
    #                 'file_url': ['like', '%.json'],
    #                 'attached_to_field': 'test_results'
    #             },
    #             fields=['file_url']
    #         )

    #         if not test_results_file:
    #             frappe.throw('Test results JSON file not found')

    #         # Load expected results from JSON file
    #         json_path = frappe.get_site_path() + test_results_file[0].file_url
    #         with open(json_path) as f:
    #             expected_results = json.load(f)

    #         html_output = []
    #         total_pdfs = len(pdf_attachments)

    #         for idx, attachment in enumerate(pdf_attachments, 1):
    #             frappe.show_progress('Running OCR Tests', 
    #                 idx * 100 / total_pdfs,
    #                 100,
    #                 description=f'Processing {attachment.file_name}'
    #             )

    #             file_path = frappe.get_site_path() + attachment.file_url
                
    #             extracted_data = frappe.call('extract_purchase_order_data', 
    #                 args={
    #                     'file_path': file_path,
    #                     'vendor_type': self.vendor_type
    #                 }
    #             )
                
    #             differences = {}
    #             if attachment.file_name in expected_results:
    #                 differences = self.find_differences(extracted_data, expected_results[attachment.file_name])
                
    #             html_output.append(self.generate_test_case_html(
    #                 attachment.file_name, 
    #                 extracted_data, 
    #                 expected_results.get(attachment.file_name, {}),
    #                 differences
    #             ))

    #         self.result_html = '<div class="test-results">' + ''.join(html_output) + '</div>'
    #         self.save()

    #     finally:
    #         frappe.unfreeze()

	# def find_differences(self, extracted_data, expected_data):
	# 	differences = {}
    #     for key in expected_data:
    #         if key not in extracted_data or extracted_data[key] != expected_data[key]:
    #             differences[key] = {
    #                 'expected': expected_data[key],
    #                 'actual': extracted_data.get(key, 'N/A')
    #             }
    #     return differences

	# def generate_test_case_html(self, filename, actual, expected, differences):
	# 	status = "✅ PASS" if not differences else "❌ FAIL"
		
	# 	html = f'''
	# 		<div class="test-case" style="margin-bottom: 2rem; border: 1px solid #d1d8dd; border-radius: 4px; padding: 1rem;">
	# 			<div class="header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
	# 				<h3 style="margin: 0;">{filename}</h3>
	# 				<span style="font-weight: bold; color: {'green' if not differences else 'red'}">{status}</span>
	# 			</div>
				
	# 			<div class="results-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
	# 				<div class="actual" style="background: #f7fafc; padding: 1rem; border-radius: 4px;">
	# 					<h4 style="margin-top: 0;">Actual Results:</h4>
	# 					<pre style="white-space: pre-wrap;">{json.dumps(actual, indent=2)}</pre>
	# 				</div>
	# 				<div class="expected" style="background: #f7fafc; padding: 1rem; border-radius: 4px;">
	# 					<h4 style="margin-top: 0;">Expected Results:</h4>
	# 					<pre style="white-space: pre-wrap;">{json.dumps(expected, indent=2)}</pre>
	# 				</div>
	# 			</div>
				
	# 			<div class="differences" style="margin-top: 1rem; background: {'#fff3f3' if differences else '#f0fff4'}; padding: 1rem; border-radius: 4px;">
	# 				<h4 style="margin-top: 0;">Differences Found:</h4>
	# 				<pre style="white-space: pre-wrap;">{json.dumps(differences, indent=2) if differences else "No differences found"}</pre>
	# 			</div>
	# 		</div>
	# 	'''
	# 	return html
