import React, { useState, useEffect } from 'react';
import {
  Calendar,
  BookOpen,
  Mic,
  Clock,
  Upload,
  Plus,
  List,
  Sparkles,
  Bell,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Target,
  GraduationCap,
  FileText,
  Layers,
  MessageSquare,
  Shield,
  Database,
  Cpu,
  Brain,
  CheckCircle,
  Key,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ScreenId,
  SyllabusModule,
  ResourceItem,
  UpcomingStudyTask,
  AITutorConversation,
} from '../types';
import { VoiceCoachPanel } from './VoiceCoachPanel';
import { GenerativeAITutor } from './GenerativeAITutor';
import { ragService } from '../services/ragService';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { GoogleAuthButton } from './GoogleAuthButton';
import { getAITutorConversationsFromFirestore } from '../services/firestoreService';
import { apiKeyService } from '../services/apiKeyService';

interface ModernStudyDashboardProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  modules?: SyllabusModule[];
  resources?: ResourceItem[];
  syllabusText?: string;
  onOpenUploadModal?: () => void;
  onOpenResourceModal?: () => void;
  onOpenApiKeyModal?: () => void;
}

export const ModernStudyDashboard: React.FC<ModernStudyDashboardProps> = ({
  currentScreen,
  onNavigate,
  modules = [],
  resources = [],
  syllabusText = '',
  onOpenUploadModal,
  onOpenResourceModal,
  onOpenApiKeyModal,
}) => {
  const { user, signIn, signOut } = useGoogleAuth();

  // Internal tab within the unified dashboard workspace
  const [activeTab, setActiveTab] = useState<'overview' | 'study-plan' | 'knowledge-base' | 'voice-coach' | 'ai-tutor'>('overview');
  const [isVoiceCoachDocked, setIsVoiceCoachDocked] = useState<boolean>(true);
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>({});
  const [recentConversations, setRecentConversations] = useState<AITutorConversation[]>([]);
  const [hasApiKey, setHasApiKey] = useState(apiKeyService.hasKey());

  useEffect(() => {
    return apiKeyService.subscribe((k) => setHasApiKey(Boolean(k)));
  }, []);

  // Dynamic knowledge statistics from RAG service
  const knowledgeStats = ragService.getKnowledgeStats(user?.uid);

  // Load genuine recent conversations from Firestore
  useEffect(() => {
    let isMounted = true;
    getAITutorConversationsFromFirestore()
      .then((convs) => {
        if (isMounted) {
          setRecentConversations(convs.slice(0, 3));
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Derive genuine course name
  const courseDisplayName = modules.length > 0
    ? (modules[0].name.split('(')[0].trim() || 'Active Study Plan')
    : 'No Course Loaded';

  // Genuine metrics calculations
  const totalModulesCount = modules.length;
  const completedModulesCount = modules.filter((m) => m.status === 'completed').length;
  const inProgressModulesCount = modules.filter((m) => m.status === 'in-progress').length;
  const overallCompletionPercentage = totalModulesCount > 0
    ? Math.round((completedModulesCount / totalModulesCount) * 100)
    : null;

  // Genuine remaining topics count
  const remainingTopicsCount = modules.reduce((acc, m) => {
    if (m.status !== 'completed' && Array.isArray(m.topics)) {
      return acc + m.topics.length;
    }
    return acc;
  }, 0);

  // Derive genuine upcoming tasks from actual syllabus modules
  const upcomingTasks: UpcomingStudyTask[] = modules
    .filter((m) => m.status !== 'completed')
    .slice(0, 4)
    .map((m, idx) => ({
      id: `task-${m.id}`,
      time: idx === 0 ? 'Next Focus Unit' : `Upcoming Session ${idx + 1}`,
      title: m.topics?.[0] ? `${m.name} — ${m.topics[0]}` : m.name,
      category: m.category || 'Core Unit',
      priority: m.priority || (idx === 0 ? 'high' : 'medium'),
      completed: Boolean(completedTaskIds[`task-${m.id}`]),
    }));

  const toggleTaskCompletion = (taskId: string) => {
    setCompletedTaskIds((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning.';
    if (hour < 18) return 'Good afternoon.';
    return 'Good evening.';
  };

  return (
    <div className="flex h-screen w-screen bg-[#070b19] text-slate-100 overflow-hidden font-sans">
      {/* ═══════════════════════════════════════════════════════════
          1. LEFT SIDEBAR
      ═══════════════════════════════════════════════════════════ */}
      <aside className="w-64 bg-[#070d1e] border-r border-sky-500/15 flex flex-col justify-between p-5 shrink-0 select-none z-20">
        <div>
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3 mb-8 cursor-pointer" onClick={() => setActiveTab('overview')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <span className="font-extrabold text-lg text-white font-mono">S</span>
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white leading-tight">Synapse AI</h1>
              <p className="text-[11px] text-slate-400 font-mono">Syllabus → Study Plan Agent</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-lg shadow-sky-500/25 glow-cyan'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <span className="material-symbols-outlined text-lg">dashboard</span>
              <span>Overview</span>
            </button>

            <button
              onClick={() => onNavigate('master-schedule')}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all cursor-pointer"
            >
              <Calendar className="w-4 h-4" />
              <span>Study Plan</span>
            </button>

            <button
              onClick={() => onNavigate('step4-resources')}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Knowledge Base</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('voice-coach');
                setIsVoiceCoachDocked(true);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'voice-coach'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Mic className="w-4 h-4 text-cyan-400" />
                <span>Voice Coach</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Live S2S
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ai-tutor')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'ai-tutor'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 glow-purple'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Brain className="w-4 h-4 text-purple-400" />
              <span>AI Tutor & History</span>
            </button>
          </nav>
        </div>

        {/* Bottom Section: API Key & Quick Actions */}
        <div className="space-y-4 pt-4 border-t border-sky-500/15">
          {/* Gemini API Key Indicator */}
          <div
            onClick={onOpenApiKeyModal}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              hasApiKey
                ? 'bg-[#101b3d]/80 border-cyan-500/30 hover:border-cyan-400/50'
                : 'bg-amber-500/10 border-amber-500/30 hover:border-amber-400/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Key className={`w-3.5 h-3.5 ${hasApiKey ? 'text-cyan-400' : 'text-amber-400'}`} />
              <span className="text-xs font-bold text-white">
                {hasApiKey ? 'Gemini Key Configured' : 'Set Gemini Key'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              {hasApiKey ? 'Voice & Neural Engine Active' : 'Paste key to enable live audio'}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block px-1">
              Quick Actions
            </span>

            <button
              onClick={onOpenUploadModal || (() => onNavigate('step1-upload'))}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-sky-500/25 bg-[#0b132b]/80 hover:bg-[#131f42] text-xs font-medium text-slate-200 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Upload Syllabus</span>
            </button>

            <button
              onClick={onOpenResourceModal || (() => onNavigate('step4-resources'))}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-sky-500/25 bg-[#0b132b]/80 hover:bg-[#131f42] text-xs font-medium text-slate-200 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Add Study Resources</span>
            </button>

            <button
              onClick={() => onNavigate('master-schedule')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border border-sky-500/25 bg-[#0b132b]/80 hover:bg-[#131f42] text-xs font-medium text-slate-200 transition-all cursor-pointer"
            >
              <List className="w-3.5 h-3.5 text-emerald-400" />
              <span>View Study Plan</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════
          2. CENTER MAIN DASHBOARD
      ═══════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#070b19] neural-dashboard-bg relative">
        {/* Top Header Bar */}
        <header className="h-16 px-8 border-b border-sky-500/15 bg-[#070b19]/60 backdrop-blur-md flex items-center justify-between z-10 shrink-0">
          {/* Course Title Badge */}
          <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#0b132b] border border-sky-500/25 text-xs text-white font-medium shadow-md">
            <GraduationCap className="w-4 h-4 text-cyan-400" />
            <span className="truncate max-w-xs">{courseDisplayName}</span>
          </div>

          {/* Right Header: Key, Notifications & User Profile */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenApiKeyModal}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono transition-all cursor-pointer ${
                hasApiKey
                  ? 'bg-[#0b132b] border-cyan-500/30 text-cyan-300 hover:border-cyan-400/50'
                  : 'bg-amber-500/15 border-amber-400/40 text-amber-300 hover:bg-amber-500/25'
              }`}
              title="Configure Gemini API Key"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{hasApiKey ? 'Gemini Active' : 'Set API Key'}</span>
            </button>

            {/* Google Authentication & Workspace Menu */}
            <GoogleAuthButton />
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
          {activeTab === 'ai-tutor' ? (
            <GenerativeAITutor
              courseContext={courseDisplayName}
              onNavigateToKnowledgeBase={() => onNavigate('step4-resources')}
            />
          ) : (
            <div className="space-y-6 max-w-5xl mx-auto">
              {/* ── Greeting Banner & Subtitle ── */}
              <div>
                <h2 className="text-3xl font-extrabold text-white tracking-tight">
                  {getGreeting()}{' '}
                  <span className="text-white font-normal">Ready to </span>
                  <span className="gradient-text-learn font-extrabold">learn?</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Your personalized study plan, powered by AI.
                </p>
              </div>

              {/* ── Metric Cards Row (Truthful Metrics Only) ── */}
              <div className="grid grid-cols-4 gap-4">
                {/* 1. Daily / Overall Progress */}
                <div className="cyber-card p-4 flex items-center gap-3.5">
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-12 h-12 -rotate-90">
                      <circle cx="24" cy="24" r="20" stroke="#1e293b" strokeWidth="3.5" fill="none" />
                      {overallCompletionPercentage !== null && (
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          stroke="#00f0ff"
                          strokeWidth="3.5"
                          strokeDasharray="125.6"
                          strokeDashoffset={125.6 - (125.6 * overallCompletionPercentage) / 100}
                          strokeLinecap="round"
                          fill="none"
                        />
                      )}
                    </svg>
                    <span className="absolute font-bold text-xs text-white">
                      {overallCompletionPercentage !== null ? `${overallCompletionPercentage}%` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-200 block">Overall Mastery</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {totalModulesCount > 0
                        ? `${completedModulesCount} / ${totalModulesCount} units done`
                        : 'No syllabus uploaded'}
                    </span>
                    <div className="w-20 h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                        style={{ width: `${overallCompletionPercentage || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* 2. Streak Counter */}
                <div className="cyber-card p-4 flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-base text-white">
                        {user ? '0' : '—'}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200 block">Study Streak</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {user ? 'Begin a study session' : 'Sign in to track'}
                    </span>
                  </div>
                </div>

                {/* 3. Topics Left */}
                <div className="cyber-card p-4 flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-base text-white">
                      {totalModulesCount > 0 ? remainingTopicsCount : '—'}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-200 block">Topics Left</span>
                    <span className="text-[10px] text-slate-400">
                      {totalModulesCount > 0 ? 'Topics to master' : 'No syllabus active'}
                    </span>
                  </div>
                </div>

                {/* 4. Study Focus */}
                <div className="cyber-card p-4 flex flex-col justify-center border-indigo-500/20 bg-gradient-to-br from-[#0b132b]/80 to-[#101b3d]/60">
                  <p className="text-xs italic text-indigo-200 leading-snug">
                    {totalModulesCount > 0
                      ? 'Targeted spaced repetition maximizes concept retention.'
                      : 'Upload your syllabus to unlock tailored AI study schedules.'}
                  </p>
                  <span className="text-right text-[10px] text-indigo-400 font-mono mt-1">✨</span>
                </div>
              </div>

              {/* ── Middle Grid: Upcoming Study Plan & Knowledge Coverage ── */}
              <div className="grid grid-cols-2 gap-5">
                {/* Upcoming Study Plan */}
                <div className="cyber-card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <Calendar className="w-4 h-4 text-cyan-400" />
                      <span>Upcoming Study Plan</span>
                    </div>
                    {totalModulesCount > 0 && (
                      <button
                        onClick={() => onNavigate('master-schedule')}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Full Plan</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {upcomingTasks.length > 0 ? (
                    <div className="space-y-2.5">
                      {upcomingTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => toggleTaskCompletion(task.id)}
                          className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                            completedTaskIds[task.id]
                              ? 'bg-[#090f24]/50 border-emerald-500/30 opacity-70'
                              : 'bg-[#0b132b]/80 border-sky-500/15 hover:border-cyan-400/40'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="w-1.5 h-7 rounded-full mt-0.5 bg-cyan-400" />
                            <div>
                              <span className="text-[10px] text-slate-400 font-mono block">{task.time}</span>
                              <span
                                className={`text-xs font-semibold ${
                                  completedTaskIds[task.id] ? 'line-through text-slate-400' : 'text-slate-100'
                                }`}
                              >
                                {task.title}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                              {task.category}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center space-y-3">
                      <p className="text-xs text-slate-400">
                        No upcoming study tasks. Upload your syllabus to generate your customized study plan.
                      </p>
                      <button
                        onClick={onOpenUploadModal || (() => onNavigate('step1-upload'))}
                        className="px-4 py-2 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-xs font-semibold hover:bg-cyan-500/25 transition cursor-pointer"
                      >
                        Upload Syllabus Now
                      </button>
                    </div>
                  )}
                </div>

                {/* Knowledge Coverage */}
                <div className="cyber-card p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>Knowledge Coverage</span>
                    </div>

                    {totalModulesCount > 0 ? (
                      <div className="flex items-center gap-6 my-2">
                        {/* Circular Gauge */}
                        <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                          <svg className="w-28 h-28 -rotate-90">
                            <circle cx="56" cy="56" r="46" stroke="#1e293b" strokeWidth="8" fill="none" />
                            <circle
                              cx="56"
                              cy="56"
                              r="46"
                              stroke="#00f0ff"
                              strokeWidth="8"
                              strokeDasharray="289"
                              strokeDashoffset={289 - (289 * (overallCompletionPercentage || 0)) / 100}
                              strokeLinecap="round"
                              fill="none"
                            />
                          </svg>
                          <div className="absolute text-center">
                            <span className="font-extrabold text-xl text-white">
                              {overallCompletionPercentage || 0}%
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">Mastered</span>
                          </div>
                        </div>

                        {/* Breakdown Bars */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                              <span className="text-slate-300">Completed Units</span>
                            </div>
                            <span className="text-white font-bold">{completedModulesCount}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-mono">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                              <span className="text-slate-300">In Progress</span>
                            </div>
                            <span className="text-white font-bold">{inProgressModulesCount}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-mono">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                              <span className="text-slate-300">Pending Units</span>
                            </div>
                            <span className="text-white font-bold">
                              {totalModulesCount - completedModulesCount - inProgressModulesCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center space-y-2">
                        <p className="text-xs text-slate-400">
                          No curriculum data available to evaluate coverage.
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Upload syllabus materials to view breakdown.
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onNavigate('dashboard')}
                    className="w-full mt-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>View Matrix Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ── Bottom Grid: Recent Conversations & Knowledge Base Stats ── */}
              <div className="grid grid-cols-2 gap-5">
                {/* Recent Conversations */}
                <div className="cyber-card p-5">
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <MessageSquare className="w-4 h-4 text-cyan-400" />
                      <span>Recent Conversations</span>
                    </div>
                    {recentConversations.length > 0 && (
                      <button
                        onClick={() => setActiveTab('ai-tutor')}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer"
                      >
                        <span>View All</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {recentConversations.length > 0 ? (
                    <div className="space-y-2">
                      {recentConversations.map((conv) => (
                        <div
                          key={conv.id}
                          onClick={() => setActiveTab('ai-tutor')}
                          className="p-3 rounded-xl bg-[#0b132b]/80 border border-sky-500/15 hover:border-cyan-400/40 flex items-center justify-between transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                              <Brain className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-white block">
                                {conv.title || 'Study Conversation'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono truncate max-w-[200px] block">
                                {conv.messages?.[conv.messages.length - 1]?.content?.slice(0, 50) || 'Recent message'}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(conv.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center space-y-2">
                      <p className="text-xs text-slate-400">No study conversations recorded yet.</p>
                      <button
                        onClick={() => setActiveTab('ai-tutor')}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-mono"
                      >
                        Start a conversation with AI Tutor →
                      </button>
                    </div>
                  )}
                </div>

                {/* Knowledge Base Card (Truthful Document Counts) */}
                <div className="cyber-card p-5">
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <BookOpen className="w-4 h-4 text-cyan-400" />
                      <span>Knowledge Base</span>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono font-medium">
                        {knowledgeStats.totalDocuments} Docs
                      </span>
                    </div>
                    <button
                      onClick={() => onNavigate('step4-resources')}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer"
                    >
                      <span>Manage Sources</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-[#0b132b]/80 border border-sky-500/15 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-200">Syllabus Documents</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {knowledgeStats.categories.syllabus.count} documents •{' '}
                        {knowledgeStats.categories.syllabus.chunks} chunks
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#0b132b]/80 border border-sky-500/15 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-200">Notes & Readings</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {knowledgeStats.categories.notes.count} documents •{' '}
                        {knowledgeStats.categories.notes.chunks} chunks
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#0b132b]/80 border border-sky-500/15 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-200">Lecture Slides</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {knowledgeStats.categories.ppt.count} documents •{' '}
                        {knowledgeStats.categories.ppt.chunks} chunks
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#0b132b]/80 border border-sky-500/15 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-200">Web & Shared Content</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {knowledgeStats.categories.web.count} documents •{' '}
                        {knowledgeStats.categories.web.chunks} chunks
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════
          3. RIGHT PANEL: DOCKED LIVE VOICE COACH
      ═══════════════════════════════════════════════════════════ */}
      {isVoiceCoachDocked && (
        <aside className="w-[360px] h-full p-4 shrink-0 bg-[#070b19] border-l border-sky-500/15 flex flex-col z-20">
          <VoiceCoachPanel
            courseName={courseDisplayName}
            modules={modules}
            resources={resources}
            syllabusText={syllabusText}
            onMinimize={() => setIsVoiceCoachDocked(false)}
            onClose={() => setIsVoiceCoachDocked(false)}
            onOpenApiKeyModal={onOpenApiKeyModal}
          />
        </aside>
      )}

      {/* Floating Re-dock Icon if minimized */}
      {!isVoiceCoachDocked && (
        <button
          onClick={() => setIsVoiceCoachDocked(true)}
          className="fixed bottom-6 right-6 p-4 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-2xl shadow-cyan-500/40 border border-cyan-400 flex items-center justify-center cursor-pointer hover:scale-105 transition-all z-50 glow-cyan"
          title="Open Live Voice Coach"
        >
          <Mic className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};
