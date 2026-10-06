import React, { useState } from 'react';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import { LogOut, FolderGit2, Mail, ExternalLink, HardDrive, CheckCircle2 } from 'lucide-react';

export const GoogleAuthButton: React.FC = () => {
  const {
    user,
    accessToken,
    isSigningIn,
    signIn,
    signOut,
    setDriveModalOpen,
    setGmailModalOpen,
  } = useGoogleAuth();

  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) {
    return (
      <button
        onClick={signIn}
        disabled={isSigningIn}
        type="button"
        className="gsi-material-button shadow-md hover:shadow-violet-900/20 active:scale-[0.98] transition-all"
        title="Sign in with Google to enable Google Drive & Gmail integration"
      >
        <div className="gsi-material-button-state"></div>
        <div className="gsi-material-button-content-wrapper">
          <div className="gsi-material-button-icon">
            <svg
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              style={{ display: 'block' }}
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              ></path>
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
              ></path>
              <path
                fill="#FBBC05"
                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
              ></path>
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              ></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
          </div>
          <span className="gsi-material-button-contents">
            {isSigningIn ? 'Connecting...' : 'Sign in with Google'}
          </span>
          <span style={{ display: 'none' }}>Sign in with Google</span>
        </div>
      </button>
    );
  }

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-surface-container-high border border-outline-variant hover:border-primary/50 text-xs text-on-surface transition-all"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName || 'Google User'}
            className="w-6 h-6 rounded-full border border-primary/40 object-cover"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
            {(user.displayName || user.email || 'G')[0].toUpperCase()}
          </div>
        )}
        <div className="flex flex-col text-left">
          <span className="font-medium text-xs text-zinc-200 truncate max-w-[110px]">
            {user.displayName || user.email?.split('@')[0]}
          </span>
          <span className="text-[10px] text-tertiary flex items-center gap-1 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
            Drive & Gmail Linked
          </span>
        </div>
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)}></div>
          <div className="absolute right-0 mt-2 w-64 rounded-xl bg-surface-container-high border border-outline-variant shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-2 border-b border-outline-variant/60 mb-1">
              <p className="text-xs font-semibold text-zinc-100 truncate">{user.displayName}</p>
              <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
              <div className="mt-1.5 flex items-center gap-2 text-[10px] text-zinc-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Drive Ready
                </span>
                <span className="flex items-center gap-1 text-sky-400">
                  <CheckCircle2 className="w-3 h-3" /> Gmail Ready
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setMenuOpen(false);
                setDriveModalOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg text-zinc-300 hover:text-white hover:bg-surface-container-highest transition-colors"
            >
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>Google Drive Files & Export</span>
            </button>

            <button
              onClick={() => {
                setMenuOpen(false);
                setGmailModalOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg text-zinc-300 hover:text-white hover:bg-surface-container-highest transition-colors"
            >
              <Mail className="w-4 h-4 text-sky-400" />
              <span>Gmail Study Digest & Sync</span>
            </button>

            <div className="my-1 border-t border-outline-variant/60"></div>

            <button
              onClick={() => {
                setMenuOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Disconnect Google</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
