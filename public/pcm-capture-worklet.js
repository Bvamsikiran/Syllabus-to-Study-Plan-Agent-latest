/**
 * AudioWorkletProcessor for high-performance, low-latency microphone PCM streaming.
 * Captures browser input audio, resamples to 16kHz mono, and encodes to 16-bit linear PCM (Int16Array).
 */
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetSampleRate = 16000;
    this.buffer = [];
    this.inputSampleRate = sampleRate; // Global AudioWorkletGlobalScope sampleRate
    this.chunkSize = 2048; // ~128ms per PCM chunk for smooth network streaming
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    // Use channel 0 (mono)
    const channelData = input[0];
    if (!channelData || channelData.length === 0) return true;

    // Resample from inputSampleRate down to 16000 Hz
    const ratio = this.inputSampleRate / this.targetSampleRate;
    const resampledLength = Math.floor(channelData.length / ratio);

    for (let i = 0; i < resampledLength; i++) {
      const srcIndex = Math.floor(i * ratio);
      const sample = Math.max(-1, Math.min(1, channelData[srcIndex]));
      // Convert Float32 [-1.0, 1.0] to signed Int16 [-32768, 32767]
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      this.buffer.push(Math.round(int16));

      if (this.buffer.length >= this.chunkSize) {
        const chunk = new Int16Array(this.buffer);
        this.port.postMessage(chunk.buffer, [chunk.buffer]);
        this.buffer = [];
      }
    }

    return true;
  }
}

registerProcessor('pcm-capture-processor', PcmCaptureProcessor);
