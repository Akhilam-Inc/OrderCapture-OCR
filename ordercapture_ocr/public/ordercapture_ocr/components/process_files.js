/* global ordercapture_ocr */
/* global fetch_customer_details: writable, fetch_customer_address: writable, method: writable, initial_table_data: writable */

frappe.provide("ordercapture_ocr.process_dialog");

ordercapture_ocr.process_dialog = {
  show(docId) {
    let currentIndex = 0;
    let documents = [];

    const d = new frappe.ui.Dialog({
      title: `OCR Document Details`,
      size: "extra-large",
      fields: [
        {
          fieldtype: "Column Break",
          fieldname: "col_1",
        },
        {
          fieldtype: "Link",
          fieldname: "customer",
          label: "Customer",
          options: "Customer",
          read_only: 1,
          onchange: () => {
            fetch_customer_details(d);
          },
        },
        {
          fieldtype: "Data",
          fieldname: "customer_name",
          label: "Customer Name",
          read_only: 1,
        },
        {
          fieldtype: "Link",
          fieldname: "customer_address_link",
          label: "Customer Address Link",
          read_only: 0,
          options: "Address",
          get_query: () => {
            return {
              filters: {
                link_doctype: "Customer",
                link_name: d.get_value("customer"),
              },
            };
          },
          onchange: () => {
            fetch_customer_address(d);
          },
        },
        {
          fieldtype: "Link",
          fieldname: "current_id",
          label: "Current ID",
          read_only: 1,
          // default: docId,
          options: "OCR Document Processor",
        },
        {
          fieldtype: "Data",
          fieldname: "file_path",
          label: "File Path",
          read_only: 1,
        },
        {
          fieldtype: "Column Break",
          fieldname: "col_3",
        },
        {
          fieldtype: "Small Text",
          fieldname: "customer_address",
          label: "Customer Address",
          read_only: 1,
        },
        {
          fieldtype: "Select",
          fieldname: "vendor_type",
          label: "Vendor Type",
          options: "FlipKart \n BB",
          hidden: 1,
        },
        {
          fieldtype: "Data",
          fieldname: "po_number",
          label: "PO Number",
          read_only: 1,
        },
        {
          fieldtype: "Data",
          fieldname: "po_date",
          label: "PO Date",
          read_only: 1,
        },
        {
          fieldtype: "Data",
          fieldname: "po_expiry_date",
          label: "PO Expiry Date",
          read_only: 1,
        },

        {
          fieldtype: "Data",
          fieldname: "status",
          label: "Status",
          read_only: 1,
        },
        {
          fieldtype: "Link",
          fieldname: "sales_order_ref",
          label: "Sales Order Ref",
          read_only: 1,
          hidden: 1,
          options: "Sales Order",
        },
        {
          fieldtype: "Column Break",
          fieldname: "col_2",
        },
        {
          fieldtype: "HTML",
          fieldname: "action_buttons",
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
              <button class="btn btn-primary w-50 mb-2 mr-2 update-rate-btn" style="display: none;" onclick="cur_dialog.events.update_rate()">
                Update Rate
              </button>
            </div>
            <div class="action-buttons d-flex flex-column gap-2 mb-3 align-items-end">
                <button class="btn btn-primary w-50 mb-2 mr-2" onclick="cur_dialog.events.create_address()">
                  Create New Address
                </button>
                <button class="btn btn-primary w-50 mb-2 mr-2 process-file-btn" onclick="cur_dialog.events.process_file()">
                  Process File
                </button>
                <button class="btn btn-primary w-50 mb-2 mr-2 format-item-code-btn" onclick="cur_dialog.events.show_format_dialog()">
                  Format Item Code
                </button>
                <button class="btn btn-primary w-50 mb-2 mr-2 map-item-code-btn" onclick="cur_dialog.events.show_map_item_dialog()">
                  Map Item Code
                </button>
            </div>
          `,
        },
        {
          fieldtype: "Section Break",
          fieldname: "sec_1",
        },
        {
          fieldname: "items",
          fieldtype: "Table",
          label: "Items",
          // columns: 7,
          cannot_add_rows: true,
          fields: [
            {
              fieldname: "itemCode",
              fieldtype: "Data",
              label: "Item Code",
              in_list_view: 1,
              columns: 1,
            },
            {
              fieldname: "itemName",
              fieldtype: "Data",
              label: "Item Name",
              in_list_view: 1,
              columns: 3,
            },
            {
              fieldname: "qty",
              fieldtype: "Float",
              label: "Qty",
              in_list_view: 1,
              columns: 1,
            },
            {
              fieldname: "plRate",
              fieldtype: "Currency",
              label: "MRP",
              in_list_view: 1,
              columns: 1,
            },

            {
              fieldtype: "Column Break",
              fieldname: "col_5",
            },
            {
              fieldname: "gst",
              fieldtype: "Data",
              label: "GST",
              in_list_view: 1,
              columns: 1,
            },
            {
              fieldname: "totalAmount",
              fieldtype: "Currency",
              label: "Total Amount",
              in_list_view: 1,
              columns: 2,
            },
            {
              fieldname: "landing_rate",
              fieldtype: "Currency",
              label: "Landing Rate",
              in_list_view: 0,
              columns: 2,
            },
            {
              fieldname: "rate",
              fieldtype: "Currency",
              label: "Rate",
              in_list_view: 1,
              columns: 1,
            },
          ],
        },
        {
          fieldtype: "HTML",
          fieldname: "item_details",
          options: '<div id="ocr-items-table"></div>',
        },
        {
          fieldtype: "Section Break",
          fieldname: "sec_2",
        },

        {
          fieldtype: "Data",
          fieldname: "total_item_qty",
          label: "Total Item Qty",
          read_only: 1,
        },
        {
          fieldtype: "Column Break",
          fieldname: "col_4",
        },
        {
          fieldtype: "Data",
          fieldname: "item_grand_total",
          label: "Item Grand Total",
          read_only: 1,
        },
        {
          fieldtype: "Column Break",
          fieldname: "col_4",
        },
        {
          fieldtype: "Data",
          fieldname: "total_taxes",
          label: "Total Taxes",
          read_only: 1,
        },
        {
          fieldtype: "Column Break",
          fieldname: "col_4",
        },
        {
          fieldtype: "Data",
          fieldname: "total_net_amount",
          label: "Total Net Amount",
          read_only: 1,
        },
        {
          fieldtype: "Column Break",
          fieldname: "col_4",
        },
        {
          fieldtype: "HTML",
          fieldname: "post_sales_order",
          options: `
              <div class="action-buttons d-flex flex-row gap-2 mb-3 justify-content-end ">
                <button class="btn btn-primary py-2 mt-4 w-100 mr-2 post-sales-order-btn" onclick="cur_dialog.events.post_sales_order()">
                  Post Sales Order
                </button>
              </div>
            `,
        },
      ],
    });

    // Add navigation events
    d.events = {
      next: function () {
        if (currentIndex < documents.length - 1) {
          currentIndex++;
          // Clear table first
          d.fields_dict.items.df.data = [];
          d.fields_dict.items.grid.data = [];
          d.fields_dict.items.grid.refresh();
          d.set_value("po_number", "");
          d.set_value("po_date", "");
          d.set_value("po_expiry_date", "");

          refreshTotalFields(d);
          loadDocument(documents[currentIndex].name);
        }
      },
      prev: function () {
        if (currentIndex > 0) {
          currentIndex--;
          // Clear table first
          d.fields_dict.items.df.data = [];
          d.fields_dict.items.grid.data = [];
          d.fields_dict.items.grid.refresh();
          d.set_value("po_number", "");
          d.set_value("po_date", "");
          d.set_value("po_expiry_date", "");
          refreshTotalFields(d);
          loadDocument(documents[currentIndex].name);
        }
      },
    };
    d.$wrapper.on("hidden.bs.modal", function () {
      window.ocr_dashboard.fetchRecentOrders();
    });

    const loadDocument = (docId) => {
      frappe.db.get_doc("OCR Document Processor", docId).then((doc) => {
        d.set_value("customer", doc.customer);
        d.set_value("current_id", doc.name);
        d.set_value("status", doc.status);
        d.set_value("customer_address_link", doc.customer_address);
        d.set_value("customer_address", doc.customer_address_display);

        d.set_value("file_path", `File ${currentIndex + 1}: ${doc.file_path}`);

        if (doc.sales_order) {
          // console.log('Sales Order Ref: ' + doc.sales_order);
          d.set_value("sales_order_ref", doc.sales_order);
          d.set_df_property("sales_order_ref", "hidden", 0);
          d.set_df_property("post_sales_order", "hidden", 1);
          d.$wrapper.find(".post-sales-order-btn").hide();
          refreshPageInBackground();
        }
        const fileExtension = doc.file_path.split(".").pop().toLowerCase();
        if (fileExtension !== "pdf") {
          d.set_df_property("vendor_type", "hidden", 0);
          // First set options
          d.fields_dict.vendor_type.df.options = "FlipKart\nBB";
          // Then set the value
          d.fields_dict.vendor_type.set_input(doc.vendor_type);
          if (doc.vendor_type === "FlipKart" && doc.po_number) {
            d.$wrapper.find(".update-rate-btn").show();
          } else {
            d.$wrapper.find(".update-rate-btn").hide();
          }
        } else {
          d.set_df_property("vendor_type", "hidden", 1);
          d.$wrapper.find(".update-rate-btn").hide();
        }
        d.fields_dict.vendor_type.$input &&
          d.fields_dict.vendor_type.$input.on("change", function () {
            const vtype = d.get_value("vendor_type");
            if (vtype === "FlipKart" && d.get_value("po_number")) {
              d.$wrapper.find(".update-rate-btn").show();
            } else {
              d.$wrapper.find(".update-rate-btn").hide();
            }
          });

        // Update process file button text
        const processBtn = d.$wrapper.find(".process-file-btn");
        if (doc.status === "Failed") {
          processBtn.text("Retry");
          d.$wrapper.find(".save-changes-btn").css("display", "none");
          d.$wrapper.find(".post-sales-order-btn").css("display", "none");
        } else {
          processBtn.text("Process File");
        }

        if (doc.processed_json) {
          setTableFromProcessedJson(d, doc.processed_json);
          d.$wrapper.find(".fetch_price_list_rate").show();
        } else {
          d.$wrapper.find(".post-sales-order-btn").hide();
          d.$wrapper.find(".save-changes-btn").hide();
          d.$wrapper.find(".fetch_price_list_rate").hide();
        }

        fetch_customer_details(d);
      });
    };

    d.events.update_rate = function () {
      const items = d.fields_dict.items.grid.data;
      if (items.length === 0) {
        frappe.show_alert({
          message: "No items, process files first...",
          indicator: "red",
        });
        return;
      }

      // Set rate = plRate for each item
      items.forEach((item) => {
        if (item.plRate !== undefined && item.plRate !== null) {
          item.rate = item.plRate;
          frappe.show_alert({
            message: "Rate set, please save changes...",
            indicator: "blue",
          });
        } else {
          frappe.show_alert({
            message: "Please fetch price list rate first...",
            indicator: "blue",
          });
        }
      });

      d.fields_dict.items.grid.refresh();
      refreshTotalFields(d);
    };

    // Add this event handler to the dialog events
    d.events.create_address = function () {
      const customer = d.get_value("customer");

      if (customer) {
        const baseUrl = `/app/customer/${customer}`;
        // frappe.set_route('Form', 'Customer', customer, '#contact_and_address_tab', '_blank');
        window.open(`${baseUrl}#contact_and_address_tab`, "_blank");
      } else {
        frappe.show_alert({
          message: "Please select a customer first",
          indicator: "red",
        });
      }
    };

    fetch_customer_details = function (dialog) {
      const customer = dialog.get_value("customer");

      if (customer) {
        frappe.db
          .get_value("Customer", customer, [
            "customer_name",
            "customer_primary_address",
            "primary_address",
          ])
          .then((r) => {
            if (r.message) {
              // dialog.fields_dict.customer_address_link.set_value(r.message.customer_primary_address);
              dialog.fields_dict.customer_name.set_value(
                r.message.customer_name
              );
              // dialog.fields_dict.customer_address.set_value(r.message.primary_address);
            }
          });
      }
    };

    fetch_customer_address = function (d) {
      const address_link = d.get_value("customer_address_link");
      if (address_link) {
        frappe.db
          .get_value("Address", address_link, [
            "address_line1",
            "address_line2",
            "city",
            "state",
            "country",
          ])
          .then((r) => {
            if (r.message) {
              const addr = r.message;
              const formatted_address = [
                addr.address_line1,
                addr.address_line2,
                addr.city,
                addr.state,
                addr.country,
              ]
                .filter(Boolean)
                .join("\n");

              d.set_value("customer_address", formatted_address);
            }
          });
      }
    };

    if (typeof docId == "string") {
      loadDocument(docId);

      // Then fetch all documents for navigation
      frappe.call({
        method: "frappe.client.get_list",
        args: {
          doctype: "OCR Document Processor",
          filters: { date: new Date().toISOString().split("T")[0] },
          fields: ["name"],
          order_by: "creation desc",
        },
        callback: (r) => {
          if (r.message && r.message.length) {
            documents = r.message;
            // Set currentIndex to the position of current docId
            currentIndex = documents.findIndex((doc) => doc.name === docId);
          }
        },
      });
    } else {
      // Initial fetch of documents
      frappe.call({
        method: "frappe.client.get_list",
        args: {
          doctype: "OCR Document Processor",
          filters: { date: new Date().toISOString().split("T")[0] },
          fields: ["name"],
          order_by: "creation desc",
        },
        callback: (r) => {
          if (r.message && r.message.length) {
            documents = r.message;
            loadDocument(documents[0].name);
          }
        },
      });
    }

    d.$wrapper.find(".modal-header").css("position", "relative");
    d.$wrapper.find(".modal-header").css("padding-bottom", "30px");
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
    d.$wrapper.find(".modal-header").append(navigationHtml);

    // Prcess File
    d.events.process_file = async function () {
      const file_path_display = d.get_value("file_path");
      const actual_file_path = file_path_display.split(": ")[1];

      // Add blur to entire dialog
      d.$wrapper.css("filter", "blur(2px)");

      // Show round loading spinner
      let loader = `
        <div class="ocr-loader" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9999;">
          <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
            <span class="sr-only">Processing...</span>
          </div>
          <div class="mt-2 text-primary">Processing Document...</div>
        </div>
      `;
      $("body").append(loader);

      const ocr_model = await frappe.db.get_single_value(
        "Order Capture OCR Configuration",
        "ocr_model"
      );

      // Check file extension
      const fileExtension = actual_file_path.split(".").pop().toLowerCase();
      if (fileExtension === "pdf") {
        method =
          ocr_model === "Gemini"
            ? "ordercapture_ocr.gemini_ocr.api.extract_structured_data"
            : "ordercapture_ocr.api.get_ocr_details";
      } else {
        method = "ordercapture_ocr.api.extract_purchase_order_data";
      }
      let args = {
        file_path: actual_file_path,
        customer: d.get_value("customer"),
      };

      // Add vendor_type for non-PDF files
      if (fileExtension !== "pdf") {
        args.vendor_type = d.get_value("vendor_type");
        const vendor_type = d.get_value("vendor_type");
        if (vendor_type) {
          // Save vendor type first
          frappe.call({
            method: "ordercapture_ocr.api.set_value",
            args: {
              doctype: "OCR Document Processor",
              name: d.get_value("current_id"),
              fieldname: {
                vendor_type: vendor_type,
              },
            },
          });
        }
      }

      frappe.call({
        method: method,
        args: args,
        callback: async (r) => {
          // After receiving r.message in process_file callback
          // Remove blur and loader
          d.$wrapper.css("filter", "");
          $(".ocr-loader").remove();
          if (r.message && r.message.orderDetails) {
            // console.log(r.message)
            frappe.call({
              method: "ordercapture_ocr.api.set_value",
              args: {
                doctype: "OCR Document Processor",
                name: d.get_value("current_id"),
                fieldname: {
                  processed_json: JSON.stringify(r.message),
                  customer_address: d.get_value("customer_address_link"),
                  vendor_type: d.get_value("vendor_type"),
                },
              },
              callback: () => {
                setTableFromProcessedJson(d, JSON.stringify(r.message));
              },
            });
          } else {
            // Remove loader on error
            d.$wrapper.css("filter", "");
            $(".ocr-loader").remove();
            frappe.show_alert({
              message: "Invalid data format recieved, cannot be processed",
              title: "Error",
              indicator: "red",
            });
          }

          if (r.message.Customer.customerAddress) {
            const customerName = r.message.Customer.customerName;
            const customerAddress = r.message.Customer.customerAddress;

            // Compare customer names case-insensitively once
            const currentCustomer = d.get_value("customer");

            // Single call to fetch customer details
            frappe.call({
              method: "frappe.desk.form.load.getdoc",
              args: {
                doctype: "Customer",
                name: currentCustomer,
              },
              callback: (response) => {
                const addresses = response.docs[0].__onload.addr_list || [];
                console.log("Fetched Addresses:", addresses);

                if (addresses.length) {
                  // Calculate similarity for all addresses first
                  const addressSimilarities = addresses.map((addr) => {
                    const normalizedUploadAddr = customerAddress
                      .toLowerCase()
                      .replace(/\s+/g, " ")
                      .trim();
                    const normalizedSavedAddr = addr.display
                      .toLowerCase()
                      .replace(/\s+/g, " ")
                      .trim();

                    // Calculate multiple similarity metrics
                    const longerLength = Math.max(
                      normalizedUploadAddr.length,
                      normalizedSavedAddr.length
                    );
                    const editDistance = levenshteinDistance(
                      normalizedUploadAddr,
                      normalizedSavedAddr
                    );
                    const levenshteinSimilarity =
                      ((longerLength - editDistance) / longerLength) * 100;

                    // Calculate word-based similarity
                    const uploadWords = normalizedUploadAddr
                      .split(" ")
                      .filter((word) => word.length > 0);
                    const savedWords = normalizedSavedAddr
                      .split(" ")
                      .filter((word) => word.length > 0);

                    let matchingWords = 0;
                    uploadWords.forEach((uploadWord) => {
                      if (
                        savedWords.some(
                          (savedWord) =>
                            savedWord.includes(uploadWord) ||
                            uploadWord.includes(savedWord) ||
                            levenshteinDistance(uploadWord, savedWord) <=
                              Math.max(1, Math.floor(uploadWord.length * 0.2))
                        )
                      ) {
                        matchingWords++;
                      }
                    });

                    const wordSimilarity =
                      uploadWords.length > 0
                        ? (matchingWords / uploadWords.length) * 100
                        : 0;

                    // Calculate substring similarity
                    let substringMatches = 0;
                    const minLength = Math.min(
                      normalizedUploadAddr.length,
                      normalizedSavedAddr.length
                    );
                    for (let i = 0; i < minLength - 2; i++) {
                      const substring = normalizedUploadAddr.substring(
                        i,
                        i + 3
                      );
                      if (normalizedSavedAddr.includes(substring)) {
                        substringMatches++;
                      }
                    }
                    const substringSimilarity =
                      minLength > 2
                        ? (substringMatches / (minLength - 2)) * 100
                        : 0;

                    // Weighted average of all similarity metrics
                    const finalSimilarity =
                      levenshteinSimilarity * 0.4 +
                      wordSimilarity * 0.4 +
                      substringSimilarity * 0.2;

                    return {
                      address: addr,
                      similarity: finalSimilarity,
                      levenshteinSimilarity: levenshteinSimilarity,
                      wordSimilarity: wordSimilarity,
                      substringSimilarity: substringSimilarity,
                    };
                  });

                  // Sort all addresses by similarity in descending order
                  addressSimilarities.sort(
                    (a, b) => b.similarity - a.similarity
                  );

                  console.log(
                    "All Address Similarities:",
                    addressSimilarities.map((item) => ({
                      name: item.address.name,
                      display: item.address.display.substring(0, 50) + "...",
                      similarity: item.similarity.toFixed(2) + "%",
                      levenshtein: item.levenshteinSimilarity.toFixed(2) + "%",
                      word: item.wordSimilarity.toFixed(2) + "%",
                      substring: item.substringSimilarity.toFixed(2) + "%",
                    }))
                  );

                  // Find the best match with improved thresholds
                  let bestMatch = null;
                  let highestSimilarity = 0;

                  // Define similarity thresholds - more granular
                  const similarityThresholds = [90, 80, 70, 60, 50, 40, 30, 25];

                  for (const threshold of similarityThresholds) {
                    const candidatesAtThreshold = addressSimilarities.filter(
                      (item) => item.similarity >= threshold
                    );

                    if (candidatesAtThreshold.length > 0) {
                      // Always pick the highest similarity match
                      bestMatch = candidatesAtThreshold[0]; // Already sorted by similarity desc
                      highestSimilarity = bestMatch.similarity;

                      console.log(`Found match at ${threshold}% threshold:`, {
                        name: bestMatch.address.name,
                        similarity: highestSimilarity.toFixed(2) + "%",
                        breakdown: {
                          levenshtein:
                            bestMatch.levenshteinSimilarity.toFixed(2) + "%",
                          word: bestMatch.wordSimilarity.toFixed(2) + "%",
                          substring:
                            bestMatch.substringSimilarity.toFixed(2) + "%",
                        },
                      });
                      break;
                    }
                  }

                  // If no match found at any threshold, check if the highest similarity is at least 20%
                  if (
                    !bestMatch &&
                    addressSimilarities.length > 0 &&
                    addressSimilarities[0].similarity >= 20
                  ) {
                    bestMatch = addressSimilarities[0];
                    highestSimilarity = bestMatch.similarity;
                    console.log("Using best available match below threshold:", {
                      name: bestMatch.address.name,
                      similarity: highestSimilarity.toFixed(2) + "%",
                    });
                  }

                  if (bestMatch) {
                    console.log(
                      "Final Best Match:",
                      bestMatch.address.name,
                      "Overall Similarity:",
                      highestSimilarity.toFixed(2) + "%"
                    );

                    // Show user the match details
                    frappe.show_alert(
                      {
                        message: `Address matched: ${
                          bestMatch.address.name
                        } (${highestSimilarity.toFixed(1)}% similarity)`,
                        indicator: "blue",
                      },
                      5
                    );

                    // Set the matched address
                    frappe.call({
                      method: "ordercapture_ocr.api.set_value",
                      args: {
                        doctype: "OCR Document Processor",
                        name: d.get_value("current_id"),
                        fieldname: {
                          customer_address: bestMatch.address.name,
                          customer_address_display: bestMatch.address.display,
                        },
                      },
                      callback: () => {
                        d.set_value(
                          "customer_address_link",
                          bestMatch.address.name
                        );
                      },
                    });
                  } else {
                    console.log("No suitable address match found");
                    frappe.show_alert(
                      {
                        message: __(
                          "Customer address not found. Create new address."
                        ),
                        indicator: "red",
                      },
                      10
                    );
                  }
                }
              },
            });
          }
        },

        error: (r) => {
          // Remove loader on error
          d.$wrapper.css("filter", "");
          $(".ocr-loader").remove();

          frappe.show_alert({
            message: "Error processing document",
            indicator: "red",
          });
        },
      });
    };

    // View File
    d.events.view_file = function () {
      const file_path_display = d.get_value("file_path");
      const actual_file_path = file_path_display.split(": ")[1];
      window.open(`${actual_file_path}`, "_blank");
    };

    // Save Changes
    d.events.save_changes = function () {
      const items = d.fields_dict.items.grid.data;
      if (items.length === 0) {
        frappe.show_alert({
          message: "Please add items to save changes.",
          title: "Error",
          indicator: "red",
        });
        return;
      }
      const processed_data = {
        customerDetails: {
          customer: d.get_value("customer"),
          customerName: d.get_value("customer_name"),
          customerAddressLink: d.get_value("customer_address_link") || "",
          customerAddress: d.get_value("customer_address") || "",
        },
        orderDetails: items.map((item) => ({
          itemCode: item.itemCode,
          itemName: item.itemName,
          qty: item.qty || 0,
          rate: item.rate || 0,
          landing_rate: item.landing_rate || 0,
          gst: item.gst || 0,
          plRate: item.plRate || 0,
          totalAmount: item.totalAmount || 0,
        })),
        orderNumber: d.get_value("po_number") || "",
        orderDate: d.get_value("po_date") || "",
        orderExpiryDate: d.get_value("po_expiry_date") || "",

        totals: {
          totalItemQty: d.get_value("total_item_qty") || 0,
          itemGrandTotal: d.get_value("item_grand_total") || 0,
        },
      };

      frappe.call({
        method: "ordercapture_ocr.api.set_value",
        args: {
          doctype: "OCR Document Processor",
          name: d.get_value("current_id"),
          fieldname: {
            processed_json: JSON.stringify(processed_data),
          },
        },
        callback: (r) => {
          setTableFromProcessedJson(d, JSON.stringify(processed_data));

          d.$wrapper.find(".post-sales-order-btn").prop("disabled", false);
          frappe.show_alert({
            message: "Changes saved successfully",
            indicator: "green",
          });
        },
      });
    };

    const setTableFromProcessedJson = (d, processed_json) => {
      if (!processed_json) {
        // Nothing to set
        return;
      }

      let processed_data;
      try {
        processed_data =
          typeof processed_json === "string"
            ? JSON.parse(processed_json)
            : processed_json;
      } catch (e) {
        console.error("Invalid processed_json passed to setTableFromProcessedJson", e);
        return;
      }
      console.log("processed_data", processed_data);

      const orderDetails = Array.isArray(processed_data.orderDetails)
        ? processed_data.orderDetails.filter((item) => item)
        : [];

      d.fields_dict.items.df.data = [];
      d.fields_dict.items.grid.data = [];
      d.fields_dict.items.grid.make_head();

      if (orderDetails.length > 0) {
        d.$wrapper.find(".post-sales-order-btn").show();
        d.$wrapper.find(".save-changes-btn").show();
        d.$wrapper.find(".fetch_price_list_rate").show();
        d.$wrapper.find(".update-rate-btn").show();
      } else {
        d.$wrapper.find(".post-sales-order-btn").hide();
        d.$wrapper.find(".save-changes-btn").hide();
        d.$wrapper.find(".fetch_price_list_rate").hide();
        d.$wrapper.find(".update-rate-btn").hide();
      }

      d.fields_dict.items.grid.refresh();

      // Add rows from processed_json
      orderDetails.forEach((item) => {
        if (!item || typeof item !== "object") {
          return;
        }

        d.fields_dict.items.grid.add_new_row();
        const currentIndex = d.fields_dict.items.df.data.length - 1;
        let row = d.fields_dict.items.df.data[currentIndex];

        if (!row) {
          return;
        }

        Object.assign(row, item);

        // Add rate comparison and highlighting
        const gridRow = d.fields_dict.items.grid.grid_rows[currentIndex];
        if (gridRow && gridRow.row) {
          if (row.rate !== row.plRate) {
            gridRow.row.addClass("highlight-red");
          } else {
            gridRow.row.addClass("highlight-white");
          }
        }
      });

      // Refresh grid and set totals
      d.fields_dict.items.grid.refresh();
      // Set initial data and bind change handler
      initial_table_data = JSON.stringify(d.fields_dict.items.grid.data);

      d.fields_dict.items.grid.wrapper.off("change").on("change", () => {
        let current_table_data = JSON.stringify(d.fields_dict.items.grid.data);

        if (current_table_data !== initial_table_data) {
          d.$wrapper.find(".post-sales-order-btn").prop("disabled", true);
          d.$wrapper.find(".save-changes-btn").show();
        } else {
          d.$wrapper.find(".post-sales-order-btn").prop("disabled", false);
        }
      });

      // Convert orderDate to YYYY-MM-DD format
      const date = new Date(processed_data.orderDate);
      const formattedDate = date.toISOString().slice(0, 10);

      const Expirydate = new Date(processed_data.orderExpiryDate);
      const formattedExpiryDate = Expirydate.toISOString().slice(0, 10);

      d.set_value("po_date", formattedDate);
      d.set_value("po_number", processed_data.orderNumber);
      // d.set_value('po_date', processed_data.orderDate);
      d.set_value("po_expiry_date", formattedExpiryDate);
      // Calculate totals from table data
      const items = d.fields_dict.items.grid.data;
      const total_item_qty = items.reduce(
        (sum, item) => sum + (item.qty || 0),
        0
      );

      const item_grand_total = Number(
        items
          .reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0)
          .toFixed(2)
      );
      // Sets the calculated values
      d.set_value("total_item_qty", total_item_qty);
      d.set_value("item_grand_total", item_grand_total);

      // Calculate total net amount (sum of rates without taxes)
      const total_net_amount = processed_data.orderDetails
        .reduce((sum, item) => {
          return sum + Number(item.totalAmount);
        }, 0)
        .toFixed(2);

      // console.log();
      // Set the total net amount field
      d.set_value("total_net_amount", total_net_amount);

      // Calculate total taxes
      const total_taxes = processed_data.orderDetails
        .reduce((sum, item) => {
          const gst_value = parseFloat(item.gst) || 0;
          return Number(sum + (item.rate * item.qty * gst_value) / 100);
        }, 0)
        .toFixed(2);

      // Set the total taxes field
      d.set_value("total_taxes", total_taxes);
    };

    d.events.post_sales_order = function () {
      if (d.is_submitting) return;
      d.is_submitting = true;

      d.set_df_property("post_sales_order", "read_only", true);

      const items_data = d.fields_dict.items.grid.data;
      const po_number = d.get_value("po_number");
      const vendorIsFlipkart = d.get_value("vendor_type") === "FlipKart";
      const dateFormat = vendorIsFlipkart ? "YYYY-MM-DD" : undefined;

      const po_date = moment(d.get_value("po_date"), dateFormat).format(
        "YYYY-MM-DD"
      );
      const po_expiry_date = moment(
        d.get_value("po_expiry_date"),
        dateFormat
      ).format("YYYY-MM-DD");
      if (items_data.length === 0) {
        frappe.show_alert({
          message: "Please add items to Post sales order.",
          title: "Error",
          indicator: "red",
        });
        return;
      }
      // Check for existing SO with same PO number
      frappe.db
        .get_list("Sales Order", {
          filters: {
            po_no: po_number,
            docstatus: ["!=", 2], // Not cancelled
          },
        })
        .then((existing_orders) => {
          if (existing_orders.length > 0) {
            frappe.msgprint(
              __("Sales Order already exists with PO Number: {0}", [po_number])
            );
            d.is_submitting = false;
            d.set_df_property("post_sales_order", "read_only", false);
            return;
          }

          const sales_order_values = {
            Customer: {
              customer: d.get_value("customer"),
              customerName: d.get_value("customer_name"),
              customerAddressLink: d.get_value("customer_address_link"),
              customerAddress: d.get_value("customer_address"),
              poNumber: po_number,
              poDate: po_date,
              poExpiryDate: po_expiry_date,
            },
            orderDetails: items_data.map((item) => ({
              itemCode: item.itemCode,
              itemName: item.itemName,
              qty: item.qty,
              rate: item.rate,
              gst: item.gst,
              totalAmount: item.totalAmount,
              plRate: item.plRate || null,
            })),
            totals: {
              totalItemQty: d.get_value("total_item_qty"),
              itemGrandTotal: d.get_value("item_grand_total"),
            },
          };
          frappe.call({
            method:
              "ordercapture_ocr.ordercapture_ocr.sales_order_api.create_sales_order",
            freeze: true,
            args: {
              response: sales_order_values,
              file_path: d.get_value("file_path")
                ? d.get_value("file_path").split(": ")[1]
                : null,
              ocr_doc_name: d.get_value("current_id"),
            },
            callback: (r) => {
              const sales_order_name = r.message;

              if (sales_order_name) {
                //Attach the file to the Sales Order
                const file_path_display = d.get_value("file_path");
                const actual_file_path = file_path_display.split(": ")[1];

                frappe.call({
                  method:
                    "ordercapture_ocr.ordercapture_ocr.sales_order_api.attach_file_to_doc",
                  args: {
                    doctype: "Sales Order",
                    docname: sales_order_name,
                    file_url: actual_file_path,
                  },
                  callback: () => {
                    // Update OCR Document Processor
                    frappe.call({
                      method: "ordercapture_ocr.api.set_value",
                      args: {
                        doctype: "OCR Document Processor",
                        name: d.get_value("current_id"),
                        fieldname: {
                          status: "Completed",
                          sales_order: sales_order_name,
                        },
                      },
                      callback: () => {
                        // Refresh the current document
                        loadDocument(d.get_value("current_id"));

                        // Background refresh
                        refreshPageInBackground();

                        d.set_value("sales_order_ref", sales_order_name);
                        d.set_df_property("sales_order_ref", "hidden", 0);

                        frappe.show_alert({
                          message:
                            "Sales Order created and OCR Document updated",
                          indicator: "green",
                        });
                        d.set_df_property("post_sales_order", {
                          read_only: true,
                          hidden: true,
                        });
                        d.$wrapper.find(".post-sales-order-btn").hide();
                      },
                    });
                  },
                });
              }
            },
            always: () => {
              // Reset submission state whether request succeeds or fails
              d.is_submitting = false;
            },
          });
        })
        .catch(() => {
          // Reset submission state if promise fails
          d.is_submitting = false;
          d.set_df_property("post_sales_order", "read_only", false);
        });
    };

    d.events.fetch_price_list_rate = function () {
      const customer = d.get_value("customer");
      const items = d.fields_dict.items.grid.data;

      if (items.length == 0) {
        frappe.show_alert({
          message: "No items, process files first...",
          indicator: "red",
        });
        return;
      }

      // Step 1: Get customer's price list
      frappe.call({
        method: "erpnext.accounts.party.get_party_details",
        args: {
          party: customer,
          party_type: "Customer",
        },
        callback: (r) => {
          if (r.message) {
            const price_list =
              r.message.selling_price_list || "Standard Selling";
            const price_list_currency = r.message.price_list_currency || "INR";

            // Step 2: Get price list rates for all items
            let hasErrors = false;
            const itemsWithoutMapping = [];
            const itemsWithInactiveMapping = [];

            items.forEach((item, idx) => {
              // First check if there's an active mapping in Customer Item Code Mapping
              frappe.call({
                method: "frappe.client.get_list",
                args: {
                  doctype: "Customer Item Code Mapping",
                  filters: [
                    ["customer", "=", customer],
                    ["customer_item_code", "=", item.itemCode],
                    ["active", "=", 1],
                  ],
                  fields: ["customer_item_code", "item_code"],
                },
                callback: (mapping_result) => {
                  // If active mapping doesn't exist, check if inactive mapping exists
                  if (
                    !mapping_result.message ||
                    mapping_result.message.length === 0 ||
                    !mapping_result.message[0].customer_item_code
                  ) {
                    // Check if inactive mapping exists
                    frappe.call({
                      method: "frappe.client.get_list",
                      args: {
                        doctype: "Customer Item Code Mapping",
                        filters: [
                          ["customer", "=", customer],
                          ["customer_item_code", "=", item.itemCode],
                          ["active", "=", 0],
                        ],
                        fields: ["name"],
                      },
                      callback: (inactive_mapping_result) => {
                        if (
                          inactive_mapping_result.message &&
                          inactive_mapping_result.message.length > 0
                        ) {
                          // Inactive mapping exists
                          hasErrors = true;
                          itemsWithInactiveMapping.push(item.itemCode);
                        } else {
                          // No mapping exists at all
                          hasErrors = true;
                          itemsWithoutMapping.push(item.itemCode);
                        }
                        // Highlight the row with error
                        d.fields_dict.items.grid.grid_rows[idx].row.addClass(
                          "highlight-red"
                        );
                      },
                    });
                    return;
                  }

                  // Active mapping exists, use the customer's item code
                  const item_code_to_use = mapping_result.message[0].item_code;

                  // Check if plRate (MRP) already exists from Excel document
                  if (item.plRate && item.plRate > 0) {
                    // Use MRP from Excel document
                    // Highlight if rates are different from landing rate
                    if (item.rate !== item.plRate) {
                      d.fields_dict.items.grid.grid_rows[idx].row.addClass(
                        "highlight-red"
                      );
                    } else {
                      d.fields_dict.items.grid.grid_rows[idx].row.addClass(
                        "highlight-white"
                      );
                    }
                    frappe.show_alert({
                      message:
                        "Using MRP from document, please save changes...",
                      indicator: "blue",
                    });
                    d.fields_dict.items.grid.refresh();
                  } else {
                    // MRP not found in document, fetch from ERPNext price list
                    frappe.call({
                      method: "erpnext.stock.get_item_details.get_item_details",
                      args: {
                        args: {
                          item_code: item_code_to_use,
                          price_list: price_list,
                          customer: customer,
                          company: frappe.defaults.get_default("company"),
                          doctype: "Sales Order",
                          price_list_currency: price_list_currency,
                          conversion_rate: 1,
                          currency: price_list_currency,
                        },
                      },
                      callback: (result) => {
                        if (result.message) {
                          // Update rate with price list rate
                          item.plRate = result.message.price_list_rate;

                          // Highlight if rates are different from landing rate
                          if (item.rate !== item.plRate) {
                            d.fields_dict.items.grid.grid_rows[
                              idx
                            ].row.addClass("highlight-red");
                          } else {
                            d.fields_dict.items.grid.grid_rows[
                              idx
                            ].row.addClass("highlight-white");
                          }
                          frappe.show_alert({
                            message:
                              "Price List Rate fetched, please save changes...",
                            indicator: "blue",
                          });
                          d.fields_dict.items.grid.refresh();
                        }
                      },
                    });
                  }
                },
                always: () => {
                  // Check if this is the last item and show error if needed
                  if (idx === items.length - 1 && hasErrors) {
                    setTimeout(() => {
                      let errorMessages = [];
                      if (itemsWithInactiveMapping.length > 0) {
                        errorMessages.push(
                          __(
                            "Customer Item Code Mapping is not active for the following items: {0}. Please activate the mappings in <a href='/app/customer-item-code-mapping'>Customer Item Code Mapping</a>",
                            [itemsWithInactiveMapping.join(", ")]
                          )
                        );
                      }
                      if (itemsWithoutMapping.length > 0) {
                        errorMessages.push(
                          __(
                            "Customer Item Code Mapping not found for the following items: {0}. Please map the item codes in <a href='/app/customer-item-code-mapping'>Customer Item Code Mapping</a>",
                            [itemsWithoutMapping.join(", ")]
                          )
                        );
                      }
                      if (errorMessages.length > 0) {
                        frappe.throw(errorMessages.join("<br>"));
                      }
                    }, 1000); // Small delay to ensure all API calls are processed
                  }
                },
              });
            });
          } else {
            frappe.show_alert({
              message: "Customer not found",
              indicator: "red",
            });
          }
        },
      });
    };

    // Format Item Code Dialog
    d.events.show_format_dialog = function () {
      const items = d.fields_dict.items.grid.data;

      if (items.length == 0) {
        frappe.show_alert({
          message: "No items to format. Please process files first.",
          indicator: "red",
        });
        return;
      }

      // Create format dialog
      const formatDialog = new frappe.ui.Dialog({
        title: "Format Item Codes",
        size: "large",
        fields: [
          {
            fieldtype: "Section Break",
            fieldname: "regex_section",
            label: "Find and Replace",
          },
          {
            fieldtype: "Data",
            fieldname: "find_pattern",
            label: "Find",
            description:
              "Enter text or pattern to find in item codes. Use regex for advanced matching.",
            placeholder: "Example: ABC- or (\\d+) for numbers",
          },
          {
            fieldtype: "Data",
            fieldname: "replace_pattern",
            label: "Replace With",
            description:
              "Enter text to replace the found pattern. Use $1, $2, etc. for captured groups.",
            placeholder: "Example: ITEM- or $1-CODE",
          },
          {
            fieldtype: "Section Break",
            fieldname: "preview_section",
            label: "Preview",
          },
          {
            fieldtype: "HTML",
            fieldname: "preview_table",
            options: '<div id="format-preview-table"></div>',
          },
          {
            fieldtype: "Column Break",
            fieldname: "col_break",
          },
          {
            fieldtype: "HTML",
            fieldname: "action_buttons",
            options: `
              <div class="action-buttons d-flex flex-column gap-2 mb-3">
                <button class="btn btn-primary mb-2" onclick="cur_format_dialog.events.preview_format()">
                  Preview Changes
                </button>
                <button class="btn btn-success mb-2" onclick="cur_format_dialog.events.apply_format()">
                  Apply Format
                </button>
                <button class="btn btn-default mb-2" onclick="cur_format_dialog.events.reset_format()">
                  Reset
                </button>
              </div>
            `,
          },
        ],
      });

      // Store reference to main dialog
      formatDialog.mainDialog = d;
      formatDialog.originalItems = JSON.parse(JSON.stringify(items));

      // Add event handlers for format dialog
      formatDialog.events = {
        preview_format: function () {
          const findPattern = formatDialog.get_value("find_pattern");
          const replacePattern = formatDialog.get_value("replace_pattern");

          if (!findPattern) {
            frappe.show_alert({
              message: "Please enter a pattern to find",
              indicator: "red",
            });
            return;
          }

          try {
            const regex = new RegExp(findPattern, "g");
            const previewItems = formatDialog.originalItems.map((item) => {
              const newItemCode = item.itemCode.replace(
                regex,
                replacePattern || ""
              );
              return {
                original: item.itemCode,
                formatted: newItemCode,
                changed: item.itemCode !== newItemCode,
              };
            });

            // Generate preview table
            let previewHtml = `
              <table class="table table-bordered table-sm">
                <thead>
                  <tr>
                    <th>Original Item Code</th>
                    <th>Formatted Item Code</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
            `;

            previewItems.forEach((item) => {
              const statusClass = item.changed ? "text-success" : "text-muted";
              const statusText = item.changed ? "Changed" : "No Change";
              previewHtml += `
                <tr>
                  <td>${item.original}</td>
                  <td>${item.formatted}</td>
                  <td class="${statusClass}">${statusText}</td>
                </tr>
              `;
            });

            previewHtml += "</tbody></table>";

            formatDialog.$wrapper
              .find("#format-preview-table")
              .html(previewHtml);

            // Store preview data for apply function
            formatDialog.previewData = previewItems;
          } catch (error) {
            frappe.show_alert({
              message: "Invalid regex pattern: " + error.message,
              indicator: "red",
            });
          }
        },

        apply_format: function () {
          if (!formatDialog.previewData) {
            frappe.show_alert({
              message: "Please preview changes first",
              indicator: "red",
            });
            return;
          }

          // Apply changes to main dialog items
          const items = formatDialog.mainDialog.fields_dict.items.grid.data;
          let changesApplied = 0;

          items.forEach((item, index) => {
            const previewItem = formatDialog.previewData[index];
            if (previewItem && previewItem.changed) {
              item.itemCode = previewItem.formatted;
              changesApplied++;
            }
          });

          // Refresh the grid
          formatDialog.mainDialog.fields_dict.items.grid.refresh();

          // Show success message
          frappe.show_alert({
            message: `Applied format to ${changesApplied} item codes`,
            indicator: "green",
          });

          // Close format dialog
          formatDialog.hide();
        },

        reset_format: function () {
          formatDialog.set_value("find_pattern", "");
          formatDialog.set_value("replace_pattern", "");
          formatDialog.$wrapper.find("#format-preview-table").html("");
          formatDialog.previewData = null;
        },
      };

      // Set global reference for onclick handlers
      window.cur_format_dialog = formatDialog;

      formatDialog.show();
    };

    // Map Item Code Dialog
    d.events.show_map_item_dialog = function () {
      const customer = d.get_value("customer");
      ordercapture_ocr.map_items.show_map_dialog(customer);
    };

    // Add this near the start of the file
    frappe.dom.set_style(`
      .highlight-red {
        background-color: #ffe6e6 !important;
      }
        .highlight-white {
        background-color: #fff !important;
      }
      .desk-alert {
        z-index: 10000;
      }
    `);

    d.show();
    d.$wrapper.find(".modal-dialog").css("max-width", "80%");
  },
};

// Create a function to refresh all totals
// Create a function to refresh all totals
function refreshTotalFields(d) {
  const items = d.fields_dict.items.grid.data;

  // Calculate total item quantity
  const total_item_qty = items.reduce(
    (sum, item) => sum + (Number(item.qty) || 0),
    0
  );

  // Calculate total net amount (sum of totalAmount from items)
  const total_net_amount = items
    .reduce((sum, item) => {
      return sum + (Number(item.totalAmount) || 0);
    }, 0)
    .toFixed(2);

  // Calculate total taxes
  const total_taxes = items
    .reduce((sum, item) => {
      const gst_value = parseFloat(item.gst) || 0;
      const amount =
        ((Number(item.rate) || 0) * (Number(item.qty) || 0) * gst_value) / 100;
      return sum + amount;
    }, 0)
    .toFixed(2);

  // Calculate grand total
  const item_grand_total = items
    .reduce((sum, item) => {
      const qty = Number(item.qty) || 0;
      const rate = Number(item.rate) || 0;
      const gst = Number(item.gst) || 0;
      const amount = qty * rate + (qty * rate * gst) / 100;
      return sum + amount;
    }, 0)
    .toFixed(2);

  // Set all values
  d.set_value("total_item_qty", total_item_qty);
  d.set_value("total_net_amount", total_net_amount);
  d.set_value("total_taxes", total_taxes);
  d.set_value("item_grand_total", item_grand_total);
}

function refreshPageInBackground() {
  // Create a hidden iframe
  let iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = window.location.href;

  // Remove iframe after load
  iframe.onload = () => {
    document.body.removeChild(iframe);
  };

  // Add to document
  document.body.appendChild(iframe);
}
function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1)
    .fill()
    .map(() => Array(str1.length + 1).fill(0));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,
        matrix[j][i - 1] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  return matrix[str2.length][str1.length];
}
