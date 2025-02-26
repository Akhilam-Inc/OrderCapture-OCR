import openai
import json

def parse_purchase_order_with_llm(text_content):

    openai.api_key = "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"
    openai_model = "gpt-4-turbo"

    functions = [
        {
            "name": "parse_purchase_order",
            "description": "Extract structured data from a purchase order.",
            "parameters": {
                "type": "object",
                "properties": {
                    "orderNumber":{
                        "type": "string",
                        "description": "PO Number or Purchase Order Number or Unique code identifying the purchase order or PO No or PO Number."
                    },
                    "orderDate": {
                        "type": "string",
                        "description": "The order date in YYYY-MM-DD format."
                    },
                    "orderExpiryDate": {
                        "type": "string",
                        "description": "The expiry date in YYYY-MM-DD format."
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
        "content": "You are an assistant that extracts purchase order details. We are supplier with name GO DESI MANDI PVT LTD. In purchase Order our details will be titled as vendor details so make sure not to extract address from that section."
    }

    user_message = {
        "role": "user",
        "content": f"""
        Here is the text from a purchase order:

       {text_content}
        """
    }

    response = openai.chat.completions.create(
        model=openai_model,  # or gpt-4-0613, etc.
        messages=[system_message, user_message],
        functions=functions,
        function_call={"name": "parse_purchase_order"}
    )
    
    
    assistant_message = response.choices[0].message.function_call.arguments

    
    
    # Attempt to parse JSON
    try:
        json_data = json.loads(assistant_message)
        return json_data
    except json.JSONDecodeError:
        # If parsing fails, handle appropriately
        return None