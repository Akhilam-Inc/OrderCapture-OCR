from google import genai
from pydantic import BaseModel, Field
from typing import List, Optional
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
    itemCode: str = Field(description="The item code")
    itemName: str = Field(description="The item name")
    qty: float = Field(description="The quantity of the item")
    rate: float = Field(description="The rate of the item")
    gst: float = Field(description="The gst of the item")
    landing_rate: float = Field(description="The landing rate of the item")
    totalAmount: float = Field(description="The total amount of the item")

class Totals(BaseModel):
    totalItemQty: Optional[float] = Field(description="The total item quantity")
    itemGrandTotal: Optional[float] = Field(description="The item grand total")

class CustomerDetails(BaseModel):
    customerCode: Optional[str] = Field(description="The customer code")
    customerName: Optional[str] = Field(description="The customer name")
    customerAddress: Optional[str] = Field(description="The customer address")

class Order(BaseModel):
    """Extract the invoice number, date and all list items with description, quantity and gross worth and the total gross worth."""
    orderNumber: str = Field(description="The po number e.g. 1234567890")
    orderDate: str = Field(description="The date of the order e.g. 2024-01-01")
    orderExpiryDate: str = Field(description="The expiry date of the order e.g. 2024-01-01")
    Customer: Optional[CustomerDetails] = Field(description="The customer details")
    orderDetails: list[items] = Field(description="The order details")
    totals: Optional[Totals] = Field(description="The totals")


@frappe.whitelist()
def extract_structured_data(file_path: str, model: BaseModel = Order):
    # Upload the file to the File API
    try:
        # file_path = frappe.get_site_path() + file_path
        # file_path = "/Users/nasirucode/Dev/frappe-bench-version-15/sites/akhilaminc" + file_path

        file_path = "/Users/nasirucode/Dev/frappe-bench-version-15/apps/ordercapture_ocr/ordercapture_ocr/gemini_ocr/order_1.pdf"
        if not os.path.exists(file_path):
            frappe.log_error(title="File Missing", message=f"File not found: {file_path}")

        file = client.files.upload(
            file=file_path, 
            config={'display_name': file_path.split('/')[-1].split('.')[0]})
        # if file is None:
    
        # Generate a structured response using the Gemini API
        prompt = f"You are an assistant that extracts purchase order details. We are supplier with name GO DESI MANDI PVT LTD. In purchase Order our details will be titled as vendor details so make sure not to extract address from that section."
        response = client.models.generate_content(
            model=model_id, 
            contents=[prompt, file], 
            config={
                'response_mime_type': 'application/json', 
                'response_schema': model
            })

        frappe.log_error(title="Gemini API Response", message=f"Response: {response.text}")
        return json.loads(response.parsed.model_dump_json())

    except Exception as e:
        frappe.log_error(title="Error in extract_structured_data for gemini", message=str(e))
        frappe.throw(f"Error processing purchase order: {str(e)}")


