"""Generates test research PDFs for evaluation suite, including prompt-injection test file."""
import os
from pypdf import PdfWriter


def create_minimal_pdf(filename: str, pages_content: list):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    # Use pypdf to generate a valid PDF with custom text content streams
    writer = PdfWriter()
    for i, content in enumerate(pages_content):
        # Add blank page
        page = writer.add_blank_page(width=612, height=792)
        # In pypdf, we can attach text by writing a raw content stream or annotations
        # For evaluation, we can also write a corresponding text/docx or loadable document
    
    with open(filename, "wb") as f:
        writer.write(f)


if __name__ == "__main__":
    print("Generating evaluation fixtures...")
