import pandas as pd

def extract_purchase_order_data(file_path: str) -> dict:
    """
    Extracts structured purchase order data from an Excel file.

    Args:
        file_path (str): Path to the Excel file.
        sheet_name (str): Sheet name to process. Defaults to the first sheet if not provided.

    Returns:
        dict: Extracted structured purchase order data.
    """
    # Load the Excel file
    df = pd.read_excel(file_path)

    try:
        purchase_order_data = {}
        # Extract PO Number and Date
        po_number = df.iloc[10, 0].split(":")[1].strip() if "PO Number" in str(df.iloc[10, 0]) else "Unknown"
        po_date = df.iloc[10, 3].split(":")[1].strip() if "PO date" in str(df.iloc[10, 3]) else "Unknown"
        
        print(f"PO Number: {po_number}, PO Date: {po_date}")

        # print(df.head(20))

        # Extract Item Details
        # Find Start row by checking "SLNO" found in the first column
        start_row = df[df.iloc[:, 0].str.contains("SLNO", na=False)].index[0]
        
        # print(f"Start Row: {start_row}")
        # Find End row by checking "Total" found in the forth column
        end_row = df[df.iloc[:, 3].str.contains("Total", na=False)].index[0]

        # print(f"End Row: {end_row}")
        
        # #Get end row data
        # end_row_data = df.iloc[end_row, :]
        # print(end_row_data)
        

        # make a data frame with first row as header
        item_details = df.iloc[start_row:end_row, :]

        # make first row as header and remove first row
        item_details.columns = item_details.iloc[0]
        item_details = item_details[1:]
        
        # add below details in the dictionary
        # "orderDetails": [
        # {
        # "itemCode": "10119089",
        # "itemName": "GO DESi Tangy Imli Desi Popz Lollipop Candy (1 pack (10 pieces))",
        # "qty": 150,
        # "rate": 30.95,
        # "gst": 5,
        # "landing_rate": 32.5,
        # "totalAmount": 4875
        # },
        # {
        # "itemCode": "10162269",
        # "itemName": "Premium Kaju Katli Box by GO DESi (200g)",
        # "qty": 120,
        # "rate": 142.38,
        # "gst": 5,
        # "landing_rate": 149.5,
        # "totalAmount": 17940
        # }
        # ]

        # extract all the items details
        order_details = []
        #iterate over dataframes rows
        for index, row in item_details.iterrows():
            itemCode = row['SkuCode']
            itemName = row['Description']
            qty = row['Quantity']
            rate = row['Basic Cost']
            gst = row['GST Amount']/row['Quantity']
            landing_rate = row['Landing Cost']
            totalAmount = row['TotalValue']

            order_details.append({
                "itemCode": itemCode,
                "itemName": itemName,
                "qty": qty,
                "rate": rate,
                "gst": gst,
                "landing_rate": landing_rate,
                "totalAmount": totalAmount
            })


        purchase_order_data['orderNumber'] = po_number
    
        purchase_order_data['orderDetails'] = order_details

        
        return purchase_order_data

    except Exception as e:
        print(f"Error extracting data: {e}")
        return {}

# Example Usage
file_path = 'big/427363.xls'
purchase_order_data = extract_purchase_order_data(file_path)
print(purchase_order_data)

