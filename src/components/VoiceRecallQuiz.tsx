import React, { useState, useEffect, useRef } from 'react';
import { ScreenId, SyllabusModule } from '../types';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { saveQuizResultToFirestore } from '../services/firestoreService';
import { apiKeyService } from '../services/apiKeyService';

interface VoiceRecallQuizProps {
  onNavigate: (screen: ScreenId) => void;
  modules?: SyllabusModule[];
  courseName?: string;
}

interface OralQuestion {
  id: string;
  category: string;
  title: string;
  prompt: string;
  targetConcepts: string[];
  modelAnswerSummary?: string;
}

interface DiagnosticFeedback {
  score?: number;
  retentionDelta?: string;
  correctInsights: string[];
  spokenSummary?: string;
  misconception?: {
    title: string;
    description: string;
    clarification?: string;
    remediationLink?: string;
  };
}

export const VoiceRecallQuiz: React.FC<VoiceRecallQuizProps> = ({
  onNavigate,
  modules = [],
  courseName = '',
}) => {
  const { user } = useGoogleAuth();
  const [currentQuestion, setCurrentQuestion] = useState<OralQuestion | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [quizTimer, setQuizTimer] = useState(120); // 2:00
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isReadingPrompt, setIsReadingPrompt] = useState(false);
  const [isTutorPlaying, setIsTutorPlaying] = useState(false);
  const [retentionDelta, setRetentionDelta] = useState<string>('');
  const [micError, setMicError] = useState<string | null>(null);

  const [transcript, setTranscript] = useState('');
  const [spokenTutorSummary, setSpokenTutorSummary] = useState<string>('');
  const [tutorAudioUrl, setTutorAudioUrl] = useState<string | null>(null);
  const [diagnosticFeedback, setDiagnosticFeedback] = useState<DiagnosticFeedback | null>(null);

  // Dynamic audio frequency bar heights (14 bars)
  const [waveAmplitudes, setWaveAmplitudes] = useState<number[]>([
    0.2, 0.4, 0.6, 0.3, 0.5, 0.8, 0.4, 0.7, 0.5, 0.3, 0.6, 0.2, 0.5, 0.3,
  ]);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const tutorAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load next dynamic question based on genuine syllabus modules
  const handleLoadNextQuestion = async (customTopic?: string) => {
    if (!modules || modules.length === 0) {
      setCurrentQuestion(null);
      return;
    }

    setIsLoadingQuestion(true);
    setQuestionError(null);
    try {
      const topicToPick =
        customTopic ||
        modules[Math.floor(Math.random() * modules.length)]?.name ||
        '';

      const res = await fetch('/api/voice-quiz/question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...apiKeyService.getAiHeaders(),
        },
        body: JSON.stringify({
          topic: topicToPick,
          units: modules,
          courseContext: courseName,
        }),
      });

      const data = await res.json();
      if (res.ok && data.data) {
        setCurrentQuestion(data.data);
        setTranscript('');
        setRecordingSeconds(0);
        setQuizTimer(120);
        setTutorAudioUrl(null);
        setDiagnosticFeedback(null);
        setSpokenTutorSummary('');
      } else {
        setQuestionError(data.message || data.error || 'Failed to generate question. Please verify your Gemini API key.');
      }
    } catch (err: any) {
      setQuestionError(err.message || 'Network error while generating question.');
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  useEffect(() => {
    if (modules && modules.length > 0 && !currentQuestion) {
      handleLoadNextQuestion(modules[0]?.name);
    }
  }, [modules, courseName]);

  // Recording Timer
  useEffect(() => {
    let recInt: any = null;
    if (isRecording) {
      recInt = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(recInt);
  }, [isRecording]);

  // Countdown timer when question is loaded
  useEffect(() => {
    if (!currentQuestion) return;
    const qInt = setInterval(() => {
      setQuizTimer((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(qInt);
  }, [currentQuestion]);

  // Cleanup audio tracks on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (tutorAudioRef.current) {
        tutorAudioRef.current.pause();
      }
    };
  }, []);

  // Keyboard shortcut: Space toggles recording
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'TEXTAREA' && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        toggleRecording();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, currentQuestion]);

  // Start real microphone capture
  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];

    let stream: MediaStream | null = null;

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        } catch (mediaErr: any) {
          console.warn('Physical microphone unavailable or permission denied:', mediaErr?.message);
        }
      }

      if (!stream) {
        setMicError('Microphone permission required to capture audio. You can also type your oral response in the transcript box.');
        setIsRecording(false);
        return;
      }

      streamRef.current = stream;

      // Setup Web Audio Analyser for live visualizer
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = audioContextRef.current || new AudioCtx();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateWave = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          const samples = Array.from({ length: 14 }, (_, i) => {
            const val = dataArray[i * 2] || 0;
            return Math.max(0.18, Math.min(1.0, val / 140));
          });
          setWaveAmplitudes(samples);
          animFrameRef.current = requestAnimationFrame(updateWave);
        };
        updateWave();
      } catch (err) {
        console.warn('AudioContext visualization setup error:', err);
      }

      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ].find((type) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) || '';

      try {
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mimeType || 'audio/webm',
          });
          if (audioBlob.size > 0) {
            await transcribeAudioWithGemini(audioBlob);
          }
        };

        recorder.start(250);
      } catch (recErr) {
        console.warn('MediaRecorder init error:', recErr);
      }

      setIsRecording(true);

      // Start live browser speech recognition if supported
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';
          recognition.onresult = (e: any) => {
            let liveText = '';
            for (let i = 0; i < e.results.length; i++) {
              liveText += e.results[i][0].transcript + ' ';
            }
            if (liveText.trim()) {
              setTranscript(liveText.trim());
            }
          };
          recognition.start();
          recognitionRef.current = recognition;
        } catch {
          // ignore recognition start errors
        }
      }
    } catch (err: any) {
      console.warn('Microphone error handled:', err?.message);
      setMicError('Could not access microphone: ' + (err.message || 'Unknown error'));
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Send recorded audio to backend /api/voice-transcribe
  const transcribeAudioWithGemini = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        const res = await fetch('/api/voice-transcribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...apiKeyService.getAiHeaders(),
          },
          body: JSON.stringify({
            audioBase64: base64Audio,
            mimeType: blob.type || 'audio/webm',
          }),
        });
        const data = await res.json();
        if (data.transcript) {
          setTranscript((prev) => (prev ? `${prev} ${data.transcript}` : data.transcript));
        }
      };
    } catch (err) {
      console.error('Transcription call error:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Evaluate oral response via genuine AI model
  const handleEvaluate = async () => {
    if (isRecording) {
      stopRecording();
    }
    if (!transcript.trim()) {
      setMicError('Please speak or type your answer before requesting diagnostic evaluation.');
      return;
    }

    setIsEvaluating(true);
    setMicError(null);

    try {
      const res = await fetch('/api/voice-quiz-eval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...apiKeyService.getAiHeaders(),
        },
        body: JSON.stringify({
          spokenTranscript: transcript,
          questionTitle: currentQuestion?.title,
          questionPrompt: currentQuestion?.prompt,
          targetConcepts: currentQuestion?.targetConcepts,
        }),
      });

      const json = await res.json();
      if (res.ok && json.data) {
        const d = json.data;
        if (d.retentionDelta) setRetentionDelta(d.retentionDelta);
        if (d.spokenSummary) setSpokenTutorSummary(d.spokenSummary);

        setDiagnosticFeedback({
          score: d.score,
          retentionDelta: d.retentionDelta,
          correctInsights: d.correctInsights || [],
          spokenSummary: d.spokenSummary,
          misconception: d.misconception || undefined,
        });

        // Speak summary using Web Speech API if available
        if (d.spokenSummary && 'speechSynthesis' in window) {
          try {
            const utterance = new SpeechSynthesisUtterance(d.spokenSummary);
            utterance.rate = 1.0;
            utterance.onstart = () => setIsTutorPlaying(true);
            utterance.onend = () => setIsTutorPlaying(false);
            utterance.onerror = () => setIsTutorPlaying(false);
            window.speechSynthesis.speak(utterance);
          } catch {
            // speech synthesis failed
          }
        }

        // Save to Firebase Firestore if logged in
        if (user && currentQuestion) {
          saveQuizResultToFirestore({
            questionTitle: currentQuestion.title,
            transcript,
            score: d.score || 0,
            retentionDelta: d.retentionDelta || '',
            correctInsights: d.correctInsights || [],
            spokenSummary: d.spokenSummary,
            misconception: d.misconception,
          }).catch((err: any) => console.warn('Firestore autosave warning:', err));
        }
      } else {
        setMicError(json.message || json.error || 'Evaluation failed. Please verify your Gemini API key.');
      }
    } catch (err: any) {
      console.error('Voice evaluation error:', err);
      setMicError('Evaluation error: ' + (err.message || 'Service unavailable'));
    } finally {
      setIsEvaluating(false);
    }
  };

  const playTutorAudio = () => {
    if (spokenTutorSummary && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(spokenTutorSummary);
      utterance.onstart = () => setIsTutorPlaying(true);
      utterance.onend = () => setIsTutorPlaying(false);
      utterance.onerror = () => setIsTutorPlaying(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleReadQuestionAloud = () => {
    if (!currentQuestion?.prompt || isReadingPrompt) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsReadingPrompt(true);
      const utterance = new SpeechSynthesisUtterance(currentQuestion.prompt);
      utterance.rate = 0.95;
      utterance.onend = () => setIsReadingPrompt(false);
      utterance.onerror = () => setIsReadingPrompt(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col selection:bg-primary selection:text-on-primary font-body">
      {/* ================= TOP APP BAR ================= */}
      <header className="bg-surface-container border-b border-outline-variant sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Left: Brand & Quiz Context */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
            <button onClick={() => onNavigate('dashboard')} className="flex items-center gap-2.5 cursor-pointer">
              <div className="relative flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping absolute opacity-75"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
              </div>
              <span className="font-headline font-bold text-sm tracking-tight text-on-surface">
                Synapse AI — Active Voice Recall
              </span>
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-outline-variant text-xs text-on-surface-variant font-mono">
              <span className="text-on-surface font-medium">{courseName || 'Oral Exam Practice'}</span>
              {currentQuestion && (
                <>
                  <span className="text-secondary">•</span>
                  <span className="text-primary font-semibold">{currentQuestion.category}</span>
                </>
              )}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 self-end md:self-auto">
            {currentQuestion && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-high border border-outline-variant text-xs font-mono text-primary">
                <span className="material-symbols-outlined !text-sm">schedule</span>
                <span>{formatTimer(quizTimer)}</span>
              </div>
            )}

            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-low border border-outline-variant text-xs font-mono text-tertiary">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
              <span>Gemini Oral Engine</span>
            </div>

            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-outline-variant transition-colors cursor-pointer"
            >
              <span>Exit</span>
              <span className="material-symbols-outlined !text-sm">close</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT VIEW ================= */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Empty State: No Syllabus Uploaded */}
        {(!modules || modules.length === 0) && (
          <section className="bg-surface-container border border-outline-variant rounded-2xl p-10 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-4 text-primary">
              <span className="material-symbols-outlined !text-3xl">psychology</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">No Course Syllabus Uploaded</h2>
            <p className="text-sm text-on-surface-variant max-w-md mb-6 leading-relaxed">
              Oral recall quizzes generate live questions directly from your syllabus topics, theorems, and exam scope. Upload your syllabus to begin active oral recall practice.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('step1-upload')}
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold transition-all shadow-lg shadow-primary/20 hover:bg-primary-fixed flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined !text-base">upload_file</span>
                <span>Upload Syllabus</span>
              </button>
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-4 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-xs font-medium hover:bg-surface-container-highest transition-colors cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          </section>
        )}

        {/* Question Loading State */}
        {modules && modules.length > 0 && isLoadingQuestion && (
          <section className="bg-surface-container border border-outline-variant rounded-xl p-8 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-semibold text-white">Generating dynamic oral question from your syllabus...</p>
            <span className="text-xs text-on-surface-variant font-mono mt-1">Grounding concepts with Gemini 3.8 Flash</span>
          </section>
        )}

        {/* Question Error State */}
        {questionError && (
          <div className="bg-error/15 border border-error/30 text-error p-4 rounded-xl text-xs font-mono flex items-center justify-between">
            <span>{questionError}</span>
            <button
              onClick={() => handleLoadNextQuestion()}
              className="px-3 py-1 rounded bg-error/20 hover:bg-error/30 text-white font-bold transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* 1. Prompt Card */}
        {currentQuestion && !isLoadingQuestion && (
          <section className="bg-surface-container border border-outline-variant rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80"></div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-mono tracking-wider font-semibold uppercase bg-surface-variant text-primary border border-outline-variant">
                    {currentQuestion.category.toUpperCase()}
                  </span>
                  <span className="text-xs text-on-surface-variant font-mono">ID: {currentQuestion.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLoadNextQuestion()}
                    disabled={isLoadingQuestion}
                    className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface bg-surface-container-high px-2.5 py-1 rounded border border-outline-variant font-mono transition-colors cursor-pointer"
                    title="Generate dynamic question from syllabus"
                  >
                    <span className="material-symbols-outlined !text-xs">
                      {isLoadingQuestion ? 'sync' : 'shuffle'}
                    </span>
                    <span>{isLoadingQuestion ? 'Generating...' : 'Next Question'}</span>
                  </button>
                  <button
                    onClick={handleReadQuestionAloud}
                    disabled={isReadingPrompt}
                    className="flex items-center gap-1 text-xs text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded border border-primary/30 font-mono transition-colors cursor-pointer"
                    title="Read question using speech synthesis"
                  >
                    <span className="material-symbols-outlined !text-xs">
                      {isReadingPrompt ? 'graphic_eq' : 'volume_up'}
                    </span>
                    <span>{isReadingPrompt ? 'Reading Prompt...' : 'Listen to Question'}</span>
                  </button>
                  <div className="flex items-center gap-1 text-xs text-tertiary bg-tertiary-container/30 px-2.5 py-1 rounded border border-tertiary/20 font-mono">
                    <span className="material-symbols-outlined !text-xs">psychology</span>
                    <span>Target: {currentQuestion.targetConcepts.length} Concepts</span>
                  </div>
                </div>
              </div>

              <h1 className="text-lg md:text-xl font-bold tracking-tight text-on-surface leading-snug">
                {currentQuestion.prompt}
              </h1>

              {/* Target Concepts Checklist */}
              {currentQuestion.targetConcepts && currentQuestion.targetConcepts.length > 0 && (
                <div className="pt-2">
                  <div className="text-[11px] font-mono uppercase text-on-surface-variant mb-2">Target Cognitive Concepts</div>
                  <div className="flex flex-wrap gap-2">
                    {currentQuestion.targetConcepts.map((concept, cIdx) => (
                      <span
                        key={cIdx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-high border border-outline-variant text-xs text-on-surface font-mono"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 2. Microphone & Audio Visualizer Section */}
        {currentQuestion && (
          <section className="bg-surface-container-low border border-primary/20 rounded-xl p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-lg shadow-primary/5 transition-all">
            <div className="absolute w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none -top-10"></div>

            {/* Model Workflow Tag */}
            <div className="mb-3 flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant text-[11px] font-mono text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span>Gemini Oral Pipeline:</span>
              <span className="text-primary font-medium">3.8 Live / Flash</span>
            </div>

            {/* Mic Button Cluster */}
            <div className="relative flex items-center justify-center my-3">
              {isRecording && (
                <>
                  <div className="absolute w-32 h-32 rounded-full bg-primary/20 border border-primary/40 animate-ping opacity-60"></div>
                  <div className="absolute w-28 h-28 rounded-full bg-primary/30 border border-primary/50 animate-pulse"></div>
                </>
              )}
              <div
                className={`w-24 h-24 rounded-full border flex items-center justify-center p-2 backdrop-blur-sm transition-all duration-300 ${
                  isRecording
                    ? 'bg-primary/25 border-primary shadow-lg shadow-primary/40 ring-4 ring-primary/20 scale-105'
                    : 'bg-surface-container border-outline hover:border-primary/50'
                }`}
              >
                <button
                  onClick={toggleRecording}
                  disabled={isEvaluating}
                  className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer ${
                    isRecording
                      ? 'bg-primary text-on-primary shadow-primary/40 ring-4 ring-primary/30'
                      : 'bg-surface-container-high text-on-surface-variant hover:text-white hover:bg-surface-container-highest'
                  }`}
                  title={isRecording ? 'Click to stop recording' : 'Click to start speaking your answer'}
                >
                  <span className="material-symbols-outlined !text-3xl">
                    {isRecording ? 'mic' : 'mic_none'}
                  </span>
                </button>
              </div>
            </div>

            {/* Live Reactive Waveform Bars */}
            <div className="flex items-center justify-center gap-1.5 h-10 my-4 px-4 w-full max-w-xs">
              {waveAmplitudes.map((amp, idx) => {
                const heightPx = isRecording ? Math.max(6, Math.round(amp * 36)) : 4;
                return (
                  <span
                    key={idx}
                    className={`w-1.5 rounded-full transition-all duration-75 ${
                      isRecording
                        ? idx % 2 === 0
                          ? 'bg-primary shadow-sm shadow-primary/50'
                          : 'bg-tertiary'
                        : 'bg-outline-variant h-1.5'
                    }`}
                    style={{ height: `${heightPx}px` }}
                  ></span>
                );
              })}
            </div>

            {/* Recording Timer & Live Status */}
            <div className="flex flex-col items-center gap-1.5 mb-6 text-center">
              <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant">
                <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-primary animate-pulse' : 'bg-outline'}`}></span>
                <span>
                  {isRecording
                    ? 'Listening... Speak your response clearly.'
                    : isTranscribing
                    ? 'Transcribing audio...'
                    : isEvaluating
                    ? 'Evaluating oral response with Gemini 3.8 Flash...'
                    : isTutorPlaying
                    ? 'AI Tutor speaking evaluation feedback...'
                    : 'Microphone Idle — Ready to Speak'}
                </span>
                {recordingSeconds > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant text-on-surface text-[11px]">
                    ({formatTimer(recordingSeconds)} recorded)
                  </span>
                )}
              </div>

              {micError && (
                <p className="text-[11px] text-amber-400 font-mono bg-amber-950/40 border border-amber-800/40 px-3 py-1 rounded-md max-w-md">
                  {micError}
                </p>
              )}
            </div>

            {/* Tutor Spoken Audio Player Bar (when feedback exists) */}
            {spokenTutorSummary && (
              <div className="w-full max-w-xl mb-6 p-3.5 rounded-xl bg-surface-container border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={playTutorAudio}
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                      isTutorPlaying
                        ? 'bg-primary text-on-primary ring-2 ring-primary/40 animate-pulse'
                        : 'bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30'
                    }`}
                    title={isTutorPlaying ? 'Playing feedback' : 'Listen to AI Tutor voice feedback'}
                  >
                    <span className="material-symbols-outlined !text-lg">
                      {isTutorPlaying ? 'volume_up' : 'play_arrow'}
                    </span>
                  </button>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-primary font-mono">AI Voice Tutor</span>
                    </div>
                    <p className="text-xs text-on-surface/90 italic line-clamp-1">"{spokenTutorSummary}"</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={playTutorAudio}
                    className="px-2.5 py-1 text-[11px] font-mono rounded bg-surface-container-high border border-outline-variant hover:border-primary text-primary transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined !text-xs">replay</span>
                    <span>{isTutorPlaying ? 'Playing' : 'Listen'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center flex-wrap justify-center gap-2.5">
              <button
                onClick={toggleRecording}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant hover:bg-surface-container-highest text-xs font-medium text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined !text-base text-secondary">
                  {isRecording ? 'stop' : 'play_arrow'}
                </span>
                <span>{isRecording ? 'Stop Recording' : 'Start Mic'}</span>
              </button>

              <button
                onClick={() => {
                  setRecordingSeconds(0);
                  setTranscript('');
                  setDiagnosticFeedback(null);
                  setSpokenTutorSummary('');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant hover:bg-surface-container-highest text-xs font-medium text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined !text-base text-secondary">restart_alt</span>
                <span>Reset</span>
              </button>

              <button
                onClick={handleEvaluate}
                disabled={isEvaluating || isTranscribing || !transcript.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary text-xs font-bold transition-all cursor-pointer shadow-md shadow-primary/30 disabled:opacity-50"
              >
                {isEvaluating ? (
                  <>
                    <span className="w-3 h-3 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                    <span>AI Evaluating Response...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined !text-base">auto_awesome</span>
                    <span>Evaluate Oral Answer</span>
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* 3. Real-Time Transcription Text Area */}
        {currentQuestion && (
          <section className="bg-surface-container border border-outline-variant hover:border-primary/40 transition-colors rounded-xl p-5 relative shadow-sm">
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-outline-variant mb-3 gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary !text-base">graphic_eq</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-on-surface font-mono">
                  Spoken Transcript
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-on-surface-variant">
                  {transcript.trim() ? `${transcript.trim().split(/\s+/).length} words` : '0 words'}
                </span>
                {transcript.trim() && (
                  <button
                    onClick={() => navigator.clipboard.writeText(transcript)}
                    className="text-[11px] font-mono text-on-surface-variant hover:text-on-surface bg-surface-container-high px-2 py-0.5 rounded border border-outline-variant transition-colors cursor-pointer"
                    title="Copy transcript text"
                  >
                    Copy
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Speak your answer into the microphone above or type your oral response here before evaluating..."
                className="w-full font-mono text-sm leading-relaxed text-on-surface/95 bg-surface-container-lowest p-4 rounded-lg border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none min-h-[110px] resize-y transition-all placeholder:text-on-surface-variant/50"
                rows={4}
              />
              {isRecording && (
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded bg-surface-container/90 border border-primary/30 text-[11px] font-mono text-primary backdrop-blur-sm pointer-events-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                  <span>Live Audio Stream Active</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 4. AI Feedback Cards: Diagnostic Breakdown (Render ONLY when evaluation exists) */}
        {diagnosticFeedback && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary !text-lg">analytics</span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface font-mono">
                  AI Diagnostic Breakdown & Oral Grading
                </h2>
              </div>
              {retentionDelta && (
                <span className="px-2 py-0.5 rounded bg-surface-container border border-outline-variant text-[11px] font-mono text-tertiary">
                  Retention Delta: {retentionDelta}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {diagnosticFeedback.correctInsights.map((insight, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-tertiary/30 bg-[#065f46]/20 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-tertiary font-semibold text-xs tracking-tight">
                    <span className="material-symbols-outlined !text-base">check_circle</span>
                    <span>✓ Correctly Articulated</span>
                  </div>
                  <p className="text-xs leading-relaxed text-on-surface/85">{insight}</p>
                </div>
              ))}

              {diagnosticFeedback.misconception && (
                <div className="md:col-span-2 p-4 rounded-xl border border-error/40 bg-[#3b1111]/30 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-error font-semibold text-xs tracking-tight">
                      <span className="material-symbols-outlined !text-base">cancel</span>
                      <span>{diagnosticFeedback.misconception.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-error uppercase tracking-wider px-2 py-0.5 rounded bg-error/10 border border-error/20">
                      Conceptual Nuance
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-on-surface/90">{diagnosticFeedback.misconception.description}</p>
                  {diagnosticFeedback.misconception.clarification && (
                    <p className="text-xs text-on-surface-variant font-mono">
                      Clarification: {diagnosticFeedback.misconception.clarification}
                    </p>
                  )}

                  <div className="pt-1 flex items-center gap-2">
                    <button
                      onClick={() => onNavigate('ai-tutor')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-high border border-outline-variant hover:border-primary text-xs font-mono text-on-surface transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-primary !text-sm">auto_awesome</span>
                      <span>Deep-Dive with AI Tutor</span>
                      <span className="material-symbols-outlined !text-xs text-secondary">arrow_forward</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* ================= 5. BOTTOM ACTION BAR ================= */}
      <footer className="bg-surface-container border-t border-outline-variant mt-auto sticky bottom-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-on-surface-variant">
            <span className="material-symbols-outlined !text-sm text-secondary">keyboard</span>
            <span>
              Key shortcut: Press{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-surface-container-highest border border-outline-variant text-on-surface font-semibold">
                [Space]
              </kbd>{' '}
              to toggle mic
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-fixed text-on-primary text-xs font-bold tracking-tight shadow-md shadow-primary/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Back to Dashboard</span>
              <span className="material-symbols-outlined !text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
