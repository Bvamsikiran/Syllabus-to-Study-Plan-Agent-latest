import React, { useState } from 'react';
import { ScreenId } from '../types';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { apiKeyService } from '../services/apiKeyService';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

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
  const [fileDetails, setFileDetails] = useState<{ name: string; size: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const processFile = (file: File) => {
    setSelectedFile(file.name);
    setErrorMessage(null);
    setSuccessNotice(null);

    const sizeStr = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
      : `${Math.round(file.size / 1024)} KB`;
    setFileDetails({ name: file.name, size: sizeStr });

    const isTextFile =
      file.type.includes('text') ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.csv') ||
      file.name.endsWith('.json');

    const reader = new FileReader();

    if (isTextFile) {
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content && typeof content === 'string' && content.trim().length > 0) {
          setSyllabusText(content.slice(0, 8000));
          setSuccessNotice(`Successfully loaded ${file.name} (${content.trim().length} characters).`);
        } else {
          setErrorMessage('The uploaded file was empty. Please supply a valid syllabus document.');
        }
      };
      reader.onerror = () => {
        setErrorMessage('Failed to read file from disk. Please try again or paste text manually.');
      };
      reader.readAsText(file);
    } else {
      // For binary files (PDF/DOCX), attempt to read text characters; if not clean, notify user honestly
      reader.onload = (event) => {
        const raw = event.target?.result as string;
        // Check printable ASCII density to verify if readable text exists
        const printableCount = (raw.match(/[\x20-\x7E\t\r\n]/g) || []).length;
        if (raw && printableCount > raw.length * 0.7 && raw.trim().length > 50) {
          setSyllabusText(raw.slice(0, 8000));
          setSuccessNotice(`Extracted readable text from ${file.name}.`);
        } else {
          setErrorMessage(
            `Unable to extract clean text from binary file "${file.name}". Please paste the syllabus text directly into the editor below or upload a .txt/.md file.`
          );
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handlePaste = async () => {
    setErrorMessage(null);
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().length > 0) {
        setSyllabusText(text);
        setSuccessNotice('Pasted text from clipboard.');
      } else {
        setErrorMessage('Clipboard is empty. Please copy your syllabus text first.');
      }
    } catch {
      setErrorMessage('Clipboard access was denied. Please paste directly into the box using Ctrl+V / Cmd+V.');
    }
  };

  const handleContinue = async () => {
    if (!syllabusText || syllabusText.trim().length < 10) {
      setErrorMessage('Please provide syllabus content (at least 10 characters) before continuing.');
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/analyze-syllabus', {
        method: 'POST',
        headers: apiKeyService.getAiHeaders(),
        body: JSON.stringify({
          text: syllabusText.trim(),
          filename: selectedFile,
        }),
      });

      const res = await response.json();

      if (response.ok && res.success && res.data) {
        onSyllabusParsed(res.data);
        onNavigate('step2-exam');
      } else {
        setErrorMessage(
          res.message || res.error || 'Failed to analyze syllabus. Please check your Gemini API key and retry.'
        );
      }
    } catch (err: any) {
      console.error('Syllabus analysis error:', err);
      setErrorMessage(
        err.message || 'Unable to connect to analysis service. Please check your connection and retry.'
      );
    } finally {
      setIsParsing(false);
    }
  };

  const canContinue = syllabusText && syllabusText.trim().length >= 10;

  return (
    <div className="bg-background text-on-surface font-body antialiased min-h-screen flex flex-col relative selection:bg-primary-container selection:text-white">
      {/* Focused Top Header */}
      <header className="sticky top-0 z-30 w-full bg-surface/90 backdrop-blur-md border-b border-outline-variant shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
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

          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="font-mono text-[11px] text-primary font-semibold uppercase tracking-wider">
              Ingestion Pipeline
            </span>
            <span className="text-outline">•</span>
            <span className="font-mono text-[11px] text-on-surface-variant">Step 1 of 4</span>
          </div>

          <button
            onClick={() => onNavigate('dashboard')}
            className="text-xs text-on-surface-variant hover:text-on-surface transition font-mono flex items-center gap-1"
          >
            <span>Exit Setup</span>
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Step Indicator Header */}
        <div>
          <span className="font-mono text-xs text-primary font-bold uppercase tracking-wider block">
            Phase 1: Course Ingestion
          </span>
          <h1 className="text-2xl md:text-3xl font-headline font-extrabold text-on-surface tracking-tight mt-1">
            Upload Your Actual Course Syllabus
          </h1>
          <p className="text-sm font-body text-on-surface-variant mt-1.5 max-w-2xl">
            Provide your syllabus text or upload your lecture outline. Synapse AI will analyze the genuine course topics, weightings, and milestones to generate your custom study schedule.
          </p>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block text-rose-200">Analysis Error</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {successNotice && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Upload Zone & Manual Editor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Left Column: Dropzone */}
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
            } p-8 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer glass-card min-h-[300px]`}
          >
            <input
              id="syllabusFileInput"
              type="file"
              accept=".txt,.md,.csv,.pdf,.docx"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="w-14 h-14 rounded-xl bg-surface-container-high border border-outline-variant flex items-center justify-center text-primary group-hover:scale-105 transition-all duration-200 shadow-inner">
              <span className="material-symbols-outlined text-[30px]">cloud_upload</span>
            </div>
            <h2 className="text-sm md:text-base font-headline text-on-surface font-semibold mt-3.5 tracking-tight">
              Drag & drop your syllabus file, or browse
            </h2>
            <p className="text-xs font-body text-on-surface-variant mt-1 max-w-xs leading-relaxed">
              Supports .txt, .md, .csv (or paste your course outline on the right)
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-label font-semibold border border-outline-variant shadow-sm transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm text-primary">folder_open</span>
                <span>Select File</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDriveModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-label font-semibold border border-emerald-500/30 shadow-sm transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">cloud</span>
                <span>Google Drive</span>
              </button>
            </div>
          </div>

          {/* Right Column: Direct Text Editor */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-headline font-semibold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">edit_note</span>
                <span>Syllabus Text / Outline</span>
              </label>
              <button
                type="button"
                onClick={handlePaste}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-primary hover:underline cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">content_paste</span>
                <span>Paste from Clipboard</span>
              </button>
            </div>

            <textarea
              value={syllabusText}
              onChange={(e) => {
                setSyllabusText(e.target.value);
                setErrorMessage(null);
              }}
              placeholder="Paste your course outline, lecture list, weekly syllabus topics, and exam dates here...&#10;&#10;Example:&#10;Course: Distributed Systems & Engineering&#10;Week 1: Raft Consensus & Leader Election (20% weight)&#10;Week 2: Virtual Memory & Multi-Level Paging&#10;Week 3: TCP Congestion Control & Socket Multiplexing&#10;Midterm: October 24&#10;Final Exam: December 10"
              rows={12}
              className="w-full rounded-xl bg-surface-container-low border border-outline-variant focus:border-primary p-3.5 text-xs font-mono text-on-surface placeholder:text-outline leading-relaxed resize-none focus:outline-none transition-colors"
            />

            <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant px-1">
              <span>{syllabusText.length.toLocaleString()} characters</span>
              <span className="text-outline">
                {syllabusText.length >= 10 ? 'Ready for AI analysis ✓' : 'Minimum 10 characters'}
              </span>
            </div>
          </div>
        </div>

        {/* Selected File Card */}
        {selectedFile && (
          <div className="rounded-xl bg-surface-container-high border border-primary/40 p-3.5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">description</span>
              </div>
              <div>
                <span className="text-xs font-headline text-on-surface font-semibold block">{selectedFile}</span>
                <span className="font-mono text-[10px] text-tertiary">
                  {fileDetails?.size || 'Attached'} • Loaded into analysis buffer
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedFile(null);
                setFileDetails(null);
              }}
              className="p-1 rounded-lg hover:bg-surface-container-highest text-outline hover:text-rose-400 transition cursor-pointer"
              title="Remove file"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}
      </main>

      {/* Sticky Bottom Bar */}
      <footer className="sticky bottom-0 z-30 w-full bg-surface-container-low/95 backdrop-blur-xl border-t border-outline-variant py-3 px-6 shadow-2xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors text-xs font-label font-medium cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">arrow_back</span>
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="font-mono text-xs text-on-surface font-semibold">Step 1 of 4: Course Ingestion</span>
              <span className="font-mono text-[11px] text-outline">Next: Target Dates & Weights</span>
            </div>
            <button
              onClick={handleContinue}
              disabled={!canContinue || isParsing}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary text-xs font-label font-bold transition-all shadow-lg shadow-primary/25 cursor-pointer ${
                !canContinue || isParsing ? 'opacity-40 cursor-not-allowed' : 'hover:brightness-110 active:scale-[0.98]'
              }`}
            >
              {isParsing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Extracting Course Units with AI...</span>
                </>
              ) : (
                <>
                  <span>Analyze & Continue</span>
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
