/* global ordercapture_ocr */

frappe.provide("ordercapture_ocr.components.table_handler");

ordercapture_ocr.components.table_handler = {
  _first_non_empty_string(...candidates) {
    for (const v of candidates) {
      if (v === undefined || v === null) continue;
      const s = String(v).trim();
      if (s) return s;
    }
    return "";
  },

  _parse_percent_like_number(val) {
    if (val === undefined || val === null) return 0;
    if (typeof val === "number" && !isNaN(val)) return val;

    let s = String(val).trim();
    if (!s) return 0;

    // Common OCR formats: "18%", "18 %", "GST 18"
    s = s.replace(/,/g, "");
    const m = s.match(/-?\d+(\.\d+)?/);
    if (!m) return 0;
    return flt(m[0]) || 0;
  },

  _normalize_po_fields(processed_data) {
    const customer = processed_data.Customer || processed_data.customer || {};
    const customerDetails = processed_data.customerDetails || {};

    return {
      orderNumber: this._first_non_empty_string(
        processed_data.orderNumber,
        processed_data.order_no,
        processed_data.po_number,
        processed_data.poNumber,
        processed_data.PONumber,
        customer.poNumber,
        customer.po_number,
        customer.PONumber,
        customerDetails.poNumber,
        customerDetails.po_number,
        processed_data.customerDetails && processed_data.customerDetails.poNumber,
        processed_data.customerDetails && processed_data.customerDetails.po_number
      ),
      orderDate: this._first_non_empty_string(
        processed_data.orderDate,
        processed_data.order_date,
        processed_data.po_date,
        processed_data.poDate,
        customer.poDate,
        customer.po_date,
        customer.orderDate,
        customerDetails.poDate,
        customerDetails.po_date,
        customerDetails.orderDate,
        processed_data.customerDetails && processed_data.customerDetails.orderDate,
        processed_data.customerDetails && processed_data.customerDetails.po_date
      ),
      orderExpiryDate: this._first_non_empty_string(
        processed_data.orderExpiryDate,
        processed_data.order_expiry_date,
        processed_data.po_expiry_date,
        processed_data.po_expiry,
        processed_data.poExpiryDate,
        customer.poExpiryDate,
        customer.po_expiry_date,
        customer.orderExpiryDate,
        customerDetails.poExpiryDate,
        customerDetails.po_expiry_date,
        customerDetails.orderExpiryDate,
        processed_data.customerDetails && processed_data.customerDetails.orderExpiryDate,
        processed_data.customerDetails && processed_data.customerDetails.po_expiry_date
      ),
      customerName: this._first_non_empty_string(
        customer.customerName,
        customer.customer_name,
        processed_data.customerName
      ),
      customerAddress: this._first_non_empty_string(
        customer.customerAddress,
        customer.customer_address,
        processed_data.customerAddress
      ),
    };
  },

  _format_date_to_yyyy_mm_dd(d, raw) {
    const s = String(raw || "").trim();
    if (!s) return "";

    // Fast path: ISO-like strings parse reliably in JS Date.
    const d0 = new Date(s);
    if (!isNaN(d0.getTime())) {
      return d0.toISOString().slice(0, 10);
    }

    // Vendor / OCR outputs are often not ISO. moment is available on Desk in most sites.
    if (window.moment) {
      const vendor = d.get_value && d.get_value("vendor_type");
      const strict = true;
      const moment = window.moment;

      const candidates =
        vendor === "FlipKart"
          ? [
              "YYYY-MM-DD",
              "DD/MM/YYYY",
              "D/M/YYYY",
              "DD-MM-YYYY",
              "DD-MMM-YYYY",
              "DD-MMM-YY",
              moment.ISO_8601,
            ]
          : [
              moment.ISO_8601,
              "YYYY-MM-DD",
              "DD/MM/YYYY",
              "D/M/YYYY",
              "DD-MM-YYYY",
              "DD-MMM-YYYY",
              "DD-MMM-YY",
            ];

      for (const fmt of candidates) {
        const m = moment(s, fmt, strict);
        if (m.isValid()) return m.format("YYYY-MM-DD");
      }

      const m2 = moment(s);
      if (m2.isValid()) return m2.format("YYYY-MM-DD");
    }

    return "";
  },

  reset_items_table(d) {
    const items_df = d.fields_dict.items.df;
    const grid = d.fields_dict.items.grid;

    items_df.data = [];
    if (grid.deleted_docs) grid.deleted_docs = [];
    grid.refresh();
  },

  setTableFromProcessedJson(d, processed_json, opts = {}) {
    const processed_data = JSON.parse(processed_json);
    const items_df = d.fields_dict.items.df;
    const grid = d.fields_dict.items.grid;

    // Some OCR payloads use different casing / shapes depending on model/version.
    let orderDetails =
      processed_data.orderDetails ??
      processed_data.orderdetails ??
      processed_data.items ??
      processed_data.Items;

    if (!Array.isArray(orderDetails)) {
      // Occasionally models return a single object instead of a list.
      if (orderDetails && typeof orderDetails === "object") {
        orderDetails = [orderDetails];
      } else {
        orderDetails = [];
      }
    }

    processed_data.orderDetails = orderDetails;

    const po = this._normalize_po_fields(processed_data);
    // Keep canonical keys populated for downstream code paths.
    processed_data.orderNumber = po.orderNumber;
    processed_data.orderDate = po.orderDate;
    processed_data.orderExpiryDate = po.orderExpiryDate;

    // Reset table in a Frappe-version-safe way:
    // - Always mutate `df.data` (this is what `Grid.get_data()` reads for dialog tables)
    // - Avoid assigning `grid.data` directly (can desync internal references on some versions)
    items_df.data = [];
    if (grid.deleted_docs) grid.deleted_docs = [];
    grid.refresh();

    const has_items = orderDetails.length > 0;
    if (has_items) {
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

    const defaults =
      (grid.docfields || []).reduce((acc, field) => {
        if (field && field.fieldname && field.default != null) {
          acc[field.fieldname] = field.default;
        }
        return acc;
      }, {}) || {};

    orderDetails.forEach((item, i) => {
      if (!item || typeof item !== "object") return;

      const row_idx = items_df.data.length + 1;
      const row = {
        idx: row_idx,
        __islocal: true,
        name: `row ${row_idx}`,
        ...defaults,
        ...item,
      };

      items_df.data.push(row);
    });

    grid.refresh();

    // Optional: caller may provide a hook to bind UI after refresh (e.g. change listeners)
    if (typeof opts.after_refresh === "function") {
      opts.after_refresh({ d, processed_data, grid, items_df });
    }

    // Totals: prefer explicit totals block when present, otherwise compute from rows.
    if (processed_data.totals) {
      if (processed_data.totals.totalItemQty != null) {
        d.set_value("total_item_qty", processed_data.totals.totalItemQty);
      }
      if (processed_data.totals.itemGrandTotal != null) {
        d.set_value("item_grand_total", processed_data.totals.itemGrandTotal);
      }
    }

    const rows = grid.get_data() || [];
    if (!processed_data.totals || processed_data.totals.totalItemQty == null) {
      const total_item_qty = rows.reduce((sum, r) => sum + (flt(r.qty) || 0), 0);
      d.set_value("total_item_qty", total_item_qty);
    }
    if (!processed_data.totals || processed_data.totals.itemGrandTotal == null) {
      const item_grand_total = Number(
        rows.reduce((sum, r) => sum + (flt(r.totalAmount) || 0), 0).toFixed(2)
      );
      d.set_value("item_grand_total", item_grand_total);
    }

    // Header fields + derived totals (matches process_files.js behavior)
    if (processed_data.orderDate != null && String(processed_data.orderDate).trim() !== "") {
      const formatted = this._format_date_to_yyyy_mm_dd(d, processed_data.orderDate);
      if (formatted) d.set_value("po_date", formatted);
    }
    if (processed_data.orderNumber != null) {
      d.set_value("po_number", processed_data.orderNumber);
    }
    if (
      processed_data.orderExpiryDate != null &&
      String(processed_data.orderExpiryDate).trim() !== ""
    ) {
      const formattedExpiry = this._format_date_to_yyyy_mm_dd(
        d,
        processed_data.orderExpiryDate
      );
      if (formattedExpiry) d.set_value("po_expiry_date", formattedExpiry);
    }

    const total_net_amount = orderDetails
      .reduce((sum, item) => sum + (flt(item && item.totalAmount) || 0), 0)
      .toFixed(2);
    if (!isNaN(Number(total_net_amount))) {
      d.set_value("total_net_amount", total_net_amount);
    }

    const total_taxes = orderDetails
      .reduce((sum, item) => {
        const gst_value = this._parse_percent_like_number(item && item.gst);
        const rate = flt(item && item.rate) || flt(item && item.plRate) || 0;
        const qty = flt(item && item.qty) || 0;
        return Number(sum + (rate * qty * gst_value) / 100);
      }, 0)
      .toFixed(2);
    if (!isNaN(Number(total_taxes))) {
      d.set_value("total_taxes", total_taxes);
    }

    // Row highlighting (best-effort; depends on grid_rows being built)
    orderDetails.forEach((item, idx) => {
      const row = rows[idx];
      if (!row) return;
      const grid_row = grid.grid_rows && grid.grid_rows[idx];
      const $row = grid_row && grid_row.row;
      if (!$row || !$row.addClass) return;

      if (row.rate !== row.plRate) {
        $row.addClass("highlight-red");
      } else {
        $row.addClass("highlight-white");
      }
    });

    // If the host page provides a totals refresher, prefer it (keeps tax/net logic consistent everywhere).
    if (typeof window.refreshTotalFields === "function") {
      window.refreshTotalFields(d);
    }
  },
};
