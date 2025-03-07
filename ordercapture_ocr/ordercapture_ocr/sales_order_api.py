import frappe
from frappe import _
from erpnext.accounts.party import get_party_details

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
            no_mapped_item_codes = []
            if mapped_item_code:
                item_code_mapping[customer_item_code] = mapped_item_code
            else:
                no_mapped_item_codes.append(customer_item_code)
        if no_mapped_item_codes:
            frappe.throw(_("Item codes <b>{0}</b> are not mapped for customer <b>{1}</b>. Please map the item codes in <a href='/app/customer-item-code-mapping'>Customer Item Code Mapping</a>").format(', '.join(no_mapped_item_codes), customer_name))
        return item_code_mapping
    except Exception as e:
        print(f"Error in get_customer_item_code: {str(e)}")
        frappe.log_error(title="Error in get_customer_item_code", message=frappe.get_traceback())
        return {}


@frappe.whitelist()
def create_sales_order(response):
    source_warehouse = frappe.db.get_single_value('Order Capture OCR Configuration', 'source_warehouse_for_sales_order')
    if not source_warehouse:
        frappe.throw(_("Please set Source Warehouse for Sales Order in Order Capture OCR Configuration"))
    try:
        if isinstance(response, str):
            response = frappe.parse_json(response)
    
        customer_name = response.get('Customer').get('customerName')
        po_number = response.get('Customer').get('poNumber')
        po_date = response.get('Customer').get('poDate')
        company = frappe.get_single("Global Defaults").default_company


        # Fetch customer item codes mapping
        customer_item_codes = get_customer_item_code(response)
        if not customer_item_codes:
            # print("No customer item codes found")
            frappe.throw("No customer item codes found")

        # Check if the customer exists
        if not frappe.db.exists('Customer', customer_name):
            print(f"Customer {customer_name} not found")
            frappe.throw("Customer not found")

        # Create Sales Order document
        sales_order = frappe.get_doc({
            "doctype": "Sales Order",
            "customer": customer_name,
            "delivery_date": frappe.utils.nowdate(),
            "set_warehouse": source_warehouse,
            "po_no": po_number,
            "po_date": po_date,
            "items": []
        })

        if check_custom_field_exists("custom_po_expiry_date"):
            sales_order.custom_po_expiry_date = response.get('Customer').get('customPoExpiryDate')

        # Add items to the Sales Order
        for item in response.get('orderDetails', []):
            item_code = item.get('itemCode')

            sales_order.append("items", {
                "item_code": customer_item_codes[item_code],
                "qty": item.get('qty'),
                "rate": item.get('rate'),
                "warehouse": source_warehouse,
            })

        party_details = get_party_details(party=sales_order.customer,party_type='Customer',posting_date=frappe.utils.today(),company=company,doctype='Sales Order')
        sales_order.taxes_and_charges = party_details.get("taxes_and_charges")
        sales_order.set("taxes", party_details.get("taxes"))        
        sales_order.set_missing_values()
        sales_order.calculate_taxes_and_totals()

        sales_order.insert(ignore_permissions=True)
        frappe.db.commit()
        frappe.msgprint(f"Sales Order {sales_order.name} created successfully")

        return sales_order.name

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Error in create sales order from response")
        frappe.msgprint(f"Error in creating sales order {e}")

def check_custom_field_exists(fieldname, doctype="Sales Order"):
    meta = frappe.get_meta(doctype)  # Fetch metadata for Sales Order
    if meta.has_field(fieldname):
        return True
    return False
