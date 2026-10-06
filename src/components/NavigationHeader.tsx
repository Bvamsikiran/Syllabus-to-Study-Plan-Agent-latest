import React from 'react';
import { ScreenId } from '../types';
import { GoogleAuthButton } from './GoogleAuthButton';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { HardDrive, Mail, Presentation, FileQuestion, Cloud } from 'lucide-react';

interface NavigationHeaderProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({ currentScreen, onNavigate }) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const { setDriveModalOpen, setSlidesModalOpen, setFormsModalOpen, setGmailModalOpen, user } = useGoogleAuth();

  const screens: { id: ScreenId; label: string; tag: string }[] = [
    { id: 'landing', label: 'Landing Page', tag: 'Overview' },
    { id: 'master-schedule', label: 'Master Schedule', tag: 'Command Center' },
    { id: 'step1-upload', label: 'Step 1: Upload', tag: 'Ingestion' },
    { id: 'step2-exam', label: 'Step 2: Exam & Goals', tag: 'Milestones' },
    { id: 'step3-bandwidth', label: 'Step 3: Bandwidth', tag: 'Availability' },
    { id: 'step4-resources', label: 'Step 4: Resources', tag: 'Synthesis' },
    { id: 'dashboard', label: 'Study Dashboard', tag: 'Foundations 2025' },
    { id: 'voice-quiz', label: 'Voice Recall Quiz', tag: 'Active Recall' },
    { id: 'handwritten-analysis', label: 'Answer Analysis', tag: 'AI Grading' },
  ];

  if (collapsed) {
    return (
      <div className="fixed top-2 right-2 z-50 flex items-center gap-2">
        <GoogleAuthButton />
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-highest/95 border border-primary/40 text-primary text-xs font-mono shadow-2xl backdrop-blur-md hover:bg-surface-container hover:border-primary transition-all"
        >
          <span className="material-symbols-outlined text-sm">view_carousel</span>
          <span>Screens ({screens.find((s) => s.id === currentScreen)?.label})</span>
          <span className="material-symbols-outlined text-xs">unfold_more</span>
        </button>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-50 w-full bg-[#0c0c0f]/95 border-b border-[#27272a] backdrop-blur-md px-3 py-1.5 shadow-md flex items-center justify-between text-xs font-mono">
      <div className="flex items-center gap-2 overflow-x-auto py-0.5 no-scrollbar">
        <span className="text-secondary text-[11px] font-semibold flex items-center gap-1 shrink-0 pl-1">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          SCREENS:
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {screens.map((screen) => {
            const isActive = currentScreen === screen.id;
            return (
              <button
                key={screen.id}
                onClick={() => onNavigate(screen.id)}
                className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-primary text-on-primary font-bold shadow-[0_0_12px_rgba(167,139,250,0.35)]'
                    : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest border border-outline-variant'
                }`}
              >
                <span>{screen.label}</span>
                <span
                  className={`text-[9px] px-1 rounded uppercase ${
                    isActive ? 'bg-primary-container text-white' : 'text-secondary'
                  }`}
                >
                  {screen.tag}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-2 pl-3 shrink-0">
        {/* Quick Google Workspace Action Icons */}
        <button
          onClick={() => setDriveModalOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all font-sans text-xs font-medium cursor-pointer"
          title="Google Drive Storage & Export"
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Drive</span>
        </button>

        <button
          onClick={() => setSlidesModalOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all font-sans text-xs font-medium cursor-pointer"
          title="Google Slides Decks & Flashcards"
        >
          <Presentation className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Slides</span>
        </button>

        <button
          onClick={() => setFormsModalOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 transition-all font-sans text-xs font-medium cursor-pointer"
          title="Google Forms Diagnostic Quizzes"
        >
          <FileQuestion className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Forms</span>
        </button>

        <button
          onClick={() => setGmailModalOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 transition-all font-sans text-xs font-medium cursor-pointer"
          title="Gmail Study Digest & Sync"
        >
          <Mail className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Gmail</span>
        </button>

        {/* Google Sign In / Profile Button */}
        <GoogleAuthButton />

        <button
          onClick={() => setCollapsed(true)}
          className="text-secondary hover:text-on-surface p-1 rounded hover:bg-surface-container transition-colors cursor-pointer"
          title="Minimize screen switcher bar"
        >
          <span className="material-symbols-outlined text-base">expand_less</span>
        </button>
      </div>
    </div>
  );
};

