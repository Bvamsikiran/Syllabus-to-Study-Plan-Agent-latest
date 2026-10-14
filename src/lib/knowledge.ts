/**
 * Session-Scoped Local RAG Retrieval Engine using BM25.
 * Indexes syllabus modules, uploaded textbooks, and user notes into overlapping chunks
 * with exact source metadata, and powers Gemini Live API tool declarations.
 */

export interface KnowledgeChunk {
  id: string;
  sourceId: string;
  sourceTitle: string;
  section: string;
  page?: number;
  text: string;
}

export interface SearchResult {
  chunk: KnowledgeChunk;
  score: number;
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'this', 'then', 'than', 'into', 'each', 'or', 'such',
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Robust in-memory BM25 indexer.
 * Uses Okapi BM25 ranking parameters: k1 = 1.2, b = 0.75.
 */
export class BM25Index {
  private chunks: KnowledgeChunk[] = [];
  private tokenizedDocs: string[][] = [];
  private docLengths: number[] = [];
  private avgDocLength = 0;
  private df: Map<string, number> = new Map();
  private idf: Map<string, number> = new Map();
  private k1 = 1.2;
  private b = 0.75;

  constructor(chunks: KnowledgeChunk[]) {
    this.chunks = chunks;
    this.build();
  }

  private build() {
    this.tokenizedDocs = this.chunks.map((c) => tokenize(c.text + ' ' + c.section + ' ' + c.sourceTitle));
    this.docLengths = this.tokenizedDocs.map((doc) => doc.length);
    const totalLength = this.docLengths.reduce((acc, len) => acc + len, 0);
    this.avgDocLength = this.chunks.length > 0 ? totalLength / this.chunks.length : 1;

    // Document frequencies
    this.df.clear();
    for (const doc of this.tokenizedDocs) {
      const uniqueWords = new Set(doc);
      for (const word of uniqueWords) {
        this.df.set(word, (this.df.get(word) || 0) + 1);
      }
    }

    // IDF calculation
    this.idf.clear();
    const N = this.chunks.length;
    for (const [word, freq] of this.df.entries()) {
      // Standard Okapi IDF with smoothing
      const idfScore = Math.log(1 + (N - freq + 0.5) / (freq + 0.5));
      this.idf.set(word, Math.max(0.1, idfScore));
    }
  }

  public search(query: string, topK = 4): SearchResult[] {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0 || this.chunks.length === 0) return [];

    const scores: { index: number; score: number }[] = [];

    for (let i = 0; i < this.chunks.length; i++) {
      const doc = this.tokenizedDocs[i];
      const docLen = this.docLengths[i];
      let score = 0;

      // Calculate term frequencies in current doc
      const tfMap = new Map<string, number>();
      for (const t of doc) {
        tfMap.set(t, (tfMap.get(t) || 0) + 1);
      }

      for (const q of queryTokens) {
        const idfScore = this.idf.get(q);
        if (!idfScore) continue;

        const tf = tfMap.get(q) || 0;
        if (tf === 0) continue;

        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / this.avgDocLength));
        score += idfScore * (numerator / denominator);
      }

      if (score > 0.05) {
        scores.push({ index: i, score });
      }
    }

    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, topK).map((item) => ({
      chunk: this.chunks[item.index],
      score: item.score,
    }));
  }
}

/**
 * Session-scoped KnowledgeBase for study materials and syllabus retrieval.
 */
export class SessionKnowledgeBase {
  private chunks: KnowledgeChunk[] = [];
  private index: BM25Index | null = null;
  private isIndexed = false;

  public addRawDocument(sourceId: string, sourceTitle: string, fullText: string, defaultSection = 'Overview') {
    // Sliding window chunking (around 800-1100 chars, 150 char overlap)
    const chunkSize = 900;
    const overlap = 150;
    let start = 0;
    let chunkIndex = 1;

    while (start < fullText.length) {
      const end = Math.min(fullText.length, start + chunkSize);
      const textSlice = fullText.slice(start, end).trim();

      if (textSlice.length > 30) {
        this.chunks.push({
          id: `${sourceId}-c${chunkIndex}`,
          sourceId,
          sourceTitle,
          section: defaultSection,
          page: Math.floor(start / 1800) + 1,
          text: textSlice,
        });
        chunkIndex++;
      }

      if (end === fullText.length) break;
      start += chunkSize - overlap;
    }

    this.isIndexed = false;
  }

  public addModuleUnit(moduleName: string, topics: string[], reference: string) {
    const text = `Module: ${moduleName}. Assigned Reference Standard: ${reference}. Topics & High-Yield Syllabus Units: ${topics.join(
      ', '
    )}.`;
    this.chunks.push({
      id: `mod-${Math.random().toString(36).substring(2, 7)}`,
      sourceId: moduleName,
      sourceTitle: `Syllabus Unit: ${moduleName}`,
      section: 'Course Syllabus Specification',
      page: 1,
      text,
    });
    this.isIndexed = false;
  }

  public buildIndex() {
    this.index = new BM25Index(this.chunks);
    this.isIndexed = true;
  }

  public search(query: string, topK = 4): SearchResult[] {
    if (!this.isIndexed || !this.index) {
      this.buildIndex();
    }
    return this.index!.search(query, topK);
  }

  public readSection(sourceId: string, sectionTitle?: string): KnowledgeChunk[] {
    return this.chunks.filter((c) => {
      const matchSource = c.sourceId.toLowerCase().includes(sourceId.toLowerCase()) ||
                          c.sourceTitle.toLowerCase().includes(sourceId.toLowerCase());
      if (!sectionTitle) return matchSource;
      return matchSource && c.section.toLowerCase().includes(sectionTitle.toLowerCase());
    }).slice(0, 3);
  }

  public getSummaryContext(maxChars = 2400): string {
    if (this.chunks.length === 0) return 'No external syllabus materials indexed.';
    let summary = '';
    for (const chunk of this.chunks) {
      const snippet = `[${chunk.sourceTitle} - ${chunk.section}]: ${chunk.text}\n`;
      if (summary.length + snippet.length > maxChars) break;
      summary += snippet;
    }
    return summary;
  }

  public getChunkCount(): number {
    return this.chunks.length;
  }
}

/**
 * Gemini Live API Tool Declarations for Function Calling.
 */
export const GEMINI_LIVE_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'search_documents',
        description: 'Searches the student\'s indexed syllabus, textbooks, lecture notes, and study resources for specific topics, formulas, or theorems. Returns grounded passages with exact citations.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: {
              type: 'STRING',
              description: 'Keywords, topic name, or theoretical concept to look up in the course material.',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'read_sections',
        description: 'Reads specific sections or chapters from an indexed source textbook or syllabus module.',
        parameters: {
          type: 'OBJECT',
          properties: {
            source_id: {
              type: 'STRING',
              description: 'Title or identifier of the source document or module.',
            },
            section: {
              type: 'STRING',
              description: 'Optional section heading or topic name to read.',
            },
          },
          required: ['source_id'],
        },
      },
    ],
  },
];
