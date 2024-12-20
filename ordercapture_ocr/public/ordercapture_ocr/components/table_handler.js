frappe.provide('ordercapture_ocr.components.table_handler');

ordercapture_ocr.components.table_handler = {
  setTableFromProcessedJson: (d, processed_json) => {
    const processed_data = JSON.parse(processed_json);
    d.fields_dict.items.df.data = [];
    d.fields_dict.items.grid.data = [];
    d.fields_dict.items.grid.make_head();

    processed_data.orderDetails.forEach(item => {
      d.fields_dict.items.grid.add_new_row();
      const row = d.fields_dict.items.df.data[d.fields_dict.items.df.data.length - 1];
      Object.assign(row, item);
    });

    d.fields_dict.items.grid.refresh();
    d.set_value('total_item_qty', processed_data.totals.totalItemQty);
    d.set_value('item_grand_total', processed_data.totals.itemGrandTotal);
  }
};  