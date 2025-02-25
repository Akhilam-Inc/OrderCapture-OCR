# OrderCapture OCR Documentation

## Overview
OrderCapture OCR is an application that automates purchase order processing through optical character recognition. It supports both PDF and Excel formats, with specialized handling for different vendor types.

## Features
1. Document Processing
- Automated extraction of order details from PDFs and Excels
- Support for multiple vendor types (FlipKart, BB)
- Intelligent customer address matching
- Price list rate comparison
- Automatic item creation if not exists
- Customer item mapping

2. User Interface
- Interactive dialog with document navigation
- Real-time processing status
- Visual indicators for price discrepancies

## Usage Guide

### 1. Processing Documents
a) Upload documents through OCR Document Processor
b) Open the processing dialog by clicking on the document
c) Click "Process File" to start extraction
d) For Excel files, select appropriate vendor type (FlipKart/BB)

### 2. Data Verification
- Review extracted customer details
- Verify item details in the grid
- Compare extracted rates with price list rates
- Create new customer address if needed

### 3. Managing Items
- Use "Fetch Price List Rate" to compare with standard rates
- Red highlighting indicates price discrepancies
- Edit quantities and rates if needed
- Save changes before posting

### 4. Creating Sales Orders
a) Verify all extracted information
b) Click "Post Sales Order" to create SO
c) System checks for duplicate PO numbers
d) Sales order creation updates OCR document status

## Key Functions
1. Document Navigation
- Use arrows to move between documents
- View original files
- Track processing status

2. Address Management
- Create new addresses
- Intelligent address matching
- Update existing addresses

3. Price Management
- Automatic price list fetching
- Rate comparison
- Landing rate calculation

4. Data Management
- Save partial changes
- Retry failed processing
- Track document status

## Best Practices
1. Verify customer details before processing
2. Check price discrepancies highlighted in red
3. Create missing items before processing
4. Save changes before posting sales orders
5. Verify PO numbers for duplicates

## Technical Notes
- Supports PDF and Excel formats
- Integrated with Frappe/ERPNext
- Real-time processing updates
- Automated item creation
- Address similarity matching
