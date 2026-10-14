import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Sparkles,
  Volume2,
  VolumeX,
  BookOpen,
  ChevronRight,
  Minus,
  X,
  FileText,
  Cpu,
  RefreshCw,
  Play,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VoiceTurn, GroundedSource, SyllabusModule, ResourceItem } from '../types';
import { GeminiLiveSession, LiveSessionStatus } from '../lib/live';
import { SessionKnowledgeBase } from '../lib/knowledge';
import { ragService } from '../services/ragService';
import { saveVoiceSessionToFirestore } from '../services/firestoreService';
import { useGoogleAuth } from '../context/GoogleAuthContext';

interface VoiceCoachPanelProps {
  courseName?: string;
  modules?: SyllabusModule[];
  resources?: ResourceItem[];
  syllabusText?: string;
  isDocked?: boolean;
  onMinimize?: () => void;
  onClose?: () => void;
}

export const VoiceCoachPanel: React.FC<VoiceCoachPanelProps> = ({
  courseName = 'GATE CS & Data Science',
  modules = [],
  resources = [],
  syllabusText = '',
  isDocked = true,
  onMinimize,
  onClose,
}) => {
  const { user } = useGoogleAuth();

  // Voice session states
  const [sessionStatus, setSessionStatus] = useState<LiveSessionStatus>('idle');
  const [statusDetail, setStatusDetail] = useState<string>('Ready to start oral voice session.');
  const [engineMode, setEngineMode] = useState<'gemini-live' | 'gemma-local'>('gemini-live');
  const [selectedGemmaModel, setSelectedGemmaModel] = useState<'gemma3:4b' | 'gemma-4:12b' | 'gemma-4:31b'>('gemma3:4b');
  const [turns, setTurns] = useState<VoiceTurn[]>([
    {
      id: 'seed-turn-1',
      role: 'user',
      text: 'Can you explain what is meant by time complexity in data structures?',
      timestamp: Date.now() - 60000,
    },
    {
      id: 'seed-turn-2',
      role: 'assistant',
      text: 'Sure! Time complexity tells us how the running time of an algorithm grows with the size of the input. For example, searching in a balanced binary search tree is O(log n), while a linear search is O(n)...',
      timestamp: Date.now() - 50000,
      sources: [
        {
          id: 's1',
          title: 'DSA_Notes.pdf',
          filename: 'DSA_Notes.pdf',
          page: 12,
          section: 'Binary Search Trees',
          snippet: 'Searching in balanced BST takes O(log n) time.',
        },
        {
          id: 's2',
          title: 'Algorithms_Chapter3.pdf',
          filename: 'Algorithms_Chapter3.pdf',
          page: 8,
          section: 'Time Complexity',
          snippet: 'Big-O notation specifies asymptotic upper bound.',
        },
      ],
    },
  ]);

  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [isLiveUser, setIsLiveUser] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string>(() => `voice_${Date.now()}`);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(16);
  const [totalSeconds, setTotalSeconds] = useState<number>(84);
  const [activeSources, setActiveSources] = useState<GroundedSource[]>([
    {
      id: 'src-1',
      title: 'DSA_Notes.pdf',
      filename: 'DSA_Notes.pdf',
      page: 12,
      section: 'Binary Search Trees',
    },
    {
      id: 'src-2',
      title: 'Algorithms_Chapter3.pdf',
      filename: 'Algorithms_Chapter3.pdf',
      page: 8,
      section: 'Time Complexity',
    },
  ]);

  const liveSessionRef = useRef<GeminiLiveSession | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptBottomRef = useRef<HTMLDivElement | null>(null);

  // Timer tick for call duration
  useEffect(() => {
    if (sessionStatus === 'speaking' || sessionStatus === 'listening') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionStatus]);

  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, liveTranscript]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Start Voice Session
  const handleStartSession = async () => {
    setSessionStatus('connecting');
    setStatusDetail('Provisioning short-lived session token...');

    if (engineMode === 'gemini-live') {
      try {
        const tokenRes = await fetch('/api/voice/live-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(user ? { Authorization: `Bearer ${await user.getIdToken()}` } : {}),
          },
        });

        if (!tokenRes.ok) {
          const errData = await tokenRes.json();
          // Fallback seamlessly to Local Gemma Dual-Engine
          console.warn('[VoiceCoach] Live S2S token unavailable, switching to Local Gemma Engine:', errData.error);
          setEngineMode('gemma-local');
          startLocalGemmaVoice();
          return;
        }

        const { token, model } = await tokenRes.json();

        // Setup KnowledgeBase
        const kb = new SessionKnowledgeBase();
        if (syllabusText) {
          kb.addRawDocument('syllabus', 'Course Syllabus', syllabusText);
        }
        modules.forEach((mod) => {
          kb.addModuleUnit(mod.name, mod.topics, mod.reference);
        });

        const liveSession = new GeminiLiveSession({
          ephemeralToken: token,
          modelName: model || 'gemini-2.5-flash',
          voiceName: 'Puck',
          systemInstruction: `You are Synapse AI's real-time spoken Voice Study Coach for ${courseName}. Speak concisely and conversationally. Answer using the student's uploaded syllabus and notes.`,
          knowledgeBase: kb,
          onStatusChange: (status, detail) => {
            setSessionStatus(status);
            if (detail) setStatusDetail(detail);
          },
          onTurnComplete: (turn) => {
            setTurns((prev) => [...prev, turn]);
            setLiveTranscript('');
            saveVoiceSessionToFirestore({
              sessionId,
              title: `Voice Session: ${courseName}`,
              courseName,
              turns: [...turns, turn],
            });
          },
          onLiveTranscript: (text, isUser) => {
            setLiveTranscript(text);
            setIsLiveUser(isUser);
          },
        });

        liveSessionRef.current = liveSession;
        await liveSession.connect();
      } catch (err: any) {
        console.warn('[VoiceCoach] Gemini Live connection failed, switching to Local Gemma Studio:', err);
        setEngineMode('gemma-local');
        startLocalGemmaVoice();
      }
    } else {
      startLocalGemmaVoice();
    }
  };

  // Local Gemma High-Performance Voice Mode (via Ollama)
  const startLocalGemmaVoice = () => {
    setSessionStatus('listening');
    setStatusDetail(`Connected to Local ${selectedGemmaModel.toUpperCase()} High-Yield Voice Studio.`);

    // Check browser speech recognition availability
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatusDetail('Browser microphone speech recognition requires Chrome or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptPiece;
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        if (interimTranscript) {
          setLiveTranscript(interimTranscript);
          setIsLiveUser(true);
        }

        if (finalTranscript.trim()) {
          const userText = finalTranscript.trim();
          const userTurn: VoiceTurn = {
            id: `turn_${Date.now()}`,
            role: 'user',
            text: userText,
            timestamp: Date.now(),
          };
          setTurns((prev) => [...prev, userTurn]);
          setLiveTranscript('');

          // Ground answer with RAG chunks
          const ragSources = ragService.queryChunks(userText, { limit: 3 });
          if (ragSources.length > 0) {
            setActiveSources(ragSources);
          }

          // Query Local Gemma / AI Studio
          setSessionStatus('speaking');
          fetch('/api/ai-tutor/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: userText,
              context: courseName,
              ragEvidence: ragSources,
              mode: 'conceptual',
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              const assistantText = data.content || 'I am reviewing that concept against your syllabus.';
              const assistantTurn: VoiceTurn = {
                id: `asst_turn_${Date.now()}`,
                role: 'assistant',
                text: assistantText,
                timestamp: Date.now(),
                sources: ragSources,
                thinking: data.thinking,
              };

              setTurns((prev) => [...prev, assistantTurn]);

              // Speak response using browser high-fidelity SpeechSynthesis
              if ('speechSynthesis' in window && !isMuted) {
                const utterance = new SpeechSynthesisUtterance(assistantText.slice(0, 300));
                utterance.rate = 1.05;
                utterance.pitch = 1.0;
                utterance.onend = () => {
                  setSessionStatus('listening');
                };
                window.speechSynthesis.speak(utterance);
              } else {
                setSessionStatus('listening');
              }
            })
            .catch(() => {
              setSessionStatus('listening');
            });
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('[VoiceCoach] Speech recognition event:', e.error);
        if (e.error === 'not-allowed') {
          setStatusDetail('Microphone access was denied. Please allow microphone in browser settings.');
          setSessionStatus('idle');
        }
      };

      recognition.start();
      (window as any).__synapse_recognition = recognition;
    } catch (e: any) {
      console.warn('[VoiceCoach] Recognition start note:', e.message);
    }
  };

  // Stop Session
  const handleStopSession = () => {
    if (liveSessionRef.current) {
      liveSessionRef.current.disconnect();
      liveSessionRef.current = null;
    }
    if ((window as any).__synapse_recognition) {
      try {
        (window as any).__synapse_recognition.stop();
      } catch { /* ignore */ }
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSessionStatus('closed');
    setStatusDetail('Session concluded.');
  };

  const isConnected = sessionStatus === 'speaking' || sessionStatus === 'listening';

  return (
    <div className="flex flex-col h-full bg-[#0b132b]/90 border border-sky-500/20 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl text-slate-100">
      {/* ── Top Header ── */}
      <div className="px-4 py-3 border-b border-sky-500/15 bg-[#070b19]/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white tracking-wide">Voice Coach</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Live
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Minimize"
            >
              <Minus className="w-4 h-4" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Engine Selector Bar ── */}
      <div className="px-4 py-1.5 bg-[#070b19]/80 border-b border-sky-500/10 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-1 text-slate-400">
          <Cpu className="w-3 h-3 text-cyan-400" />
          <span>Engine:</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEngineMode('gemini-live')}
            className={`px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer ${
              engineMode === 'gemini-live'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Gemini Live S2S
          </button>
          <button
            onClick={() => setEngineMode('gemma-local')}
            className={`px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer ${
              engineMode === 'gemma-local'
                ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Local Gemma (Ollama)
          </button>
        </div>
      </div>

      {/* ── Model Selector (when Local Gemma mode is selected) ── */}
      {engineMode === 'gemma-local' && (
        <div className="px-4 py-1 bg-[#090f26] border-b border-purple-500/20 flex items-center justify-between text-[10px] font-mono">
          <span className="text-slate-400">Gemma Parameter Tier:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedGemmaModel('gemma3:4b')}
              className={`px-1.5 py-0.5 rounded transition-all ${
                selectedGemmaModel === 'gemma3:4b'
                  ? 'bg-purple-500/30 text-purple-200 font-bold border border-purple-400'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Installed on your system (Fast 4B)"
            >
              4B (Installed)
            </button>
            <button
              onClick={() => setSelectedGemmaModel('gemma-4:12b')}
              className={`px-1.5 py-0.5 rounded transition-all ${
                selectedGemmaModel === 'gemma-4:12b'
                  ? 'bg-purple-500/30 text-purple-200 font-bold border border-purple-400'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Gemma 4 12B Deep Reasoning Model"
            >
              12B
            </button>
            <button
              onClick={() => setSelectedGemmaModel('gemma-4:31b')}
              className={`px-1.5 py-0.5 rounded transition-all ${
                selectedGemmaModel === 'gemma-4:31b'
                  ? 'bg-purple-500/30 text-purple-200 font-bold border border-purple-400'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Gemma 4 31B Heavyweight Model"
            >
              31B
            </button>
          </div>
        </div>
      )}

      {/* ── Center Concentric Voice Orb / Visualizer ── */}
      <div className="p-6 flex flex-col items-center justify-center bg-gradient-to-b from-[#0b132b]/40 to-[#070b19]/80 border-b border-sky-500/15">
        <div className="voice-orb-container my-2">
          {/* Outer Pulsing Glowing Ring */}
          <div
            className={`voice-orb-outer ${
              sessionStatus === 'speaking'
                ? 'border-purple-400 shadow-[0_0_35px_rgba(168,85,247,0.4)]'
                : sessionStatus === 'listening'
                ? 'border-cyan-400 shadow-[0_0_35px_rgba(0,240,255,0.4)]'
                : 'border-slate-700 opacity-40'
            }`}
          />
          {/* Middle Ring */}
          <div
            className={`voice-orb-middle ${
              sessionStatus === 'speaking' || sessionStatus === 'listening' ? '' : 'opacity-30'
            }`}
          />
          {/* Core Orb with Equalizer Bars */}
          <div className="voice-orb-core">
            {isConnected ? (
              <div className="waveform-bars">
                <span className="waveform-bar" style={{ animationDelay: '0.1s' }}></span>
                <span className="waveform-bar" style={{ animationDelay: '0.3s' }}></span>
                <span className="waveform-bar" style={{ animationDelay: '0.2s' }}></span>
                <span className="waveform-bar" style={{ animationDelay: '0.4s' }}></span>
                <span className="waveform-bar" style={{ animationDelay: '0.15s' }}></span>
              </div>
            ) : (
              <Mic className="w-8 h-8 text-cyan-400 opacity-80" />
            )}
          </div>
        </div>

        {/* State Title & Subtitle */}
        <h3 className="font-semibold text-sm text-white mt-3 text-center">
          {sessionStatus === 'speaking'
            ? 'Study Coach is speaking...'
            : sessionStatus === 'listening'
            ? 'Study Coach is listening...'
            : sessionStatus === 'connecting'
            ? 'Connecting session...'
            : 'Study Coach is ready'}
        </h3>
        <p className="text-xs text-slate-400 mt-0.5 text-center">
          {isConnected ? 'Speak naturally about your doubts' : 'Tap below to initiate live oral session'}
        </p>

        {/* Action Button: Start or Stop */}
        <div className="mt-4">
          {isConnected ? (
            <button
              onClick={handleStopSession}
              className="flex items-center gap-2 px-5 py-2 rounded-full border border-red-500/50 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-all shadow-lg shadow-red-500/20 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop session</span>
            </button>
          ) : (
            <button
              onClick={handleStartSession}
              className="flex items-center gap-2 px-6 py-2 rounded-full border border-cyan-400/60 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-semibold transition-all shadow-lg shadow-cyan-500/25 cursor-pointer glow-cyan"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Start session</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Live Transcript Section ── */}
      <div className="flex-1 flex flex-col min-h-[220px] max-h-[300px] overflow-hidden p-4 border-b border-sky-500/15">
        <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Mic className="w-3.5 h-3.5 text-cyan-400" />
            <span>Live Transcript</span>
          </div>
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Live
          </span>
        </div>

        {/* Transcript Conversation Bubbles */}
        <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pr-1">
          {turns.slice(-6).map((turn) => (
            <div key={turn.id} className="text-xs">
              <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-slate-400">
                {turn.role === 'user' ? (
                  <>
                    <span className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[9px] text-white font-bold">
                      Y
                    </span>
                    <span className="text-slate-300 font-medium">You</span>
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 rounded-full bg-cyan-600 flex items-center justify-center text-[9px] text-white">
                      <Sparkles className="w-2.5 h-2.5" />
                    </div>
                    <span className="text-cyan-400 font-medium">Synapse AI</span>
                  </>
                )}
                <span className="text-slate-500">00:{Math.floor((turn.timestamp % 60000) / 1000)}</span>
              </div>
              <div
                className={`p-2.5 rounded-xl leading-relaxed ${
                  turn.role === 'user'
                    ? 'bg-slate-800/80 text-slate-200 border border-slate-700/60'
                    : 'bg-[#101b3d]/80 text-cyan-100/90 border border-cyan-500/20'
                }`}
              >
                {turn.text}
              </div>
            </div>
          ))}

          {/* Live Interim Streaming Bubble */}
          {liveTranscript && (
            <div className="text-xs">
              <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-slate-400">
                <span className="text-cyan-400 font-medium">{isLiveUser ? 'You' : 'Synapse AI'}</span>
                <span className="text-cyan-400 text-[10px] font-bold animate-pulse">[transcribing...]</span>
              </div>
              <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 animate-pulse">
                {liveTranscript}
              </div>
            </div>
          )}

          <div ref={transcriptBottomRef} />
        </div>
      </div>

      {/* ── Grounded Sources Card ── */}
      <div className="px-4 py-2.5 bg-[#070b19]/60 border-b border-sky-500/15">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Grounded Sources</span>
          </div>
          <span className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono cursor-pointer flex items-center gap-0.5">
            View All
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {activeSources.map((source, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0e1938] border border-cyan-500/20 text-[11px] text-slate-300 font-mono hover:border-cyan-400/40 transition-colors cursor-pointer"
            >
              <FileText className="w-3 h-3 text-cyan-400" />
              <span className="truncate max-w-[130px]">{source.filename}</span>
              {source.page && <span className="text-slate-500 text-[10px]">p.{source.page}</span>}
            </div>
          ))}
          <span className="px-2 py-1 rounded-lg bg-slate-800/60 border border-slate-700 text-[10px] text-slate-400 font-mono">
            +1 more
          </span>
        </div>
      </div>

      {/* ── Bottom Audio Timeline / Equalizer Bar ── */}
      <div className="px-4 py-2.5 bg-[#070b19]/80 flex items-center justify-between text-xs font-mono">
        <span className="text-[11px] text-slate-400">{formatTime(elapsedSeconds)}</span>

        {/* Audio Equalizer Gradient Bar */}
        <div className="flex-1 mx-3 h-2 bg-slate-800/80 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 rounded-full"
            style={{ width: `${Math.min(100, (elapsedSeconds / totalSeconds) * 100)}%` }}
          />
        </div>

        <span className="text-[11px] text-slate-400">{formatTime(totalSeconds)}</span>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className="ml-3 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
