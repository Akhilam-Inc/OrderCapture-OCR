import frappe
from ordercapture_ocr.ordercapture_ocr.ocr_processor.structure_data_with_llm import parse_purchase_order_with_llm
from ordercapture_ocr.ordercapture_ocr.ocr_processor.pdf_to_table import pdf_tables_to_json

from frappe import _
import io
import pandas as pd
from frappe.utils import cstr
from re import sub

@frappe.whitelist()
def extract_purchase_order_data(file_path: str, vendor_type: str) -> dict:
    """
    Extracts structured purchase order data from an Excel file.

    Args:
        file_path (str): Path to the Excel file
        vendor_type (str): Type of vendor (BB or FlipKart)

    Returns:
        dict: Structured purchase order data containing order number and details
    
    Raises:
        frappe.ValidationError: If file processing fails
    """
    try:
        file_path = frappe.local.site + file_path
        df = pd.read_excel(file_path)
        vendor_type = vendor_type.strip() 
        
        processors = {
            'BB': _process_bb_order,
            'FlipKart': _process_flipkart_order
        }
        
        if vendor_type not in processors:
            frappe.throw(f"Unsupported vendor type: {vendor_type}")
            
        order_details = processors[vendor_type](df)
        
        return {
            'orderNumber': order_details.get('po_number', ''),
            'orderDate': order_details.get('po_date', ''),
            'orderExpiryDate': order_details.get('po_expiry', ''),
            'Customer':{
                'customerAddress': order_details.get('customer', {}).get('customer_address', ''),
                'customerName': order_details.get('customer', {}).get('customer_name', ''),
            },
            # 'orderDate': order_details.get('po_date', ''),
            'orderDetails': order_details.get('items', [])
        }

    except Exception as e:
        frappe.log_error(f"Purchase Order Processing Error: {str(e)}")
        frappe.throw(f"Error processing purchase order: {str(e)}")

def _process_bb_order(df: pd.DataFrame) -> dict:
    """Process BB vendor purchase order"""
    po_number = df.iloc[10, 0].split(":")[1].strip() if "PO Number" in str(df.iloc[10, 0]) else ""
    po_date = df.iloc[10, 3].split(":")[1].strip() if "PO date" in str(df.iloc[10, 3]) else ""

    customer_address = df.iloc[5, 7]
    customer_address1 = df.iloc[6, 7]
    customer_name = df.iloc[0, 0]

    start_row = df[df.iloc[:, 0].str.contains("SLNO", na=False)].index[0]
    end_row = df[df.iloc[:, 3].str.contains("Total", na=False)].index[0]
    
    item_details = _extract_item_details(df, start_row, end_row)
    items = _process_bb_items(item_details)
    
    return {
        'po_number': po_number,
        'po_date': po_date,
        'po_expiry': po_date,
        'customer': {
            "customer_address": str(f"{customer_address} {customer_address1}") or "",
            "customer_name": str(customer_name) or "",
        },
        'items': items
    }

def _process_flipkart_order(df: pd.DataFrame) -> dict:
    """Process FlipKart vendor purchase order"""
    po_number = df.iloc[0, 1]
    po_date = df.iloc[0, 24]
    po_expiry = df.iloc[0, 19]

    customer_address = df.iloc[3, 2]
    customer_name = df.iloc[1, 1]

    
    start_row = df[df.iloc[:, 0].str.contains("S. no", na=False)].index[0]
    end_row = df[df.iloc[:, 3].str.contains("Total", na=False)].index[0]
    
    item_details = _extract_item_details(df, start_row, end_row)
    items = _process_flipkart_items(item_details)
    
    return {
        'po_number': po_number,
        'po_date': po_date,
        'po_expiry': po_expiry,
        'customer': {
            "customer_address": str(customer_address) or "",
            "customer_name": str(customer_name) or "",
        },
        'items': items
    }

def _extract_item_details(df: pd.DataFrame, start_row: int, end_row: int) -> pd.DataFrame:
    """Extract and prepare item details dataframe"""
    item_details = df.iloc[start_row:end_row, :]
    item_details.columns = item_details.iloc[0]
    return item_details[1:]

def _process_bb_items(item_details: pd.DataFrame) -> list:
    """Process BB vendor items"""
    items = []
    for _, row in item_details.iterrows():
        items.append({
            'itemCode': row['SkuCode'],
            'itemName': row['Description'],
            'qty': row['Quantity'],
            'rate': row['Basic Cost'],
            'gst': row['GST Amount']/row['Quantity'],
            'landing_rate': row['Landing Cost'],
            'totalAmount': row['TotalValue']
        })
    return items

def _process_flipkart_items(item_details: pd.DataFrame) -> list:
    """Process FlipKart vendor items"""
    items = []
    for _, row in item_details.iterrows():
        rate = convert_string_with_inr(row['Supplier Price'])
        gst = convert_string_with_inr(row['Tax Amount'])/row['Quantity']
        
        items.append({
            'itemCode': row['FSN/ISBN13'],
            'itemName': row['Title'],
            'qty': row['Quantity'],
            'rate': rate,
            'gst': gst,
            'landing_rate': rate + gst,
            'totalAmount': row['Total Amount']
        })
    return items

# @frappe.whitelist()
# def extract_purchase_order_data(file_path: str, vendor_type: str) -> dict:
#     """
#     Extracts structured purchase order data from an Excel file.

#     Args:
#         file_path (str): Path to the Excel file.
#         sheet_name (str): Sheet name to process. Defaults to the first sheet if not provided.

#     Returns:
#         dict: Extracted structured purchase order data.
#     """
#     # Load the Excel file
#     file_path = frappe.local.site + file_path
#     df = pd.read_excel(file_path)

#     print(vendor_type)

#     try:
#         purchase_order_data = {}
#         order_details = []

#         if vendor_type == 'BB':
#             # # Extract PO Number and Date
#             po_number = df.iloc[10, 0].split(":")[1].strip() if "PO Number" in str(df.iloc[10, 0]) else "Unknown"
#             po_date = df.iloc[10, 3].split(":")[1].strip() if "PO date" in str(df.iloc[10, 3]) else "Unknown"

#             # print(f"PO Number: {po_number}, PO Date: {po_date}")

#             # # print(df.head(20))

#             # # Extract Item Details
#             # # Find Start row by checking "SLNO" found in the first column
#             start_row = df[df.iloc[:, 0].str.contains("SLNO", na=False)].index[0]
#             # # print(f"Start Row: {start_row}")
#             # # Find End row by checking "Total" found in the forth column
#             end_row = df[df.iloc[:, 3].str.contains("Total", na=False)].index[0]

#             # # print(f"End Row: {end_row}")
            
#             # # #Get end row data
#             # # end_row_data = df.iloc[end_row, :]
#             # # print(end_row_data)
            

#             # # make a data frame with first row as header
#             item_details = df.iloc[start_row:end_row, :]

#             # # make first row as header and remove first row
#             item_details.columns = item_details.iloc[0]
#             item_details = item_details[1:]
            
#             # # add below details in the dictionary
#             # # "orderDetails": [
#             # # {
#             # # "itemCode": "10119089",
#             # # "itemName": "GO DESi Tangy Imli Desi Popz Lollipop Candy (1 pack (10 pieces))",
#             # # "qty": 150,
#             # # "rate": 30.95,
#             # # "gst": 5,
#             # # "landing_rate": 32.5,
#             # # "totalAmount": 4875
#             # # },
#             # # {
#             # # "itemCode": "10162269",
#             # # "itemName": "Premium Kaju Katli Box by GO DESi (200g)",
#             # # "qty": 120,
#             # # "rate": 142.38,
#             # # "gst": 5,
#             # # "landing_rate": 149.5,
#             # # "totalAmount": 17940
#             # # }
#             # # ]

#             # # extract all the items details
            
#             # #iterate over dataframes rows
#             for index, row in item_details.iterrows():
#                 itemCode = row['SkuCode']
#                 itemName = row['Description']
#                 qty = row['Quantity']
#                 rate = row['Basic Cost']
#                 gst = row['GST Amount']/row['Quantity']
#                 landing_rate = row['Landing Cost']
#                 totalAmount = row['TotalValue']

#                 order_details.append({
#                     "itemCode": itemCode,
#                     "itemName": itemName,
#                     "qty": qty,
#                     "rate": rate,
#                     "gst": gst,
#                     "landing_rate": landing_rate,
#                     "totalAmount": totalAmount
#                 })

#         # Logic for FlipKart
#         elif vendor_type == 'FlipKart':
#             po_number = df.iloc[0, 1]
#             po_date = df.iloc[0, 11]
#             # Extract Item Details
#             # Find Start row by checking "S. no" found in the first column
#             start_row = df[df.iloc[:, 0].str.contains("S. no", na=False)].index[0]

#             # Find End row by checking "Total" found in the forth column
#             end_row = df[df.iloc[:, 3].str.contains("Total", na=False)].index[0]

#             # make a data frame with first row as header
#             item_details = df.iloc[start_row:end_row, :]

#             # make first row as header and remove first row
#             item_details.columns = item_details.iloc[0]
#             item_details = item_details[1:]

#             for index, row in item_details.iterrows():
#                 itemCode = row['FSN/ISBN13']
#                 itemName = row['Title']
#                 qty = row['Quantity']
#                 rate = convert_string_with_inr(row['Supplier Price'])
#                 gst = convert_string_with_inr(row['Tax Amount'])/row['Quantity']
#                 landing_rate = rate + gst
#                 totalAmount = row['Total Amount']

#                 print(f"Item Code: {itemCode}, Item Name: {itemName}, Qty: {qty}, Rate: {rate}, GST: {gst}, Landing Rate: {landing_rate}, Total Amount: {totalAmount}")

#                 order_details.append({
#                     "itemCode": itemCode,
#                     "itemName": itemName,
#                     "qty": qty,
#                     "rate": rate,
#                     "gst": gst,
#                     "landing_rate": landing_rate,
#                     "totalAmount": totalAmount
#                 })

#         purchase_order_data['orderNumber'] = 'po_number'
        
#         purchase_order_data['orderDetails'] = order_details

#         return purchase_order_data

#     except Exception as e:
#         frappe.throw(f"Error extracting data: {e}")
#         return {}

def convert_string_with_inr(value):
    return float(sub(r'[^0-9.]', '', value))

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
def get_customer_addresses(customer_name):
    """Get all addresses for a specific customer
    
    Args:
        customer_name (str): Name of the customer
        
    Returns:
        list: List of address documents with key details
    """
    addresses = frappe.get_all(
        "Address",
        filters={
            "link_doctype": "Customer",
            "link_name": customer_name
        },
        fields=[
            "name",
            "address_title",
            "address_line1", 
            "address_line2",
            "city",
            "state",
            "country",
            "pincode",
            "phone",
            "email_id",
            "is_primary_address",
            "is_shipping_address"
        ]
    )
    
    return addresses


        
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

    