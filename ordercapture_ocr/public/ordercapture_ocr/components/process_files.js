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
          fieldtype: 'Column Break',
          fieldname: 'col_2'
        },
        {
          fieldtype: 'HTML',
          fieldname: 'action_buttons',
          options: `
            <div class="action-buttons d-flex flex-row gap-2 mb-3">
              <button class="btn btn-primary py-2 mb-2 mr-2" onclick="cur_dialog.events.save_changes()">
                Save Changes
              </button>
              <button class="btn btn-primary w-25 mb-2 mr-2" onclick="cur_dialog.events.view_file()">
                View File
              </button>
              </div>
              <button class="btn btn-primary w-50 mb-2" onclick="cur_dialog.events.create_address()">
                Create New Address
              </button>
          `
        },
        {
            fieldtype: 'Section Break',
            fieldname: 'sec_1'
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
              <div class="action-buttons d-flex flex-row gap-2 mb-3">
                <button class="btn btn-primary py-2 mb-2 mr-2" onclick="cur_dialog.events.save_changes()">
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
        //   loadCustomerDetails(documents[currentIndex].customer);

        }
      },
      prev: function() {
        if (currentIndex > 0) {
          currentIndex--;
          loadDocument(documents[currentIndex].name);
        //   loadCustomerDetails(documents[currentIndex].customer);

        }
      }
    };
    

    const loadDocument = (docId) => {
      frappe.db.get_doc('OCR Document Processor', docId)
        .then(doc => {        
          d.set_value('customer', doc.customer);          
          fetch_customer_details(d);
        });
    };

    fetch_customer_details = function(dialog) {
      const customer = dialog.get_value('customer');
      
      if (customer) {
        frappe.db.get_value('Customer', customer, ['customer_name', 'primary_address'])
        .then(r => {
          if (r.message) {
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

    const loadItemsTable = () => {
        // frappe.call({
        //   method: 'frappe.client.get_list',
        //   args: {
        //     doctype: 'OCR Document Processor',
        //     fields: ['name as id', 'file_path', 'sales_order as sales', 
        //             'request_header as processed', 'status'],
        //     order_by: 'creation desc',
        //     limit: 50
        //   },
        //   callback: (r) => {
        //     if (r.message) {
        //       const items = r.message.map(order => ({
        //         ...order,
        //         actions: order.status === 'Completed' ? 'Done' : 'Retry'
        //       }));
  
              const html = `
                  <div class="col-md-12">
                    <div class="widget">
                      <div class="widget-body">
                        <table class="table border">
                          <thead>
                            <tr>
                              <th>Item Code</th>
                              <th>Item Name</th>
                              <th>Qty</th>
                              <th>Rate</th>
                              <th>GST</th>
                              <th>Total Amount</th>
                              <th>PO Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td>System Rate</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  <div class="row md-4 d-flex">
                    <div class="col-md-6 ml-4">
                        <p>Different GST Rate type for different customer, Excluded or Included?
                        In case its different, how we will handle it?</p>
                    </div>
                  </div>
              `;

            //   ${items.map(order => `
            //     <tr>
            //       <td>${order.id}</td>
            //       <td>${order.file_path}</td>
            //       <td>
            //         <button onclick="ordercapture_ocr.process_dialog.viewOrder('${order.id}')" 
            //                 class="btn btn-sm btn-secondary">
            //           View
            //         </button>
            //       </td>
            //       <td>${order.processed || ''}</td>
            //       <td>${order.sales || ''}</td>
            //       <td>${order.status}</td>
            //       <td>
            //         <button onclick="ordercapture_ocr.process_dialog.viewOrder('${order.id}')" 
            //                 class="btn btn-sm btn-primary">
            //           ${order.actions}
            //         </button>
            //       </td>
            //     </tr>
            //   `).join('')}
              
              d.$wrapper.find('#ocr-items-table').html(html);
            // }
        //   }
        // });
    };
  
    this.viewOrder = (orderId) => {
    // Handle view order action
    };
  


    d.show();
    d.$wrapper.find('.modal-dialog').css('max-width', '80%');
    loadItemsTable();

  }
};
