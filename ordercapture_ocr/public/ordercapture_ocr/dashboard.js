frappe.provide('ordercapture_ocr.components');
frappe.require('/assets/ordercapture_ocr/ordercapture_ocr/components/process_files.js');

ordercapture_ocr.components.Dashboard = {
    template: `
       <div class="ocr-dashboard">
			<div class="row d-flex justify-content-between">
			  <!-- Stats Cards -->
			  <div class="col-md-4">
				<div class="widget">
				  <div class="form-group">
					<div ref="customerField"></div>
				  </div>

				</div>
			  </div>
			  <div class="col-md-4 d-flex justify-content-end">
				<div class="widget">
				  <div class="widget-head d-flex justify-content-end mb-3">
					<button @click="uploadFile" class="btn btn-primary">
						Upload Document
						</button>
					</div>
				  <div class="widget-body d-flex justify-content-end mb-3 flex-column">
					<div class="widget-title">Allow file type .pdf, .xls, .csv</div>
					<div v-if="uploadStatus" class="mt-2">
						{{ uploadStatus }}
						</div>
				  </div>
				</div>
			  </div>
			</div>
	
			<!-- Upload Section -->
			<div class="row mt-4">
			  <hr class="w-100">
			</div>
	
			<!-- Recent Orders Table -->
			<div class="row mt-4 pb-4 border">
			  <div class="col-md-12">
				<div class="widget">
				  <div class="widget-head">
					<div class="widget-title">Order Details</div>
				  </div>
				  <div class="widget-body">
					<table class="table">
					  <thead>
						<tr>
						  <th>ID</th>
						  <th>Uploaded File</th>
						  <th>View</th>
						  <th>Processed Doc Ref</th>
						  <th>Sales Doc Ref</th>
						  <th>Status</th>
						  <th>Actions</th>
						</tr>
					  </thead>
					  <tbody>
						<tr v-for="(order, index) in recentOrders" :key="order.id">
						  <td>{{ order.id }}</td>
						  <td>{{ order.file_path }}</td>
						  <td><button @click="viewOrder(order.id)" class="btn btn-sm btn-secondary">
							  View
							</button>
						  </td>
						  <td>{{ index + 1 }}</td>
						  <td>{{ order.sales }}</td>
						  <td>{{ order.status }}</td>
						  <td>
						  <button @click="viewOrder(order.id)" class="btn btn-sm btn-primary">
							  {{ order.actions }}
							</button>
							
						  </td>
						</tr>
					  </tbody>
					</table>
				  </div>
				</div>
			  </div>
			  
			  <div class="col-12">
				<div class="col-md-12 d-flex justify-content-end flex-row gap-2">
					<button @click="showProcessDialog" class="btn btn-primary mr-2">
						Process Files
					</button>
					<button class="btn btn-primary mr-2">
						Create Orders
					</button>
					<button v-if="recentOrders.length" @click="clearAllFiles" class="btn btn-danger">
            			Clear All
        			</button>
				</div>
			  </div>
			</div>
			</div>

			
		  </div>
    `,
   
    data() {
        return {
          stats: {
            total_orders: 0,
            processed_today: 0,
            success_rate: 0
          },
          recentOrders: [],
          uploadStatus: '',
          selectedCustomer: '',
        }
      },
      methods: {
		showProcessDialog() {
			ordercapture_ocr.process_dialog.show();
		},
        fetchStats() {
        },
		fetchRecentOrders() {
			frappe.call({
			  method: 'frappe.client.get_list',
			  args: {
				doctype: 'OCR Document Processor',
				filters: { date: new Date().toISOString().split('T')[0], status: 'Pending' },
				fields: ['name as id', 'creation as date', 'file_path', 'sales_order as sales', 'request_header as processed', 'status', 'customer'],
				order_by: 'creation desc',
				limit: 50
			  },
			  callback: (r) => {
				this.recentOrders = r.message.map(order => ({
				  ...order,
				  actions: order.status === 'Completed' ? 'Done' : 'Retry'
				  
				}));
			  }
			});
		},
       
        uploadFile() {
			if(!this.selectedCustomer) {
				frappe.msgprint('Please select a customer');
				return;
			}
          new frappe.ui.FileUploader({
            doctype: 'OCR Document Processor',
            folder: 'Home/OCR',
			restrictions: {
				allowed_file_types: ['.pdf', '.csv', '.xls', '.xlsx']
			},
            on_success: (file) => {
				frappe.call({
					method: 'frappe.client.insert',
					args: {
					  doc: {
						doctype: 'OCR Document Processor',
						file_path: file.file_url,
						customer: this.selectedCustomer,
						status: 'Pending'
					  }
					},
					callback: (r) => {
					//   this.uploadStatus = file.file_url+" File uploaded successfully";
					  this.uploadStatus = 'File uploaded and document created successfully';
					  this.fetchStats();
					  this.fetchRecentOrders();
					}
				  });
				}
            
          });
        },
		viewOrder(orderId) {
			frappe.db.get_doc('OCR Document Processor', orderId)
			  .then(doc => {

				if (!doc || !doc.file_path) {
					frappe.msgprint({
					  title: 'No File Found',
					  message: 'The document has no associated file',
					  indicator: 'red'
					});
					return;
				  }

				const fileUrl = doc.file_path;
				const fileName = fileUrl.split('/').pop();
				
				const d = new frappe.ui.Dialog({
				  title: 'Document Preview',
				  size: 'large',
				  fields: [
					{
					  fieldtype: 'HTML',
					  fieldname: 'preview',
					  options: `
						<div style="height: 600px; overflow: auto;">
						  <iframe src="${fileUrl}" width="100%" height="100%" frameborder="0"></iframe>
						</div>
					  `
					}
				  ],
				  primary_action_label: 'Close',
				  primary_action: () => d.hide()
				});
				
				d.show();
			  });
		  },
        setupCustomerField() {
          let field = frappe.ui.form.make_control({
            parent: $(this.$refs.customerField),
            df: {
              label: 'Customer',
              fieldtype: 'Link',
              options: 'Customer',
              change: () => {
                this.selectedCustomer = field.get_value();
				console.log(this.selectedCustomer)
                // Handle customer selection
              }
            },
            render_input: true
          });
		  frappe.call({
			method: 'frappe.client.get_list',
			args: {
			  doctype: 'OCR Document Processor',
			  filters: { date: new Date().toISOString().split('T')[0], status: 'Pending' },
			  fields: ['customer'],
			  limit: 1,
			  order_by: 'creation desc'
			},
			callback: (r) => {
			  if (r.message && r.message[0]) {
				field.set_value(r.message[0].customer);
				this.selectedCustomer = r.message[0].customer;
			  }
			}
		  });
        },
		clearAllFiles() {
			frappe.confirm('Are you sure you want to delete all files?', () => {
				const promises = this.recentOrders.map(order => {
					return frappe.call({
						method: 'frappe.client.delete',
						args: {
							doctype: 'OCR Document Processor',
							name: order.id
						}
					});
				});
	
				Promise.all(promises).then(() => {
					frappe.show_alert({
						message: 'All files deleted successfully',
						indicator: 'green'
					});
					this.fetchRecentOrders();
				});
			});
		}
      },
      
      mounted() {
        this.setupCustomerField();
        this.fetchStats();
        this.fetchRecentOrders();
      }
};

Vue.component('ocr-dashboard', ordercapture_ocr.components.Dashboard);
