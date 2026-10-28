import React, { useState, useEffect } from 'react';
import { Key, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { apiKeyService } from '../services/apiKeyService';

interface SetupBannerProps {
  onOpenApiKeyModal: () => void;
}

export const SetupBanner: React.FC<SetupBannerProps> = ({ onOpenApiKeyModal }) => {
  const [hasKey, setHasKey] = useState<boolean>(() => apiKeyService.hasKey());
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('synapse_dismiss_setup_banner') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Check if server already has a configured key
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.serverKey) {
          setHasKey(true);
        }
      })
      .catch(() => {
        // Ignore health check failures
      });

    const unsub = apiKeyService.subscribe((key) => {
      setHasKey(Boolean(key));
    });
    return unsub;
  }, []);

  if (hasKey || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('synapse_dismiss_setup_banner', 'true');
    } catch {
      // Ignore sessionStorage errors
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-950/80 via-indigo-950/80 to-purple-950/80 border-b border-amber-500/30 px-4 py-2 text-xs md:text-sm text-amber-200/90 flex items-center justify-between shadow-lg backdrop-blur-md transition-all">
      <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
        <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
        <span>
          <strong className="text-amber-300 font-semibold">Quick Setup:</strong> Add your Google Gemini API Key to enable instant syllabus parsing &amp; the Live Voice Coach.
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-3">
        <button
          onClick={onOpenApiKeyModal}
          className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 hover:text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
        >
          <Key className="w-3.5 h-3.5 text-amber-400" />
          <span>Add Key</span>
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer rounded hover:bg-white/5"
          aria-label="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

