import React, { useState, useEffect } from 'react';
import { Sparkles, Key, FileText, Mic, HardDrive, Check, ArrowRight, ArrowLeft, X, ExternalLink } from 'lucide-react';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenApiKeyModal: () => void;
  onNavigateToStep1: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  isOpen,
  onClose,
  onOpenApiKeyModal,
  onNavigateToStep1,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const steps = [
    {
      step: 1,
      badge: 'Step 1 of 3 • AI Credentials',
      title: 'Welcome to Synapse AI! 🚀',
      icon: <Key className="w-6 h-6 text-cyan-400" />,
      color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30',
      description:
        'Synapse AI autonomously breaks down complex course syllabi and powers real-time oral voice coaching. To activate AI analysis, add your free Gemini API key.',
      tips: [
        'Free API keys are available in 1 click at Google AI Studio (aistudio.google.com)',
        'Your key stays secure in your browser or server .env file',
        'Works with gemini-3.5-flash and gemini-3.8-live',
      ],
      primaryAction: {
        label: 'Add Gemini Key',
        onClick: () => {
          onOpenApiKeyModal();
        },
      },
    },
    {
      step: 2,
      badge: 'Step 2 of 3 • Syllabus Ingestion',
      title: 'Autonomous Syllabus Decomposition 📚',
      icon: <FileText className="w-6 h-6 text-purple-400" />,
      color: 'from-purple-500/20 to-indigo-500/10 border-purple-500/30',
      description:
        'Upload your syllabus file (.txt, .md, .pdf) or click "Try Sample Syllabus" on the upload screen for an instant 1-click test drive with zero preparation.',
      tips: [
        'Automatically extracts course units, exam dates, and grading weights',
        'Synthesizes an adaptive spaced-repetition study schedule',
        'Generates curated reference textbooks and video lectures',
      ],
      primaryAction: {
        label: 'Go to Step 1: Upload',
        onClick: () => {
          onNavigateToStep1();
          setCurrentStep(2);
        },
      },
    },
    {
      step: 3,
      badge: 'Step 3 of 3 • Coaching & Exports',
      title: 'Live Voice Coach & Offline PDF Exports 🎙️',
      icon: <Mic className="w-6 h-6 text-emerald-400" />,
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30',
      description:
        'Engage in full-duplex conversational concept drills with the Gemini Live Voice Coach. Connect Google Drive, Slides, or use the "PDF / Print" button to export formatted study contracts offline.',
      tips: [
        'Live S2S Audio Coach quizzes you verbally on your syllabus topics',
        'Google Workspace integration syncs with your Drive, Slides, and Gmail',
        'Offline PDF / Print export works instantly without any Google login required',
      ],
      primaryAction: {
        label: 'Start Exploring Synapse!',
        onClick: () => {
          localStorage.setItem('synapse_onboarding_completed', 'true');
          onClose();
        },
      },
    },
  ];

  const active = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      localStorage.setItem('synapse_onboarding_completed', 'true');
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('synapse_onboarding_completed', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`relative w-full max-w-lg rounded-2xl bg-[#090f22] border ${active.color} p-6 shadow-2xl overflow-hidden flex flex-col gap-5 text-white transition-all`}>
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold">
              {active.badge}
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition cursor-pointer"
            title="Skip Tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Content */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0e1738] border border-sky-500/30 flex items-center justify-center shrink-0 shadow-lg">
            {active.icon}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white tracking-tight">{active.title}</h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{active.description}</p>
          </div>
        </div>

        {/* Bullet Tips */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
          {active.tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
              <span className="leading-relaxed">{tip}</span>
            </div>
          ))}
        </div>

        {/* Progress Dots & Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                  currentStep === idx ? 'w-6 bg-cyan-400' : 'bg-slate-700 hover:bg-slate-500'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            {active.primaryAction && (
              <button
                onClick={active.primaryAction.onClick}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 transition cursor-pointer"
              >
                {active.primaryAction.label}
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-slate-900 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-md shadow-cyan-500/20 transition cursor-pointer flex items-center gap-1"
            >
              <span>{currentStep === steps.length - 1 ? 'Finish' : 'Next'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

