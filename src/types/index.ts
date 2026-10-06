export type ScreenId =
  | 'landing'
  | 'master-schedule'
  | 'step1-upload'
  | 'step2-exam'
  | 'step3-bandwidth'
  | 'step4-resources'
  | 'dashboard'
  | 'voice-quiz'
  | 'handwritten-analysis';

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
}

export type SlotType = 'focus' | 'spaced' | 'buffer' | 'rest';

export interface ScheduleSlot {
  day: string; // 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
  timeBlock: 'morning' | 'afternoon' | 'evening';
  type: SlotType;
  hours: number;
  label: string;
  sublabel: string;
}

export interface ResourceItem {
  id: string;
  title: string;
  type: 'Textbook / Book' | 'Question Bank' | 'Video Course / Lecture' | 'Notes / Anki Deck' | 'Practice Exam / Paper';
  meta: string;
  mappedInfo: string;
  role: 'Primary Core' | 'Supplemental' | 'Spaced Practice' | 'Benchmark Core';
  assignedWeeks?: string;
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

export interface AnnotationPin {
  id: number;
  title: string;
  type: 'correct' | 'error' | 'warning' | 'strategy';
  points: string;
  description: string;
  ocrSnippet?: string;
  ruleMet?: string;
  remediation?: string;
}
