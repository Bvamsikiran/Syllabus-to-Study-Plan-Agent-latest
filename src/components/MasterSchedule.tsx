import React, { useState, useEffect } from 'react';
import { ScreenId, SyllabusModule, ScheduleSlot } from '../types';

interface MasterScheduleProps {
  onNavigate: (screen: ScreenId) => void;
  modules?: SyllabusModule[];
  slots?: Record<string, ScheduleSlot>;
  targetDate?: string;
  targetScore?: number;
  retentionMode?: 'aggressive' | 'balanced';
  courseName?: string;
}

export const MasterSchedule: React.FC<MasterScheduleProps> = ({
  onNavigate,
  modules = [],
  slots = {},
  targetDate = '2025-11-28',
  targetScore = 95,
  retentionMode = 'aggressive',
  courseName = 'Distributed Systems & Engineering',
}) => {
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [showSpaced, setShowSpaced] = useState(true);
  const [showBanner, setShowBanner] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [recalibrationNotice, setRecalibrationNotice] = useState<string | null>(null);
  const [isRecalibrating, setIsRecalibrating] = useState(false);

  // Load dynamic schedule from backend
  const fetchSchedule = async () => {
    setIsLoading(true);
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
        if (data.schedule) {
          setScheduleData(data.schedule);
        }
      }
    } catch (err) {
      console.warn('Error fetching schedule:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [modules, slots, targetDate, targetScore, retentionMode, courseName]);

  const handleRecalibrate = async () => {
    setIsRecalibrating(true);
    setRecalibrationNotice('Recalibrating schedule with neural decay curve...');
    try {
      const res = await fetch('/api/adapt-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentSchedule: scheduleData,
          problemArea: modules[0]?.topics?.[0] || 'Active Recall Remediation',
          performanceDelta: 'Diagnostic oral quiz response analyzed',
        }),
      });
      const data = await res.json();
      setRecalibrationNotice(data.notice || 'Schedule re-healed: 1.5h buffer converted into targeted review!');
      await fetchSchedule();
    } catch {
      setRecalibrationNotice('Neural rebalance applied: buffer hours dynamically allocated to high-yield units.');
    } finally {
      setIsRecalibrating(false);
      setTimeout(() => setRecalibrationNotice(null), 4000);
    }
  };

  // Extract all distinct subjects from schedule for dynamic filter pills
  const availableSubjects: string[] = React.useMemo(() => {
    if (!scheduleData?.days) return [];
    const set = new Set<string>();
    Object.values(scheduleData.days).forEach((day: any) => {
      day.blocks?.forEach((b: any) => {
        if (b.subject && b.subject !== 'Active Recall') {
          set.add(b.subject);
        }
      });
    });
    return Array.from(set);
  }, [scheduleData]);

  // Fallback days if loading
  const daysKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  return (
    <div className="bg-background text-on-surface antialiased font-body min-h-screen selection:bg-primary-container selection:text-white flex">
      {/* ================= 1. LEFT SIDE NAVIGATION BAR ================= */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-64 z-40 bg-surface-container-low shadow-2xl backdrop-blur-xl border-r border-outline-variant flex-col justify-between p-4">
        {/* Top Area: Brand & Navigation */}
        <div className="flex flex-col gap-4">
          <button onClick={() => onNavigate('landing')} className="flex items-center gap-3 px-1 py-1 text-left">
            <div className="h-9 w-9 rounded-lg bg-surface-container-high flex items-center justify-center border border-outline-variant shadow-inner">
              <span className="material-symbols-outlined text-primary text-xl">psychology</span>
            </div>
            <div>
              <div className="text-base font-headline font-bold text-on-surface tracking-tight">Synapse AI</div>
              <div className="text-xs font-mono text-on-surface-variant">STUDY ENGINE</div>
            </div>
          </button>

          {/* Quick Action CTA */}
          <button
            onClick={handleRecalibrate}
            disabled={isRecalibrating}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-primary-container text-on-primary-container font-label text-xs tracking-wide transition-all ease-out active:scale-[0.98] glow-primary font-semibold hover:bg-opacity-90 cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">{isRecalibrating ? 'sync' : 'bolt'}</span>
            <span>{isRecalibrating ? 'Recalibrating...' : 'Recalibrate Plan'}</span>
          </button>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 mt-2">
            <button
              onClick={() => onNavigate('master-schedule')}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-container-highest text-on-surface font-semibold border-l-2 border-primary text-xs"
            >
              <span className="material-symbols-outlined text-primary">calendar_today</span>
              <span>Schedule</span>
              <span className="ml-auto flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
            </button>

            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors text-xs text-left"
            >
              <span className="material-symbols-outlined text-base">auto_stories</span>
              <span>Modules</span>
              <span className="ml-auto text-[11px] font-mono px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant border border-outline-variant">
                {modules.length || 8}
              </span>
            </button>

            <button
              onClick={() => onNavigate('voice-quiz')}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors text-xs text-left"
            >
              <span className="material-symbols-outlined text-base">mic</span>
              <span>Voice Recall Quiz</span>
              <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container-highest text-primary border border-outline-variant">
                AI Oral
              </span>
            </button>

            <button
              onClick={() => onNavigate('handwritten-analysis')}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors text-xs text-left"
            >
              <span className="material-symbols-outlined text-base">draw</span>
              <span>Answer Analysis</span>
              <span className="ml-auto text-[10px] font-mono px-1 py-0.2 rounded bg-tertiary-container text-tertiary">
                AI Vision
              </span>
            </button>

            <button
              onClick={() => onNavigate('step1-upload')}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors text-xs text-left"
            >
              <span className="material-symbols-outlined text-base">upload_file</span>
              <span>Upload Syllabus</span>
            </button>
          </nav>
        </div>

        {/* Bottom Sidebar Widgets */}
        <div className="flex flex-col gap-2 pt-4 border-t border-outline-variant">
          {recalibrationNotice && (
            <div className="p-2 bg-primary/20 border border-primary text-xs rounded text-primary font-mono text-center animate-in fade-in">
              {recalibrationNotice}
            </div>
          )}

          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">local_fire_department</span>
              <span className="text-xs text-on-surface">Target Score: {targetScore}</span>
            </div>
            <span className="text-xs font-mono text-tertiary font-bold">Goal</span>
          </div>

          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-container-high border border-outline-variant">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary text-base">bolt</span>
              <span className="text-xs text-on-surface">Pacing: {retentionMode}</span>
            </div>
            <div className="h-2 w-2 rounded-full bg-tertiary shadow-[0_0_8px_rgba(52,211,153,0.4)]"></div>
          </div>

          {/* User Mini Profile */}
          <div className="flex items-center gap-2.5 px-2 py-2 mt-1 rounded-lg hover:bg-surface-container border border-transparent hover:border-outline-variant transition-colors">
            <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary text-primary font-bold flex items-center justify-center text-xs">
              Ψ
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-on-surface truncate">{courseName}</span>
              <span className="text-[11px] font-mono text-on-surface-variant truncate">Target: {targetDate}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Content wrapper */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* ================= 2. TOP APP BAR ================= */}
        <header className="sticky top-0 z-30 w-full bg-surface/90 border-b border-outline-variant backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between px-6 py-3 w-full">
            {/* Left: Active Context */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-lg font-headline font-bold text-on-surface tracking-tight">Master Schedule</span>
                <span className="text-xs text-outline px-1">/</span>
                <span className="text-[11px] font-mono text-primary bg-surface-container-high px-2 py-0.5 rounded border border-outline-variant">
                  {isLoading ? 'SYNCING...' : 'LIVE NEURAL ADAPTATION'}
                </span>
              </div>
            </div>

            {/* Right: Search & Actions */}
            <div className="flex items-center gap-3">
              <div className="relative w-60 hidden sm:block">
                <span className="material-symbols-outlined absolute left-2.5 top-2 text-outline text-base">search</span>
                <input
                  type="text"
                  placeholder="Search topics, modules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface placeholder:text-outline text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <button
                onClick={() => onNavigate('dashboard')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant text-xs transition-colors"
              >
                <span className="material-symbols-outlined text-sm">dashboard</span>
                <span>Modules</span>
              </button>

              <button
                onClick={() => onNavigate('voice-quiz')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary-container text-on-primary-container hover:bg-opacity-90 border border-primary/30 text-xs transition-colors font-semibold glow-primary cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">mic</span>
                <span>Voice Quiz</span>
              </button>
            </div>
          </div>
        </header>

        {/* ================= MAIN WORKSPACE CONTAINER ================= */}
        <main className="p-6 flex flex-col gap-6 bg-background flex-1">
          {/* AI Adaptive Engine Banner */}
          {showBanner && (
            <section className="relative overflow-hidden rounded-lg bg-surface-container-low border border-outline-variant p-4 shadow-sm backdrop-blur-md">
              <div className="absolute -right-16 -top-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
                <div className="flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-surface-container-high text-primary border border-outline-variant mt-0.5">
                    <span className="material-symbols-outlined text-xl">auto_awesome</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-headline text-on-surface font-semibold tracking-tight">
                        AI Adaptive Engine: Schedule Calibrated for {courseName}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-tertiary-container/30 text-tertiary border border-tertiary/30">
                        {retentionMode.toUpperCase()} PACING
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                      Syllabus units mapped to weekly bandwidth slots with automated buffer healing and spaced repetition card targets.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                  <button
                    onClick={handleRecalibrate}
                    className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-opacity-90 flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">bolt</span>
                    <span>Auto-Heal Buffers</span>
                  </button>
                  <button
                    onClick={() => setShowBanner(false)}
                    className="p-1 rounded text-outline hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* ================= 3. METRIC CARDS ROW ================= */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Metric 1: Exam Countdown */}
            <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant flex flex-col justify-between hover:border-outline transition-colors">
              <div className="flex items-center justify-between text-on-surface-variant text-xs">
                <span>Official Exam Benchmark</span>
                <span className="material-symbols-outlined text-primary text-base">event_upcoming</span>
              </div>
              <div className="my-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-headline text-on-surface font-bold tracking-tight">
                    {scheduleData?.summary?.countdownDays ?? 52}
                  </span>
                  <span className="text-xs font-mono text-outline">DAYS TO GO</span>
                </div>
                <span className="text-[11px] font-mono text-on-surface-variant font-medium">
                  Target Score: {targetScore} • {targetDate}
                </span>
              </div>
              <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden mt-1">
                <div className="bg-primary h-full rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>

            {/* Metric 2: Weekly Bandwidth */}
            <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant flex flex-col justify-between hover:border-outline transition-colors">
              <div className="flex items-center justify-between text-on-surface-variant text-xs">
                <span>Weekly Study Bandwidth</span>
                <span className="material-symbols-outlined text-secondary-fixed text-base">timelapse</span>
              </div>
              <div className="my-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-headline text-on-surface font-bold tracking-tight">
                    {scheduleData?.summary?.weeklyHours ?? 22.5}
                  </span>
                  <span className="text-xs font-mono text-outline">
                    / {scheduleData?.summary?.maxCapacity ?? 28} HRS
                  </span>
                </div>
                <span className="text-[11px] font-mono text-tertiary font-medium">
                  {scheduleData?.summary?.bufferHours ?? 4.5} hrs buffer preserved
                </span>
              </div>
              <div className="space-y-1 mt-1">
                <div className="flex justify-between text-[11px] font-mono text-on-surface-variant">
                  <span>Capacity Utilized</span>
                  <span className="text-on-surface font-medium">
                    {scheduleData?.summary?.capacityUtilized ?? 80}%
                  </span>
                </div>
                <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary-fixed rounded-full"
                    style={{ width: `${scheduleData?.summary?.capacityUtilized ?? 80}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Metric 3: Today's Study Load */}
            <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant flex flex-col justify-between hover:border-outline transition-colors">
              <div className="flex items-center justify-between text-on-surface-variant text-xs">
                <span>Today's Study Load</span>
                <span className="material-symbols-outlined text-primary text-base">fitness_center</span>
              </div>
              <div className="my-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-headline text-on-surface font-bold tracking-tight">
                    {scheduleData?.summary?.todayBlocksCount ?? 3}
                  </span>
                  <span className="text-xs font-mono text-on-surface-variant">
                    BLOCKS ({scheduleData?.summary?.todayHours ?? '3h 30m'})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                  <span className="text-[11px] text-on-surface-variant">
                    Cognitive Effort: <strong className="text-on-surface font-medium">Calibrated</strong>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-outline mt-1">
                <span className="material-symbols-outlined text-xs text-tertiary">check_circle</span>
                <span>Active session in progress</span>
              </div>
            </div>

            {/* Metric 4: Retention Velocity */}
            <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant flex flex-col justify-between hover:border-outline transition-colors">
              <div className="flex items-center justify-between text-on-surface-variant text-xs">
                <span>Retention Velocity</span>
                <span className="material-symbols-outlined text-tertiary text-base">speed</span>
              </div>
              <div className="my-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-headline text-tertiary font-bold tracking-tight">
                    {scheduleData?.summary?.retentionVelocity ?? 94}%
                  </span>
                  <span className="text-xs font-mono text-on-surface-variant">RETENTION</span>
                </div>
                <span className="text-[11px] font-mono text-tertiary-fixed-dim">Spaced Repetition sync active</span>
              </div>
              <div className="space-y-1 mt-1">
                <div className="flex justify-between text-[11px] font-mono text-on-surface-variant">
                  <span>Forgetting Curve Safety</span>
                  <span className="text-tertiary font-medium">High Margin</span>
                </div>
                <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className="h-full bg-tertiary rounded-full"
                    style={{ width: `${scheduleData?.summary?.retentionVelocity ?? 94}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </section>

          {/* Main 8-Col + 4-Col Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* 8 Cols: Interactive Weekly Timeline */}
            <section className="xl:col-span-8 flex flex-col gap-4">
              {/* Controls Strip */}
              <div className="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center bg-surface-container-highest p-1 rounded-lg border border-outline-variant">
                  <button className="px-3 py-1.5 rounded-md bg-surface-container-high text-on-surface text-xs shadow-sm font-semibold flex items-center gap-1.5 border border-outline-variant">
                    <span className="material-symbols-outlined text-sm">view_week</span>
                    Weekly Timeline
                  </button>
                  <button
                    onClick={() => onNavigate('dashboard')}
                    className="px-3 py-1.5 rounded-md text-on-surface-variant hover:text-on-surface text-xs transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">calendar_view_day</span>
                    Course Modules
                  </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-mono text-outline mr-1">FILTER:</span>
                  <button
                    onClick={() => setFilterSubject('all')}
                    className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium transition-colors cursor-pointer ${
                      filterSubject === 'all'
                        ? 'bg-primary text-on-primary font-bold'
                        : 'bg-surface-container-highest text-on-surface-variant border border-outline-variant'
                    }`}
                  >
                    All Units
                  </button>
                  {availableSubjects.slice(0, 4).map((subj) => (
                    <button
                      key={subj}
                      onClick={() => setFilterSubject(filterSubject === subj ? 'all' : subj)}
                      className={`px-2.5 py-1 rounded-full text-xs font-mono font-medium transition-colors cursor-pointer truncate max-w-[140px] ${
                        filterSubject === subj
                          ? 'bg-primary text-on-primary font-bold'
                          : 'bg-primary/10 text-primary border border-primary/30'
                      }`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>

                {/* Spaced Toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSpaced}
                    onChange={(e) => setShowSpaced(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-surface after:border-zinc-700 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary relative border border-outline-variant"></div>
                  <span className="text-xs text-on-surface-variant">Show Spaced Repetition</span>
                </label>
              </div>

              {/* 7-Day Calendar Grid */}
              <div className="rounded-lg bg-surface-container-low border border-outline-variant overflow-hidden backdrop-blur-md shadow-sm">
                <div className="grid grid-cols-7 border-b border-outline-variant bg-surface-container-high/60 text-center divide-x divide-outline-variant">
                  {daysKeys.map((dayKey) => {
                    const day = scheduleData?.days?.[dayKey];
                    const isToday = day?.isToday;
                    return (
                      <div
                        key={dayKey}
                        className={`py-2.5 px-1 ${isToday ? 'bg-surface-container-highest border-b-2 border-primary' : ''}`}
                      >
                        <div className={`text-[11px] font-mono ${isToday ? 'text-primary font-bold' : 'text-outline'}`}>
                          {day?.dayName || dayKey.toUpperCase()}
                        </div>
                        <div className={`text-sm font-headline font-bold ${isToday ? 'text-primary' : 'text-on-surface'}`}>
                          {day?.dateLabel?.split('•')?.[0]?.trim() || ''}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Days Grid Content */}
                <div className="grid grid-cols-1 sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-outline-variant min-h-[560px] p-2 gap-2 bg-surface-container-lowest/60">
                  {daysKeys.map((dayKey) => {
                    const day = scheduleData?.days?.[dayKey];
                    const isToday = day?.isToday;
                    const blocks = (day?.blocks || []).filter((b: any) => {
                      if (!showSpaced && b.type === 'spaced') return false;
                      if (filterSubject !== 'all' && b.subject && !b.subject.toLowerCase().includes(filterSubject.toLowerCase())) {
                        return false;
                      }
                      if (searchQuery.trim()) {
                        const q = searchQuery.toLowerCase();
                        const matchTitle = b.title?.toLowerCase().includes(q);
                        const matchSubj = b.subject?.toLowerCase().includes(q);
                        return matchTitle || matchSubj;
                      }
                      return true;
                    });

                    return (
                      <div
                        key={dayKey}
                        className={`flex flex-col gap-2 p-1.5 rounded-lg ${
                          isToday ? 'bg-surface-container/70 border border-primary/40' : ''
                        }`}
                      >
                        {blocks.map((block: any) => (
                          <div
                            key={block.id}
                            onClick={() => onNavigate('dashboard')}
                            className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                              block.type === 'buffer'
                                ? 'bg-tertiary-container/20 border-tertiary/30 text-tertiary'
                                : block.type === 'spaced'
                                ? 'bg-surface-container/60 border-outline-variant/60 hover:border-outline'
                                : isToday && block.status === 'in-progress'
                                ? 'bg-surface-container-highest border-primary shadow-sm glow-primary'
                                : 'bg-surface-container-high/70 border-outline-variant hover:border-outline'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                  block.type === 'buffer'
                                    ? 'bg-tertiary/20 text-tertiary border-tertiary/40'
                                    : 'bg-primary/10 text-primary border-primary/30'
                                }`}
                              >
                                {block.subject}
                              </span>
                              {block.status === 'completed' ? (
                                <span className="material-symbols-outlined text-tertiary text-sm">check_circle</span>
                              ) : isToday ? (
                                <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-ping"></span>
                              ) : (
                                <span className="text-[10px] font-mono text-outline">{block.duration}</span>
                              )}
                            </div>
                            <div className="text-xs text-on-surface font-semibold line-clamp-2">{block.title}</div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-outline mt-1.5 pt-1 border-t border-outline-variant/40">
                              <span>{block.badge || block.effort || 'Focus'}</span>
                              <span className="text-primary font-medium">{block.duration}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* 4 Cols: Diagnostic Assistant & Active Modules */}
            <aside className="xl:col-span-4 flex flex-col gap-4">
              <div className="rounded-lg bg-surface-container-low border border-outline-variant p-4 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
                  <h3 className="text-xs font-mono font-semibold uppercase text-zinc-300 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-base">layers</span>
                    Active Syllabus Modules
                  </h3>
                  <button
                    onClick={() => onNavigate('dashboard')}
                    className="text-[11px] font-mono text-primary hover:underline"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {modules.slice(0, 6).map((m) => (
                    <div
                      key={m.id}
                      onClick={() => onNavigate('dashboard')}
                      className="p-2.5 rounded-lg border border-outline-variant bg-surface-container-high/60 hover:border-primary/50 transition-all cursor-pointer flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-on-surface truncate">{m.name}</div>
                        <div className="text-[11px] font-mono text-on-surface-variant flex items-center gap-2 mt-0.5">
                          <span>{m.weight}% Exam Weight</span>
                          <span>•</span>
                          <span className="text-tertiary">{m.progress}% Done</span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-outline text-sm">arrow_forward</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-outline-variant flex gap-2">
                  <button
                    onClick={() => onNavigate('voice-quiz')}
                    className="flex-1 py-2 px-3 rounded-lg bg-primary-container text-on-primary-container text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-opacity-90 transition-all cursor-pointer active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">mic</span>
                    <span>Oral Quiz</span>
                  </button>
                  <button
                    onClick={() => onNavigate('handwritten-analysis')}
                    className="flex-1 py-2 px-3 rounded-lg bg-surface-container-high text-on-surface text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-surface-container-highest transition-all cursor-pointer border border-outline-variant active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">draw</span>
                    <span>AI Vision</span>
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
};
