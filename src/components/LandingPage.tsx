import React from 'react';
import { ScreenId } from '../types';

interface LandingPageProps {
  onNavigate: (screen: ScreenId) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="bg-background text-on-surface antialiased selection:bg-primary selection:text-on-primary min-h-screen flex flex-col font-body">
      {/* ================= TOP APP BAR ================= */}
      <header className="bg-surface/80 backdrop-blur-md border-b border-outline-variant docked full-width top-0 sticky z-40">
        <div className="flex justify-between items-center w-full px-6 md:px-12 max-w-7xl mx-auto h-16">
          {/* Brand Logo */}
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2.5 text-lg font-headline font-semibold text-on-surface tracking-tight group"
          >
            <div className="w-8 h-8 rounded-lg bg-surface-container-highest border border-outline-variant flex items-center justify-center text-primary group-hover:border-primary transition-colors duration-150">
              <span className="material-symbols-outlined text-primary">neurology</span>
            </div>
            <span>Synapse</span>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="text-on-surface font-medium hover:text-primary transition-colors duration-150">
              Features
            </a>
            <a href="#how-it-works" className="text-on-surface-variant font-medium hover:text-on-surface transition-colors duration-150">
              How It Works
            </a>
            <a href="#testimonials" className="text-on-surface-variant font-medium hover:text-on-surface transition-colors duration-150">
              Testimonials
            </a>
            <a href="#pricing" className="text-on-surface-variant font-medium hover:text-on-surface transition-colors duration-150">
              Pricing
            </a>
            <button
              onClick={() => onNavigate('master-schedule')}
              className="text-primary font-medium hover:underline flex items-center gap-1"
            >
              <span>Dashboard Demo</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </nav>

          {/* Trailing Action Buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('dashboard')}
              className="text-on-surface-variant hover:text-on-surface text-sm font-medium transition-colors duration-150"
            >
              Sign In
            </button>
            <button
              onClick={() => onNavigate('step1-upload')}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-primary text-on-primary hover:bg-primary-fixed-dim transition-colors duration-150 shadow-sm font-semibold active:scale-[0.98]"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* ================= HERO SECTION ================= */}
      <section className="relative overflow-hidden pt-16 md:pt-24 pb-20 bg-background bg-grid-mesh">
        {/* Ambient Gradient Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-primary/10 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute top-1/3 left-1/4 w-[360px] h-[360px] bg-tertiary/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-primary-container/10 rounded-full blur-[130px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          {/* Headline & Callout Content */}
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-outline-variant bg-surface-container-high/80 backdrop-blur-sm mb-6 text-xs text-on-surface-variant">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
              <span className="text-on-surface font-medium">Neural Engine 4.2 Live</span>
              <span className="text-outline">|</span>
              <span className="text-primary font-mono">FSRS Adaptive Algorithm</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-headline font-extrabold tracking-tight text-on-surface leading-[1.1] mb-6">
              Turn Your Syllabus Into a{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary-fixed-dim to-tertiary">
                Smart Study Plan.
              </span>
            </h1>

            <p className="text-lg md:text-xl font-body text-on-surface-variant max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
              AI-powered planning that adapts to your progress.
            </p>

            {/* CTA & Secondary helper line */}
            <div className="flex flex-col items-center justify-center gap-3">
              <button
                onClick={() => onNavigate('step1-upload')}
                className="glow-pill group relative inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-semibold rounded-xl bg-primary text-on-primary hover:bg-primary-fixed-dim transition-all duration-200 cursor-pointer active:scale-95"
              >
                <span>Get Started</span>
                <span className="material-symbols-outlined text-on-primary group-hover:translate-x-0.5 transition-transform duration-150">
                  arrow_forward
                </span>
              </button>
              <p className="text-xs text-secondary-fixed font-mono tracking-tight mt-1">
                No credit card required • Instant syllabus parser • Free 14-day trial
              </p>
            </div>
          </div>

          {/* High-Fidelity Floating Mockup Hero Graphic */}
          <div className="relative max-w-5xl mx-auto mt-10">
            <div className="rounded-xl border border-outline-variant bg-surface-container/95 p-3 md:p-5 shadow-2xl backdrop-blur-xl glow-violet">
              {/* Mockup Window Header */}
              <div className="flex items-center justify-between border-b border-outline-variant pb-3 mb-4 px-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#ef4444]/60 border border-[#ef4444]"></span>
                  <span className="w-3 h-3 rounded-full bg-[#eab308]/60 border border-[#eab308]"></span>
                  <span className="w-3 h-3 rounded-full bg-tertiary/60 border border-tertiary"></span>
                  <span className="text-xs font-mono text-on-surface-variant ml-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs text-primary">insert_drive_file</span>
                    BIOCHEM_2025_Final_Syllabus.pdf
                  </span>
                </div>
                {/* Live Status Pill */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-highest border border-outline-variant text-[11px] font-mono text-tertiary">
                  <span className="material-symbols-outlined text-xs text-tertiary">verified</span>
                  <span>32 Modules Parsed • Schedule Calibrated • 94% Retention Target</span>
                </div>
              </div>

              {/* Mockup Body: Left Ingestion + Right Calendar */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left: Document Stream Analysis */}
                <div className="lg:col-span-4 bg-surface-container-low rounded-lg p-4 border border-outline-variant flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono text-on-surface-variant tracking-wider">AI DECOMPOSITION</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-tertiary-container text-on-tertiary-container font-mono">
                        100% COMPLETE
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      <div className="p-2.5 rounded bg-surface border border-outline-variant text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-on-surface">Unit 3: Enzymatic Kinetics</span>
                          <span className="text-[10px] font-mono text-primary">High Yield</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant">Michaelis-Menten & Lineweaver-Burk plots.</p>
                        <div className="mt-2 w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                          <div className="bg-primary h-full w-4/5"></div>
                        </div>
                      </div>
                      <div className="p-2.5 rounded bg-surface border border-outline-variant text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-on-surface">Unit 4: Oxidative Phosphorylation</span>
                          <span className="text-[10px] font-mono text-tertiary">Exam 40%</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant">Complexes I-IV, Chemiosmosis & ATP Synthase.</p>
                        <div className="mt-2 w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                          <div className="bg-tertiary h-full w-3/5"></div>
                        </div>
                      </div>
                      <div className="p-2.5 rounded bg-surface border border-outline-variant text-xs opacity-75">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-on-surface">Unit 5: Lipid Metabolism</span>
                          <span className="text-[10px] font-mono text-secondary-fixed">Spaced Day 4</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant">Beta-oxidation spiral & Ketogenesis balance.</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-outline-variant flex items-center justify-between text-xs text-on-surface-variant">
                    <span className="flex items-center gap-1 font-mono">
                      <span className="material-symbols-outlined text-xs text-primary">auto_awesome</span>
                      Target: Dec 14 Exam
                    </span>
                    <span className="font-mono text-primary">Self-Healing ON</span>
                  </div>
                </div>

                {/* Right: Dynamic Adaptive Calendar */}
                <div className="lg:col-span-8 bg-surface-container-low rounded-lg p-4 border border-outline-variant">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">calendar_month</span>
                      <span className="text-sm font-medium text-on-surface">Cognitive Load Calendar • Oct 28 - Nov 03</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant">
                      <span className="inline-block w-2 h-2 rounded-full bg-primary"></span> Deep Focus
                      <span className="inline-block w-2 h-2 rounded-full bg-tertiary ml-2"></span> Retrieval Active
                    </div>
                  </div>

                  {/* 4-Day Calendar Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Day 1 */}
                    <div className="bg-surface rounded-lg p-2.5 border border-outline-variant flex flex-col justify-between min-h-[170px]">
                      <div>
                        <div className="text-[10px] font-mono text-on-surface-variant mb-1">MON • OCT 28</div>
                        <div className="text-xs font-semibold text-on-surface mb-2">90m Focus</div>
                        <div className="p-1.5 rounded bg-surface-container-highest border-l-2 border-primary text-[11px] mb-1.5">
                          <p className="font-medium text-on-surface truncate">Raft Consensus & Leader Election</p>
                          <p className="text-[9px] font-mono text-on-surface-variant">08:00 - 09:30</p>
                        </div>
                        <div className="p-1.5 rounded bg-surface-container-highest border-l-2 border-tertiary text-[11px]">
                          <p className="font-medium text-on-surface truncate">Flashcards: CAS Invariants (35)</p>
                          <p className="text-[9px] font-mono text-on-surface-variant">17:00 - 17:30</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-tertiary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[10px]">check_circle</span> Complete
                      </span>
                    </div>

                    {/* Day 2 */}
                    <div className="bg-surface-container-highest rounded-lg p-2.5 border border-primary/50 flex flex-col justify-between min-h-[170px] relative">
                      <div className="absolute -top-1.5 right-2 px-1.5 py-0.2 rounded bg-primary text-on-primary text-[9px] font-mono font-bold">
                        TODAY
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-primary mb-1">TUE • OCT 29</div>
                        <div className="text-xs font-semibold text-on-surface mb-2">120m Deep Session</div>
                        <div className="p-1.5 rounded bg-surface border-l-2 border-primary text-[11px] mb-1.5">
                          <p className="font-medium text-primary-fixed truncate">Virtual Memory & Page Tables</p>
                          <p className="text-[9px] font-mono text-on-surface-variant">09:00 - 11:00</p>
                        </div>
                        <div className="p-1.5 rounded bg-surface border-l-2 border-primary text-[11px]">
                          <p className="font-medium text-on-surface truncate">TCP AIMD Congestion Drills</p>
                          <p className="text-[9px] font-mono text-on-surface-variant">19:30 - 20:30</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[10px]">sync</span> In Progress
                      </span>
                    </div>

                    {/* Day 3 */}
                    <div className="bg-surface rounded-lg p-2.5 border border-outline-variant flex flex-col justify-between min-h-[170px]">
                      <div>
                        <div className="text-[10px] font-mono text-on-surface-variant mb-1">WED • OCT 30</div>
                        <div className="text-xs font-semibold text-on-surface mb-2">45m Spaced Recall</div>
                        <div className="p-1.5 rounded bg-surface-container-highest border-l-2 border-tertiary text-[11px] mb-1.5">
                          <p className="font-medium text-on-surface truncate">FSRS Decay Review: Lock-Free Queues</p>
                          <p className="text-[9px] font-mono text-on-surface-variant">14:00 - 14:45</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-on-surface-variant">Pending</span>
                    </div>

                    {/* Day 4 */}
                    <div className="bg-surface rounded-lg p-2.5 border border-outline-variant flex flex-col justify-between min-h-[170px]">
                      <div>
                        <div className="text-[10px] font-mono text-on-surface-variant mb-1">THU • OCT 31</div>
                        <div className="text-xs font-semibold text-on-surface mb-2">90m Synthesis</div>
                        <div className="p-1.5 rounded bg-surface-container-highest border-l-2 border-secondary-fixed text-[11px] mb-1.5">
                          <p className="font-medium text-on-surface truncate">LSM Tree Storage Engine Lab</p>
                          <p className="text-[9px] font-mono text-on-surface-variant">10:00 - 11:30</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-on-surface-variant">Calibrated</span>
                    </div>
                  </div>

                  {/* Adaptation Banner */}
                  <div className="mt-3 bg-surface-container rounded p-2.5 border border-outline-variant flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-tertiary text-sm">bolt</span>
                      <span className="text-on-surface-variant">
                        Auto-Healing active: Session missed yesterday re-balanced across Wednesday & Thursday without moving target exam date.
                      </span>
                    </div>
                    <button onClick={() => onNavigate('master-schedule')} className="font-mono text-xs text-primary underline cursor-pointer">
                      Review Delta
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TRUSTED BY STRIP ================= */}
      <section className="border-y border-outline-variant bg-surface py-10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
          <p className="text-xs md:text-sm font-mono text-on-surface-variant tracking-wider uppercase mb-8">
            Trusted by 45,000+ students from top medical, law, and engineering programs
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-75">
            <div className="flex items-center gap-2 text-on-surface font-semibold tracking-tight text-base md:text-lg">
              <span className="material-symbols-outlined text-primary text-xl">school</span>
              <span>HARVARD</span>
            </div>
            <div className="flex items-center gap-2 text-on-surface font-semibold tracking-tight text-base md:text-lg">
              <span className="material-symbols-outlined text-primary text-xl">biotech</span>
              <span>JOHNS HOPKINS</span>
            </div>
            <div className="flex items-center gap-2 text-on-surface font-semibold tracking-tight text-base md:text-lg">
              <span className="material-symbols-outlined text-primary text-xl">local_library</span>
              <span>STANFORD</span>
            </div>
            <div className="flex items-center gap-2 text-on-surface font-semibold tracking-tight text-base md:text-lg">
              <span className="material-symbols-outlined text-primary text-xl">memory</span>
              <span>MIT</span>
            </div>
            <div className="flex items-center gap-2 text-on-surface font-semibold tracking-tight text-base md:text-lg">
              <span className="material-symbols-outlined text-primary text-xl">history_edu</span>
              <span>OXFORD</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CORE FEATURES GRID ================= */}
      <section className="py-24 bg-background relative" id="features">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-mono text-primary uppercase tracking-widest block mb-3">Architected For Retention</span>
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-on-surface tracking-tight mb-4">
              Engineered to eradicate cramming and study fatigue.
            </h2>
            <p className="text-on-surface-variant font-body text-base">
              Standard study planners treat time as an empty bucket. Synapse models your memory half-life, attention limits, and material difficulty.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-surface-container rounded-xl border border-outline-variant p-8 flex flex-col justify-between hover:border-primary/40 transition-colors duration-200">
              <div>
                <div className="w-12 h-12 rounded-lg bg-surface-container-highest border border-outline-variant flex items-center justify-center text-primary mb-6">
                  <span className="material-symbols-outlined text-2xl">document_scanner</span>
                </div>
                <h3 className="text-xl font-headline font-semibold text-on-surface mb-3 tracking-tight">
                  Instant Syllabus Ingestion
                </h3>
                <p className="text-sm font-body text-on-surface-variant leading-relaxed">
                  Drag & drop any syllabus or PDF; AI extracts high-yield topics, deadlines, and weightings in seconds.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-outline-variant/60 flex items-center gap-2 text-xs font-mono text-tertiary">
                <span className="material-symbols-outlined text-xs">check</span>
                <span>Handles multi-course syllabi and nested tables</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-surface-container rounded-xl border border-outline-variant p-8 flex flex-col justify-between hover:border-primary/40 transition-colors duration-200 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-primary/10 rounded-full blur-2xl"></div>
              <div>
                <div className="w-12 h-12 rounded-lg bg-surface-container-highest border border-outline-variant flex items-center justify-center text-primary mb-6">
                  <span className="material-symbols-outlined text-2xl">autorenew</span>
                </div>
                <h3 className="text-xl font-headline font-semibold text-on-surface mb-3 tracking-tight">
                  Real-Time Adaptive Rescheduling
                </h3>
                <p className="text-sm font-body text-on-surface-variant leading-relaxed">
                  Life happens. If you miss a study block or finish early, Synapse instantly reallocates time to keep your exam target intact.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-outline-variant/60 flex items-center gap-2 text-xs font-mono text-primary">
                <span className="material-symbols-outlined text-xs">bolt</span>
                <span>Zero manual calendar dragging or recalculation</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-surface-container rounded-xl border border-outline-variant p-8 flex flex-col justify-between hover:border-primary/40 transition-colors duration-200">
              <div>
                <div className="w-12 h-12 rounded-lg bg-surface-container-highest border border-outline-variant flex items-center justify-center text-tertiary mb-6">
                  <span className="material-symbols-outlined text-2xl">psychology</span>
                </div>
                <h3 className="text-xl font-headline font-semibold text-on-surface mb-3 tracking-tight">
                  Spaced Repetition & Cognitive Guard
                </h3>
                <p className="text-sm font-body text-on-surface-variant leading-relaxed">
                  Integrated memory decay algorithms (FSRS) and cognitive load monitors ensure zero burnout and peak recall.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-outline-variant/60 flex items-center gap-2 text-xs font-mono text-tertiary">
                <span className="material-symbols-outlined text-xs">shield</span>
                <span>Prevents &gt;4 hr un-spaced cognitive blocks</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="py-24 border-t border-outline-variant bg-surface relative" id="how-it-works">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-mono text-primary uppercase tracking-widest block mb-3">Protocol</span>
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-on-surface tracking-tight mb-4">
              From Course Outline to Exam Mastery
            </h2>
            <p className="text-on-surface-variant font-body text-base">
              A seamless three-phase pipeline that eliminates the overhead of managing what to study next.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 01 */}
            <div className="relative bg-surface-container-low rounded-xl border border-outline-variant p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl font-headline font-extrabold text-outline/50">01</span>
                <span className="p-2 rounded-lg bg-surface-container border border-outline-variant text-primary">
                  <span className="material-symbols-outlined">upload_file</span>
                </span>
              </div>
              <h3 className="text-lg font-headline font-semibold text-on-surface mb-2">
                Upload Your Syllabus & Set Exam Target
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed font-body">
                Drop course syllabi, lecture slide links, or custom reading schedules. Define your test dates, target letter grade, or percentile goal.
              </p>
              <div className="mt-6 p-3 rounded bg-surface border border-outline-variant text-xs font-mono text-on-surface-variant">
                Input: PDF, DOCX, Notion, or Canvas URL
              </div>
            </div>

            {/* Step 02 */}
            <div className="relative bg-surface-container-low rounded-xl border border-outline-variant p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl font-headline font-extrabold text-primary/40">02</span>
                <span className="p-2 rounded-lg bg-surface-container border border-outline-variant text-primary">
                  <span className="material-symbols-outlined">hub</span>
                </span>
              </div>
              <h3 className="text-lg font-headline font-semibold text-on-surface mb-2">
                AI Builds Your Optimized Cognitive Blueprint
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed font-body">
                Synapse computes historical question weighting, estimates subject complexity, and weaves spaced-repetition slots directly into your free hours.
              </p>
              <div className="mt-6 p-3 rounded bg-surface border border-outline-variant text-xs font-mono text-primary">
                Output: Calibrated micro-blocks & flash sessions
              </div>
            </div>

            {/* Step 03 */}
            <div className="relative bg-surface-container-low rounded-xl border border-outline-variant p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <span className="text-3xl font-headline font-extrabold text-tertiary/40">03</span>
                <span className="p-2 rounded-lg bg-surface-container border border-outline-variant text-tertiary">
                  <span className="material-symbols-outlined">cycle</span>
                </span>
              </div>
              <h3 className="text-lg font-headline font-semibold text-on-surface mb-2">
                Study, Sync, & Watch Your Schedule Self-Heal
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed font-body">
                Tick off units as you learn. Missed a clinical rotation or emergency? Synapse calculates optimal buffer utilization with zero penalty or panic.
              </p>
              <div className="mt-6 p-3 rounded bg-surface border border-outline-variant text-xs font-mono text-tertiary">
                Continuous: Real-time re-balance engine
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SPREADSHEETS VS SYNAPSE ================= */}
      <section className="py-24 border-t border-outline-variant bg-background">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-mono text-tertiary uppercase tracking-widest block mb-2">Efficiency Analysis</span>
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-on-surface tracking-tight mb-3">
              Static Spreadsheets vs. Synapse AI Engine
            </h2>
            <p className="text-on-surface-variant text-sm md:text-base">
              Save over 6+ hours of manual planning per week while increasing recall retention by up to 38%.
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-outline-variant">
              {/* Spreadsheets Column */}
              <div className="p-6 md:p-8 bg-surface-container-low/40">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-error-container/30 border border-error/30 flex items-center justify-center text-error">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </div>
                  <h3 className="text-base font-headline font-semibold text-on-surface">The Spreadsheet Nightmare</h3>
                </div>
                <ul className="space-y-4 text-xs md:text-sm font-body text-on-surface-variant">
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-error text-base shrink-0 mt-0.5">cancel</span>
                    <span>Manual data entry: Typing out every single chapter, topic, and lecture deadline manually.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-error text-base shrink-0 mt-0.5">cancel</span>
                    <span>Brittle scheduling: One missed day breaks all formulas, causing guilt and study paralysis.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-error text-base shrink-0 mt-0.5">cancel</span>
                    <span>Zero retention science: No decay calculation, forcing repetitive cramming before tests.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-error text-base shrink-0 mt-0.5">cancel</span>
                    <span>Wasted study time: 4-6 hours spent reorganizing dates every Sunday night.</span>
                  </li>
                </ul>
              </div>

              {/* Synapse AI Engine Column */}
              <div className="p-6 md:p-8 bg-surface-container-high/60 relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-tertiary-container/30 border border-tertiary/40 flex items-center justify-center text-tertiary">
                    <span className="material-symbols-outlined text-sm">check</span>
                  </div>
                  <div>
                    <h3 className="text-base font-headline font-semibold text-on-surface">The Synapse AI Engine</h3>
                    <span className="text-[10px] font-mono text-tertiary">Zero Maintenance Architecture</span>
                  </div>
                </div>
                <ul className="space-y-4 text-xs md:text-sm font-body text-on-surface">
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-tertiary text-base shrink-0 mt-0.5">check_circle</span>
                    <span>Instant Ingestion: Upload syllabi & slides; high-yield topics extracted in under 12 seconds.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-tertiary text-base shrink-0 mt-0.5">check_circle</span>
                    <span>Self-Healing Engine: Missed a day? Synapse recalibrates remaining days instantly with 0 manual inputs.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-tertiary text-base shrink-0 mt-0.5">check_circle</span>
                    <span>FSRS Algorithmic Spaced Recall: Automatically slots review sessions exactly at memory half-life decay.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-tertiary text-base shrink-0 mt-0.5">check_circle</span>
                    <span>Saved 6.4 Hours/week: Just open the app, follow today's calibrated block, and rest easy.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= TESTIMONIALS ================= */}
      <section className="py-24 border-t border-outline-variant bg-surface relative" id="testimonials">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-mono text-primary uppercase tracking-widest block mb-3">High-Stakes Results</span>
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-on-surface tracking-tight mb-4">
              Proven on the world’s toughest exams.
            </h2>
            <p className="text-on-surface-variant font-body text-base">
              From first-year pre-med to grueling Bar qualifications, here is how candidates locked in their target scores.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Testimonial 1 */}
            <div className="bg-surface-container rounded-xl border border-outline-variant p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-primary mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="material-symbols-outlined text-sm text-primary">
                      star
                    </span>
                  ))}
                </div>
                <p className="text-sm font-body text-on-surface leading-relaxed mb-6">
                  "I uploaded 4 different pre-med syllabi alongside my Kaplan MCAT book schedule. Synapse unified the chaos into an undeniable daily roadmap. Scored 523 (100th percentile)."
                </p>
              </div>
              <div className="pt-4 border-t border-outline-variant flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-on-surface">Dr. Elena Rostova</div>
                  <div className="text-xs font-mono text-on-surface-variant">MCAT 523 • Johns Hopkins Med</div>
                </div>
                <span className="text-[10px] font-mono text-tertiary px-2 py-0.5 rounded bg-tertiary-container">VERIFIED</span>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-surface-container rounded-xl border border-outline-variant p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-primary mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="material-symbols-outlined text-sm text-primary">
                      star
                    </span>
                  ))}
                </div>
                <p className="text-sm font-body text-on-surface leading-relaxed mb-6">
                  "The self-healing schedule was my lifeline during hospital rotations. When an ICU shift ran 4 hours over, Synapse effortlessly redistributed my cardio modules without causing a weekend panic."
                </p>
              </div>
              <div className="pt-4 border-t border-outline-variant flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-on-surface">Marcus Vance</div>
                  <div className="text-xs font-mono text-on-surface-variant">USMLE Step 1 Pass • Harvard Medical</div>
                </div>
                <span className="text-[10px] font-mono text-tertiary px-2 py-0.5 rounded bg-tertiary-container">VERIFIED</span>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-surface-container rounded-xl border border-outline-variant p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-primary mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="material-symbols-outlined text-sm text-primary">
                      star
                    </span>
                  ))}
                </div>
                <p className="text-sm font-body text-on-surface leading-relaxed mb-6">
                  "Passed the California Bar on my first try while working full-time. The FSRS decay alerts prevented me from forgetting Civil Procedure topics I covered in month one. Indispensable tool."
                </p>
              </div>
              <div className="pt-4 border-t border-outline-variant flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-on-surface">Priya S. Chen</div>
                  <div className="text-xs font-mono text-on-surface-variant">CA Bar 1st Attempt • Stanford Law</div>
                </div>
                <span className="text-[10px] font-mono text-tertiary px-2 py-0.5 rounded bg-tertiary-container">VERIFIED</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= PRICING ================= */}
      <section className="py-24 border-t border-outline-variant bg-background" id="pricing">
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
          <span className="text-xs font-mono text-primary uppercase tracking-widest block mb-2">Straightforward Access</span>
          <h2 className="text-3xl md:text-4xl font-headline font-bold text-on-surface tracking-tight mb-4">
            Invest in your highest potential score.
          </h2>
          <p className="text-on-surface-variant text-sm max-w-xl mx-auto mb-10">
            One clear subscription. Unlimited syllabi parsing, real-time schedule healing, and cognitive analytics.
          </p>

          <div className="rounded-2xl border border-outline-variant bg-surface-container p-8 md:p-10 max-w-xl mx-auto relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 px-4 py-1 bg-primary text-on-primary text-xs font-mono font-bold rounded-bl-lg">
              SEMESTER PASS
            </div>
            <div className="text-left mb-6">
              <div className="text-sm font-mono text-tertiary">All-Inclusive Pro</div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl md:text-5xl font-extrabold text-on-surface font-headline">$12</span>
                <span className="text-sm text-on-surface-variant font-mono">/ month, billed termly</span>
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-outline-variant text-left text-sm mb-8 text-on-surface">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                <span>Unlimited syllabus & slide deck parsing</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                <span>Real-time adaptive schedule self-healing</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                <span>FSRS spaced-repetition decay algorithm</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">check_circle</span>
                <span>Two-way Google Calendar & Apple iCal sync</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('step1-upload')}
              className="w-full inline-flex items-center justify-center py-3.5 px-6 rounded-lg bg-primary text-on-primary font-semibold hover:bg-primary-fixed-dim transition-colors duration-150 cursor-pointer active:scale-98"
            >
              Start 14-Day Free Trial
            </button>
            <p className="text-xs text-on-surface-variant font-mono text-center mt-3">
              Cancel anytime in 1-click. No questions asked.
            </p>
          </div>
        </div>
      </section>

      {/* ================= BOTTOM CALL TO ACTION ================= */}
      <section className="py-20 bg-surface border-t border-outline-variant relative overflow-hidden" id="start">
        <div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center relative z-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface-container-highest border border-outline-variant text-primary mb-6">
            <span className="material-symbols-outlined text-2xl">neurology</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-headline font-bold text-on-surface tracking-tight mb-4">
            Turn Your Syllabus Into a Smart Study Plan.
          </h2>
          <p className="text-base md:text-lg text-on-surface-variant font-body max-w-xl mx-auto mb-8">
            Join over 45,000 students achieving higher recall and zero burnout today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('step1-upload')}
              className="glow-pill inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold rounded-xl bg-primary text-on-primary hover:bg-primary-fixed-dim transition-all duration-150 w-full sm:w-auto active:scale-95 cursor-pointer"
            >
              <span>Get Started</span>
              <span className="material-symbols-outlined text-on-primary">arrow_forward</span>
            </button>
          </div>
          <p className="text-xs text-secondary-fixed font-mono mt-4">
            No credit card required • Instant syllabus parser • Free 14-day trial
          </p>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="bg-surface border-t border-outline-variant docked full-width bottom mt-auto">
        <div className="w-full px-6 md:px-12 py-12 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <div className="flex items-center gap-2 text-sm font-headline font-semibold text-on-surface">
              <span className="material-symbols-outlined text-primary text-base">neurology</span>
              <span>Synapse</span>
            </div>
            <span className="hidden md:inline text-outline">•</span>
            <p className="text-on-surface-variant text-xs">
              © 2025 Synapse AI Inc. Precision in Learning.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-xs text-on-surface-variant">
            <a href="#" className="hover:text-primary transition-colors duration-150">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors duration-150">Terms of Service</a>
            <a href="#" className="hover:text-primary transition-colors duration-150">Changelog</a>
            <a href="#" className="hover:text-primary transition-colors duration-150">Documentation</a>
            <a href="#" className="hover:text-primary transition-colors duration-150">Security</a>
            <span className="flex items-center gap-1.5 text-on-surface-variant">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
              <span>Status: Operational</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
