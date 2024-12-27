import frappe
from ordercapture_ocr.ordercapture_ocr.ocr_processor.structure_data_with_llm import parse_purchase_order_with_llm
from ordercapture_ocr.ordercapture_ocr.ocr_processor.pdf_to_table import pdf_tables_to_json


@frappe.whitelist()
def get_ocr_details(file_path):
    file_doc = frappe.get_doc("File", {"file_url": file_path})
    if not file_doc:
        frappe.throw("File not found")

    pdf_path = file_doc.get_full_path()
    frappe.log_error(title=file_path, message=pdf_path)
    table_json = pdf_tables_to_json(pdf_path)
    frappe.log_error(title="Table JSON", message=table_json)
    data = parse_purchase_order_with_llm(table_json)
    frappe.log_error(title="Data", message=data)

    # frappe.throw("File Path: " + file_path)

    # response =  {
    #     "Customer": {
    #         "customerAddressLink": "Link to Customer Address",
    #         "customerCode": "CUST123",
    #         "customerName": "Acme Corporation"
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

    return data
    