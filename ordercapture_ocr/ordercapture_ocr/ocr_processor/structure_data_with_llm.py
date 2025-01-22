import openai
import json
import frappe

def parse_purchase_order_with_llm(text_content):
    ocr_config = frappe.get_single("Order Capture OCR Configuration")
    openai.api_key = ocr_config.get_password("openai_api_secret")

    functions = [
        {
            "name": "parse_purchase_order",
            "description": "Extract structured data from a purchase order.",
            "parameters": {
                "type": "object",
                "properties": {
                    "orderNumber":{
                        "type": "string",
                        "description": "Unique code identifying the purchase order or PO No or PO Number."
                    },
                    "Customer": {
                        "type": "object",
                        "properties": {
                            "customerCode": {"type": "string", "description": "Unique code identifying the customer."},
                            "customerName": {"type": "string", "description": "Name of the customer."},
                            "customerAddress": {"type": "string", "description": "Delivered to Address of the customer or Billing Address of the customer if Delivered to Address is not available."},
                        },
                        "required": ["customerAddressLink", "customerCode", "customerName"]
                    },
                    "orderDetails": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "itemCode": {"type": "string", "description": "Code identifying the item."},
                                "itemName": {"type": "string", "description": "Name of the item."},
                                "qty": {"type": "integer", "description": "Quantity of the item ordered."},
                                "rate": {"type": "number", "description": "Rate of the item."},
                                "gst": {"type": "number", "description": "GST rate for the item."},
                                "landing_rate": {"type": "number", "description": "Rate of the item with all taxes and charges."},
                                "totalAmount": {"type": "number", "description": "Total amount for the item including GST."},
                                
                            },
                            "required": ["itemCode", "itemName", "qty", "rate","landing_rate", "gst","totalAmount"]
                        }
                    },
                    "totals": {
                        "type": "object",
                        "properties": {
                            "totalItemQty": {"type": "integer", "description": "Total quantity of all items."},
                            "itemGrandTotal": {"type": "number", "description": "Grand total amount for all items."}
                        },
                        "required": ["totalItemQty", "itemGrandTotal"]
                    }
                },
                "required": ["Customer", "orderDetails", "totals"]
            }
        }
    ]


    system_message = {
        "role": "system",
        "content": "You are an assistant that extracts purchase order details."
    }

    user_message = {
        "role": "user",
        "content": f"""
        Here is the text from a purchase order:

       {text_content}
        """
    }

    response = openai.chat.completions.create(
        model="gpt-3.5-turbo",  # or gpt-4-0613, etc.
        messages=[system_message, user_message],
        functions=functions,
        function_call={"name": "parse_purchase_order"}
    )
    frappe.log_error(title="Response from OpenAI", message=response)
    
    assistant_message = response.choices[0].message.function_call.arguments

    frappe.log_error(title="Assistant Response", message=assistant_message)
    
    # Attempt to parse JSON
    try:
        json_data = json.loads(assistant_message)
        return json_data
    except json.JSONDecodeError:
        # If parsing fails, handle appropriately
        return None
