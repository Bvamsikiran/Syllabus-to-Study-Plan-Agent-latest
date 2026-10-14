import React, { useState, useEffect } from 'react';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import {
  listSlidesFiles,
  getPresentation,
  extractPresentationText,
  createStudyPlanSlides,
  GoogleSlidesPresentation,
} from '../services/googleSlides';
import { SLIDES_SCOPES } from '../services/googleAuth';
import {
  X,
  Presentation,
  Search,
  Download,
  UploadCloud,
  Loader2,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { SyllabusModule } from '../types';

interface GoogleSlidesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSyllabusContent?: (fileName: string, text: string) => void;
  currentModules?: SyllabusModule[];
  targetDate?: string;
  targetScore?: number;
}

export const GoogleSlidesModal: React.FC<GoogleSlidesModalProps> = ({
  isOpen,
  onClose,
  onImportSyllabusContent,
  currentModules = [],
  targetDate,
  targetScore,
}) => {
  const { user, accessToken, signIn, isSigningIn, requestScope } = useGoogleAuth();
  const [presentations, setPresentations] = useState<GoogleSlidesPresentation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [importingId, setImportingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<{ title: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmExport, setShowConfirmExport] = useState(false);

  useEffect(() => {
    if (isOpen && accessToken) {
      loadPresentations();
    }
  }, [isOpen, accessToken]);

  const loadPresentations = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const items = await listSlidesFiles(accessToken);
      setPresentations(items);
    } catch (err: any) {
      setError(err.message || 'Failed to list Google Slides presentations');
    } finally {
      setLoading(false);
    }
  };

  const handleImportPresentation = async (pres: GoogleSlidesPresentation) => {
    if (!accessToken || !onImportSyllabusContent) return;
    setImportingId(pres.id);
    setError(null);
    try {
      const fullPres = await getPresentation(accessToken, pres.id);
      const text = extractPresentationText(fullPres);
      onImportSyllabusContent(pres.name, text);
      onClose();
    } catch (err: any) {
      setError(`Failed to extract slides from "${pres.name}": ${err.message}`);
    } finally {
      setImportingId(null);
    }
  };

  const executeExportPlanToSlides = async () => {
    if (!accessToken) return;
    setExporting(true);
    setError(null);
    setExportSuccess(null);
    setShowConfirmExport(false);

    try {
      const title = `Curriculum Mastery & Architecture Roadmap (${new Date().toLocaleDateString()})`;
      const result = await createStudyPlanSlides(
        accessToken,
        title,
        currentModules,
        targetDate,
        targetScore
      );
      setExportSuccess({
        title: result.title,
        url: result.webViewLink,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to export study plan to Google Slides');
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
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                Google Slides Integration
                <span className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Slides API Active
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Import lecture decks into study roadmaps or export visual flashcard slide decks
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
              <div className="w-16 h-16 rounded-2xl bg-surface-container mx-auto flex items-center justify-center text-amber-400 border border-amber-500/20">
                <Presentation className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-sm font-semibold text-zinc-100">Connect Google Slides</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Authenticate your Google account to access your Google Slides presentations and export interactive study slide decks.
                </p>
              </div>
              <button
                onClick={() => requestScope(SLIDES_SCOPES)}
                disabled={isSigningIn}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-lg shadow-amber-900/30 transition-all active:scale-95 cursor-pointer"
              >
                {isSigningIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
                Authorize Google Slides Access
              </button>
            </div>
          ) : (
            <>
              {/* Quick Actions Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/60 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4 text-amber-400" /> Export Plan to Slides
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Convert current {currentModules.length} syllabus modules into a structured Google Slides deck.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowConfirmExport(true)}
                    disabled={exporting}
                    className="mt-3 w-full py-2 px-3 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                    {exporting ? 'Creating Slides Deck...' : 'Generate Google Slides Deck'}
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/60 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-primary" /> Import from Presentation
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Select any existing Google Slides presentation below to extract course units and topic outlines.
                    </p>
                  </div>
                  <div className="mt-3 text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    Account: {user.email}
                  </div>
                </div>
              </div>

              {/* Confirmation Dialog before mutating/creating presentation */}
              {showConfirmExport && (
                <div className="p-4 rounded-xl bg-surface-container-highest border border-amber-500/40 space-y-3">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Create a new Google Slides presentation in your Google Drive?</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    This will create a new presentation with course module overview, active recall checkpoints, and weekly diagnostic timelines.
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setShowConfirmExport(false)}
                      className="px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant text-zinc-300 text-xs hover:bg-surface-container-high transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={executeExportPlanToSlides}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors cursor-pointer shadow-sm"
                    >
                      Confirm & Create Slides
                    </button>
                  </div>
                </div>
              )}

              {exportSuccess && (
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-amber-300">
                    <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Created presentation "{exportSuccess.title}" in your Google Drive!</span>
                  </div>
                  <a
                    href={exportSuccess.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-amber-400 hover:text-amber-300 underline font-medium"
                  >
                    Open in Slides <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Presentation list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 px-1">
                  <span>Your Google Slides Presentations ({presentations.length})</span>
                  <button
                    onClick={loadPresentations}
                    className="hover:text-amber-400 transition-colors cursor-pointer"
                  >
                    Refresh
                  </button>
                </div>

                {loading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                    <span>Loading your Google Slides...</span>
                  </div>
                ) : presentations.length === 0 ? (
                  <div className="py-8 text-center bg-surface-container/40 rounded-xl border border-dashed border-outline-variant text-zinc-500 text-xs">
                    No Google Slides presentations found in your Drive account.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {presentations.map((pres) => (
                      <div
                        key={pres.id}
                        className="p-3 rounded-xl bg-surface-container border border-outline-variant/60 hover:border-amber-500/40 hover:bg-surface-container-highest transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-surface-container-high border border-outline-variant/80 flex items-center justify-center text-amber-400 shrink-0">
                            <Presentation className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-zinc-200 truncate group-hover:text-amber-300 transition-colors">
                              {pres.name}
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              {pres.modifiedTime
                                ? new Date(pres.modifiedTime).toLocaleDateString()
                                : 'Google Slides Presentation'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {pres.webViewLink && (
                            <a
                              href={pres.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-surface-container-high transition-colors"
                              title="Open in Google Slides"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {onImportSyllabusContent && (
                            <button
                              onClick={() => handleImportPresentation(pres)}
                              disabled={importingId === pres.id}
                              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                            >
                              {importingId === pres.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              Import
                            </button>
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
          <span>Google Slides API v1 Integration</span>
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
