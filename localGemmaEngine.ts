/**
 * Local Gemma Intelligence Engine
 * Connects to local Ollama daemon (gemma3:4b or configured model)
 * Performs genuine local neural inference when available.
 * Never returns fabricated fallback data or hardcoded curriculum.
 */

export interface GemmaAnalysisResult {
  courseName: string;
  modulesCount: number;
  confidence: number;
  units: Array<{
    id: string;
    name: string;
    weight: number;
    submodulesCount: number;
    topics: string[];
    reference: string;
    category?: string;
    priority?: 'high' | 'medium' | 'low';
  }>;
  milestones: Array<{
    title: string;
    date: string;
    weight: number;
  }>;
  pacing: {
    recommendedHoursPerDay: number;
    dailyCardVolume: number;
    totalWeeks: number;
  };
  engineUsed: string;
}

export interface GemmaOralQuestion {
  id: string;
  category: string;
  title: string;
  prompt: string;
  targetConcepts: string[];
  modelAnswerSummary: string;
  rubricCriteria: Array<{
    criterion: string;
    points: number;
    description: string;
  }>;
}

export interface GemmaEvalResult {
  score: number;
  retentionDelta: string;
  correctInsights: string[];
  spokenSummary: string;
  misconception: {
    title: string;
    description: string;
    clarification: string;
    remediationLink: string;
  };
}

class LocalGemmaEngineService {
  private activeMode: 'gemma-local' | 'gemini-cloud' = 'gemini-cloud';
  private ollamaHost: string = process.env.OLLAMA_HOST || 'http://localhost:11434';
  private localModelName: string = process.env.OLLAMA_MODEL || 'gemma3:4b';
  private ollamaAvailable: boolean | null = null;
  private lastOllamaCheck: number = 0;

  public getMode(): 'gemma-local' | 'gemini-cloud' {
    return this.activeMode;
  }

  public setMode(mode: 'gemma-local' | 'gemini-cloud') {
    this.activeMode = mode;
  }

  /**
   * Check if local Ollama daemon is reachable
   */
  public async checkOllamaHealth(): Promise<boolean> {
    const now = Date.now();
    if (this.ollamaAvailable !== null && now - this.lastOllamaCheck < 10000) {
      return this.ollamaAvailable;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.ollamaHost}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const hasGemma = (data.models || []).some(
          (m: any) => (m.name || m.model || '').toLowerCase().includes('gemma')
        );
        this.ollamaAvailable = true;
        this.lastOllamaCheck = now;
        return true;
      }
      this.ollamaAvailable = false;
      this.lastOllamaCheck = now;
      return false;
    } catch {
      this.ollamaAvailable = false;
      this.lastOllamaCheck = now;
      return false;
    }
  }

  /**
   * Query local Ollama model directly with real neural weights
   */
  public async queryLocalOllama(
    prompt: string,
    systemPrompt?: string
  ): Promise<{ text: string; thinking?: string } | null> {
    const isHealthy = await this.checkOllamaHealth();
    if (!isHealthy) return null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const res = await fetch(`${this.ollamaHost}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.localModelName,
          prompt,
          system: systemPrompt || 'You are Synapse AI, an elite academic study tutor.',
          stream: false,
          options: {
            temperature: 0.2,
            num_predict: 512,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const data = await res.json();
      const rawResponse = data.response || '';

      let thinking = '';
      let text = rawResponse;
      const thoughtMatch = rawResponse.match(/<thought>([\s\S]*?)<\/thought>/i);
      if (thoughtMatch) {
        thinking = thoughtMatch[1].trim();
        text = rawResponse.replace(/<thought>[\s\S]*?<\/thought>/i, '').trim();
      }

      return { text, thinking };
    } catch (err) {
      console.warn('[LocalGemmaEngine] Ollama query failed:', err);
      return null;
    }
  }

  /**
   * Analyze syllabus using real Ollama inference if available
   */
  public async analyzeSyllabusViaOllama(
    text: string,
    filename?: string
  ): Promise<GemmaAnalysisResult | null> {
    const prompt = `Analyze this syllabus text:
"${text.slice(0, 4000)}"
Filename: "${filename || ''}"

Extract academic course units, milestones, and pacing. Return ONLY a valid JSON object matching:
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

    const res = await this.queryLocalOllama(
      prompt,
      'You are a syllabus parser that strictly returns valid JSON with no conversational text.'
    );

    if (!res || !res.text) return null;

    try {
      const clean = res.text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);
      if (parsed.units && Array.isArray(parsed.units)) {
        return {
          ...parsed,
          engineUsed: `ollama:${this.localModelName}`,
        };
      }
    } catch (err) {
      console.warn('[LocalGemmaEngine] Failed to parse Ollama syllabus JSON:', err);
    }
    return null;
  }
}

export const localGemmaEngine = new LocalGemmaEngineService();
