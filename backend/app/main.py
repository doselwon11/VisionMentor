from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.live_agent import ask_visionmentor
from app.image_agent import generate_visual

app = FastAPI(title="VisionMentor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
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

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/ask")
async def ask(req: AskRequest):
    try:
        result = await ask_visionmentor(
            req.question,
            req.image_base64,
            req.answer_language,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-visual")
async def gen_visual(req: VisualRequest):
    try:
        result = await generate_visual(
            req.topic,
            req.answer_text,
            req.answer_language,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
