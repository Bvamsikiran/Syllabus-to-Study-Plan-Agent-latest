export type ScreenId =
  | 'overview'
  | 'landing'
  | 'master-schedule'
  | 'step1-upload'
  | 'step2-exam'
  | 'step3-bandwidth'
  | 'step4-resources'
  | 'dashboard'
  | 'voice-quiz'
  | 'voice-coach'
  | 'ai-tutor'
  | 'knowledge-base';

export interface GroundedSource {
  id: string;
  title: string;
  filename: string;
  page?: number | string;
  section?: string;
  snippet?: string;
  score?: number;
  type?: 'pdf' | 'notes' | 'ppt' | 'web';
}

export interface RAGChunk {
  id: string;
  sourceId: string;
  sourceTitle: string;
  filename: string;
  chunkIndex: number;
  pageNumber?: number | string;
  sectionTitle?: string;
  text: string;
  tokenCount?: number;
  userId: string;
  createdAt: number;
}

export interface DocumentItem {
  id: string;
  title: string;
  filename: string;
  fileType: 'pdf' | 'notes' | 'ppt' | 'web';
  chunksCount: number;
  uploadedAt: number;
  sizeBytes?: number;
  status: 'indexed' | 'processing' | 'error';
  userId?: string;
}

export interface VoiceTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  durationSeconds?: number;
  sources?: GroundedSource[];
  thinking?: string;
  engineUsed?: 'gemini-live' | 'gemma-local' | 'gemini-cloud';
}

export interface VoiceSession {
  sessionId: string;
  title: string;
  courseName: string;
  createdAt: number;
  updatedAt: number;
  lastTurnAt: number;
  turns: VoiceTurn[];
  sourceIds?: string[];
  totalTurns?: number;
  audioDurationSeconds?: number;
}

export interface SyllabusModule {
  id: string;
  name: string;
  submodulesCount: number;
  weight: number;
  topics: string[];
  completedUnits: number;
  totalUnits: number;
  reference: string;
  status: 'completed' | 'in-progress' | 'pending';
  progress: number;
  category?: string;
  priority?: 'high' | 'medium' | 'low';
}

export type SlotType = 'focus' | 'spaced' | 'buffer' | 'rest';

export interface ScheduleSlot {
  day: string; // 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
  timeBlock: 'morning' | 'afternoon' | 'evening';
  type: SlotType;
  hours: number;
  label: string;
  sublabel: string;
  moduleRef?: string;
}

export interface ResourceItem {
  id: string;
  title: string;
  type: 'Textbook / Book' | 'Question Bank' | 'Video Course / Lecture' | 'Notes / Anki Deck' | 'Practice Exam / Paper';
  meta: string;
  mappedInfo: string;
  role: 'Primary Core' | 'Supplemental' | 'Spaced Practice' | 'Benchmark Core';
  assignedWeeks?: string;
  citationUrl?: string;
  isUserAdded?: boolean;
}

export interface UpcomingStudyTask {
  id: string;
  time: string;
  title: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  moduleId?: string;
}

export interface ResponseAlternative {
  id: string;
  mode: 'conceptual' | 'exam-prep' | 'socratic';
  label: string;
  content: string;
  thinking?: string;
}

export interface AITutorMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  thinking?: string;
  promptContext?: {
    systemInstruction: string;
    ragEvidenceCount: number;
    ragSnippets: string[];
  };
  sources?: GroundedSource[];
  alternatives?: ResponseAlternative[];
  activeAlternativeId?: string;
  isStreaming?: boolean;
  engineUsed?: 'gemini-3.8-flash' | 'gemma3:4b-local' | 'gemini-flash-latest';
}

export interface AITutorConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: AITutorMessage[];
  courseContext?: string;
}

export interface EngineStatus {
  activeEngine: 'gemini-cloud' | 'gemma-local' | 'dual-engine';
  modelName: string;
  quotaStatus: string;
  localOllamaAvailable: boolean;
  geminiLiveSupported: boolean;
}

export interface QuizQuestion {
  id: string;
  category: string;
  title: string;
  targetConcepts: string[];
  transcript: string;
  correctInsights: string[];
  misconception: {
    title: string;
    description: string;
    clarification: string;
    remediationLink: string;
  };
}


