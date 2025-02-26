// Copyright (c) 2025, AkhilamInc and contributors
// For license information, please see license.txt

frappe.ui.form.on("Test OCR", {
	refresh(frm) {
        console.log(frm.doc.attachments);
	},
    gemini_results(frm) {
        frappe.call({
            method: 'frappe.client.get_list',
            freeze: true,
            args: {
                doctype: 'File',
                filters: {
                    'attached_to_doctype': 'Test OCR',
                    'attached_to_name': frm.doc.name
                },
                fields: ['file_url', 'file_name']
            },
            callback: function(response) {
                if (response.message) {
                    // frappe.show_progress('Running OCR Tests', 0, 100)
                    let results = {};
                    let totalFiles = response.message.length;
                    let processedFiles = 0;
                    let promises = response.message.filter(file => file.file_url.endsWith('.pdf')).map(file => {
                        return new Promise((resolve) => {
                            frappe.call({
                                method: 'ordercapture_ocr.gemini_ocr.api.gemini_compare_json',
                                args: {
                                    pdf_path: file.file_url
                                },
                                callback: function(r) {
                                    let fileNameWithoutExtension = file.file_name.replace(/\.[^/.]+$/, "_json"); // Remove extension
                                    results[fileNameWithoutExtension] = r.message;
                                    processedFiles++;
                                        frappe.show_progress('Processing OCR', 
                                            (processedFiles/totalFiles * 100), 
                                            100, 
                                            `Processing file ${processedFiles} of ${totalFiles}`
                                        );
                                    resolve();
                                }
                            });
                        });
                    });

                    Promise.all(promises).then(() => {
                        frappe.show_progress('Processing OCR', 100, 100, 'Completed');
                        setTimeout(() => frappe.hide_progress(), 1000);
                        frm.set_value('compared_result', results);
                        console.log('Results:', results);
                        frm.save();
                        // frappe.call({
                        //     method: 'ordercapture_ocr.compare_json.compare_matching_orders',
                        //     args: {
                        //         file_url_1: frm.doc.test_results, // Replace with the actual file URL
                        //         docname: frm.doc.name,
                        //         fieldname: 'result'
                        //     },
                        //     callback: function(compare_response) {
                        //         if (compare_response.message) {
                        //             console.log('Comparison Result:', compare_response.message);
                        //             frappe.msgprint(`Comparison completed. Accuracy: ${compare_response.message.percentage}%`);
                        //         }
                        //     }
                        // });
                        // frm.save();
                        frappe.msgprint('OCR processing completed and results saved');
                    });
                }
            
            }
        });
    },
    run_test(frm) {
        frappe.call({
            method: 'frappe.client.get_list',
            freeze: true,
            args: {
                doctype: 'File',
                filters: {
                    'attached_to_doctype': 'Test OCR',
                    'attached_to_name': frm.doc.name
                },
                fields: ['file_url', 'file_name']
            },
            callback: function(response) {
                if (response.message) {
                    // frappe.show_progress('Running OCR Tests', 0, 100)
                    let results = {};
                    let totalFiles = response.message.length;
                    let processedFiles = 0;
                    let promises = response.message.filter(file => file.file_url.endsWith('.pdf')).map(file => {
                        return new Promise((resolve) => {
                            frappe.call({
                                method: 'ordercapture_ocr.ocr_project.ocr_qa.openai_compare_json',
                                args: {
                                    pdf_path: file.file_url
                                },
                                callback: function(r) {
                                    let fileNameWithoutExtension = file.file_name.replace(/\.[^/.]+$/, "_json"); // Remove extension
                                    results[fileNameWithoutExtension] = r.message;
                                    processedFiles++;
                                        frappe.show_progress('Processing OCR', 
                                            (processedFiles/totalFiles * 100), 
                                            100, 
                                            `Processing file ${processedFiles} of ${totalFiles}`
                                        );
                                    resolve();
                                }
                            });
                        });
                    });

                    Promise.all(promises).then(() => {
                        frappe.show_progress('Processing OCR', 100, 100, 'Completed');
                        setTimeout(() => frappe.hide_progress(), 1000);
                        frm.set_value('result', results);
                        console.log('Results:', results);
                        frm.save();
                        // frappe.call({
                        //     method: 'ordercapture_ocr.compare_json.compare_matching_orders',
                        //     args: {
                        //         file_url_1: frm.doc.test_results, // Replace with the actual file URL
                        //         docname: frm.doc.name,
                        //         fieldname: 'result'
                        //     },
                        //     callback: function(compare_response) {
                        //         if (compare_response.message) {
                        //             console.log('Comparison Result:', compare_response.message);
                        //             frappe.msgprint(`Comparison completed. Accuracy: ${compare_response.message.percentage}%`);
                        //         }
                        //     }
                        // });
                        // frm.save();
                        frappe.msgprint('OCR processing completed and results saved');
                    });
                }
            
            }
        });
        
    },
    // compare_results: function(frm) {
    //     frappe.call({
    //         method: 'ordercapture_ocr.compare_json.compare_matching_orders',
    //         args: {
    //             file_url_1: frm.doc.test_results, // Replace with the actual file URL
    //             docname: frm.doc.name,
    //             fieldname: 'result'
    //         },
    //         callback: function(compare_response) {
    //             if (compare_response.message) {
    //                 console.log('Comparison Result:', compare_response.message);
    //                 frm.set_value('compared_result', JSON.stringify(compare_response.message[0]));
    //                 frm.save().then(() => {
    //                     frappe.msgprint(`Comparison completed. Accuracy: ${compare_response.message.percentage}%`);
    //                 });
    //             }
    //         }
    //     });
    // }
});
