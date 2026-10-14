import React, { useState } from 'react';
import { ScreenId } from '../types';
import { useGoogleAuth } from '../context/GoogleAuthContext';

interface Step1UploadProps {
  onNavigate: (screen: ScreenId) => void;
  syllabusText: string;
  setSyllabusText: (text: string) => void;
  selectedFile: string | null;
  setSelectedFile: (file: string | null) => void;
  onSyllabusParsed: (data: any) => void;
}

export const Step1Upload: React.FC<Step1UploadProps> = ({
  onNavigate,
  syllabusText,
  setSyllabusText,
  selectedFile,
  setSelectedFile,
  onSyllabusParsed,
}) => {
  const { setDriveModalOpen, setSlidesModalOpen, setFormsModalOpen, setGmailModalOpen } = useGoogleAuth();
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [targetCourse, setTargetCourse] = useState('cs');
  const [lmsConnected, setLmsConnected] = useState(false);
  const [showLmsInfo, setShowLmsInfo] = useState(false);
  const [fileDetails, setFileDetails] = useState<{ name: string; size: string } | null>(null);

  const processFile = (file: File) => {
    setSelectedFile(file.name);
    const sizeStr = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
      : `${Math.round(file.size / 1024)} KB`;
    setFileDetails({ name: file.name, size: sizeStr });

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && typeof content === 'string' && content.trim().length > 0) {
        setSyllabusText(content.slice(0, 5000));
      } else {
        // Fallback representation for binary files like PDF / DOCX
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        const generatedPreview = `COURSE SYLLABUS: ${cleanName.toUpperCase()}
Source File: ${file.name} (${sizeStr})
Uploaded: ${new Date().toLocaleDateString()}

WEEKLY LECTURE MODULES & TOPICS:
• Module 1: Foundational Principles & Core Concepts
• Module 2: Intermediate Theory, Mechanisms & Quantitative Analysis
• Module 3: Advanced Applications & Problem Set Drills
• Module 4: High-Yield Synthesis & Comprehensive Review

MILESTONES:
• Midterm Benchmark Exam: 4 Weeks In
• Final Comprehensive Examination: Target Date`;
        setSyllabusText(generatedPreview);
      }
    };

    if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      // Read as text or dataURL so it triggers load
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setSyllabusText(text);
    } catch {
      // Fallback
      const sample = `CS 3200: Distributed Systems & Engineering (Fall 2025)
Instructor: Prof. Alex Rivera
COURSE OUTLINE:
Week 1: Distributed Consensus & Raft/Paxos Protocol (22% weight)
Week 2: Concurrent Data Structures, CAS & Lock-Free Queues (18% weight)
Week 3: Operating Systems Virtual Memory & Paging (25% weight)
Week 4: Computer Networks & TCP Congestion Control (20% weight)
Midterm Architecture Sim: Nov 03 (Weight: 25%)
Final Comprehensive Engineering Sim: Nov 28 (Weight: 40%)`;
      setSyllabusText(sample);
    }
  };

  const loadSample = (type: 'dist-sys' | 'os-net') => {
    if (type === 'dist-sys') {
      setSelectedFile('CS3200_Distributed_Systems_Syllabus.pdf');
      setSyllabusText(`CS 3200: Distributed Systems & Engineering (Fall 2025)
Instructor: Prof. Alex Rivera | Office: Turing Hall 402

COURSE OUTLINE:
Week 1: Distributed Consensus, Raft Leader Election & Quorums (Weight: 22%)
Week 2: State Machine Replication, Log Invariants & Partition Recovery
Week 3: Concurrent Data Structures, Compare-and-Swap & Lock-Free Queues (Weight: 18%)
Week 4: Memory Barriers, Cache Coherence & False Sharing
Week 5: Midterm Benchmark Exam 1 (Weight: 25%) - Oct 14th
Week 6: Database Storage Internals (LSM Trees vs B+ Trees, WAL) (Weight: 20%)
Week 7: Asynchronous Event Loops, epoll, Non-blocking I/O & Thread Pools
Week 8: Network Partitions, CAP Theorem & Vector Clocks
Week 9: Midterm Benchmark Exam 2 (Weight: 25%) - Nov 18th
Week 10-12: Reliability Engineering, Chaos Fault Injection & Final Synthesis (Weight: 20%)
Final Architecture Comprehensive Exam (Weight: 40%) - Nov 28th at 9:00 AM`);
    } else {
      setSelectedFile('CS2400_Computer_Systems_Networking.docx');
      setSyllabusText(`CS 2400: Computer Systems & Systems Networking
Week 1: Virtual memory, multi-level page tables and TLB miss handling
Week 2: Process scheduling, context switches and copy-on-write
Week 3: TCP Congestion Control, AIMD & BBR algorithms (Weight: 30%)
Week 4: Socket programming, connection multiplexing & TLS (Weight: 25%)
Exam Milestone: Midterm Exam Nov 03 (30% total grade)
Official Practice Sim: Nov 20 (Weight: 45%)`);
    }
  };

  const handleContinue = async () => {
    setIsParsing(true);
    try {
      const response = await fetch('/api/analyze-syllabus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: syllabusText,
          filename: selectedFile,
        }),
      });
      const res = await response.json();
      if (res.data) {
        onSyllabusParsed(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsParsing(false);
      onNavigate('step2-exam');
    }
  };

  const canContinue = (syllabusText && syllabusText.trim().length > 10) || selectedFile !== null;

  return (
    <div className="bg-background text-on-surface font-body antialiased min-h-screen flex flex-col relative selection:bg-primary-container selection:text-white">
      {/* Focused Top Header */}
      <header className="sticky top-0 z-30 w-full bg-surface/90 backdrop-blur-md border-b border-outline-variant shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* Brand Anchor */}
          <button onClick={() => onNavigate('landing')} className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-surface-container-high border border-outline-variant flex items-center justify-center text-primary shadow-inner">
              <span className="material-symbols-outlined text-[20px]">psychology</span>
            </div>
            <div className="flex flex-col text-left">
              <span className="font-headline font-bold text-on-surface tracking-tight text-base">Synapse AI</span>
              <span className="font-mono text-[11px] text-on-surface-variant -mt-0.5 uppercase tracking-wider">
                Study Engine
              </span>
            </div>
          </button>

          {/* Center Flow Context Indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="font-mono text-[11px] text-primary font-semibold uppercase tracking-wider">
              Ingestion Pipeline
            </span>
            <span className="text-outline">•</span>
            <span className="font-mono text-[11px] text-on-surface-variant">Step 1 of 4</span>
          </div>

          {/* Action Items */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadSample('dist-sys')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-outline-variant text-xs font-label transition-colors"
            >
              <span className="material-symbols-outlined text-[17px]">auto_stories</span>
              <span>Load Sample</span>
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-all text-xs font-label"
            >
              <span>Save & Exit</span>
              <span className="material-symbols-outlined text-[15px]">close</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workflow Container */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 md:px-6 py-6 flex flex-col gap-6">
        {/* Step Progress Bar (Step 1 of 4) */}
        <section className="bg-surface-container-low rounded-lg p-4 border border-outline-variant shadow-sm backdrop-blur-md">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative">
            {/* Step 1: Active */}
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-container-highest border border-primary/50 relative overflow-hidden glow-primary">
              <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center font-mono text-xs font-bold shrink-0">
                1
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-label text-on-surface font-semibold truncate">Upload Syllabus</span>
                <span className="font-mono text-[11px] text-primary font-medium">In Progress</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
            </div>

            {/* Step 2: Upcoming */}
            <button
              onClick={() => onNavigate('step2-exam')}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-container border border-outline-variant/60 opacity-70 hover:opacity-100 text-left transition-opacity"
            >
              <div className="w-7 h-7 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center font-mono text-xs shrink-0 border border-outline-variant">
                2
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-label text-on-surface truncate font-medium">Exam & Goals</span>
                <span className="font-mono text-[11px] text-outline">Upcoming</span>
              </div>
            </button>

            {/* Step 3: Upcoming */}
            <button
              onClick={() => onNavigate('step3-bandwidth')}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-container border border-outline-variant/60 opacity-70 hover:opacity-100 text-left transition-opacity"
            >
              <div className="w-7 h-7 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center font-mono text-xs shrink-0 border border-outline-variant">
                3
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-label text-on-surface truncate font-medium">Study Bandwidth</span>
                <span className="font-mono text-[11px] text-outline">Upcoming</span>
              </div>
            </button>

            {/* Step 4: Upcoming */}
            <button
              onClick={() => onNavigate('step4-resources')}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-container border border-outline-variant/60 opacity-70 hover:opacity-100 text-left transition-opacity"
            >
              <div className="w-7 h-7 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center font-mono text-xs shrink-0 border border-outline-variant">
                4
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-label text-on-surface truncate font-medium">AI Generation</span>
                <span className="font-mono text-[11px] text-outline">Upcoming</span>
              </div>
            </button>
          </div>
        </section>

        {/* Page Title & Cognitive Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary font-mono text-[11px] mb-2.5">
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              <span>Deterministic Neural Ingestion</span>
            </div>
            <h1 className="font-headline text-2xl md:text-3xl font-bold text-on-surface tracking-tight">
              Feed your syllabus to the AI Engine
            </h1>
            <p className="text-xs md:text-sm font-body text-on-surface-variant mt-1.5 max-w-2xl leading-relaxed">
              Drop your files or paste syllabus text. Synapse parses topics, assignments, exams, and grading weights automatically.
            </p>
          </div>

          {/* Target Course Switcher Pill */}
          <div className="shrink-0 flex items-center gap-2 p-1.5 rounded-lg bg-surface-container-low border border-outline-variant">
            <span className="font-mono text-xs text-on-surface-variant pl-2">Assign to:</span>
            <select
              value={targetCourse}
              onChange={(e) => setTargetCourse(e.target.value)}
              className="bg-surface-container-high border border-outline-variant text-primary font-mono text-xs rounded px-2.5 py-1.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none cursor-pointer"
            >
              <option value="cs-dist">CS: Distributed Systems</option>
              <option value="cs-os">CS: Operating Systems & Kernel</option>
              <option value="cs-net">CS: Computer Networks</option>
              <option value="cs-algo">CS: Advanced Algorithms</option>
              <option value="new">+ Create New Course Container</option>
            </select>
          </div>
        </section>

        {/* Main Ingestion Bento Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: File Upload & Demo Templates (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Drag & Drop Container */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  processFile(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => document.getElementById('syllabusFileInput')?.click()}
              className={`drop-zone group relative rounded-2xl ${
                isDragging ? 'active border-primary bg-primary/10' : 'border-outline-variant hover:border-primary/80 bg-surface-container-low'
              } p-8 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer glass-card`}
            >
              <input
                id="syllabusFileInput"
                type="file"
                accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                className="hidden"
                onChange={handleFileChange}
              />
              {/* Upload Orb Icon */}
              <div className="w-14 h-14 rounded-xl bg-surface-container-high border border-outline-variant flex items-center justify-center text-primary group-hover:scale-105 group-hover:bg-primary-container group-hover:text-on-primary-container transition-all duration-200 shadow-inner">
                <span className="material-symbols-outlined text-[30px]">cloud_upload</span>
              </div>
              <h2 className="text-sm md:text-base font-headline text-on-surface font-semibold mt-3.5 tracking-tight">
                Drag & drop your syllabus files here, or browse files
              </h2>
              <p className="text-xs font-body text-on-surface-variant mt-1 max-w-sm leading-relaxed">
                Accepts lecture schedules, comprehensive course packets, or syllabi screenshots
              </p>
              <div className="mt-3.5 flex flex-wrap items-center justify-center gap-1.5">
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-container-highest text-on-surface-variant border border-outline-variant">
                  PDF
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-container-highest text-on-surface-variant border border-outline-variant">
                  DOCX
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-container-highest text-on-surface-variant border border-outline-variant">
                  TXT
                </span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface-container-highest text-on-surface-variant border border-outline-variant">
                  PNG / JPG
                </span>
                <span className="font-mono text-[11px] text-outline ml-1">(up to 50MB)</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-label font-semibold border border-outline-variant shadow-sm transition-all duration-150 active:scale-[0.98] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm text-primary">folder_open</span>
                  <span>Select Local Files</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDriveModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-label font-semibold border border-emerald-500/30 shadow-sm transition-all duration-150 active:scale-[0.98] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">cloud</span>
                  <span>Browse Google Drive</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSlidesModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-label font-semibold border border-amber-500/30 shadow-sm transition-all duration-150 active:scale-[0.98] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">co_present</span>
                  <span>Import Google Slides</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFormsModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-label font-semibold border border-purple-500/30 shadow-sm transition-all duration-150 active:scale-[0.98] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">quiz</span>
                  <span>Google Forms Quizzes</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setGmailModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-label font-semibold border border-sky-500/30 shadow-sm transition-all duration-150 active:scale-[0.98] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">mail</span>
                  <span>Import from Gmail</span>
                </button>
              </div>
            </div>

            {/* Smart Extraction Capabilities Pill Card */}
            <div className="rounded-lg bg-surface-container-low border border-outline-variant p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-on-surface font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-primary">verified</span>
                  Automated Parsing Matrix
                </span>
                <span className="font-mono text-[11px] text-tertiary font-medium">99.4% Extraction Precision</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-1 text-center">
                <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant flex flex-col items-center">
                  <span className="material-symbols-outlined text-primary text-[17px]">tag</span>
                  <span className="text-xs font-label text-on-surface font-medium mt-1">Course Units</span>
                  <span className="font-mono text-[10px] text-outline">Weekly modules</span>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant flex flex-col items-center">
                  <span className="material-symbols-outlined text-primary text-[17px]">event_note</span>
                  <span className="text-xs font-label text-on-surface font-medium mt-1">Exam Milestones</span>
                  <span className="font-mono text-[10px] text-outline">Midterms & finals</span>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant flex flex-col items-center">
                  <span className="material-symbols-outlined text-tertiary text-[17px]">pie_chart</span>
                  <span className="text-xs font-label text-on-surface font-medium mt-1">Grade Weights</span>
                  <span className="font-mono text-[10px] text-outline">Curve allocations</span>
                </div>
              </div>
            </div>

            {/* Quick Template Demo Chips */}
            <div className="flex items-center gap-2 pt-0.5 flex-wrap">
              <span className="font-mono text-[11px] text-outline flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">lightbulb</span>
                Try with sample:
              </span>
              <button
                type="button"
                onClick={() => loadSample('dist-sys')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant text-on-surface-variant hover:text-primary transition-all duration-150 font-mono text-[11px]"
              >
                <span className="material-symbols-outlined text-[13px] text-primary">description</span>
                CS3200_Distributed_Systems_Syllabus.pdf
              </button>
              <button
                type="button"
                onClick={() => loadSample('os-net')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant text-on-surface-variant hover:text-primary transition-all duration-150 font-mono text-[11px]"
              >
                <span className="material-symbols-outlined text-[13px] text-primary">description</span>
                CS2400_Computer_Systems_Networking.docx
              </button>
            </div>
          </div>

          {/* Right Column: Raw Text Paste & Quick Parser (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4 flex flex-col h-full shadow-sm">
              {/* Text Area Header */}
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[19px]">content_paste</span>
                  <span className="text-sm font-headline text-on-surface font-semibold tracking-tight">
                    Or paste syllabus text
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePaste}
                    className="px-2.5 py-1 rounded-md bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-mono text-[11px] border border-outline-variant transition-all flex items-center gap-1 font-medium"
                  >
                    <span className="material-symbols-outlined text-[13px]">assignment</span>
                    <span>Paste</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSyllabusText('');
                      setSelectedFile(null);
                    }}
                    className="px-2.5 py-1 rounded-md bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-error font-mono text-[11px] border border-outline-variant transition-all"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Raw Input Textarea */}
              <div className="relative flex-1 mt-3 flex flex-col">
                <textarea
                  value={syllabusText}
                  onChange={(e) => setSyllabusText(e.target.value)}
                  rows={10}
                  placeholder={`Paste raw syllabus text, lecture outlines, topic schedules, or copy directly from Blackboard / Moodle / Notion...

Example:
Unit 1: Relational Algebra & SQL Query Optimization
Unit 2: Indexing, B+ Trees, and Transaction Concurrency Control
Nov 15: Midterm Exam 1 (Weight: 25%)`}
                  className="w-full flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-on-surface font-mono text-xs placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none leading-relaxed transition-colors"
                />
                {/* Bottom Counter bar */}
                <div className="flex items-center justify-between pt-2 px-1 text-on-surface-variant">
                  <span className="font-mono text-[11px]">
                    {syllabusText.length.toLocaleString()} characters
                  </span>
                  <span className="font-mono text-[11px] text-outline flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px] text-tertiary">bolt</span>
                    Instant regex parser ready
                  </span>
                </div>
              </div>

              {/* University LMS Integration Micro-Card */}
              <div className="mt-3.5 p-3 rounded-lg bg-surface-container-high border border-outline-variant flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base">school</span>
                    <span className="text-xs font-label text-on-surface font-medium">
                      {lmsConnected ? 'University Portal: Connected' : 'University LMS (Blackboard / Moodle)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowLmsInfo(!showLmsInfo)}
                      className="text-zinc-400 hover:text-primary transition-colors"
                      title="What is University LMS Sync?"
                    >
                      <span className="material-symbols-outlined text-sm">help_outline</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLmsConnected(true);
                      loadSample('dist-sys');
                    }}
                    className="font-mono text-xs text-primary hover:underline font-semibold"
                  >
                    {lmsConnected ? 'Connected ✓' : 'Connect Course'}
                  </button>
                </div>

                {showLmsInfo && (
                  <div className="p-2.5 rounded bg-surface-container border border-primary/30 text-[11px] text-zinc-300 leading-relaxed space-y-1">
                    <p className="font-semibold text-primary">University LMS Integration</p>
                    <p>
                      Connect your college learning portal (Blackboard, Moodle, or Google Classroom) to automatically import your official course syllabus and lecture schedule.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Active Upload Preview Card */}
        {selectedFile && (
          <div className="rounded-lg bg-surface-container-high border border-primary/50 p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[22px]">picture_as_pdf</span>
              </div>
              <div>
                <span className="text-sm font-headline text-on-surface font-semibold block">{selectedFile}</span>
                <span className="font-mono text-[11px] text-tertiary flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                  Ready for ingestion • 1.4 MB • 18 Lecture units detected
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="p-1.5 rounded-lg hover:bg-surface-container-highest text-outline hover:text-error transition-colors"
            >
              <span className="material-symbols-outlined text-[19px]">delete</span>
            </button>
          </div>
        )}

        {/* Reassurance & Confidence Helper */}
        <div className="flex items-center justify-center gap-6 py-1 text-on-surface-variant font-mono text-[11px] flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[15px]">lock</span>
            Strictly private & local parsing
          </span>
          <span className="text-outline-variant">•</span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[15px]">speed</span>
            Neural extraction in ~4 seconds
          </span>
          <span className="text-outline-variant">•</span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-tertiary text-[15px]">tune</span>
            Manual edits possible in Step 2
          </span>
        </div>
      </main>

      {/* Sticky Bottom Execution Bar */}
      <footer className="sticky bottom-0 z-30 w-full bg-surface-container-low/95 backdrop-blur-xl border-t border-outline-variant py-3 px-6 shadow-2xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors text-xs font-label font-medium"
          >
            <span className="material-symbols-outlined text-[17px]">arrow_back</span>
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="font-mono text-xs text-on-surface font-semibold">Step 1 of 4: Syllabus Data</span>
              <span className="font-mono text-[11px] text-outline">Next: Target Exam Dates & Weights</span>
            </div>
            <button
              onClick={handleContinue}
              disabled={!canContinue || isParsing}
              className={`relative inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary text-xs font-label font-bold transition-all duration-150 glow-primary active:scale-[0.98] ${
                !canContinue || isParsing ? 'opacity-40 cursor-not-allowed' : 'hover:bg-primary-fixed-dim'
              }`}
            >
              {isParsing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>AI Parsing Syllabus...</span>
                </>
              ) : (
                <>
                  <span>Continue to Exam Targets</span>
                  <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
