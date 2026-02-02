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
        inactive_mapped_item_codes = []
        for item in response.get("orderDetails", []):
            customer_item_code = item.get("itemCode")
            # First check if mapping exists (regardless of active status)
            mapping_data = frappe.db.get_value(
                "Customer Item Code Mapping",
                {"customer": customer_name, "customer_item_code": customer_item_code},
                ["item_code", "active"],
                as_dict=True,
            )
            if mapping_data:
                if mapping_data.active:
                    item_code_mapping[customer_item_code] = mapping_data.item_code
                else:
                    inactive_mapped_item_codes.append(customer_item_code)
            else:
                no_mapped_item_codes.append(customer_item_code)

        error_messages = []
        if inactive_mapped_item_codes:
            error_messages.append(
                _(
                    "Item codes <b>{0}</b> have inactive mappings for customer <b>{1}</b>. Please activate the mappings in <a href='/app/customer-item-code-mapping'>Customer Item Code Mapping</a>"
                ).format(", ".join(inactive_mapped_item_codes), customer_name)
            )
        if no_mapped_item_codes:
            error_messages.append(
                _(
                    "Item codes <b>{0}</b> are not mapped for customer <b>{1}</b>. Please map the item codes in <a href='/app/customer-item-code-mapping'>Customer Item Code Mapping</a>"
                ).format(", ".join(no_mapped_item_codes), customer_name)
            )
        
        if error_messages:
            frappe.throw("<br>".join(error_messages))
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
def create_sales_order(response, file_path=None, ocr_doc_name=None):
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

        # Get customer's party details first to get currency and price list
        from erpnext.accounts.party import get_party_details
        party_details = get_party_details(
            party=customer,
            party_type="Customer",
            posting_date=frappe.utils.today(),
            company=defaultCompany,
            doctype="Sales Order",
        )
        price_list = party_details.get("selling_price_list") or "Standard Selling"
        # Get company default currency as fallback
        company_currency = frappe.get_cached_value("Company", defaultCompany, "default_currency")
        currency = party_details.get("currency") or company_currency
        # Ensure currency is not None
        if not currency:
            currency = company_currency or "USD"
        price_list_currency = party_details.get("price_list_currency") or currency

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
                "currency": currency,
                "price_list": price_list,
                "items": [],
            }
        )

        if check_custom_field_exists("custom_po_expiry_date"):
            po_expiry_date = response.get("Customer").get("poExpiryDate")
            if po_expiry_date:
                sales_order.custom_po_expiry_date = parse_iso_date(po_expiry_date)
        
        # Track plRate mismatches
        plrate_mismatches = []

        # Add items to the Sales Order
        for item in response.get("orderDetails", []):
            item_code = item.get("itemCode")
            mapped_item_code = customer_item_codes[item_code]
            document_plrate = item.get("plRate")

            # Check for plRate mismatch if document has plRate
            if document_plrate is not None and document_plrate > 0:
                try:
                    from erpnext.stock.get_item_details import get_item_details
                    system_item_details = get_item_details(
                        {
                            "item_code": mapped_item_code,
                            "price_list": price_list,
                            "customer": customer,
                            "company": defaultCompany,
                            "doctype": "Sales Order",
                            "currency": currency,
                            "price_list_currency": price_list_currency,
                            "conversion_rate": 1,
                        }
                    )
                    system_plrate = system_item_details.get("price_list_rate", 0) or 0
                    
                    # Compare document plRate with system plRate (allow small tolerance for floating point)
                    if abs(float(document_plrate) - float(system_plrate)) > 0.01:
                        plrate_mismatches.append({
                            "item_code": mapped_item_code,
                            "customer_item_code": item_code,
                            "item_name": item.get("itemName"),
                            "document_plrate": document_plrate,
                            "system_plrate": system_plrate,
                        })
                except Exception as e:
                    # If error getting system plRate, log it but continue
                    frappe.log_error(
                        f"Error getting price list rate for {mapped_item_code}: {str(e)}",
                        "plRate Check Error"
                    )

            # Prepare item data
            item_data = {
                "item_code": mapped_item_code,
                "qty": item.get("qty"),
                "rate": item.get("rate"),
                "warehouse": source_warehouse,
            }
            
            # Set price_list_rate if plRate is available and > 0
            if document_plrate is not None and document_plrate > 0:
                item_data["price_list_rate"] = document_plrate
            
            sales_order.append("items", item_data)

        # Set missing values first (this sets currency, exchange rate, etc.)
        sales_order.set_missing_values()
        
        # Set taxes after missing values are set
        sales_order.set_taxes()
        
        # Calculate taxes and totals
        sales_order.calculate_taxes_and_totals()

        sales_order.insert(ignore_permissions=True)
        frappe.db.commit()
        
        # Create OCR Error Log if plRate mismatches found
        if plrate_mismatches:
            try:
                # Get File document name from file_path if provided
                file_name = None
                if file_path:
                    # Try to find file by file_url first
                    file_doc = frappe.db.get_value("File", {"file_url": file_path}, "name")
                    if file_doc:
                        file_name = file_doc
                    else:
                        # Try to find file by name if URL doesn't match
                        file_name_from_path = file_path.split("/")[-1]
                        file_doc = frappe.db.get_value("File", {"file_name": file_name_from_path}, "name")
                        if file_doc:
                            file_name = file_doc
                        else:
                            # If file not found, try to get from OCR Document Processor
                            if ocr_doc_name:
                                ocr_doc = frappe.db.get_value(
                                    "OCR Document Processor",
                                    ocr_doc_name,
                                    "file_path"
                                )
                                if ocr_doc:
                                    file_doc = frappe.db.get_value("File", {"file_url": ocr_doc}, "name")
                                    if file_doc:
                                        file_name = file_doc
                
                error_log = frappe.get_doc({
                    "doctype": "OCR Error Log",
                    "reference_doctype": "Sales Order",
                    "reference_docname": sales_order.name,
                    "file": file_name,
                    "error": frappe.as_json({
                        "type": "plRate Mismatch",
                        "message": "Price List Rate from document does not match system price list rate",
                        "mismatches": plrate_mismatches
                    }, indent=2)
                })
                error_log.insert(ignore_permissions=True)
                frappe.db.commit()
                frappe.log_error(
                    f"OCR Error Log created successfully: {error_log.name} for Sales Order: {sales_order.name}",
                    "OCR Error Log Success"
                )
            except Exception as e:
                frappe.log_error(
                    f"Error creating OCR Error Log: {str(e)}\nTraceback: {frappe.get_traceback()}\nplRate mismatches: {len(plrate_mismatches)}, file_path: {file_path}",
                    "OCR Error Log Creation Error"
                )
        
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
