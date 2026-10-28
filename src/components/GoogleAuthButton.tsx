import React, { useState } from 'react';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import {
  LogOut,
  Mail,
  HardDrive,
  Presentation,
  CheckCircle2,
  ChevronDown,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';

export const GoogleAuthButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const {
    user,
    isSigningIn,
    signIn,
    signOut,
    setDriveModalOpen,
    setGmailModalOpen,
    setSlidesModalOpen,
  } = useGoogleAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSignInClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setAuthError(null);
    try {
      await signIn();
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in cancelled. You closed the popup — click again to retry.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError('Popup blocked! Allow popups for localhost in your browser settings, then retry.');
      } else if (code === 'auth/unauthorized-domain') {
        setAuthError(
          'UNAUTHORIZED_DOMAIN: localhost is not authorized in Firebase.\n' +
          'FIX: Go to Firebase Console → Authentication → Settings → Authorized domains → Add "localhost".\n' +
          'Project: syllabus-to-study-plan-agent'
        );
      } else if (code === 'auth/operation-not-allowed') {
        setAuthError('Google sign-in is not enabled in Firebase Console. Enable the Google provider under Authentication → Sign-in method.');
      } else if (code === 'auth/network-request-failed') {
        setAuthError('Network error — check your internet connection and retry.');
      } else {
        setAuthError(`Auth error (${code || 'unknown'}): ${err?.message || 'Google authentication failed.'}`);
      }
      // Don't auto-dismiss for unauthorized-domain since it needs user action
      if (code !== 'auth/unauthorized-domain') {
        setTimeout(() => setAuthError(null), 8000);
      }
    }
  };

  const GoogleLogoSvg = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 48 48"
      className="w-4 h-4 shrink-0"
      aria-hidden="true"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );

  if (!user) {
    return (
      <div className="relative inline-flex items-center">
        <button
          onClick={handleSignInClick}
          disabled={isSigningIn}
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0b132b] hover:bg-[#131f42] border border-sky-500/30 hover:border-cyan-400/60 text-slate-200 hover:text-white text-xs font-sans font-medium transition-all shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-50 shrink-0"
          title="Sign in with Google to enable Google Drive & Workspace sync"
        >
          {isSigningIn ? (
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
          ) : (
            <GoogleLogoSvg />
          )}
          <span className="font-semibold text-xs tracking-tight">
            {isSigningIn ? 'Connecting...' : compact ? 'Sign In' : 'Sign in with Google'}
          </span>
        </button>

        {authError && (
          <div className="absolute right-0 top-full mt-2 w-80 p-3 rounded-xl bg-[#0f172a] border border-amber-500/50 shadow-2xl text-[11px] text-amber-200 z-[9999] flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block text-amber-300 mb-1">
                  {authError.includes('UNAUTHORIZED_DOMAIN') ? '⚠ Domain Not Authorized' : 'Sign-In Note'}
                </span>
                {authError.split('\n').map((line, i) => (
                  <p key={i} className="leading-relaxed text-amber-200/90 mb-0.5">{line}</p>
                ))}
              </div>
              <button
                onClick={() => setAuthError(null)}
                className="text-slate-400 hover:text-white p-0.5 cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {authError.includes('Sign-in method') && (
              <a
                href="https://console.firebase.google.com/u/1/project/syllabus-to-study-plan-agent/authentication/providers"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold transition text-[11px]"
              >
                <span>Enable Google Sign-in in Firebase</span>
                <span className="text-[10px]">↗</span>
              </a>
            )}
            {authError.includes('UNAUTHORIZED_DOMAIN') && (
              <a
                href="https://console.firebase.google.com/u/1/project/syllabus-to-study-plan-agent/authentication/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-semibold transition text-[11px]"
              >
                <span>Open Firebase Console → Add localhost</span>
                <span className="text-[10px]">↗</span>
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  // User is logged in: show polished profile pill with dropdown menu
  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        type="button"
        className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0b132b] border border-sky-500/30 hover:border-cyan-400/60 text-xs text-white transition-all cursor-pointer shadow-sm active:scale-[0.98]"
        title="Google Account Menu"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'Google User'}
            className="w-5 h-5 rounded-full border border-cyan-400/50 object-cover shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[10px] shrink-0 border border-cyan-400/40">
            {(user.displayName || user.email || 'G')[0].toUpperCase()}
          </div>
        )}
        <span className="font-medium text-xs text-slate-200 truncate max-w-[100px]">
          {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Scholar'}
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
        <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setMenuOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0b132b] border border-sky-500/30 shadow-2xl p-2 z-[9999] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
            {/* Header info */}
            <div className="px-3 py-2 border-b border-sky-500/15 mb-1.5">
              <div className="flex items-center gap-2">
                <GoogleLogoSvg />
                <p className="text-xs font-bold text-white truncate">
                  {user.displayName || 'Connected Scholar'}
                </p>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{user.email}</p>
              <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-slate-300">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Drive
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 text-sky-400">
                  <CheckCircle2 className="w-3 h-3" /> Gmail
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 text-amber-400">
                  <CheckCircle2 className="w-3 h-3" /> Slides
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <button
              onClick={() => {
                setMenuOpen(false);
                setDriveModalOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg text-slate-300 hover:text-white hover:bg-[#131f42] transition-colors cursor-pointer"
            >
              <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Google Drive Files & Export</span>
            </button>

            <button
              onClick={() => {
                setMenuOpen(false);
                setGmailModalOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg text-slate-300 hover:text-white hover:bg-[#131f42] transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Gmail Study Digest & Sync</span>
            </button>

            <button
              onClick={() => {
                setMenuOpen(false);
                setSlidesModalOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg text-slate-300 hover:text-white hover:bg-[#131f42] transition-colors cursor-pointer"
            >
              <Presentation className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Google Slides Presentations</span>
            </button>

            <div className="my-1.5 border-t border-sky-500/15"></div>

            <button
              onClick={() => {
                setMenuOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer font-medium"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Disconnect Google</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
