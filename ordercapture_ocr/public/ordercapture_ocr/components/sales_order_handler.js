frappe.provide('ordercapture_ocr.components.sales_order_handler');

ordercapture_ocr.components.sales_order_handler = {
  postSalesOrder: (d) => {
    const items_data = d.fields_dict.items.grid.data;
    
    frappe.call({
      method: 'frappe.client.insert',
      args: {
        doc: {
          doctype: 'Sales Order',
          customer: d.get_value('customer'),
          customer_name: d.get_value('customer_name'),
          customer_address: d.get_value('customer_address_link'),
          set_warehouse: 'Stores - OCR',
          items: items_data.map(item => ({
            item_code: item.itemCode,
            item_name: item.itemName,
            qty: item.qty,
            rate: item.rate,
            amount: item.totalAmount,
            warehouse: 'Stores - OCR'
          }))
        }
      },
      callback: (r) => {
        if (r.message) {
          frappe.show_alert({
            message: 'Sales Order created successfully',
            indicator: 'green'
          });
          frappe.set_route('Form', 'Sales Order', r.message.name);
        }
      }
    });
  }
};
