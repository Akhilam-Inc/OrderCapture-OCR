/* global ordercapture_ocr, fetch_customer_details */

frappe.provide("ordercapture_ocr.components.document_loader");

ordercapture_ocr.components.document_loader = {
  loadDocument: (d, docId, currentIndex) => {
    frappe.db.get_doc("OCR Document Processor", docId).then((doc) => {
      console.log(docId);

      d.set_value("customer", doc.customer);
      d.set_value("current_id", doc.name);
      d.set_value("file_path", `File ${currentIndex + 1}: ${doc.file_path}`);

      if (doc.processed_json) {
        ordercapture_ocr.components.table_handler.setTableFromProcessedJson(
          d,
          doc.processed_json
        );
      }

      fetch_customer_details(d);
    });
  },
};
