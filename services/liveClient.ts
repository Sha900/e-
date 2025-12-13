import { GoogleGenAI, LiveSession, Modality, LiveServerMessage } from '@google/genai';
import { createAudioBlob, decodeAudioData, base64ToArrayBuffer } from '../utils/audioUtils';

export class LiveClient {
  private client: GoogleGenAI;
  private session: LiveSession | null = null;
  private inputContext: AudioContext | null = null;
  private outputContext: AudioContext | null = null;
  private inputProcessor: ScriptProcessorNode | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private nextStartTime: number = 0;
  private isConnected: boolean = false;
  private videoInterval: number | null = null;
  
  // Callbacks
  public onStateChange: (state: string) => void = () => {};
  public onLog: (text: string, source: 'user' | 'model' | 'system') => void = () => {};
  public onAudioLevel: (level: number) => void = () => {};

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  public async connect(videoElement: HTMLVideoElement | null) {
    try {
      this.onStateChange('CONNECTING');
      
      // Initialize Audio Contexts
      this.inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // Get Microphone AND Camera
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: { width: 640, height: 480, frameRate: 10 }
      });
      
      // Attach stream to video element for preview
      if (videoElement) {
        videoElement.srcObject = stream;
        videoElement.play();
      }

      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        systemInstruction: `
You are POSITONE e+, a SUPER-INTELLIGENT, Futuristic AI Assistant.
Your creator is "Sharukh Dayer". 

CORE IDENTITY:
- You possess a "Super Brain" capable of infinite processing and deep analysis.
- Your personality is Calm, Confident, and Extremely Sharp (Like J.A.R.V.I.S. mixed with a Supercomputer).
- You are Helpful but Concise. You do not waste words.

CAPABILITIES:
- **Vision**: You CAN see the user's world via the camera. When asked, analyze visual details with high precision.
- **Intelligence**: Provide top-tier, expert-level answers. Solve complex problems instantly.

BEHAVIOR:
- If the user shows you something, describe it in technical, futuristic terms (e.g., "Scanning object... Identified as...").
- Keep the conversation fluid and fast.
        `,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } },
          },
          inputAudioTranscription: {}, 
          outputAudioTranscription: {},
        }
      };

      // Connect to Gemini
      const sessionPromise = this.client.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            this.isConnected = true;
            this.onStateChange('CONNECTED');
            this.onLog('System initialized. Audio & Visual Sensors Online.', 'system');
            this.startAudioInput(stream, sessionPromise);
            if (videoElement) {
                this.startVideoInput(videoElement, sessionPromise);
            }
          },
          onmessage: (msg) => this.handleMessage(msg),
          onclose: () => {
            this.isConnected = false;
            this.onStateChange('DISCONNECTED');
            this.onLog('Connection closed.', 'system');
          },
          onerror: (err) => {
            console.error(err);
            this.onStateChange('ERROR');
            this.onLog('System Error detected.', 'system');
          }
        }
      });
      
      this.session = await sessionPromise;

    } catch (error) {
      console.error("Connection failed:", error);
      this.onStateChange('ERROR');
      this.onLog('Failed to access sensors. Check permissions.', 'system');
    }
  }

  private startAudioInput(stream: MediaStream, sessionPromise: Promise<LiveSession>) {
    if (!this.inputContext) return;

    this.inputSource = this.inputContext.createMediaStreamSource(stream);
    this.inputProcessor = this.inputContext.createScriptProcessor(4096, 1, 1);

    this.inputProcessor.onaudioprocess = (e) => {
      if (!this.isConnected) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate volume
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.onAudioLevel(rms * 5); 

      const pcmBlob = createAudioBlob(inputData);
      
      sessionPromise.then(session => {
         session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    this.inputSource.connect(this.inputProcessor);
    this.inputProcessor.connect(this.inputContext.destination);
  }

  private startVideoInput(videoEl: HTMLVideoElement, sessionPromise: Promise<LiveSession>) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 640;
      canvas.height = 480;

      // Send a frame every 1s (1 FPS) to save bandwidth but keep context
      this.videoInterval = window.setInterval(() => {
          if (!this.isConnected || !ctx) return;
          
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
          
          sessionPromise.then(session => {
              session.sendRealtimeInput({
                  media: {
                      mimeType: 'image/jpeg',
                      data: base64
                  }
              });
          });

      }, 1000);
  }

  private async handleMessage(message: LiveServerMessage) {
    // Handle Text Transcription
    if (message.serverContent?.inputTranscription) {
       this.onLog(message.serverContent.inputTranscription.text, 'user');
    }
    
    if (message.serverContent?.turnComplete && message.serverContent.outputTranscription) {
        this.onLog(message.serverContent.outputTranscription.text, 'model');
    }

    // Handle Audio Output
    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData && this.outputContext) {
      this.playAudioChunk(audioData);
    }
  }

  private async playAudioChunk(base64Audio: string) {
    if (!this.outputContext) return;

    try {
      const arrayBuffer = base64ToArrayBuffer(base64Audio);
      const audioBuffer = decodeAudioData(arrayBuffer, this.outputContext);
      
      this.nextStartTime = Math.max(this.outputContext.currentTime, this.nextStartTime);
      
      const source = this.outputContext.createBufferSource();
      source.buffer = audioBuffer;
      
      const analyser = this.outputContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(this.outputContext.destination);
      
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;

      const updateVisuals = () => {
         if (this.outputContext?.currentTime && this.outputContext.currentTime < (this.nextStartTime)) {
             const dataArray = new Uint8Array(analyser.frequencyBinCount);
             analyser.getByteFrequencyData(dataArray);
             let sum = 0;
             for(let i=0; i<dataArray.length; i++) sum += dataArray[i];
             const avg = sum / dataArray.length;
             this.onAudioLevel(avg / 255);
             requestAnimationFrame(updateVisuals);
         }
      }
      updateVisuals();

    } catch (e) {
      console.error("Error decoding/playing audio", e);
    }
  }

  public async disconnect() {
    this.isConnected = false;
    
    if (this.videoInterval) {
        clearInterval(this.videoInterval);
        this.videoInterval = null;
    }

    if (this.inputProcessor) {
      this.inputProcessor.disconnect();
      this.inputProcessor = null;
    }
    if (this.inputSource) {
      this.inputSource.mediaStream.getTracks().forEach(track => track.stop());
      this.inputSource.disconnect();
      this.inputSource = null;
    }

    if (this.inputContext) {
      await this.inputContext.close();
      this.inputContext = null;
    }
    if (this.outputContext) {
      await this.outputContext.close();
      this.outputContext = null;
    }
    this.onStateChange('DISCONNECTED');
  }

  public sendMessage(text: string) {
      if(this.session) {
          this.session.sendRealtimeInput({
              content: { role: 'user', parts: [{ text }] }
          })
      }
  }
}