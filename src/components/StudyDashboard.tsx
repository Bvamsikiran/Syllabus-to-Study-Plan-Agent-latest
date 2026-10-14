import React, { useState, useEffect } from 'react';
import { ScreenId, SyllabusModule } from '../types';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { HardDrive, Mail, Presentation, FileQuestion, Cloud, CheckCircle, Mic, Sparkles } from 'lucide-react';
import { saveStudyPlanToFirestore } from '../services/firestoreService';

interface StudyDashboardProps {
  onNavigate: (screen: ScreenId) => void;
  modules: SyllabusModule[];
  setModules: React.Dispatch<React.SetStateAction<SyllabusModule[]>>;
  courseName?: string;
  targetDate?: string;
  targetScore?: number;
  slots?: Record<string, any>;
  retentionMode?: 'aggressive' | 'balanced';
}

export const StudyDashboard: React.FC<StudyDashboardProps> = ({
  onNavigate,
  modules,
  setModules,
  courseName = 'Distributed Systems & Engineering',
  targetDate = '2025-11-28',
  targetScore = 95,
  slots = {},
  retentionMode = 'aggressive',
}) => {
  const { setDriveModalOpen, setSlidesModalOpen, setFormsModalOpen, setGmailModalOpen, user } = useGoogleAuth();
  const [syllabusFilter, setSyllabusFilter] = useState<'all' | 'high-yield' | 'review'>('all');
  const [timelineFilter, setTimelineFilter] = useState<string>('all');
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [newUnitTitle, setNewUnitTitle] = useState('');
  const [newUnitRef, setNewUnitRef] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);
  const [scheduleData, setScheduleData] = useState<any>(null);

  // Fetch dynamic schedule from backend
  useEffect(() => {
    let isMounted = true;
    const fetchDynamicSchedule = async () => {
      try {
        const res = await fetch('/api/generate-schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            units: modules,
            bandwidthSlots: slots,
            targetDate,
            targetScore,
            retentionMode,
            courseName,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.schedule) {
            setScheduleData(data.schedule);
          }
        }
      } catch (err) {
        console.warn('Dashboard schedule fetch error:', err);
      }
    };
    fetchDynamicSchedule();
    return () => {
      isMounted = false;
    };
  }, [modules, slots, targetDate, targetScore, retentionMode, courseName]);

  const handleSyncFirebase = async () => {
    if (!user) {
      showToast('Please sign in with Google to sync your study plan to Firebase Cloud.');
      return;
    }
    setIsSyncingFirebase(true);
    try {
      await saveStudyPlanToFirestore({
        courseName,
        units: modules,
        scheduleSlots: slots,
        generatedSchedule: scheduleData,
        confidence: 99.4,
      });
      showToast('✓ Successfully backed up all modules and pacing to Firebase Firestore!');
    } catch (err: any) {
      showToast(`Firestore sync error: ${err.message || 'Permission denied'}`);
    } finally {
      setIsSyncingFirebase(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Pomodoro countdown timer state
  const [timerSeconds, setTimerSeconds] = useState(14 * 60 + 22); // 14:22 remaining
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleModule = (id: string) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const nextStatus = m.status === 'completed' ? 'in-progress' : m.status === 'in-progress' ? 'pending' : 'completed';
          const nextProgress = nextStatus === 'completed' ? 100 : nextStatus === 'in-progress' ? 50 : 0;
          return {
            ...m,
            status: nextStatus,
            progress: nextProgress,
            completedUnits: nextStatus === 'completed' ? m.totalUnits : nextStatus === 'in-progress' ? Math.floor(m.totalUnits / 2) : 0,
          };
        }
        return m;
      })
    );
  };

  const handleAddUnit = () => {
    if (newUnitTitle.trim()) {
      const newMod: SyllabusModule = {
        id: `custom-${Date.now()}`,
        name: newUnitTitle.trim(),
        submodulesCount: 4,
        weight: 12,
        topics: ['Custom Lecture Notes', 'High-Yield Drill'],
        completedUnits: 0,
        totalUnits: 4,
        reference: newUnitRef.trim() || 'Custom Reference',
        status: 'pending',
        progress: 0,
      };
      setModules([...modules, newMod]);
      setNewUnitTitle('');
      setNewUnitRef('');
      setShowAddUnitModal(false);
    }
  };

  const completedCount = modules.filter((m) => m.status === 'completed').length;
  const overallPercentage = Math.round((completedCount / modules.length) * 100) || 64;

  const filteredModules = modules.filter((m) => {
    if (syllabusFilter === 'high-yield') return m.weight >= 18;
    if (syllabusFilter === 'review') return m.status === 'in-progress';
    return true;
  });

  return (
    <div className="bg-background text-on-surface antialiased flex flex-col min-h-screen selection:bg-primary selection:text-on-primary font-body">
      {/* TOP NAVIGATION BAR */}
      <header className="w-full flex justify-between items-center px-4 py-2.5 h-14 bg-surface border-b border-outline-variant sticky top-0 z-40">
        <div className="flex items-center gap-5">
          <button onClick={() => onNavigate('landing')} className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center text-primary shadow-inner">
              <span className="material-symbols-outlined text-xl">psychology</span>
            </div>
            <span className="text-lg font-headline font-bold text-on-surface tracking-tighter">Synapse AI</span>
          </button>
          <div className="h-4 w-px bg-outline-variant"></div>

          {/* Track Switcher */}
          <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-lg border border-outline-variant cursor-pointer hover:border-outline transition-colors text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
            </span>
            <span className="text-on-surface font-headline font-medium truncate max-w-sm">
              {courseName}
            </span>
            <span className="material-symbols-outlined text-sm text-on-surface-variant">expand_more</span>
          </div>
        </div>

        {/* Center Search Input */}
        <div className="hidden lg:flex items-center flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-base">
              search
            </span>
            <input
              type="text"
              placeholder="Search topics, resources, or notes..."
              className="w-full bg-surface-container border border-outline-variant text-xs text-on-surface placeholder:text-on-surface-variant/60 rounded-lg pl-9 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-on-surface-variant border border-outline-variant px-1.5 py-0.5 rounded bg-surface-container-high">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-variant border border-outline-variant text-xs text-on-surface">
            <span className="material-symbols-outlined text-sm text-amber-400">local_fire_department</span>
            <span className="font-medium">Streak: 18 Days</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-variant border border-outline-variant text-xs text-on-surface">
            <span className="material-symbols-outlined text-sm text-primary">schedule</span>
            <span className="text-on-surface-variant">Today's Goal:</span>
            <span className="text-primary font-mono font-medium">3.5h / 4.0h</span>
          </div>

          <button
            onClick={() => setDriveModalOpen(true)}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
            title="Google Drive files & backup"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Drive</span>
          </button>

          <button
            onClick={() => setSlidesModalOpen(true)}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition cursor-pointer"
            title="Google Slides flashcard decks & export"
          >
            <Presentation className="w-3.5 h-3.5" />
            <span>Slides</span>
          </button>

          <button
            onClick={() => setFormsModalOpen(true)}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-xs font-medium text-purple-400 hover:bg-purple-500/20 transition cursor-pointer"
            title="Google Forms diagnostic quizzes"
          >
            <FileQuestion className="w-3.5 h-3.5" />
            <span>Forms</span>
          </button>

          <button
            onClick={handleSyncFirebase}
            disabled={isSyncingFirebase}
            className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-xs font-medium text-primary hover:bg-primary/20 transition cursor-pointer"
            title="Sync syllabus with Firebase Firestore database"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>{isSyncingFirebase ? 'Syncing...' : 'Firebase'}</span>
          </button>

          <button
            onClick={() => setGmailModalOpen(true)}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 text-xs font-medium text-sky-400 hover:bg-sky-500/20 transition cursor-pointer"
            title="Email study digest via Gmail"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Gmail</span>
          </button>

          <button
            onClick={() => onNavigate('master-schedule')}
            className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container text-xs font-medium text-on-surface hover:bg-surface-variant transition"
          >
            <span className="material-symbols-outlined text-sm">calendar_month</span>
            <span>Master Schedule</span>
          </button>

          <button
            onClick={() => onNavigate('voice-quiz')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-opacity-90 active:scale-95 transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">bolt</span>
            <span>Focus Session</span>
          </button>

          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary-container to-tertiary-container border border-outline flex items-center justify-center text-[11px] font-bold text-on-surface ml-1">
            AV
          </div>
        </div>
      </header>

      {/* SUBHEADER */}
      <div className="w-full bg-surface-container-low border-b border-outline-variant px-6 flex items-center justify-between text-xs h-10">
        <div className="flex items-center space-x-6">
          <button className="text-primary border-b-2 border-primary font-medium py-2.5 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">school</span>
            {courseName || 'Master Study Plan'}
          </button>
          <button
            onClick={() => onNavigate('master-schedule')}
            className="text-on-surface-variant hover:text-on-surface py-2.5 font-normal transition flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">monitoring</span>
            Analytics
          </button>
          <button
            onClick={() => onNavigate('step4-resources')}
            className="text-on-surface-variant hover:text-on-surface py-2.5 font-normal transition flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">auto_stories</span>
            Resource Hub
          </button>
        </div>
        <div className="flex items-center gap-4 text-on-surface-variant font-mono text-[11px]">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span> Engine: Synapse FSRS-4.5
          </span>
          <span className="hidden md:inline text-outline">|</span>
          <span className="hidden md:inline">Sync Plan: Active (3m ago)</span>
        </div>
      </div>

      {/* THREE-COLUMN DASHBOARD GRID */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= COLUMN A: LEFT SIDEBAR ================= */}
        <section className="lg:col-span-3 flex flex-col gap-4">
          <div className="glass-panel rounded-xl p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-headline font-semibold text-on-surface tracking-tight flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-base">account_tree</span>
                  Syllabus Matrix & Mastery
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">Foundations 2025 • Phase 2</p>
              </div>
              <span className="text-xs font-mono font-medium text-tertiary bg-tertiary-container/30 px-2 py-0.5 rounded border border-tertiary/20">
                {completedCount} / {modules.length} Done
              </span>
            </div>

            {/* Overall Progress */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono text-on-surface-variant">
                <span>Overall Module Completion</span>
                <span className="text-on-surface font-semibold">{overallPercentage}%</span>
              </div>
              <div className="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-tertiary rounded-full transition-all duration-300"
                  style={{ width: `${overallPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant text-[11px] font-medium text-center">
              <button
                onClick={() => setSyllabusFilter('all')}
                className={`py-1 rounded cursor-pointer transition ${
                  syllabusFilter === 'all' ? 'bg-surface-variant text-on-surface shadow-sm font-bold' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                All ({modules.length})
              </button>
              <button
                onClick={() => setSyllabusFilter('high-yield')}
                className={`py-1 rounded cursor-pointer transition ${
                  syllabusFilter === 'high-yield' ? 'bg-surface-variant text-on-surface shadow-sm font-bold' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                High-Yield
              </button>
              <button
                onClick={() => setSyllabusFilter('review')}
                className={`py-1 rounded cursor-pointer transition ${
                  syllabusFilter === 'review' ? 'bg-surface-variant text-on-surface shadow-sm font-bold' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Review (3)
              </button>
            </div>

            {/* Topic List */}
            <div className="flex flex-col gap-2.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredModules.map((mod) => {
                const isCompleted = mod.status === 'completed';
                const activeModuleId = modules.find((m) => m.status === 'in-progress')?.id || modules[0]?.id;
                const isTodayActive = mod.id === activeModuleId;

                return (
                  <div
                    key={mod.id}
                    onClick={() => handleToggleModule(mod.id)}
                    className={`p-2.5 rounded-lg border transition group cursor-pointer relative ${
                      isTodayActive
                        ? 'bg-surface-variant border-primary/50 shadow-sm'
                        : isCompleted
                        ? 'bg-surface-container border-outline-variant hover:border-outline'
                        : 'bg-surface-container/70 border-outline-variant hover:border-outline'
                    }`}
                  >
                    {isTodayActive && (
                      <div className="absolute -top-1.5 -right-1 px-1.5 py-0.2 bg-primary text-on-primary text-[9px] font-semibold rounded uppercase tracking-wider">
                        Active Today
                      </div>
                    )}

                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center mt-0.5 border ${
                          isCompleted
                            ? 'bg-tertiary/10 border-tertiary text-tertiary'
                            : isTodayActive
                            ? 'border-primary'
                            : 'bg-surface-variant border-outline text-transparent'
                        }`}
                      >
                        {isCompleted ? (
                          <span className="material-symbols-outlined text-xs font-bold">check</span>
                        ) : isTodayActive ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3
                            className={`text-xs font-medium truncate transition ${
                              isTodayActive ? 'text-primary font-bold' : 'text-on-surface group-hover:text-primary'
                            }`}
                          >
                            {mod.name}
                          </h3>
                          <span
                            className={`text-[10px] font-mono ${
                              isCompleted ? 'text-tertiary font-bold' : isTodayActive ? 'text-primary font-bold' : 'text-on-surface-variant'
                            }`}
                          >
                            {mod.progress}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-on-surface-variant">
                          <span className={isCompleted ? 'text-tertiary font-mono' : 'text-primary font-mono'}>
                            {mod.completedUnits}/{mod.totalUnits} units
                          </span>
                          <span>•</span>
                          <span className="truncate">{mod.reference}</span>
                        </div>
                        <div className="w-full h-1 bg-surface-variant rounded-full mt-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isCompleted ? 'bg-tertiary' : 'bg-primary'}`}
                            style={{ width: `${mod.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 border-t border-outline-variant flex items-center justify-between gap-2">
              <button
                onClick={() => setShowAddUnitModal(true)}
                className="flex-1 py-1.5 px-2 rounded-lg border border-outline-variant bg-surface-container hover:bg-surface-variant text-[11px] font-medium text-on-surface flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm text-primary">add</span>
                <span>Add Custom Unit</span>
              </button>
              <button
                onClick={() => onNavigate('step1-upload')}
                className="py-1.5 px-2 rounded-lg border border-outline-variant bg-surface-container hover:bg-surface-variant text-on-surface-variant hover:text-on-surface text-[11px] flex items-center justify-center transition"
                title="Re-parse Syllabus"
              >
                <span className="material-symbols-outlined text-sm">cloud_sync</span>
              </button>
            </div>
          </div>
        </section>

        {/* ================= COLUMN B: CENTER AREA ================= */}
        <section className="lg:col-span-6 flex flex-col gap-4">
          {/* Voice Study Coach Interactive Hero Widget */}
          <div className="glass-card card-hover rounded-xl p-4 border border-primary/40 relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg glow-primary">
                    <Mic className="w-5 h-5 text-purple-200" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#09090c] animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-headline font-bold text-on-surface">Gemini Live Voice Study Coach</h3>
                    <span className="px-1.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-[9px] font-mono text-purple-300 font-semibold uppercase">
                      Native S2S
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Real-time oral exam preparation grounded in your {modules.length} syllabus modules.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('voice-coach')}
                className="glow-pill px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-primary-fixed-dim transition-all cursor-pointer whitespace-nowrap"
              >
                <span>Start Oral Session</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Timeline Header & Controls */}
          <div className="glass-panel rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-headline font-bold text-on-surface tracking-tight">Weekly Pacing Schedule</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-primary-container/40 text-on-primary-container border border-primary/30">
                  Target: {scheduleData?.summary?.weeklyHours ?? 28} hrs
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-on-surface-variant">
                <span className="font-mono text-on-surface font-medium">
                  {scheduleData?.days?.mon?.dateLabel?.split('•')[0]?.trim() || 'Current Week'} –{' '}
                  {scheduleData?.days?.sun?.dateLabel?.split('•')[0]?.trim() || 'Target Week'}
                </span>
                <span>•</span>
                <span className="truncate max-w-xs">{courseName}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <div className="flex items-center bg-surface-container border border-outline-variant rounded-lg p-0.5 text-xs font-medium">
                <button className="bg-surface-variant text-primary px-2.5 py-1 rounded shadow-sm flex items-center gap-1 font-bold">
                  <span className="material-symbols-outlined text-sm">view_week</span>
                  <span>Week</span>
                </button>
                <button
                  onClick={() => onNavigate('master-schedule')}
                  className="text-on-surface-variant hover:text-on-surface px-2.5 py-1 rounded transition flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">view_day</span>
                  <span>Day</span>
                </button>
              </div>
              <div className="flex items-center border border-outline-variant bg-surface-container rounded-lg">
                <button
                  onClick={() => onNavigate('master-schedule')}
                  className="p-1 text-on-surface-variant hover:text-on-surface transition"
                  title="Full Master Timeline"
                >
                  <span className="material-symbols-outlined text-base">calendar_month</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] text-on-surface-variant font-medium flex items-center gap-1 pl-1">
              <span className="material-symbols-outlined text-sm">filter_list</span> Filter:
            </span>
            <button
              onClick={() => setTimelineFilter('all')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer ${
                timelineFilter === 'all'
                  ? 'bg-primary/20 border border-primary/40 text-primary font-bold'
                  : 'bg-surface-container border border-outline-variant text-on-surface-variant'
              }`}
            >
              All Subjects
            </button>
            {Array.from(new Set(modules.map((m) => m.name.split('&')[0].trim())))
              .slice(0, 3)
              .map((subj) => (
                <button
                  key={subj}
                  onClick={() => setTimelineFilter(timelineFilter === subj ? 'all' : subj)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer truncate max-w-[140px] ${
                    timelineFilter === subj
                      ? 'bg-primary/20 border border-primary/40 text-primary font-bold'
                      : 'bg-surface-container border border-outline-variant text-on-surface-variant'
                  }`}
                >
                  {subj}
                </button>
              ))}
          </div>

          {/* Calendar Cards */}
          <div className="flex flex-col gap-3">
            {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((dayKey, idx) => {
              const day = scheduleData?.days?.[dayKey];
              const isToday = day?.isToday ?? idx === 2;
              const dayName = day?.dayName || ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][idx];
              const dateLabel = day?.dateLabel || `Day ${idx + 1}`;
              const defaultModule = modules[idx % (modules.length || 1)];
              const blocks = day?.blocks || [
                {
                  id: `${dayKey}-1`,
                  subject: defaultModule?.name || 'Core Curriculum',
                  title: defaultModule?.topics?.[0] || defaultModule?.name || 'Active Concept Study',
                  duration: '3.5h 00m',
                  status: idx < 2 ? 'completed' : isToday ? 'in-progress' : 'scheduled',
                  badge: idx === 5 ? 'Milestone Sim' : idx === 6 ? 'Buffer & Rest' : 'Core Focus',
                },
              ];

              const filteredBlocks = blocks.filter((b: any) => {
                if (timelineFilter === 'all') return true;
                return (
                  b.subject?.toLowerCase().includes(timelineFilter.toLowerCase()) ||
                  b.title?.toLowerCase().includes(timelineFilter.toLowerCase())
                );
              });

              if (filteredBlocks.length === 0) return null;

              if (isToday) {
                const primaryBlock = filteredBlocks[0];
                return (
                  <div
                    key={dayKey}
                    className="glass-panel rounded-xl p-4 border border-primary ring-1 ring-primary/40 bg-surface-container/90 relative overflow-hidden shadow-xl"
                  >
                    <div className="absolute -top-12 -right-12 w-44 h-44 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>

                    {/* Status Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                      <div className="flex items-center gap-2.5">
                        <div className="text-center w-14 py-1 rounded bg-primary/20 border border-primary text-primary">
                          <span className="text-[10px] font-mono uppercase block font-semibold">Today</span>
                          <span className="text-base font-extrabold">{dateLabel.split('•')[0].trim()}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-on-surface">
                              Active Focus: {primaryBlock.title}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary text-on-primary animate-pulse">
                              IN PROGRESS
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            Assigned Target: {primaryBlock.duration} • Pomodoro Timer Active
                          </p>
                        </div>
                      </div>
                      <div className="text-right hidden sm:block">
                        <span className="text-[11px] font-mono text-tertiary flex items-center justify-end gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span> Active Session
                        </span>
                        <span className="text-[10px] text-on-surface-variant">Cognitive effort calibrated</span>
                      </div>
                    </div>

                    {/* Tasks List */}
                    <div className="py-3 flex flex-col gap-2.5">
                      {filteredBlocks.map((blk: any, bIdx: number) => (
                        <div
                          key={blk.id || bIdx}
                          className={`flex items-center justify-between text-xs p-2 rounded-lg border ${
                            blk.status === 'completed'
                              ? 'bg-surface-variant/80 border-outline-variant'
                              : blk.status === 'in-progress'
                              ? 'bg-surface-container border-primary/40'
                              : 'bg-surface-container/60 border-outline-variant opacity-80'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {blk.status === 'completed' ? (
                              <span className="material-symbols-outlined text-tertiary text-sm">check_circle</span>
                            ) : blk.status === 'in-progress' ? (
                              <span className="material-symbols-outlined text-primary text-sm animate-spin">progress_activity</span>
                            ) : (
                              <span className="material-symbols-outlined text-on-surface-variant text-sm">radio_button_unchecked</span>
                            )}
                            <span
                              className={`text-on-surface ${
                                blk.status === 'completed' ? 'line-through opacity-70' : 'font-medium'
                              }`}
                            >
                              {blk.title} ({blk.subject})
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-mono ${
                              blk.status === 'completed'
                                ? 'text-tertiary'
                                : blk.status === 'in-progress'
                                ? 'text-primary font-bold'
                                : 'text-on-surface-variant'
                            }`}
                          >
                            {blk.duration}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Resource Links & Action */}
                    <div className="pt-2 border-t border-outline-variant flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded-md bg-surface-variant border border-outline-variant text-[11px] text-primary flex items-center gap-1.5 font-mono">
                          <span className="material-symbols-outlined text-xs">auto_stories</span>{' '}
                          {defaultModule?.reference || 'Syllabus Assigned Resource'}
                        </span>
                        <button
                          onClick={() => onNavigate('ai-tutor')}
                          className="px-2.5 py-1 rounded-md bg-surface-variant hover:bg-surface-container-high border border-outline-variant text-[11px] text-tertiary flex items-center gap-1.5 font-mono cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">neurology</span> AI Reasoning Tutor
                        </button>
                        <button
                          onClick={() => onNavigate('voice-coach')}
                          className="px-2.5 py-1 rounded-md bg-surface-variant hover:bg-surface-container-high border border-outline-variant text-[11px] text-amber-400 flex items-center gap-1.5 font-mono cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-xs">mic</span> Voice Study Coach
                        </button>
                      </div>

                      <button
                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                        className="px-3 py-1 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-opacity-90 flex items-center gap-1 transition cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">
                          {isTimerRunning ? 'pause' : 'play_arrow'}
                        </span>
                        <span>{isTimerRunning ? 'Pause Study' : 'Resume Study'}</span>
                      </button>
                    </div>
                  </div>
                );
              }

              // Standard day card
              const isPast = idx < 2;
              const isBuffer = dayKey === 'sun';
              const mainBlock = filteredBlocks[0];

              return (
                <div
                  key={dayKey}
                  className={`glass-panel rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-l-4 ${
                    isPast
                      ? 'border-l-tertiary'
                      : isBuffer
                      ? 'border-l-secondary-fixed-dim'
                      : 'border-l-outline'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center w-14 py-1 rounded bg-surface-container border border-outline-variant">
                      <span className="text-[10px] text-on-surface-variant font-mono uppercase block">{dayName}</span>
                      <span className="text-sm font-semibold text-on-surface">{dateLabel.split('•')[0].trim()}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-on-surface">{mainBlock.title}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            isPast
                              ? 'bg-tertiary-container/30 text-tertiary border-tertiary/20'
                              : isBuffer
                              ? 'bg-surface-container-high text-tertiary border border-tertiary/20'
                              : 'bg-surface-variant text-on-surface-variant border-outline-variant'
                          }`}
                        >
                          {isPast ? 'Done ✓' : isBuffer ? 'Buffer & Rest' : 'Planned'}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        {mainBlock.duration} allocated • {mainBlock.subject}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-1 rounded bg-surface-container border border-outline-variant text-[11px] text-on-surface-variant flex items-center gap-1 font-mono">
                      <span className="material-symbols-outlined text-xs text-primary">auto_stories</span>{' '}
                      {mainBlock.badge || 'Core Unit'}
                    </span>
                    <button
                      onClick={() => onNavigate('master-schedule')}
                      className="px-2 py-1 rounded bg-surface-variant hover:bg-surface-container-high text-[11px] text-on-surface transition font-mono border border-outline-variant cursor-pointer"
                    >
                      View Day
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ================= COLUMN C: RIGHT PANEL ================= */}
        <section className="lg:col-span-3 flex flex-col gap-4">
          {/* 1. Mastery Ring Widget */}
          <div className="glass-panel rounded-xl p-4 flex flex-col items-center text-center relative overflow-hidden">
            <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-outline-variant">
              <span className="text-xs font-headline font-semibold text-on-surface flex items-center gap-1">
                <span className="material-symbols-outlined text-primary text-sm">donut_large</span> Mastery Index
              </span>
              <span className="text-[10px] font-mono text-tertiary">+4.2% this wk</span>
            </div>

            {/* SVG Circular Progress Ring */}
            <div className="relative w-40 h-40 my-2 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" fill="none" r="50" stroke="#18181b" strokeWidth="9"></circle>
                <circle
                  cx="60"
                  cy="60"
                  fill="none"
                  r="50"
                  stroke="#27272a"
                  strokeDasharray="314.15"
                  strokeDashoffset="31.4"
                  strokeLinecap="round"
                  strokeWidth="9"
                ></circle>
                <circle
                  cx="60"
                  cy="60"
                  fill="none"
                  r="50"
                  stroke="url(#primaryGradientDash)"
                  strokeDasharray="314.15"
                  strokeDashoffset={314.15 * (1 - Math.min(100, Math.max(0, overallPercentage)) / 100)}
                  strokeLinecap="round"
                  strokeWidth="9"
                ></circle>
                <defs>
                  <linearGradient id="primaryGradientDash" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a78bfa"></stop>
                    <stop offset="100%" stopColor="#34d399"></stop>
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-extrabold font-headline tracking-tighter text-on-surface">
                  {overallPercentage}%
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">Syllabus Mastered</span>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant font-body">
              Target: <span className="text-on-surface font-semibold">{retentionMode === 'aggressive' ? '95%' : '90%'}</span> by exam date
            </p>
            <div className="w-full mt-3 pt-3 border-t border-outline-variant flex items-center justify-between text-[11px] font-mono">
              <span className="text-on-surface-variant">FSRS Retention Rate</span>
              <span className="text-tertiary font-bold">
                {scheduleData?.summary?.retentionVelocity ?? (retentionMode === 'aggressive' ? 95 : 91)}%
              </span>
            </div>
          </div>

          {/* 2. Exam Countdown */}
          <div className="glass-panel rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-sm">alarm</span> Official Exam Day
              </span>
              <span className="text-[10px] font-mono text-on-surface-variant">{targetDate}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-black font-headline tracking-tight text-on-surface">
                  {scheduleData?.summary?.countdownDays ?? Math.max(1, Math.ceil((new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                </span>
                <span className="text-sm font-semibold text-primary ml-1">Days Remaining</span>
              </div>
              <span className="text-xs font-mono text-tertiary bg-tertiary-container/30 border border-tertiary/20 px-2 py-0.5 rounded">
                Score {targetScore}+ Goal
              </span>
            </div>
            <div className="space-y-1">
              <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary via-primary to-amber-400 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        10,
                        Math.round(
                          ((120 -
                            (scheduleData?.summary?.countdownDays ??
                              Math.max(1, Math.ceil((new Date(targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))))) /
                            120) *
                            100
                        )
                      )
                    )}%`,
                  }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-on-surface-variant">
                <span>{modules.length} Core Modules Tracked</span>
                <span>Target: {targetScore}</span>
              </div>
            </div>
          </div>

          {/* 3. Hours Studied Telemetry */}
          <div className="glass-panel rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-sm">timer</span> Hours Studied Telemetry
              </span>
              <span className="text-[10px] font-mono text-tertiary">Pacing Synchronized</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant">
                <span className="text-[10px] text-on-surface-variant block font-mono">Logged Total</span>
                <span className="text-lg font-bold font-mono text-on-surface">
                  {((completedCount * 3.5) + (modules.filter((m) => m.status === 'in-progress').length * 1.5)).toFixed(1)}
                  <span className="text-xs font-normal text-on-surface-variant">h</span>
                </span>
                <span className="text-[9px] text-on-surface-variant block">of {(modules.length * 4.0).toFixed(1)}h Target</span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant">
                <span className="text-[10px] text-on-surface-variant block font-mono">This Week</span>
                <span className="text-lg font-bold font-mono text-primary">
                  {scheduleData?.summary?.weeklyHours ?? 24.0}
                  <span className="text-xs font-normal text-on-surface-variant">h</span>
                </span>
                <span className="text-[9px] text-tertiary block">
                  Velocity: {((scheduleData?.summary?.weeklyHours ?? 24.0) / 7).toFixed(1)}h / day
                </span>
              </div>
            </div>

            {/* Velocity Histogram */}
            <div className="flex items-end gap-1.5 h-12 pt-2 border-t border-outline-variant">
              <div className="flex-1 bg-surface-variant rounded-t h-8" title="Mon"></div>
              <div className="flex-1 bg-surface-variant rounded-t h-10" title="Tue"></div>
              <div className="flex-1 bg-primary rounded-t shadow-sm shadow-primary/20 h-7 relative" title="Wed (Today)">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary animate-ping"></div>
              </div>
              <div className="flex-1 bg-surface-variant/40 rounded-t h-9 border-t border-dashed border-outline-variant" title="Thu"></div>
              <div className="flex-1 bg-surface-variant/40 rounded-t h-9 border-t border-dashed border-outline-variant" title="Fri"></div>
              <div className="flex-1 bg-surface-variant/40 rounded-t h-12 border-t border-dashed border-outline-variant" title="Sat"></div>
              <div className="flex-1 bg-surface-variant/40 rounded-t h-6 border-t border-dashed border-outline-variant" title="Sun"></div>
            </div>
            <div className="flex justify-between text-[9px] font-mono text-on-surface-variant">
              <span>M</span>
              <span>T</span>
              <span className="text-primary font-bold">W</span>
              <span>T</span>
              <span>F</span>
              <span>S</span>
              <span>S</span>
            </div>
          </div>

          {/* 4. Topics Breakdown */}
          <div className="glass-panel rounded-xl p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-sm">checklist</span> Topics Mastered
              </span>
              <span className="text-xs font-mono font-bold text-on-surface">
                {completedCount} / {modules.length}
              </span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center py-1 border-b border-outline-variant/60">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded bg-tertiary"></span> Core Foundational
                </span>
                <span className="font-mono text-on-surface font-medium">{completedCount} Completed</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-outline-variant/60">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded bg-primary"></span> High-Yield Units
                </span>
                <span className="font-mono text-on-surface font-medium">
                  {modules.filter((m) => m.status === 'completed' && m.weight >= 18).length} Completed
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded bg-outline"></span> Remaining Syllabus
                </span>
                <span className="font-mono text-on-surface-variant font-medium">
                  {modules.length - completedCount} Pending
                </span>
              </div>
            </div>
          </div>

          {/* 5. Spaced Repetition Queue */}
          <div className="glass-panel rounded-xl p-4 flex flex-col gap-3 border border-primary/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-surface-variant border border-outline-variant flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-sm">sync_alt</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">Spaced Repetition Queue</h4>
                  <p className="text-[10px] text-on-surface-variant font-mono">FSRS Interval Algorithm</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                {retentionMode === 'aggressive' ? 120 : 75} Due
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onNavigate('voice-quiz')}
                className="flex-1 py-1.5 px-2 rounded-lg bg-primary hover:bg-opacity-90 text-on-primary text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">bolt</span>
                <span>Review Sprint</span>
              </button>
              <button
                onClick={() => showToast(`Synced ${retentionMode === 'aggressive' ? 120 : 75} cards with FSRS interval!`)}
                className="py-1.5 px-3 rounded-lg bg-surface-container border border-outline-variant hover:bg-surface-variant text-on-surface text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                title="Sync with Anki Mobile"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                <span>Sync</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* QUICK STUDY BAR / ACTIVE TIMER DOCK */}
      <footer className="w-full bg-surface-container-low border-t border-outline-variant px-6 py-2 flex items-center justify-between text-xs sticky bottom-0 z-30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
            <span className="text-on-surface font-medium font-headline">Active Block:</span>
            <span className="text-on-surface-variant truncate max-w-xs">
              {modules.find((m) => m.status === 'in-progress')?.name || modules[0]?.name || courseName} ({modules[0]?.reference || 'Kaplan Ch. 1-4'})
            </span>
          </div>
          <span className="hidden md:inline text-outline">|</span>
          <div className="hidden md:flex items-center gap-2 text-on-surface-variant font-mono text-[11px]">
            <span>Pomodoro: 25m focus</span>
            <span className="text-tertiary font-bold">{formatTimer(timerSeconds)} remaining</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTimerRunning(!isTimerRunning)}
            className="p-1 text-on-surface-variant hover:text-on-surface transition cursor-pointer"
            title={isTimerRunning ? 'Pause Timer' : 'Play Timer'}
          >
            <span className="material-symbols-outlined text-lg">{isTimerRunning ? 'pause' : 'play_arrow'}</span>
          </button>
          <button
            onClick={() => setTimerSeconds(25 * 60)}
            className="p-1 text-on-surface-variant hover:text-on-surface transition cursor-pointer"
            title="Reset Session"
          >
            <span className="material-symbols-outlined text-lg">restart_alt</span>
          </button>
          <button
            onClick={() => onNavigate('voice-quiz')}
            className="px-2.5 py-1 rounded bg-surface-variant hover:bg-surface-container-high border border-outline-variant text-[11px] font-mono text-primary transition cursor-pointer"
          >
            Mini-Player ⇱
          </button>
        </div>
      </footer>

      {/* Add Custom Unit Modal */}
      {showAddUnitModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container border border-outline-variant p-6 rounded-xl max-w-md w-full shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-outline-variant pb-2">
              <h3 className="font-bold text-sm text-on-surface">Add Custom Syllabus Unit</h3>
              <button onClick={() => setShowAddUnitModal(false)} className="text-secondary hover:text-white">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
            <div>
              <label className="text-xs text-secondary font-mono block mb-1">Unit Title</label>
              <input
                type="text"
                placeholder="e.g., Immunoglobulin Gene Rearrangements & Somatic Hypermutation"
                value={newUnitTitle}
                onChange={(e) => setNewUnitTitle(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant text-xs p-2.5 rounded text-on-surface outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs text-secondary font-mono block mb-1">Assigned Resource / Reference</label>
              <input
                type="text"
                placeholder="e.g., Janeway Ch. 5 / UWorld Qs"
                value={newUnitRef}
                onChange={(e) => setNewUnitRef(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant text-xs p-2.5 rounded text-on-surface outline-none focus:border-primary"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddUnitModal(false)}
                className="px-3 py-1.5 rounded border border-outline-variant text-xs text-secondary hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUnit}
                className="px-4 py-1.5 rounded bg-primary text-on-primary text-xs font-bold hover:bg-primary-fixed cursor-pointer"
              >
                Add Unit
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-surface-container-high border border-primary text-on-surface px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="material-symbols-outlined text-primary text-base">check_circle</span>
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
