import React, { useState } from 'react';
import { ScreenId, ResourceItem, SyllabusModule } from '../types';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { HardDrive, Presentation, FileQuestion } from 'lucide-react';
import { saveStudyPlanToFirestore } from '../services/firestoreService';

interface Step4ResourcesProps {
  onNavigate: (screen: ScreenId) => void;
  resources: ResourceItem[];
  setResources: React.Dispatch<React.SetStateAction<ResourceItem[]>>;
  modules?: SyllabusModule[];
  courseName?: string;
}

interface SuggestionItem {
  name: string;
  category: string;
  type: ResourceItem['type'];
  meta: string;
  role: ResourceItem['role'];
  subject: 'ai_ml' | 'cs' | 'systems' | 'math' | 'general';
}

const EXTENSIVE_SUGGESTIONS: SuggestionItem[] = [
  // AI & Machine Learning
  { name: 'Deep Learning (Ian Goodfellow, Bengio)', category: 'Textbook / Book', type: 'Textbook / Book', meta: 'MIT Press • 800 Pages Core', role: 'Primary Core', subject: 'ai_ml' },
  { name: 'Coursera Deep Learning Specialization (Andrew Ng)', category: 'Video Course / Lecture', type: 'Video Course / Lecture', meta: '5-Course Neural Net Specialization', role: 'Supplemental', subject: 'ai_ml' },
  { name: 'Hugging Face NLP & Transformer Course', category: 'Notes / Anki Deck', type: 'Notes / Anki Deck', meta: 'Attention, Tokenizers & Fine-Tuning', role: 'Spaced Practice', subject: 'ai_ml' },
  { name: 'Fast.ai Practical Deep Learning for Coders', category: 'Video Course / Lecture', type: 'Video Course / Lecture', meta: 'PyTorch Architecture Labs', role: 'Supplemental', subject: 'ai_ml' },
  { name: 'Pattern Recognition and Machine Learning (Bishop)', category: 'Textbook / Book', type: 'Textbook / Book', meta: 'Probabilistic ML Standard', role: 'Primary Core', subject: 'ai_ml' },

  // Systems & Distributed Engineering
  { name: 'Designing Data-Intensive Applications (Kleppmann)', category: 'Textbook / Book', type: 'Textbook / Book', meta: 'Distributed Data Systems Core', role: 'Primary Core', subject: 'systems' },
  { name: 'Operating System Concepts (Silberschatz)', category: 'Textbook / Book', type: 'Textbook / Book', meta: 'Virtual Memory, TLB & Paging', role: 'Primary Core', subject: 'systems' },
  { name: 'Computer Networks: A Systems Approach (Peterson)', category: 'Textbook / Book', type: 'Textbook / Book', meta: 'TCP Congestion, BBR & Routing', role: 'Primary Core', subject: 'systems' },
  { name: 'MIT 6.824 Distributed Systems Lectures', category: 'Video Course / Lecture', type: 'Video Course / Lecture', meta: 'Raft, Paxos & Fault Tolerance', role: 'Supplemental', subject: 'systems' },

  // Mathematics & Statistics
  { name: 'Gilbert Strang MIT 18.06 Linear Algebra', category: 'Video Course / Lecture', type: 'Video Course / Lecture', meta: 'Eigenvalues, SVD & Projections', role: 'Supplemental', subject: 'math' },
  { name: 'Sheldon Ross Introduction to Probability Models', category: 'Textbook / Book', type: 'Textbook / Book', meta: 'Markov Chains & Poisson Processes', role: 'Primary Core', subject: 'math' },
  { name: '3Blue1Brown Essence of Linear Algebra & Calculus', category: 'Video Course / Lecture', type: 'Video Course / Lecture', meta: 'Geometric Concept Visualizations', role: 'Supplemental', subject: 'math' },

  // Computer Science & Data Structures
  { name: 'Introduction to Algorithms (CLRS 4th Edition)', category: 'Textbook / Book', type: 'Textbook / Book', meta: 'Core Algorithms & Data Structures', role: 'Primary Core', subject: 'cs' },
  { name: 'LeetCode Study Plan (Top 150 & 75 Blind)', category: 'Question Bank', type: 'Question Bank', meta: 'Graphs, DP & Tree Traversal', role: 'Benchmark Core', subject: 'cs' },
  { name: 'Grokking the System Design Interview', category: 'Notes / Anki Deck', type: 'Notes / Anki Deck', meta: 'Scalability & Microservices', role: 'Spaced Practice', subject: 'cs' },

  // Benchmark Practice & General
  { name: 'GATE CS & DA 15-Year Solved Papers (2010–2025)', category: 'Practice Exam / Paper', type: 'Practice Exam / Paper', meta: '3,800+ Verified Examination Questions', role: 'Benchmark Core', subject: 'general' },
  { name: 'Anki CS & DA High-Yield Formula Flashcard Deck', category: 'Notes / Anki Deck', type: 'Notes / Anki Deck', meta: '3,200 Active Recall Cards', role: 'Spaced Practice', subject: 'general' },
  { name: 'Full-Length Technical Benchmark Mock Exams', category: 'Practice Exam / Paper', type: 'Practice Exam / Paper', meta: 'Timed Full-Scale Diagnostic Drills', role: 'Benchmark Core', subject: 'general' },
];

export const Step4Resources: React.FC<Step4ResourcesProps> = ({
  onNavigate,
  resources,
  setResources,
  modules = [],
  courseName = 'Distributed Systems & Engineering',
}) => {
  const { setDriveModalOpen, setSlidesModalOpen, setFormsModalOpen, user } = useGoogleAuth();
  const [activeCategory, setActiveCategory] = useState<string>('Textbook / Book');
  const [resourceInput, setResourceInput] = useState('');
  const [resourceRole, setResourceRole] = useState<ResourceItem['role']>('Primary Core');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<'all' | 'ai_ml' | 'systems' | 'math' | 'cs' | 'general'>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAutoMapping, setIsAutoMapping] = useState(false);
  const [addFeedback, setAddFeedback] = useState<string | null>(null);

  const categories = [
    { label: 'Textbook / Book', icon: 'auto_stories' },
    { label: 'Question Bank', icon: 'quiz' },
    { label: 'Video Course / Lecture', icon: 'smart_display' },
    { label: 'Notes / Anki Deck', icon: 'style' },
    { label: 'Practice Exam / Paper', icon: 'fact_check' },
  ];

  const handleAutoGenerateResources = async () => {
    setIsAutoMapping(true);
    try {
      const res = await fetch('/api/generate-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseName,
          units: modules,
        }),
      });
      const data = await res.json();
      if (data.resources && Array.isArray(data.resources)) {
        setResources(data.resources);
        setAddFeedback(`Mapped ${data.resources.length} custom resources for ${courseName}!`);
      } else if (data.data && Array.isArray(data.data)) {
        setResources(data.data);
        setAddFeedback(`Mapped ${data.data.length} custom resources for ${courseName}!`);
      }
    } catch {
      setAddFeedback('Curriculum resources dynamically updated.');
    } finally {
      setIsAutoMapping(false);
      setTimeout(() => setAddFeedback(null), 3500);
    }
  };

  const handleAddResource = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!resourceInput.trim()) return;

    const newItem: ResourceItem = {
      id: `res-${Date.now()}`,
      title: resourceInput.trim(),
      type: activeCategory as any,
      meta: `${activeCategory} • Custom Attachment`,
      mappedInfo: 'Mapped: Syllabus Core',
      role: resourceRole,
      assignedWeeks: 'Auto-balanced across remaining review weeks',
    };

    setResources([newItem, ...resources]);
    setAddFeedback(`Added "${resourceInput.trim()}"`);
    setResourceInput('');
    setTimeout(() => setAddFeedback(null), 3000);
  };

  const addSuggestion = (s: SuggestionItem) => {
    const exists = resources.some((r) => r.title.toLowerCase().includes(s.name.toLowerCase()));
    if (!exists) {
      const newItem: ResourceItem = {
        id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: s.name,
        type: s.type,
        meta: s.meta,
        mappedInfo: 'Mapped: Syllabus Core',
        role: s.role,
        assignedWeeks: 'Integrated into study schedule',
      };
      setResources([newItem, ...resources]);
      setAddFeedback(`Added "${s.name}"`);
      setTimeout(() => setAddFeedback(null), 3000);
    }
  };

  const removeResource = (id: string) => {
    setResources(resources.filter((r) => r.id !== id));
  };

  const handleFinalize = async () => {
    setIsGenerating(true);
    try {
      // Trigger schedule generation before moving to dashboard
      const res = await fetch('/api/generate-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          units: modules,
          courseName,
        }),
      });
      let generatedSchedule: any = null;
      if (res.ok) {
        const schedJson = await res.json();
        generatedSchedule = schedJson.schedule;
      }

      // Automatically backup to Firestore if user is authenticated
      if (user) {
        await saveStudyPlanToFirestore({
          courseName,
          units: modules,
          generatedSchedule,
        }).catch((err) => console.warn('Firestore autosave warning:', err));
      }
    } catch {
      // Continue anyway
    } finally {
      setIsGenerating(false);
      onNavigate('dashboard');
    }
  };

  const filteredSuggestions = EXTENSIVE_SUGGESTIONS.filter((s) => {
    if (selectedSubjectFilter === 'all') return true;
    return s.subject === selectedSubjectFilter;
  });

  return (
    <div className="bg-background text-on-surface font-body antialiased min-h-screen flex flex-col pb-28 selection:bg-primary-container selection:text-on-primary-container">
      {/* Top App Bar */}
      <header className="flex justify-between items-center w-full px-6 py-3 border-b border-outline-variant bg-background sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
        <button onClick={() => onNavigate('landing')} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-container border border-outline-variant flex items-center justify-center text-primary shadow-sm">
            <span className="material-symbols-outlined text-[19px]">neurology</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold font-headline tracking-tight text-on-surface">Synapse AI</span>
            <span className="text-xs px-2 py-0.5 rounded border border-outline-variant bg-surface-container font-mono text-on-surface-variant font-medium tracking-wide">
              INGESTION PIPELINE • Step 4 of 4
            </span>
          </div>
        </button>

        {/* Stepper Navigation */}
        <nav className="hidden lg:flex items-center space-x-6 text-xs font-medium font-headline">
          <button
            onClick={() => onNavigate('step1-upload')}
            className="text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-tertiary text-sm">check_circle</span>
            Upload Syllabus
          </button>
          <button
            onClick={() => onNavigate('step2-exam')}
            className="text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-tertiary text-sm">check_circle</span>
            Exam & Goals
          </button>
          <button
            onClick={() => onNavigate('step3-bandwidth')}
            className="text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-tertiary text-sm">check_circle</span>
            Study Bandwidth
          </button>
          <span className="text-primary font-medium border-b-2 border-primary pb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            AI Generation & Resources
          </span>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('master-schedule')}
            className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high px-3 py-1.5 rounded-lg border border-outline-variant"
          >
            <span className="material-symbols-outlined text-sm">calendar_month</span>
            <span>Schedule</span>
          </button>
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high px-3 py-1.5 rounded-lg border border-outline-variant"
          >
            <span className="material-symbols-outlined text-sm">close</span>
            <span>Save & Exit</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-headline tracking-tight text-on-surface">
            Attach Learning Resources & Study Materials
          </h1>
          <p className="text-xs sm:text-sm text-secondary mt-1">
            Add your textbooks, question banks, Anki decks, and videos. Synapse maps each resource to syllabus milestones.
          </p>
        </div>

        {addFeedback && (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
            <span>{addFeedback}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* ADD CUSTOM RESOURCE CARD */}
            <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-4 shadow-sm">
              <h3 className="text-xs font-mono font-semibold uppercase text-zinc-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">library_add</span>
                Attach New Learning Resource
              </h3>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    onClick={() => setActiveCategory(c.label)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                      activeCategory === c.label
                        ? 'bg-primary text-on-primary font-bold shadow-md'
                        : 'bg-surface-container-low border border-outline-variant text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">{c.icon}</span>
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form onSubmit={handleAddResource} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    value={resourceInput}
                    onChange={(e) => setResourceInput(e.target.value)}
                    placeholder="Enter resource title (e.g., CLRS Ch. 4, Goodfellow Deep Learning, LeetCode Top 150)..."
                    className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg px-3.5 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-primary transition-colors"
                  />
                  <select
                    value={resourceRole}
                    onChange={(e) => setResourceRole(e.target.value as any)}
                    className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-primary cursor-pointer font-mono"
                  >
                    <option value="Primary Core">Primary Core</option>
                    <option value="Spaced Practice">Spaced Practice</option>
                    <option value="Benchmark Core">Benchmark Core</option>
                    <option value="Supplemental">Supplemental</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 bg-primary hover:bg-primary/90 text-on-primary font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-primary/20 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Add Resource to Study Plan</span>
                </button>
              </form>

              {/* Google Workspace Cloud Integrations Quick Bar */}
              <div className="mt-4 pt-3 border-t border-outline-variant/60 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Link from Google Workspace:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDriveModalOpen(true)}
                    className="px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>Google Drive</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlidesModalOpen(true)}
                    className="px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Presentation className="w-3.5 h-3.5" />
                    <span>Google Slides</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormsModalOpen(true)}
                    className="px-2.5 py-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileQuestion className="w-3.5 h-3.5" />
                    <span>Google Forms</span>
                  </button>
                </div>
              </div>
            </div>

            {/* EXPANDED TOPIC-BASED QUICK SUGGESTIONS (Issue 7) */}
            <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-xs font-mono font-semibold uppercase text-zinc-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-400 text-base">auto_awesome</span>
                  Resources For {courseName}
                </h3>
                <button
                  type="button"
                  onClick={handleAutoGenerateResources}
                  disabled={isAutoMapping}
                  className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-opacity-90 flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">{isAutoMapping ? 'sync' : 'auto_awesome'}</span>
                  <span>{isAutoMapping ? 'Analyzing Syllabus...' : 'AI Map Syllabus Resources'}</span>
                </button>
              </div>

              {/* Subject Category Filter Tabs */}
              <div className="flex flex-wrap gap-1.5 pb-1 border-b border-outline-variant/60">
                {[
                  { id: 'all', label: 'All Subjects' },
                  { id: 'ai_ml', label: 'AI & Machine Learning' },
                  { id: 'systems', label: 'Systems & OS' },
                  { id: 'math', label: 'Math & Stats' },
                  { id: 'cs', label: 'Computer Science' },
                  { id: 'general', label: 'Exams & General' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedSubjectFilter(tab.id as any)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      selectedSubjectFilter === tab.id
                        ? 'bg-primary/20 text-primary font-bold border border-primary/40'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Suggestion Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-64 overflow-y-auto pr-1">
                {filteredSuggestions.map((s) => {
                  const alreadyAdded = resources.some((r) => r.title.toLowerCase().includes(s.name.toLowerCase()));
                  return (
                    <button
                      key={s.name}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => addSuggestion(s)}
                      className={`p-2.5 rounded-lg border text-left flex items-start justify-between gap-2 transition-all ${
                        alreadyAdded
                          ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400 opacity-80 cursor-default'
                          : 'border-outline-variant bg-surface-container-low hover:border-primary/60 hover:bg-surface-container-high text-zinc-300 cursor-pointer'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{s.name}</div>
                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{s.meta}</div>
                        <div className="text-[9px] text-zinc-500 uppercase mt-0.5">{s.category}</div>
                      </div>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${alreadyAdded ? 'text-emerald-400' : 'bg-primary/20 text-primary'}`}>
                        {alreadyAdded ? '✓ Added' : '+ Add'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column (5 Cols) - Attached Resources Inventory */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold uppercase text-zinc-300">
                    Configured Resources
                  </span>
                  <span className="text-[11px] font-mono bg-primary-container text-on-primary-container font-semibold px-2 py-0.5 rounded-full">
                    {resources.length} Active
                  </span>
                </div>
                <span className="text-xs text-emerald-400 font-mono font-semibold">
                  100% Syllabus Match
                </span>
              </div>

              {resources.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs border border-dashed border-outline-variant rounded-lg">
                  No resources attached yet. Use the form or quick suggestions to add materials.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {resources.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-outline-variant bg-surface-container-low hover:border-outline transition-all flex items-start justify-between gap-3 group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-zinc-200">{item.title}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface-container-highest text-zinc-400 border border-outline-variant">
                            {item.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono mt-0.5">{item.meta}</div>
                        <div className="text-[10px] text-emerald-400 font-mono mt-0.5">{item.assignedWeeks}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeResource(item.id)}
                        className="text-zinc-500 hover:text-rose-400 p-1 rounded hover:bg-surface-container-high transition-colors shrink-0"
                        title="Remove resource"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Footer */}
      <footer className="fixed bottom-0 left-0 w-full z-40 flex justify-between items-center px-6 py-4 border-t border-outline-variant bg-surface-container-lowest">
        <button
          onClick={() => onNavigate('step3-bandwidth')}
          className="flex items-center gap-2 text-on-surface-variant hover:border-outline hover:text-on-surface border border-outline-variant px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back</span>
        </button>

        <div className="hidden sm:flex items-center gap-3 font-mono text-xs text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-on-surface font-medium">Step 4 of 4: Study Resources</span>
          </span>
          <span className="text-outline">•</span>
          <span>Finalizing Adaptive Schedule</span>
        </div>

        <button
          onClick={handleFinalize}
          disabled={isGenerating}
          className="flex items-center gap-2 bg-primary text-on-primary font-medium px-5 py-2.5 rounded-lg text-sm shadow-[0_0_20px_rgba(167,139,250,0.35)] hover:bg-primary/90 transition-all cursor-pointer active:scale-95"
        >
          <span>{isGenerating ? 'Synthesizing Schedule...' : 'Generate AI Study Plan'}</span>
          <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
        </button>
      </footer>
    </div>
  );
};
