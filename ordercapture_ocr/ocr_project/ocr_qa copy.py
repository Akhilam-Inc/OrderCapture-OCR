from ocr_table import pdf_tables_to_json
from structure_data_with_llm import parse_purchase_order_with_llm
import test_results_json
import os
import csv
import json
import pdfplumber

def extract_purchase_order_data(pdf_path):
    """
    Extracts structured data from a purchase order PDF.
    """
    tables_json = pdf_tables_to_json(pdf_path)
    structured_data = parse_purchase_order_with_llm(tables_json)
    return structured_data

# --- Comparison Functions ---

def compare_json(expected, actual, path=""):
    """
    Recursively compares two JSON objects (dictionaries, lists, or primitive types)
    and returns a list of strings describing any differences.
    """
    differences = []

    if isinstance(expected, dict) and isinstance(actual, dict):
        for key in expected:
            current_path = f"{path}.{key}" if path else key
            if key not in actual:
                differences.append(f"Missing key in actual: {current_path}. Expected: {expected[key]}")
            else:
                differences.extend(compare_json(expected[key], actual[key], current_path))
        for key in actual:
            current_path = f"{path}.{key}" if path else key
            if key not in expected:
                differences.append(f"Extra key in actual: {current_path} with value: {actual[key]}")
    elif isinstance(expected, list) and isinstance(actual, list):
        if len(expected) != len(actual):
            differences.append(f"List length mismatch at {path}: expected {len(expected)} elements, got {len(actual)}")
        for index, (exp_item, act_item) in enumerate(zip(expected, actual)):
            differences.extend(compare_json(exp_item, act_item, f"{path}[{index}]"))
    elif isinstance(expected, (int, float)) and isinstance(actual, (int, float)):
        tolerance = 1e-3  # Adjust tolerance as needed
        if abs(expected - actual) > tolerance:
            differences.append(f"Difference at {path}: expected {expected}, got {actual}")
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

# --- Main Script ---

def main():
    # Folder where your PDF files are located.
    pdf_folder = "OCR Order PDF"
    # File containing the expected results in JSON format.
    expected_file = "expected_results.json"
    # Output CSV file that will contain the differences.
    output_csv = "test_results.csv"
    
    # Load the expected test cases.
    with open(expected_file, "r") as f:
        expected_cases = json.load(f)
    
    # Prepare a list for CSV rows.
    csv_rows = [["pdf_file", "difference"]]
    
    # Iterate over all PDF files in the folder.
    for filename in os.listdir(pdf_folder):
        if not filename.lower().endswith(".pdf"):
            continue
        pdf_path = os.path.join(pdf_folder, filename)
        
        if filename not in expected_cases:
            print(f"Warning: {filename} not found in expected test cases. Skipping.")
            continue
        
        expected_json = expected_cases[filename]
        print(f"Processing {filename}...")
        try:
            actual_json = extract_purchase_order_data(pdf_path)
        except Exception as e:
            csv_rows.append([filename, f"Error during extraction: {e}"])
            continue
        
        differences = compare_json(expected_json, actual_json)
        differences.extend(compare_order_details_length(expected_json, actual_json))
        
        if not differences:
            csv_rows.append([filename, "No differences found"])
        else:
            for diff in differences:
                csv_rows.append([filename, diff])
    
    # Write all results to the CSV file.
    with open(output_csv, "w", newline="") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerows(csv_rows)
    
    print(f"Comparison complete. Results written to {output_csv}.")

if __name__ == "__main__":
    main()

