from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.live_agent import (
    ask_visionmentor,
    ask_visionmentor_with_pdf,
    ask_followup_visionmentor,
)
from app.image_agent import generate_visual
from app.pdf_agent import extract_pdf_text_and_first_page


app = FastAPI(title="VisionMentor API", version="1.0.0")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AskRequest(BaseModel):
    question: str
    image_base64: str
    answer_language: str = "English"


class VisualRequest(BaseModel):
    topic: str
    answer_text: str
    answer_language: str = "English"


class FollowupRequest(BaseModel):
    original_question: str
    current_answer: str
    followup_question: str
    answer_language: str = "English"


def normalize_error_message(exc: Exception) -> str:
    message = str(exc).strip()

    if not message:
        return "An unexpected error occurred."

    lower_message = message.lower()

    if "429" in message or "resource_exhausted" in lower_message or "quota" in lower_message:
        return (
            "Gemini quota limit reached. Please wait a little and try again. "
            "For demo use, avoid repeated retries and unnecessary extra requests."
        )

    if "api key" in lower_message or "gemini_api_key" in lower_message:
        return "Gemini API key is missing or invalid."

    if "unable to process input image" in lower_message:
        return "The uploaded image could not be processed. Please try a clearer image."

    if "could not read the pdf" in lower_message:
        return "The uploaded PDF could not be read."

    if "question cannot be empty" in lower_message:
        return "Please provide a question."

    if "image data is missing" in lower_message:
        return "Please start the camera or upload an image."

    return message


def raise_http_error(exc: Exception) -> None:
    message = normalize_error_message(exc)
    lower_message = message.lower()

    if "quota limit" in lower_message or "quota" in lower_message:
        raise HTTPException(status_code=429, detail=message)

    if "api key" in lower_message:
        raise HTTPException(status_code=500, detail=message)

    if (
        "please provide a question" in lower_message
        or "please start the camera" in lower_message
        or "could not be processed" in lower_message
        or "could not be read" in lower_message
    ):
        raise HTTPException(status_code=400, detail=message)

    raise HTTPException(status_code=500, detail=message)


@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "VisionMentor API",
        "routes": ["/ask", "/ask-pdf", "/generate-visual", "/followup"],
    }


@app.post("/ask")
async def ask(req: AskRequest):
    try:
        result = await ask_visionmentor(
            question=req.question,
            image_base64=req.image_base64,
            answer_language=req.answer_language,
        )
        return result
    except Exception as exc:
        raise_http_error(exc)


@app.post("/ask-pdf")
async def ask_pdf(
    file: UploadFile = File(...),
    question: str = Form(...),
    answer_language: str = Form("English"),
):
    try:
        if not question or not question.strip():
            raise ValueError("Question cannot be empty.")

        if not file:
            raise ValueError("No PDF file was uploaded.")

        filename = (file.filename or "").lower()
        content_type = (file.content_type or "").lower()

        if not filename.endswith(".pdf") and content_type != "application/pdf":
            raise ValueError("Please upload a valid PDF document.")

        pdf_bytes = await file.read()

        if not pdf_bytes:
            raise ValueError("The uploaded PDF is empty.")

        full_text, first_page_base64 = extract_pdf_text_and_first_page(pdf_bytes)

        if not full_text and not first_page_base64:
            raise ValueError("Could not read the PDF.")

        result = await ask_visionmentor_with_pdf(
            question=question,
            pdf_text=full_text,
            first_page_base64=first_page_base64,
            answer_language=answer_language,
        )

        result["source_type"] = "pdf"
        result["file_name"] = file.filename or "uploaded.pdf"
        return result

    except Exception as exc:
        raise_http_error(exc)


@app.post("/followup")
async def followup(req: FollowupRequest):
    try:
        if not req.followup_question or not req.followup_question.strip():
            raise ValueError("Question cannot be empty.")

        result = await ask_followup_visionmentor(
            original_question=req.original_question,
            current_answer=req.current_answer,
            followup_question=req.followup_question,
            answer_language=req.answer_language,
        )
        return result
    except Exception as exc:
        raise_http_error(exc)


@app.post("/generate-visual")
async def gen_visual(req: VisualRequest):
    try:
        if not req.answer_text or not req.answer_text.strip():
            raise ValueError("Answer text is required to generate a visual.")

        result = await generate_visual(
            topic=req.topic,
            answer_text=req.answer_text,
            answer_language=req.answer_language,
        )
        return result
    except Exception as exc:
        raise_http_error(exc)