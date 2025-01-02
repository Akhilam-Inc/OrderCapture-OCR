frappe.provide('ordercapture_ocr.components.sales_order_handler');

ordercapture_ocr.components.sales_order_handler = {
  postSalesOrder: (d) => {
    const items_data = d.fields_dict.items.grid.data;
    frappe.call({
      method: 'ordercapture_ocr.ordercapture_ocr.sales_order_api.create_sales_order',
      args: {
        response: sales_order_values
      },
      callback: (r) => {
        const sales_order_name = r.message;

          // Update OCR Document Processor
        frappe.call({
          method: 'frappe.client.set_value',
          args: {
            doctype: 'OCR Document Processor',
            name: d.get_value('current_id'),
            fieldname: {
              'status': 'Completed',
              'sales_order': sales_order_name
            }
          },
          callback: () => {
            d.$wrapper.find('.post-sales-order-btn').hide();
            frappe.show_alert({
              message: 'Sales Order created and OCR Document updated',
              indicator: 'green'
            });
            frappe.set_route('Form', 'Sales Order', sales_order_name);
          }
        });
      }
    });
  }
};
