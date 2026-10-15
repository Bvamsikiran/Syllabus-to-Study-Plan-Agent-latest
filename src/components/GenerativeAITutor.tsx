import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Sparkles,
  Send,
  PlusCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  Cpu,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Eye,
  Sliders,
  Award,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AITutorMessage,
  AITutorConversation,
  GroundedSource,
  ResponseAlternative,
} from '../types';
import { ragService } from '../services/ragService';
import {
  saveAITutorConversationToFirestore,
  getAITutorConversationsFromFirestore,
  deleteAITutorConversationFromFirestore,
} from '../services/firestoreService';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { apiKeyService } from '../services/apiKeyService';

export const GenerativeAITutor: React.FC<{
  courseContext?: string;
  onNavigateToKnowledgeBase?: () => void;
}> = ({ courseContext = '', onNavigateToKnowledgeBase }) => {
  const { user } = useGoogleAuth();
  const [conversations, setConversations] = useState<AITutorConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeMode, setActiveMode] = useState<'conceptual' | 'exam-prep' | 'socratic'>('conceptual');
  const [expandedThinkingIds, setExpandedThinkingIds] = useState<Record<string, boolean>>({});
  const [expandedPromptIds, setExpandedPromptIds] = useState<Record<string, boolean>>({});
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversations on mount
  useEffect(() => {
    async function loadConversations() {
      const convs = await getAITutorConversationsFromFirestore();
      if (convs.length > 0) {
        setConversations(convs);
        setActiveConvId(convs[0].id);
      } else {
        createNewChat();
      }
    }
    loadConversations();
  }, [user]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, activeConvId, isGenerating]);

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  const createNewChat = () => {
    const newConv: AITutorConversation = {
      id: `conv_${Date.now()}`,
      userId: user?.uid || 'local-student',
      title: 'New Study Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      courseContext: courseContext || 'Study Session',
      messages: [],
    };

    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newConv.id);
    saveAITutorConversationToFirestore(newConv);
  };

  const deleteChat = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteAITutorConversationFromFirestore(convId);
    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== convId);
      if (activeConvId === convId) {
        setActiveConvId(remaining[0]?.id || '');
      }
      return remaining;
    });
  };

  const toggleThinking = (msgId: string) => {
    setExpandedThinkingIds((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const togglePromptInspection = (msgId: string) => {
    setExpandedPromptIds((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isGenerating) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    setErrorStatus(null);

    const userMsg: AITutorMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: Date.now(),
    };

    // Retrieve RAG chunks grounded in user's syllabus & materials
    const groundedSources: GroundedSource[] = ragService.queryChunks(userText, {
      userId: user?.uid,
      limit: 4,
    });

    const assistantPlaceholderId = `asst_${Date.now()}`;
    const initialAssistantMsg: AITutorMessage = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      thinking: 'Analyzing question components, retrieving syllabus invariants, and structuring proof...',
      isStreaming: true,
      timestamp: Date.now(),
      sources: groundedSources,
    };

    // Update conversation immediately with user message + streaming placeholder
    const currentConv = activeConversation;
    if (!currentConv) return;

    const updatedMessages = [...currentConv.messages, userMsg, initialAssistantMsg];
    const isFirstUserMsg = currentConv.messages.filter((m) => m.role === 'user').length === 0;
    const newTitle = isFirstUserMsg
      ? userText.slice(0, 32) + (userText.length > 32 ? '...' : '')
      : currentConv.title;

    const updatedConv: AITutorConversation = {
      ...currentConv,
      title: newTitle,
      updatedAt: Date.now(),
      messages: updatedMessages,
    };

    setConversations((prev) => prev.map((c) => (c.id === currentConv.id ? updatedConv : c)));
    setIsGenerating(true);

    // Expand thinking card automatically so student sees the live reasoning
    setExpandedThinkingIds((prev) => ({ ...prev, [assistantPlaceholderId]: true }));

    try {
      const response = await fetch('/api/ai-tutor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...apiKeyService.getAiHeaders(),
        },
        body: JSON.stringify({
          message: userText,
          context: courseContext,
          ragEvidence: groundedSources,
          mode: activeMode,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || `AI Tutor request failed with status ${response.status}`);
      }

      const data = await response.json();

      // Only include alternatives if genuinely provided by the AI model
      const alternatives: ResponseAlternative[] = Array.isArray(data.alternatives) ? data.alternatives : [];

      const finalizedAssistantMsg: AITutorMessage = {
        id: assistantPlaceholderId,
        role: 'assistant',
        content: data.content,
        thinking: data.thinking || 'Reasoned through syllabus concepts and verified ground truth.',
        timestamp: Date.now(),
        sources: groundedSources,
        isStreaming: false,
        engineUsed: data.engineUsed || data.engine || 'gemini-3.8-flash',
        promptContext: data.promptContext,
        alternatives,
        activeAlternativeId: alternatives.length > 0 ? alternatives[0].id : undefined,
      };

      const finalMessages = [...currentConv.messages, userMsg, finalizedAssistantMsg];
      const finalConv: AITutorConversation = {
        ...updatedConv,
        messages: finalMessages,
      };

      setConversations((prev) => prev.map((c) => (c.id === currentConv.id ? finalConv : c)));
      saveAITutorConversationToFirestore(finalConv);
    } catch (err: any) {
      console.warn('[AITutor] Generation error:', err);
      setErrorStatus(
        err.message || 'AI Tutor temporarily offline. Please ensure Gemini API or local Ollama is active.'
      );

      // Replace streaming message with accurate failure card
      const failedMsg: AITutorMessage = {
        id: assistantPlaceholderId,
        role: 'assistant',
        content: `**Service Notice:** I could not generate a response right now due to a network or model configuration issue.\n\n*Try switching to Local Gemma mode or verifying your API credentials in .env.*`,
        timestamp: Date.now(),
        isStreaming: false,
      };

      const finalMessages = [...currentConv.messages, userMsg, failedMsg];
      setConversations((prev) =>
        prev.map((c) => (c.id === currentConv.id ? { ...c, messages: finalMessages } : c))
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectAlternative = (msgId: string, altId: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeConvId) return c;
        return {
          ...c,
          messages: c.messages.map((m) => {
            if (m.id !== msgId || !m.alternatives) return m;
            const chosen = m.alternatives.find((a) => a.id === altId);
            if (!chosen) return m;
            return {
              ...m,
              content: chosen.content,
              thinking: chosen.thinking || m.thinking,
              activeAlternativeId: altId,
            };
          }),
        };
      })
    );
  };

  return (
    <div className="flex h-full min-h-[750px] w-full bg-[#070b19] text-slate-100 rounded-2xl border border-sky-500/15 overflow-hidden shadow-2xl">
      {/* ── Left Sidebar: Conversations History ── */}
      <div className="w-64 border-r border-sky-500/15 bg-[#0b132b]/80 p-4 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-cyan-400" />
              <span className="font-bold text-sm tracking-wide text-white">AI Tutor Chats</span>
            </div>
            <button
              onClick={createNewChat}
              className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-all cursor-pointer"
              title="New Conversation"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Selector */}
          <div className="mb-4">
            <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block mb-1.5">
              Tutor Persona Mode
            </span>
            <div className="grid grid-cols-3 gap-1 bg-[#070b19] p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveMode('conceptual')}
                className={`text-[10px] py-1 rounded font-medium transition-all ${
                  activeMode === 'conceptual'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Concept
              </button>
              <button
                onClick={() => setActiveMode('exam-prep')}
                className={`text-[10px] py-1 rounded font-medium transition-all ${
                  activeMode === 'exam-prep'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Exam Drill
              </button>
              <button
                onClick={() => setActiveMode('socratic')}
                className={`text-[10px] py-1 rounded font-medium transition-all ${
                  activeMode === 'socratic'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Socratic
              </button>
            </div>
          </div>

          {/* Conversation List */}
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto no-scrollbar">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                  activeConvId === conv.id
                    ? 'bg-cyan-500/15 border border-cyan-500/35 text-white font-medium'
                    : 'text-slate-400 hover:bg-[#131f42] hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="truncate pr-2">{conv.title}</div>
                {conversations.length > 1 && (
                  <button
                    onClick={(e) => deleteChat(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity p-0.5"
                    title="Delete Chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Knowledge Base Link */}
        <div className="pt-4 border-t border-sky-500/15">
          <button
            onClick={onNavigateToKnowledgeBase}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/25 text-xs transition-all cursor-pointer font-medium"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Manage Grounded Sources</span>
          </button>
        </div>
      </div>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col justify-between bg-[#070b19]/90 relative">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-sky-500/15 bg-[#0b132b]/60 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {activeConversation?.title || 'Interactive Study Session'}
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                Context: {courseContext} • Mode: {activeMode.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-[10px] font-mono flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              RAG Active
            </span>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {(!activeConversation?.messages || activeConversation.messages.length === 0) && (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center mb-4 text-cyan-400 shadow-lg shadow-cyan-500/10">
                <Brain className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Synapse Generative AI Tutor</h3>
              <p className="text-xs text-slate-400 max-w-md mb-4 leading-relaxed">
                Ask any conceptual question, algorithmic proof, problem derivation, or exam question. Your answers will be grounded directly in your syllabus and uploaded materials.
              </p>
              <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-400/80 bg-cyan-950/40 border border-cyan-800/40 px-3 py-1.5 rounded-lg">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Type your question below to begin your personalized study session</span>
              </div>
            </div>
          )}
          <AnimatePresence>
            {activeConversation?.messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[78%] rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-lg shadow-blue-500/15'
                      : 'cyber-card text-slate-200'
                  }`}
                >
                  {/* Assistant: Thinking Trace Card (Option 1) */}
                  {msg.role === 'assistant' && msg.thinking && (
                    <div className="mb-3.5">
                      <div
                        onClick={() => toggleThinking(msg.id)}
                        className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-xs font-mono cursor-pointer hover:bg-indigo-900/60 transition-all select-none"
                      >
                        <div className="flex items-center gap-1.5">
                          <Brain className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                          <span>Thought Process & Reasoning Trace</span>
                          {msg.isStreaming && (
                            <span className="text-[10px] text-cyan-400 font-bold ml-1 animate-pulse">
                              [Thinking...]
                            </span>
                          )}
                        </div>
                        {expandedThinkingIds[msg.id] ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </div>

                      {expandedThinkingIds[msg.id] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-2 p-3 rounded-lg bg-[#060a17] border border-indigo-500/20 text-xs text-indigo-200/90 font-mono leading-normal whitespace-pre-wrap"
                        >
                          {msg.thinking}
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Message Content */}
                  <div className="prose prose-invert prose-sm max-w-none space-y-2">
                    {msg.content ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Synthesizing grounded answer...</span>
                      </div>
                    )}
                  </div>

                  {/* Grounded RAG Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80">
                      <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1 mb-1.5">
                        <BookOpen className="w-3 h-3 text-cyan-400" />
                        Grounded Sources
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((s, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono"
                            title={s.snippet}
                          >
                            <FileText className="w-3 h-3" />
                            {s.filename}
                            {s.page ? ` (p. ${s.page})` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Multi-Response Variations (Option 4) */}
                  {msg.alternatives && msg.alternatives.length > 1 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-mono">Response Variations:</span>
                      <div className="flex gap-1">
                        {msg.alternatives.map((alt) => (
                          <button
                            key={alt.id}
                            onClick={() => handleSelectAlternative(msg.id, alt.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                              msg.activeAlternativeId === alt.id
                                ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-200 font-bold'
                                : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700'
                            }`}
                          >
                            {alt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* System Prompt & Context Inspection Toggle */}
                  {msg.promptContext && (
                    <div className="mt-2 text-right">
                      <button
                        onClick={() => togglePromptInspection(msg.id)}
                        className="text-[10px] font-mono text-slate-500 hover:text-cyan-400 transition-colors inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        {expandedPromptIds[msg.id] ? 'Hide Prompt Context' : 'Inspect Prompt & Context'}
                      </button>

                      {expandedPromptIds[msg.id] && (
                        <div className="mt-2 text-left p-2.5 rounded bg-black/60 border border-slate-800 text-[10px] font-mono text-slate-400">
                          <div><strong>System Persona:</strong> {msg.promptContext.systemInstruction}</div>
                          <div className="mt-1"><strong>RAG Evidence Count:</strong> {msg.promptContext.ragEvidenceCount} chunks matched</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-xs font-bold text-white">
                    {user?.displayName ? user.displayName.charAt(0) : 'U'}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="p-4 border-t border-sky-500/15 bg-[#0b132b]/80 backdrop-blur-md">
          {errorStatus && (
            <div className="mb-2 px-3 py-1.5 rounded-lg bg-red-950/70 border border-red-500/40 text-red-300 text-xs flex items-center justify-between">
              <span>{errorStatus}</span>
              <button
                onClick={() => setErrorStatus(null)}
                className="text-slate-400 hover:text-white text-xs ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="relative flex items-center">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Ask a question on ${courseContext}... (e.g. "Derive the EMAT formula for 2-level paging" or "Explain B+ Tree leaf split")`}
              rows={2}
              className="w-full bg-[#070b19] border border-sky-500/25 rounded-xl pl-4 pr-12 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all resize-none"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isGenerating}
              className="absolute right-3 p-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-500/30 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-500 font-mono">
            <span>Press Enter to send • Shift+Enter for newline</span>
            <span>Grounding: 4 indexed PDF & note sources active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
