import React, { useState, useMemo } from 'react';
import { ScreenId } from '../types';

interface Step2ExamProps {
  onNavigate: (screen: ScreenId) => void;
  parsedData: any;
  targetDate: string;
  setTargetDate: (date: string) => void;
  targetScore: number;
  setTargetScore: (score: number) => void;
  retentionMode: 'aggressive' | 'balanced';
  setRetentionMode: (mode: 'aggressive' | 'balanced') => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const Step2Exam: React.FC<Step2ExamProps> = ({
  onNavigate,
  parsedData,
  targetDate,
  setTargetDate,
  targetScore,
  setTargetScore,
  retentionMode,
  setRetentionMode,
}) => {
  const [courseName, setCourseName] = useState(
    parsedData?.courseName || 'CS 3200: Distributed Systems & Engineering'
  );
  const [tags, setTags] = useState(['Computer Science', 'Systems Architecture', 'High-Yield 12-Week']);
  const [newTag, setNewTag] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);

  // Parse initial targetDate for month calendar navigation
  const initialDateObj = useMemo(() => {
    const d = new Date(targetDate + 'T00:00:00');
    return isNaN(d.getTime()) ? new Date() : d;
  }, [targetDate]);

  const [calendarYear, setCalendarYear] = useState<number>(initialDateObj.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(initialDateObj.getMonth());

  // Dynamic days remaining calculation
  const daysRemaining = useMemo(() => {
    const target = new Date(targetDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffMs = target.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [targetDate]);

  // Scoring Scheme state
  const [scoreScheme, setScoreScheme] = useState<'marks' | 'percentage' | 'mcat' | 'custom'>('marks');
  const [baseScore, setBaseScore] = useState<number>(40);
  const [maxScore, setMaxScore] = useState<number>(100);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((prev) => prev - 1);
    } else {
      setCalendarMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((prev) => prev + 1);
    } else {
      setCalendarMonth((prev) => prev + 1);
    }
  };

  const handleDaySelect = (dayNum: number) => {
    const formattedMonth = String(calendarMonth + 1).padStart(2, '0');
    const formattedDay = String(dayNum).padStart(2, '0');
    const newDateStr = `${calendarYear}-${formattedMonth}-${formattedDay}`;
    setTargetDate(newDateStr);
  };

  const handleDirectDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setTargetDate(e.target.value);
      const d = new Date(e.target.value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setCalendarYear(d.getFullYear());
        setCalendarMonth(d.getMonth());
      }
    }
  };

  // Calendar matrix computation for current month
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay(); // 0 = Sunday
    const totalDaysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const prevMonthDaysCount = new Date(calendarYear, calendarMonth, 0).getDate();

    const days: { dayNumber: number; isCurrentMonth: boolean; fullDateStr: string }[] = [];

    // Preceding month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dNum = prevMonthDaysCount - i;
      const prevMonth = calendarMonth === 0 ? 12 : calendarMonth;
      const prevYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
      days.push({
        dayNumber: dNum,
        isCurrentMonth: false,
        fullDateStr: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      days.push({
        dayNumber: d,
        isCurrentMonth: true,
        fullDateStr: `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      });
    }

    // Trailing days to complete 35 or 42 grid cells
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let nextD = 1; nextD <= remainingCells; nextD++) {
      const nextMonth = calendarMonth === 11 ? 1 : calendarMonth + 2;
      const nextYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
      days.push({
        dayNumber: nextD,
        isCurrentMonth: false,
        fullDateStr: `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(nextD).padStart(2, '0')}`,
      });
    }

    return days;
  }, [calendarYear, calendarMonth]);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
      setShowAddTag(false);
    }
  };

  // Pre-fill scoring preset
  const handleSelectScheme = (scheme: 'marks' | 'percentage' | 'mcat' | 'custom') => {
    setScoreScheme(scheme);
    if (scheme === 'marks') {
      setBaseScore(40);
      setMaxScore(100);
      setTargetScore(85);
    } else if (scheme === 'percentage') {
      setBaseScore(50);
      setMaxScore(100);
      setTargetScore(90);
    } else if (scheme === 'mcat') {
      setBaseScore(480);
      setMaxScore(528);
      setTargetScore(518);
    } else {
      // Custom based on syllabus pages/units:
      const unitCount = parsedData?.units?.length || 5;
      const computedMax = unitCount * 25; // 25 marks per module
      setBaseScore(Math.round(computedMax * 0.4));
      setMaxScore(computedMax);
      setTargetScore(Math.round(computedMax * 0.85));
    }
  };

  return (
    <div className="bg-background text-on-surface font-body antialiased min-h-screen pb-28 selection:bg-primary-container selection:text-on-primary-container">
      {/* Top Navigation Bar */}
      <header className="flex justify-between items-center w-full px-6 py-3 border-b border-outline-variant bg-background sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('landing')} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary-container flex items-center justify-center text-on-primary font-bold text-xs">
              <span className="material-symbols-outlined text-[16px] text-primary-fixed">neurology</span>
            </div>
            <span className="text-base font-bold font-headline tracking-tight text-on-surface">Synapse AI</span>
            <span className="text-xs font-mono text-outline px-1.5 py-0.5 rounded border border-outline-variant uppercase">
              STUDY ENGINE
            </span>
          </button>
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high border border-outline-variant text-[11px] font-mono text-on-surface-variant">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            INGESTION PIPELINE • Step 2 of 4
          </div>
        </div>

        {/* Stepper Links inside Nav */}
        <nav className="hidden lg:flex items-center gap-6 text-xs">
          <button
            onClick={() => onNavigate('step1-upload')}
            className="text-on-surface-variant flex items-center gap-1.5 font-medium hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[15px] text-tertiary">check_circle</span>
            Upload Syllabus
          </button>
          <div className="text-primary font-medium border-b-2 border-primary pb-1 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-primary text-on-primary text-[10px] flex items-center justify-center font-bold">
              2
            </span>
            Exam & Goals
          </div>
          <button
            onClick={() => onNavigate('step3-bandwidth')}
            className="text-on-surface-variant flex items-center gap-1.5 font-medium opacity-60 hover:opacity-100"
          >
            <span className="w-4 h-4 rounded-full border border-outline text-outline text-[10px] flex items-center justify-center font-bold">
              3
            </span>
            Study Bandwidth
          </button>
          <button
            onClick={() => onNavigate('step4-resources')}
            className="text-on-surface-variant flex items-center gap-1.5 font-medium opacity-60 hover:opacity-100"
          >
            <span className="w-4 h-4 rounded-full border border-outline text-outline text-[10px] flex items-center justify-center font-bold">
              4
            </span>
            AI Generation
          </button>
        </nav>

        {/* Trailing Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('master-schedule')}
            className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high px-2.5 py-1.5 rounded-lg border border-outline-variant transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
            <span className="hidden sm:inline">Schedule</span>
          </button>
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high px-2.5 py-1.5 rounded-lg border border-outline-variant transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
            <span className="hidden sm:inline">Save & Exit</span>
          </button>
        </div>
      </header>

      {/* Interactive 4-Step Visual Track */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="bg-surface-container border border-outline-variant rounded-xl p-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* Step 1 Complete */}
          <button
            onClick={() => onNavigate('step1-upload')}
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/60 text-left hover:bg-surface-container-high transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-tertiary-container/30 border border-tertiary/40 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-tertiary text-sm">check</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase text-tertiary font-semibold tracking-wide">Step 01</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-tertiary-container/40 text-on-tertiary-container font-mono">
                  Done
                </span>
              </div>
              <p className="text-xs font-medium text-on-surface truncate">Upload Syllabus</p>
            </div>
          </button>

          {/* Step 2 Active */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-container-high border border-primary ring-1 ring-primary/40 shadow-[0_0_15px_rgba(167,139,250,0.15)]">
            <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 font-bold text-xs">
              2
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase text-primary font-semibold tracking-wide">Step 02</span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
              </div>
              <p className="text-xs font-semibold text-on-surface truncate">Exam & Goals</p>
            </div>
          </div>

          {/* Step 3 Upcoming */}
          <button
            onClick={() => onNavigate('step3-bandwidth')}
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/60 opacity-70 hover:opacity-100 text-left transition-opacity"
          >
            <div className="w-7 h-7 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center font-mono text-xs shrink-0 border border-outline-variant">
              3
            </div>
            <div className="min-w-0">
              <span className="text-xs font-medium text-on-surface truncate">Study Bandwidth</span>
              <span className="font-mono text-[11px] text-outline block">Upcoming</span>
            </div>
          </button>

          {/* Step 4 Upcoming */}
          <button
            onClick={() => onNavigate('step4-resources')}
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/60 opacity-70 hover:opacity-100 text-left transition-opacity"
          >
            <div className="w-7 h-7 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center font-mono text-xs shrink-0 border border-outline-variant">
              4
            </div>
            <div className="min-w-0">
              <span className="text-xs font-medium text-on-surface truncate">AI Generation</span>
              <span className="font-mono text-[11px] text-outline block">Upcoming</span>
            </div>
          </button>
        </div>
      </section>

      {/* Main Content Form */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight text-on-surface">
            Set Your Target Exam Date & Target Marks
          </h1>
          <p className="text-xs sm:text-sm text-secondary mt-1">
            Choose your exam date, select your scoring format, and set passing vs target benchmark marks.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Course Title and Classification */}
            <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-4">
              <label className="text-xs font-mono font-medium text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-primary">edit_note</span>
                Course Name & Study Container
              </label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3.5 py-2 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors font-medium"
              />

              <div className="flex flex-wrap gap-1.5 items-center pt-1">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-full text-xs font-mono bg-surface-container-high border border-outline-variant text-on-surface-variant flex items-center gap-1"
                  >
                    <span>{t}</span>
                    <button
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                      className="hover:text-error transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {showAddTag ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Tag..."
                      className="w-20 px-2 py-0.5 text-xs bg-surface-container-lowest border border-outline-variant rounded"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-2 py-1 bg-primary text-on-primary text-xs rounded font-bold"
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddTag(true)}
                    className="px-2 py-1 rounded-md text-xs font-medium border border-dashed border-outline text-secondary hover:text-on-surface transition-colors"
                  >
                    + Add Tag
                  </button>
                )}
              </div>
            </div>

            {/* DYNAMIC CALENDAR DATE PICKER */}
            <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xs font-mono font-medium text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-primary">calendar_month</span>
                    Target Exam Date Selection
                  </h2>
                  <p className="text-xs text-secondary mt-0.5">
                    Navigate any month/year or use the direct date picker
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-surface-container-low border border-primary/40 px-3 py-1.5 rounded-lg shadow-sm">
                    <span className="material-symbols-outlined text-primary text-sm">schedule</span>
                    <span className="text-xs font-mono font-bold text-primary">
                      {daysRemaining} {daysRemaining === 1 ? 'Day' : 'Days'} Remaining
                    </span>
                  </div>
                </div>
              </div>

              {/* Direct Date Input for fast jump */}
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-container-high/60 border border-outline-variant text-xs">
                <span className="font-mono text-zinc-400">Direct Date Select:</span>
                <input
                  type="date"
                  value={targetDate}
                  onChange={handleDirectDateChange}
                  className="bg-surface-container border border-outline-variant rounded px-2.5 py-1 text-xs text-primary font-mono focus:outline-none focus:border-primary"
                />
                <span className="text-zinc-500 font-mono text-[11px] hidden sm:inline">
                  (Or click any day on the calendar below)
                </span>
              </div>

              {/* Interactive Calendar UI with Month Navigation */}
              <div className="bg-surface-container-low border border-outline-variant rounded-lg p-3.5">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-on-surface">
                      {MONTH_NAMES[calendarMonth]} {calendarYear}
                    </span>
                    <span className="text-[11px] font-mono text-secondary px-1.5 py-0.5 bg-surface-container rounded border border-outline-variant">
                      Q{Math.floor(calendarMonth / 3) + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handlePrevMonth}
                      type="button"
                      className="w-7 h-7 rounded border border-outline-variant hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
                      title="Previous Month"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    <button
                      onClick={handleNextMonth}
                      type="button"
                      className="w-7 h-7 rounded border border-outline-variant hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
                      title="Next Month"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>
                </div>

                {/* Weekday headers */}
                <div className="grid grid-cols-7 text-center font-mono text-[10px] text-secondary mb-2">
                  <span>SU</span>
                  <span>MO</span>
                  <span>TU</span>
                  <span>WE</span>
                  <span>TH</span>
                  <span>FR</span>
                  <span>SA</span>
                </div>

                {/* Month Days Matrix */}
                <div className="grid grid-cols-7 gap-1 text-xs font-mono text-center">
                  {calendarDays.map((cell, idx) => {
                    const isSelected = cell.fullDateStr === targetDate;
                    const isToday =
                      cell.fullDateStr === new Date().toISOString().split('T')[0];

                    return (
                      <button
                        key={`${cell.fullDateStr}-${idx}`}
                        type="button"
                        onClick={() => {
                          setTargetDate(cell.fullDateStr);
                          const d = new Date(cell.fullDateStr + 'T00:00:00');
                          setCalendarYear(d.getFullYear());
                          setCalendarMonth(d.getMonth());
                        }}
                        className={`py-2 rounded transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-primary text-on-primary font-bold shadow-[0_0_8px_rgba(167,139,250,0.6)] ring-2 ring-primary/40'
                            : isToday
                            ? 'text-on-surface bg-surface-container-high border border-outline font-bold'
                            : cell.isCurrentMonth
                            ? 'text-on-surface-variant hover:bg-surface-container'
                            : 'text-outline/40 hover:bg-surface-container/50'
                        }`}
                      >
                        {String(cell.dayNumber).padStart(2, '0')}
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-tertiary"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between text-xs text-secondary pt-1 gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  Selected Date:{' '}
                  <strong className="text-on-surface font-mono">
                    {new Date(targetDate + 'T00:00:00').toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                  Pacing Mode: <span className="text-tertiary font-mono font-medium">Spaced Pacing</span>
                </span>
              </div>
            </div>

            {/* CUSTOMIZABLE TARGET SCORE & MARKS CALIBRATION */}
            <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-mono font-medium text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-primary">target</span>
                  Score & Marks Calibration
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-surface-container-high border border-outline-variant text-primary font-bold">
                    Target: {targetScore} / {maxScore} Marks
                  </span>
                </div>
              </div>

              {/* Scoring Scheme Switcher */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectScheme('marks')}
                  className={`p-2.5 rounded-lg border text-left text-xs font-mono transition-all ${
                    scoreScheme === 'marks'
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-outline-variant bg-surface-container-low text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  <div className="text-[10px] text-zinc-500 uppercase">Standard</div>
                  <div>100 Marks</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectScheme('percentage')}
                  className={`p-2.5 rounded-lg border text-left text-xs font-mono transition-all ${
                    scoreScheme === 'percentage'
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-outline-variant bg-surface-container-low text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  <div className="text-[10px] text-zinc-500 uppercase">Percentage</div>
                  <div>0 - 100%</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectScheme('custom')}
                  className={`p-2.5 rounded-lg border text-left text-xs font-mono transition-all ${
                    scoreScheme === 'custom'
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-outline-variant bg-surface-container-low text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  <div className="text-[10px] text-emerald-400 uppercase">Syllabus-Based</div>
                  <div>Units / Labs</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectScheme('mcat')}
                  className={`p-2.5 rounded-lg border text-left text-xs font-mono transition-all ${
                    scoreScheme === 'mcat'
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-outline-variant bg-surface-container-low text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  <div className="text-[10px] text-zinc-500 uppercase">Engineering Benchmark</div>
                  <div>90-100 Pts</div>
                </button>
              </div>

              {/* Direct inputs for Base, Target, and Max Marks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-surface-container-low border border-outline-variant">
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                    Base / Passing Marks:
                  </label>
                  <input
                    type="number"
                    value={baseScore}
                    onChange={(e) => setBaseScore(Number(e.target.value) || 0)}
                    className="w-full bg-surface-container px-2.5 py-1.5 rounded border border-outline-variant text-xs font-mono text-zinc-200 focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-primary font-semibold block mb-1">
                    Target Goal Marks:
                  </label>
                  <input
                    type="number"
                    value={targetScore}
                    onChange={(e) => setTargetScore(Number(e.target.value) || 0)}
                    className="w-full bg-surface-container px-2.5 py-1.5 rounded border border-primary/50 text-xs font-mono text-primary font-bold focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 block mb-1">
                    Maximum Total Marks:
                  </label>
                  <input
                    type="number"
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value) || 100)}
                    className="w-full bg-surface-container px-2.5 py-1.5 rounded border border-outline-variant text-xs font-mono text-zinc-200 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Target Score Slider */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between text-xs font-mono text-secondary">
                  <span>Base: {baseScore}</span>
                  <span className="text-primary font-bold">Target: {targetScore}</span>
                  <span>Max: {maxScore}</span>
                </div>
                <input
                  type="range"
                  min={baseScore}
                  max={maxScore}
                  value={targetScore}
                  onChange={(e) => setTargetScore(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              {/* Algorithm Retention Mode */}
              <div className="pt-3 border-t border-outline-variant">
                <label className="text-xs font-mono font-medium text-on-surface-variant uppercase tracking-wider block mb-2">
                  Retention Scheduling Algorithm
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRetentionMode('aggressive')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      retentionMode === 'aggressive'
                        ? 'border-primary bg-primary-container/20 ring-1 ring-primary'
                        : 'border-outline-variant bg-surface-container-low hover:border-outline'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-on-surface">Aggressive Pacing (FSRS-4)</span>
                      <span className="material-symbols-outlined text-sm text-primary">bolt</span>
                    </div>
                    <p className="text-[11px] text-secondary">
                      Prioritizes high-weight syllabus units early with daily active recall.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRetentionMode('balanced')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      retentionMode === 'balanced'
                        ? 'border-primary bg-primary-container/20 ring-1 ring-primary'
                        : 'border-outline-variant bg-surface-container-low hover:border-outline'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-on-surface">Balanced Spacing</span>
                      <span className="material-symbols-outlined text-sm text-tertiary">balance</span>
                    </div>
                    <p className="text-[11px] text-secondary">
                      Steady cognitive load distribution with designated weekly buffer days.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (5 Cols) - Syllabus Breakdown Preview */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-semibold uppercase text-secondary">
                  Detected Syllabus Pacing Matrix
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-tertiary-container/30 text-tertiary">
                  {daysRemaining} Days Available
                </span>
              </div>

              <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Exam Target:</span>
                  <span className="text-primary font-mono font-bold">{targetDate}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Target Score:</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {targetScore} / {maxScore} marks
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Required Study Velocity:</span>
                  <span className="text-zinc-200 font-mono">
                    {daysRemaining > 0 ? (maxScore / Math.max(1, daysRemaining)).toFixed(1) : '0'}{' '}
                    marks / day
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-mono text-zinc-400">Core Syllabus Units to Schedule:</span>
                {(parsedData?.units || [
                  { name: 'Cellular Energetics & Glycolysis', weight: 22 },
                  { name: 'Michaelis-Menten Kinetics', weight: 18 },
                  { name: 'Organic Reaction Mechanisms', weight: 25 },
                  { name: 'Nucleic Acid Structure', weight: 20 },
                ]).map((u: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/60 flex items-center justify-between text-xs"
                  >
                    <span className="text-zinc-300 truncate max-w-[200px]">{u.name}</span>
                    <span className="text-primary font-mono font-semibold">{u.weight || 20}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Footer */}
      <footer className="fixed bottom-0 left-0 w-full z-40 flex justify-between items-center px-6 py-4 border-t border-outline-variant bg-surface-container-lowest">
        <button
          onClick={() => onNavigate('step1-upload')}
          className="flex items-center gap-2 text-on-surface-variant hover:border-outline hover:text-on-surface border border-outline-variant px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back</span>
        </button>

        <div className="hidden sm:flex items-center gap-3 font-mono text-xs text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-on-surface font-medium">Step 2 of 4: Exam & Goals</span>
          </span>
          <span className="text-outline">•</span>
          <span>Next: Study Bandwidth</span>
        </div>

        <button
          onClick={() => onNavigate('step3-bandwidth')}
          className="flex items-center gap-2 bg-primary text-on-primary font-medium px-5 py-2.5 rounded-lg text-sm shadow-[0_0_20px_rgba(167,139,250,0.35)] hover:bg-primary/90 transition-all cursor-pointer active:scale-95"
        >
          <span>Confirm & Continue</span>
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </footer>
    </div>
  );
};
