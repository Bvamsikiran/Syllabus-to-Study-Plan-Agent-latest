/**
 * Audio Engine for Gemini Live Native Speech-to-Speech (S2S).
 * Handles low-latency 16kHz PCM16 microphone capture and 24kHz PCM16 speaker playback
 * with instant barge-in interruption and visualizer frequency telemetry.
 */

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export function pcm16ToFloat32(pcmData: Int16Array): Float32Array {
  const float32 = new Float32Array(pcmData.length);
  for (let i = 0; i < pcmData.length; i++) {
    float32[i] = pcmData[i] / (pcmData[i] < 0 ? 32768 : 32767);
  }
  return float32;
}

/**
 * High-fidelity AudioPlayer for 24kHz Gemini Live PCM audio stream.
 * Features a seamless queueing scheduler and instant interruption (barge-in) purge.
 */
export class LiveAudioPlayer {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private scheduledTime = 0;
  private activeSourceNodes: AudioBufferSourceNode[] = [];
  private isPlaying = false;
  private sampleRate = 24000;
  public onPlayStateChange?: (isPlaying: boolean) => void;

  constructor(sampleRate = 24000) {
    this.sampleRate = sampleRate;
  }

  private initContext() {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: this.sampleRate });
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  /**
   * Enqueue a chunk of base64-encoded PCM16 audio (24kHz mono) for continuous playback.
   */
  public queueAudioChunk(base64Chunk: string) {
    this.initContext();
    if (!this.audioCtx) return;

    try {
      const arrayBuf = base64ToArrayBuffer(base64Chunk);
      const int16Data = new Int16Array(arrayBuf);
      if (int16Data.length === 0) return;

      const float32Data = pcm16ToFloat32(int16Data);
      const audioBuffer = this.audioCtx.createBuffer(1, float32Data.length, this.sampleRate);
      audioBuffer.getChannelData(0).set(float32Data);

      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;

      if (this.analyser) {
        source.connect(this.analyser);
      } else {
        source.connect(this.audioCtx.destination);
      }

      const currentTime = this.audioCtx.currentTime;
      if (this.scheduledTime < currentTime) {
        this.scheduledTime = currentTime + 0.03; // small 30ms anti-jitter buffer
      }

      source.start(this.scheduledTime);
      this.activeSourceNodes.push(source);
      this.scheduledTime += audioBuffer.duration;

      if (!this.isPlaying) {
        this.isPlaying = true;
        this.onPlayStateChange?.(true);
      }

      source.onended = () => {
        const idx = this.activeSourceNodes.indexOf(source);
        if (idx !== -1) {
          this.activeSourceNodes.splice(idx, 1);
        }
        if (this.activeSourceNodes.length === 0) {
          this.isPlaying = false;
          this.onPlayStateChange?.(false);
        }
      };
    } catch (err) {
      console.error('Failed to decode/queue audio chunk:', err);
    }
  }

  /**
   * Instant barge-in interruption: immediately stops all scheduled and playing audio,
   * purges buffers, and resets playback timeline so learner speech is never stepped on.
   */
  public interrupt() {
    for (const node of this.activeSourceNodes) {
      try {
        node.stop();
        node.disconnect();
      } catch {
        // Node may have already completed
      }
    }
    this.activeSourceNodes = [];
    if (this.audioCtx) {
      this.scheduledTime = this.audioCtx.currentTime;
    }
    if (this.isPlaying) {
      this.isPlaying = false;
      this.onPlayStateChange?.(false);
    }
  }

  public close() {
    this.interrupt();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}

/**
 * AudioRecorder capturing microphone audio resampled to 16kHz mono PCM16.
 * Uses AudioWorklet if available, with a resilient ScriptProcessorNode fallback.
 */
export class LiveAudioRecorder {
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isRecording = false;
  private isMuted = false;
  public onPcmChunk?: (chunkBase64: string) => void;

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public async start(): Promise<void> {
    if (this.isRecording) return;

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioCtxClass();
    const source = this.audioCtx.createMediaStreamSource(this.mediaStream);

    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);

    // Attempt AudioWorklet first for lowest latency and off-thread resampling
    let workletInitialized = false;
    try {
      if (this.audioCtx.audioWorklet) {
        await this.audioCtx.audioWorklet.addModule('/pcm-capture-worklet.js');
        this.workletNode = new AudioWorkletNode(this.audioCtx, 'pcm-capture-processor');
        this.workletNode.port.onmessage = (event) => {
          if (this.isMuted) return;
          const arrayBuffer = event.data as ArrayBuffer;
          const base64 = arrayBufferToBase64(arrayBuffer);
          this.onPcmChunk?.(base64);
        };
        source.connect(this.workletNode);
        workletInitialized = true;
      }
    } catch (e) {
      console.warn('AudioWorklet initialization fallback to ScriptProcessor:', e);
    }

    if (!workletInitialized) {
      // Fallback: Resilient ScriptProcessorNode
      const bufferSize = 2048;
      this.scriptProcessor = this.audioCtx.createScriptProcessor(bufferSize, 1, 1);
      const inputSampleRate = this.audioCtx.sampleRate;
      const targetSampleRate = 16000;
      const ratio = inputSampleRate / targetSampleRate;

      this.scriptProcessor.onaudioprocess = (event) => {
        if (this.isMuted) return;
        const channelData = event.inputBuffer.getChannelData(0);
        const resampledLength = Math.floor(channelData.length / ratio);
        const int16 = new Int16Array(resampledLength);

        for (let i = 0; i < resampledLength; i++) {
          const srcIdx = Math.floor(i * ratio);
          const sample = Math.max(-1, Math.min(1, channelData[srcIdx]));
          int16[i] = Math.round(sample < 0 ? sample * 0x8000 : sample * 0x7fff);
        }

        const base64 = arrayBufferToBase64(int16.buffer);
        this.onPcmChunk?.(base64);
      };

      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioCtx.destination);
    }

    this.isRecording = true;
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  public stop() {
    this.isRecording = false;
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
