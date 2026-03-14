import os
from google import genai
from app.prompts import TUTOR_SYSTEM_PROMPT

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

async def ask_visionmentor(question: str, image_base64: str, answer_language: str = "English"):
    model_name = os.getenv("VISIONMENTOR_MODEL", "gemini-2.5-flash")

    prompt = f"""
{TUTOR_SYSTEM_PROMPT}

Student question: {question}

Important instructions:
- Understand the student's question even if it is written in any language.
- Answer in this language: {answer_language}
- If the user mixes languages, still answer fully in {answer_language}.
- Base your explanation on the image if possible.
- If the image is unclear, say what is uncertain.
"""

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
                            "data": image_base64
                        }
                    }
                ]
            }
        ]
    )

    answer_text = response.text if hasattr(response, "text") else "I could not generate an answer."

    return {
        "answer_text": answer_text,
        "topic": question,
        "answer_language": answer_language
    }
