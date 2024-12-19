frappe.provide('ordercapture_ocr.process_dialog');

ordercapture_ocr.process_dialog = {
  show() {
    let currentIndex = 0;
    let documents = [];
    let self = this;

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
          read_only: 1
        },
        {
          fieldtype: 'Data',
          fieldname: 'customer_address_link',
          label: 'Customer Address Link',
          read_only: 1
        },
        {
          fieldtype: 'Data',
          fieldname: 'current_id',
          label: 'Current ID',
          read_only: 1
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
          fieldtype: 'Column Break',
          fieldname: 'col_2'
        },
        {
          fieldtype: 'HTML',
          fieldname: 'action_buttons',
          options: `
            <div class="action-buttons d-flex flex-column gap-2 mb-3 align-items-end">
              <button class="btn btn-primary mb-2 w-50 mr-2" onclick="cur_dialog.events.save_changes()">
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
              <div class="action-buttons d-flex flex-row gap-2 mb-3 justify-content-end">
                <button class="btn btn-primary py-2 mt-4 w-50 mr-2" onclick="cur_dialog.events.save_changes()">
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
          loadDocument(documents[currentIndex].name);

        }
      },
      prev: function() {
        if (currentIndex > 0) {
          currentIndex--;
          loadDocument(documents[currentIndex].name);

        }
      }
    };
    

    const loadDocument = (docId) => {
      frappe.db.get_doc('OCR Document Processor', docId)
        .then(doc => {        
          d.set_value('customer', doc.customer); 
          d.set_value('current_id', doc.name);
          d.set_value('file_path', `File ${currentIndex + 1}: ${doc.file_path}`); 
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

      frappe.call({
        method: 'ordercapture_ocr.api.get_ocr_details',
        callback: (r) => {
          if (r.message) {
            // Clear existing rows
            d.fields_dict.items.df.data = [];

            //Get values from response
            orderDetails = r.message.orderDetails
            totals = r.message.totals

            // Add new rows
            orderDetails.forEach(item => {
              let row = d.fields_dict.items.df.data;
              d.fields_dict.items.grid.add_new_row();
              row = d.fields_dict.items.df.data[d.fields_dict.items.df.data.length - 1];
              Object.assign(row, item);
            });
            // Refresh the grid
            d.fields_dict.items.grid.refresh();
            d.set_value('total_item_qty', totals.totalItemQty);
            d.set_value('item_grand_total', totals.itemGrandTotal);
          }else{
            frappe.show_alert({
              message: 'No data found',
              title: 'Error',
              indicator: 'red'
            });
          }
        }
      })
      
    };




    this.viewOrder = (orderId) => {
    // Handle view order action
    };
    
    d.show();
    d.$wrapper.find('.modal-dialog').css('max-width', '80%');

  }
};
