frappe.provide("ordercapture_ocr.components.table_handler");

ordercapture_ocr.components.table_handler = {
  setTableFromProcessedJson: (d, processed_json) => {
    const processed_data = JSON.parse(processed_json);

    d.fields_dict.items.df.data = [];
    d.fields_dict.items.grid.data = [];
    d.fields_dict.items.grid.make_head();
    // console.log(processed_data);
    if (processed_data) {
      d.$wrapper.find(".post-sales-order-btn").show();
      d.$wrapper.find(".save-changes-btn").show();
    } else {
      d.$wrapper.find(".post-sales-order-btn").hide();
      d.$wrapper.find(".save-changes-btn").hide();
    }

    d.fields_dict.items.grid.refresh();
    // Add rows from processed_json
    processed_data.orderDetails.forEach((item) => {
      let row = d.fields_dict.items.df.data;
      d.fields_dict.items.grid.add_new_row();
      row = d.fields_dict.items.df.data[d.fields_dict.items.df.data.length - 1];
      Object.assign(row, item);
    });

    // Refresh grid and set totals
    d.fields_dict.items.grid.refresh();
    d.set_value("total_item_qty", processed_data.totals.totalItemQty);
    d.set_value("item_grand_total", processed_data.totals.itemGrandTotal);
  },
};
