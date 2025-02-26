from google import genai
from pydantic import BaseModel, Field
import test_results_json

def compare_json(expected, actual, path=""):
    """
    Recursively compares two JSON objects (dictionaries, lists, or primitive types)
    and returns a list of strings describing any differences.
    """
    differences = []

    # Compare dictionaries
    if isinstance(expected, dict) and isinstance(actual, dict):
        for key in expected:
            current_path = f"{path}.{key}" if path else key
            if key not in actual:
                differences.append(f"Missing key in actual: {current_path}. Expected value: {expected[key]}")
            else:
                differences.extend(compare_json(expected[key], actual[key], current_path))
        for key in actual:
            current_path = f"{path}.{key}" if path else key
            if key not in expected:
                differences.append(f"Extra key in actual: {current_path} with value: {actual[key]}")
    
    # Compare lists
    elif isinstance(expected, list) and isinstance(actual, list):
        if len(expected) != len(actual):
            differences.append(f"List length mismatch at {path}: expected {len(expected)} elements, got {len(actual)}")
        for index, (exp_item, act_item) in enumerate(zip(expected, actual)):
            differences.extend(compare_json(exp_item, act_item, f"{path}[{index}]"))
    
    # Compare numeric types with a tolerance (optional)
    elif isinstance(expected, (int, float)) and isinstance(actual, (int, float)):
        tolerance = 1e-3  # Adjust tolerance if necessary
        if abs(expected - actual) > tolerance:
            differences.append(f"Difference at {path}: expected {expected}, got {actual}")
    
    # Compare other primitive types (string, bool, etc.)
    else:
        if expected != actual:
            differences.append(f"Difference at {path}: expected {expected}, got {actual}")
    
    return differences

def compare_order_details_length(expected, actual):
    """
    Explicitly checks if the 'orderDetails' array length is the same in both JSON objects.
    """
    differences = []
    if "orderDetails" in expected and "orderDetails" in actual:
        expected_len = len(expected["orderDetails"])
        actual_len = len(actual["orderDetails"])
        if expected_len != actual_len:
            differences.append(f"orderDetails array length mismatch: expected {expected_len}, got {actual_len}")
    else:
        differences.append("Missing 'orderDetails' key in one of the JSON objects.")
    return differences

# @frappe.whitelist()
def gemini_compare_json(pdf_path):
    # Path to the PDF file to test
    # pdf_path = "OCR Order PDF/order_1.pdf"
    # pdf_path = frappe.get_site_path() + pdf_path
    
    # Extract structured data from the PDF using your functions
    result_json = extract_structured_data(invoice_pdf, Order)

    # return result_json
    actual_json = test_results_json.order_1_json
    
    differences = compare_json(actual_json, result_json)
    differences.extend(compare_order_details_length(actual_json, result_json))
    if differences:
        # print("Differences found:")
        differs = []
        for diff in differences:
            differs.append(diff)

        return ["Differences found:",differs]
    else:
        return("No differences found.")

# result1 = extract_structured_data(invoice_pdf, Order)
# print(result1)
# result = gemini_compare_json(invoice_pdf)
# print(result)