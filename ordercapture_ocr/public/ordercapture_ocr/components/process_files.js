frappe.provide('ordercapture_ocr.process_dialog');

ordercapture_ocr.process_dialog = {
  show() {
    let currentIndex = 0;
    let documents = [];

    const d = new frappe.ui.Dialog({
      title: `OCR Document Details`,
      size: 'extra-large',
      fields: [
        {
          fieldtype: 'Column Break',
          fieldname: 'col_1'
        },
        {
          fieldtype: 'Link',
          fieldname: 'customer',
          label: 'Customer',
          options: 'Customer',
          read_only: 1,
          onchange: () => {
            fetch_customer_details(d);
          }
        },
        {
          fieldtype: 'Data',
          fieldname: 'customer_name',
          label: 'Customer Name',
          read_only: 1,
          
        },
        {
          fieldtype: 'Link',
          fieldname: 'customer_address_link',
          label: 'Customer Address Link',
          read_only: 0,
          options: 'Address',
          onchange: () => {
            fetch_customer_address(d)
          }
        },
        {
          fieldtype: 'Link',
          fieldname: 'current_id',
          label: 'Current ID',
          read_only: 1,
          options: 'OCR Document Processor',
        },
        {
            fieldtype: 'Column Break',
            fieldname: 'col_3'
          },
        
        
        {
          fieldtype: 'Small Text',
          fieldname: 'customer_address',
          label: 'Customer Address',
          read_only: 1
        },
        {
          fieldtype: 'Data',
          fieldname: 'file_path',
          label: 'File Path',
          read_only: 1
        },
        {
          fieldtype: 'Data',
          fieldname: 'status',
          label: 'Status',
          read_only: 1
        },
        {
          fieldtype: 'Column Break',
          fieldname: 'col_2'
        },
        {
          fieldtype: 'HTML',
          fieldname: 'action_buttons',
          options: `
            <div class="action-buttons d-flex flex-column gap-2 mb-3 align-items-end">
              <button class="btn btn-primary mb-2 w-50 mr-2 save-changes-btn" onclick="cur_dialog.events.save_changes()" style="display: none !important;">
                Save Changes
              </button>
              <button class="btn btn-primary w-50 mb-2 mr-2" onclick="cur_dialog.events.view_file()">
                View File
              </button>
              </div>
              <div class="action-buttons d-flex flex-column gap-2 mb-3 align-items-end">
                <button class="btn btn-primary w-50 mb-2 mr-2" onclick="cur_dialog.events.create_address()">
                  Create New Address
                </button>
                <button class="btn btn-primary w-50 mb-2 mr-2" onclick="cur_dialog.events.process_file()">
                  Process File
                </button>
              </div>
          `
        },
        {
            fieldtype: 'Section Break',
            fieldname: 'sec_1'
        },
        {
          fieldname: 'items',
          fieldtype: 'Table',
          label: 'Items',
          // columns: 7,
          cannot_add_rows: true,
          fields: [
            {
              fieldname: 'itemCode',
              fieldtype: 'Link',
              label: 'Item Code',
              options: 'Item',
              in_list_view: 1,
              columns: 2
            },
            {
              fieldname: 'itemName',
              fieldtype: 'Data',
              label: 'Item Name',
              in_list_view: 1,
              columns: 2
            },
            {
              fieldname: 'qty',
              fieldtype: 'Float',
              label: 'Qty',
              in_list_view: 1,
              columns: 1
            },
            {
              fieldname: 'rate',
              fieldtype: 'Currency',
              label: 'Rate',
              in_list_view: 1,
              columns: 1
            },
            {
              fieldtype: 'Column Break',
              fieldname: 'col_5'
          },
            {
              fieldname: 'gst',
              fieldtype: 'Data',
              label: 'GST',
              in_list_view: 1,
              columns: 1
            },
            {
              fieldname: 'totalAmount',
              fieldtype: 'Currency',
              label: 'Total Amount',
              in_list_view: 1,
              columns: 2
            },
            {
              fieldname: 'poRate',
              fieldtype: 'Currency',
              label: 'PO Rate',
              in_list_view: 1,
              columns: 1
            }
          ]
        },
        {
            fieldtype: 'HTML',
            fieldname: 'item_details',
            options: '<div id="ocr-items-table"></div>'
          },
          {
            fieldtype: 'Section Break',
            fieldname: 'sec_2'
        },

        {
            fieldtype: 'Data',
            fieldname: 'total_item_qty',
            label: 'Total Item Qty',
            read_only: 1
        },
        {
            fieldtype: 'Column Break',
            fieldname: 'col_4'
        },
        {
            fieldtype: 'Data',
            fieldname: 'item_grand_total',
            label: 'Item Grand Total',
            read_only: 1
        },
        {
            fieldtype: 'Column Break',
            fieldname: 'col_4'
        },
        {
            fieldtype: 'HTML',
            fieldname: 'post_sales_order',
            options: `
              <div class="action-buttons d-flex flex-row gap-2 mb-3 justify-content-end post-sales-order-btn" style="display: none !important;">
                <button class="btn btn-primary py-2 mt-4 w-50 mr-2" onclick="cur_dialog.events.post_sales_order()">
                  Post Sales Order
                </button>
              </div>
            `

          },
      ]
    });

    // Add navigation events
    d.events = {
      next: function() {
        if (currentIndex < documents.length - 1) {
          currentIndex++;
         // Clear table first
          d.fields_dict.items.df.data = [];
          d.fields_dict.items.grid.data = [];
          d.fields_dict.items.grid.refresh();

          loadDocument(documents[currentIndex].name);

        }
      },
      prev: function() {
        if (currentIndex > 0) {
          currentIndex--;
         // Clear table first
          d.fields_dict.items.df.data = [];
          d.fields_dict.items.grid.data = [];
          d.fields_dict.items.grid.refresh();

          loadDocument(documents[currentIndex].name);

        }
      }
    };

    const loadDocument = (docId) => {
      frappe.db.get_doc('OCR Document Processor', docId)
        .then(doc => {        
          d.set_value('customer', doc.customer); 
          d.set_value('current_id', doc.name);
          d.set_value('status', doc.status);
          d.set_value('file_path', `File ${currentIndex + 1}: ${doc.file_path}`); 
          if (doc.processed_json) {
            setTableFromProcessedJson(d, doc.processed_json);
          }
          fetch_customer_details(d);
        });
    };

    fetch_customer_details = function(dialog) {
      const customer = dialog.get_value('customer');
      
      if (customer) {
        frappe.db.get_value('Customer', customer, ['customer_name', 'customer_primary_address', 'primary_address'])
        .then(r => {
          if (r.message) {
            dialog.fields_dict.customer_address_link.set_value(r.message.customer_primary_address);
            dialog.fields_dict.customer_name.set_value(r.message.customer_name);
            dialog.fields_dict.customer_address.set_value(r.message.primary_address);
          }
        });
      }
    };

    fetch_customer_address = function(d){
      const address_link = d.get_value('customer_address_link');
      if (address_link) {
        frappe.db.get_value('Address', address_link, ['address_line1', 'address_line2', 'city', 'state', 'country'])
          .then(r => {
            if (r.message) {
              const addr = r.message;
              const formatted_address = [
                addr.address_line1,
                addr.address_line2,
                addr.city,
                addr.state,
                addr.country
              ].filter(Boolean).join('\n');
              
              d.set_value('customer_address', formatted_address);
            }
          });
      }
    }

    // Initial fetch of documents
    frappe.call({
      method: 'frappe.client.get_list',
      args: {
        doctype: 'OCR Document Processor',
        filters: { date: new Date().toISOString().split('T')[0] },
        fields: ['name'],
        order_by: 'creation desc'
      },
      callback: (r) => {
        if (r.message && r.message.length) {
          documents = r.message;
          loadDocument(documents[0].name);
        }
      }
    });

    d.$wrapper.find('.modal-header').css('position', 'relative');
    const navigationHtml = `
      <div class="navigation-buttons" style="position: absolute; right: 10px; top: 40px;">
        <button class="btn btn-default btn-xs" onclick="cur_dialog.events.prev()">
          <span class="fa fa-chevron-left"></span>
        </button>
        <button class="btn btn-default btn-xs" onclick="cur_dialog.events.next()">
          <span class="fa fa-chevron-right"></span>
        </button>
      </div>
    `;
    d.$wrapper.find('.modal-header').append(navigationHtml);

    // Prcess File
    d.events.process_file = function() {
      const file_path_display = d.get_value('file_path');
      const actual_file_path = file_path_display.split(': ')[1];
    
      frappe.call({
        method: 'ordercapture_ocr.api.get_ocr_details',
        args: {
          file_path: actual_file_path
        },
        callback: (r) => {
          if (r.message) {
            // Create items if they don't exist
            const createItemPromises = r.message.orderDetails.map(item => {
              return new Promise((resolve) => {
                frappe.db.exists('Item', item.itemCode)
                  .then(exists => {
                    if (!exists) {
                      frappe.call({
                        method: 'frappe.client.insert',
                        args: {
                          doc: {
                            doctype: 'Item',
                            item_code: item.itemCode,
                            item_name: item.itemName,
                            item_group: 'Products', // Set default item group
                            is_stock_item: 1,
                            stock_uom: 'Nos' // Set default UOM
                          }
                        },
                        callback: () => resolve()
                      });
                    } else {
                      resolve();
                    }
                  });
              });
            });
    
            // After creating items, proceed with saving processed_json
            Promise.all(createItemPromises).then(() => {
              frappe.call({
                method: 'frappe.client.set_value',
                args: {
                  doctype: 'OCR Document Processor',
                  name: d.get_value('current_id'),
                  fieldname: {
                    'processed_json': JSON.stringify(r.message)
                  }
                },
                callback: () => {
                  setTableFromProcessedJson(d, JSON.stringify(r.message));
                }
              });
            });
          }else{
            frappe.show_alert({
              message: 'No data processed found',
              title: 'Error',
              indicator: 'red'
            });
          }
        }
      });
    };
    
    // View File
    d.events.view_file = function() {
      const file_path_display = d.get_value('file_path');
      const actual_file_path = file_path_display.split(': ')[1];
      window.open(`${actual_file_path}`, '_blank');
    };

    // Save Changes
    d.events.save_changes = function() {
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
          fieldname: {
            'processed_json': JSON.stringify(processed_data)
          }
        },
        callback: (r) => {
          setTableFromProcessedJson(d, r.message.processed_json)
      
          frappe.show_alert({
            message: 'Changes saved successfully',
            indicator: 'green'
          });
        }
      });
    };

    const setTableFromProcessedJson = (d, processed_json) => {
      const processed_data = JSON.parse(processed_json);
      
      d.fields_dict.items.df.data = [];
      d.fields_dict.items.grid.data = [];
      d.fields_dict.items.grid.make_head();
      // console.log(processed_data);
      if(processed_data){
        d.$wrapper.find('.post-sales-order-btn').show();
        d.$wrapper.find('.save-changes-btn').show();
      }else{
        d.$wrapper.find('.post-sales-order-btn').hide();
        d.$wrapper.find('.save-changes-btn').hide();
      }

      d.fields_dict.items.grid.refresh();
      // Add rows from processed_json
      processed_data.orderDetails.forEach(item => {
        let row = d.fields_dict.items.df.data;
        d.fields_dict.items.grid.add_new_row();
        row = d.fields_dict.items.df.data[d.fields_dict.items.df.data.length - 1];
        Object.assign(row, item);
      });

      // Refresh grid and set totals
      d.fields_dict.items.grid.refresh();
      d.set_value('total_item_qty', processed_data.totals.totalItemQty);
      d.set_value('item_grand_total', processed_data.totals.itemGrandTotal);

    };

    d.events.post_sales_order = function() {
      const items_data = d.fields_dict.items.grid.data;
      
      frappe.call({
        method: 'frappe.client.insert',
        args: {
          doc: {
            doctype: 'Sales Order',
            customer: d.get_value('customer'),
            customer_name: d.get_value('customer_name'),
            customer_address: d.get_value('customer_address_link'),
            set_warehouse: 'Goods In Transit - AID',
            items: items_data.map(item => ({
              item_code: item.itemCode,
              item_name: item.itemName,
              qty: item.qty,
              rate: item.rate,
              amount: item.totalAmount,
              delivery_date: frappe.datetime.get_today(),
              warehouse: 'Goods In Transit - AID',
            }))
          }
        },
        callback: (r) => {
          if (r.message) {
            frappe.show_alert({
              message: 'Sales Order created successfully',
              indicator: 'green'
            });
            frappe.set_route('Form', 'Sales Order', r.message.name);
          }
        }
      });
    };
    
    d.show();
    d.$wrapper.find('.modal-dialog').css('max-width', '80%');

  }
};
