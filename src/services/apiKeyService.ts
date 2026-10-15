/**
 * Service for managing user-supplied Gemini API key in localStorage.
 * Used for client-side Gemini Live WebSocket connection and passed
 * in request headers to backend AI endpoints.
 */

const STORAGE_KEY = 'synapse_gemini_api_key';

type KeyChangeListener = (key: string | null) => void;
const listeners: Set<KeyChangeListener> = new Set();

export const apiKeyService = {
  getKey(): string | null {
    try {
      const val = localStorage.getItem(STORAGE_KEY);
      return val && val.trim().length > 0 ? val.trim() : null;
    } catch {
      return null;
    }
  },

  setKey(key: string): void {
    try {
      const clean = key.trim();
      if (clean) {
        localStorage.setItem(STORAGE_KEY, clean);
        listeners.forEach((fn) => fn(clean));
      } else {
        this.clearKey();
      }
    } catch (e) {
      console.warn('Failed to save API key to localStorage', e);
    }
  },

  clearKey(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      listeners.forEach((fn) => fn(null));
    } catch (e) {
      console.warn('Failed to remove API key from localStorage', e);
    }
  },

  hasKey(): boolean {
    return Boolean(this.getKey());
  },

  subscribe(listener: KeyChangeListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getAiHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
    const key = this.getKey();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    };
    if (key) {
      headers['x-gemini-api-key'] = key;
    }
    return headers;
  },
};
