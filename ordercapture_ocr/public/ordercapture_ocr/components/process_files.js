frappe.provide('ordercapture_ocr.process_dialog');

ordercapture_ocr.process_dialog = {
  show(docId) {
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
          get_query: () => {
            return {
              filters: {
                link_doctype: 'Customer',
                link_name: d.get_value('customer')
              }
            };
          },
          onchange: () => {
            fetch_customer_address(d)
          }
        },
        {
          fieldtype: 'Link',
          fieldname: 'current_id',
          label: 'Current ID',
          read_only: 1,
          // default: docId,
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
          fieldname: 'po_number',
          label: 'PO Number',
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
          fieldtype: 'Link',
          fieldname: 'sales_order_ref',
          label: 'Sales Order Ref',
          read_only: 1,
          hidden: 1,
          options: 'Sales Order',
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
               <button class="btn btn-primary w-50 mb-2 mr-2 fetch_price_list_rate" onclick="cur_dialog.events.fetch_price_list_rate()">
                Fetch Price List Rate
              </button>
            </div>
            <div class="action-buttons d-flex flex-column gap-2 mb-3 align-items-end">
                <button class="btn btn-primary w-50 mb-2 mr-2" onclick="cur_dialog.events.create_address()">
                  Create New Address
                </button>
                <button class="btn btn-primary w-50 mb-2 mr-2 process-file-btn" onclick="cur_dialog.events.process_file()">
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
              columns: 1
            },
            {
              fieldname: 'itemName',
              fieldtype: 'Data',
              label: 'Item Name',
              in_list_view: 1,
              columns: 1
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
              fieldname: 'landing_rate',
              fieldtype: 'Currency',
              label: 'Landing Rate',
              in_list_view: 1,
              columns: 2
            }
            ,
            {
              fieldname: 'plRate',
              fieldtype: 'Currency',
              label: 'Price List Rate',
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
          fieldtype: 'Data',
          fieldname: 'total_taxes',
          label: 'Total Taxes',
          read_only: 1
        },
        {
            fieldtype: 'Column Break',
            fieldname: 'col_4'
        },
        {
          fieldtype: 'Data',
          fieldname: 'total_net_amount',
          label: 'Total Net Amount',
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
              <div class="action-buttons d-flex flex-row gap-2 mb-3 justify-content-end ">
                <button class="btn btn-primary py-2 mt-4 w-100 mr-2 post-sales-order-btn" onclick="cur_dialog.events.post_sales_order()">
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
      },

    };
    d.$wrapper.on('hidden.bs.modal', function() {
      window.ocr_dashboard.fetchRecentOrders();
    });

    const loadDocument = (docId) => {
      // frappe.views.OCRDashboard.fetchRecentOrders()
      frappe.db.get_doc('OCR Document Processor', docId)
        .then(doc => {        
          d.set_value('customer', doc.customer); 
          d.set_value('current_id', doc.name);
          d.set_value('status', doc.status);
          d.set_value('file_path', `File ${currentIndex + 1}: ${doc.file_path}`); 

          if(doc.sales_order){
            // console.log('Sales Order Ref: ' + doc.sales_order);
            d.set_value('sales_order_ref', doc.sales_order);
            d.set_df_property('sales_order_ref', 'hidden', 0);
            d.set_df_property('post_sales_order', 'hidden', 1);
            d.$wrapper.find('.post-sales-order-btn').hide();
            refreshPageInBackground();
          }

          // Hide Post Sales Order button if sales_order exists
          // if (doc.sales_order) {
          //   refreshPageInBackground();
          //   d.set_df_property('post_sales_order', {
          //     read_only: true,
          //     hidden: true
          //   });
          //   d.$wrapper.find('.post-sales-order-btn').hide();
          // }
          
          // Update process file button text
          const processBtn = d.$wrapper.find('.process-file-btn');
          if (doc.status === 'Failed') {
              processBtn.text('Retry');
              d.$wrapper.find('.save-changes-btn').css('display', 'none');
              d.$wrapper.find('.post-sales-order-btn').css('display','none');
          } else {
            processBtn.text('Process File');
            
          }

          if (doc.processed_json) {
            setTableFromProcessedJson(d, doc.processed_json);
            d.$wrapper.find('.fetch_price_list_rate').show();
          }else{
            d.$wrapper.find('.post-sales-order-btn').hide();
            d.$wrapper.find('.save-changes-btn').hide();
            d.$wrapper.find('.fetch_price_list_rate').hide();
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
    
    if (typeof(docId) == 'string') {
      loadDocument(docId);
    
    }else{
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
    }
    

    d.$wrapper.find('.modal-header').css('position', 'relative');
    d.$wrapper.find('.modal-header').css('padding-bottom', '30px');
    const navigationHtml = `
      <div class="navigation-buttons mr-4 mb-4 pd-4" style="position: absolute; right: 60px; top: 40px; margin-right: 20px">
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
      
      // Add blur to entire dialog
      d.$wrapper.css('filter', 'blur(2px)');
        
      // Show round loading spinner
      let loader = `
        <div class="ocr-loader" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9999;">
          <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
            <span class="sr-only">Processing...</span>
          </div>
          <div class="mt-2 text-primary">Processing Document...</div>
        </div>
      `;
      $('body').append(loader);

      // Check file extension
      const fileExtension = actual_file_path.split('.').pop().toLowerCase();
      const method = fileExtension === 'pdf' ? 
        'ordercapture_ocr.api.get_ocr_details' : 
        'ordercapture_ocr.api.extract_purchase_order_data';
    
      frappe.call({
        method: method,
        args: {
          file_path: actual_file_path
        },
        callback: (r) => {
          console.log(r)
          // Remove blur and loader
          d.$wrapper.css('filter', '');
          $('.ocr-loader').remove();
          if (r.message && r.message.orderDetails) {
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
                            item_code: String(item.itemCode),
                            item_name: String(item.itemName),
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
            // Remove loader on error
            d.$wrapper.css('filter', '');
            $('.ocr-loader').remove();
            frappe.show_alert({
              message: 'Invalid data format recieved, cannot be processed',
              title: 'Error',
              indicator: 'red'
            });
          }
        },
        
        error: (r) => {
          // Remove loader on error
          d.$wrapper.css('filter', '');
          $('.ocr-loader').remove();
          
          frappe.show_alert({
            message: 'Error processing document',
            indicator: 'red'
          });
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
      if (items.length === 0) {
        frappe.show_alert({
          message: 'Please add items to save changes.',
          title: 'Error',
          indicator: 'red'
        });
        return;
      }
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
          landing_rate: item.landing_rate,
          gst: item.gst,
          plRate: item.plRate,
          totalAmount: item.totalAmount
        })),
        orderNumber: d.get_value('po_number'),
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
          
          d.$wrapper.find('.post-sales-order-btn').prop('disabled', false);
          frappe.show_alert({
            message: 'Changes saved successfully',
            indicator: 'green'
          });
        }
      });
    };

    const setTableFromProcessedJson = (d, processed_json) => {
      const processed_data = JSON.parse(processed_json);
      // console.log(processed_data)

      d.fields_dict.items.df.data = [];
      d.fields_dict.items.grid.data = [];
      d.fields_dict.items.grid.make_head();

      if(processed_data.orderDetails.length > 0){
        d.$wrapper.find('.post-sales-order-btn').show();
        d.$wrapper.find('.save-changes-btn').show();
        d.$wrapper.find('.fetch_price_list_rate').show();
      }else{
        d.$wrapper.find('.post-sales-order-btn').hide();
        d.$wrapper.find('.save-changes-btn').hide();
        d.$wrapper.find('.fetch_price_list_rate').hide();
      }

      d.fields_dict.items.grid.refresh();

      console.log(processed_data)
     
      // Add rows from processed_json
      processed_data.orderDetails.forEach(item => {
        let row = d.fields_dict.items.df.data;
        d.fields_dict.items.grid.add_new_row();
        const currentIndex = d.fields_dict.items.df.data.length - 1;
        row = d.fields_dict.items.df.data[d.fields_dict.items.df.data.length - 1];
        Object.assign(row, item);

        // // Add rate comparison and highlighting
        if(row.rate !== row.plRate) {
          d.fields_dict.items.grid.grid_rows[currentIndex].row.addClass('highlight-red');
        }else{
          d.fields_dict.items.grid.grid_rows[currentIndex].row.addClass('highlight-white');
        }
      });

      // Refresh grid and set totals
      d.fields_dict.items.grid.refresh();
      // Set initial data and bind change handler
      initial_table_data = JSON.stringify(d.fields_dict.items.grid.data);

      d.fields_dict.items.grid.wrapper.off('change').on('change', () => {
        let current_table_data = JSON.stringify(d.fields_dict.items.grid.data);

        if (current_table_data !== initial_table_data) {
          d.$wrapper.find('.post-sales-order-btn').prop('disabled', true);
          d.$wrapper.find('.save-changes-btn').show();
        } else {
          d.$wrapper.find('.post-sales-order-btn').prop('disabled', false);
        }
      });
      d.set_value('po_number',  processed_data.orderNumber);

      d.set_value('total_item_qty', processed_data.totals.totalItemQty);
      d.set_value('item_grand_total', processed_data.totals.itemGrandTotal);
      

      // Calculate total net amount (sum of rates without taxes)
      const total_net_amount = processed_data.orderDetails.reduce((sum, item) => {
        return sum + (item.rate * item.qty);
      }, 0);

      // Set the total net amount field
      d.set_value('total_net_amount', total_net_amount);

      // Calculate total taxes
      const total_taxes = processed_data.orderDetails.reduce((sum, item) => {
        const gst_value = parseFloat(item.gst) || 0;
        return sum + ((item.rate * item.qty * gst_value) / 100);
      }, 0);

      // Set the total taxes field
      d.set_value('total_taxes', total_taxes);

    };

    d.events.post_sales_order = function() {
      const items_data = d.fields_dict.items.grid.data;
      const po_number = d.get_value('po_number');

      if (items_data.length === 0) {
        frappe.show_alert({
          message: 'Please add items to Post sales order.',
          title: 'Error',
          indicator: 'red'
        });
        return;
      }
       // Check for existing SO with same PO number
      frappe.db.get_list('Sales Order', {
        filters: {
          po_no: po_number,
          docstatus: ['!=', 2]  // Not cancelled
        }
      }).then(existing_orders => {
        if (existing_orders.length > 0) {
          frappe.msgprint(__('Sales Order already exists with PO Number: {0}', [po_number]));
          return;
        }

        const sales_order_values = {
          Customer: {
            customer: d.get_value('customer'),
            customerName: d.get_value('customer_name'),
            customerAddressLink: d.get_value('customer_address_link'),
            customerAddress: d.get_value('customer_address'),
            poNumber: po_number
          },
          orderDetails: items_data.map(item => ({
            itemCode: item.itemCode,
            itemName: item.itemName,
            qty: item.qty,
            rate: item.rate,
            gst: item.gst,
            totalAmount: item.totalAmount
          })),
          totals: {
            totalItemQty: d.get_value('total_item_qty'),
            itemGrandTotal: d.get_value('item_grand_total')
          }
        };
        frappe.call({
          method: 'ordercapture_ocr.ordercapture_ocr.sales_order_api.create_sales_order',
          args: {
            response: sales_order_values
          },
          callback: (r) => {
            const sales_order_name = r.message;
  
              // Update OCR Document Processor
            frappe.call({
              method: 'frappe.client.set_value',
              args: {
                doctype: 'OCR Document Processor',
                name: d.get_value('current_id'),
                fieldname: {
                  'status': 'Completed',
                  'sales_order': sales_order_name
                }
              },
              callback: () => {
                // Refresh the current document
                loadDocument(d.get_value('current_id'));
  
                // Background refresh
                refreshPageInBackground();
  
                d.set_value('sales_order_ref', sales_order_name);
                d.set_df_property('sales_order_ref', 'hidden', 0)
  
                frappe.show_alert({
                  message: 'Sales Order created and OCR Document updated',
                  indicator: 'green'
                });
                d.set_df_property('post_sales_order', {
                  read_only: true,
                  hidden: true
                });
                d.$wrapper.find('.post-sales-order-btn').hide();
              }
            });
          }
        });
      })
     
    };

    d.events.fetch_price_list_rate = function() {
      const customer = d.get_value('customer');
      const items = d.fields_dict.items.grid.data;
    
      if(items.length == 0) {
        frappe.show_alert({
          message: 'No items, process files first...',
          indicator: 'red'
        });
        return;
      }
    
      // Step 1: Get customer's price list
      frappe.call({
        method: 'erpnext.accounts.party.get_party_details',
        args: {
          party: customer,
          party_type: 'Customer'
        },
        callback: (r) => {
          if(r.message) {
            // console.log(r.message);
            const price_list = r.message.selling_price_list || 'Standard Selling';
            const price_list_currency = r.message.price_list_rate || "INR";
            
            // Step 2: Get price list rates for all items
            items.forEach((item, idx) => {
              frappe.call({
                method: 'erpnext.stock.get_item_details.get_item_details',
                args: {
                  args: {
                    item_code: item.itemCode,
                    price_list: price_list,
                    customer: customer,
                    company: frappe.defaults.get_default('company'),
                    doctype: 'Sales Order',
                    price_list_currency: price_list_currency,
                    conversion_rate: 1,
                    currency: price_list_currency,
                    // plc_conversion_rate: 1
                  }
                },
                callback: (result) => {
                  // console.log(result);
                  if(result.message) {
                    // Update rate with price list rate
                    // item.rate = result.message.price_list_rate;
                    item.plRate = result.message.price_list_rate;
                    
                    // Recalculate total amount
                    // item.totalAmount = item.rate * item.qty;
                    
                    // Highlight if rates are different from landing rate
                    if(item.rate !== item.plRate ) {
                      d.fields_dict.items.grid.grid_rows[idx].row.addClass('highlight-red');
                    }else{
                      d.fields_dict.items.grid.grid_rows[idx].row.addClass('highlight-white');

                    }
                    
                    d.fields_dict.items.grid.refresh();
                  }
                }
              });
            });
          }
        }
      });
    };
    
    // Add this near the start of the file
    frappe.dom.set_style(`
      .highlight-red {
        background-color: #ffe6e6 !important;
      }
        .highlight-white {
        background-color: #fff !important;
      }
    `);

    
    
    d.show();
    d.$wrapper.find('.modal-dialog').css('max-width', '80%');

  }
};


function refreshPageInBackground() {
  // Create a hidden iframe
  let iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = window.location.href;
  
  // Remove iframe after load
  iframe.onload = () => {
    document.body.removeChild(iframe);
  };
  
  // Add to document
  document.body.appendChild(iframe);
}
