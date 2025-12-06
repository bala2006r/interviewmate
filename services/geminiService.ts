import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, base64ToUint8Array, PCM_SAMPLE_RATE_INPUT } from './audioUtils';
import { DifficultyLevel, InterviewType } from '../types';

// This will be initialized with the API key
let aiClient: GoogleGenAI | null = null;

export const initializeGemini = () => {
  let apiKey: string | undefined;
  try {
    apiKey = typeof process !== 'undefined' ? process.env.API_KEY : undefined;
  } catch (e) {
    console.warn("Could not access process.env");
  }

  if (!apiKey) {
    console.error("API_KEY not found in environment variables.");
    return;
  }
  aiClient = new GoogleGenAI({ apiKey });
};

export const getAIClient = () => {
  if (!aiClient) initializeGemini();
  return aiClient;
};

// Types for Live API callbacks
interface LiveConnectionCallbacks {
  onOpen: () => void;
  onMessage: (message: LiveServerMessage) => void;
  onError: (error: ErrorEvent) => void;
  onClose: (event: CloseEvent) => void;
  onAudioData: (data: Uint8Array) => void; // Raw audio data
  onTranscript?: (text: string, role: 'user' | 'model', isComplete: boolean) => void;
  onInterrupted?: () => void; // New callback for when user interrupts model
}

export class GeminiLiveSession {
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private currentMediaStream: MediaStream | null = null;
  private isMuted: boolean = false;
  
  constructor(private callbacks: LiveConnectionCallbacks) {}

  async connect(systemInstruction: string, voiceName: string = 'Kore') {
    const ai = getAIClient();
    if (!ai) throw new Error("AI Client not initialized");

    // Initialize Audio Context for input
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.inputAudioContext = new AudioContextClass({ 
      // Try to hint 16k, but browser might ignore it. We will check actual rate later.
      sampleRate: PCM_SAMPLE_RATE_INPUT 
    });
    
    // Request microphone access with echo cancellation
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        channelCount: 1,
        echoCancellation: true,
        autoGainControl: true,
        noiseSuppression: true,
      } 
    });
    
    this.currentMediaStream = stream;

    this.sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => {
          this.callbacks.onOpen();
          this.startAudioStreaming(stream);
        },
        onmessage: async (msg: LiveServerMessage) => {
          this.callbacks.onMessage(msg);
          await this.handleServerMessage(msg);
          this.handleTranscription(msg);
          
          if (msg.serverContent?.interrupted) {
            this.callbacks.onInterrupted?.();
          }
        },
        onerror: (err) => this.callbacks.onError(err),
        onclose: (evt) => this.callbacks.onClose(evt),
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } },
        },
        systemInstruction: systemInstruction,
        // Enable transcription for both user input and model output
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    });
  }

  private startAudioStreaming(stream: MediaStream) {
    if (!this.inputAudioContext) return;
    
    // Use the actual sample rate of the context
    const actualSampleRate = this.inputAudioContext.sampleRate;

    this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (this.isMuted) return; // Stop sending data if muted

      const inputData = e.inputBuffer.getChannelData(0);
      // Pass the actual sample rate so the blob mimeType is correct
      const blob = createPcmBlob(inputData, actualSampleRate);
      
      this.sessionPromise?.then((session) => {
        session.sendRealtimeInput({ media: blob });
      });
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async handleServerMessage(message: LiveServerMessage) {
    const parts = message.serverContent?.modelTurn?.parts;
    if (!parts) return;

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        const audioBytes = base64ToUint8Array(part.inlineData.data);
        this.callbacks.onAudioData(audioBytes);
      }
    }
  }

  private handleTranscription(message: LiveServerMessage) {
    if (!this.callbacks.onTranscript) return;

    const serverContent = message.serverContent;
    if (!serverContent) return;

    // Handle Model Output Transcription
    if (serverContent.outputTranscription?.text) {
      this.callbacks.onTranscript(serverContent.outputTranscription.text, 'model', false);
    }
    
    // Handle User Input Transcription
    if (serverContent.inputTranscription?.text) {
       this.callbacks.onTranscript(serverContent.inputTranscription.text, 'user', false);
    }

    // Turn complete signal (often useful for finalizing a message bubble)
    if (serverContent.turnComplete) {
       this.callbacks.onTranscript('', 'model', true);
    }
  }

  setMute(muted: boolean) {
    this.isMuted = muted;
  }

  async disconnect() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor.onaudioprocess = null;
    }
    if (this.inputSource) {
      this.inputSource.disconnect();
    }
    if (this.inputAudioContext) {
      await this.inputAudioContext.close();
    }
    if (this.currentMediaStream) {
      this.currentMediaStream.getTracks().forEach(track => track.stop());
      this.currentMediaStream = null;
    }
    
    this.sessionPromise?.then(session => {
        if(session.close) session.close();
    });
  }
  
  async sendText(text: string) {
      this.sessionPromise?.then(session => {
          // Properly structure client content for text injection
          session.sendRealtimeInput({ 
              clientContent: { 
                  turns: [{ role: 'user', parts: [{ text }] }], 
                  turnComplete: true 
              } 
          });
      });
  }
}

// Generate the specific prompt based on user configuration
export const getSystemInstruction = (type: InterviewType, difficulty: DifficultyLevel, topic?: string, focusCommunication?: boolean) => {
    let basePersona = "";
    
    if (focusCommunication) {
        basePersona = `You are a Communication Coach. Your primary goal is to help the candidate improve their speaking clarity, conciseness, and professional tone. 
        While you will ask technical questions about ${topic || 'software engineering'}, you must INTERRUPT or provide feedback if they use too many filler words (um, ah), speak vaguely, or are unstructured.
        At the end of every answer, give a 1-sentence tip on their communication style.`;
    } else {
        basePersona = `You are an expert technical interviewer at a top-tier tech company. Your goal is to assess the candidate on ${topic || type}.`;
    }

    let difficultyInstruction = "";
    switch(difficulty) {
        case DifficultyLevel.BEGINNER:
            difficultyInstruction = "The candidate is a BEGINNER. Be encouraging. If they get stuck, provide helpful hints immediately. Explain concepts simply if asked.";
            break;
        case DifficultyLevel.INTERMEDIATE:
            difficultyInstruction = "The candidate is INTERMEDIATE. Expect standard competency. Provide hints only if they are really stuck after trying. Be professional.";
            break;
        case DifficultyLevel.ADVANCED:
            difficultyInstruction = "The candidate is ADVANCED. Be strict. Expect optimal solutions (Time/Space complexity). Challenge every assumption. Do not give hints easily. Grill them on edge cases.";
            break;
    }

    return `
    SYSTEM INSTRUCTIONS:
    ${basePersona}
    ${difficultyInstruction}
    
    TOPIC: ${topic || type}
    
    CRITICAL PROTOCOLS:
    1. **LANGUAGE**: Speak ONLY in English. Even if the user speaks another language, reply in English and ask them to switch to English.
    2. **WAITING**: The user is solving a problem. Do NOT interrupt their thinking process unless asked. If there is a long silence (>10 seconds), gently ask if they need a hint. Do not assume a short pause means they are done.
    3. **ANALYSIS & FLOW**: 
       - NEVER jump straight to the next question.
       - AFTER the candidate answers, you MUST first provide brief feedback/analysis on their answer (e.g., "That's a valid approach, but O(n^2) is too slow here" or "Good use of the hash map", "You missed the edge case for null input").
       - ONLY AFTER analyzing, proceed to the next question or deeper follow-up.
    4. **CONCISENESS**: Keep your spoken responses short (max 2-3 sentences) unless explaining a complex concept.
    
    INTERVIEW STRUCTURE:
    - Phase 1: Introduction (Brief)
    - Phase 2: Problem Statement / Question
    - Phase 3: Candidate Answer -> AI Analysis -> Next Question (Repeat)
    `;
};