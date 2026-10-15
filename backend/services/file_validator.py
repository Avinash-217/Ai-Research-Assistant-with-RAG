"""File validation service verifying content by magic bytes and size limits."""
import os
from typing import Tuple
from fastapi import UploadFile, HTTPException, status
from backend.core.config import get_settings

settings = get_settings()

PDF_MAGIC = b"%PDF"
DOCX_ZIP_MAGIC = b"PK\x03\x04"


def validate_file_content(file: UploadFile, content: bytes) -> Tuple[bool, str, str]:
    """
    Validates file size, extension, and content magic bytes.
    Returns: (is_valid, detected_mime, error_message)
    """
    # 1. Check size
    file_size_mb = len(content) / (1024 * 1024)
    if file_size_mb > settings.MAX_UPLOAD_SIZE_MB:
        return False, "", f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB"

    if len(content) == 0:
        return False, "", "Uploaded file is empty"

    # 2. Check extension
    filename = file.filename or "unknown"
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in settings.allowed_extensions_list:
        return False, "", f"File extension '{ext}' is not permitted. Allowed: {settings.ALLOWED_EXTENSIONS}"

    # 3. Content sniffing / Magic byte inspection
    detected_mime = "application/octet-stream"

    if ext == "pdf":
        # First 1024 bytes must contain %PDF
        header = content[:1024]
        if PDF_MAGIC not in header:
            return False, "", "File content is not a valid PDF document (magic bytes header mismatch)"
        detected_mime = "application/pdf"

    elif ext == "docx":
        # DOCX is a zip container starting with PK\x03\x04
        if not content.startswith(DOCX_ZIP_MAGIC):
            return False, "", "File content is not a valid DOCX document (ZIP container header mismatch)"
        detected_mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    elif ext == "txt":
        # Verify valid UTF-8 / ASCII text content
        try:
            content.decode("utf-8")
            detected_mime = "text/plain"
        except UnicodeDecodeError:
            try:
                content.decode("latin-1")
                detected_mime = "text/plain"
            except Exception:
                return False, "", "Text file contains unsupported binary encoding"

    return True, detected_mime, ""
