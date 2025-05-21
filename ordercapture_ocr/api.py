import frappe
from ordercapture_ocr.ordercapture_ocr.ocr_processor.structure_data_with_llm import parse_purchase_order_with_llm
from ordercapture_ocr.ordercapture_ocr.ocr_processor.pdf_to_table import pdf_tables_to_json

from frappe import _
import io
import pandas as pd
from frappe.utils import cstr
from re import sub
import json


from erpnext.stock.get_item_details import get_item_details as original_get_item_details


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
    po_number = df.iloc[16, 0].split(":")[1].strip() if "PO Number" in str(df.iloc[16, 0]) else ""
    po_date = df.iloc[16, 3].split(":")[1].strip() if "PO Date" in str(df.iloc[16, 3]) else ""
    po_expiry_date = df.iloc[16, 7].split(":")[1].strip() if "PO Expiry date" in str(df.iloc[16, 7]) else ""

    customer_address = df.iloc[5, 7]
    customer_address1 = df.iloc[6, 7]
    customer_name = df.iloc[0, 0]

    start_row = df[df.iloc[:, 0].str.contains("S.No", na=False)].index[0]
    end_row = df[df.iloc[:, 3].str.contains("Total", na=False)].index[0]
    
    item_details = _extract_item_details(df, start_row, end_row)
    items = _process_bb_items(item_details)
    
    return {
        'po_number': po_number,
        'po_date': po_date,
        'po_expiry': po_expiry_date,
        'customer': {
            "customer_address": str(f"{customer_address} {customer_address1}") or "",
            "customer_name": str(customer_name) or "",
        },
        'items': items
    }


def _process_flipkart_order(df: pd.DataFrame) -> dict:
    """Process FlipKart vendor purchase order"""
    po_number = df.iloc[0, 1]
    po_date = parse_date(df.iloc[0, 24], df.iloc[0, 25])
    po_expiry = parse_date(df.iloc[0, 19], df.iloc[0, 20])

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
            'itemCode': row['SKU Code'],
            'itemName': row['Description'],
            'qty': row['Quantity'],
            'rate': row['Basic Cost'],
            'gst': row['GST Amount']/row['Quantity'],
            'landing_rate': row['Landing Cost'],
            'totalAmount': row['Total Value']
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
def get_ocr_details(file_path, customer=None):
    file_doc = frappe.get_doc("File", {"file_url": file_path})
    if not file_doc:
        frappe.throw("File not found")

    pdf_path = file_doc.get_full_path()
    frappe.log_error(title=file_path, message=pdf_path)
    table_json = pdf_tables_to_json(pdf_path)
    frappe.log_error(title="Table JSON", message=table_json)
    data = parse_purchase_order_with_llm(table_json)
    frappe.log_error(title="Data", message=data)


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



@frappe.whitelist()
def get_item_details_with_fallback(args):
    """
    Custom wrapper for get_item_details that handles item not found errors gracefully.
    First tries with item_code, then falls back to using the same value as item name if not found.
    
    Args:
        args: JSON string or dict containing the arguments for get_item_details
    
    Returns:
        The result from get_item_details or empty dict if item not found
    """
    if isinstance(args, str):
        args = json.loads(args)
    
    item_code = args.get("item_code")
    if not item_code:
        return {"price_list_rate": 0}
    
    # First check if the item exists by item_code
    item_exists = frappe.db.exists("Item", item_code)
    
    if item_exists:
        # Item exists, safe to call original function
        try:
            return original_get_item_details(args)
        except Exception as e:
            frappe.log_error(f"Error getting item details for {item_code}: {str(e)}", "safe_get_item_details")
            return {"price_list_rate": 0}
    else:
        # Item doesn't exist by code, try to find by name
        items = frappe.get_all(
            "Item", 
            filters={"item_name": item_code},
            fields=["name"]
        )
        
        if items and len(items) > 0:
            # Found an item with matching name, use its item code
            args["item_code"] = items[0].name
            try:
                return original_get_item_details(args)
            except Exception as e:
                frappe.log_error(f"Error getting item details by name for {item_code}: {str(e)}", "safe_get_item_details")
                return {"price_list_rate": 0}
        else:
            # No item found by code or name
            frappe.log_error(f"Item not found by code or name: {item_code}", "safe_get_item_details")
            return {"price_list_rate": 0}
        


@frappe.whitelist()
def set_value(doctype, name, fieldname):
    """
    Safely update multiple fields on a document using db.set_value.
    Expects fieldname as a dict of field:value pairs.
    """
    if not frappe.has_permission(doctype=doctype, ptype="write", doc=frappe.get_doc(doctype, name)):
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    if isinstance(fieldname, str):
        import json
        fieldname = json.loads(fieldname)

    for key, value in fieldname.items():
        frappe.db.set_value(doctype, name, key, value)

    return {"status": "ok"}

def parse_date(*values):
    for val in values:
        try:
            date = pd.to_datetime(val, errors='raise').date()
            return date
        except (ValueError, TypeError):
            continue
    return None 

def prepare_dynamic_prompt():
    """
    Prepares a dynamic prompt for LLM based on vendor field mappings.
    
    Returns:
        str: A formatted prompt with vendor-specific field mappings
    """
    try:
        # Get vendor field mappings from DocType or configuration
        vendor_mappings = frappe.get_all(
            "Vendor Field Mapping",
            fields=["vendor_type", "field_name", "target_field", "description"],
            filters={"enabled": 1}
        )
        
        if not vendor_mappings:
            return get_default_prompt()
        
        # Organize mappings by vendor type
        vendors = {}
        for mapping in vendor_mappings:
            vendor_type = mapping.get("vendor_type")
            if vendor_type not in vendors:
                vendors[vendor_type] = []
            
            vendors[vendor_type].append({
                "field_name": mapping.get("field_name"),
                "target_field": mapping.get("target_field"),
                "description": mapping.get("description")
            })
        
        # Build the prompt
        prompt = "Extract the following information from the purchase order document:\n\n"
        prompt += "General fields to extract:\n"
        prompt += "- Order Number/PO Number\n"
        prompt += "- Order Date\n"
        prompt += "- Order Expiry Date (if available)\n"
        prompt += "- Customer Name\n"
        prompt += "- Customer Address\n\n"
        
        prompt += "For line items, extract:\n"
        prompt += "- Item Code\n"
        prompt += "- Item Name/Description\n"
        prompt += "- Quantity\n"
        prompt += "- Rate/Price\n"
        prompt += "- GST/Tax Amount\n"
        prompt += "- Total Amount\n\n"
        
        prompt += "Vendor-specific field mappings:\n"
        for vendor, mappings in vendors.items():
            prompt += f"\nFor {vendor} vendor:\n"
            for mapping in mappings:
                prompt += f"- '{mapping['field_name']}' maps to '{mapping['target_field']}'"
                if mapping.get("description"):
                    prompt += f" ({mapping['description']})"
                prompt += "\n"
        
        prompt += "\nReturn the extracted data in a structured JSON format with the following schema:\n"
        prompt += """{
            "orderNumber": "string",
            "orderDate": "YYYY-MM-DD",
            "orderExpiryDate": "YYYY-MM-DD",
            "Customer": {
                "customerName": "string",
                "customerAddress": "string"
            },
            "orderDetails": [
                {
                "itemCode": "string",
                "itemName": "string",
                "qty": number,
                "rate": number,
                "gst": number,
                "landing_rate": number,
                "totalAmount": number
                }
            ]
        }"""
        
        return prompt
    
    except Exception as e:
        frappe.log_error(f"Error preparing dynamic prompt: {str(e)}")
        return get_default_prompt()

def get_default_prompt():
    """
    Returns a default prompt when vendor mappings are not available
    
    Returns:
        str: Default prompt for LLM
    """
    return """Extract the following information from the purchase order document:
- Order Number/PO Number
- Order Date
- Order Expiry Date (if available)
- Customer Name
- Customer Address
- Line items with Item Code, Item Name, Quantity, Rate, GST Amount, and Total Amount

Return the extracted data in a structured JSON format."""
