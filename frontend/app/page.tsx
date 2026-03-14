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
  const [cameraStarted, setCameraStarted] = useState(false);
  const [visualLoading, setVisualLoading] = useState(false);

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      setCameraStarted(true);
      setUploadedImage(null);
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
        setCameraStarted(false);
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
          answer_language: answerLanguage,
        }),
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

    setVisualLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/generate-visual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: question,
          answer_text: answer,
          answer_language: answerLanguage,
        }),
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
    } finally {
      setVisualLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.22),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(236,72,153,0.18),_transparent_25%),radial-gradient(circle_at_bottom,_rgba(34,197,94,0.14),_transparent_30%)]" />

      <div className="relative mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <header className="mb-8 rounded-[28px] border border-white/10 bg-white/5 px-6 py-6 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-sm text-indigo-200">
                live multimodal tutoring
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
                VisionMentor
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                An AI tutor that sees your homework, understands multilingual questions,
                responds in your chosen language, and creates visual explanations to help
                you learn faster.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                <div className="font-semibold text-white">camera</div>
                <div className="mt-1 text-slate-300">live input</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                <div className="font-semibold text-white">upload</div>
                <div className="mt-1 text-slate-300">screenshots</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                <div className="font-semibold text-white">voice</div>
                <div className="mt-1 text-slate-300">ask naturally</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                <div className="font-semibold text-white">visuals</div>
                <div className="mt-1 text-slate-300">svg diagrams</div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">Input workspace</h2>
                <p className="mt-1 text-sm text-slate-300">
                  Use your camera or upload a homework image, then ask your question.
                </p>
              </div>

              <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
                {uploadedImage ? "uploaded image" : cameraStarted ? "camera active" : "no input yet"}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/30 shadow-inner">
                  {!uploadedImage && (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="aspect-video w-full bg-black object-cover"
                    />
                  )}

                  {uploadedImage && (
                    <img
                      src={uploadedImage}
                      alt="Uploaded homework"
                      className="aspect-video w-full object-contain bg-slate-900"
                    />
                  )}

                  {!cameraStarted && !uploadedImage && (
                    <div className="flex aspect-video items-center justify-center text-center text-slate-400">
                      <div>
                        <p className="text-lg font-medium text-slate-300">No image source selected</p>
                        <p className="mt-2 text-sm">
                          Start the camera or upload a screenshot/photo of your assignment.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <canvas ref={canvasRef} className="hidden" />

                <div className="flex flex-wrap gap-12">
                    <button className="actionBtn primaryBtn" onClick={startCamera}>
                        <span className="btnIcon">📷</span>
                        <span className="btnText">
                        <strong>Start camera</strong>
                        <small>use live input</small>
                        </span>
                    </button>

                    <button
                        className="actionBtn secondaryBtn"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <span className="btnIcon">🖼️</span>
                        <span className="btnText">
                        <strong>Upload image</strong>
                        <small>screenshots or photos</small>
                        </span>
                    </button>

                    <button className="actionBtn secondaryBtn" onClick={startVoiceInput}>
                        <span className="btnIcon">🎙️</span>
                        <span className="btnText">
                        <strong>{isListening ? "Listening..." : "Speak question"}</strong>
                        <small>voice input</small>
                        </span>
                    </button>

                    <button className="actionBtn successBtn" onClick={askQuestion} disabled={loading}>
                        <span className="btnIcon">🧠</span>
                        <span className="btnText">
                        <strong>{loading ? "Thinking..." : "Ask tutor"}</strong>
                        <small>analyze the problem</small>
                        </span>
                    </button>

                    <button
                        className="actionBtn accentBtn"
                        onClick={generateVisual}
                        disabled={!answer || visualLoading}
                    >
                        <span className="btnIcon">✨</span>
                        <span className="btnText">
                        <strong>{visualLoading ? "Generating..." : "Generate visual"}</strong>
                        <small>create a diagram</small>
                        </span>
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
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] border border-white/10 bg-slate-900/60 p-4">
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Answer language
                  </label>
                  <select
                    value={answerLanguage}
                    onChange={(e) => setAnswerLanguage(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-indigo-400"
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

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                    Ask in any language. VisionMentor will respond in the language you choose.
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-slate-900/60 p-4">
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Your question
                  </label>
                  <textarea
                    className="min-h-56 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-400"
                    placeholder={`Ask in any language.\n\nExamples:\n- Help me solve this math problem.\n- Giải thích bài toán này giúp mình.\n- Explícame esta pregunta paso a paso.`}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-white">Tutor response</h2>
                  <p className="mt-1 text-sm text-slate-300">
                    A calm, step-by-step explanation grounded in the homework image.
                  </p>
                </div>

                <div
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    loading
                      ? "bg-amber-500/15 text-amber-200 border border-amber-400/20"
                      : "bg-emerald-500/15 text-emerald-200 border border-emerald-400/20"
                  }`}
                >
                  {loading ? "thinking..." : "ready"}
                </div>
              </div>

              <div className="min-h-[280px] rounded-[24px] border border-white/10 bg-slate-950/80 p-5">
                {loading ? (
                  <div className="space-y-4">
                    <div className="h-4 w-3/4 animate-pulse rounded-full bg-white/10" />
                    <div className="h-4 w-full animate-pulse rounded-full bg-white/10" />
                    <div className="h-4 w-5/6 animate-pulse rounded-full bg-white/10" />
                    <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/10" />
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-[15px] leading-7 text-slate-200">
                    {answer || "No response yet. Ask a question to get started."}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
              <div className="mb-4">
                <h2 className="text-2xl font-semibold text-white">Visual explanation</h2>
                <p className="mt-1 text-sm text-slate-300">
                  Generate a supporting diagram to make the concept easier to understand.
                </p>
              </div>

              <div className="min-h-[320px] overflow-auto rounded-[24px] border border-white/10 bg-white p-4 text-black">
                {visualSvg ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: visualSvg }}
                    className="w-full"
                  />
                ) : (
                  <div className="flex min-h-[280px] items-center justify-center text-center text-slate-500">
                    <div>
                      <p className="text-lg font-medium text-slate-700">No visual yet</p>
                      <p className="mt-2 text-sm">
                        Ask the tutor first, then click “Generate visual”.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </section>
        </div>
      </div>
    </main>
  );
}
