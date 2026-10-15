/**
 * Firestore Service for Synapse AI
 * Implements persistent data models for User Profiles, Study Plans, Quiz Results,
 * AI Tutor Conversations, and Voice Sessions strictly conforming to security standards.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth } from './googleAuth';
import { SyllabusModule, AITutorConversation, AITutorMessage, GroundedSource } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export class FirestoreServiceError extends Error {
  public operationType: OperationType;
  public path: string | null;
  public code?: string;

  constructor(message: string, operationType: OperationType, path: string | null, code?: string) {
    super(message);
    this.name = 'FirestoreServiceError';
    this.operationType = operationType;
    this.path = path;
    this.code = code;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code;

  console.warn(`[Firestore] ${operationType.toUpperCase()} on ${path || 'unknown'} failed: ${message}`);
  throw new FirestoreServiceError(message, operationType, path, code);
}

/**
 * Validate connection to Firestore on boot safely without calling forbidden documents
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }
    // If a user is logged in, verify read access on their own profile doc
    const user = auth.currentUser;
    if (user) {
      await getDoc(doc(db, 'users', user.uid));
    }
    return true;
  } catch (err: any) {
    // Graceful check: network errors vs unauthenticated states
    if (err?.code === 'unavailable' || err?.message?.includes('offline')) {
      console.warn('[Firestore] Client is offline or Firestore service unavailable.');
      return false;
    }
    return true;
  }
}

// -------------------------------------------------------------
// 1. User Profile Management
// -------------------------------------------------------------
export interface UserProfileData {
  uid: string;
  email?: string;
  displayName?: string;
  targetDate: string;
  targetScore: number;
  retentionMode: 'aggressive' | 'balanced';
  createdAt: string;
  updatedAt: string;
}

export async function saveUserProfile(data: Partial<UserProfileData>): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const path = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    const existing = await getDoc(userRef);

    const now = new Date().toISOString();
    if (!existing.exists()) {
      const profile: UserProfileData = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Synapse Scholar',
        targetDate: data.targetDate || '',
        targetScore: data.targetScore || 0,
        retentionMode: data.retentionMode || 'aggressive',
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(userRef, profile);
    } else {
      await updateDoc(userRef, {
        ...data,
        updatedAt: now,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getUserProfile(): Promise<UserProfileData | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const path = `users/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) {
      return snap.data() as UserProfileData;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

// -------------------------------------------------------------
// 2. Study Plan Storage
// -------------------------------------------------------------
export interface FirestoreStudyPlan {
  id: string;
  userId: string;
  courseName: string;
  modulesCount: number;
  confidence: number;
  units: SyllabusModule[];
  milestones: any[];
  pacing?: any;
  scheduleSlots?: any;
  generatedSchedule?: any;
  createdAt: string;
  updatedAt: string;
}

export async function saveStudyPlanToFirestore(plan: {
  id?: string;
  courseName: string;
  units: SyllabusModule[];
  milestones?: any[];
  pacing?: any;
  confidence?: number;
  scheduleSlots?: any;
  generatedSchedule?: any;
}): Promise<string> {
  const user = auth.currentUser;
  const planId = plan.id || `plan_${Date.now()}`;

  // If user is not logged in, persist to localStorage for local reliability
  if (!user) {
    try {
      localStorage.setItem('synapse_local_study_plan', JSON.stringify({
        ...plan,
        id: planId,
        updatedAt: new Date().toISOString(),
      }));
    } catch {
      // quota safe
    }
    return planId;
  }

  const path = `users/${user.uid}/studyPlans/${planId}`;
  try {
    const now = new Date().toISOString();
    const docData: FirestoreStudyPlan = {
      id: planId,
      userId: user.uid,
      courseName: plan.courseName,
      modulesCount: plan.units.length,
      confidence: plan.confidence || 98.6,
      units: plan.units,
      milestones: plan.milestones || [],
      pacing: plan.pacing || { recommendedHoursPerDay: 3.5, dailyCardVolume: 50 },
      scheduleSlots: plan.scheduleSlots || null,
      generatedSchedule: plan.generatedSchedule || null,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'users', user.uid, 'studyPlans', planId), docData);
    return planId;
  } catch (err) {
    // If permission or network issue, fallback to localStorage without crashing
    console.warn('[Firestore] Failed to save study plan to cloud, persisting locally:', err);
    try {
      localStorage.setItem('synapse_local_study_plan', JSON.stringify(plan));
    } catch { /* ignore */ }
    return planId;
  }
}

export async function getStudyPlansFromFirestore(): Promise<FirestoreStudyPlan[]> {
  const user = auth.currentUser;
  if (!user) {
    const local = localStorage.getItem('synapse_local_study_plan');
    return local ? [JSON.parse(local)] : [];
  }

  const path = `users/${user.uid}/studyPlans`;
  try {
    const q = query(collection(db, 'users', user.uid, 'studyPlans'), orderBy('updatedAt', 'desc'), limit(10));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as FirestoreStudyPlan);
  } catch (err) {
    console.warn('[Firestore] List study plans failed, returning local backup:', err);
    const local = localStorage.getItem('synapse_local_study_plan');
    return local ? [JSON.parse(local)] : [];
  }
}

export async function getLatestStudyPlanFromFirestore(): Promise<FirestoreStudyPlan | null> {
  const plans = await getStudyPlansFromFirestore();
  return plans.length > 0 ? plans[0] : null;
}

// -------------------------------------------------------------
// 3. AI Tutor Conversation Persistence
// -------------------------------------------------------------
export async function saveAITutorConversationToFirestore(
  conv: AITutorConversation
): Promise<string> {
  const user = auth.currentUser;
  const convId = conv.id;

  // Local storage cache
  try {
    const raw = localStorage.getItem('synapse_tutor_convs');
    const map = raw ? JSON.parse(raw) : {};
    map[convId] = conv;
    localStorage.setItem('synapse_tutor_convs', JSON.stringify(map));
  } catch { /* quota safe */ }

  if (!user) return convId;

  const path = `users/${user.uid}/tutorConversations/${convId}`;
  try {
    const docData = {
      ...conv,
      userId: user.uid,
      updatedAt: Date.now(),
      // Cap messages to avoid document size limit
      messages: conv.messages.slice(-50),
    };
    await setDoc(doc(db, 'users', user.uid, 'tutorConversations', convId), docData, { merge: true });
    return convId;
  } catch (err) {
    console.warn('[Firestore] Saving AI tutor conversation to cloud failed, saved locally:', err);
    return convId;
  }
}

export async function getAITutorConversationsFromFirestore(): Promise<AITutorConversation[]> {
  const user = auth.currentUser;

  // Check local cache first
  let localConvs: AITutorConversation[] = [];
  try {
    const raw = localStorage.getItem('synapse_tutor_convs');
    if (raw) {
      localConvs = Object.values(JSON.parse(raw));
    }
  } catch { /* ignore */ }

  if (!user) {
    return localConvs.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  const path = `users/${user.uid}/tutorConversations`;
  try {
    const q = query(
      collection(db, 'users', user.uid, 'tutorConversations'),
      orderBy('updatedAt', 'desc'),
      limit(25)
    );
    const snap = await getDocs(q);
    const cloudConvs = snap.docs.map((d) => d.data() as AITutorConversation);
    return cloudConvs.length > 0 ? cloudConvs : localConvs;
  } catch (err) {
    console.warn('[Firestore] Failed to fetch cloud tutor conversations, using local cache:', err);
    return localConvs;
  }
}

export async function deleteAITutorConversationFromFirestore(convId: string): Promise<void> {
  try {
    const raw = localStorage.getItem('synapse_tutor_convs');
    if (raw) {
      const map = JSON.parse(raw);
      delete map[convId];
      localStorage.setItem('synapse_tutor_convs', JSON.stringify(map));
    }
  } catch { /* ignore */ }

  const user = auth.currentUser;
  if (!user) return;

  try {
    await deleteDoc(doc(db, 'users', user.uid, 'tutorConversations', convId));
  } catch (err) {
    console.warn('[Firestore] Delete tutor conversation failed:', err);
  }
}

// -------------------------------------------------------------
// 4. Voice Study Coach Session Persistence
// -------------------------------------------------------------
export interface FirestoreVoiceSession {
  sessionId: string;
  userId: string;
  title: string;
  courseName: string;
  createdAt: string;
  updatedAt: string;
  lastTurnAt: number;
  turns: Array<{
    id: string;
    role: 'user' | 'assistant';
    text: string;
    timestamp: number;
    sources?: GroundedSource[];
    thinking?: string;
  }>;
  sourceSummaries?: string[];
}

export async function saveVoiceSessionToFirestore(session: {
  sessionId: string;
  title: string;
  courseName: string;
  turns: any[];
  sourceSummaries?: string[];
}): Promise<string | undefined> {
  const user = auth.currentUser;

  // Always cache locally
  try {
    const raw = localStorage.getItem('synapse_voice_sessions');
    const map = raw ? JSON.parse(raw) : {};
    map[session.sessionId] = {
      ...session,
      userId: user?.uid || 'local-user',
      lastTurnAt: Date.now(),
    };
    localStorage.setItem('synapse_voice_sessions', JSON.stringify(map));
  } catch { /* quota safe */ }

  if (!user) return session.sessionId;

  const path = `users/${user.uid}/voiceSessions/${session.sessionId}`;
  try {
    const data: FirestoreVoiceSession = {
      sessionId: session.sessionId,
      userId: user.uid,
      title: session.title,
      courseName: session.courseName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastTurnAt: Date.now(),
      turns: session.turns.slice(-60),
      sourceSummaries: session.sourceSummaries || [],
    };
    await setDoc(doc(db, 'users', user.uid, 'voiceSessions', session.sessionId), data, { merge: true });
    return session.sessionId;
  } catch (err) {
    console.warn('[Firestore] Failed to save voice session to cloud, cached locally:', err);
    return session.sessionId;
  }
}

export async function getVoiceSessionsFromFirestore(): Promise<FirestoreVoiceSession[]> {
  const user = auth.currentUser;

  let localSessions: FirestoreVoiceSession[] = [];
  try {
    const raw = localStorage.getItem('synapse_voice_sessions');
    if (raw) {
      localSessions = Object.values(JSON.parse(raw));
    }
  } catch { /* ignore */ }

  if (!user) {
    return localSessions.sort((a, b) => b.lastTurnAt - a.lastTurnAt);
  }

  const path = `users/${user.uid}/voiceSessions`;
  try {
    const q = query(
      collection(db, 'users', user.uid, 'voiceSessions'),
      orderBy('lastTurnAt', 'desc'),
      limit(25)
    );
    const snap = await getDocs(q);
    const cloudSessions = snap.docs.map((d) => d.data() as FirestoreVoiceSession);
    return cloudSessions.length > 0 ? cloudSessions : localSessions;
  } catch (err) {
    console.warn('[Firestore] Failed to fetch cloud voice sessions, returning local sessions:', err);
    return localSessions;
  }
}

export async function deleteVoiceSessionFromFirestore(sessionId: string): Promise<void> {
  try {
    const raw = localStorage.getItem('synapse_voice_sessions');
    if (raw) {
      const map = JSON.parse(raw);
      delete map[sessionId];
      localStorage.setItem('synapse_voice_sessions', JSON.stringify(map));
    }
  } catch { /* ignore */ }

  const user = auth.currentUser;
  if (!user) return;

  try {
    await deleteDoc(doc(db, 'users', user.uid, 'voiceSessions', sessionId));
  } catch (err) {
    console.warn('[Firestore] Delete voice session failed:', err);
  }
}

export async function renameVoiceSessionInFirestore(sessionId: string, newTitle: string): Promise<void> {
  try {
    const raw = localStorage.getItem('synapse_voice_sessions');
    if (raw) {
      const map = JSON.parse(raw);
      if (map[sessionId]) {
        map[sessionId].title = newTitle;
        localStorage.setItem('synapse_voice_sessions', JSON.stringify(map));
      }
    }
  } catch { /* ignore */ }

  const user = auth.currentUser;
  if (!user) return;

  try {
    await updateDoc(doc(db, 'users', user.uid, 'voiceSessions', sessionId), {
      title: newTitle,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[Firestore] Rename voice session failed:', err);
  }
}

export async function saveQuizResultToFirestore(result: any): Promise<string> {
  const user = auth.currentUser;
  const id = `quiz_${Date.now()}`;
  if (!user) return id;
  try {
    await setDoc(doc(db, 'users', user.uid, 'quizResults', id), {
      ...result,
      id,
      userId: user.uid,
      createdAt: new Date().toISOString(),
    });
    return id;
  } catch (err) {
    console.warn('[Firestore] Save quiz result failed:', err);
    return id;
  }
}



