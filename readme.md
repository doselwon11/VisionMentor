# VisionMentor
### AI Tutor that understands questions, images, PDFs, and voice

**VisionMentor** is a multimodal AI tutoring system that helps students solve problems step-by-step by combining text, images, PDFs, and voice input. It analyzes the student's question first, then uses visual context to generate explanations and diagrams.

The system uses Google Gemini multimodal models to interpret inputs and produce structured explanations and educational visuals.

## Inspiration
Students often struggle when learning from static materials like textbooks or problem sets because they cannot ask follow-up questions or get visual explanations in real time.

VisionMentor was inspired by the idea of creating an AI tutor that behaves like a patient teacher: it listens to the student's question, understands the problem they are looking at, and explains the concept step-by-step.

The goal was to create an AI learning companion that helps students understand concepts rather than just receive answers.

## What It Does
VisionMentor allows students to:

* ask questions about homework or assignments
* upload images of problems
* upload entire PDF documents
* ask questions using voice
* receive explanations in their preferred language

The AI tutor then:

* analyzes the problem using multimodal reasoning
* generates clear step-by-step explanations
* produces visual diagrams to illustrate concepts
* asks a follow-up question to reinforce understanding

VisionMentor supports subjects including:

* mathematics
* programming
* science
* engineering
* general academic questions

## Key Features
### Multimodal AI tutoring
Students can combine:

* text questions
* camera images
* screenshots
* PDF documents
* voice input
* The AI understands the full context of the problem.

### AI visual explanations
**VisionMentor** can generate educational SVG diagrams to visually explain concepts such as:

* geometry
* calculus
* algorithms
* physics concepts
* program flow

### Multilingual support
Students can ask questions in any language, and the AI will respond in the selected language.

### Chat-based learning
Students can continue asking follow-up questions in a chat interface, allowing deeper understanding of the problem.

## Architecture Overflow
VisionMentor uses a layered AI architecture:

```
User
 ↓
VisionMentor Frontend (Next.js + Tailwind)
 ↓
FastAPI Backend
 ↓
AI Request Orchestrator
 ↓
Google Gemini Multimodal Model
 ↓
Response Generation
 ├─ Step-by-step explanation
 └─ SVG visual diagram generator
 ↓
Frontend Display
```

## Tech Stack
Frontend:

* Next.js
* React
* TailwindCSS
* Markdown + LaTeX rendering

Backend:

* FastAPI
* Python

AI:

* Google Gemini Multimodal API

Other:

* PyMuPDF for PDF analysis
* SVG visual generation

## Project Structure
```
VisionMentor
│
├── frontend
│   ├── app
│   ├── components
│   └── public
│
├── backend
│   ├── app
│   │   ├── main.py
│   │   ├── live_agent.py
│   │   ├── image_agent.py
│   │   ├── pdf_agent.py
│   │   └── prompts.py
│   │
│   └── Dockerfile
│
├── cloudbuild.yaml
└── README.md
```

## How to Run Locally 
### 1. Install dependencies
Backend:
```
cd backend
pip install -r requirements.txt
```

Frontend:
```
cd frontend
npm install
```

### 2. Add a Gemini API key
Create a file:
```
backend/.env
```

Add:
```
GEMINI_API_KEY=YOUR_API_KEY
```

You can obtain a Gemini API key here: https://ai.google.dev

### 3. Start the backend server
```
cd backend
python -m uvicorn app.main:app --reload --port 8000
```
Backend will run at:
```
http://localhost:8000
```

### 4. Start the frontend
Open a new terminal:
```
cd frontend
npm run dev
```

Frontend will run at:
```
http://localhost:3000
```

### 5. Try VisionMentor
Example ways to test:

1. Upload a math problem image
2. Ask a programming question
3. Upload a PDF document
4. Use voice input
5. Generate a visual explanation

#### Example Test Questions
Math:
```
Explain how to solve ∫2x(x²+1)^3 dx
```

Programming/Algorithms:
```
Explain dynamic programming in simple terms.
```

Science:
```
Explain how photosynthesis works.
```

## Automated Cloud Deployment
VisionMentor includes automated cloud deployment scripts.

Deployment configuration:
```
cloudbuild.yaml
backend/Dockerfile
```

These scripts build the backend container and deploy it using Google Cloud Build and Cloud Run.

Example deployment command:
```
gcloud builds submit --config cloudbuild.yaml
```

## License
MIT License.