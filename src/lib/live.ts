/**
 * Gemini Live API WebSocket Client for Real-Time Native Speech-to-Speech (S2S).
 * Connects directly using short-lived ephemeral tokens, streams 16kHz PCM audio,
 * decodes 24kHz PCM audio, handles instant barge-in, and resolves local BM25 RAG tool calls.
 */

import { LiveAudioPlayer, LiveAudioRecorder } from './audio';
import { SessionKnowledgeBase, GEMINI_LIVE_TOOLS } from './knowledge';
import { GroundedSource, VoiceTurn } from '../types';

export type LiveSessionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'speaking'
  | 'listening'
  | 'interrupted'
  | 'error'
  | 'closed';

export interface LiveClientConfig {
  ephemeralToken: string;
  modelName: string;
  voiceName?: 'Puck' | 'Charon' | 'Aoede' | 'Fenrir' | 'Kore';
  systemInstruction: string;
  knowledgeBase: SessionKnowledgeBase;
  priorTurns?: VoiceTurn[];
  onStatusChange?: (status: LiveSessionStatus, detail?: string) => void;
  onTurnComplete?: (turn: VoiceTurn) => void;
  onLiveTranscript?: (text: string, isUser: boolean) => void;
  onToolActivity?: (toolName: string, query: string) => void;
}

export class GeminiLiveSession {
  private ws: WebSocket | null = null;
  private player: LiveAudioPlayer;
  private recorder: LiveAudioRecorder;
  private config: LiveClientConfig;
  private status: LiveSessionStatus = 'idle';
  private currentAssistantText = '';
  private currentUserText = '';
  private currentAssistantSources: GroundedSource[] = [];

  constructor(config: LiveClientConfig) {
    this.config = config;
    this.player = new LiveAudioPlayer(24000);
    this.recorder = new LiveAudioRecorder();

    this.player.onPlayStateChange = (isPlaying) => {
      if (this.status !== 'error' && this.status !== 'closed' && this.status !== 'connecting') {
        this.setStatus(isPlaying ? 'speaking' : 'listening');
      }
    };

    this.recorder.onPcmChunk = (chunkBase64) => {
      this.sendRealtimeAudio(chunkBase64);
    };
  }

  public getPlayerAnalyser() {
    return this.player.getAnalyser();
  }

  public getRecorderAnalyser() {
    return this.recorder.getAnalyser();
  }

  private setStatus(status: LiveSessionStatus, detail?: string) {
    this.status = status;
    this.config.onStatusChange?.(status, detail);
  }

  public async connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('connecting', 'Establishing secure Live WebSocket tunnel...');

    const token = this.config.ephemeralToken;
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(
      token
    )}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        this.sendSetupMessage();
        // Start audio capture
        try {
          await this.recorder.start();
        } catch (micErr: any) {
          console.error('Microphone capture error:', micErr);
          this.setStatus('error', 'Microphone access denied or unavailable: ' + micErr.message);
          return;
        }
      };

      this.ws.onmessage = async (event) => {
        try {
          let data: any;
          if (event.data instanceof Blob) {
            const text = await event.data.text();
            data = JSON.parse(text);
          } else {
            data = JSON.parse(event.data);
          }
          this.handleServerMessage(data);
        } catch (err) {
          console.error('Failed to parse incoming Live message:', err);
        }
      };

      this.ws.onerror = (e) => {
        console.error('Gemini Live WebSocket error:', e);
        this.setStatus('error', 'WebSocket connection failed.');
      };

      this.ws.onclose = (e) => {
        this.teardownAudio();
        this.setStatus('closed', `Session ended (code: ${e.code}).`);
      };
    } catch (err: any) {
      this.setStatus('error', 'Failed to connect: ' + err.message);
    }
  }

  private sendSetupMessage() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Compose system instruction with prior conversation turns for bounded context continuity
    let fullSystemInstruction = this.config.systemInstruction;
    if (this.config.priorTurns && this.config.priorTurns.length > 0) {
      fullSystemInstruction += '\n\n=== RECENT CONVERSATION HISTORY (BOUNDED CONTEXT) ===\n';
      for (const turn of this.config.priorTurns) {
        fullSystemInstruction += `${turn.role === 'user' ? 'Student' : 'Professor'}: ${turn.text}\n`;
      }
      fullSystemInstruction += '=== END CONVERSATION HISTORY ===\n';
    }

    const modelPath = this.config.modelName.startsWith('models/')
      ? this.config.modelName
      : `models/${this.config.modelName}`;

    const setupPayload = {
      setup: {
        model: modelPath,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.config.voiceName || 'Puck',
              },
            },
          },
        },
        systemInstruction: {
          parts: [{ text: fullSystemInstruction }],
        },
        tools: GEMINI_LIVE_TOOLS,
      },
    };

    this.ws.send(JSON.stringify(setupPayload));
  }

  private handleServerMessage(data: any) {
    // 1. Setup Complete
    if (data.setupComplete) {
      this.setStatus('listening', 'Connected and ready. Start speaking!');
      return;
    }

    // 2. Server Content & Audio Stream
    if (data.serverContent) {
      const { modelTurn, interrupted, turnComplete } = data.serverContent;

      // Instant Barge-In / Interruption detection
      if (interrupted) {
        this.player.interrupt();
        this.setStatus('interrupted', 'Barge-in detected: audio playback stopped.');
        this.currentAssistantText += ' [Interrupted]';
      }

      if (modelTurn?.parts) {
        for (const part of modelTurn.parts) {
          // Streaming Audio Chunk (24kHz PCM16)
          if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/pcm')) {
            this.player.queueAudioChunk(part.inlineData.data);
          }
          // Assistant Transcript text (if model provided inline text/subtitles)
          if (part.text) {
            this.currentAssistantText += part.text;
            this.config.onLiveTranscript?.(this.currentAssistantText, false);
          }
        }
      }

      if (turnComplete) {
        if (this.currentAssistantText.trim().length > 0) {
          const finalTurn: VoiceTurn = {
            id: `turn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            role: 'assistant',
            text: this.currentAssistantText.trim(),
            timestamp: Date.now(),
            sources: [...this.currentAssistantSources],
          };
          this.config.onTurnComplete?.(finalTurn);
        }
        this.currentAssistantText = '';
        this.currentAssistantSources = [];
      }
    }

    // 3. Live Tool Function Calls (Local BM25 RAG)
    if (data.toolCall?.functionCalls) {
      for (const call of data.toolCall.functionCalls) {
        this.handleToolCall(call);
      }
    }
  }

  private handleToolCall(call: { name: string; args: any; id: string }) {
    const { name, args, id } = call;

    if (name === 'search_documents') {
      const query = args?.query || '';
      this.config.onToolActivity?.('search_documents', query);
      const searchResults = this.config.knowledgeBase.search(query, 3);

      const formattedResults = searchResults.map((r) => {
        this.currentAssistantSources.push({
          id: r.chunk.id,
          filename: r.chunk.sourceTitle,
          title: r.chunk.sourceTitle,
          section: r.chunk.section,
          page: r.chunk.page || 1,
          snippet: r.chunk.text.slice(0, 180) + '...',
        });

        return {
          source: r.chunk.sourceTitle,
          section: r.chunk.section,
          page: r.chunk.page || 1,
          relevance_score: r.score.toFixed(2),
          passage: r.chunk.text,
        };
      });

      this.sendToolResponse(id, {
        results: formattedResults.length > 0 ? formattedResults : 'No relevant passages found in indexed materials.',
      });
    } else if (name === 'read_sections') {
      const sourceId = args?.source_id || '';
      const section = args?.section;
      this.config.onToolActivity?.('read_sections', `${sourceId} (${section || 'all'})`);

      const sections = this.config.knowledgeBase.readSection(sourceId, section);
      const textOutput = sections.map((s) => `[${s.sourceTitle} - ${s.section}]: ${s.text}`).join('\n\n');

      this.sendToolResponse(id, {
        sections: textOutput || 'Section not found in selected material.',
      });
    } else {
      this.sendToolResponse(id, { error: `Tool ${name} is not recognized.` });
    }
  }

  private sendToolResponse(callId: string, output: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const payload = {
      toolResponse: {
        functionResponses: [
          {
            id: callId,
            response: { output },
          },
        ],
      },
    };

    this.ws.send(JSON.stringify(payload));
  }

  private sendRealtimeAudio(pcmBase64: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const payload = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: pcmBase64,
          },
        ],
      },
    };

    this.ws.send(JSON.stringify(payload));
  }

  /**
   * Inject fallback typed text message directly into the live conversation.
   */
  public sendTextMessage(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const userTurn: VoiceTurn = {
      id: `turn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      role: 'user',
      text,
      timestamp: Date.now(),
    };
    this.config.onTurnComplete?.(userTurn);

    const payload = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      },
    };

    this.ws.send(JSON.stringify(payload));
  }

  public setMute(muted: boolean) {
    this.recorder.setMute(muted);
  }

  public interruptAssistant() {
    this.player.interrupt();
    this.setStatus('listening', 'Assistant interrupted by user.');
  }

  private teardownAudio() {
    this.recorder.stop();
    this.player.close();
  }

  public close() {
    this.teardownAudio();
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('closed', 'Session closed.');
  }

  public disconnect() {
    this.close();
  }
}
