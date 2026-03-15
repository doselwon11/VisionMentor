import os
import re
from google import genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set.")

client = genai.Client(api_key=GEMINI_API_KEY)


def extract_svg(text: str) -> str:
    if not text:
        return ""

    cleaned = text.strip()

    # remove markdown code fences if present
    cleaned = re.sub(r"^```svg\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^```\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    # extract only the svg block
    start = cleaned.find("<svg")
    end = cleaned.rfind("</svg>")

    if start != -1 and end != -1:
        return cleaned[start:end + len("</svg>")].strip()

    return ""


def build_fallback_svg(topic: str, answer_language: str) -> str:
    safe_topic = (topic or "Visual explanation").strip()
    safe_topic = safe_topic[:120]

    return f"""<svg width="800" height="500" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="500" fill="white"/>
  <rect x="40" y="40" width="720" height="420" rx="24" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/>
  <text x="70" y="110" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="#0f172a">
    Visual explanation
  </text>
  <text x="70" y="170" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#334155">
    Topic: {safe_topic}
  </text>
  <text x="70" y="240" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#475569">
    Language: {answer_language}
  </text>
  <text x="70" y="320" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#475569">
    The tutor could not generate a full diagram this time.
  </text>
  <text x="70" y="355" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#475569">
    Please try again with a simpler or more specific question.
  </text>
</svg>"""


def build_visual_prompt(topic: str, answer_text: str, answer_language: str) -> str:
    return f"""
Create a simple educational SVG diagram for a student.

Rules:
- Return ONLY valid SVG markup.
- Do NOT use markdown fences.
- Start with <svg and end with </svg>.
- Use width="800" height="500" and a matching viewBox.
- Use a white background.
- Use dark, readable text.
- Use clear labels and simple shapes.
- No JavaScript, no external fonts, no external images.
- Keep the layout clean and readable on a laptop screen.
- All labels must be in {answer_language}.

Content:
- Topic: {topic}
- Explanation: {answer_text}

Guidance:
- If this is math, draw the concept or problem structure clearly.
- If this is science, create a labeled educational diagram.
- If this is programming, use labeled boxes and arrows.
- Prefer clarity over decoration.
""".strip()


async def generate_visual(
    topic: str,
    answer_text: str,
    answer_language: str = "English",
):
    if not topic or not topic.strip():
        topic = "Homework concept"

    if not answer_text or not answer_text.strip():
        raise ValueError("Answer text is required to generate a visual.")

    model_name = os.getenv("VISIONMENTOR_MODEL", "gemini-2.5-flash")
    prompt = build_visual_prompt(topic, answer_text, answer_language)

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
        )

        raw_text = getattr(response, "text", "") or ""
        svg = extract_svg(raw_text)

        if not svg:
            svg = build_fallback_svg(topic, answer_language)

        return {"svg": svg}

    except Exception as e:
        fallback_svg = build_fallback_svg(topic, answer_language)
        return {
            "svg": fallback_svg,
            "warning": f"Visual generation fallback used: {str(e)}"
        }
