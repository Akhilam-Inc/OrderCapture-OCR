frappe.provide('ordercapture_ocr.components.save_handler');

ordercapture_ocr.components.save_handler = {
  saveChanges: (d) => {
    const items = d.fields_dict.items.grid.data;
    const processed_data = {
      customerDetails: {
        customer: d.get_value('customer'),
        customerName: d.get_value('customer_name'),
        customerAddressLink: d.get_value('customer_address_link'),
        customerAddress: d.get_value('customer_address')
      },
      orderDetails: items.map(item => ({
        itemCode: item.itemCode,
        itemName: item.itemName,
        qty: item.qty,
        rate: item.rate,
        gst: item.gst,
        totalAmount: item.totalAmount,
        poRate: item.poRate
      })),
      totals: {
        totalItemQty: d.get_value('total_item_qty'),
        itemGrandTotal: d.get_value('item_grand_total')
      }
    };

    frappe.call({
      method: 'frappe.client.set_value',
      args: {
        doctype: 'OCR Document Processor',
        name: d.get_value('current_id'),
        fieldname: { 'processed_json': JSON.stringify(processed_data) }
      },
      callback: () => {
        ordercapture_ocr.components.table_handler.setTableFromProcessedJson(d, JSON.stringify(processed_data));
        frappe.show_alert({
          message: 'Changes saved successfully',
          indicator: 'green'
        });
      }
    });
  }
};
