import React, { useState, useEffect } from 'react';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import {
  listFormsFiles,
  createQuizForm,
  getFormResponses,
  GoogleFormItem,
  FormQuestionPayload,
} from '../services/googleForms';
import {
  X,
  FileQuestion,
  Search,
  Download,
  UploadCloud,
  Loader2,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  ClipboardList,
} from 'lucide-react';
import { SyllabusModule } from '../types';

interface GoogleFormsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentModules?: SyllabusModule[];
}

export const GoogleFormsModal: React.FC<GoogleFormsModalProps> = ({
  isOpen,
  onClose,
  currentModules = [],
}) => {
  const { user, accessToken, signIn, isSigningIn } = useGoogleAuth();
  const [forms, setForms] = useState<GoogleFormItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<{ title: string; editUri: string; responderUri?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmExport, setShowConfirmExport] = useState(false);

  useEffect(() => {
    if (isOpen && accessToken) {
      loadForms();
    }
  }, [isOpen, accessToken]);

  const loadForms = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const items = await listFormsFiles(accessToken);
      setForms(items);
    } catch (err: any) {
      setError(err.message || 'Failed to list Google Forms');
    } finally {
      setLoading(false);
    }
  };

  const executeExportQuizForm = async () => {
    if (!accessToken) return;
    setExporting(true);
    setError(null);
    setExportSuccess(null);
    setShowConfirmExport(false);

    try {
      const title = `MCAT Enzyme Kinetics & Biochem Active Recall Diagnostic`;
      const description = `Synapse AI Diagnostic Assessment: Test core conceptual mastery of competitive inhibition, Km, Vmax, and Lineweaver-Burk plots.`;

      const questions: FormQuestionPayload[] = [
        {
          title: 'Explain how a competitive inhibitor affects Km and Vmax of an enzyme-catalyzed reaction:',
          type: 'RADIO',
          options: [
            'Km increases (apparent affinity decreases); Vmax remains unchanged',
            'Km remains unchanged; Vmax decreases proportionally',
            'Both Km and Vmax decrease by the same factor',
            'Km decreases; Vmax increases due to active site competition',
          ],
        },
        {
          title: 'On a Lineweaver-Burk double reciprocal plot, what happens in the presence of a competitive inhibitor?',
          type: 'RADIO',
          options: [
            'The y-intercept (1/Vmax) stays unchanged, and the slope (Km/Vmax) increases',
            'The y-intercept shifts upward, while the x-intercept is fixed',
            'The x-intercept shifts farther away from the origin',
            'Both slope and y-intercept decrease',
          ],
        },
        {
          title: 'Describe why high substrate concentrations can overcome competitive inhibition, and why turnover (kcat) remains constant:',
          type: 'PARAGRAPH_TEXT',
        },
        {
          title: 'Self-Assess Confidence: How prepared do you feel on Michaelis-Menten kinetics for exam day?',
          type: 'RADIO',
          options: [
            '100% Confident — Ready for AAMC Section Bank',
            '75% Confident — Need 1 more voice recall drill',
            '50% Confident — Need to re-read Kaplan Ch. 2',
          ],
        },
      ];

      const res = await createQuizForm(accessToken, title, description, questions);
      setExportSuccess({
        title: res.title,
        editUri: res.editUri,
        responderUri: res.responderUri,
      });
      loadForms();
    } catch (err: any) {
      setError(err.message || 'Failed to create Google Form quiz');
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-surface-container-high border border-outline-variant rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/60 bg-surface-container">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                Google Forms Integration
                <span className="text-[10px] font-mono uppercase bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full">
                  Forms API Active
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Create interactive active recall quizzes or survey course assessments via Google Forms
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-surface-container-highest transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {!user ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-surface-container mx-auto flex items-center justify-center text-purple-400 border border-purple-500/20">
                <FileQuestion className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-sm font-semibold text-zinc-100">Connect Google Forms</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Authenticate your Google account to create and manage diagnostic quizzes in Google Forms.
                </p>
              </div>
              <button
                onClick={signIn}
                disabled={isSigningIn}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-lg shadow-purple-900/30 transition-all active:scale-95 cursor-pointer"
              >
                {isSigningIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileQuestion className="w-4 h-4" />}
                Sign in with Google to Connect Forms
              </button>
            </div>
          ) : (
            <>
              {/* Quick Actions Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/60 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4 text-purple-400" /> Export Quiz to Google Forms
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Instantly compile active voice recall questions into an interactive shareable Google Forms test.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowConfirmExport(true)}
                    disabled={exporting}
                    className="mt-3 w-full py-2 px-3 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ClipboardList className="w-3.5 h-3.5" />}
                    {exporting ? 'Creating Google Form...' : 'Create Google Forms Quiz'}
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/60 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-400" /> Synced Account
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Forms created will be owned by your Google account and immediately accessible in Google Drive.
                    </p>
                  </div>
                  <div className="mt-3 text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                    Account: {user.email}
                  </div>
                </div>
              </div>

              {/* Confirmation Dialog before mutating/creating form */}
              {showConfirmExport && (
                <div className="p-4 rounded-xl bg-surface-container-highest border border-purple-500/40 space-y-3">
                  <div className="flex items-center gap-2 text-purple-300 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 text-purple-400" />
                    <span>Create a new Google Form quiz in your Google Drive?</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    This will create a new diagnostic quiz containing 4 Michaelis-Menten kinetics questions, multiple choice options, and reflective prompts.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setShowConfirmExport(false)}
                      className="px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant text-zinc-300 text-xs hover:bg-surface-container-high transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={executeExportQuizForm}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors cursor-pointer shadow-sm"
                    >
                      Confirm & Create Form
                    </button>
                  </div>
                </div>
              )}

              {exportSuccess && (
                <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-purple-300">
                    <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Created quiz "{exportSuccess.title}" in your Google Drive!</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={exportSuccess.editUri}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-purple-400 hover:text-purple-300 underline font-medium"
                    >
                      Edit Form <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Existing Forms list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 px-1">
                  <span>Your Google Forms ({forms.length})</span>
                  <button
                    onClick={loadForms}
                    className="hover:text-purple-400 transition-colors cursor-pointer"
                  >
                    Refresh
                  </button>
                </div>

                {loading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    <span>Loading your Google Forms...</span>
                  </div>
                ) : forms.length === 0 ? (
                  <div className="py-8 text-center bg-surface-container/40 rounded-xl border border-dashed border-outline-variant text-zinc-500 text-xs">
                    No Google Forms found in your Google Drive. Click "Create Google Forms Quiz" above to generate your first assessment!
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {forms.map((form) => (
                      <div
                        key={form.id}
                        className="p-3 rounded-xl bg-surface-container border border-outline-variant/60 hover:border-purple-500/40 hover:bg-surface-container-highest transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-surface-container-high border border-outline-variant/80 flex items-center justify-center text-purple-400 shrink-0">
                            <FileQuestion className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-zinc-200 truncate group-hover:text-purple-300 transition-colors">
                              {form.name}
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              {form.modifiedTime
                                ? new Date(form.modifiedTime).toLocaleDateString()
                                : 'Google Forms Quiz'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {form.webViewLink && (
                            <a
                              href={form.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg text-purple-400 hover:text-purple-300 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant transition-colors flex items-center gap-1 text-xs"
                              title="Open in Google Forms"
                            >
                              <span>Open Form</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-outline-variant/60 bg-surface-container flex items-center justify-between text-xs text-zinc-500">
          <span>Google Forms API v1 Integration</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant hover:border-zinc-500 text-zinc-300 text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
