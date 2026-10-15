
"""Document parser extracting text and page numbers with OCR fallback."""
import os
import io
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader
import docx

from backend.core.config import get_settings

settings = get_settings()


class DocumentParser:
    @staticmethod
    def parse_pdf(file_path: str) -> Tuple[List[Dict[str, Any]], bool, float]:
        """
        Parses PDF page by page.
        Returns: (pages_data, ocr_applied, ocr_confidence)
        Each page item: {"page_number": int, "text": str, "ocr_used": bool}
        """
        pages_data = []
        ocr_applied = False
        reader = PdfReader(file_path)
        total_pages = len(reader.pages)

        for i, page in enumerate(reader.pages):
            page_num = i + 1
            extracted_text = (page.extract_text() or "").strip()

            # Check if text is insufficient (< 50 chars) and OCR is enabled
            if len(extracted_text) < 50 and settings.OCR_ENABLED:
                try:
                    import pytesseract
                    from pdf2image import convert_from_path

                    if settings.TESSERACT_CMD:
                        pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD

                    # Convert single page to image
                    images = convert_from_path(
                        file_path,
                        first_page=page_num,
                        last_page=page_num,
                        dpi=200
                    )
                    if images:
                        ocr_text = pytesseract.image_to_string(images[0]).strip()
                        if len(ocr_text) > len(extracted_text):
                            extracted_text = ocr_text
                            ocr_applied = True
                except Exception as ocr_err:
                    # OCR fallback graceful warning
                    pass

            pages_data.append({
                "page_number": page_num,
                "text": extracted_text,
                "ocr_used": ocr_applied
            })

        confidence = 0.95 if not ocr_applied else 0.85
        return pages_data, ocr_applied, confidence

    @staticmethod
    def parse_docx(file_path: str) -> Tuple[List[Dict[str, Any]], bool, float]:
        """Parses DOCX into logical page chunks."""
        doc = docx.Document(file_path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        full_text = "\n\n".join(paragraphs)

        # Approximate 500 words per page
        words = full_text.split()
        page_size = 450
        pages_data = []

        if not words:
            pages_data.append({"page_number": 1, "text": "", "ocr_used": False})
        else:
            for i in range(0, len(words), page_size):
                page_text = " ".join(words[i:i + page_size])
                pages_data.append({
                    "page_number": (i // page_size) + 1,
                    "text": page_text,
                    "ocr_used": False
                })

        return pages_data, False, 1.0

    @staticmethod
    def parse_txt(file_path: str) -> Tuple[List[Dict[str, Any]], bool, float]:
        """Parses plain text file."""
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        words = content.split()
        page_size = 450
        pages_data = []

        if not words:
            pages_data.append({"page_number": 1, "text": "", "ocr_used": False})
        else:
            for i in range(0, len(words), page_size):
                page_text = " ".join(words[i:i + page_size])
                pages_data.append({
                    "page_number": (i // page_size) + 1,
                    "text": page_text,
                    "ocr_used": False
                })

        return pages_data, False, 1.0

    @classmethod
    def parse_document(cls, file_path: str, filename: str) -> Tuple[List[Dict[str, Any]], bool, float]:
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        if ext == "pdf":
            return cls.parse_pdf(file_path)
        elif ext == "docx":
            return cls.parse_docx(file_path)
        elif ext == "txt":
            return cls.parse_txt(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")
