"use client";

import { useRef, useState } from "react";

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

export default function HomePage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [visualSvg, setVisualSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [answerLanguage, setAnswerLanguage] = useState("English");
  const [isListening, setIsListening] = useState(false);

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }

  function captureFrame(): string | null {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
  }

  function getCurrentImageBase64(): string | null {
    if (uploadedImage) {
      return uploadedImage.split(",")[1];
    }
    return captureFrame();
  }

  function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setUploadedImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function startVoiceInput() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "auto";
    recognition.interimResults = false;
    recognition.continuous = false;

    setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setQuestion(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }

  async function askQuestion() {
    const image_base64 = getCurrentImageBase64();
    if (!image_base64 || !question.trim()) {
      alert("Please provide a question and either start the camera or upload an image.");
      return;
    }

    setLoading(true);
    setAnswer("");
    setVisualSvg(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          image_base64,
          answer_language: answerLanguage
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to get answer.");
      }

      setAnswer(data.answer_text || "");

      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(data.answer_text || "");
      speechSynthesis.speak(utter);
    } catch (error: any) {
      setAnswer(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function generateVisual() {
    if (!answer) return;

    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/generate-visual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            topic: question,
            answer_text: answer,
            answer_language: answerLanguage
        })
        });

        const data = await res.json();

        if (!res.ok) {
        throw new Error(data.detail || "Failed to generate visual.");
        }

        if (data.svg) {
        setVisualSvg(data.svg);
        } else {
        alert("No visual was returned.");
        }
    } catch (error: any) {
        alert(error.message);
    }
}




  return (
    <main className="min-h-screen bg-white text-black p-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-6">
        <section className="space-y-4">
          <div>
            <h1 className="text-4xl font-bold">VisionMentor</h1>
            <p className="text-lg mt-2">
              An AI tutor that sees your homework, understands any language, and explains in your chosen language.
            </p>
          </div>

          <div className="rounded-2xl border p-4 space-y-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-2xl border bg-black"
            />

            <canvas ref={canvasRef} className="hidden" />

            {uploadedImage && (
              <div>
                <p className="font-medium mb-2">Uploaded image preview</p>
                <img
                  src={uploadedImage}
                  alt="Uploaded homework"
                  className="w-full rounded-2xl border"
                />
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button onClick={startCamera} className="px-4 py-2 rounded-xl border">
                Start camera
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl border"
              >
                Upload homework image
              </button>

              <button
                onClick={startVoiceInput}
                className="px-4 py-2 rounded-xl border"
              >
                {isListening ? "Listening..." : "Speak question"}
              </button>

              <button onClick={askQuestion} className="px-4 py-2 rounded-xl border">
                Ask
              </button>

              <button onClick={generateVisual} className="px-4 py-2 rounded-xl border">
                Generate visual
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleUpload}
              className="hidden"
            />

            <div>
              <label className="block font-medium mb-2">Answer language</label>
              <select
                value={answerLanguage}
                onChange={(e) => setAnswerLanguage(e.target.value)}
                className="border rounded-xl px-3 py-2 w-full"
              >
                <option>English</option>
                <option>Vietnamese</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
                <option>Chinese</option>
                <option>Japanese</option>
                <option>Korean</option>
                <option>Arabic</option>
                <option>Hindi</option>
              </select>
            </div>

            <textarea
              className="w-full border rounded-2xl p-3 min-h-28"
              placeholder="Ask in any language. Example: Giải thích bài toán này giúp mình."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border p-4 min-h-56">
            <h2 className="text-2xl font-semibold mb-2">Tutor response</h2>
            {loading ? (
              <p>Thinking...</p>
            ) : (
              <p className="whitespace-pre-wrap">{answer || "No response yet."}</p>
            )}
          </div>

          <div className="rounded-2xl border p-4 min-h-56">
            <h2 className="text-2xl font-semibold mb-2">Visual explanation</h2>
            {visualSvg ? (
              <div
                dangerouslySetInnerHTML={{ __html: visualSvg }}
                className="w-full rounded-xl border"
              />
            ) : (
              <p>No visual yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
