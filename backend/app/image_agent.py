import os
from google import genai

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

async def generate_visual(topic: str, answer_text: str, answer_language: str = "English"):
    model_name = os.getenv("VISIONMENTOR_MODEL", "gemini-2.5-flash")

    prompt = f"""
Create a simple educational SVG diagram for a student.

Rules:
- Return ONLY valid SVG markup.
- Use width="800" height="500".
- White background.
- Dark text.
- Clear labels.
- No external fonts or scripts.
- Make it easy to read on a laptop screen.
- All labels must be in {answer_language}.

Topic: {topic}
Explanation: {answer_text}

If this is a math problem, draw the math concept clearly.
If this is a science concept, draw a labeled educational diagram.
If this is a programming concept, draw boxes/arrows to explain flow.
Return only the <svg>...</svg>.
"""

    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
    )

    svg_text = response.text if hasattr(response, "text") else ""
    return {"svg": svg_text}