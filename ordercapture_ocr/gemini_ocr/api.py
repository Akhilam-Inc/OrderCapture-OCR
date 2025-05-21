from google import genai
from pydantic import BaseModel, Field, create_model
from typing import List, Optional, Dict, Any, get_type_hints
import frappe
import os
import json
#pip install google-genai

# Create a client
ocr_config = frappe.get_single("Order Capture OCR Configuration")
api_key = ocr_config.get_password("gemini_api_secret")
client = genai.Client(api_key=api_key)
 
# Define the model you are going to use
model_id = ocr_config.gemini_model #"gemini-2.0-flash"  or "gemini-2.0-flash-lite-preview-02-05"  , "gemini-2.0-pro-exp-02-05"

class items(BaseModel):
    itemCode: str = Field(description="The item code, Extract the complete item code exactly as it appears, even if split across lines, also remove space if included. This is a critical identifier.")
    itemName: str = Field(description="The item name")
    qty: float = Field(description="The quantity of the item")
    rate: float = Field(description="The rate of the item")
    gst: float = Field(description="The gst of the item")
    landing_rate: float = Field(description="The landing rate or unit based cost of the item")
    totalAmount: float = Field(description="The total amount of the item, the amount could be in float or integer")

class Totals(BaseModel):
    totalItemQty: Optional[float] = Field(description="The total item quantity")
    itemGrandTotal: Optional[float] = Field(description="The item grand total")

class CustomerDetails(BaseModel):
    customerCode: Optional[str] = Field(description="The customer code in shipping")
    customerName: Optional[str] = Field(description="The customer name in shipping")
    customerAddress: Optional[str] = Field(description="The customer address in shipping")

class Order(BaseModel):
    """Extract the invoice number, date and all list items with description, quantity and gross worth and the total gross worth."""
    orderNumber: str = Field(description="The po number e.g. 1234567890")
    orderDate: str = Field(description="The date of the order e.g. 2024-01-01, please change the date format to yyyy-mm-dd")
    orderExpiryDate: str = Field(description="The expiry date of the order e.g. 2024-01-01, please change the date format to yyyy-mm-dd")
    Customer: Optional[CustomerDetails] = Field(description="The customer details")
    orderDetails: list[items] = Field(description="The order details")
    totals: Optional[Totals] = Field(description="The totals")

def get_complete_file_path(file_path):
    bench_path = os.getcwd()
    site_name = frappe.local.site
    
    if '/private/' in file_path:
        return os.path.join(bench_path, '/', site_name) + file_path
    else:
        return os.path.join(bench_path, '/', site_name, 'public') + file_path

def get_vendor_field_mappings(customer):
    """Fetch vendor field mappings for a specific customer"""
    if not customer:
        return {}
    
    # Get the vendor field mapping for the customer
    mapping_docs = frappe.get_all(
        "Vendor Field Mapping",
        filters={"customer": customer},
        fields=["name"],
        limit=1
    )
    
    if not mapping_docs:
        return {}
    
    # Get the field mappings from the child table
    field_mappings = frappe.get_all(
        "Vendor Field Table",
        filters={"parent": mapping_docs[0].name},
        fields=["erpnext_field", "vendor_field", "model_name"],
    )
    
    # Convert to dictionary for easy lookup, organized by model
    mapping_dict = {
        "items": {},
        "Order": {},
        "Totals": {},
        "CustomerDetails": {}
    }
    
    for mapping in field_mappings:
        model_name = mapping.model_name if mapping.model_name else "Order"  # Default to Order if not specified
        erpnext_field = mapping.erpnext_field.lower()
        
        if model_name not in mapping_dict:
            mapping_dict[model_name] = {}
            
        mapping_dict[model_name][erpnext_field] = mapping.vendor_field
    
    return mapping_dict

def update_model_descriptions(model_class, vendor_mappings, model_name):
    """Update model field descriptions based on vendor mappings"""
    # Get model annotations and field info
    model_annotations = get_type_hints(model_class)
    field_definitions = {}
    
    # Get mappings specific to this model
    model_mappings = vendor_mappings.get(model_name, {})
    
    # Iterate through model fields
    for field_name, field_type in model_annotations.items():
        # Get the original field
        field_info = model_class.model_fields[field_name]
        field_description = field_info.description
        
        # Check if this field name matches any erpnext_field in the mappings
        field_name_lower = field_name.lower()
        if field_name_lower in model_mappings:
            vendor_field = model_mappings[field_name_lower]
            field_description = f"{field_description} (Vendor refers to this as '{vendor_field}')"
        
        # Add the field to our new model definition
        field_definitions[field_name] = (field_type, Field(description=field_description))
    
    # Create a new model with the updated field descriptions
    updated_model = create_model(
        f"Custom{model_class.__name__}",
        **field_definitions,
        __base__=BaseModel
    )
    
    # Copy the docstring
    updated_model.__doc__ = model_class.__doc__
    
    return updated_model

@frappe.whitelist()
def extract_structured_data(file_path, customer=None, model: BaseModel = Order):
    # Upload the file to the File API
    try:
        # If customer is provided, get vendor field mappings
        vendor_mappings = {}
        if customer:
            vendor_mappings = get_vendor_field_mappings(customer)
        
        # If we have vendor mappings, update the model descriptions
        if vendor_mappings:
            # For nested models, we need to update them first
            custom_items = update_model_descriptions(items, vendor_mappings, "items")
            custom_totals = update_model_descriptions(Totals, vendor_mappings, "Totals")
            custom_customer_details = update_model_descriptions(CustomerDetails, vendor_mappings, "CustomerDetails")
            
            # For the main Order model, we need to create it with references to the custom nested models
            order_field_definitions = {}
            for field_name, field_type in get_type_hints(Order).items():
                field_info = Order.model_fields[field_name]
                field_description = field_info.description
                
                # Update field description if it matches a vendor mapping
                field_name_lower = field_name.lower()
                if field_name_lower in vendor_mappings.get("Order", {}):
                    vendor_field = vendor_mappings["Order"][field_name_lower]
                    field_description = f"{field_description} (Vendor refers to this as '{vendor_field}')"
                
                # Use custom nested models for specific fields
                if field_name == "orderDetails":
                    field_type = List[custom_items]
                elif field_name == "totals":
                    field_type = Optional[custom_totals]
                elif field_name == "Customer":
                    field_type = Optional[custom_customer_details]
                
                order_field_definitions[field_name] = (field_type, Field(description=field_description))
            
            # Create the custom Order model
            model = create_model(
                "CustomOrder",
                **order_field_definitions,
                __base__=BaseModel
            )
            model.__doc__ = Order.__doc__
            
            # Add special instructions for items in the prompt
            item_field_instructions = []
            for erpnext_field, vendor_field in vendor_mappings.get("items", {}).items():
                item_field_instructions.append(f"'{erpnext_field}' is referred to as '{vendor_field}' in their documents")
        
        file_path = os.getcwd() + get_complete_file_path(file_path)

        if not os.path.exists(file_path):
            frappe.log_error(title="File Missing", message=f"File not found: {file_path}")

        file = client.files.upload(
            file=file_path, 
            config={'display_name': file_path.split('/')[-1].split('.')[0]})
        
        # Generate a structured response using the Gemini API
        prompt = f"You are an assistant that extracts purchase order details. We are supplier with name GO DESI MANDI PVT LTD. In purchase Order our details will be titled as vendor details so make sure not to extract address from that section. IMPORTANT: Extract all data COMPLETELY and ACCURATELY. Pay special attention to information that may span across multiple lines. Capture full text of descriptions, addresses, and notes. Ensure you collect all items and details exactly as they appear in the document, even if formatted unusually or split across different sections."
        
        # Add customer-specific instructions if customer is provided
        if customer:
            prompt += f" This order is from customer {customer}. Pay special attention to their specific terminology and formatting."
            
            # Add item field mapping instructions if available
            if 'item_field_instructions' in locals() and item_field_instructions:
                prompt += f" For item details, note that: {', '.join(item_field_instructions)}."
        
        response = client.models.generate_content(
            model=model_id, 
            contents=[prompt, file], 
            config={
                'response_mime_type': 'application/json', 
                'response_schema': model
            })

        return json.loads(response.parsed.model_dump_json())

    except Exception as e:
        frappe.log_error(title="Error in extract_structured_data for gemini", message=str(e))
        frappe.throw(f"Error processing order: {str(e)}")
