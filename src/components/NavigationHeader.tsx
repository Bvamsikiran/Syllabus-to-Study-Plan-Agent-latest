import React from 'react';
import { ScreenId } from '../types';
import { GoogleAuthButton } from './GoogleAuthButton';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { HardDrive, Mail, Presentation, FileQuestion, Sparkles, Brain, Key } from 'lucide-react';
import { apiKeyService } from '../services/apiKeyService';

interface NavigationHeaderProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onOpenApiKeyModal?: () => void;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  currentScreen,
  onNavigate,
  onOpenApiKeyModal,
}) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const [hasKey, setHasKey] = React.useState(apiKeyService.hasKey());

  React.useEffect(() => {
    return apiKeyService.subscribe((key) => {
      setHasKey(Boolean(key));
    });
  }, []);
  const { setDriveModalOpen, setSlidesModalOpen, setFormsModalOpen, setGmailModalOpen } = useGoogleAuth();

  const screens: { id: ScreenId; label: string; tag: string }[] = [
    { id: 'dashboard', label: 'Study Hub (Mockup)', tag: 'Command Center' },
    { id: 'ai-tutor', label: 'AI Tutor & Thinking', tag: 'Generative RAG' },
    { id: 'master-schedule', label: 'Master Schedule', tag: 'Calendar' },
    { id: 'step1-upload', label: 'Step 1: Upload', tag: 'Ingestion' },
    { id: 'step2-exam', label: 'Step 2: Goals', tag: 'Milestones' },
    { id: 'step3-bandwidth', label: 'Step 3: Bandwidth', tag: 'Availability' },
    { id: 'step4-resources', label: 'Step 4: Resources', tag: 'Synthesis' },
    { id: 'voice-coach', label: 'Voice Study Coach', tag: 'Live S2S' },
    { id: 'landing', label: 'Landing Page', tag: 'Overview' },
  ];

  if (collapsed) {
    return (
      <div className="fixed top-2 right-2 z-50 flex items-center gap-2">
        <button
          onClick={onOpenApiKeyModal}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-mono backdrop-blur-md shadow-2xl cursor-pointer ${
            hasKey
              ? 'bg-[#0b132b]/95 border-cyan-400/40 text-cyan-300 hover:bg-[#131f42]'
              : 'bg-[#0b132b]/95 border-amber-400/40 text-amber-300 hover:bg-[#131f42]'
          }`}
          title="Gemini API Key"
        >
          <Key className="w-3.5 h-3.5" />
          <span>{hasKey ? 'Key ✓' : 'Set Key'}</span>
        </button>
        <GoogleAuthButton compact={true} />
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0b132b]/95 border border-cyan-400/40 text-cyan-300 text-xs font-mono shadow-2xl backdrop-blur-md hover:bg-[#131f42] transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">view_carousel</span>
          <span>Screens ({screens.find((s) => s.id === currentScreen)?.label || 'Hub'})</span>
          <span className="material-symbols-outlined text-xs">unfold_more</span>
        </button>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-50 w-full bg-[#070b19]/90 border-b border-sky-500/20 px-3 py-1.5 shadow-md flex items-center justify-between text-xs font-mono backdrop-blur-md">
      <div className="flex items-center gap-2 overflow-x-auto py-0.5 no-scrollbar">
        <span className="text-cyan-400 text-[11px] font-semibold flex items-center gap-1 shrink-0 pl-1">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
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
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-lg shadow-cyan-500/30'
                    : 'bg-[#0b132b] text-slate-400 hover:text-white hover:bg-[#131f42] border border-sky-500/15'
                }`}
              >
                <span>{screen.label}</span>
                <span
                  className={`text-[9px] px-1 rounded uppercase font-medium ${
                    isActive ? 'bg-black/30 text-cyan-200' : 'text-slate-500'
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
        <button
          onClick={() => setDriveModalOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all font-sans text-xs font-medium cursor-pointer"
          title="Google Drive Storage"
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Drive</span>
        </button>

        <button
          onClick={() => setSlidesModalOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all font-sans text-xs font-medium cursor-pointer"
          title="Google Slides Decks"
        >
          <Presentation className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Slides</span>
        </button>

        <button
          onClick={() => setFormsModalOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 transition-all font-sans text-xs font-medium cursor-pointer"
          title="Google Forms Quizzes"
        >
          <FileQuestion className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Forms</span>
        </button>

        <button
          onClick={() => setGmailModalOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all font-sans text-xs font-medium cursor-pointer"
          title="Gmail Sync"
        >
          <Mail className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Gmail</span>
        </button>

        <button
          onClick={onOpenApiKeyModal}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all font-sans text-xs font-medium cursor-pointer ${
            hasKey
              ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/25'
              : 'bg-amber-500/15 border-amber-400/40 text-amber-300 hover:bg-amber-500/25'
          }`}
          title="Configure Gemini API Key for Voice Coach & AI"
        >
          <Key className="w-3.5 h-3.5" />
          <span>{hasKey ? 'Gemini Key ✓' : 'Set Gemini Key'}</span>
        </button>

        <div className="border-l border-sky-500/20 pl-2">
          <GoogleAuthButton />
        </div>

        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Collapse Header"
        >
          <span className="material-symbols-outlined text-sm">unfold_less</span>
        </button>
      </div>
    </div>
  );
};
