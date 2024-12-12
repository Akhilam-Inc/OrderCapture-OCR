frappe.provide('ordercapture_ocr.components');

ordercapture_ocr.components.CustomerSelect = {
    template: `
        <div class="widget">
            <div class="form-group">
                <div ref="customerField"></div>
            </div>
        </div>
    `,
};

Vue.component('customer-select', ordercapture_ocr.components.CustomerSelect);
