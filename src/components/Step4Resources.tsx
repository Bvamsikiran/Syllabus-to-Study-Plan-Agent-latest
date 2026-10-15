import React, { useState } from 'react';
import { ScreenId, ResourceItem, SyllabusModule } from '../types';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { HardDrive, Presentation, FileQuestion, Sparkles, Plus, Check, Trash2, BookOpen, AlertCircle } from 'lucide-react';
import { saveStudyPlanToFirestore } from '../services/firestoreService';
import { apiKeyService } from '../services/apiKeyService';

interface Step4ResourcesProps {
  onNavigate: (screen: ScreenId) => void;
  resources: ResourceItem[];
  setResources: React.Dispatch<React.SetStateAction<ResourceItem[]>>;
  modules?: SyllabusModule[];
  courseName?: string;
}

export const Step4Resources: React.FC<Step4ResourcesProps> = ({
  onNavigate,
  resources,
  setResources,
  modules = [],
  courseName = 'Study Plan',
}) => {
  const { setDriveModalOpen, setSlidesModalOpen, setFormsModalOpen, user } = useGoogleAuth();
  const [activeCategory, setActiveCategory] = useState<string>('Textbook / Book');
  const [resourceInput, setResourceInput] = useState('');
  const [resourceRole, setResourceRole] = useState<ResourceItem['role']>('Primary Core');
  const [aiSuggestions, setAiSuggestions] = useState<ResourceItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const categories = [
    { label: 'Textbook / Book', icon: 'auto_stories' },
    { label: 'Question Bank', icon: 'quiz' },
    { label: 'Video Course / Lecture', icon: 'smart_display' },
    { label: 'Notes / Anki Deck', icon: 'style' },
    { label: 'Practice Exam / Paper', icon: 'fact_check' },
  ];

  const handleGenerateAiSuggestions = async () => {
    if (!modules || modules.length === 0) {
      setErrorMessage('Please upload a syllabus in Step 1 first so AI can suggest relevant materials.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setFeedback(null);

    try {
      const res = await fetch('/api/generate-resources', {
        method: 'POST',
        headers: apiKeyService.getAiHeaders(),
        body: JSON.stringify({
          courseName,
          units: modules,
        }),
      });

      const data = await res.json();
      if (res.ok && data.resources && Array.isArray(data.resources)) {
        setAiSuggestions(data.resources);
        setFeedback(`Generated ${data.resources.length} tailored recommendations for your curriculum.`);
      } else {
        setErrorMessage(data.message || data.error || 'Failed to generate recommendations. Please verify your Gemini API key.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error while requesting recommendations.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddCustomResource = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!resourceInput.trim()) return;

    const newItem: ResourceItem = {
      id: `res-${Date.now()}`,
      title: resourceInput.trim(),
      type: activeCategory as any,
      meta: `${activeCategory} • Custom Upload`,
      mappedInfo: 'Mapped: Custom Study Material',
      role: resourceRole,
      assignedWeeks: 'Added to study schedule',
    };

    setResources([newItem, ...resources]);
    setResourceInput('');
    setFeedback(`Added "${newItem.title}"`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const acceptAiSuggestion = (suggestion: ResourceItem) => {
    if (resources.some((r) => r.id === suggestion.id || r.title === suggestion.title)) {
      return;
    }
    setResources((prev) => [suggestion, ...prev]);
    setFeedback(`Accepted "${suggestion.title}"`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const removeResource = (id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="bg-background text-on-surface font-body antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-white">
      {/* Top Header */}
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
              Resource Hub
            </span>
            <span className="text-outline">•</span>
            <span className="font-mono text-[11px] text-on-surface-variant">Step 4 of 4</span>
          </div>

          <button
            onClick={() => onNavigate('dashboard')}
            className="text-xs text-on-surface-variant hover:text-on-surface transition font-mono flex items-center gap-1"
          >
            <span>Skip to Dashboard</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-24 flex-1 space-y-6">
        <div>
          <span className="font-mono text-xs text-primary font-bold uppercase tracking-wider block">
            Phase 4: Course Materials
          </span>
          <h1 className="text-2xl md:text-3xl font-headline font-extrabold text-on-surface tracking-tight mt-1">
            Attach Learning Resources
          </h1>
          <p className="text-xs sm:text-sm text-secondary mt-1">
            Add your textbooks, question banks, Anki decks, and videos. Synapse maps each genuine resource to your syllabus topics.
          </p>
        </div>

        {feedback && (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
            <span>{feedback}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{errorMessage}</span>
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
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
              <form onSubmit={handleAddCustomResource} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    value={resourceInput}
                    onChange={(e) => setResourceInput(e.target.value)}
                    placeholder="Enter resource title or book name..."
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
                  className="w-full sm:w-auto px-5 py-2.5 bg-primary hover:bg-primary/90 text-on-primary font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-primary/20 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Resource to Study Plan</span>
                </button>
              </form>

              {/* Google Workspace Integrations */}
              <div className="mt-4 pt-3 border-t border-outline-variant/60 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-mono text-zinc-400">Link from Google Workspace:</span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDriveModalOpen(true)}
                    className="px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                    <span>Drive</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlidesModalOpen(true)}
                    className="px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Presentation className="w-3.5 h-3.5" />
                    <span>Slides</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormsModalOpen(true)}
                    className="px-2.5 py-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileQuestion className="w-3.5 h-3.5" />
                    <span>Forms</span>
                  </button>
                </div>
              </div>
            </div>

            {/* AI RECOMMENDATIONS CARD */}
            <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-mono font-semibold uppercase text-zinc-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Tailored AI Resource Recommendations
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Generate suggestions matched strictly to your syllabus modules
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateAiSuggestions}
                  disabled={isGenerating}
                  className="px-3.5 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:brightness-110 flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isGenerating ? 'Analyzing Syllabus...' : 'Recommend with AI'}</span>
                </button>
              </div>

              {aiSuggestions.length > 0 ? (
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider">
                    Click to add to your plan:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {aiSuggestions.map((item) => {
                      const alreadyAdded = resources.some((r) => r.title === item.title);
                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all ${
                            alreadyAdded
                              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                              : 'bg-surface-container-low border-outline-variant hover:border-cyan-400/40'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-semibold block text-zinc-100">{item.title}</span>
                            <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">{item.meta}</span>
                            <span className="text-[10px] text-zinc-500 font-mono block">{item.type}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => acceptAiSuggestion(item)}
                            disabled={alreadyAdded}
                            className={`w-full py-1 rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition cursor-pointer ${
                              alreadyAdded
                                ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                                : 'bg-primary/20 hover:bg-primary/30 text-primary'
                            }`}
                          >
                            {alreadyAdded ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Accepted</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>Add to Study Plan</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-zinc-500 text-xs border border-dashed border-outline-variant rounded-lg">
                  {modules.length > 0
                    ? 'Click "Recommend with AI" to generate tailored textbooks and problem sets for your syllabus.'
                    : 'Upload a syllabus in Step 1 to enable automated AI resource recommendations.'}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Configured Resources Inventory */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-surface-container border border-outline-variant rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
                <span className="text-xs font-mono font-semibold uppercase text-zinc-300 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  Your Active Resources ({resources.length})
                </span>
                <span className="text-xs text-cyan-400 font-mono">
                  {resources.length > 0 ? 'Saved to Plan' : 'Empty'}
                </span>
              </div>

              {resources.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs border border-dashed border-outline-variant rounded-lg space-y-1">
                  <p>No study resources attached yet.</p>
                  <p className="text-[11px] text-zinc-600 font-mono">
                    Add custom materials or accept AI recommendations.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {resources.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-outline-variant bg-surface-container-low hover:border-outline transition-all flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-zinc-200">{item.title}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-surface-container-highest text-zinc-400 border border-outline-variant">
                            {item.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono mt-0.5">{item.meta}</div>
                        {item.assignedWeeks && (
                          <div className="text-[10px] text-cyan-400 font-mono mt-0.5">{item.assignedWeeks}</div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeResource(item.id)}
                        className="text-zinc-500 hover:text-rose-400 p-1 rounded hover:bg-surface-container-high transition-colors shrink-0 cursor-pointer"
                        title="Remove resource"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Bar */}
      <footer className="sticky bottom-0 z-30 w-full bg-surface-container-low/95 backdrop-blur-xl border-t border-outline-variant py-3 px-6 shadow-2xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={() => onNavigate('step3-bandwidth')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors text-xs font-label font-medium cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">arrow_back</span>
            <span>Back to Bandwidth</span>
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary text-xs font-label font-bold transition-all shadow-lg shadow-primary/25 cursor-pointer hover:brightness-110 active:scale-[0.98]"
          >
            <span>Launch Synapse Dashboard</span>
            <span className="material-symbols-outlined text-[17px]">rocket_launch</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
