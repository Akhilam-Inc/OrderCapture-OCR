// Copyright (c) 2024, AkhilamInc and contributors
// For license information, please see license.txt

frappe.ui.form.on("Customer Item Code Mapping", {
	// refresh(frm) {

	// },
    validate: function(frm) {
        frappe.db.get_list('Customer Item Code Mapping', {
            filters: {
                'customer': frm.doc.customer,
                'customer_item_code': frm.doc.customer_item_code,
                'name': ['!=', frm.doc.name]
            }
        }).then(records => {
            if (records.length > 0) {
                frappe.validated = false;
                frappe.throw(__('Combination of Customer and Customer Item Code already exists'));
            }
        });
    }
});
