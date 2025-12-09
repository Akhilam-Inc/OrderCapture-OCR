frappe.provide("ordercapture_ocr.components");
frappe.require(
  "/assets/ordercapture_ocr/ordercapture_ocr/components/process_files.js"
);

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
					<div v-if="frappeVersion >= 15">
						<button class="btn btn-primary" @click="initializeV15Uploader">
							Upload Documents
						</button>
					</div>
					<div v-else>
						<file-uploader @file-uploaded="handleFileUpload" class="btn btn-primary"/>
					</div>
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
						  <th>View File</th>
						  <th>Processed Doc Ref</th>
						  <th>Sales Doc Ref</th>
						  <th>Status</th>
						  <th>Actions</th>
						</tr>
					  </thead>
					  <tbody>
						<tr v-for="(order, index) in recentOrders" :key="order.id">
						  <td>{{ index + 1 }}</td>
						  <td>{{ order.file_path }}</td>
						  <td><button @click="viewOrder(order.id)" class="btn btn-sm btn-secondary">
							  View
							</button>
						  </td>
						  <td>{{ order.id }}</td>
						  <td>
						  	<button
								v-if="order.sales"
								@click="openSalesOrder(order.sales)"
								class="btn btn-link p-0 text-primary link-underline-primary"
							>
								{{ order.sales }}
							</button>
							<span v-else class="text-muted">-</span>
						  </td>
						  <td>
							<span class="indicator-pill" :class="{
								'red': order.status === 'Failed',
								'orange': order.status === 'Pending',
								'green': order.status === 'Completed'
								}">
								{{ order.status }}
							</span>
							</td>
						  <td class="d-flex justify-content-start gap-1">
						  	<button  @click="showProcessDialog(order.id)" class="btn btn-sm">
							  <svg class="icon  icon-md" style="" aria-hidden="true">
								<use class="" href="#icon-edit"></use>
							 </svg>
							</button>
						  	<button  @click="DeleteOrder(order.id)" class="btn btn-sm">
								<svg class="icon  icon-md" style="" aria-hidden="true">
									<use class="" href="#icon-delete-active"></use>
								</svg>
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
        success_rate: 0,
      },
      recentOrders: [],
      uploadStatus: "",
      selectedCustomer: "",
      uploadProgress: 0,
      uploading: false,
    };
  },
  components: {
    "file-uploader": {
      template: `
                <div class="file-uploader-container">
                    <div class="file-uploader">
                        <input
                            type="file"
                            @change="onFileChange"
                            accept=".pdf,.csv,.xlsx,.xls"
                            class="form-control"
                            multiple
                        >
                    </div>
                    <div v-if="$parent.uploading" class="progress mt-2">
                        <div class="progress-bar" :style="{ width: $parent.uploadProgress + '%' }">
                            {{$parent.uploadProgress}}%
                        </div>
                    </div>
                </div>
            `,
      methods: {
        onFileChange(e) {
          const files = e.target.files;
          if (!this.$parent.selectedCustomer) {
            frappe.msgprint("Please select a customer");
            e.target.value = ""; // Clear the file input
            return;
          }
          if (files && files.length) {
            const validTypes = [
              "application/pdf",
              "text/csv",
              "application/vnd.ms-excel",
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ];

            const fileArray = Array.from(files);
            const validFiles = fileArray.filter((file) =>
              validTypes.includes(file.type)
            );

            if (validFiles.length !== fileArray.length) {
              frappe.throw(__("Some files are not in supported format"));
              return;
            }

            this.$emit("file-uploaded", validFiles);
          }
        },
      },
    },
  },
  methods: {
    openSalesOrder(salesId) {
      window.open(`/app/sales-order/${salesId}`, "_blank");
    },
    showProcessDialog(docId) {
      if (!this.selectedCustomer) {
        frappe.msgprint("No Document to process!");
        return;
      }
      this.fetchRecentOrders();
      ordercapture_ocr.process_dialog.show(docId);
    },
    fetchStats() {},
    fetchRecentOrders() {
      frappe.call({
        method: "frappe.client.get_list",
        args: {
          doctype: "OCR Document Processor",
          filters: [["date", "=", new Date().toISOString().split("T")[0]]],
          fields: [
            "name as id",
            "creation as date",
            "file_path",
            "sales_order as sales",
            "request_header as processed",
            "status",
            "customer",
          ],
          order_by: "creation desc",
          limit: 50,
        },
        callback: (r) => {
          this.recentOrders = r.message.map((order) => ({
            ...order,
            actions: order.status === "Failed" ? "Retry" : "Done",
          }));
        },
      });
    },

    async handleFileUpload(files) {
      if (!this.selectedCustomer) {
        frappe.msgprint("Please select a customer");
        return;
      }
      this.uploading = true;
      this.uploadProgress = 0;

      const totalFiles = files.length;
      let completedFiles = 0;

      for (const file of files) {
        await this.handleFile(file);
        completedFiles++;
        this.uploadProgress = Math.round((completedFiles / totalFiles) * 100);
      }

      frappe.show_alert({
        message: `Successfully uploaded ${totalFiles} files`,
        indicator: "green",
      });
      this.uploading = false;
      this.uploadProgress = 0;
      this.fetchRecentOrders();
    },
    handleFile(file) {
      return new Promise((resolve, reject) => {
        const form = new FormData();
        form.append("file", file);
        form.append("filename", file.name);
        // form.append('attached_to_name', frappe.session.user);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/method/ordercapture_ocr.api.process_file", true);
        xhr.setRequestHeader("X-Frappe-CSRF-Token", frappe.csrf_token);

        // Store the reference to selectedCustomer
        const selectedCustomer = this.selectedCustomer;
        const vm = this; // Store Vue instance reference

        xhr.onload = function () {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            if (response.message) {
              frappe.call({
                method: "frappe.client.insert",
                args: {
                  doc: {
                    doctype: "OCR Document Processor",
                    file_path: response.message.file_url,
                    customer: selectedCustomer,
                    date: new Date().toISOString().split("T")[0],
                    status: "Pending",
                  },
                },
                callback: (r) => {
                  resolve();
                  vm.fetchRecentOrders();
                },
                error: (r) => {
                  reject();
                },
              });
            }
          } else {
            frappe.throw("Error uploading file");
          }
        };

        xhr.onerror = function () {
          frappe.throw("Error uploading file");
        };

        xhr.send(form);
      });
    },
    viewOrder(orderId) {
      frappe.db.get_doc("OCR Document Processor", orderId).then((doc) => {
        if (!doc || !doc.file_path) {
          frappe.msgprint({
            title: "No File Found",
            message: "The document has no associated file",
            indicator: "red",
          });
          return;
        }

        const fileUrl = doc.file_path;
        const fileName = fileUrl.split("/").pop();

        const d = new frappe.ui.Dialog({
          title: "Document Preview",
          size: "large",
          fields: [
            {
              fieldtype: "HTML",
              fieldname: "preview",
              options: `
						<div style="height: 600px; overflow: auto;">
						  <iframe src="${fileUrl}" width="100%" height="100%" frameborder="0"></iframe>
						</div>
					  `,
            },
          ],
          primary_action_label: "Close",
          primary_action: () => d.hide(),
        });

        d.show();
      });
    },
    DeleteOrder(orderId) {
      frappe.confirm("Are you sure you want to delete this order?", () => {
        frappe.call({
          method: "frappe.client.delete",
          args: {
            doctype: "OCR Document Processor",
            name: orderId,
          },
          callback: () => {
            frappe.show_alert({
              message: "Order deleted successfully",
              indicator: "green",
            });
            this.fetchRecentOrders();
          },
        });
      });
    },
    setupCustomerField() {
      let field = frappe.ui.form.make_control({
        parent: $(this.$refs.customerField),
        df: {
          label: "Customer",
          fieldtype: "Link",
          options: "Customer",
          change: () => {
            this.selectedCustomer = field.get_value();
            // console.log(this.selectedCustomer)
            // Handle customer selection
          },
        },
        render_input: true,
      });
      frappe.call({
        method: "frappe.client.get_list",
        args: {
          doctype: "OCR Document Processor",
          filters: { date: new Date().toISOString().split("T")[0] },
          fields: ["customer"],
          limit: 1,
          order_by: "creation desc",
        },
        callback: (r) => {
          if (r.message && r.message[0]) {
            field.set_value(r.message[0].customer);
            this.selectedCustomer = r.message[0].customer;
          }
        },
      });
    },
    clearAllFiles() {
      frappe.confirm("Are you sure you want to delete all files?", () => {
        const promises = this.recentOrders.map((order) => {
          return frappe.call({
            method: "frappe.client.delete",
            args: {
              doctype: "OCR Document Processor",
              name: order.id,
            },
          });
        });

        Promise.all(promises).then(() => {
          frappe.show_alert({
            message: "All files deleted successfully",
            indicator: "green",
          });
          this.fetchRecentOrders();
          // Reset the file input
          const fileInput = this.$el.querySelector('input[type="file"]');
          if (fileInput) {
            console.log(fileInput);
            fileInput.value = "";
          }
        });
      });
    },
    initializeV15Uploader() {
      const uploader = new frappe.ui.FileUploader({
        doctype: "OCR Document Processor",
        folder: "Home/OCR",
        restrictions: {
          allowed_file_types: [".pdf", ".csv", ".xls", ".xlsx"],
        },
        on_success: (file) => {
          frappe.call({
            method: "frappe.client.insert",
            args: {
              doc: {
                doctype: "OCR Document Processor",
                file_path: file.file_url,
                customer: this.selectedCustomer,
                date: frappe.datetime.now_date(),
                status: "Pending",
              },
            },
            callback: (r) => {
              //   this.uploadStatus = file.file_url+" File uploaded successfully";
              this.uploadStatus =
                "File uploaded and document created successfully";
              this.fetchStats();
              this.fetchRecentOrders();
            },
          });
        },
      });
    },
  },
  created() {
    this.frappeVersion = window.frappe
      ? parseFloat(window.frappe.boot?.versions?.frappe || 0)
      : 0;
  },

  mounted() {
    this.setupCustomerField();
    // this.fetchStats();
    this.fetchRecentOrders();

    // Make fetchRecentOrders accessible globally
    if (!window.ocr_dashboard) {
      window.ocr_dashboard = {};
    }
    window.ocr_dashboard.fetchRecentOrders = this.fetchRecentOrders;

    // if (frappe.boot.versions.frappe >= '15.0.0') {
    //     this.initializeV15Uploader();
    // }
  },
};

Vue.component("ocr-dashboard", ordercapture_ocr.components.Dashboard);
