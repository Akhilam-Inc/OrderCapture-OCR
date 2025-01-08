import frappe
from ordercapture_ocr.ordercapture_ocr.ocr_processor.structure_data_with_llm import parse_purchase_order_with_llm
from ordercapture_ocr.ordercapture_ocr.ocr_processor.pdf_to_table import pdf_tables_to_json

from frappe import _
import io
import pandas as pd
from frappe.utils import cstr

@frappe.whitelist()
def process_file():
    if not frappe.has_permission("File", "create"):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    file = frappe.request.files.get('file')
    file_type = frappe.form_dict.file_type

    if not file:
        frappe.throw(_("No file uploaded"))

    content = file.read()
    filename = file.filename

    # Create a File document
    file_doc = frappe.new_doc("File")
    file_doc.file_name = filename
    file_doc.attached_to_name = "Administrator"
    file_doc.content = content
    file_doc.is_private = 1
    file_doc.attached_to_doctype = "OCR Document Processor"
    file_doc.insert()
    

    try:
        return file_doc
    
    except Exception as e:
        frappe.log_error(f"File Processing Error: {str(e)}")
        frappe.throw(_("Error processing file. Please check file format and try again."))

def process_pdf(content):
    pdf_data = []
    pdf_file = io.BytesIO(content)
    
    try:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        for page in pdf_reader.pages:
            text = page.extract_text()
            pdf_data.append(text)
        
        return {"type": "pdf", "content": pdf_data}
    
    except Exception as e:
        frappe.log_error(f"PDF Processing Error: {str(e)}")
        raise

def process_spreadsheet(content, file_type):
    try:
        df = None
        if file_type == 'text/csv':
            df = pd.read_csv(io.BytesIO(content))
        else:  # Excel files
            df = pd.read_excel(io.BytesIO(content))
        
        return {
            "type": "spreadsheet",
            "content": df.to_dict('records')
        }
    
    except Exception as e:
        frappe.log_error(f"Spreadsheet Processing Error: {str(e)}")
        raise

def store_processed_data(processed_data, filename):
    # Create a custom document to store processed data
    doc = frappe.new_doc("OCR Processed Data")
    doc.filename = filename
    doc.processed_data = frappe.as_json(processed_data)
    doc.processing_date = frappe.utils.now()
    doc.insert()

        
@frappe.whitelist()
def get_ocr_details(file_path):
    file_doc = frappe.get_doc("File", {"file_url": file_path})
    if not file_doc:
        frappe.throw("File not found")

    pdf_path = file_doc.get_full_path()
    frappe.log_error(title=file_path, message=pdf_path)
    table_json = pdf_tables_to_json(pdf_path)
    frappe.log_error(title="Table JSON", message=table_json)
    data = parse_purchase_order_with_llm(table_json)
    frappe.log_error(title="Data", message=data)

    # frappe.throw("File Path: " + file_path)

    # response =  {
    #     "Customer": {
    #         "customerAddressLink": "Link to Customer Address",
    #         "customerCode": "CUST123",
    #         "customerName": "Acme Corporation"
    #     },
    #     "orderDetails": [
    #         {
    #             "itemCode": "ITEM123",
    #             "itemName": "Widget",
    #             "qty": 10,
    #             "rate": 100.00,
    #             "gst": 18.00,
    #             "totalAmount": 1180.00,
    #             "poRate": 95.00
    #         },
    #         {
    #             "itemCode": "ITEM002",
    #             "itemName": "Gadget",
    #             "qty": 5,
    #             "rate": 200.00,
    #             "gst": 36.00,
    #             "totalAmount": 1180.00,
    #             "poRate": 190.00
    #         }
    #     ],
    #     "totals": {
    #         "totalItemQty": 15,
    #         "itemGrandTotal": 2360.00
    #     }
    # }

    return data


@frappe.whitelist()
def extract_excel_data(file_path):
    try:
        # Read Excel file
        df = pd.read_excel(file_path)
        
        # Initialize response structure
        response = {
            "items": [],
            "addresses": {
                "delivery": {},
                "company": {}
            }
        }
        
        # Extract item details
        items_df = df[['item_code', 'item_name', 'qty', 'rate']]  # Adjust column names as per excel structure
        for _, row in items_df.iterrows():
            item = {
                "item_code": cstr(row['item_code']),
                "item_name": cstr(row['item_name']),
                "qty": float(row['qty']),
                "rate": float(row['rate'])
            }
            response["items"].append(item)
            
        # Extract delivery address
        delivery_df = df[['delivery_name', 'delivery_address', 'delivery_city', 'delivery_pincode']]
        response["addresses"]["delivery"] = {
            "name": cstr(delivery_df.iloc[0]['delivery_name']),
            "address_line1": cstr(delivery_df.iloc[0]['delivery_address']),
            "city": cstr(delivery_df.iloc[0]['delivery_city']),
            "pincode": cstr(delivery_df.iloc[0]['delivery_pincode'])
        }
        
        # Extract company address
        company_df = df[['company_name', 'company_address', 'company_city', 'company_pincode']]
        response["addresses"]["company"] = {
            "name": cstr(company_df.iloc[0]['company_name']), 
            "address_line1": cstr(company_df.iloc[0]['company_address']),
            "city": cstr(company_df.iloc[0]['company_city']),
            "pincode": cstr(company_df.iloc[0]['company_pincode'])
        }
        
        return response
        
    except Exception as e:
        frappe.log_error(f"Excel Extraction Error: {str(e)}")
        return None

    