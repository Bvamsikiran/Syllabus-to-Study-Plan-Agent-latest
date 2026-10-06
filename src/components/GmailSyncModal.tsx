import React, { useState, useEffect } from 'react';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import {
  listGmailMessages,
  sendEmailViaGmail,
  GmailEmailPreview,
} from '../services/googleGmail';
import {
  X,
  Mail,
  Send,
  Inbox,
  Loader2,
  CheckCircle,
  AlertCircle,
  Calendar,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { SyllabusModule } from '../types';

interface GmailSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFromEmail?: (subject: string, text: string) => void;
  currentModules?: SyllabusModule[];
  targetDate?: string;
  targetScore?: number;
}

export const GmailSyncModal: React.FC<GmailSyncModalProps> = ({
  isOpen,
  onClose,
  onImportFromEmail,
  currentModules = [],
  targetDate,
  targetScore,
}) => {
  const { user, accessToken, signIn, isSigningIn } = useGoogleAuth();
  const [activeTab, setActiveTab] = useState<'send' | 'scan'>('send');
  const [recipient, setRecipient] = useState<string>('');
  const [subject, setSubject] = useState<string>('Synapse AI — Your Personalized Study Schedule & Milestones');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [emails, setEmails] = useState<GmailEmailPreview[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email && !recipient) {
      setRecipient(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && accessToken && activeTab === 'scan') {
      loadCourseEmails();
    }
  }, [isOpen, accessToken, activeTab]);

  const loadCourseEmails = async () => {
    if (!accessToken) return;
    setScanning(true);
    setError(null);
    try {
      const items = await listGmailMessages(accessToken);
      setEmails(items);
    } catch (err: any) {
      setError(err.message || 'Failed to scan Gmail inbox');
    } finally {
      setScanning(false);
    }
  };

  const handleSendDigest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !recipient) return;
    setSending(true);
    setError(null);
    setSendSuccess(false);

    try {
      const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0c0c0f; color: #f4f4f5; padding: 28px; border-radius: 12px; border: 1px solid #27272a;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="color: #a78bfa; margin: 0; font-size: 24px; letter-spacing: -0.5px;">Synapse AI Study Engine</h1>
    <p style="color: #a1a1aa; font-size: 13px; margin-top: 6px;">Adaptive Syllabus & Spaced Repetition Digest</p>
  </div>

  <div style="background: #18181b; border-radius: 8px; padding: 18px; margin-bottom: 20px; border-left: 4px solid #a78bfa;">
    <h3 style="margin: 0 0 10px 0; color: #ffffff; font-size: 16px;">Target Exam Milestones</h3>
    <p style="margin: 4px 0; font-size: 14px; color: #d4d4d8;"><strong>Exam Date:</strong> ${targetDate || '2025-11-28'}</p>
    <p style="margin: 4px 0; font-size: 14px; color: #d4d4d8;"><strong>Target Score:</strong> ${targetScore || 518} (97th percentile)</p>
    <p style="margin: 4px 0; font-size: 14px; color: #34d399;"><strong>Algorithm:</strong> FSRS-4 Spaced Repetition Activated</p>
  </div>

  <div style="margin-bottom: 24px;">
    <h3 style="color: #ffffff; font-size: 16px; border-bottom: 1px solid #27272a; padding-bottom: 8px;">Upcoming Modules & Breakdown:</h3>
    ${currentModules
      .map(
        (m, idx) => `
      <div style="padding: 10px 0; border-bottom: 1px solid #1f1f23;">
        <strong style="color: #a78bfa; font-size: 14px;">${idx + 1}. ${m.name}</strong> 
        <span style="color: #71717a; font-size: 12px;">(${m.weight}% weight)</span>
        <div style="color: #a1a1aa; font-size: 13px; margin-top: 4px;">Topics: ${m.topics.join(', ')}</div>
        <div style="color: #34d399; font-size: 12px; margin-top: 2px;">Status: ${m.status.toUpperCase()} (${m.progress}%)</div>
      </div>
    `
      )
      .join('')}
  </div>

  <div style="text-align: center; padding-top: 16px; border-top: 1px solid #27272a; font-size: 12px; color: #71717a;">
    Sent automatically via Synapse AI with Google Workspace Gmail Integration.
  </div>
</div>
`;

      await sendEmailViaGmail(accessToken, recipient, subject, htmlBody);
      setSendSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch email via Gmail');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-surface-container-high border border-outline-variant rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/60 bg-surface-container">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                Gmail Study Digest & Sync
                <span className="text-[10px] font-mono uppercase bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-full">
                  Workspace Connected
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Email study schedules to your inbox or scan course emails for syllabus updates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-surface-container-highest transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        {user && (
          <div className="flex border-b border-outline-variant/60 bg-surface-container px-6 pt-2">
            <button
              onClick={() => setActiveTab('send')}
              className={`pb-2.5 px-4 text-xs font-medium flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'send'
                  ? 'border-sky-400 text-sky-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Send className="w-3.5 h-3.5" /> Email Study Plan Digest
            </button>
            <button
              onClick={() => setActiveTab('scan')}
              className={`pb-2.5 px-4 text-xs font-medium flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'scan'
                  ? 'border-sky-400 text-sky-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" /> Scan Course Emails ({emails.length})
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {!user ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-surface-container mx-auto flex items-center justify-center text-sky-400 border border-sky-500/20">
                <Mail className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-sm font-semibold text-zinc-100">Connect Gmail Account</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Sign in with Google to send daily review schedules, spaced repetition reminders, or import
                  syllabi emailed by professors.
                </p>
              </div>
              <button
                onClick={signIn}
                disabled={isSigningIn}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs shadow-lg shadow-sky-900/30 transition-all active:scale-95"
              >
                {isSigningIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Sign in with Google to Connect Gmail
              </button>
            </div>
          ) : activeTab === 'send' ? (
            <form onSubmit={handleSendDigest} className="space-y-4">
              {sendSuccess && (
                <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-500/40 text-xs text-sky-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Study schedule digest was sent successfully to {recipient}! Check your inbox.</span>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Recipient Email Address</label>
                <input
                  type="email"
                  required
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="your-email@gmail.com"
                  className="w-full bg-surface-container px-3.5 py-2 rounded-xl border border-outline-variant text-xs text-zinc-200 focus:outline-none focus:border-sky-500/60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Email Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-surface-container px-3.5 py-2 rounded-xl border border-outline-variant text-xs text-zinc-200 focus:outline-none focus:border-sky-500/60"
                />
              </div>

              {/* Plan Preview Card */}
              <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" /> Study Digest Content Preview
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Target: {targetDate || '2025-11-28'}
                  </span>
                </div>
                <div className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                  Includes {currentModules.length} core syllabus modules, target score calibration (
                  {targetScore || 518}), active recall milestones, and scheduled spaced repetition blocks.
                </div>
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-900/30 transition-all active:scale-[0.98]"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? 'Sending via Gmail...' : 'Send Schedule to Gmail Now'}
              </button>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                <span>Recent Course & Syllabus Emails</span>
                <button
                  onClick={loadCourseEmails}
                  className="hover:text-sky-400 transition-colors text-[11px]"
                >
                  Refresh
                </button>
              </div>

              {scanning ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                  <span>Scanning your Gmail inbox for syllabus & course messages...</span>
                </div>
              ) : emails.length === 0 ? (
                <div className="py-8 text-center bg-surface-container/40 rounded-xl border border-dashed border-outline-variant text-zinc-500 text-xs">
                  No syllabus or course emails detected in recent messages.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {emails.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/60 hover:border-sky-500/40 hover:bg-surface-container-highest transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-zinc-200 truncate">
                            {msg.subject}
                          </h4>
                          <p className="text-[10px] text-zinc-500">From: {msg.from}</p>
                        </div>
                        {onImportFromEmail && msg.snippet && (
                          <button
                            onClick={() => {
                              onImportFromEmail(msg.subject || 'Course Email', msg.snippet);
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-[11px] font-medium flex items-center gap-1 shrink-0 transition-colors"
                          >
                            <span>Import Content</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed bg-surface-container-high/50 p-2 rounded-lg border border-outline-variant/30">
                        {msg.snippet || 'No message preview'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-outline-variant/60 bg-surface-container flex items-center justify-between text-xs text-zinc-500">
          <span>Gmail API Integration</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant hover:border-zinc-500 text-zinc-300 text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
