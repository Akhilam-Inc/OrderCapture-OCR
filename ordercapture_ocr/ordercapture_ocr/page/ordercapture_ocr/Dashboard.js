window.initDashboard = function(page) {
  let app_container = $('<div id="ocr-dashboard">').appendTo(page.main);

  // Initialize Vue app
	new Vue({
	  el: '#ocr-dashboard',
	  template: `
		<div class="ocr-dashboard">
		  <div class="row">
			<!-- Stats Cards -->
			<div class="col-md-4">
			  <div class="widget">
				<div class="widget-head">
				  <div class="widget-title">Total Orders</div>
				</div>
				<div class="widget-body">
				  <h3>{{ stats.total_orders }}</h3>
				</div>
			  </div>
			</div>
			
			<div class="col-md-4">
			  <div class="widget">
				<div class="widget-head">
				  <div class="widget-title">Processed Today</div>
				</div>
				<div class="widget-body">
				  <h3>{{ stats.processed_today }}</h3>
				</div>
			  </div>
			</div>
  
			<div class="col-md-4">
			  <div class="widget">
				<div class="widget-head">
				  <div class="widget-title">Success Rate</div>
				</div>
				<div class="widget-body">
				  <h3>{{ stats.success_rate }}%</h3>
				</div>
			  </div>
			</div>
		  </div>
  
		  <!-- Upload Section -->
		  <div class="row mt-4">
			<div class="col-md-12">
			  <div class="widget">
				<div class="widget-head">
				  <div class="widget-title">Upload Documents</div>
				</div>
				<div class="widget-body">
				  <button @click="uploadFile" class="btn btn-primary">
					Upload File
				  </button>
				  <div v-if="uploadStatus" class="mt-2">
					{{ uploadStatus }}
				  </div>
				</div>
			  </div>
			</div>
		  </div>
  
		  <!-- Recent Orders Table -->
		  <div class="row mt-4">
			<div class="col-md-12">
			  <div class="widget">
				<div class="widget-head">
				  <div class="widget-title">Recent Orders</div>
				</div>
				<div class="widget-body">
				  <table class="table">
					<thead>
					  <tr>
						<th>Order ID</th>
						<th>Date</th>
						<th>Status</th>
						<th>Actions</th>
					  </tr>
					</thead>
					<tbody>
					  <tr v-for="order in recentOrders" :key="order.id">
						<td>{{ order.id }}</td>
						<td>{{ order.date }}</td>
						<td>{{ order.status }}</td>
						<td>
						  <button @click="viewOrder(order.id)" class="btn btn-sm btn-secondary">
							View
						  </button>
						</td>
					  </tr>
					</tbody>
				  </table>
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
		  uploadStatus: ''
		}
	  },
	  methods: {
		fetchStats() {
		//   frappe.call({
		// 	method: 'ordercapture_ocr.api.get_ocr_stats',
		// 	callback: (r) => {
		// 	  this.stats = r.message;
		// 	}
		//   });
		},
		fetchRecentOrders() {
		//   frappe.call({
		// 	method: 'ordercapture_ocr.api.get_recent_orders',
		// 	callback: (r) => {
		// 	  this.recentOrders = r.message;
		// 	}
		//   });
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
		}
	  },
	  mounted() {
		this.fetchStats();
		this.fetchRecentOrders();
	  }
	});
}
