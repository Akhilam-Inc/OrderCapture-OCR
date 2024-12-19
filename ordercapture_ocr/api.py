import frappe


@frappe.whitelist()
def get_ocr_details(file_path):

    response =  {
        "Customer": {
            "customerAddressLink": "Link to Customer Address",
            "customerCode": "CUST123",
            "customerName": "Acme Corporation"
        },
        "orderDetails": [
            {
                "itemCode": "ITEM123",
                "itemName": "Widget",
                "qty": 10,
                "rate": 100.00,
                "gst": 18.00,
                "totalAmount": 1180.00,
                "poRate": 95.00
            },
            {
                "itemCode": "ITEM002",
                "itemName": "Gadget",
                "qty": 5,
                "rate": 200.00,
                "gst": 36.00,
                "totalAmount": 1180.00,
                "poRate": 190.00
            }
        ],
        "totals": {
            "totalItemQty": 15,
            "itemGrandTotal": 2360.00
        }
    }

    return response
    