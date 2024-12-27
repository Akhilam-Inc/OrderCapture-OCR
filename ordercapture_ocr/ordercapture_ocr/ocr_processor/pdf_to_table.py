import pdfplumber
import json
import frappe

def pdf_tables_to_json(pdf_path):
    tables_data = {}
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_number, page in enumerate(pdf.pages, start=1):
                # Extract all tables on the page
                tables = page.extract_tables()
                
                # Store each table in the dictionary
                page_tables = []
                for table in tables:
                    # Each table is a list of lists (rows and columns)
                    page_tables.append(table)
                
                if page_tables:
                    tables_data[f"page_{page_number}"] = page_tables

        return json.dumps(tables_data, indent=4)
    except Exception as e:
        frappe.log_error(title="Error in pdf_tables_to_json", message=frappe.get_traceback())