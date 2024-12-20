frappe.provide('ordercapture_ocr.components.navigation_handler');

ordercapture_ocr.components.navigation_handler = {
  handleNavigation: (d, documents) => {
    let currentIndex = 0;
    return {
      next: () => {
        if (currentIndex < documents.length - 1) {
          currentIndex++;
          d.clear();
          ordercapture_ocr.components.document_loader.loadDocument(d, documents[currentIndex].name, currentIndex);
        }
      },
      prev: () => {
        if (currentIndex > 0) {
          currentIndex--;
          d.clear();
          ordercapture_ocr.components.document_loader.loadDocument(d, documents[currentIndex].name, currentIndex);
        }
      }
    };
  }
};
