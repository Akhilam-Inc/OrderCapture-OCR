frappe.provide('ordercapture_ocr.components');

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
			  <div class="col-md-4">
				<div class="widget">
				  <div class="widget-head">
					<button @click="uploadFile" class="btn btn-primary">
						Upload Document
						</button>
						<div v-if="uploadStatus" class="mt-2">
						{{ uploadStatus }}
						</div>
						
					</div><br>
				  <div class="widget-body">
					<div class="widget-title">Allow file type .pdf, .xls, .csv</div>
				  </div>
				</div>
			  </div>
			</div>
	
			<!-- Upload Section -->
			<div class="row mt-4">
			  <hr class="w-100">
			</div>
	
			<!-- Recent Orders Table -->
			<div class="row mt-4 pb-4 border border-info">
			  <div class="col-md-12">
				<div class="widget">
				  <div class="widget-head">
					<div class="widget-title">Recent Orders</div>
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
						<tr v-for="order in recentOrders" :key="order.id">
						  <td>{{ order.id }}</td>
						  <td>{{ order.file }}</td>
						  <td><button @click="viewOrder(order.id)" class="btn btn-sm btn-secondary">
							  View
							</button>
						  </td>
						  <td>{{ order.processed }}</td>
						  <td>{{ order.sales }}</td>
						  <td>{{ order.status }}</td>
						  <td>
							{{ order.actions }}
						  </td>
						</tr>
					  </tbody>
					</table>
				  </div>
				</div>
			  </div>
			  <div class="row md-4 d-flex">
				<div class="col-md-4 ml-4">
					<button class="btn btn-primary">
						Process Files
					</button>
				</div>

				<div class="col-md-4 ml-4">
					<button class="btn btn-primary">
						Create Orders
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
        fetchStats() {
        },
        fetchRecentOrders() {
          this.recentOrders = [
              { id: 1, date: '2023-08-01',file: "/files/test.jpg", sales:'pending', processed: 'processed', status: 'Pending',	actions:'Retry' },
              { id: 2, date: '2023-08-02', file: "/files/test.jpg",sales:'pending', processed: 'processed', status: 'Pending',	actions:'Retry' },
              { id: 3, date: '2023-08-03',file: "/files/test.jpg",sales:'pending', processed: 'processed', status: 'Completed',	actions:'Done' },
          ];
        },
        uploadFile() {
          new frappe.ui.FileUploader({
            doctype: 'OCR Document',
            docname: 'new-document',
            folder: 'Home/OCR',
            on_success: (file) => {
              this.uploadStatus = 'File uploaded successfully';
              this.fetchStats();
              this.fetchRecentOrders();
            }
          });
        },
        viewOrder(orderId) {
          frappe.set_route('Form', 'OCR Document', orderId);
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
                // Handle customer selection
              }
            },
            render_input: true
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
