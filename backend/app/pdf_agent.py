from dotenv import load_dotenv
load_dotenv()

import base64
import fitz  # pymupdf


def extract_pdf_text_and_first_page(pdf_bytes: bytes):
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    full_text_parts = []
    first_page_base64 = None

    for i, page in enumerate(doc):
        text = page.get_text("text")
        if text:
            full_text_parts.append(f"--- Page {i + 1} ---\n{text}")

        if i == 0:
            pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
            img_bytes = pix.tobytes("jpeg")
            first_page_base64 = base64.b64encode(img_bytes).decode("utf-8")

    full_text = "\n\n".join(full_text_parts).strip()
    return full_text, first_page_base64
