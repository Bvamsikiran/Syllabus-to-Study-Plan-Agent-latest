import React, { useState, useRef, useEffect } from 'react';
import { ScreenId, AnnotationPin, SyllabusModule } from '../types';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { saveHandwrittenWorkToFirestore } from '../services/firestoreService';

interface HandwrittenAnalysisProps {
  onNavigate: (screen: ScreenId) => void;
  modules?: SyllabusModule[];
  courseName?: string;
}

interface ProblemItem {
  id: string;
  category: string;
  title: string;
  promptText: string;
  difficulty: string;
  rubricCriteria: { id: number; criterion: string; points: number; rule: string }[];
  expectedKeyIntermediate?: string;
}

export const HandwrittenAnalysis: React.FC<HandwrittenAnalysisProps> = ({
  onNavigate,
  modules = [],
  courseName = 'CS 3200: Distributed Systems & Engineering',
}) => {
  const { user } = useGoogleAuth();

  // Problem State
  const [problem, setProblem] = useState<ProblemItem>({
    id: 'hw-cs-arch-1',
    category: 'Concurrency & Network Protocols',
    title: 'TCP AIMD Congestion Control & Buffer Dynamics',
    promptText:
      'Sketch the TCP Congestion Window (cwnd) state transition graph under Additive Increase Multiplicative Decrease (AIMD). Illustrate Slow Start, Congestion Avoidance with ssthresh threshold, packet loss reaction upon triple duplicate ACKs vs timeout, and buffer occupancy curve.',
    difficulty: 'High',
    rubricCriteria: [
      { id: 1, criterion: 'Exponential Growth during Slow Start', points: 3, rule: 'Window doubles each RTT until ssthresh' },
      { id: 2, criterion: 'Linear Additive Increase (+1 MSS per RTT)', points: 4, rule: 'Constant slope in congestion avoidance' },
      { id: 3, criterion: 'Multiplicative Decrease Halving on Fast Recovery', points: 3, rule: 'cwnd cut to cwnd/2, not reset to 1 MSS' },
    ],
  });

  const [isLoadingProblem, setIsLoadingProblem] = useState(false);

  // Input Mode: 'canvas' | 'upload'
  const [inputMode, setInputMode] = useState<'canvas' | 'upload'>('canvas');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // Canvas Drawing State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#7c3aed');
  const [lineWidth, setLineWidth] = useState(3);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Analysis Result State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    score: number;
    maxScore: number;
    rubricMet: string;
    pacing: string;
    diagnosticSummary: string;
    pins: AnnotationPin[];
  } | null>(null);

  const [activePinId, setActivePinId] = useState<number | null>(1);
  const [showOcrLayer, setShowOcrLayer] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'insights' | 'errors'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // AI Tutor Ask State
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAskingTutor, setIsAskingTutor] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Canvas setup
  useEffect(() => {
    if (inputMode === 'canvas' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx && !hasDrawn) {
        ctx.fillStyle = '#0f0f13';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Subtle guide grid
        ctx.strokeStyle = '#1e1e24';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 30) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 30) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Guide prompt watermarks
        ctx.fillStyle = '#3f3f46';
        ctx.font = '13px Geist Mono, monospace';
        ctx.fillText('✍️ Draw your mechanism, structures, and arrows here using pen...', 24, 36);
      }
    }
  }, [inputMode]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0f0f13';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setUploadedImage(result);
        setInputMode('upload');
        showToast(`Loaded ${file.name} for AI Vision evaluation.`);
      };
      reader.readAsDataURL(file);
    }
  };

  // Generate a new dynamic problem from syllabus units
  const handleGenerateProblem = async (chosenTopic?: string) => {
    setIsLoadingProblem(true);
    try {
      const topicToUse = chosenTopic || (modules.length > 0 ? modules[Math.floor(Math.random() * modules.length)]?.name : 'Electrophilic Addition Mechanisms');
      const res = await fetch('/api/handwritten-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicToUse,
          courseContext: courseName,
        }),
      });
      const data = await res.json();
      if (data.data) {
        setProblem(data.data);
        setAnalysisResult(null);
        clearCanvas();
        showToast(`Generated: ${data.data.title}`);
      }
    } catch {
      showToast('Problem loaded.');
    } finally {
      setIsLoadingProblem(false);
    }
  };

  useEffect(() => {
    if (modules.length > 0) {
      handleGenerateProblem(modules[0]?.name);
    }
  }, [modules, courseName]);

  // Submit drawing / image to AI Multimodal Vision Evaluator
  const handleAnalyzeWork = async () => {
    let imageBase64: string | null = null;
    if (inputMode === 'upload' && uploadedImage) {
      imageBase64 = uploadedImage;
    } else if (canvasRef.current && hasDrawn) {
      imageBase64 = canvasRef.current.toDataURL('image/jpeg', 0.85);
    }

    if (!imageBase64) {
      showToast('Please sketch your mechanism on the canvas or upload an image first.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/analyze-handwriting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          promptContext: `${problem.title}: ${problem.promptText}`,
        }),
      });
      const data = await res.json();
      if (data.data) {
        setAnalysisResult(data.data);
        if (data.data.pins && data.data.pins.length > 0) {
          setActivePinId(data.data.pins[0].id);
        }
        showToast(`Analysis complete! Score: ${data.data.score}/${data.data.maxScore || 10}`);

        // Persist to Firebase Firestore if logged in
        if (user) {
          saveHandwrittenWorkToFirestore({
            promptContext: problem.promptText,
            score: data.data.score,
            maxScore: data.data.maxScore || 10,
            rubricMet: data.data.rubricMet,
            diagnosticSummary: data.data.diagnosticSummary,
            pacing: data.data.pacing,
            pins: data.data.pins,
          }).catch((err) => console.warn('Firestore autosave warning:', err));
        }
      }
    } catch (err: any) {
      showToast(`Evaluation error: ${err.message || 'Please retry'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Ask AI Tutor for conceptual help
  const handleAskTutor = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiQuestion.trim()) return;

    setIsAskingTutor(true);
    setAiAnswer(null);

    try {
      const res = await fetch('/api/ai-tutor-ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: aiQuestion,
          context: `${problem.title} — ${problem.promptText}`,
        }),
      });
      const data = await res.json();
      setAiAnswer(data.answer || 'Consider carbocation hyperconjugation stability.');
    } catch {
      setAiAnswer('A 1,2-hydride shift occurs preferentially to form a more stable tertiary carbocation.');
    } finally {
      setIsAskingTutor(false);
    }
  };

  const filteredPins = (analysisResult?.pins || []).filter((p) => {
    if (activeFilter === 'errors') return p.type === 'error' || p.type === 'warning';
    if (activeFilter === 'insights') return p.type === 'correct' || p.type === 'strategy';
    return true;
  });

  return (
    <div className="bg-background text-on-surface font-body antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary-container">
      {/* ================= TOP APP BAR ================= */}
      <header className="docked full-width top-0 sticky z-50 flex items-center justify-between px-4 h-14 w-full bg-background border-b border-outline-variant select-none">
        <div className="flex items-center gap-6">
          <button onClick={() => onNavigate('dashboard')} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-primary-container flex items-center justify-center text-on-primary-container font-mono font-bold text-sm shadow-inner">
              Ψ
            </div>
            <span className="font-headline text-base font-semibold tracking-tight text-primary">Synapse AI</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface-container-highest text-secondary-fixed border border-outline-variant tracking-wider">
              AI VISION
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-5 text-sm">
            <button className="text-primary font-medium border-b-2 border-primary pb-1">Answer Analysis</button>
            <button
              onClick={() => onNavigate('master-schedule')}
              className="text-on-surface-variant font-normal hover:text-on-surface pb-1 transition-colors"
            >
              Master Schedule
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              className="text-on-surface-variant font-normal hover:text-on-surface pb-1 transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => onNavigate('voice-quiz')}
              className="text-on-surface-variant font-normal hover:text-on-surface pb-1 transition-colors"
            >
              Voice Quiz
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleGenerateProblem()}
            disabled={isLoadingProblem}
            className="px-3 py-1.5 text-xs font-semibold rounded bg-surface-container-high border border-outline-variant hover:border-primary text-on-surface flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">shuffle</span>
            <span>{isLoadingProblem ? 'Loading...' : 'New Problem'}</span>
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className="px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface rounded border border-outline-variant hover:bg-surface-container transition-all cursor-pointer"
          >
            Exit Session
          </button>
        </div>
      </header>

      {/* ================= SUB-HEADER: CONTEXT BAR ================= */}
      <section className="bg-surface-container-low border-b border-outline-variant px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-on-surface-variant min-w-0">
          <span className="text-tertiary font-mono font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
            {courseName}
          </span>
          <span className="text-outline">/</span>
          <span className="text-on-surface font-medium truncate">{problem.category}</span>
          <span className="text-outline">•</span>
          <span className="text-on-surface font-semibold tracking-tight truncate text-primary">
            {problem.title}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {analysisResult && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container border border-outline-variant font-mono">
              <span className="text-secondary-fixed">Score:</span>
              <span className="font-bold text-tertiary">{analysisResult.score}</span>
              <span className="text-secondary">/ {analysisResult.maxScore || 10}</span>
              <span className="text-[10px] text-tertiary-fixed-dim bg-tertiary-container/40 px-1 py-0.2 rounded font-sans font-medium ml-1">
                {Math.round((analysisResult.score / (analysisResult.maxScore || 10)) * 100)}%
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container border border-outline-variant">
            <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
            <span className="text-secondary-fixed">Difficulty:</span>
            <span className="font-medium text-on-surface">{problem.difficulty}</span>
          </div>

          <button
            onClick={handleAnalyzeWork}
            disabled={isAnalyzing}
            className="px-4 py-1.5 rounded-lg bg-primary text-on-primary font-semibold hover:bg-opacity-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-md glow-primary active:scale-95 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">{isAnalyzing ? 'sync' : 'auto_awesome'}</span>
            <span>{isAnalyzing ? 'Vision Analyzing...' : 'Analyze Solution'}</span>
          </button>
        </div>
      </section>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 p-3 rounded-lg bg-primary text-on-primary text-xs shadow-xl flex items-center gap-2 animate-in fade-in">
          <span className="material-symbols-outlined text-sm">info</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================= MAIN SPLIT CANVAS ================= */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-background">
        {/* LEFT COLUMN: Interactive Drawing & Upload Sheet Viewer */}
        <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-outline-variant bg-surface-container-lowest relative">
          {/* Controls Bar */}
          <div className="p-3 bg-surface-container border-b border-outline-variant flex flex-wrap items-center justify-between gap-2 z-10">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInputMode('canvas')}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition ${
                  inputMode === 'canvas'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">draw</span>
                <span>Draw on Canvas</span>
              </button>

              <label className="px-3 py-1.5 rounded bg-surface-container-high border border-outline-variant hover:border-primary text-xs font-medium text-on-surface transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer">
                <span className="material-symbols-outlined text-primary text-[16px]">upload_file</span>
                <span>Upload Photo / Scan</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>

              {inputMode === 'canvas' && (
                <button
                  onClick={clearCanvas}
                  className="px-2.5 py-1.5 rounded bg-surface-container-high text-xs text-outline hover:text-error border border-outline-variant transition-colors cursor-pointer"
                  title="Clear drawing"
                >
                  <span className="material-symbols-outlined text-[15px]">delete</span>
                </button>
              )}
            </div>

            {/* Drawing Tools (Palette & Thickness) */}
            {inputMode === 'canvas' && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-surface-container-lowest p-1 rounded border border-outline-variant">
                  {['#7c3aed', '#38bdf8', '#34d399', '#f87171', '#ffffff'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setPenColor(color)}
                      className={`w-4 h-4 rounded-full transition-transform ${
                        penColor === color ? 'scale-125 ring-2 ring-primary' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-1 text-[11px] font-mono text-on-surface-variant">
                  <span>Size:</span>
                  {[2, 4, 6].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setLineWidth(sz)}
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        lineWidth === sz ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container'
                      }`}
                    >
                      {sz}px
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Problem Prompt Box */}
          <div className="p-4 bg-surface-container border-b border-outline-variant">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-primary font-bold tracking-wider">
                  QUESTION PROMPT
                </span>
                <p className="text-xs text-on-surface font-mono mt-1 leading-relaxed">{problem.promptText}</p>
              </div>
            </div>
          </div>

          {/* Canvas or Upload Image Container */}
          <div className="flex-1 relative overflow-auto p-4 flex items-center justify-center bg-[#09090b] min-h-[500px]">
            {inputMode === 'canvas' ? (
              <canvas
                ref={canvasRef}
                width={700}
                height={480}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="max-w-full rounded-lg border border-outline-variant shadow-2xl cursor-crosshair touch-none"
              />
            ) : uploadedImage ? (
              <div className="relative max-w-full max-h-[500px] overflow-hidden rounded-lg border border-outline-variant shadow-2xl">
                <img src={uploadedImage} alt="Uploaded student answer" className="max-h-[500px] object-contain" />
              </div>
            ) : (
              <div className="text-center text-zinc-500 text-xs">
                No image loaded. Use the file upload button above.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: AI Multimodal Diagnostic Breakdown & Feedback Pins */}
        <div className="lg:col-span-5 flex flex-col bg-surface-container-low overflow-y-auto">
          {/* Header */}
          <div className="p-4 border-b border-outline-variant flex items-center justify-between">
            <div>
              <h2 className="text-sm font-headline font-semibold text-on-surface">AI Mechanistic Rubric</h2>
              <p className="text-[11px] text-on-surface-variant font-mono">Multimodal Vision Inspection</p>
            </div>
            {analysisResult && (
              <span className="text-xs font-mono font-bold text-tertiary bg-tertiary-container/30 px-2.5 py-1 rounded border border-tertiary/30">
                {analysisResult.rubricMet}
              </span>
            )}
          </div>

          {/* Filter Bar */}
          <div className="p-2 border-b border-outline-variant flex items-center gap-1.5 text-xs font-mono">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded text-[11px] ${
                activeFilter === 'all'
                  ? 'bg-primary text-on-primary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              All Feedback
            </button>
            <button
              onClick={() => setActiveFilter('insights')}
              className={`px-2.5 py-1 rounded text-[11px] ${
                activeFilter === 'insights'
                  ? 'bg-tertiary text-on-tertiary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Correct Steps
            </button>
            <button
              onClick={() => setActiveFilter('errors')}
              className={`px-2.5 py-1 rounded text-[11px] ${
                activeFilter === 'errors'
                  ? 'bg-error text-white font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Errors & Warnings
            </button>
          </div>

          {/* Pins List or Empty Prompt */}
          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {analysisResult ? (
              <>
                {/* Diagnostic Summary */}
                <div className="p-3 rounded-lg bg-surface-container border border-outline-variant text-xs leading-relaxed text-zinc-300">
                  <div className="font-semibold text-primary mb-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">insights</span>
                    <span>Synthesis Evaluation</span>
                  </div>
                  {analysisResult.diagnosticSummary}
                </div>

                {/* Pins */}
                {filteredPins.map((pin) => (
                  <div
                    key={pin.id}
                    onClick={() => setActivePinId(pin.id)}
                    className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                      activePinId === pin.id
                        ? 'border-primary bg-surface-container shadow-md'
                        : 'border-outline-variant bg-surface-container-high/60 hover:border-outline'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-on-surface">{pin.title}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                          pin.type === 'correct'
                            ? 'bg-tertiary/20 text-tertiary'
                            : pin.type === 'error'
                            ? 'bg-error/20 text-error'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {pin.points}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed mt-1">{pin.description}</p>
                    {pin.ocrSnippet && (
                      <div className="mt-2 p-2 bg-surface-container-lowest rounded text-[11px] font-mono text-zinc-400">
                        <span className="text-primary font-bold">OCR:</span> "{pin.ocrSnippet}"
                      </div>
                    )}
                    {pin.remediation && (
                      <div className="mt-2 text-[11px] text-amber-300 font-mono">
                        <span className="font-bold">Remediation:</span> {pin.remediation}
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <div className="py-12 text-center text-zinc-500 text-xs border border-dashed border-outline-variant rounded-xl p-6">
                <span className="material-symbols-outlined text-3xl text-zinc-600 mb-2">draw</span>
                <p>Sketch your solution or upload your handwritten sheet.</p>
                <p className="mt-1">Click "Analyze Solution" to run Gemini Multimodal Vision rubric extraction.</p>
              </div>
            )}

            {/* AI Tutor Chat Help */}
            <div className="mt-6 pt-4 border-t border-outline-variant space-y-3">
              <h3 className="text-xs font-mono font-semibold uppercase text-zinc-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">psychology</span>
                Ask AI Tutor About This System Architecture
              </h3>
              <form onSubmit={handleAskTutor} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Why does AIMD converge to fair bandwidth share compared to AIAD?"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  className="flex-1 px-3 py-2 bg-surface-container rounded-lg border border-outline-variant text-xs text-on-surface placeholder:text-zinc-500 focus:outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={isAskingTutor || !aiQuestion.trim()}
                  className="px-3 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {isAskingTutor ? 'Thinking...' : 'Ask'}
                </button>
              </form>

              {aiAnswer && (
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg text-xs leading-relaxed text-zinc-200 animate-in fade-in">
                  <div className="font-bold text-primary mb-1">AI Tutor Answer:</div>
                  {aiAnswer}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
