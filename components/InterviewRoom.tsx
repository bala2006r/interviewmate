import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, Code, Video as VideoIcon, Play, MessageSquare, Maximize2, Terminal, User, AlertCircle } from 'lucide-react';
import { GeminiLiveSession, getSystemInstruction } from '../services/geminiService';
import { LiveServerMessage, Type } from '@google/genai';
import { InterviewConfig, InterviewType } from '../types';
import { decodeAudioData } from '../services/audioUtils';

interface InterviewRoomProps {
  config: InterviewConfig;
  onEndSession: () => void;
}

export const InterviewRoom: React.FC<InterviewRoomProps> = ({ config, onEndSession }) => {
  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [code, setCode] = useState<string>("// Write your solution here...\n\nfunction solution() {\n  \n}");
  const [messages, setMessages] = useState<{role: string, text: string}[]>([]);
  const [status, setStatus] = useState("Ready to start");
  const [cameraError, setCameraError] = useState(false);
  const [aiState, setAiState] = useState<'idle' | 'listening' | 'speaking'>('idle');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const liveSessionRef = useRef<GeminiLiveSession | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Track audio play time for queuing
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Setup Camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraError(false);
      } catch (err) {
        console.error("Error accessing camera:", err);
        setCameraError(true);
      }
    };
    startCamera();
    
    return () => {
      // Cleanup camera
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      
      stopSession();
    };
  }, []);

  // Update mute state in session
  useEffect(() => {
    if (liveSessionRef.current) {
      liveSessionRef.current.setMute(isMuted);
    }
  }, [isMuted]);

  const stopSession = async () => {
    if (liveSessionRef.current) {
        await liveSessionRef.current.disconnect();
        liveSessionRef.current = null;
    }
    if (audioContextRef.current) {
        // Stop all playing sources
        sourcesRef.current.forEach(source => {
            try { source.stop(); } catch(e) {}
        });
        sourcesRef.current.clear();
        
        await audioContextRef.current.close();
        audioContextRef.current = null;
    }
  };

  const handleStartInterview = async () => {
    if (isLive) return;
    
    // Ensure cleanup of previous sessions
    await stopSession();
    
    setStatus("Connecting to AI Interviewer...");
    setAiState('idle');
    
    // Create AudioContext for playback
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    
    // Reset queue cursor
    nextStartTimeRef.current = audioContextRef.current.currentTime;
    
    liveSessionRef.current = new GeminiLiveSession({
      onOpen: () => {
        setIsLive(true);
        setStatus("Live Session Active");
        setAiState('listening');
      },
      onMessage: (msg) => {
        // Handled via specific callbacks
      },
      onError: (err) => {
        console.error("Live Error:", err);
        setStatus("Connection Error");
        setIsLive(false);
        setAiState('idle');
      },
      onClose: () => {
        setIsLive(false);
        setStatus("Session Ended");
        setAiState('idle');
      },
      onAudioData: async (rawAudio) => {
        setAiState('speaking');
        if (audioContextRef.current) {
            try {
                const buffer = await decodeAudioData(rawAudio, audioContextRef.current);
                playAudio(buffer);
            } catch (e) {
                console.error("Error decoding audio:", e);
            }
        }
      },
      onTranscript: (text, role, isComplete) => {
        if (role === 'user') setAiState('listening');

        setMessages(prev => {
          const newHistory = [...prev];
          const lastMsg = newHistory[newHistory.length - 1];

          // If the last message is from the same role, append to it
          if (lastMsg && lastMsg.role === role) {
             lastMsg.text += text;
             return [...newHistory];
          } 
          // Otherwise start a new message bubble
          else if (text.trim().length > 0) {
             return [...newHistory, { role, text }];
          }
          return prev;
        });
      },
      onInterrupted: () => {
          // Immediately stop all audio when user interrupts
          if (audioContextRef.current) {
             sourcesRef.current.forEach(source => {
                 try { source.stop(); } catch (e) {}
             });
             sourcesRef.current.clear();
             nextStartTimeRef.current = audioContextRef.current.currentTime;
             setAiState('listening');
          }
      }
    });

    // Generate Dynamic Prompt
    const systemInstruction = getSystemInstruction(config.type, config.difficulty, config.topic, config.focusOnCommunication);
    
    // Determine Voice
    let voiceName = 'Kore'; // Default
    if (config.focusOnCommunication) voiceName = 'Puck';
    if (config.type === InterviewType.SYSTEM_DESIGN) voiceName = 'Fenrir';

    // Add context to log
    setMessages([{ role: 'system', text: `SESSION STARTED\nType: ${config.type}\nDifficulty: ${config.difficulty}\nTopic: ${config.topic || 'General'}` }]);

    try {
      await liveSessionRef.current.connect(systemInstruction, voiceName);
      
      const triggerMsg = config.focusOnCommunication 
        ? "Hello. I am ready to practice my communication skills."
        : "Hello. I am ready for the interview.";

      // Trigger the AI to talk first
      await liveSessionRef.current.sendText(triggerMsg);
    } catch (e) {
      console.error(e);
      setStatus("Failed to connect");
      setIsLive(false);
    }
  };

  const playAudio = (buffer: AudioBuffer) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    
    // Reset nextStartTime if it has fallen behind currentTime (drift correction)
    if (nextStartTimeRef.current < ctx.currentTime) {
        nextStartTimeRef.current = ctx.currentTime;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += buffer.duration;
    
    sourcesRef.current.add(source);
    source.onended = () => {
      sourcesRef.current.delete(source);
      if (sourcesRef.current.size === 0) {
          // Queue is empty, assume AI is done for now
          setAiState('listening');
          // Reset cursor for next turn to prevent gaps
          if (audioContextRef.current) {
             nextStartTimeRef.current = audioContextRef.current.currentTime;
          }
      }
    };
  };

  const handleEnd = async () => {
    await stopSession();
    onEndSession();
  };

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`}></div>
                {config.type} <span className="text-slate-500 text-xs px-2 py-0.5 border border-slate-700 rounded-full">{config.difficulty}</span>
            </h2>
            <span className="text-slate-500 text-sm border-l border-slate-700 pl-4">{status}</span>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={handleEnd}
                className="bg-red-500/10 text-red-400 hover:bg-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
                End Session
            </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Video & AI */}
        <div className="w-1/3 bg-slate-900 border-r border-slate-800 flex flex-col">
            <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto">
                {/* User Camera */}
                <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-700 shadow-2xl flex items-center justify-center">
                    {cameraError ? (
                        <div className="text-slate-500 flex flex-col items-center gap-2">
                             <AlertCircle size={32} />
                             <span className="text-sm">Camera Off / Unavailable</span>
                        </div>
                    ) : (
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                    )}
                    <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-md px-2 py-1 rounded text-xs text-white flex items-center gap-2">
                        <User size={12} /> You
                    </div>
                </div>

                {/* AI Avatar / Visualization */}
                <div className={`relative aspect-video rounded-xl overflow-hidden border transition-all duration-300 flex items-center justify-center ${
                    aiState === 'speaking' ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-slate-800 border-slate-700'
                }`}>
                    {/* Visualizer Animation */}
                    <div className="flex items-center gap-1 h-12">
                         {[1,2,3,4,5].map(i => (
                             <div key={i} className={`w-2 rounded-full transition-all duration-100 ${
                                 aiState === 'speaking' ? 'bg-indigo-400 animate-[bounce_1s_infinite]' : 'bg-slate-600 h-2'
                                }`} style={{ animationDelay: `${i * 0.1}s`, height: aiState === 'speaking' ? '2rem' : '0.5rem' }}></div>
                         ))}
                    </div>
                    
                    {/* State Badge */}
                    <div className="absolute top-3 right-3">
                         {aiState === 'speaking' && <span className="text-xs bg-indigo-500 text-white px-2 py-1 rounded-full animate-pulse">Speaking</span>}
                         {aiState === 'listening' && <span className="text-xs bg-emerald-500/80 text-white px-2 py-1 rounded-full">Listening...</span>}
                    </div>

                    <div className="absolute bottom-3 left-3 bg-indigo-500/20 backdrop-blur-md px-2 py-1 rounded text-xs text-indigo-300 border border-indigo-500/30 flex items-center gap-2">
                        <VideoIcon size={12} /> AI Interviewer
                    </div>
                </div>

                {/* Transcript / Chat Log */}
                <div className="flex-1 bg-slate-800/50 rounded-xl p-4 border border-slate-700 overflow-y-auto min-h-[200px] flex flex-col-reverse">
                     <div className="space-y-4">
                        {messages.length === 0 && <span className="text-slate-600 text-sm italic">Session log initializing...</span>}
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`text-sm p-3 rounded-lg ${
                                msg.role === 'user' ? 'bg-slate-700/50 text-slate-200 ml-4' : 
                                msg.role === 'system' ? 'bg-indigo-900/20 text-indigo-200 border border-indigo-500/30 text-xs font-mono whitespace-pre-wrap' :
                                'bg-indigo-600/10 text-indigo-100 mr-4 border border-indigo-500/10'
                            }`}>
                                <span className="font-bold text-[10px] uppercase opacity-50 block mb-1 tracking-wider">
                                    {msg.role === 'user' ? 'YOU' : msg.role === 'system' ? 'SYSTEM' : 'INTERVIEWER'}
                                </span>
                                {msg.text}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="p-4 border-t border-slate-800 bg-slate-900">
                <div className="flex justify-center gap-4">
                    <button 
                        onClick={() => setIsMuted(!isMuted)}
                        className={`p-4 rounded-full transition-all ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                    >
                        {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                    </button>
                    
                    {!isLive ? (
                        <button 
                            onClick={handleStartInterview}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all"
                        >
                            <Play size={20} fill="currentColor" /> Start
                        </button>
                    ) : (
                        <button 
                            onClick={handleEnd}
                            className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-red-500/25 flex items-center gap-2 transition-all"
                        >
                            <PhoneOff size={20} /> Leave
                        </button>
                    )}
                </div>
            </div>
        </div>

        {/* Right Panel: Code Editor */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e]">
            <div className="bg-[#252526] h-10 flex items-center px-4 border-b border-[#3e3e42] justify-between">
                <span className="text-sm text-slate-300 flex items-center gap-2">
                    <Code size={14} className="text-blue-400" />
                    solution.js
                </span>
                <span className="text-xs text-slate-500">JavaScript</span>
            </div>
            <div className="flex-1 relative">
                <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full h-full bg-[#1e1e1e] text-[#d4d4d4] p-4 font-mono text-sm resize-none focus:outline-none leading-relaxed"
                    spellCheck="false"
                />
            </div>
            <div className="bg-[#252526] p-4 border-t border-[#3e3e42] flex justify-between items-center">
                 <div className="flex items-center gap-2">
                    <Terminal size={16} className="text-slate-400" />
                    <span className="text-xs text-slate-400">Console</span>
                 </div>
                 <button className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded transition-colors">
                    Run Code
                 </button>
            </div>
        </div>
      </div>
    </div>
  );
};