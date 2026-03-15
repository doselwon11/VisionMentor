from dotenv import load_dotenv
load_dotenv()

import os
from google import genai
from app.prompts import TUTOR_SYSTEM_PROMPT

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set.")

client = genai.Client(api_key=GEMINI_API_KEY)


def build_prompt(question: str, answer_language: str) -> str:
    return f"""
{TUTOR_SYSTEM_PROMPT}

Student question:
{question}

Important instructions:
- Answer the student's explicit question first.
- Treat the image as supporting context, not the main goal.
- If the image and question are about different topics, briefly mention the mismatch and then answer the student's question.
- Answer fully in {answer_language}.
- If the student mixes languages, still respond fully in {answer_language}.
""".strip()


async def ask_visionmentor(
    question: str,
    image_base64: str,
    answer_language: str = "English",
):
    if not question or not question.strip():
        raise ValueError("Question cannot be empty.")

    if not image_base64 or not image_base64.strip():
        raise ValueError("Image data is missing.")

    model_name = os.getenv("VISIONMENTOR_MODEL", "gemini-2.5-flash")
    prompt = build_prompt(question, answer_language)

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=[
                {
                    "role": "user",
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": image_base64,
                            }
                        },
                    ],
                }
            ],
        )

        answer_text = getattr(response, "text", None)

        if not answer_text:
            answer_text = (
                f"I could not generate a clear answer in {answer_language}. "
                "Please try again with a clearer image or a more specific question."
            )

        return {
            "answer_text": answer_text.strip(),
            "topic": question.strip(),
            "answer_language": answer_language,
        }

    except Exception as e:
        raise RuntimeError(f"VisionMentor failed to generate a response: {str(e)}")



async def ask_visionmentor_with_pdf(
    question: str,
    pdf_text: str,
    first_page_base64: str | None = None,
    answer_language: str = "English",
):
    if not question or not question.strip():
        raise ValueError("Question cannot be empty.")

    model_name = os.getenv("VISIONMENTOR_MODEL", "gemini-2.5-flash")

    prompt = f"""
{TUTOR_SYSTEM_PROMPT}

Student question:
{question}

Document context:
The uploaded file is a PDF document. Use the document text as supporting context.

Important instructions:
- Answer the student's explicit question first.
- Use the PDF content as supporting context.
- If the PDF content and question do not fully match, briefly mention that and still answer the student's question.
- Answer fully in {answer_language}.

PDF text:
{pdf_text[:12000]}
""".strip()

    parts = [{"text": prompt}]

    if first_page_base64:
        parts.append(
            {
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": first_page_base64,
                }
            }
        )

    response = client.models.generate_content(
        model=model_name,
        contents=[
            {
                "role": "user",
                "parts": parts,
            }
        ],
    )

    answer_text = getattr(response, "text", None)

    if not answer_text:
        answer_text = (
            f"I could not generate a clear answer in {answer_language}. "
            "Please try again with a clearer PDF or a more specific question."
        )

    return {
        "answer_text": answer_text.strip(),
        "topic": question.strip(),
        "answer_language": answer_language,
    }
