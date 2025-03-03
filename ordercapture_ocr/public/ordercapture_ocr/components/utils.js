const checkAndCreateCustomerItemMapping = (item, customer) => {
    return frappe.db.get_list('Customer Item Code Mapping', {
        filters: {
            customer: customer,
            item_code: item.itemCode
        },
        limit: 1
    }).then(existing_mappings => {
        if (existing_mappings.length === 0) {
            return frappe.call({
                method: 'frappe.client.insert',
                args: {
                    doc: {
                        doctype: 'Customer Item',
                        customer: customer,
                        item_code: item.itemCode,
                        ref_code: item.itemCode,
                        customer_name: item.itemName
                    }
                }
            });
        }
        return Promise.resolve();
    });
};

const createItemAndMapping = (item, customer) => {
    return frappe.db.get_value('Item', {'item_code': item.itemCode}, ['name'])
        .then(result => {
            if (!result.message.name) {
                return frappe.call({
                    method: 'frappe.client.insert',
                    args: {
                        doc: {
                            doctype: 'Item',
                            item_code: item.itemCode,
                            item_name: item.itemName,
                            item_group: 'Products',
                            standard_rate: item.rate,
                            is_stock_item: 1
                        }
                    }
                });
            }
            return Promise.resolve();
        })
        .then(() => checkAndCreateCustomerItemMapping(item, customer));
};