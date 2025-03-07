frappe.pages['ordercapture-ocr'].on_page_load = function(wrapper) {
    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Order Capture OCR',
        single_column: true
    });
   
	let app_container = $('<div id="ocr-dashboard">').appendTo(page.main);
    // Load dependencies sequentially
    frappe.require('/assets/ordercapture_ocr/js/vue.js')
        .then(() => {
            return frappe.require('/assets/ordercapture_ocr/ordercapture_ocr/dashboard.js');
        })
        .then(() => {
            new Vue({
                el: '#ocr-dashboard',
                components: {
                    'ocr-dashboard': ordercapture_ocr.components.Dashboard
                },
                template: '<ocr-dashboard/>'
            });
        });
}