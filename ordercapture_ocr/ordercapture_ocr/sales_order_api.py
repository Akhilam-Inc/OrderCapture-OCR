import frappe
from frappe import _
from frappe.utils import cstr

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
        customer_name = response.get("Customer", {}).get("customer")
        item_code_mapping = {}
        no_mapped_item_codes = []
        for item in response.get("orderDetails", []):
            customer_item_code = item.get("itemCode")
            mapped_item_code = frappe.db.get_value(
                "Customer Item Code Mapping",
                {"customer": customer_name, "customer_item_code": customer_item_code},
                "item_code",
            )
            if mapped_item_code:
                item_code_mapping[customer_item_code] = mapped_item_code
            else:
                no_mapped_item_codes.append(customer_item_code)

        if no_mapped_item_codes:
            frappe.throw(
                _(
                    "Item codes <b>{0}</b> are not mapped for customer <b>{1}</b>. Please map the item codes in <a href='/app/customer-item-code-mapping'>Customer Item Code Mapping</a>"
                ).format(", ".join(no_mapped_item_codes), customer_name)
            )
        return item_code_mapping
    except Exception as e:
        print(f"Error in get_customer_item_code: {str(e)}")
        frappe.log_error(
            title="Error in get_customer_item_code", message=frappe.get_traceback()
        )
        return {}


def parse_iso_date(date_string):
    """
    Parse ISO date string (YYYY-MM-DD) to Frappe date format
    """
    if not date_string:
        return None

    try:
        # Log the original date string for debugging
        frappe.log_error(f"Original date string: {date_string}", "Date Debug")

        # If it's in YYYY-MM-DD format, keep it as string for Frappe
        if (
            isinstance(date_string, str)
            and len(date_string) == 10
            and date_string.count("-") == 2
        ):
            parts = date_string.split("-")
            if len(parts) == 3 and len(parts[0]) == 4:  # YYYY-MM-DD format
                year, month, day = parts
                # Reconstruct the date string to ensure correct format
                formatted_date = f"{year}-{month.zfill(2)}-{day.zfill(2)}"

                # Log the formatted date for debugging
                frappe.log_error(
                    f"Formatted date string: {formatted_date}", "Date Debug"
                )

                # Return as string in YYYY-MM-DD format (Frappe's internal format)
                return formatted_date

        # Fallback to original string if format doesn't match
        return cstr(date_string)

    except Exception as e:
        frappe.log_error(
            f"Failed to parse date: {date_string}, Error: {str(e)}",
            "Date Parsing Error",
        )
        return None


@frappe.whitelist()
def create_sales_order(response):
    source_warehouse = frappe.db.get_single_value(
        "Order Capture OCR Configuration", "source_warehouse_for_sales_order"
    )
    if not source_warehouse:
        frappe.throw(
            _(
                "Please set Source Warehouse for Sales Order in Order Capture OCR Configuration"
            )
        )
    try:
        if isinstance(response, str):
            response = frappe.parse_json(response)

        customer_name = response.get("Customer").get("customerName")
        customer = response.get("Customer").get("customer")
        po_number = response.get("Customer").get("poNumber")
        po_date = response.get("Customer").get("poDate")
        customer_address = response.get("Customer").get("customerAddressLink")
        # Convert po_date to Frappe date format
        if po_date:
            po_date = parse_iso_date(po_date)

        # Fetch customer item codes mapping
        customer_item_codes = get_customer_item_code(response)

        # Check if the customer exists
        if not frappe.db.exists("Customer", customer):
            print(f"Customer {customer_name} not found")
            frappe.throw("Customer not found")

        defaultCompany = frappe.get_single("Global Defaults").default_company

        # Create Sales Order document
        sales_order = frappe.get_doc(
            {
                "doctype": "Sales Order",
                "customer": customer,
                "customer_address": customer_address,
                "shipping_address_name": customer_address,
                "company": defaultCompany,
                "delivery_date": frappe.utils.nowdate(),
                "set_warehouse": source_warehouse,
                "po_no": po_number,
                "po_date": po_date,
                "items": [],
            }
        )

        if check_custom_field_exists("custom_po_expiry_date"):
            po_expiry_date = response.get("Customer").get("poExpiryDate")
            if po_expiry_date:
                sales_order.custom_po_expiry_date = parse_iso_date(po_expiry_date)

        # Add items to the Sales Order
        for item in response.get("orderDetails", []):
            item_code = item.get("itemCode")

            sales_order.append(
                "items",
                {
                    "item_code": customer_item_codes[item_code],
                    "qty": item.get("qty"),
                    "rate": item.get("rate"),
                    "warehouse": source_warehouse,
                },
            )

        # party_details = get_party_details(party=sales_order.customer,party_type='Customer',posting_date=frappe.utils.today(),company=defaultCompany,doctype='Sales Order')
        # sales_order.taxes_and_charges = party_details.get("taxes_and_charges")
        # sales_order.set("taxes", party_details.get("taxes"))
        sales_order.set_taxes()

        sales_order.set_missing_values()
        sales_order.calculate_taxes_and_totals()

        sales_order.insert(ignore_permissions=True)
        frappe.db.commit()
        frappe.msgprint(f"Sales Order {sales_order.name} created successfully")

        return sales_order.name

    except Exception:
        frappe.log_error(
            frappe.get_traceback(), "Error in create sales order from response"
        )
        frappe.msgprint("Error in creating sales order")


def check_custom_field_exists(fieldname, doctype="Sales Order"):
    meta = frappe.get_meta(doctype)  # Fetch metadata for Sales Order
    if meta.has_field(fieldname):
        return True
    return False


@frappe.whitelist()
def attach_file_to_doc(
    doctype, docname, file_url=None, file_content=None, filename=None, is_private=1
):
    """
    Attach a file to a given doctype/document.
    - file_url: URL to an existing file (optional)
    - file_content: bytes or string content of the file (optional)
    - filename: name of the file (required if file_content is provided)
    - is_private: 1 for private, 0 for public
    Returns the File document name.
    """
    if not (file_url or file_content):
        frappe.throw("Either file_url or file_content must be provided.")

    file_doc = frappe.get_doc(
        {
            "doctype": "File",
            "attached_to_doctype": doctype,
            "attached_to_name": docname,
            "is_private": is_private,
        }
    )

    if file_url:
        file_doc.file_url = file_url
        file_doc.file_name = filename or file_url.split("/")[-1]
    elif file_content and filename:
        file_doc.file_name = filename
        file_doc.content = file_content
    else:
        frappe.throw("filename is required when attaching file_content.")

    file_doc.save(ignore_permissions=True)
    return file_doc.name
