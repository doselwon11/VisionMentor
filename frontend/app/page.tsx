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
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [visualSvg, setVisualSvg] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [visualLoading, setVisualLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedPdf, setUploadedPdf] = useState<File | null>(null);
  const [uploadedPdfName, setUploadedPdfName] = useState<string>("");

  const [answerLanguage, setAnswerLanguage] = useState("English");
  const [cameraStarted, setCameraStarted] = useState(false);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraStarted(true);
      setUploadedImage(null);
      setUploadedPdf(null);
      setUploadedPdfName("");
    } catch {
      alert("Could not access the camera.");
    }
  }

  function stopCameraStream() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
    setCameraStarted(false);
  }

  function captureFrame(): string | null {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !video.videoWidth || !video.videoHeight) return null;

    const maxWidth = 960;
    const scale = Math.min(1, maxWidth / video.videoWidth);

    canvas.width = Math.floor(video.videoWidth * scale);
    canvas.height = Math.floor(video.videoHeight * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", 0.72).split(",")[1];
  }

  function getCurrentImageBase64(): string | null {
    if (uploadedImage) {
      return uploadedImage.split(",")[1];
    }
    return captureFrame();
  }

  function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 1200;
        const scale = Math.min(1, maxWidth / img.width);

        canvas.width = Math.floor(img.width * scale);
        canvas.height = Math.floor(img.height * scale);

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL("image/jpeg", 0.78);

        stopCameraStream();
        setUploadedImage(compressed);
        setUploadedPdf(null);
        setUploadedPdfName("");
      };

      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  }

  function handlePdfUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    stopCameraStream();
    setUploadedPdf(file);
    setUploadedPdfName(file.name);
    setUploadedImage(null);
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
    if (loading) return;
    if (!question.trim()) {
        alert("Please provide a question.");
        return;
    }

    setLoading(true);
    setAnswer("VisionMentor is analyzing your problem...");
    setVisualSvg(null);

    try {
        let res: Response;

        if (uploadedPdf) {
        // pdf flow
        const formData = new FormData();
        formData.append("file", uploadedPdf);
        formData.append("question", question.trim());
        formData.append("answer_language", answerLanguage);

        res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/ask-pdf`, {
            method: "POST",
            body: formData,
        });
        } else {
        // image / camera flow
        const image_base64 = getCurrentImageBase64();

        if (!image_base64) {
            throw new Error("Please start the camera, upload an image, or upload a PDF.");
        }

        res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/ask`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            question: question.trim(),
            image_base64,
            answer_language: answerLanguage,
            }),
        });
        }

        let data: any = {};
        try {
        data = await res.json();
        } catch {
        throw new Error("The server returned an unreadable response.");
        }

        if (!res.ok) {
        const message = String(data?.detail || data?.error || "Request failed.");

        if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
            throw new Error(
            "VisionMentor has temporarily hit the Gemini quota limit. Please wait a little and try again."
            );
        }

        throw new Error(message);
        }

        const finalAnswer = String(data?.answer_text || "").trim();

        if (!finalAnswer) {
        throw new Error("No answer was returned by the tutor.");
        }

        setAnswer(finalAnswer);

        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(finalAnswer);
        speechSynthesis.speak(utter);
    } catch (error: any) {
        const message = String(error?.message || "Something went wrong.");

        if (
        message.includes("429") ||
        message.includes("RESOURCE_EXHAUSTED") ||
        message.toLowerCase().includes("quota")
        ) {
        setAnswer(
            "VisionMentor has temporarily hit the Gemini quota limit. Please wait a little and try again."
        );
        } else {
        setAnswer(`Error: ${message}`);
        }
    } finally {
        setLoading(false);
    }
}

  async function generateVisual() {
    if (!answer || visualLoading || loading) return;

    setVisualLoading(true);
    setVisualSvg(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/generate-visual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: question || "Homework concept",
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
        const message = String(error.message || "");
        if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
            alert("Visual generation is temporarily unavailable because the Gemini quota limit was reached. Please wait and try again.");
        } else {
            alert(message);
        }
    } finally {
      setVisualLoading(false);
    }
  }

  function currentInputLabel() {
    if (uploadedPdf) return "pdf uploaded";
    if (uploadedImage) return "uploaded image";
    if (cameraStarted) return "camera active";
    return "no input yet";
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.22),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(236,72,153,0.18),_transparent_25%),radial-gradient(circle_at_bottom,_rgba(34,197,94,0.14),_transparent_30%)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10">
        <header className="mb-8 rounded-[28px] border border-white/10 bg-white/5 px-5 py-6 shadow-2xl backdrop-blur-xl sm:px-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-sm text-indigo-200">
                live multimodal tutoring
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
                VisionMentor
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                An AI tutor that understands your explicit question first, uses images or PDFs
                as supporting context, responds in your chosen language, and creates visual
                explanations to help you learn faster.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                <div className="font-semibold text-white">camera</div>
                <div className="mt-1 text-slate-300">live input</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                <div className="font-semibold text-white">upload</div>
                <div className="mt-1 text-slate-300">images + pdfs</div>
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

        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">Input workspace</h2>
                <p className="mt-1 text-sm text-slate-300">
                  Ask by voice or text. Your question takes priority. Images and PDFs are used
                  as supporting context.
                </p>
              </div>

              <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
                {currentInputLabel()}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/30 shadow-inner">
                  {!uploadedImage && !uploadedPdf && (
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

                  {uploadedPdf && (
                    <div className="flex aspect-video items-center justify-center bg-slate-900 px-6 text-center">
                      <div>
                        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/20 text-3xl">
                          📄
                        </div>
                        <p className="text-lg font-semibold text-white">PDF ready</p>
                        <p className="mt-2 break-all text-sm text-slate-300">{uploadedPdfName}</p>
                        <p className="mt-3 text-sm text-slate-400">
                          VisionMentor will analyze the uploaded document together with your question.
                        </p>
                      </div>
                    </div>
                  )}

                  {!cameraStarted && !uploadedImage && !uploadedPdf && (
                    <div className="flex aspect-video items-center justify-center text-center text-slate-400">
                      <div>
                        <p className="text-lg font-medium text-slate-300">No source selected</p>
                        <p className="mt-2 text-sm">
                          Start the camera, upload an image, or upload a PDF document.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <canvas ref={canvasRef} className="hidden" />

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  <button
                    className="flex min-h-[76px] items-center gap-3 rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-500 px-4 py-4 text-left shadow-lg shadow-indigo-900/30 transition hover:scale-[1.01] hover:brightness-110"
                    onClick={startCamera}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-xl">
                      📷
                    </div>
                    <div>
                      <div className="font-semibold text-white">Start camera</div>
                      <div className="text-sm text-indigo-100">use live input</div>
                    </div>
                  </button>

                  <button
                    className="flex min-h-[76px] items-center gap-3 rounded-3xl border border-white/10 bg-white/10 px-4 py-4 text-left transition hover:scale-[1.01] hover:bg-white/15"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl">
                      🖼️
                    </div>
                    <div>
                      <div className="font-semibold text-white">Upload image</div>
                      <div className="text-sm text-slate-300">screenshots or photos</div>
                    </div>
                  </button>

                  <button
                    className="flex min-h-[76px] items-center gap-3 rounded-3xl border border-white/10 bg-white/10 px-4 py-4 text-left transition hover:scale-[1.01] hover:bg-white/15"
                    onClick={() => pdfInputRef.current?.click()}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl">
                      📄
                    </div>
                    <div>
                      <div className="font-semibold text-white">Upload PDF</div>
                      <div className="text-sm text-slate-300">analyze document</div>
                    </div>
                  </button>

                  <button
                    className="flex min-h-[76px] items-center gap-3 rounded-3xl border border-white/10 bg-white/10 px-4 py-4 text-left transition hover:scale-[1.01] hover:bg-white/15"
                    onClick={startVoiceInput}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-xl">
                      🎙️
                    </div>
                    <div>
                      <div className="font-semibold text-white">
                        {isListening ? "Listening..." : "Speak question"}
                      </div>
                      <div className="text-sm text-slate-300">voice input</div>
                    </div>
                  </button>

                  <button
                    className="flex min-h-[76px] items-center gap-3 rounded-3xl bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-4 text-left shadow-lg shadow-emerald-900/30 transition hover:scale-[1.01] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                    onClick={askQuestion}
                    disabled={loading}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-xl">
                      🧠
                    </div>
                    <div>
                      <div className="font-semibold text-white">
                        {loading ? "Thinking..." : "Ask tutor"}
                      </div>
                      <div className="text-sm text-emerald-100">analyze the problem</div>
                    </div>
                  </button>

                  <button
                    className="flex min-h-[76px] items-center gap-3 rounded-3xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-4 py-4 text-left shadow-lg shadow-pink-900/30 transition hover:scale-[1.01] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                    onClick={generateVisual}
                    disabled={!answer || loading || visualLoading}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-xl">
                      ✨
                    </div>
                    <div>
                      <div className="font-semibold text-white">
                        {visualLoading ? "Generating..." : "Generate visual"}
                      </div>
                      <div className="text-sm text-pink-100">create a diagram</div>
                    </div>
                  </button>
                </div>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
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
                    Ask in any language. VisionMentor will answer in the language you choose.
                  </div>

                  <div className="mt-3 rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-3 text-sm text-indigo-100">
                    Voice or typed question takes priority. Uploaded images and PDFs are treated
                    as supporting context.
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-slate-900/60 p-4">
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Your question
                  </label>
                  <textarea
                    className="min-h-56 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-4 text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-400"
                    placeholder={`Ask in any language.\n\nExamples:\n- Help me solve this math problem.\n- Giải thích bài toán này giúp mình.\n- Explícame esta pregunta paso a paso.\n- Please explain dynamic programming.`}
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
                    VisionMentor answers your explicit question first and uses the uploaded content
                    as supporting context.
                  </p>
                </div>

                <div
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    loading
                      ? "border border-amber-400/20 bg-amber-500/15 text-amber-200"
                      : "border border-emerald-400/20 bg-emerald-500/15 text-emerald-200"
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
                {visualLoading ? (
                  <div className="flex min-h-[280px] items-center justify-center text-center text-slate-500">
                    <div>
                      <p className="text-lg font-medium text-slate-700">Generating visual...</p>
                      <p className="mt-2 text-sm">
                        VisionMentor is creating a diagram for your explanation.
                      </p>
                    </div>
                  </div>
                ) : visualSvg ? (
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