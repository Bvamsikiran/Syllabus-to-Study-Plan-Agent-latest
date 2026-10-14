import React, { useState } from 'react';
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
  Flame,
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ScreenId,
  SyllabusModule,
  ResourceItem,
  UpcomingStudyTask,
} from '../types';
import { VoiceCoachPanel } from './VoiceCoachPanel';
import { GenerativeAITutor } from './GenerativeAITutor';
import { ragService } from '../services/ragService';
import { useGoogleAuth } from '../context/GoogleAuthContext';

interface ModernStudyDashboardProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  modules?: SyllabusModule[];
  resources?: ResourceItem[];
  syllabusText?: string;
  onOpenUploadModal?: () => void;
  onOpenResourceModal?: () => void;
}

export const ModernStudyDashboard: React.FC<ModernStudyDashboardProps> = ({
  currentScreen,
  onNavigate,
  modules = [],
  resources = [],
  syllabusText = '',
  onOpenUploadModal,
  onOpenResourceModal,
}) => {
  const { user, signIn, signOut } = useGoogleAuth();

  // Internal tab within the unified dashboard workspace
  const [activeTab, setActiveTab] = useState<'overview' | 'study-plan' | 'knowledge-base' | 'voice-coach' | 'ai-tutor'>('overview');
  const [selectedCourse, setSelectedCourse] = useState<string>('GATE CS + Data Science');
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState<boolean>(false);
  const [isVoiceCoachDocked, setIsVoiceCoachDocked] = useState<boolean>(true);
  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>({});

  // Dynamic knowledge statistics from RAG service
  const knowledgeStats = ragService.getKnowledgeStats(user?.uid);

  // Upcoming study tasks
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingStudyTask[]>([
    {
      id: 'task-1',
      time: 'Today, 7:00 PM',
      title: 'OS — Process Scheduling & Synchronization',
      category: 'Operating Systems',
      priority: 'high',
      completed: false,
    },
    {
      id: 'task-2',
      time: 'Today, 8:30 PM',
      title: 'Linear Regression — Concepts & Practice',
      category: 'Machine Learning',
      priority: 'high',
      completed: false,
    },
    {
      id: 'task-3',
      time: 'Tomorrow, 10:00 AM',
      title: 'DBMS — Normalization & SQL',
      category: 'Database Systems',
      priority: 'medium',
      completed: false,
    },
    {
      id: 'task-4',
      time: 'Tomorrow, 2:00 PM',
      title: 'Graph Algorithms — BFS & DFS',
      category: 'Data Structures & Algorithms',
      priority: 'high',
      completed: false,
    },
  ]);

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
                Live
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

        {/* Bottom Section: Promo Card & Quick Actions */}
        <div className="space-y-4 pt-4 border-t border-sky-500/15">
          {/* Smarter Learning Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#101b3d] to-[#0b132b] border border-indigo-500/25 shadow-lg relative overflow-hidden">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Brain className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white leading-tight">Smarter Learning.</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal mb-1">
              Your AI-powered study companion for exam success.
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
          2. CENTER MAIN DASHBOARD OR FULL VIEW
      ═══════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#070b19] neural-dashboard-bg relative">
        {/* Top Header Bar */}
        <header className="h-16 px-8 border-b border-sky-500/15 bg-[#070b19]/60 backdrop-blur-md flex items-center justify-between z-10 shrink-0">
          {/* Course Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsCourseDropdownOpen(!isCourseDropdownOpen)}
              className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#0b132b] border border-sky-500/25 hover:border-cyan-400/50 text-xs text-white font-medium shadow-md transition-all cursor-pointer"
            >
              <GraduationCap className="w-4 h-4 text-cyan-400" />
              <span>{selectedCourse}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isCourseDropdownOpen && (
              <div className="absolute top-10 left-0 w-64 bg-[#0b132b] border border-sky-500/30 rounded-xl shadow-2xl py-1.5 z-50 text-xs">
                <div
                  onClick={() => {
                    setSelectedCourse('GATE CS + Data Science');
                    setIsCourseDropdownOpen(false);
                  }}
                  className="px-3.5 py-2 hover:bg-[#131f42] text-white cursor-pointer"
                >
                  GATE CS + Data Science
                </div>
                <div
                  onClick={() => {
                    setSelectedCourse('GATE CS: Computer Science & IT');
                    setIsCourseDropdownOpen(false);
                  }}
                  className="px-3.5 py-2 hover:bg-[#131f42] text-slate-300 cursor-pointer"
                >
                  GATE CS: Computer Science & IT
                </div>
                <div
                  onClick={() => {
                    setSelectedCourse('GATE DA: Data Science & AI');
                    setIsCourseDropdownOpen(false);
                  }}
                  className="px-3.5 py-2 hover:bg-[#131f42] text-slate-300 cursor-pointer"
                >
                  GATE DA: Data Science & AI
                </div>
              </div>
            )}
          </div>

          {/* Right Header: Notifications & User Profile */}
          <div className="flex items-center gap-4">
            <button
              className="p-2 rounded-full bg-[#0b132b] border border-sky-500/20 hover:border-cyan-400/50 text-slate-300 hover:text-white transition-all cursor-pointer relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 rounded-full bg-cyan-400 absolute top-1 right-1"></span>
            </button>

            {/* User Profile Pill */}
            {user ? (
              <div
                onClick={signOut}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#0b132b] border border-sky-500/25 hover:border-cyan-400/50 text-xs text-white cursor-pointer transition-all"
                title="Click to sign out"
              >
                <img
                  src={user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64'}
                  alt="Avatar"
                  className="w-6 h-6 rounded-full object-cover border border-cyan-400/40"
                />
                <span className="font-medium text-slate-200">{user.displayName || 'Vamsi Kiran'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
            ) : (
              <button
                onClick={signIn}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 hover:bg-cyan-500/25 text-cyan-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Sign In with Google
              </button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
          {activeTab === 'ai-tutor' ? (
            <GenerativeAITutor
              courseContext={selectedCourse}
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

              {/* ── Metric Cards Row ── */}
              <div className="grid grid-cols-4 gap-4">
                {/* 1. Daily Progress Ring */}
                <div className="cyber-card p-4 flex items-center gap-3.5">
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-12 h-12 -rotate-90">
                      <circle cx="24" cy="24" r="20" stroke="#1e293b" strokeWidth="3.5" fill="none" />
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="#00f0ff"
                        strokeWidth="3.5"
                        strokeDasharray="125.6"
                        strokeDashoffset="40.2"
                        strokeLinecap="round"
                        fill="none"
                      />
                    </svg>
                    <span className="absolute font-bold text-xs text-white">68%</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-200 block">Daily Progress</span>
                    <span className="text-[10px] text-slate-400 font-mono">34 / 50 study hours</span>
                    <div className="w-20 h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                      <div className="w-[68%] h-full bg-cyan-400 rounded-full"></div>
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
                      <span className="font-bold text-base text-white">14</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200 block">Days Streak</span>
                    <span className="text-[10px] text-amber-400 font-medium">Keep it going! 🔥</span>
                  </div>
                </div>

                {/* 3. Topics Left */}
                <div className="cyber-card p-4 flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-base text-white">12</span>
                    <span className="text-[11px] font-semibold text-slate-200 block">Topics Left</span>
                    <span className="text-[10px] text-slate-400">Focus areas remaining</span>
                  </div>
                </div>

                {/* 4. Motivational Quote */}
                <div className="cyber-card p-4 flex flex-col justify-center border-indigo-500/20 bg-gradient-to-br from-[#0b132b]/80 to-[#101b3d]/60">
                  <p className="text-xs italic text-indigo-200 leading-snug">
                    "Small steps every day build big results."
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
                    <button
                      onClick={() => onNavigate('master-schedule')}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Full Plan</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

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
                          <div
                            className={`w-1.5 h-7 rounded-full mt-0.5 ${
                              task.category === 'Operating Systems'
                                ? 'bg-cyan-400'
                                : task.category === 'Machine Learning'
                                ? 'bg-purple-400'
                                : task.category === 'Database Systems'
                                ? 'bg-blue-400'
                                : 'bg-amber-400'
                            }`}
                          />
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
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                              task.category === 'Operating Systems'
                                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                                : task.category === 'Machine Learning'
                                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                : task.category === 'Database Systems'
                                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {task.category}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Knowledge Coverage */}
                <div className="cyber-card p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>Knowledge Coverage</span>
                    </div>

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
                            strokeDashoffset="63.5"
                            strokeLinecap="round"
                            fill="none"
                          />
                        </svg>
                        <div className="absolute text-center">
                          <span className="font-extrabold text-xl text-white">78%</span>
                          <span className="text-[10px] text-slate-400 block font-mono">Covered</span>
                        </div>
                      </div>

                      {/* Breakdown Bars */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                            <span className="text-slate-300">High Priority</span>
                          </div>
                          <span className="text-white font-bold">12 / 16</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                            <span className="text-slate-300">Medium Priority</span>
                          </div>
                          <span className="text-white font-bold">8 / 12</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                            <span className="text-slate-300">Low Priority</span>
                          </div>
                          <span className="text-white font-bold">4 / 8</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigate('dashboard')}
                    className="w-full mt-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>View Detailed Coverage</span>
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
                    <button
                      onClick={() => setActiveTab('ai-tutor')}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer"
                    >
                      <span>View All</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div
                      onClick={() => setActiveTab('ai-tutor')}
                      className="p-3 rounded-xl bg-[#0b132b]/80 border border-sky-500/15 hover:border-cyan-400/40 flex items-center justify-between transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <Shield className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-white block">
                            Network Security & Firewalls
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono truncate max-w-[200px] block">
                            Explained packet filtering and NAT invariants...
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Today, 6:42 PM</span>
                    </div>

                    <div
                      onClick={() => setActiveTab('ai-tutor')}
                      className="p-3 rounded-xl bg-[#0b132b]/80 border border-sky-500/15 hover:border-cyan-400/40 flex items-center justify-between transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                          <GraduationCap className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-white block">
                            Linear Regression Doubts
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono truncate max-w-[200px] block">
                            Helped with cost function and gradient descent...
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Yesterday, 8:15 PM</span>
                    </div>

                    <div
                      onClick={() => setActiveTab('ai-tutor')}
                      className="p-3 rounded-xl bg-[#0b132b]/80 border border-sky-500/15 hover:border-cyan-400/40 flex items-center justify-between transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                          <Database className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-white block">
                            Database Normalization
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono truncate max-w-[200px] block">
                            Covered 1NF, 2NF and 3NF with examples...
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Oct 12, 2025</span>
                    </div>
                  </div>
                </div>

                {/* Knowledge Base Card */}
                <div className="cyber-card p-5">
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <BookOpen className="w-4 h-4 text-cyan-400" />
                      <span>Knowledge Base</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-medium">
                        Indexed
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
                        <span className="text-xs font-semibold text-slate-200">Syllabus (PDF)</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {knowledgeStats.categories.syllabus.count || 12} documents •{' '}
                        {knowledgeStats.categories.syllabus.chunks || 48} chunks
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#0b132b]/80 border border-sky-500/15 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-200">Notes</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {knowledgeStats.categories.notes.count || 5} documents •{' '}
                        {knowledgeStats.categories.notes.chunks || 22} chunks
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#0b132b]/80 border border-sky-500/15 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-200">PPTs</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {knowledgeStats.categories.ppt.count || 3} documents •{' '}
                        {knowledgeStats.categories.ppt.chunks || 18} chunks
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#0b132b]/80 border border-sky-500/15 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-200">Web Resources</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {knowledgeStats.categories.web.count || 7} documents •{' '}
                        {knowledgeStats.categories.web.chunks || 31} chunks
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
          3. RIGHT PANEL: DOCKED LIVE VOICE COACH (From Mockup)
      ═══════════════════════════════════════════════════════════ */}
      {isVoiceCoachDocked && (
        <aside className="w-[360px] h-full p-4 shrink-0 bg-[#070b19] border-l border-sky-500/15 flex flex-col z-20">
          <VoiceCoachPanel
            courseName={selectedCourse}
            modules={modules}
            resources={resources}
            syllabusText={syllabusText}
            onMinimize={() => setIsVoiceCoachDocked(false)}
            onClose={() => setIsVoiceCoachDocked(false)}
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
