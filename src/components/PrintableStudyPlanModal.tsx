import React from 'react';
import { SyllabusModule, ResourceItem } from '../types';
import { Printer, Download, X, CheckCircle2, Calendar, Target, Clock, BookOpen } from 'lucide-react';

interface PrintableStudyPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseName?: string;
  modules?: SyllabusModule[];
  resources?: ResourceItem[];
  targetDate?: string;
  targetScore?: number;
}

export const PrintableStudyPlanModal: React.FC<PrintableStudyPlanModalProps> = ({
  isOpen,
  onClose,
  courseName = 'Course Study Plan',
  modules = [],
  resources = [],
  targetDate = '2026-12-15',
  targetScore = 85,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalTopics = modules.reduce((acc, m) => acc + (m.topics?.length || 0), 0);
  const totalHours = modules.reduce((acc, m) => acc + (m.totalUnits * 2 || 6), 0);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-slate-900 border border-sky-500/30 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Action Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-sky-500/20 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Printable Study Plan & PDF Export</h3>
              <p className="text-xs text-slate-400">
                Offline study document — Save as PDF or print directly without signing into Google.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/20 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content View */}
        <div className="p-8 overflow-y-auto flex-1 bg-white text-slate-900 font-sans print:p-0 print:m-0" id="printable-study-plan">
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-blue-700 block mb-1">
                  Synapse AI • Academic Study Roadmap
                </span>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-950 tracking-tight">
                  {courseName}
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  Generated autonomously via Multimodal Syllabus Decomposition
                </p>
              </div>
              <div className="text-right font-mono text-xs text-slate-500">
                <div>Document Date: {new Date().toLocaleDateString()}</div>
                <div>Status: Active Plan</div>
              </div>
            </div>

            {/* Key Parameters Cards */}
            <div className="grid grid-cols-4 gap-3 mt-6">
              <div className="p-3 rounded-lg bg-slate-100 border border-slate-200">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Target Exam</span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">{targetDate}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-100 border border-slate-200">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Target Mastery</span>
                <span className="text-sm font-bold text-blue-700 mt-0.5 block">{targetScore}%</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-100 border border-slate-200">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Syllabus Modules</span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">{modules.length} Units</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-100 border border-slate-200">
                <span className="text-[10px] uppercase font-mono text-slate-500 block">Total Scope</span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">~{totalHours} Study Hours</span>
              </div>
            </div>
          </div>

          {/* Modules & Topics Breakdown */}
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide border-b border-slate-300 pb-2 mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Curriculum Modules & Conceptual Milestones</span>
              </h2>

              {modules.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">
                  No syllabus units currently loaded. Upload a syllabus in Step 1 to populate this plan.
                </p>
              ) : (
                <div className="space-y-4">
                  {modules.map((mod, idx) => (
                    <div key={mod.id || idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 break-inside-avoid">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <h3 className="font-bold text-sm text-slate-900">{mod.name}</h3>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500">
                          Est. {mod.totalUnits * 2 || 6} hrs • Priority: {mod.priority || 'medium'} • Weight: {mod.weight || 20}%
                        </span>
                      </div>

                      {mod.reference && (
                        <p className="text-xs text-slate-600 mb-2 pl-8 font-mono">{mod.reference}</p>
                      )}

                      {mod.topics && mod.topics.length > 0 && (
                        <div className="pl-8 mt-2">
                          <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                            Core Knowledge Checkpoints:
                          </div>
                          <ul className="grid grid-cols-2 gap-1.5 text-xs text-slate-600 list-disc list-inside">
                            {mod.topics.map((t, tIdx) => (
                              <li key={tIdx} className="leading-relaxed">{t}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recommended References */}
            {resources && resources.length > 0 && (
              <div className="pt-4 break-inside-avoid">
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide border-b border-slate-300 pb-2 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Curated Reference Resources & Texts</span>
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {resources.slice(0, 6).map((res, i) => (
                    <div key={res.id || i} className="p-3 rounded-lg border border-slate-200 bg-white">
                      <div className="text-xs font-bold text-slate-900">{res.title}</div>
                      <div className="text-[11px] text-blue-700 font-medium">{res.type} • {res.role || 'Core'}</div>
                      {res.meta && <div className="text-[11px] text-slate-500 mt-1">{res.meta}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Sign-off Block */}
            <div className="pt-8 mt-8 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500 font-mono">
              <div>Synapse AI Autonomous Academic Agent • Student Study Contract</div>
              <div>Generated for localhost offline execution</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

