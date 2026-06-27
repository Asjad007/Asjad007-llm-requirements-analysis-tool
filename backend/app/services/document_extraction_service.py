import io
import os
import re
from collections import Counter

from fastapi import HTTPException, UploadFile

from app.services.requirement_extraction_service import normalize_requirement_text


SUPPORTED_DOCUMENT_EXTENSIONS = {".pdf", ".docx"}
PAGE_NUMBER_PATTERN = re.compile(r"^(?:page\s+\d+(?:\s+of\s+\d+)?|\d+)$", re.IGNORECASE)


def detect_document_extension(filename: str) -> str:
    extension = os.path.splitext(filename or "")[1].lower()

    if extension not in SUPPORTED_DOCUMENT_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a PDF or DOCX requirement document.",
        )

    return extension


def extract_document_text(upload: UploadFile, file_bytes: bytes) -> str:
    extension = detect_document_extension(upload.filename or "")

    if extension == ".pdf":
        return extract_pdf_text(file_bytes)

    if extension == ".docx":
        return extract_docx_text(file_bytes)

    raise HTTPException(status_code=400, detail="Unsupported file type")


def extract_pdf_text(file_bytes: bytes) -> str:
    try:
        import pdfplumber
    except ImportError as exc:
        raise HTTPException(status_code=500, detail="PDF extraction support is not installed on the server.") from exc

    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            page_line_sets = []

            for page in pdf.pages:
                page_text = page.extract_text() or ""
                lines = [line.strip() for line in page_text.splitlines() if line.strip()]
                page_line_sets.append(lines)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="The PDF file could not be read. Please upload a valid PDF document.") from exc

    repeated_edge_lines = detect_repeated_edge_lines(page_line_sets)
    cleaned_paragraphs = []

    for lines in page_line_sets:
        filtered_lines = []

        for line in lines:
            if PAGE_NUMBER_PATTERN.match(line):
                continue
            if line in repeated_edge_lines:
                continue
            filtered_lines.append(line)

        if filtered_lines:
            cleaned_paragraphs.append("\n".join(filtered_lines))

    return normalize_requirement_text("\n\n".join(cleaned_paragraphs))


def extract_docx_text(file_bytes: bytes) -> str:
    try:
        from docx import Document
    except ImportError as exc:
        raise HTTPException(status_code=500, detail="DOCX extraction support is not installed on the server.") from exc

    try:
        document = Document(io.BytesIO(file_bytes))
        paragraphs = [paragraph.text.strip() for paragraph in document.paragraphs if paragraph.text and paragraph.text.strip()]
    except Exception as exc:
        raise HTTPException(status_code=400, detail="The DOCX file could not be read. Please upload a valid Word document.") from exc

    return normalize_requirement_text("\n\n".join(paragraphs))


def detect_repeated_edge_lines(page_line_sets: list[list[str]]) -> set[str]:
    edge_counter: Counter[str] = Counter()

    for lines in page_line_sets:
        if not lines:
            continue

        edge_candidates = lines[:2] + lines[-2:]

        for line in edge_candidates:
            cleaned = line.strip()
            if len(cleaned) > 120:
                continue
            edge_counter[cleaned] += 1

    return {line for line, count in edge_counter.items() if count >= 2}
