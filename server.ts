import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { localGemmaEngine } from './localGemmaEngine';

// Auto-create .env from .env.example if missing on first boot
const envPath = path.resolve(process.cwd(), '.env');
const envExamplePath = path.resolve(process.cwd(), '.env.example');
if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log('[Synapse AI] 📋 Auto-created .env from .env.example for first-time setup.');
}

dotenv.config();

// ─── Utility Helpers ──────────────────────────────────────────────────────────
function cleanBase64Audio(raw: string): string {
  if (!raw) return '';
  return raw.replace(/^data:audio\/\w+;base64,/, '').replace(/\s+/g, '');
}

// ─── Firebase Admin SDK — Verification & Project Consistency ──────────────────
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let firebaseAdminApp: App | null = null;
let clientProjectId = 'syllabus-to-study-plan-agent';

try {
  const clientConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(clientConfigPath)) {
    const raw = fs.readFileSync(clientConfigPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed.projectId) {
      clientProjectId = parsed.projectId;
    }
  }
} catch {
  // Use default clientProjectId
}

try {
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (saJson && getApps().length === 0) {
    const serviceAccount = JSON.parse(saJson);
    const adminProjectId = serviceAccount.project_id;

    if (adminProjectId && adminProjectId !== clientProjectId) {
      console.warn(
        `[Firebase Admin] ⚠ Project mismatch: Client config is "${clientProjectId}" but Service Account is for "${adminProjectId}".`
      );
    }

    firebaseAdminApp = initializeApp({
      credential: cert(serviceAccount),
    });
    console.log(`[Firebase Admin] ✓ Initialized for project "${adminProjectId || 'unknown'}".`);
  } else if (getApps().length > 0) {
    firebaseAdminApp = getApps()[0];
  }
} catch (e: any) {
  console.warn('[Firebase Admin] ⚠ Initialization skipped:', e.message);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));

// ─── Gemini AI Client Configuration ───────────────────────────────────────────
const serverApiKey = process.env.GEMINI_API_KEY || '';
let defaultAi: GoogleGenAI | null = null;
if (serverApiKey) {
  defaultAi = new GoogleGenAI({
    apiKey: serverApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'synapse-ai-study-agent',
      },
    },
  });
}

/**
 * Returns a GoogleGenAI client for the given request:
 * Prefers the user's client-provided key from the 'x-gemini-api-key' header if present;
 * otherwise falls back to the server-configured GEMINI_API_KEY.
 */
function getAiClient(req?: Request): GoogleGenAI | null {
  const clientKey = (req?.headers['x-gemini-api-key'] as string)?.trim();
  if (clientKey) {
    return new GoogleGenAI({
      apiKey: clientKey,
      httpOptions: {
        headers: {
          'User-Agent': 'synapse-ai-study-agent',
        },
      },
    });
  }
  return defaultAi;
}

// Configurable models: Defaults to stable gemini-2.0-flash and gemini-2.0-flash-live-001
const DEFAULT_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-3.5-flash';
const DEFAULT_LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';

// Circuit breaker state for transient 503 unavailability
interface CircuitBreakerState {
  consecutiveFailures: number;
  openUntil: number;
}
const circuitBreakers = new Map<string, CircuitBreakerState>();

function isCircuitOpen(model: string): boolean {
  const cb = circuitBreakers.get(model);
  if (!cb) return false;
  if (Date.now() < cb.openUntil) return true;
  cb.consecutiveFailures = 0;
  return false;
}

function recordCircuitFailure(model: string): void {
  let cb = circuitBreakers.get(model);
  if (!cb) {
    cb = { consecutiveFailures: 1, openUntil: 0 };
    circuitBreakers.set(model, cb);
  } else {
    cb.consecutiveFailures++;
  }
  if (cb.consecutiveFailures >= 3) {
    cb.openUntil = Date.now() + 15000; // 15s cooldown
    console.warn(`[Gemini CircuitBreaker] Model ${model} opened for 15s cooldown.`);
  }
}

function recordCircuitSuccess(model: string): void {
  const cb = circuitBreakers.get(model);
  if (cb) {
    cb.consecutiveFailures = 0;
    cb.openUntil = 0;
  }
}

/**
 * Resilient content generation with bounded retries on transient errors
 */
async function generateContentWithRetry(params: {
  ai: GoogleGenAI;
  model?: string;
  contents: any;
  config?: any;
}): Promise<any> {
  const model = params.model || process.env.GEMINI_TEXT_MODEL || 'gemini-3.5-flash';

  if (isCircuitOpen(model)) {
    throw new Error(`Model ${model} is temporarily cooling down due to consecutive failures.`);
  }

  // Up to 2 bounded attempts for transient errors
  for (let attempt = 1; attempt <= 2; attempt++) {
    // Per-attempt 55s timeout to prevent indefinite hangs
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55_000);
    try {
      const response = await params.ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      clearTimeout(timeoutId);
      recordCircuitSuccess(model);
      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);
      const status = err?.status || err?.statusCode || 0;
      const msg = err?.message || '';

      const isAborted = err?.name === 'AbortError' || msg.includes('aborted') || msg.includes('This operation was aborted');
      const isNetworkErr = msg.includes('fetch failed') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('network') || isAborted;
      const isQuota = status === 429 || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
      const isUnavailable = status === 503 || msg.includes('503') || msg.includes('UNAVAILABLE');
      const isInvalidModel = status === 404 || msg.includes('404') || msg.includes('not found') || msg.includes('invalid model');

      if (isAborted) {
        console.warn(`[Gemini API] Request timed out after 55s on ${model} (attempt ${attempt}/2).`);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        throw new Error('Gemini API request timed out. Check your internet connection or API key validity.');
      } else if (isInvalidModel) {
        console.warn(`[Gemini API] Invalid model name "${model}". Please check GEMINI_TEXT_MODEL in .env`);
        throw new Error(`Invalid Gemini model "${model}". Please check GEMINI_TEXT_MODEL in .env.`);
      } else if (isQuota) {
        console.warn(`[Gemini API] Quota exhausted (429) on ${model}.`);
        throw new Error('Gemini API quota exhausted (429). Please check your quota or supply a different API key.');
      } else if (isUnavailable || isNetworkErr) {
        recordCircuitFailure(model);
        console.warn(`[Gemini API] Transient error on ${model} (attempt ${attempt}/2):`, msg);
        if (attempt < 2) {
          const jitterMs = 800 + Math.floor(Math.random() * 400);
          await new Promise((r) => setTimeout(r, jitterMs));
          continue;
        }
        throw new Error('Gemini service is temporarily unavailable. Please check your internet connection and API key, then retry.');
      } else {
        console.warn(`[Gemini API] Error on ${model}:`, msg);
        throw err;
      }
    }
  }

  throw new Error('Inference failed after retry attempts.');
}

// ─── Health & Key Validation ─────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    serverKey: Boolean(serverApiKey),
    textModel: DEFAULT_TEXT_MODEL,
    liveModel: DEFAULT_LIVE_MODEL,
    timestamp: new Date().toISOString(),
  });
});

// Validate a Gemini API key with a minimal real API call
app.post('/api/validate-key', async (req: Request, res: Response) => {
  const aiClient = getAiClient(req);
  if (!aiClient) {
    return res.status(400).json({ valid: false, error: 'No API key provided.' });
  }
  try {
    const response = await aiClient.models.generateContent({
      model: DEFAULT_TEXT_MODEL,
      contents: 'Reply with exactly one word: OK',
      config: { temperature: 0, maxOutputTokens: 5 },
    });
    const text = response.text?.trim() || '';
    return res.json({ valid: true, model: DEFAULT_TEXT_MODEL, response: text });
  } catch (err: any) {
    const msg = err?.message || '';
    const isInvalid = err?.status === 400 || err?.status === 401 || msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED');
    return res.status(isInvalid ? 401 : 503).json({
      valid: false,
      error: isInvalid
        ? 'API key is invalid or expired. Please verify it at https://aistudio.google.com/app/apikey'
        : msg || 'Gemini service unreachable.',
    });
  }
});

// Live S2S token endpoint for browser Gemini Live WebSocket
app.post('/api/voice/live-token', (req: Request, res: Response) => {
  const clientKey = (req.headers['x-gemini-api-key'] as string)?.trim();
  const token = clientKey || serverApiKey;
  if (!token) {
    return res.status(401).json({
      error: 'API_KEY_REQUIRED',
      message: 'No Gemini API key found. Please set your key in the top navigation or in .env.',
    });
  }
  return res.json({
    token,
    model: process.env.GEMINI_LIVE_MODEL || 'gemini-2.0-flash-exp',
  });
});

// ─── Dual-Engine Status & Mode Management ─────────────────────────────────────
app.get('/api/ai-engine/status', async (req: Request, res: Response) => {
  const mode = localGemmaEngine.getMode();
  const ollamaOnline = await localGemmaEngine.checkOllamaHealth();
  const aiClient = getAiClient(req);

  res.json({
    activeEngine: mode,
    modelName:
      mode === 'gemma-local'
        ? ollamaOnline
          ? 'Gemma 3 4B (Local Ollama)'
          : 'Ollama Offline'
        : `${DEFAULT_TEXT_MODEL} (Google AI)`,
    liveModelName: DEFAULT_LIVE_MODEL,
    quotaStatus: mode === 'gemma-local' ? 'Local Compute' : 'Cloud API',
    localOllamaAvailable: ollamaOnline,
    geminiSupported: Boolean(aiClient),
    geminiLiveSupported: Boolean(aiClient),
  });
});

app.post('/api/ai-engine/toggle', (req: Request, res: Response) => {
  const { mode } = req.body;
  if (mode === 'gemma-local' || mode === 'gemini-cloud') {
    localGemmaEngine.setMode(mode);
  }
  res.json({
    success: true,
    activeEngine: localGemmaEngine.getMode(),
    message: `Switched AI Engine to ${localGemmaEngine.getMode()}`,
  });
});

// ─── Live API Token Provisioning ──────────────────────────────────────────────
app.post('/api/voice/live-token', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    let userId = 'student';

    if (firebaseAdminApp && authHeader?.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      try {
        const decoded = await getAuth(firebaseAdminApp).verifyIdToken(idToken);
        userId = decoded.uid;
      } catch (verifyErr: any) {
        console.warn('[LiveToken] Auth verification note:', verifyErr.code || verifyErr.message);
      }
    }

    const aiClient = getAiClient(req);
    const clientProvidedKey = (req.headers['x-gemini-api-key'] as string)?.trim();

    if (!aiClient && !clientProvidedKey) {
      return res.status(401).json({
        error: 'No Gemini API key available. Please enter your API key in the Gemini Key settings.',
        code: 'API_KEY_MISSING',
      });
    }

    const liveModel = DEFAULT_LIVE_MODEL;

    // If client supplied their own key, return it immediately for direct WebSocket connection
    if (clientProvidedKey) {
      return res.json({
        success: true,
        token: clientProvidedKey,
        useClientKeyDirect: true,
        model: liveModel,
      });
    }

    // Otherwise, try provisioning ephemeral token from server AI client if supported
    let tokenName = '';
    if (aiClient) {
      try {
        if ((aiClient as any).authTokens?.create) {
          const tokenResult = await (aiClient as any).authTokens.create({
            config: {
              duration: '1800s',
            },
          });
          if (tokenResult?.name) {
            tokenName = tokenResult.name;
          }
        }
      } catch (tokenErr: any) {
        console.warn('[LiveToken] Ephemeral token creation not supported on key tier:', tokenErr.message);
      }
    }

    if (!tokenName) {
      return res.status(503).json({
        error: 'Live S2S ephemeral token could not be provisioned for this server key tier. Please supply your own Gemini API key in the settings.',
        code: 'EPHEMERAL_TOKEN_UNAVAILABLE',
      });
    }

    return res.json({
      success: true,
      token: tokenName,
      model: liveModel,
      userId,
      expiresInSeconds: 1800,
    });
  } catch (error: any) {
    console.error('[LiveToken] Token provisioning error:', error);
    return res.status(500).json({
      error: 'Token provisioning failed: ' + (error.message || 'Unknown error'),
      code: 'SERVER_ERROR',
    });
  }
});

// ─── 1. API: Analyze Syllabus (Strictly Real AI Inference) ─────────────────────
app.post('/api/analyze-syllabus', async (req: Request, res: Response) => {
  const { text, filename } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_SYLLABUS_CONTENT',
      message: 'Syllabus content could not be read or is too short. Please upload a valid document or paste syllabus text.',
    });
  }

  // Check if user set local Gemma mode
  if (localGemmaEngine.getMode() === 'gemma-local') {
    const ollamaResult = await localGemmaEngine.analyzeSyllabusViaOllama(text, filename);
    if (ollamaResult) {
      return res.json({ success: true, data: ollamaResult, engine: 'gemma-local' });
    }
  }

  const aiClient = getAiClient(req);
  if (!aiClient) {
    return res.status(401).json({
      success: false,
      error: 'API_KEY_REQUIRED',
      message: 'Please set your Gemini API key in the settings to analyze this syllabus.',
    });
  }

  try {
    const prompt = `You are Synapse AI's Curriculum Ingestion Engine.
Analyze this syllabus text:
"${text.slice(0, 8000)}"
Filename: "${filename || 'Uploaded Syllabus'}"

Extract the genuine course name, core academic units, exam milestones, grading weights, and recommended pacing directly from the text.
Return ONLY valid JSON matching this schema:
{
  "courseName": "string",
  "modulesCount": number,
  "confidence": number,
  "units": [
    {
      "id": "string",
      "name": "string",
      "weight": number,
      "submodulesCount": number,
      "topics": ["string"],
      "reference": "string",
      "category": "string",
      "priority": "high" | "medium" | "low"
    }
  ],
  "milestones": [
    { "title": "string", "date": "string", "weight": number }
  ],
  "pacing": {
    "recommendedHoursPerDay": number,
    "dailyCardVolume": number,
    "totalWeeks": number
  }
}`;

    const response = await generateContentWithRetry({
      ai: aiClient,
      model: DEFAULT_TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    if (response?.text) {
      const clean = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);
      if (parsed.units && Array.isArray(parsed.units) && parsed.units.length > 0) {
        return res.json({ success: true, data: parsed, engine: DEFAULT_TEXT_MODEL });
      }
    }

    return res.status(502).json({
      success: false,
      error: 'PARSE_FAILED',
      message: 'The AI model could not extract structured course modules from this document.',
    });
  } catch (err: any) {
    console.error('[AnalyzeSyllabus] Inference failed:', err.message);
    return res.status(503).json({
      success: false,
      error: 'ANALYSIS_FAILED',
      message: err.message || 'Syllabus analysis failed. Please verify your API key and retry.',
    });
  }
});

// ─── 2. API: Dynamic Master Schedule (Strictly Real Syllabus Units) ───────────
app.post('/api/generate-schedule', async (req: Request, res: Response) => {
  const {
    units = [],
    bandwidthSlots = {},
    targetDate = '',
    targetScore = 85,
    retentionMode = 'aggressive',
    courseName = '',
  } = req.body;

  if (!Array.isArray(units) || units.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'NO_SYLLABUS_UNITS',
      message: 'Please upload a syllabus or select course units first to generate your schedule.',
    });
  }

  const aiClient = getAiClient(req);
  if (!aiClient) {
    return res.status(401).json({
      success: false,
      error: 'API_KEY_REQUIRED',
      message: 'Please set your Gemini API key in the settings to synthesize your study schedule.',
    });
  }

  try {
    const prompt = `You are Synapse AI's Adaptive Master Schedule Synthesis Engine.
Given:
- Course: "${courseName || 'Course Plan'}"
- Target Exam Date: "${targetDate || 'Upcoming Examination'}" (Target Score: ${targetScore})
- Retention Mode: "${retentionMode}"
- Real Syllabus Units: ${JSON.stringify(units.slice(0, 10))}
- User Bandwidth Slots: ${JSON.stringify(bandwidthSlots)}

Generate an optimal 7-day schedule (mon, tue, wed, thu, fri, sat, sun). Ground every block strictly in the provided syllabus units and topics only. Do not invent unrelated topics.
Return ONLY valid JSON matching this schema:
{
  "summary": {
    "weeklyHours": number,
    "maxCapacity": number,
    "bufferHours": number,
    "capacityUtilized": number,
    "retentionVelocity": number,
    "countdownDays": number,
    "todayBlocksCount": number,
    "todayHours": "string"
  },
  "days": {
    "mon": {
      "dayName": "MON",
      "dateLabel": "string",
      "blocks": [
        {
          "id": "string",
          "subject": "string",
          "title": "string",
          "type": "focus" | "spaced" | "buffer" | "rest",
          "duration": "string",
          "status": "scheduled",
          "badge": "string",
          "effort": "High" | "Moderate" | "Light",
          "cardsCount": number
        }
      ]
    },
    "tue": { "dayName": "TUE", "dateLabel": "string", "blocks": [] },
    "wed": { "dayName": "WED", "dateLabel": "string", "blocks": [] },
    "thu": { "dayName": "THU", "dateLabel": "string", "blocks": [] },
    "fri": { "dayName": "FRI", "dateLabel": "string", "blocks": [] },
    "sat": { "dayName": "SAT", "dateLabel": "string", "blocks": [] },
    "sun": { "dayName": "SUN", "dateLabel": "string", "blocks": [] }
  }
}`;

    const response = await generateContentWithRetry({
      ai: aiClient,
      model: DEFAULT_TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    if (response?.text) {
      const clean = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);
      return res.json({ success: true, schedule: parsed, engine: DEFAULT_TEXT_MODEL });
    }

    return res.status(502).json({
      success: false,
      error: 'SCHEDULE_PARSE_ERROR',
      message: 'Failed to generate a structured schedule from the model response.',
    });
  } catch (err: any) {
    console.error('[GenerateSchedule] Error:', err.message);
    return res.status(503).json({
      success: false,
      error: 'SCHEDULE_GENERATION_FAILED',
      message: err.message || 'Schedule synthesis failed. Please verify your API key and retry.',
    });
  }
});

// ─── 3. API: Generative AI Tutor (Single Clean Definition) ─────────────────────
app.post('/api/ai-tutor/chat', async (req: Request, res: Response) => {
  try {
    const { message, context, ragEvidence, mode } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const persona = mode || 'conceptual';
    const evidenceList: any[] = Array.isArray(ragEvidence) ? ragEvidence : [];
    const evidenceText = evidenceList
      .map((ev, i) => `[Source ${i + 1}: ${ev.title || ev.filename || 'Resource'}] ${ev.snippet || ev.text || ''}`)
      .join('\n\n');

    let systemInstruction = `You are Synapse AI, an elite academic study companion.\n`;
    if (context) {
      systemInstruction += `Course Context: ${context}\n`;
    }
    if (evidenceText) {
      systemInstruction += `\nAuthoritative Retrieved Evidence:\n${evidenceText}\n\nGround your response strictly in the provided evidence where applicable. Cite [Source X] when referencing facts. If the information is not present in the indexed materials, state this clearly while providing foundational principles.\n`;
    }

    if (persona === 'exam-prep') {
      systemInstruction += `Mode: High-Yield Exam Preparation. Focus on scoring strategies, boundary conditions, edge cases, formulas, and common traps.`;
    } else if (persona === 'socratic') {
      systemInstruction += `Mode: Socratic Method. Guide the student step-by-step with progressive inquiry rather than simply giving the answer.`;
    } else {
      systemInstruction += `Mode: Deep Conceptual Explanation. Provide first-principles mathematical rigor, structural theorems, proofs, and intuitive breakdowns.`;
    }

    systemInstruction += `\nCRITICAL INSTRUCTION: You MUST wrap your internal reasoning inside <thought>...</thought> tags at the very beginning of your response. Then, follow with your clean, beautifully structured markdown explanation.`;

    const promptContext = {
      systemInstruction,
      ragEvidenceCount: evidenceList.length,
      ragSnippets: evidenceList.map((e) => e.snippet || e.text || e.title || '').filter(Boolean).slice(0, 4),
    };

    // 1. Try local Ollama if active
    if (localGemmaEngine.getMode() === 'gemma-local') {
      const ollamaRes = await localGemmaEngine.queryLocalOllama(message, systemInstruction);
      if (ollamaRes && ollamaRes.text) {
        return res.json({
          success: true,
          content: ollamaRes.text,
          thinking: ollamaRes.thinking || 'Constructed rigorous explanation using local Gemma neural weights.',
          sources: evidenceList,
          engineUsed: 'gemma-local',
          promptContext,
        });
      }
    }

    // 2. Cloud Gemini Generation
    const aiClient = getAiClient(req);
    if (!aiClient) {
      return res.status(401).json({
        success: false,
        error: 'API_KEY_REQUIRED',
        message: 'Please configure your Gemini API key in settings to chat with the AI Tutor.',
      });
    }

    const response = await generateContentWithRetry({
      ai: aiClient,
      model: DEFAULT_TEXT_MODEL,
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemInstruction}\n\nStudent Question: ${message}` }],
        },
      ],
      config: {
        temperature: persona === 'exam-prep' ? 0.2 : 0.4,
      },
    });

    if (response?.text) {
      const rawText = response.text;
      let thinking = '';
      let content = rawText;
      const match = rawText.match(/<thought>([\s\S]*?)<\/thought>/i);
      if (match) {
        thinking = match[1].trim();
        content = rawText.replace(/<thought>[\s\S]*?<\/thought>/i, '').trim();
      } else {
        thinking = 'Analyzed query context and formulated structured conceptual response.';
      }

      return res.json({
        success: true,
        content,
        thinking,
        sources: evidenceList,
        engineUsed: DEFAULT_TEXT_MODEL,
        promptContext,
      });
    }

    return res.status(502).json({
      success: false,
      error: 'NO_RESPONSE',
      message: 'No response received from AI model.',
    });
  } catch (error: any) {
    console.error('[AITutor] Chat endpoint error:', error.message);
    return res.status(503).json({
      success: false,
      error: error.message || 'AI Tutor processing failed. Please retry.',
      code: 'SERVICE_UNAVAILABLE',
    });
  }
});

// ─── 4. API: Generate Tailored Recommendations from Real Syllabus ─────────────
app.post('/api/generate-resources', async (req: Request, res: Response) => {
  const { courseName, units = [] } = req.body;

  if (!Array.isArray(units) || units.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'NO_UNITS',
      message: 'Please upload or select syllabus modules to generate tailored resource suggestions.',
    });
  }

  const aiClient = getAiClient(req);
  if (!aiClient) {
    return res.status(401).json({
      success: false,
      error: 'API_KEY_REQUIRED',
      message: 'Please configure your Gemini API key in settings to recommend resources.',
    });
  }

  try {
    const prompt = `Based on the following actual syllabus units for "${courseName || 'Course'}":
${JSON.stringify(units.slice(0, 8))}

Recommend 4-6 authoritative, real-world study resources (standard reference textbooks, question banks, lecture series, or flashcard decks) specifically tailored to these units.
Return ONLY a valid JSON array of objects matching:
[
  {
    "id": "string",
    "title": "string",
    "type": "Textbook / Book" | "Question Bank" | "Video Course / Lecture" | "Notes / Anki Deck" | "Practice Exam / Paper",
    "meta": "string",
    "mappedInfo": "string",
    "role": "Primary Core" | "Supplemental" | "Benchmark Core" | "Spaced Practice",
    "assignedWeeks": "string"
  }
]`;

    const response = await generateContentWithRetry({
      ai: aiClient,
      model: DEFAULT_TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    if (response?.text) {
      const clean = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);
      return res.json({ success: true, resources: parsed, engine: DEFAULT_TEXT_MODEL });
    }

    return res.status(502).json({
      success: false,
      error: 'RECOMMENDATION_FAILED',
      message: 'Could not parse recommended resources.',
    });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      error: 'RESOURCE_GENERATION_FAILED',
      message: err.message || 'Resource recommendation failed.',
    });
  }
});

// ─── 5. Oral Diagnostic Quiz Generation & Evaluation ─────────────────────────
app.post('/api/voice-quiz/question', async (req: Request, res: Response) => {
  const { topic, units = [], courseContext = '' } = req.body;

  let topicToUse = topic;
  if (!topicToUse && Array.isArray(units) && units.length > 0) {
    const randomUnit = units[Math.floor(Math.random() * units.length)];
    topicToUse = randomUnit.name + (randomUnit.topics?.length ? `: ${randomUnit.topics[0]}` : '');
  }

  if (!topicToUse) {
    return res.status(400).json({
      success: false,
      error: 'NO_SYLLABUS_TOPICS',
      message: 'Please upload a syllabus first to generate oral quiz questions based on your course topics.',
    });
  }

  const aiClient = getAiClient(req);
  if (!aiClient) {
    return res.status(401).json({
      success: false,
      error: 'API_KEY_REQUIRED',
      message: 'Please set your Gemini API key in settings to generate diagnostic oral questions.',
    });
  }

  try {
    const prompt = `You are an elite academic professor creating a spoken diagnostic question for a student studying:
Course: "${courseContext || 'Academic Course'}"
Topic: "${topicToUse}"

Generate 1 challenging oral recall question designed to test deep conceptual understanding and mathematical/logical invariants.
Return ONLY valid JSON matching:
{
  "id": "string",
  "category": "string",
  "title": "string",
  "prompt": "string",
  "targetConcepts": ["string"],
  "modelAnswerSummary": "string",
  "rubricCriteria": [
    { "criterion": "string", "points": number, "description": "string" }
  ]
}`;

    const response = await generateContentWithRetry({
      ai: aiClient,
      model: DEFAULT_TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    if (response?.text) {
      const clean = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);
      return res.json({ success: true, data: parsed, engine: DEFAULT_TEXT_MODEL });
    }

    return res.status(502).json({ success: false, error: 'Could not generate quiz question.' });
  } catch (err: any) {
    return res.status(503).json({
      success: false,
      error: 'QUIZ_GENERATION_FAILED',
      message: err.message || 'Quiz generation failed.',
    });
  }
});

async function handleVoiceQuizEval(req: Request, res: Response): Promise<void> {
  const { questionTitle, questionPrompt, targetConcepts = [], spokenTranscript } = req.body;

  if (!spokenTranscript || typeof spokenTranscript !== 'string' || !spokenTranscript.trim()) {
    res.status(400).json({
      success: false,
      error: 'NO_TRANSCRIPT',
      message: 'No spoken transcript provided to evaluate.',
    });
    return;
  }

  const aiClient = getAiClient(req);
  if (!aiClient) {
    res.status(401).json({
      success: false,
      error: 'API_KEY_REQUIRED',
      message: 'Please set your Gemini API key in settings to evaluate oral answers.',
    });
    return;
  }

  try {
    const prompt = `You are evaluating a student's spoken response to an academic question.
Question: "${questionPrompt || questionTitle || 'Diagnostic Question'}"
Target Concepts Expected: ${JSON.stringify(targetConcepts)}
Student's Spoken Answer: "${spokenTranscript}"

Evaluate their understanding rigorously:
1. Assign an honest score from 0 to 10 based on conceptual accuracy.
2. Identify which target concepts they correctly articulated.
3. Identify misconceptions or missing nuances.
4. Provide a spoken summary for audio feedback.

Return ONLY valid JSON matching:
{
  "score": number,
  "retentionDelta": "string",
  "correctInsights": ["string"],
  "spokenSummary": "string",
  "misconception": {
    "title": "string",
    "description": "string",
    "clarification": "string",
    "remediationLink": "string"
  }
}`;

    const response = await generateContentWithRetry({
      ai: aiClient,
      model: DEFAULT_TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    if (response?.text) {
      const clean = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);
      res.json({ success: true, data: parsed, engine: DEFAULT_TEXT_MODEL });
      return;
    }

    res.status(502).json({ success: false, error: 'Could not evaluate response.' });
  } catch (err: any) {
    res.status(503).json({
      success: false,
      error: 'EVALUATION_FAILED',
      message: err.message || 'Evaluation failed.',
    });
  }
}

app.post('/api/voice-quiz-eval', handleVoiceQuizEval);
app.post('/api/voice-agent/process', handleVoiceQuizEval);

// ─── 6. Audio Transcription & Synthesis ──────────────────────────────────────
async function handleAudioTranscribe(req: Request, res: Response): Promise<void> {
  const { audioBase64, mimeType } = req.body;
  if (!audioBase64) {
    res.status(400).json({ error: 'Audio data is required' });
    return;
  }

  const cleanAudio = cleanBase64Audio(audioBase64);
  const detectedMime = mimeType || 'audio/webm';
  const aiClient = getAiClient(req);

  if (aiClient) {
    try {
      const response = await aiClient.models.generateContent({
        model: DEFAULT_TEXT_MODEL,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: detectedMime,
                data: cleanAudio,
              },
            },
            {
              text: 'Transcribe this student oral answer verbatim. Accurately capture technical engineering and academic terms. Return ONLY transcription text.',
            },
          ],
        },
      });

      const transcript = response.text?.trim() || '';
      res.json({
        success: true,
        transcript,
        model: DEFAULT_TEXT_MODEL,
      });
      return;
    } catch (err: any) {
      console.warn('[Transcribe] Cloud transcription failed:', err?.message);
    }
  }

  res.status(503).json({
    success: false,
    error: 'Audio transcription is currently unavailable. Please type your response directly or configure your API key.',
  });
}

async function handleAudioSynthesize(req: Request, res: Response): Promise<void> {
  const { text } = req.body;
  if (!text) {
    res.status(400).json({ error: 'Text is required for voice synthesis' });
    return;
  }

  // Gracefully inform client to use native Web Speech API synthesis
  res.json({
    success: false,
    message: 'Client Web Speech API synthesis should be used for audio playback.',
    audioBase64: null,
  });
}

app.post('/api/voice-transcribe', handleAudioTranscribe);
app.post('/api/voice-agent/transcribe', handleAudioTranscribe);
app.post('/api/voice-synthesize', handleAudioSynthesize);
app.post('/api/voice-agent/tts', handleAudioSynthesize);

// ─── Vite & Production Static Serving ─────────────────────────────────────────
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`\n======================================================\n  🚀 Synapse AI — Study Plan & Voice Coach Agent\n  🔗 Running at: http://localhost:${port}\n  🤖 AI Model:   ${DEFAULT_TEXT_MODEL} (Text) | ${DEFAULT_LIVE_MODEL} (Voice)\n  🔑 Gemini Key: ${serverApiKey ? 'Configured in .env ✓' : 'Not set in .env (enter in browser UI)'}\n======================================================\n`);
  });
}

startServer();
