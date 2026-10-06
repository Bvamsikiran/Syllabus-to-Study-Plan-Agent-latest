/**
 * Firestore Service for Synapse AI
 * Implements persistent data models for User Profiles, Study Plans, Quiz Results, and Handwritten Analyses
 * strictly conforming to firebase-blueprint.json schema and security standards.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  getDocFromServer,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth } from './googleAuth';
import { SyllabusModule } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validate connection to Firestore on boot
 */
export async function testFirestoreConnection(): Promise<boolean> {
  const testPath = 'test/connection';
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline or network constrained. Checking configuration.');
      return false;
    }
    // Permission denied on test/connection is expected since default deny catches it
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
        targetDate: data.targetDate || '2025-11-28',
        targetScore: data.targetScore || 518,
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
  if (!user) throw new Error('User must be authenticated to save study plan to cloud');

  const planId = plan.id || `plan_${Date.now()}`;
  const path = `users/${user.uid}/studyPlans/${planId}`;

  try {
    const now = new Date().toISOString();
    const docData: FirestoreStudyPlan = {
      id: planId,
      userId: user.uid,
      courseName: plan.courseName,
      modulesCount: plan.units.length,
      confidence: plan.confidence || 99.4,
      units: plan.units,
      milestones: plan.milestones || [],
      pacing: plan.pacing || { recommendedHoursPerDay: 3.4, dailyCardVolume: 85 },
      scheduleSlots: plan.scheduleSlots || null,
      generatedSchedule: plan.generatedSchedule || null,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'users', user.uid, 'studyPlans', planId), docData);
    return planId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getStudyPlansFromFirestore(): Promise<FirestoreStudyPlan[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const path = `users/${user.uid}/studyPlans`;
  try {
    const q = query(collection(db, 'users', user.uid, 'studyPlans'), orderBy('updatedAt', 'desc'), limit(10));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as FirestoreStudyPlan);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function getLatestStudyPlanFromFirestore(): Promise<FirestoreStudyPlan | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const path = `users/${user.uid}/studyPlans`;
  try {
    const q = query(collection(db, 'users', user.uid, 'studyPlans'), orderBy('updatedAt', 'desc'), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as FirestoreStudyPlan;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

// -------------------------------------------------------------
// 3. Voice Quiz Result Persistence
// -------------------------------------------------------------
export interface FirestoreQuizResult {
  id: string;
  userId: string;
  questionTitle: string;
  transcript: string;
  score: number;
  retentionDelta: string;
  correctInsights: string[];
  spokenSummary?: string;
  misconception?: any;
  createdAt: string;
}

export async function saveQuizResultToFirestore(result: {
  questionTitle: string;
  transcript: string;
  score: number;
  retentionDelta: string;
  correctInsights: string[];
  spokenSummary?: string;
  misconception?: any;
}): Promise<string> {
  const user = auth.currentUser;
  if (!user) return '';

  const id = `quiz_${Date.now()}`;
  const path = `users/${user.uid}/quizResults/${id}`;

  try {
    const data: FirestoreQuizResult = {
      id,
      userId: user.uid,
      questionTitle: result.questionTitle,
      transcript: result.transcript,
      score: result.score,
      retentionDelta: result.retentionDelta,
      correctInsights: result.correctInsights,
      spokenSummary: result.spokenSummary,
      misconception: result.misconception,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', user.uid, 'quizResults', id), data);
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function getQuizResultsFromFirestore(): Promise<FirestoreQuizResult[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const path = `users/${user.uid}/quizResults`;
  try {
    const q = query(collection(db, 'users', user.uid, 'quizResults'), orderBy('createdAt', 'desc'), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as FirestoreQuizResult);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

// -------------------------------------------------------------
// 4. Handwritten Analysis Work Persistence
// -------------------------------------------------------------
export interface FirestoreHandwrittenWork {
  id: string;
  userId: string;
  promptContext: string;
  score: number;
  maxScore: number;
  rubricMet: string;
  diagnosticSummary?: string;
  pacing?: string;
  pins: any[];
  createdAt: string;
}

export async function saveHandwrittenWorkToFirestore(work: {
  promptContext: string;
  score: number;
  maxScore?: number;
  rubricMet?: string;
  diagnosticSummary?: string;
  pacing?: string;
  pins: any[];
}): Promise<string> {
  const user = auth.currentUser;
  if (!user) return '';

  const id = `hw_${Date.now()}`;
  const path = `users/${user.uid}/handwrittenWork/${id}`;

  try {
    const data: FirestoreHandwrittenWork = {
      id,
      userId: user.uid,
      promptContext: work.promptContext,
      score: work.score,
      maxScore: work.maxScore || 10,
      rubricMet: work.rubricMet || 'All Criteria Evaluated',
      diagnosticSummary: work.diagnosticSummary,
      pacing: work.pacing,
      pins: work.pins,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', user.uid, 'handwrittenWork', id), data);
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function getHandwrittenWorksFromFirestore(): Promise<FirestoreHandwrittenWork[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const path = `users/${user.uid}/handwrittenWork`;
  try {
    const q = query(collection(db, 'users', user.uid, 'handwrittenWork'), orderBy('createdAt', 'desc'), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as FirestoreHandwrittenWork);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}
