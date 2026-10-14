import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

// Minimal Identity Scopes for initial sign-in (Section J.1 compliance)
export const IDENTITY_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

// Incremental Feature-Specific Scopes
export const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
];

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
];

export const SLIDES_SCOPES = [
  'https://www.googleapis.com/auth/presentations.readonly',
];

export const SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
];

export const WORKSPACE_SCOPES = [
  ...DRIVE_SCOPES,
  ...GMAIL_SCOPES,
  ...SLIDES_SCOPES,
  ...SHEETS_SCOPES,
];

// Base provider configured for basic identity only
const provider = new GoogleAuthProvider();
IDENTITY_SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

// In-memory token management (strictly adheres to security policy: no localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;
let currentUser: User | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    currentUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // User is logged into Firebase Auth session, but we need popup to refresh OAuth access token if not cached
        if (onAuthSuccess) onAuthSuccess(user, null);
      }
    } else {
      cachedAccessToken = null;
      currentUser = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google OAuth access token');
    }

    cachedAccessToken = credential.accessToken;
    currentUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const getCurrentUser = (): User | null => {
  return currentUser || auth.currentUser;
};

export const logout = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  currentUser = null;
};

/**
 * Request incremental scopes on-demand when student invokes Drive, Gmail, or Slides
 */
export const requestIncrementalScope = async (scopes: string[]): Promise<string> => {
  const incrementalProvider = new GoogleAuthProvider();
  scopes.forEach((s) => incrementalProvider.addScope(s));
  incrementalProvider.setCustomParameters({ prompt: 'consent' });
  const result = await signInWithPopup(auth, incrementalProvider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error('Failed to acquire incremental Google OAuth token');
  }
  cachedAccessToken = credential.accessToken;
  currentUser = result.user;
  return credential.accessToken;
};
