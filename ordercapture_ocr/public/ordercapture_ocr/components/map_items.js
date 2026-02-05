/* global frappe */

frappe.provide("ordercapture_ocr.map_items");

ordercapture_ocr.map_items = {
  show_map_dialog(customer) {
    if (!customer) {
      frappe.show_alert({
        message: "Please select a customer first",
        indicator: "red",
      });
      return;
    }

    // Create map item dialog
    const mapDialog = new frappe.ui.Dialog({
      title: "Map Item Code",
      size: "large",
      fields: [
        {
          fieldtype: "Link",
          fieldname: "item_code",
          label: "Item Code",
          options: "Item",
          reqd: 1,
        },
        {
          fieldtype: "Data",
          fieldname: "customer_item_code",
          label: "Customer Item Code",
          reqd: 1,
          onchange: function () {
            const customer_item_code =
              mapDialog.get_value("customer_item_code");
            const customer_value = mapDialog.get_value("customer");

            if (customer_item_code && customer_value) {
              // Check if mapping already exists to pre-populate active status
              frappe.call({
                method: "frappe.client.get_list",
                args: {
                  doctype: "Customer Item Code Mapping",
                  filters: [
                    ["customer", "=", customer_value],
                    ["customer_item_code", "=", customer_item_code],
                  ],
                  fields: ["name", "active", "item_code"],
                },
                callback: (r) => {
                  if (r.message && r.message.length > 0) {
                    console.log(r.message);
                    const existingMapping = r.message[0];
                    // Pre-populate active checkbox and item code
                    mapDialog.set_value(
                      "active",
                      existingMapping.active ? 1 : 0
                    );
                    if (existingMapping.item_code) {
                      mapDialog.set_value(
                        "item_code",
                        existingMapping.item_code
                      );
                    }
                  }
                },
              });
            }
          },
        },
        {
          fieldtype: "Link",
          fieldname: "customer",
          label: "Customer",
          options: "Customer",
          default: customer,
          reqd: 1,
        },
        {
          fieldtype: "Column Break",
          fieldname: "col_break",
        },
        {
          fieldtype: "Check",
          fieldname: "active",
          label: "Active",
          default: 1,
        },
      ],
      primary_action_label: "Save Mapping",
      primary_action: function () {
        const item_code = mapDialog.get_value("item_code");
        const customer_item_code = mapDialog.get_value("customer_item_code");
        const customer_value = mapDialog.get_value("customer");
        const active = mapDialog.get_value("active") ? 1 : 0;

        if (!item_code || !customer_item_code || !customer_value) {
          frappe.show_alert({
            message: "Please fill all required fields",
            indicator: "red",
          });
          return;
        }

        // Check if mapping already exists
        frappe.call({
          method: "frappe.client.get_list",
          args: {
            doctype: "Customer Item Code Mapping",
            filters: [
              ["customer", "=", customer_value],
              ["customer_item_code", "=", customer_item_code],
            ],
            fields: ["name", "active"],
          },
          callback: (r) => {
            if (r.message && r.message.length > 0) {
              const existingMapping = r.message[0];
              // Update existing mapping with the active checkbox value
              frappe.call({
                method: "frappe.client.set_value",
                args: {
                  doctype: "Customer Item Code Mapping",
                  name: existingMapping.name,
                  fieldname: {
                    item_code: item_code,
                    active: active,
                  },
                },
                callback: (update_result) => {
                  if (update_result.message) {
                    frappe.show_alert({
                      message: "Item code mapping updated successfully",
                      indicator: "green",
                    });
                    mapDialog.hide();
                  }
                },
              });
            } else {
              // Create new mapping with the active checkbox value
              frappe.call({
                method: "frappe.client.insert",
                args: {
                  doc: {
                    doctype: "Customer Item Code Mapping",
                    item_code: item_code,
                    customer_item_code: customer_item_code,
                    customer: customer_value,
                    active: active,
                  },
                },
                callback: (insert_result) => {
                  if (insert_result.message) {
                    frappe.show_alert({
                      message: "Item code mapping created successfully",
                      indicator: "green",
                    });
                    mapDialog.hide();
                  }
                },
              });
            }
          },
        });
      },
    });

    // Set default customer value
    mapDialog.set_value("customer", customer);

    mapDialog.show();
  },
};
