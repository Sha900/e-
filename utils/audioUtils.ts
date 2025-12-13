import { Blob } from '@google/genai';

// Convert Float32Array (from AudioBuffer) to PCM Int16 used by Gemini
export const floatTo16BitPCM = (input: Float32Array): Int16Array => {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
};

// Create a Blob format expected by Gemini Live API
export const createAudioBlob = (data: Float32Array): Blob => {
  const pcmData = floatTo16BitPCM(data);
  const uint8Array = new Uint8Array(pcmData.buffer);
  
  let binary = '';
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64 = btoa(binary);

  return {
    data: base64,
    mimeType: 'audio/pcm;rate=16000',
  };
};

// Base64 decoding helper
export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// Decode raw PCM 24kHz (default Gemini output) to AudioBuffer
export const decodeAudioData = (
  arrayBuffer: ArrayBuffer,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): AudioBuffer => {
  const dataInt16 = new Int16Array(arrayBuffer);
  const frameCount = dataInt16.length / numChannels;
  const audioBuffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return audioBuffer;
};