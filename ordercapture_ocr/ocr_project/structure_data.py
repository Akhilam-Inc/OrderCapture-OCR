import pdfplumber
import json
def structure_table_rows(table):
    """
    Convert a list-of-lists table into a list of dictionaries,
    using the first row as column headers.
    """
    if not table:
        return []
    
    # Extract headers (first row)
    headers = table[0]

    # For each subsequent row, build a dictionary
    structured_data = []
    for row in table[1:]:
        # If the row length doesn't match header length,
        # handle it gracefully (e.g., fill missing columns with None)
        row_dict = {}
        for i, header in enumerate(headers):
            # Safely get row[i] or None if out of range
            cell_value = row[i] if i < len(row) else None
            row_dict[header] = cell_value
        structured_data.append(row_dict)
    
    return structured_data

def pdf_to_structured_json(pdf_path):
    all_pages_data = []
    
    with pdfplumber.open(pdf_path) as pdf:
        for page_index, page in enumerate(pdf.pages, start=1):
            tables = page.extract_tables()
            
            for t_index, table in enumerate(tables):
                # Skip empty tables
                if not table:
                    continue
                
                # Convert table to list-of-dicts
                structured_rows = structure_table_rows(table)
                
                # Clean / Validate
                # cleaned_rows = clean_and_validate_rows(structured_rows)
                
                # Add page/table index info if needed
                all_pages_data.append({
                    "page_number": page_index,
                    "table_index": t_index,
                    "rows": structured_rows
                })
    
    return json.dumps(all_pages_data, indent=4)

if __name__ == "__main__":
    pdf_path = "test_pdf_1.pdf"
    final_json = pdf_to_structured_json(pdf_path)
    print(final_json)
    # Optionally save to file
    with open("structured_purchase_order.json", "w") as f:
        f.write(final_json)

def clean_and_validate_rows(structured_rows):
    """
    Converts strings to appropriate data types and checks for anomalies.
    """
    cleaned_rows = []
    for row in structured_rows:
        cleaned_row = {}
        
        # Example: handle a numeric quantity column
        qty_str = row.get("Qty", "")
        try:
            cleaned_row["Qty"] = int(qty_str)
        except ValueError:
            # If invalid, set to 0 or handle appropriately
            cleaned_row["Qty"] = 0
        
        # Example: handle a price column which might be '$3.50'
        price_str = row.get("Price", "").replace("$", "")
        try:
            cleaned_row["Price"] = float(price_str)
        except ValueError:
            cleaned_row["Price"] = 0.0
        
        # Copy over other columns as needed
        cleaned_row["Item"] = row.get("Item", "")
        cleaned_row["Description"] = row.get("Description", "")
        
        cleaned_rows.append(cleaned_row)
    
    return cleaned_rows


