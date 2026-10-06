import React, { useState, useEffect } from 'react';
import { useGoogleAuth } from '../context/GoogleAuthContext';
import {
  listDriveFiles,
  readDriveFileContent,
  exportStudyPlanToDrive,
  GoogleDriveFile,
} from '../services/googleDrive';
import {
  X,
  HardDrive,
  Search,
  Download,
  UploadCloud,
  FileText,
  Loader2,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { SyllabusModule } from '../types';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSyllabusContent?: (fileName: string, text: string) => void;
  currentModules?: SyllabusModule[];
  targetDate?: string;
  targetScore?: number;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  onImportSyllabusContent,
  currentModules = [],
  targetDate,
  targetScore,
}) => {
  const { user, accessToken, signIn, isSigningIn } = useGoogleAuth();
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [importingId, setImportingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<{ name: string; url?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && accessToken) {
      loadFiles();
    }
  }, [isOpen, accessToken]);

  const loadFiles = async (query?: string) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const items = await listDriveFiles(accessToken, query);
      setFiles(items);
    } catch (err: any) {
      setError(err.message || 'Failed to list Google Drive files');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadFiles(searchQuery);
  };

  const handleImportFile = async (file: GoogleDriveFile) => {
    if (!accessToken || !onImportSyllabusContent) return;
    setImportingId(file.id);
    setError(null);
    try {
      const content = await readDriveFileContent(accessToken, file.id, file.mimeType);
      onImportSyllabusContent(file.name, content);
      onClose();
    } catch (err: any) {
      setError(`Failed to read "${file.name}": ${err.message}`);
    } finally {
      setImportingId(null);
    }
  };

  const handleExportPlan = async () => {
    if (!accessToken) return;
    setExporting(true);
    setError(null);
    setExportSuccess(null);

    try {
      const title = `Synapse-AI-Study-Plan-${new Date().toISOString().split('T')[0]}`;
      const markdownBody = `# Synapse AI - Adaptive Study Plan
**Target Exam Date:** ${targetDate || '2025-11-28'}  
**Target Score:** ${targetScore || 518}  
**Engine:** Synapse AI Neural Engine v4.2 with Spaced Repetition

---

## Course Modules & Syllabus Roadmap:
${currentModules
  .map(
    (m, idx) => `
### ${idx + 1}. ${m.name} (Weight: ${m.weight}%)
- **Submodules:** ${m.submodulesCount} units
- **Core Topics:** ${m.topics.join(', ')}
- **Completion Status:** ${m.status.toUpperCase()} (${m.progress}%)
- **Recommended Reading:** ${m.reference}
`
  )
  .join('\n')}

---

*Generated automatically via Google Workspace Integration in Synapse AI.*
`;

      const result = await exportStudyPlanToDrive(accessToken, title, markdownBody);
      setExportSuccess({
        name: result.name,
        url: result.webViewLink,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to export study plan to Drive');
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
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                Google Drive Storage & Import
                <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Workspace Connected
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Import syllabi directly from Drive or backup your AI study roadmap
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {!user ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-surface-container mx-auto flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <HardDrive className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-sm font-semibold text-zinc-100">Connect Google Drive</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Sign in with your Google account to browse course documents, syllabi PDFs, or export
                  your schedule directly into Drive.
                </p>
              </div>
              <button
                onClick={signIn}
                disabled={isSigningIn}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
              >
                {isSigningIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
                Sign in with Google to Connect Drive
              </button>
            </div>
          ) : (
            <>
              {/* Quick Actions Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/60 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                      <UploadCloud className="w-4 h-4 text-emerald-400" /> Export Plan to Drive
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Save current modules, target score, and calendar milestones as a document in your Drive.
                    </p>
                  </div>
                  <button
                    onClick={handleExportPlan}
                    disabled={exporting}
                    className="mt-3 w-full py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    {exporting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UploadCloud className="w-3.5 h-3.5" />
                    )}
                    {exporting ? 'Saving to Drive...' : 'Backup Study Plan to Drive'}
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/60 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-primary" /> Import from Drive
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Choose any syllabus PDF, course outline, or Google Doc from your Drive below.
                    </p>
                  </div>
                  <div className="mt-3 text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    Account: {user.email}
                  </div>
                </div>
              </div>

              {exportSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Saved "{exportSuccess.name}" to your Google Drive!</span>
                  </div>
                  {exportSuccess.url && (
                    <a
                      href={exportSuccess.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 underline font-medium"
                    >
                      View in Drive <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your Google Drive (e.g., 'Biochem syllabus', 'MCAT', 'Chem 101')..."
                  className="w-full bg-surface-container pl-10 pr-24 py-2.5 rounded-xl border border-outline-variant text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/60 transition-colors"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 rounded-lg text-xs font-medium border border-emerald-500/30 transition-all"
                >
                  Search
                </button>
              </form>

              {/* Files List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 px-1">
                  <span>Available Course Files & Syllabi ({files.length})</span>
                  <button
                    onClick={() => loadFiles(searchQuery)}
                    className="hover:text-emerald-400 transition-colors"
                  >
                    Refresh
                  </button>
                </div>

                {loading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                    <span>Loading your Google Drive files...</span>
                  </div>
                ) : files.length === 0 ? (
                  <div className="py-8 text-center bg-surface-container/40 rounded-xl border border-dashed border-outline-variant text-zinc-500 text-xs">
                    No matching files found in your Google Drive. Try searching or upload your syllabus to Drive first.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="p-3 rounded-xl bg-surface-container border border-outline-variant/60 hover:border-emerald-500/40 hover:bg-surface-container-highest transition-all flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-surface-container-high border border-outline-variant/80 flex items-center justify-center text-emerald-400 shrink-0">
                            {file.mimeType.includes('pdf') ? (
                              <FileText className="w-4 h-4 text-rose-400" />
                            ) : file.mimeType.includes('document') ? (
                              <FileText className="w-4 h-4 text-sky-400" />
                            ) : file.mimeType.includes('sheet') ? (
                              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <FileText className="w-4 h-4 text-zinc-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-zinc-200 truncate group-hover:text-emerald-300 transition-colors">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              {file.modifiedTime
                                ? new Date(file.modifiedTime).toLocaleDateString()
                                : 'Google Drive File'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-surface-container-high transition-colors"
                              title="Open in Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {onImportSyllabusContent && (
                            <button
                              onClick={() => handleImportFile(file)}
                              disabled={importingId === file.id}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                            >
                              {importingId === file.id ? (
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
          <span>Google Drive OAuth 2.0 Integration</span>
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
