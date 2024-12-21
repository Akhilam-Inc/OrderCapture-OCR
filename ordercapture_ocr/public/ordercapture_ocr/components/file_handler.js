frappe.provide('ordercapture_ocr.components.file_handler');

ordercapture_ocr.components.file_handler = {
  processFile: (d) => {
    const file_path_display = d.get_value('file_path');
    const actual_file_path = file_path_display.split(': ')[1];

    frappe.call({
      method: 'ordercapture_ocr.api.get_ocr_details',
      args: { file_path: actual_file_path },
      callback: (r) => {
        if (r.message) {
          frappe.call({
            method: 'frappe.client.set_value',
            args: {
              doctype: 'OCR Document Processor',
              name: d.get_value('current_id'),
              fieldname: { 'processed_json': JSON.stringify(r.message) }
            },
            callback: () => {
              ordercapture_ocr.components.table_handler.setTableFromProcessedJson(d, JSON.stringify(r.message));
            }
          });
        }
      }
    });
  },

  viewFile: (d) => {
    const file_path_display = d.get_value('file_path');
    const actual_file_path = file_path_display.split(': ')[1];
    console.log(actual_file_path);
    // window.open(`${actual_file_path}`, '_blank');
  }
};
