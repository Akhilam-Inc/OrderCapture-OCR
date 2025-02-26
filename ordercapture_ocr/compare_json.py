import frappe
import json

@frappe.whitelist()
def compare_json_files(file_url_1, docname, fieldname):
    file_path_1 = frappe.get_site_path() + file_url_1

    # Read JSON from file
    with open(file_path_1) as f1:
        json_data_1 = json.load(f1)

    # Read JSON from Frappe document field
    doc = frappe.get_doc('Test OCR', docname)
    json_data_2 = json.loads(doc.get(fieldname))

    differences, percentage = find_differences(json_data_1, json_data_2)
    return {
        'differences': differences,
        'percentage': percentage
    }

def find_differences(json_data_1, json_data_2):
    differences = {}
    common_keys = set(json_data_1.keys()).intersection(set(json_data_2.keys()))
    total_keys = len(common_keys)
    matching_keys = 0

    for key in common_keys:
        value_1 = json_data_1.get(key)
        value_2 = json_data_2.get(key)
        if value_1 != value_2:
            differences[key] = {
                'file_1': value_1,
                'file_2': value_2
            }
        else:
            matching_keys += 1

    percentage = (matching_keys / total_keys) * 100 if total_keys > 0 else 100
    return differences, percentage

@frappe.whitelist()
def compare_matching_orders(file_url_1, docname, fieldname):
    file_path_1 = frappe.get_site_path() + file_url_1

    with open(file_path_1) as f1:
        json1 = json.load(f1)

    doc = frappe.get_doc('Test OCR', docname)
    json2 = json.loads(doc.get(fieldname))

    matching_orders = []
    results = []
    
    # Find matching order keys between both JSONs
    for key in json1:
        if key in json2 and key.startswith('order_'):
            matching_orders.append(key)
    
    # Compare each matching order
    for order_key in matching_orders:
        order1 = json1[order_key]
        order2 = json2[order_key]
        
        total_matches = 0
        total_fields = 0
        
        # Compare all fields in the order
        for field in order1:
            if field in order2:
                total_fields += 1
                if order1[field] == order2[field]:
                    total_matches += 1
        
        # Calculate match percentage
        match_percentage = (total_matches / total_fields * 100) if total_fields > 0 else 0
        is_perfect_match = match_percentage == 100
        
        results.append({
            'order_key': order_key,
            'match_percentage': match_percentage,
            'is_perfect_match': is_perfect_match
        })
    
    return [results, json1, json2]

def display_comparison_results(results):
    print("Order Comparison Results")
    print("-" * 50)
    for result in results:
        print(f"Order: {result['order_key']}")
        print(f"Match Percentage: {result['match_percentage']:.2f}%")
        print(f"Perfect Match: {result['is_perfect_match']}")
        print("-" * 50)
