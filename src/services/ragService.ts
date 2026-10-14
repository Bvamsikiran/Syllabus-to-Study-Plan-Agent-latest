/**
 * RAG Service for Synapse AI
 * Implements client-side and hybrid BM25 document chunking, indexing, and relevance scoring
 * for user-uploaded Syllabi, Notes, Slides, and Knowledge Base resources.
 */

import { GroundedSource, RAGChunk, DocumentItem } from '../types';

interface InvertedIndexEntry {
  chunkId: string;
  termFreq: number;
}

class RAGService {
  private chunks: Map<string, RAGChunk> = new Map();
  private documents: Map<string, DocumentItem> = new Map();
  private invertedIndex: Map<string, InvertedIndexEntry[]> = new Map();
  private docLengths: Map<string, number> = new Map();
  private avgDocLength: number = 0;

  constructor() {
    this.loadFromStorage();
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);
  }

  private saveToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const docsArray = Array.from(this.documents.values());
        const chunksArray = Array.from(this.chunks.values()).slice(0, 500); // cap storage
        localStorage.setItem('synapse_rag_docs', JSON.stringify(docsArray));
        localStorage.setItem('synapse_rag_chunks', JSON.stringify(chunksArray));
      }
    } catch {
      // Storage quota or SSR safe
    }
  }

  private loadFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const rawDocs = localStorage.getItem('synapse_rag_docs');
        const rawChunks = localStorage.getItem('synapse_rag_chunks');
        if (rawDocs) {
          const docs: DocumentItem[] = JSON.parse(rawDocs);
          docs.forEach((d) => this.documents.set(d.id, d));
        }
        if (rawChunks) {
          const chunks: RAGChunk[] = JSON.parse(rawChunks);
          chunks.forEach((c) => {
            this.chunks.set(c.id, c);
            this.addToInvertedIndex(c);
          });
          this.recalculateAvgDocLength();
        }
      }
    } catch {
      // Ignore parse errors on load
    }
  }

  private addToInvertedIndex(chunk: RAGChunk): void {
    const tokens = this.tokenize(chunk.text);
    this.docLengths.set(chunk.id, tokens.length);

    const freqs = new Map<string, number>();
    for (const t of tokens) {
      freqs.set(t, (freqs.get(t) || 0) + 1);
    }

    freqs.forEach((tf, term) => {
      let list = this.invertedIndex.get(term);
      if (!list) {
        list = [];
        this.invertedIndex.set(term, list);
      }
      list.push({ chunkId: chunk.id, termFreq: tf });
    });
  }

  private recalculateAvgDocLength(): void {
    if (this.docLengths.size === 0) {
      this.avgDocLength = 0;
      return;
    }
    let sum = 0;
    this.docLengths.forEach((len) => (sum += len));
    this.avgDocLength = sum / this.docLengths.size;
  }

  /**
   * Split incoming raw text into chunks with sliding overlap and metadata extraction
   */
  public indexDocument(params: {
    id: string;
    title: string;
    filename: string;
    text: string;
    fileType: 'pdf' | 'notes' | 'ppt' | 'web';
    userId?: string;
  }): DocumentItem {
    const { id, title, filename, text, fileType, userId = 'local-user' } = params;

    // Remove existing chunks for this document if re-indexing
    for (const [chunkId, chunk] of this.chunks.entries()) {
      if (chunk.sourceId === id) {
        this.chunks.delete(chunkId);
        this.docLengths.delete(chunkId);
      }
    }

    // Split text into paragraphs or blocks
    const rawParagraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 20);
    const generatedChunks: RAGChunk[] = [];
    const chunkSizeTarget = 300; // ~300 words target

    let currentBuffer = '';
    let currentSection = 'General Overview';
    let chunkIndex = 1;
    let pageEst = 1;

    for (let i = 0; i < rawParagraphs.length; i++) {
      const p = rawParagraphs[i].trim();

      // Check for section headings
      if (p.length < 90 && (/^(unit|chapter|section|module|topic|\d+\.|\bpart\b)/i.test(p) || p.endsWith(':'))) {
        currentSection = p.replace(/[:#]/g, '').trim();
      }

      currentBuffer += (currentBuffer ? '\n\n' : '') + p;
      const wordCount = currentBuffer.split(/\s+/).length;

      if (wordCount >= chunkSizeTarget || i === rawParagraphs.length - 1) {
        const chunkId = `${id}_chunk_${chunkIndex}`;
        const newChunk: RAGChunk = {
          id: chunkId,
          sourceId: id,
          sourceTitle: title,
          filename,
          chunkIndex,
          pageNumber: pageEst,
          sectionTitle: currentSection,
          text: currentBuffer,
          tokenCount: wordCount,
          userId,
          createdAt: Date.now(),
        };

        this.chunks.set(chunkId, newChunk);
        this.addToInvertedIndex(newChunk);
        generatedChunks.push(newChunk);

        // Advance chunk and slide ~50 words overlap
        const words = currentBuffer.split(/\s+/);
        currentBuffer = words.slice(Math.max(0, words.length - 50)).join(' ');
        chunkIndex++;
        if (chunkIndex % 3 === 0) pageEst++;
      }
    }

    this.recalculateAvgDocLength();

    const docItem: DocumentItem = {
      id,
      title,
      filename,
      fileType,
      chunksCount: generatedChunks.length,
      uploadedAt: Date.now(),
      sizeBytes: text.length,
      status: 'indexed',
      userId,
    };

    this.documents.set(id, docItem);
    this.saveToStorage();
    return docItem;
  }

  /**
   * Search chunks using BM25 scoring algorithm
   */
  public queryChunks(
    queryText: string,
    options: {
      userId?: string;
      limit?: number;
      minScore?: number;
      sourceTypes?: ('pdf' | 'notes' | 'ppt' | 'web')[];
    } = {}
  ): GroundedSource[] {
    const { userId, limit = 4, minScore = 0.5, sourceTypes } = options;
    const queryTokens = this.tokenize(queryText);

    if (queryTokens.length === 0 || this.chunks.size === 0) {
      return [];
    }

    const k1 = 1.5;
    const b = 0.75;
    const N = this.chunks.size;
    const scores = new Map<string, number>();

    for (const term of queryTokens) {
      const postings = this.invertedIndex.get(term) || [];
      const df = postings.length;
      if (df === 0) continue;

      // BM25 IDF formulation with smoothing
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));

      for (const posting of postings) {
        const chunk = this.chunks.get(posting.chunkId);
        if (!chunk) continue;
        if (userId && chunk.userId && chunk.userId !== userId && chunk.userId !== 'local-user') continue;

        // Filter by source type if requested
        if (sourceTypes) {
          const doc = this.documents.get(chunk.sourceId);
          if (doc && !sourceTypes.includes(doc.fileType)) continue;
        }

        const docLen = this.docLengths.get(chunk.id) || this.avgDocLength;
        const tf = posting.termFreq;
        const tfComponent = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / (this.avgDocLength || 1))));
        const termScore = idf * tfComponent;

        scores.set(chunk.id, (scores.get(chunk.id) || 0) + termScore);
      }
    }

    // Sort by descending score
    const results: GroundedSource[] = [];
    const sorted = Array.from(scores.entries())
      .filter(([_, score]) => score >= minScore)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    for (const [chunkId, score] of sorted) {
      const chunk = this.chunks.get(chunkId);
      if (!chunk) continue;
      const doc = this.documents.get(chunk.sourceId);

      results.push({
        id: chunk.id,
        title: chunk.sourceTitle,
        filename: chunk.filename,
        page: chunk.pageNumber,
        section: chunk.sectionTitle,
        snippet: chunk.text.length > 240 ? chunk.text.slice(0, 237) + '...' : chunk.text,
        score: Math.round(score * 100) / 100,
        type: doc?.fileType || 'pdf',
      });
    }

    return results;
  }

  /**
   * Get categorized statistics for the dashboard Knowledge Base card
   */
  public getKnowledgeStats(userId?: string): {
    totalDocuments: number;
    totalChunks: number;
    categories: {
      syllabus: { count: number; chunks: number };
      notes: { count: number; chunks: number };
      ppt: { count: number; chunks: number };
      web: { count: number; chunks: number };
    };
    documents: DocumentItem[];
  } {
    let docs = Array.from(this.documents.values());
    if (userId) {
      docs = docs.filter((d) => !d.userId || d.userId === userId || d.userId === 'local-user');
    }

    const categories = {
      syllabus: { count: 0, chunks: 0 },
      notes: { count: 0, chunks: 0 },
      ppt: { count: 0, chunks: 0 },
      web: { count: 0, chunks: 0 },
    };

    let totalChunks = 0;
    for (const d of docs) {
      totalChunks += d.chunksCount;
      if (d.fileType === 'pdf') {
        categories.syllabus.count++;
        categories.syllabus.chunks += d.chunksCount;
      } else if (d.fileType === 'notes') {
        categories.notes.count++;
        categories.notes.chunks += d.chunksCount;
      } else if (d.fileType === 'ppt') {
        categories.ppt.count++;
        categories.ppt.chunks += d.chunksCount;
      } else if (d.fileType === 'web') {
        categories.web.count++;
        categories.web.chunks += d.chunksCount;
      }
    }

    return {
      totalDocuments: docs.length,
      totalChunks,
      categories,
      documents: docs,
    };
  }

  /**
   * Remove a document and its chunks
   */
  public deleteDocument(docId: string): void {
    this.documents.delete(docId);
    for (const [chunkId, chunk] of this.chunks.entries()) {
      if (chunk.sourceId === docId) {
        this.chunks.delete(chunkId);
        this.docLengths.delete(chunkId);
      }
    }
    // Rebuild inverted index
    this.invertedIndex.clear();
    this.chunks.forEach((c) => this.addToInvertedIndex(c));
    this.recalculateAvgDocLength();
    this.saveToStorage();
  }

  /**
   * Seed initial syllabus index for GATE CS & Data Science if empty
   */
  public seedInitialGATEIndex(): void {
    if (this.documents.size > 0) return;

    this.indexDocument({
      id: 'gate-cs-syllabus',
      title: 'GATE 2026 CS Syllabus & Reference',
      filename: 'GATE_CS_2026_Syllabus.pdf',
      fileType: 'pdf',
      text: `Unit 1: Engineering Mathematics & Discrete Mathematics.
Propositional and first-order logic. Sets, relations, functions, partial orders and lattices. Monoids, groups. Graphs: connectivity, matching, coloring. Combinatorics: counting, recurrence relations, generating functions. Linear Algebra: matrices, determinants, system of linear equations, eigenvalues and eigenvectors, LU decomposition. Calculus: limits, continuity, differentiability, maxima and minima.

Unit 2: Digital Logic & Computer Organization.
Boolean algebra. Combinational and sequential circuits. Minimization. Number representations and computer arithmetic. Machine instructions and addressing modes. ALU, data-path and control unit. Instruction pipelining, pipeline hazards. Memory hierarchy: cache, main memory and secondary storage; I/O interface.

Unit 3: Data Structures and Algorithms.
Arrays, stacks, queues, linked lists, trees, binary search trees, binary heaps, graphs. Search, insert, delete in BST and heaps. Graph traversals: BFS and DFS. Minimum spanning trees, shortest paths. Asymptotic worst-case time and space complexity. Algorithm design techniques: greedy, dynamic programming and divide-and-conquer.

Unit 4: Theory of Computation & Compiler Design.
Regular expressions and finite automata. Context-free grammars and push-down automata. Regular and context-free languages, pumping lemma. Turing machines and undecidability. Lexical analysis, parsing, syntax-directed translation. Runtime environments. Intermediate code generation.

Unit 5: Operating Systems & Virtual Memory.
Processes, threads, inter-process communication, concurrency and synchronization. Deadlocks. CPU scheduling and multi-level feedback queues. Memory management and virtual memory: paging, segmentation, TLB, page replacement algorithms. File systems and I/O systems.

Unit 6: Databases & SQL.
ER-model. Relational model: relational algebra, tuple calculus, SQL. Integrity constraints, normal forms (1NF, 2NF, 3NF, BCNF). File organization, indexing (B and B+ trees). Transactions and concurrency control, ACID properties, serializability.

Unit 7: Computer Networks.
Concept of layering: OSI and TCP/IP protocol stacks. Basics of packet, circuit and virtual circuit-switching. Data link layer: framing, error detection, Medium Access Control, Ethernet. Routing protocols: shortest path, flooding, distance vector and link state routing. IPv4/IPv6, CIDR, addressing. Transport layer: flow and congestion control, UDP, TCP, sockets. Application layer: DNS, SMTP, HTTP.`,
    });

    this.indexDocument({
      id: 'gate-dsa-notes',
      title: 'Data Structures & Algorithms Deep Dive',
      filename: 'DSA_Notes.pdf',
      fileType: 'notes',
      text: `Page 8: Time and Space Complexity Bounds.
Time complexity measures how execution duration scales with input size n. Big-O O(g(n)) defines asymptotic upper bound. Searching in a balanced Binary Search Tree (AVL or Red-Black Tree) takes O(log n) time because depth is bounded by 1.44 log2(n). In contrast, linear array search requires O(n) worst-case time.

Page 12: Binary Search Trees and Tree Rotations.
A Binary Search Tree maintains the invariant that for any node x, all keys in the left subtree are strictly less than x.key, and all keys in the right subtree are greater than x.key. In-order traversal yields elements in sorted order. If tree becomes skewed, height degrades to O(n). Self-balancing trees apply Left and Right rotations in O(1) time to preserve O(log n) height.

Page 24: Graph Algorithms BFS & DFS.
Breadth-First Search uses a FIFO queue to discover vertices in order of their distance from the source. It computes single-source shortest paths on unweighted graphs in O(V + E) time. Depth-First Search explores edges out of the most recently discovered vertex using recursion/LIFO stack, classifying edges into Tree, Back, Forward, and Cross edges. A back edge in a directed graph indicates a directed cycle.`,
    });

    this.indexDocument({
      id: 'gate-ml-da-notes',
      title: 'Machine Learning & Regression Theory',
      filename: 'Machine_Learning_Core.pdf',
      fileType: 'notes',
      text: `Page 4: Linear Regression & Gradient Descent.
Linear regression models the relationship between dependent scalar y and explanatory variables X as y = X * theta + epsilon. Mean Squared Error (MSE) loss is J(theta) = (1/2m) * sum((h_theta(x) - y)^2). Batch Gradient Descent updates weights via theta = theta - alpha * (1/m) * X^T * (X * theta - y). The normal equation theta = (X^T * X)^(-1) * X^T * y computes optimal weights directly when X^T * X is non-singular.

Page 15: Deep Learning Backpropagation & Activations.
Backpropagation computes loss gradients by traversing backward via the chain rule. Sigmoid activation sigma(z) = 1 / (1 + exp(-z)) has derivative sigma'(z) = sigma(z)*(1 - sigma(z)) which peaks at 0.25. Multiplying many values <= 0.25 across deep layers causes vanishing gradients. ReLU f(z) = max(0, z) has derivative 1 for z > 0, mitigating gradient vanishing in deep architectures.`,
    });

    this.indexDocument({
      id: 'gate-dbms-notes',
      title: 'DBMS Normalization & B+ Trees',
      filename: 'DBMS_Normalization_SQL.pdf',
      fileType: 'pdf',
      text: `Page 18: Normalization 1NF through BCNF.
First Normal Form (1NF) eliminates duplicate columns and requires atomic attribute values. Second Normal Form (2NF) enforces 1NF and requires that every non-prime attribute is fully functionally dependent on the entire candidate key, eliminating partial dependencies. Third Normal Form (3NF) eliminates transitive functional dependencies X -> Y where neither X is a superkey nor Y is prime. Boyce-Codd Normal Form (BCNF) strictly requires that for every non-trivial functional dependency X -> Y, X must be a superkey.

Page 32: B+ Tree Indexing Structures.
B+ Trees store all actual record pointers strictly in leaf nodes, linked sequentially via doubly linked lists for fast range scans. Internal nodes act purely as index routers. In a B+ tree of order p, internal nodes hold at most p pointers and p - 1 keys, and at least ceil(p/2) pointers. When a leaf overflows, it splits and copies the middle key up to the parent while retaining a copy in the leaf.`,
    });
  }
}

export const ragService = new RAGService();
// Initialize seed data
ragService.seedInitialGATEIndex();
