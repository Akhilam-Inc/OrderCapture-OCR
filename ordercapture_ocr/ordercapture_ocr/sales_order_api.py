import frappe
from frappe import _

# response =  {
#     "Customer": {
#         "customerAddressLink": "Shop No 18, Gat No 233/1 Pune Trade Center Wagholi Pune Maharashtra412207",
#         "customerCode": "CUST123",
#         "customerName": "Grant Plastics Ltd."
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


def get_customer_item_code(response):
    try:
        customer_name = response.get('Customer', {}).get('customerName')
        item_code_mapping = {}
        for item in response.get('orderDetails', []):
            customer_item_code = item.get('itemCode')
            mapped_item_code = frappe.db.get_value('Customer Item Code Mapping',{'customer': customer_name, 'customer_item_code': customer_item_code},'item_code')
            if mapped_item_code:
                item_code_mapping[customer_item_code] = mapped_item_code
        return item_code_mapping
    except Exception as e:
        print(f"Error in get_customer_item_code: {str(e)}")
        frappe.log_error(title="Error in get_customer_item_code", message=frappe.get_traceback())
        return {}


@frappe.whitelist()
def create_sales_order(response):
    # frappe.throw(str(response))
    try:
        if isinstance(response, str):
            response = frappe.parse_json(response)
    
        customer_name = response.get('Customer').get('customerName')

        # Fetch customer item codes mapping
        customer_item_codes = get_customer_item_code(response)

        # Check if the customer exists
        if not frappe.db.exists('Customer', customer_name):
            print(f"Customer {customer_name} not found")
            frappe.throw("Customer not found")
        
        # Check if customer item codes are fetched
        if not customer_item_codes:
            frappe.throw("Unable to fetch customer item codes")

        # Create Sales Order document
        sales_order = frappe.get_doc({
            "doctype": "Sales Order",
            "customer": customer_name,
            "delivery_date": frappe.utils.nowdate(),
            "items": []
        })

        # Add items to the Sales Order
        for item in response.get('orderDetails', []):
            item_code = item.get('itemCode')

            if item_code not in customer_item_codes:
                frappe.throw(f"Item code '{item_code}' not found in customer item codes mapping")

            sales_order.append("items", {
                "item_code": customer_item_codes[item_code],
                "qty": item.get('qty'),
                "rate": item.get('rate'),
                "warehouse": "Stores - AD",
            })

        sales_order.insert(ignore_permissions=True)
        frappe.db.commit()
        frappe.msgprint(f"Sales Order {sales_order.name} created successfully")

        return sales_order.name

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Error in create sales order from response")
        frappe.msgprint("Error in creating sales order")


