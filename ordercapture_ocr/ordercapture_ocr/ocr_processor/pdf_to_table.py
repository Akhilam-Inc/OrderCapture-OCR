import json
import os
import stat

import frappe


def _sanitize_cmap_path():
    """
    Security measure to prevent pdfminer-six CMap pickle deserialization vulnerability.

    GHSA-f83h-ghpp-7wcc: pdfminer-six uses unsafe pickle deserialization for CMap files.
    This function ensures CMAP_PATH is not set to user-writable directories.

    If CMAP_PATH is set, we restrict it to system directories only to prevent
    privilege escalation attacks via malicious pickle files.
    """
    cmap_path = os.environ.get("CMAP_PATH")
    if cmap_path:
        # Check if any directory in CMAP_PATH is world-writable or user-writable
        paths = cmap_path.split(os.pathsep)
        safe_paths = []

        for path in paths:
            if not path:
                continue

            try:
                # Check if directory exists and get its permissions
                if os.path.isdir(path):
                    path_stat = os.stat(path)
                    # Check if directory is world-writable (others have write permission)
                    # or if it's in a potentially unsafe location like /tmp
                    is_world_writable = bool(path_stat.st_mode & stat.S_IWOTH)
                    is_in_tmp = path.startswith("/tmp") or path.startswith("/var/tmp")

                    if is_world_writable or is_in_tmp:
                        frappe.log_error(
                            title="Security Warning: Unsafe CMAP_PATH detected",
                            message=f"CMAP_PATH contains potentially unsafe directory: {path}. "
                            "This could allow privilege escalation via pdfminer-six CMap pickle deserialization. "
                            "Removing from CMAP_PATH.",
                        )
                        continue

                safe_paths.append(path)
            except (OSError, ValueError):
                # If we can't check the path, exclude it for safety
                continue

        # Only set CMAP_PATH if we have safe paths, otherwise unset it
        if safe_paths:
            os.environ["CMAP_PATH"] = os.pathsep.join(safe_paths)
        else:
            # Unset CMAP_PATH to use default system paths only
            os.environ.pop("CMAP_PATH", None)


# Sanitize CMAP_PATH before importing pdfplumber to prevent
# pdfminer-six from loading CMap files from unsafe locations
# (GHSA-f83h-ghpp-7wcc vulnerability mitigation)
_sanitize_cmap_path()

import pdfplumber  # noqa: E402


def pdf_tables_to_json(pdf_path):
    """
    Extract tables from PDF file and return as JSON.

    Security Note: This function uses pdfplumber which depends on pdfminer-six.
    A security wrapper is applied to prevent CMap pickle deserialization attacks
    (GHSA-f83h-ghpp-7wcc) by sanitizing CMAP_PATH.
    """
    # Apply security measure before using pdfplumber
    _sanitize_cmap_path()

    tables_data = {}
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page_number, page in enumerate(pdf.pages, start=1):
                # Extract all tables on the page
                tables = page.extract_tables()

                # Store each table in the dictionary
                page_tables = []
                for table in tables:
                    # Each table is a list of lists (rows and columns)
                    page_tables.append(table)

                if page_tables:
                    tables_data[f"page_{page_number}"] = page_tables

        return json.dumps(tables_data, indent=4)
    except Exception:
        frappe.log_error(
            title="Error in pdf_tables_to_json", message=frappe.get_traceback()
        )
