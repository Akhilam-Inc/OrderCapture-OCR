import frappe
import pandas as pd
from frappe.utils import cstr

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
