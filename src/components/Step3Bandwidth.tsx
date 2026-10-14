import React, { useState } from 'react';
import { ScreenId, ScheduleSlot, SlotType } from '../types';

interface Step3BandwidthProps {
  onNavigate: (screen: ScreenId) => void;
  slots: Record<string, ScheduleSlot>;
  setSlots: React.Dispatch<React.SetStateAction<Record<string, ScheduleSlot>>>;
}

const DAYS = [
  { id: 'mon', name: 'Monday', short: 'Mon', date: 'Day 1' },
  { id: 'tue', name: 'Tuesday', short: 'Tue', date: 'Day 2' },
  { id: 'wed', name: 'Wednesday', short: 'Wed', date: 'Day 3' },
  { id: 'thu', name: 'Thursday', short: 'Thu', date: 'Day 4' },
  { id: 'fri', name: 'Friday', short: 'Fri', date: 'Day 5' },
  { id: 'sat', name: 'Saturday', short: 'Sat', date: 'Day 6', isWeekend: true },
  { id: 'sun', name: 'Sunday', short: 'Sun', date: 'Day 7', isWeekend: true },
];

export const Step3Bandwidth: React.FC<Step3BandwidthProps> = ({ onNavigate, slots, setSlots }) => {
  const [activePreset, setActivePreset] = useState<'10h' | '15h' | '20h' | '28h' | '35h' | 'custom'>('20h');
  const [customHours, setCustomHours] = useState<number>(20);

  // User-configurable parameters (Issue 8)
  const [dailyReviewThreshold, setDailyReviewThreshold] = useState<number>(3.5); // hrs/day
  const [bufferZonePercent, setBufferZonePercent] = useState<number>(20); // 20%
  const [designatedBufferDay, setDesignatedBufferDay] = useState<string>('sun');

  // Active slot editor modal state (Issue 6)
  const [activeSlotKey, setActiveSlotKey] = useState<string | null>(null);

  // Check if a day has any active study slot
  const isDayActive = (dayId: string) => {
    return ['morning', 'afternoon', 'evening'].some((block) => {
      const s = slots[`${dayId}-${block}`];
      return s && s.type !== 'rest';
    });
  };

  // Toggle whole weekday ON/OFF (Issue 6)
  const toggleWeekday = (dayId: string) => {
    const currentlyActive = isDayActive(dayId);
    setSlots((prev) => {
      const next = { ...prev };
      if (currentlyActive) {
        // Turn off all blocks for this day
        ['morning', 'afternoon', 'evening'].forEach((block) => {
          next[`${dayId}-${block}`] = {
            day: dayId,
            timeBlock: block as any,
            type: 'rest',
            hours: 0,
            label: 'Rest / Off',
            sublabel: 'Standby',
          };
        });
      } else {
        // Activate morning focus + evening review
        next[`${dayId}-morning`] = {
          day: dayId,
          timeBlock: 'morning',
          type: 'focus',
          hours: 3.5,
          label: 'Active Focus',
          sublabel: 'Core Syllabus',
        };
        next[`${dayId}-afternoon`] = {
          day: dayId,
          timeBlock: 'afternoon',
          type: 'rest',
          hours: 0,
          label: 'Rest / Off',
          sublabel: 'Standby',
        };
        next[`${dayId}-evening`] = {
          day: dayId,
          timeBlock: 'evening',
          type: 'spaced',
          hours: 1.5,
          label: 'Flashcards',
          sublabel: 'Spaced Recall',
        };
      }
      return next;
    });
  };

  // Set explicit slot type with hours (Issue 6)
  const setSlotDetails = (key: string, type: SlotType, hours: number) => {
    const [day, timeBlock] = key.split('-');
    let label = 'Rest / Off';
    let sublabel = 'Standby';

    if (type === 'focus') {
      label = 'Active Focus';
      sublabel = timeBlock === 'morning' ? 'Core Syllabus' : 'Problem Drills';
    } else if (type === 'spaced') {
      label = 'Flashcards';
      sublabel = 'Spaced Recall';
    } else if (type === 'buffer') {
      label = 'Adaptive Buffer';
      sublabel = 'AI Catch-up';
    }

    setSlots((prev) => ({
      ...prev,
      [key]: {
        day,
        timeBlock: timeBlock as any,
        type,
        hours: type === 'rest' ? 0 : hours,
        label,
        sublabel,
      },
    }));
    setActiveSlotKey(null);
  };

  // Presets starting from 10 hours (Issue 5)
  const applyPreset = (preset: '10h' | '15h' | '20h' | '28h' | '35h') => {
    setActivePreset(preset);
    const newSlots: Record<string, ScheduleSlot> = {};

    // Initialize all to rest
    DAYS.forEach((d) => {
      newSlots[`${d.id}-morning`] = { day: d.id, timeBlock: 'morning', type: 'rest', hours: 0, label: 'Rest / Off', sublabel: 'Standby' };
      newSlots[`${d.id}-afternoon`] = { day: d.id, timeBlock: 'afternoon', type: 'rest', hours: 0, label: 'Rest / Off', sublabel: 'Standby' };
      newSlots[`${d.id}-evening`] = { day: d.id, timeBlock: 'evening', type: 'rest', hours: 0, label: 'Rest / Off', sublabel: 'Standby' };
    });

    if (preset === '10h') {
      setCustomHours(10);
      // 10 hours: Mon/Wed/Fri (2h evening spaced) + Sat (4h focus)
      newSlots['mon-evening'] = { day: 'mon', timeBlock: 'evening', type: 'spaced', hours: 2.0, label: 'Flashcards', sublabel: 'Spaced Recall' };
      newSlots['wed-evening'] = { day: 'wed', timeBlock: 'evening', type: 'spaced', hours: 2.0, label: 'Flashcards', sublabel: 'Spaced Recall' };
      newSlots['fri-evening'] = { day: 'fri', timeBlock: 'evening', type: 'spaced', hours: 2.0, label: 'Flashcards', sublabel: 'Spaced Recall' };
      newSlots['sat-morning'] = { day: 'sat', timeBlock: 'morning', type: 'focus', hours: 4.0, label: 'Active Focus', sublabel: 'Core Theory' };
    } else if (preset === '15h') {
      setCustomHours(15);
      // 15 hours: Mon/Wed/Fri (3h focus) + Sat (4h focus) + Sun (2h buffer)
      newSlots['mon-morning'] = { day: 'mon', timeBlock: 'morning', type: 'focus', hours: 3.0, label: 'Active Focus', sublabel: 'Core Syllabus' };
      newSlots['wed-morning'] = { day: 'wed', timeBlock: 'morning', type: 'focus', hours: 3.0, label: 'Active Focus', sublabel: 'Problem Sets' };
      newSlots['fri-morning'] = { day: 'fri', timeBlock: 'morning', type: 'focus', hours: 3.0, label: 'Active Focus', sublabel: 'Review' };
      newSlots['sat-morning'] = { day: 'sat', timeBlock: 'morning', type: 'focus', hours: 4.0, label: 'Active Focus', sublabel: 'Mock Testing' };
      newSlots['sun-afternoon'] = { day: 'sun', timeBlock: 'afternoon', type: 'buffer', hours: 2.0, label: 'Adaptive Buffer', sublabel: 'AI Catch-Up' };
    } else if (preset === '20h') {
      setCustomHours(20);
      // 20 hours: standard balanced
      newSlots['mon-morning'] = { day: 'mon', timeBlock: 'morning', type: 'focus', hours: 3.5, label: 'Active Focus', sublabel: 'Core Syllabus' };
      newSlots['tue-afternoon'] = { day: 'tue', timeBlock: 'afternoon', type: 'focus', hours: 3.5, label: 'Active Focus', sublabel: 'Deep Review' };
      newSlots['wed-morning'] = { day: 'wed', timeBlock: 'morning', type: 'focus', hours: 3.5, label: 'Active Focus', sublabel: 'Problem Sets' };
      newSlots['sat-morning'] = { day: 'sat', timeBlock: 'morning', type: 'focus', hours: 4.0, label: 'Active Focus', sublabel: 'Mock Testing' };
      newSlots['mon-evening'] = { day: 'mon', timeBlock: 'evening', type: 'spaced', hours: 1.5, label: 'Flashcards', sublabel: 'Spaced Recall' };
      newSlots['wed-evening'] = { day: 'wed', timeBlock: 'evening', type: 'spaced', hours: 1.5, label: 'Flashcards', sublabel: 'Active Recall' };
      newSlots['sun-afternoon'] = { day: 'sun', timeBlock: 'afternoon', type: 'buffer', hours: 2.5, label: 'Adaptive Buffer', sublabel: 'AI Auto-Heals' };
    } else if (preset === '28h') {
      setCustomHours(28);
      // 28 hours: intensive
      DAYS.slice(0, 5).forEach((d) => {
        newSlots[`${d.id}-morning`] = { day: d.id, timeBlock: 'morning', type: 'focus', hours: 4.0, label: 'Active Focus', sublabel: 'Theory Module' };
        newSlots[`${d.id}-evening`] = { day: d.id, timeBlock: 'evening', type: 'spaced', hours: 1.0, label: 'Flashcards', sublabel: 'Spaced Review' };
      });
      newSlots['sat-morning'] = { day: 'sat', timeBlock: 'morning', type: 'focus', hours: 4.0, label: 'Mock Exam', sublabel: 'Full Simulation' };
      newSlots['sun-afternoon'] = { day: 'sun', timeBlock: 'afternoon', type: 'buffer', hours: 3.0, label: 'Adaptive Buffer', sublabel: 'Auto-Healing' };
    } else {
      // 35 hours: full time
      setCustomHours(35);
      DAYS.slice(0, 6).forEach((d) => {
        newSlots[`${d.id}-morning`] = { day: d.id, timeBlock: 'morning', type: 'focus', hours: 4.0, label: 'Active Focus', sublabel: 'Intensive Sprint' };
        newSlots[`${d.id}-evening`] = { day: d.id, timeBlock: 'evening', type: 'spaced', hours: 1.5, label: 'Flashcards', sublabel: 'Active Spaced' };
      });
      newSlots['sun-afternoon'] = { day: 'sun', timeBlock: 'afternoon', type: 'buffer', hours: 3.0, label: 'Adaptive Buffer', sublabel: 'AI Catch-Up' };
    }

    setSlots(newSlots);
  };

  const selectAllRow = (timeBlock: 'morning' | 'afternoon' | 'evening') => {
    setSlots((prev) => {
      const next = { ...prev };
      const hours = timeBlock === 'evening' ? 1.5 : 3.5;
      const type: SlotType = timeBlock === 'evening' ? 'spaced' : 'focus';
      DAYS.forEach((d) => {
        const key = `${d.id}-${timeBlock}`;
        next[key] = {
          day: d.id,
          timeBlock,
          type,
          hours,
          label: type === 'spaced' ? 'Flashcards' : 'Active Focus',
          sublabel: 'Selected Row',
        };
      });
      return next;
    });
  };

  const clearAll = () => {
    setSlots((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        next[k] = { ...next[k], type: 'rest', hours: 0, label: 'Rest / Off', sublabel: 'Standby' };
      });
      return next;
    });
  };

  // Calculations
  const allSlotList = Object.values(slots);
  const totalWeeklyHours = allSlotList.reduce((acc, s) => acc + (s.hours || 0), 0);
  const deepFocusHours = allSlotList.filter((s) => s.type === 'focus').reduce((acc, s) => acc + s.hours, 0);
  const spacedHours = allSlotList.filter((s) => s.type === 'spaced').reduce((acc, s) => acc + s.hours, 0);
  const bufferHours = allSlotList.filter((s) => s.type === 'buffer').reduce((acc, s) => acc + s.hours, 0);

  return (
    <div className="bg-background text-on-surface font-body antialiased min-h-screen flex flex-col pb-28 selection:bg-primary selection:text-on-primary">
      {/* Top App Bar */}
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
            INGESTION PIPELINE • Step 3 of 4
          </div>
        </div>

        {/* Stepper Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs">
          <button
            onClick={() => onNavigate('step1-upload')}
            className="text-on-surface-variant flex items-center gap-1.5 font-medium hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[15px] text-tertiary">check_circle</span>
            Upload Syllabus
          </button>
          <button
            onClick={() => onNavigate('step2-exam')}
            className="text-on-surface-variant flex items-center gap-1.5 font-medium hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[15px] text-tertiary">check_circle</span>
            Exam & Goals
          </button>
          <div className="text-primary font-medium border-b-2 border-primary pb-1 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-primary text-on-primary text-[10px] flex items-center justify-center font-bold">
              3
            </span>
            Study Bandwidth
          </div>
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

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('master-schedule')}
            className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high px-2.5 py-1.5 rounded-lg border border-outline-variant"
          >
            <span className="material-symbols-outlined text-[16px]">calendar_today</span>
            <span>Schedule</span>
          </button>
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high px-2.5 py-1.5 rounded-lg border border-outline-variant"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
            <span>Save & Exit</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight text-on-surface">
            Configure Your Weekly Study Hours & Weekday Schedule
          </h1>
          <p className="text-xs sm:text-sm text-secondary mt-1">
            Choose your weekly hours starting from 10h, toggle active weekdays, and click any block to explicitly set Focus, Recall, or Buffer time.
          </p>
        </div>

        {/* PRESET WORKING HOURS SELECTION (Starts from 10 Hours) */}
        <section className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">timer</span>
              <span className="text-xs font-mono font-semibold uppercase text-zinc-300">
                Weekly Study Commitment Presets
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-zinc-400">Total Scheduled:</span>
              <span className="text-sm font-mono font-bold text-primary px-3 py-1 rounded bg-surface-container-high border border-primary/40">
                {totalWeeklyHours.toFixed(1)} Hours / Week
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <button
              type="button"
              onClick={() => applyPreset('10h')}
              className={`p-3 rounded-lg border text-left text-xs transition-all ${
                activePreset === '10h'
                  ? 'border-primary bg-primary/20 ring-1 ring-primary text-primary font-bold shadow-md'
                  : 'border-outline-variant bg-surface-container-low text-zinc-300 hover:border-zinc-500'
              }`}
            >
              <div className="text-[10px] font-mono uppercase text-zinc-400">Light / Busy</div>
              <div className="text-sm font-bold text-zinc-100 mt-0.5">10 Hours</div>
              <div className="text-[10px] text-zinc-400 mt-1">~1.5h on 4 days</div>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('15h')}
              className={`p-3 rounded-lg border text-left text-xs transition-all ${
                activePreset === '15h'
                  ? 'border-primary bg-primary/20 ring-1 ring-primary text-primary font-bold shadow-md'
                  : 'border-outline-variant bg-surface-container-low text-zinc-300 hover:border-zinc-500'
              }`}
            >
              <div className="text-[10px] font-mono uppercase text-zinc-400">Part-Time</div>
              <div className="text-sm font-bold text-zinc-100 mt-0.5">15 Hours</div>
              <div className="text-[10px] text-zinc-400 mt-1">~3h on 4-5 days</div>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('20h')}
              className={`p-3 rounded-lg border text-left text-xs transition-all ${
                activePreset === '20h'
                  ? 'border-primary bg-primary/20 ring-1 ring-primary text-primary font-bold shadow-md'
                  : 'border-outline-variant bg-surface-container-low text-zinc-300 hover:border-zinc-500'
              }`}
            >
              <div className="text-[10px] font-mono uppercase text-zinc-400">Standard Pacing</div>
              <div className="text-sm font-bold text-zinc-100 mt-0.5">20 Hours</div>
              <div className="text-[10px] text-zinc-400 mt-1">Optimal student pace</div>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('28h')}
              className={`p-3 rounded-lg border text-left text-xs transition-all ${
                activePreset === '28h'
                  ? 'border-primary bg-primary/20 ring-1 ring-primary text-primary font-bold shadow-md'
                  : 'border-outline-variant bg-surface-container-low text-zinc-300 hover:border-zinc-500'
              }`}
            >
              <div className="text-[10px] font-mono uppercase text-zinc-400">Intensive</div>
              <div className="text-sm font-bold text-zinc-100 mt-0.5">28 Hours</div>
              <div className="text-[10px] text-zinc-400 mt-1">Deep sprint + review</div>
            </button>

            <button
              type="button"
              onClick={() => applyPreset('35h')}
              className={`p-3 rounded-lg border text-left text-xs transition-all ${
                activePreset === '35h'
                  ? 'border-primary bg-primary/20 ring-1 ring-primary text-primary font-bold shadow-md'
                  : 'border-outline-variant bg-surface-container-low text-zinc-300 hover:border-zinc-500'
              }`}
            >
              <div className="text-[10px] font-mono uppercase text-zinc-400">Full-Time Sprint</div>
              <div className="text-sm font-bold text-zinc-100 mt-0.5">35 Hours</div>
              <div className="text-[10px] text-zinc-400 mt-1">5-6h daily immersion</div>
            </button>
          </div>

          {/* Quick Row Bulk Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-outline-variant/60 text-xs">
            <span className="text-zinc-400 font-mono text-[11px]">Row shortcuts:</span>
            <button
              type="button"
              onClick={() => selectAllRow('morning')}
              className="px-2.5 py-1 rounded bg-surface-container-high border border-outline-variant text-zinc-300 hover:text-white text-xs"
            >
              Set All Mornings (3.5h)
            </button>
            <button
              type="button"
              onClick={() => selectAllRow('evening')}
              className="px-2.5 py-1 rounded bg-surface-container-high border border-outline-variant text-zinc-300 hover:text-white text-xs"
            >
              Set All Evenings (1.5h Recall)
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="px-2.5 py-1 rounded bg-surface-container-high border border-outline-variant text-rose-400 hover:bg-rose-500/10 text-xs ml-auto"
            >
              Reset to Rest
            </button>
          </div>
        </section>

        {/* 7-DAY INTERACTIVE TIMELINE MATRIX */}
        <section className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs pb-3 border-b border-outline-variant">
            <div className="flex items-center gap-2 font-mono text-zinc-300">
              <span className="material-symbols-outlined text-primary text-base">touch_app</span>
              <span>Click any card below to explicitly choose slot type or adjust hours</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1.5 text-primary">
                <span className="w-2.5 h-2.5 rounded bg-primary"></span> Focus Block
              </span>
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-2.5 h-2.5 rounded bg-sky-400"></span> Spaced Recall
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded bg-emerald-400"></span> Adaptive Buffer
              </span>
              <span className="flex items-center gap-1.5 text-zinc-400">
                <span className="w-2.5 h-2.5 rounded border border-dashed border-zinc-500"></span> Rest Slot
              </span>
            </div>
          </div>

          {/* 7 Columns: Weekdays Header with One-Click Day Toggle (Issue 6) */}
          <div className="overflow-x-auto">
            <div className="min-w-[800px] space-y-4">
              <div className="grid grid-cols-7 gap-2.5 text-center">
                {DAYS.map((d) => {
                  const active = isDayActive(d.id);
                  return (
                    <div
                      key={d.id}
                      className={`p-2.5 rounded-lg border transition-all ${
                        active
                          ? 'bg-surface-container-high border-primary/40'
                          : 'bg-surface-container-low border-outline-variant opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-200">{d.short}</span>
                        <button
                          type="button"
                          onClick={() => toggleWeekday(d.id)}
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                            active
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                          }`}
                          title={`Toggle ${d.name} ON / OFF`}
                        >
                          {active ? 'ON' : 'OFF'}
                        </button>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400 mt-1">{d.date}</div>
                    </div>
                  );
                })}
              </div>

              {/* MORNING ROW */}
              <div>
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-400 text-sm">wb_sunny</span>
                    <span className="text-xs font-semibold text-zinc-200">Morning Block</span>
                    <span className="text-[11px] font-mono text-zinc-400">(08:00 - 12:00)</span>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2.5">
                  {DAYS.map((d) => {
                    const key = `${d.id}-morning`;
                    const slot = slots[key] || { type: 'rest', hours: 0, label: 'Rest / Off', sublabel: 'Standby' };
                    return (
                      <div
                        key={key}
                        onClick={() => setActiveSlotKey(key)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between min-h-[76px] ${
                          slot.type === 'focus'
                            ? 'bg-primary/15 border-primary/80 hover:bg-primary/20 shadow-sm'
                            : slot.type === 'spaced'
                            ? 'bg-sky-500/15 border-sky-400/80 hover:bg-sky-500/20 shadow-sm'
                            : slot.type === 'buffer'
                            ? 'bg-emerald-500/15 border-emerald-400/80 hover:bg-emerald-500/20 shadow-sm'
                            : 'bg-surface-container-low border-dashed border-outline-variant hover:border-zinc-500 text-zinc-500'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className={slot.type !== 'rest' ? 'font-bold text-zinc-200' : 'text-zinc-500'}>
                            {slot.type === 'rest' ? 'Rest' : `${slot.hours}h`}
                          </span>
                          <span className="material-symbols-outlined text-xs">
                            {slot.type === 'focus' ? 'bolt' : slot.type === 'spaced' ? 'cached' : slot.type === 'buffer' ? 'shield' : 'add'}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-zinc-200 truncate mt-1">
                          {slot.label}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate font-mono">
                          {slot.sublabel}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AFTERNOON ROW */}
              <div>
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-orange-400 text-sm">wb_twilight</span>
                    <span className="text-xs font-semibold text-zinc-200">Afternoon Block</span>
                    <span className="text-[11px] font-mono text-zinc-400">(13:00 - 17:00)</span>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2.5">
                  {DAYS.map((d) => {
                    const key = `${d.id}-afternoon`;
                    const slot = slots[key] || { type: 'rest', hours: 0, label: 'Rest / Off', sublabel: 'Standby' };
                    return (
                      <div
                        key={key}
                        onClick={() => setActiveSlotKey(key)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between min-h-[76px] ${
                          slot.type === 'focus'
                            ? 'bg-primary/15 border-primary/80 hover:bg-primary/20 shadow-sm'
                            : slot.type === 'spaced'
                            ? 'bg-sky-500/15 border-sky-400/80 hover:bg-sky-500/20 shadow-sm'
                            : slot.type === 'buffer'
                            ? 'bg-emerald-500/15 border-emerald-400/80 hover:bg-emerald-500/20 shadow-sm'
                            : 'bg-surface-container-low border-dashed border-outline-variant hover:border-zinc-500 text-zinc-500'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className={slot.type !== 'rest' ? 'font-bold text-zinc-200' : 'text-zinc-500'}>
                            {slot.type === 'rest' ? 'Rest' : `${slot.hours}h`}
                          </span>
                          <span className="material-symbols-outlined text-xs">
                            {slot.type === 'focus' ? 'bolt' : slot.type === 'spaced' ? 'cached' : slot.type === 'buffer' ? 'shield' : 'add'}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-zinc-200 truncate mt-1">
                          {slot.label}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate font-mono">
                          {slot.sublabel}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* EVENING ROW */}
              <div>
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-400 text-sm">nightlight</span>
                    <span className="text-xs font-semibold text-zinc-200">Evening Block</span>
                    <span className="text-[11px] font-mono text-zinc-400">(18:30 - 21:30)</span>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2.5">
                  {DAYS.map((d) => {
                    const key = `${d.id}-evening`;
                    const slot = slots[key] || { type: 'rest', hours: 0, label: 'Rest / Off', sublabel: 'Standby' };
                    return (
                      <div
                        key={key}
                        onClick={() => setActiveSlotKey(key)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between min-h-[76px] ${
                          slot.type === 'focus'
                            ? 'bg-primary/15 border-primary/80 hover:bg-primary/20 shadow-sm'
                            : slot.type === 'spaced'
                            ? 'bg-sky-500/15 border-sky-400/80 hover:bg-sky-500/20 shadow-sm'
                            : slot.type === 'buffer'
                            ? 'bg-emerald-500/15 border-emerald-400/80 hover:bg-emerald-500/20 shadow-sm'
                            : 'bg-surface-container-low border-dashed border-outline-variant hover:border-zinc-500 text-zinc-500'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className={slot.type !== 'rest' ? 'font-bold text-zinc-200' : 'text-zinc-500'}>
                            {slot.type === 'rest' ? 'Rest' : `${slot.hours}h`}
                          </span>
                          <span className="material-symbols-outlined text-xs">
                            {slot.type === 'focus' ? 'bolt' : slot.type === 'spaced' ? 'cached' : slot.type === 'buffer' ? 'shield' : 'add'}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-zinc-200 truncate mt-1">
                          {slot.label}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate font-mono">
                          {slot.sublabel}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DAILY REVISION GOAL & EXTRA TIME FOR CATCH-UP CONFIGURATION */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Daily Revision Goal */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-mono font-semibold uppercase text-zinc-200 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-base">fact_check</span>
                  Daily Revision Goal
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Target study hours each day for reviewing flashcards and practicing revision questions before rolling over
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-primary px-2.5 py-1 rounded bg-surface-container-high border border-primary/30">
                {dailyReviewThreshold} hrs / day
              </span>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min="1.0"
                max="6.0"
                step="0.5"
                value={dailyReviewThreshold}
                onChange={(e) => setDailyReviewThreshold(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                <span>1.0h (Light)</span>
                <span>2.5h (Standard)</span>
                <span>4.0h (Intensive)</span>
                <span>6.0h (Immersion)</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant text-xs text-zinc-300 flex items-center justify-between">
              <span>Card Rollover Buffer:</span>
              <span className="text-primary font-mono font-semibold">Max ~120 cards / sprint</span>
            </div>
          </div>

          {/* Card 2: Extra Time for Catch-Up */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-mono font-semibold uppercase text-emerald-400 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">shield</span>
                  Extra Time for Catch-Up
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Dedicated buffer time set aside each week so you can easily catch up on missed topics without falling behind
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30">
                {bufferZonePercent}% Reserve
              </span>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min="10"
                max="35"
                step="5"
                value={bufferZonePercent}
                onChange={(e) => setBufferZonePercent(parseInt(e.target.value))}
                className="w-full h-1.5 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                <span>10% (Tight)</span>
                <span>20% (Recommended)</span>
                <span>35% (High Flexibility)</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-300 pt-1">
              <span>Primary Healing Day:</span>
              <select
                value={designatedBufferDay}
                onChange={(e) => setDesignatedBufferDay(e.target.value)}
                className="bg-surface-container-high border border-outline-variant text-emerald-400 font-mono text-xs rounded px-2.5 py-1 focus:outline-none cursor-pointer"
              >
                <option value="sun">Sunday (Recommended)</option>
                <option value="sat">Saturday</option>
                <option value="wed">Wednesday Midweek</option>
              </select>
            </div>
          </div>
        </section>

        {/* BOTTOM SUMMARY STATS CARDS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
            <div className="text-[11px] font-mono uppercase text-zinc-400 mb-1">Deep Focus Blocks</div>
            <div className="text-2xl font-bold font-mono text-primary">{deepFocusHours.toFixed(1)} hrs</div>
            <p className="text-[11px] text-zinc-400 mt-1">Dedicated to complex syllabus topics</p>
          </div>

          <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
            <div className="text-[11px] font-mono uppercase text-zinc-400 mb-1">Spaced Repetition</div>
            <div className="text-2xl font-bold font-mono text-sky-400">{spacedHours.toFixed(1)} hrs</div>
            <p className="text-[11px] text-zinc-400 mt-1">Active recall & card sprints</p>
          </div>

          <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
            <div className="text-[11px] font-mono uppercase text-zinc-400 mb-1">Adaptive Buffer</div>
            <div className="text-2xl font-bold font-mono text-emerald-400">{bufferHours.toFixed(1)} hrs</div>
            <p className="text-[11px] text-zinc-400 mt-1">Auto-heal time (Zero burnout)</p>
          </div>

          <div className="bg-surface-container border border-outline-variant rounded-xl p-4">
            <div className="text-[11px] font-mono uppercase text-zinc-400 mb-1">Total Dedicated</div>
            <div className="text-2xl font-bold font-mono text-zinc-100">{totalWeeklyHours.toFixed(1)} hrs</div>
            <p className="text-[11px] text-emerald-400 mt-1">Pacing status: Balanced</p>
          </div>
        </section>
      </main>

      {/* SLOT SELECTION MODAL (Issue 6: Clear Explicit Slot Configuration) */}
      {activeSlotKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-surface-container-high border border-outline-variant rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Configure Time Slot: {activeSlotKey.toUpperCase().replace('-', ' • ')}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Select what type of session to schedule</p>
              </div>
              <button
                onClick={() => setActiveSlotKey(null)}
                className="text-zinc-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Option 1: Deep Focus */}
              <div className="p-3 rounded-xl bg-surface-container border border-primary/40 hover:border-primary transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">bolt</span>
                    Active Deep Focus
                  </span>
                  <span className="text-[11px] text-zinc-400">Core theory / lecture</span>
                </div>
                <div className="flex gap-2">
                  {[2.0, 3.0, 3.5, 4.0].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setSlotDetails(activeSlotKey, 'focus', h)}
                      className="flex-1 py-1.5 rounded bg-primary/20 hover:bg-primary/40 text-primary text-xs font-mono font-semibold transition-colors"
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 2: Spaced Recall */}
              <div className="p-3 rounded-xl bg-surface-container border border-sky-500/40 hover:border-sky-400 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">cached</span>
                    Spaced Recall & Flashcards
                  </span>
                  <span className="text-[11px] text-zinc-400">Active recall</span>
                </div>
                <div className="flex gap-2">
                  {[1.0, 1.5, 2.0].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setSlotDetails(activeSlotKey, 'spaced', h)}
                      className="flex-1 py-1.5 rounded bg-sky-500/20 hover:bg-sky-500/40 text-sky-300 text-xs font-mono font-semibold transition-colors"
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 3: Adaptive Buffer */}
              <div className="p-3 rounded-xl bg-surface-container border border-emerald-500/40 hover:border-emerald-400 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">shield</span>
                    Adaptive Buffer
                  </span>
                  <span className="text-[11px] text-zinc-400">Catch-up & auto-heal</span>
                </div>
                <div className="flex gap-2">
                  {[1.5, 2.0, 3.0].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setSlotDetails(activeSlotKey, 'buffer', h)}
                      className="flex-1 py-1.5 rounded bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold transition-colors"
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 4: Rest / Off */}
              <button
                type="button"
                onClick={() => setSlotDetails(activeSlotKey, 'rest', 0)}
                className="w-full py-2.5 px-4 rounded-xl bg-surface-container hover:bg-surface-container-lowest border border-dashed border-outline-variant text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">bedtime</span>
                Set as Rest / Off (0 Hours)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Footer */}
      <footer className="fixed bottom-0 left-0 w-full z-40 flex justify-between items-center px-6 py-4 border-t border-outline-variant bg-surface-container-lowest">
        <button
          onClick={() => onNavigate('step2-exam')}
          className="flex items-center gap-2 text-on-surface-variant hover:border-outline hover:text-on-surface border border-outline-variant px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back</span>
        </button>

        <div className="hidden sm:flex items-center gap-3 font-mono text-xs text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-on-surface font-medium">Step 3 of 4: Study Bandwidth</span>
          </span>
          <span className="text-outline">•</span>
          <span>Next: AI Generation & Resources</span>
        </div>

        <button
          onClick={() => onNavigate('step4-resources')}
          className="flex items-center gap-2 bg-primary text-on-primary font-medium px-5 py-2.5 rounded-lg text-sm shadow-[0_0_20px_rgba(167,139,250,0.35)] hover:bg-primary/90 transition-all cursor-pointer active:scale-95"
        >
          <span>Confirm & Continue</span>
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </footer>
    </div>
  );
};
