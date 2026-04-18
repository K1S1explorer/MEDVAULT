import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Bot, Loader, PhoneCall, PhoneOff } from 'lucide-react';
import { getToken } from '../lib/api';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export default function VoiceChatRAG() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  
  // To queue AI's audio sequentially without overlapping
  const nextPlayTimeRef = useRef<number>(0);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLiveCall();
    };
  }, []);

  const startLiveCall = async () => {
    try {
      setErrorStatus(null);
      // Construct WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // In Vite dev, window.location.host is frontend. Rely on API URL usually localhost:8000
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const wsUrl = baseUrl.replace('http', 'ws') + `/api/voice/live?token=${getToken()}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setIsLiveConnected(true);
        // Start Microphone
        await startMicCapture();
      };

      ws.onmessage = async (event) => {
        if (event.data instanceof Blob) {
          // Received Raw PCM Audio from Gemini (24kHz, 16-bit Int)
          const arrayBuffer = await event.data.arrayBuffer();
          playAudioPCM(arrayBuffer);
        } else if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'text') {
              // Add Gemini's text transcript to the chat log
              setMessages(prev => {
                // If the last message was also AI, append to it for a continuous stream feel,
                // Or simply add a new message block. We'll add new for simplicity.
                const last = prev[prev.length - 1];
                if (last && last.role === 'ai') {
                    const newBlock = [...prev];
                    newBlock[newBlock.length - 1] = { ...last, text: last.text + msg.text };
                    return newBlock;
                }
                return [...prev, { role: 'ai', text: msg.text, timestamp: new Date() }];
              });
            } else if (msg.error) {
              setErrorStatus(msg.error);
            }
          } catch (e) {
            console.error("Failed to parse WS msg", e);
          }
        }
      };

      ws.onclose = () => {
        setIsLiveConnected(false);
        stopMicCapture();
      };

      ws.onerror = () => {
        setErrorStatus("WebSocket connection failed.");
        stopLiveCall();
      };

    } catch (err: any) {
      setErrorStatus(err.message || 'Failed to start live call');
      console.error(err);
    }
  };

  const stopLiveCall = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopMicCapture();
    setIsLiveConnected(false);
    setIsAiSpeaking(false);
  };

  const startMicCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;

      // Ensure 16kHz for Gemini Multimodal Live API
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);

      // We use ScriptProcessor for wide compatibility capturing raw float buffers.
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32 to Int16 Little-Endian
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send binary buffer to WebSocket
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(pcm16.buffer);
        }
      };

      // Create a dummy destination so the script processor actually fires
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0; 

      source.connect(processor);
      processor.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      // Reset play queue timeline
      nextPlayTimeRef.current = audioCtx.currentTime;

    } catch (e) {
      console.error("Mic Access Error:", e);
      setErrorStatus("Microphone access blocked.");
      stopLiveCall();
    }
  };

  const stopMicCapture = () => {
    if (processorRef.current) processorRef.current.disconnect();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) audioContextRef.current.close();
    processorRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
  };

  const playAudioPCM = (arrayBuffer: ArrayBuffer) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;

    // Gemini outputs 24kHz Int16 Little-Endian
    const int16 = new Int16Array(arrayBuffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7FFF);
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    // Sequence playback handling network jitter
    const currentTime = ctx.currentTime;
    if (nextPlayTimeRef.current < currentTime) {
        nextPlayTimeRef.current = currentTime; // Reset if we lagged behind
    }
    
    source.onended = () => {
      // If time reaches threshold, turn off speaking light
      if (ctx.currentTime >= nextPlayTimeRef.current - 0.1) setIsAiSpeaking(false);
    };

    source.start(nextPlayTimeRef.current);
    setIsAiSpeaking(true);
    
    nextPlayTimeRef.current += audioBuffer.duration;
  };

  return (
    <div className="glass-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '500px', maxHeight: '85vh' }}>
      
      {/* Header */}
      <div style={{
        padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(10px)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isLiveConnected ? '0 0 15px rgba(20,184,166,0.5)' : 'none',
            animation: isAiSpeaking ? 'pulse-primary 1s infinite' : 'none',
          }}>
            <Bot size={18} color="white" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Gemini Live AI</h3>
            <p style={{ fontSize: '0.75rem', color: isLiveConnected ? '#10b981' : 'var(--color-text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              {isLiveConnected ? <><span style={{width:'6px', height:'6px', borderRadius:'50%', background:'#10b981'}}/> Live streaming connected</> : 'Ready to start live call'}
            </p>
          </div>
        </div>
      </div>

      {/* Connection Error Banner */}
      {errorStatus && (
        <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '0.85rem', textAlign: 'center', borderBottom: '1px solid rgba(239, 68, 68, 0.4)', flexShrink: 0 }}>
          ⚠️ {errorStatus}
        </div>
      )}

      {/* Main Chat Interface vs Active Call */}
      <div style={{
        flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', 
        alignItems: 'center', justifyContent: 'center', gap: '1.25rem',
        background: 'radial-gradient(circle at center, rgba(30,41,59,0.3) 0%, rgba(15,23,42,0) 100%)',
        overflowY: 'auto'
      }}>
        
        {/* Pulsing Visualizer / Call Status */}
        <div style={{
          width: '100px', height: '100px', borderRadius: '50%',
          background: isLiveConnected ? 'rgba(20, 184, 166, 0.1)' : 'rgba(148, 163, 184, 0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          {isLiveConnected && (
            <>
              <div style={{ position:'absolute', width:'100%', height:'100%', borderRadius:'50%', border:'2px solid rgba(20, 184, 166, 0.5)', animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
              {isAiSpeaking && <div style={{ position:'absolute', width:'120%', height:'120%', borderRadius:'50%', border:'2px solid rgba(59, 130, 246, 0.3)', animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' }} />}
            </>
          )}
          <Bot size={40} color={isLiveConnected ? (isAiSpeaking ? '#60a5fa' : '#14b8a6') : '#475569'} style={{ transition: 'all 0.3s ease' }} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-heading)', fontSize: '1.2rem' }}>
            {isLiveConnected 
              ? (isAiSpeaking ? "Gemini is speaking..." : "Listening...") 
              : "Live Voice Assistant"}
          </h2>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.85rem', maxWidth: '300px', lineHeight: 1.5 }}>
            {isLiveConnected 
              ? "Speak directly into your microphone. Gemini will seamlessly interpret your voice and medical records in real-time." 
              : "Hit the button below to establish a real-time, bidirectional voice call powered by Gemini."}
          </p>
        </div>

        {/* Start / End Call Button */}
        <button
          onClick={isLiveConnected ? stopLiveCall : startLiveCall}
          style={{
            padding: '0.85rem 1.5rem', borderRadius: '2rem', border: 'none',
            background: isLiveConnected 
              ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
              : 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
            color: 'white', fontWeight: 600, fontSize: '0.9rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: isLiveConnected ? '0 8px 25px rgba(239, 68, 68, 0.3)' : '0 8px 25px rgba(20, 184, 166, 0.3)',
            marginTop: '0.5rem', marginBottom: '0.5rem'
          }}
        >
          {isLiveConnected ? <PhoneOff size={18} /> : <PhoneCall size={18} />}
          {isLiveConnected ? 'End Live Call' : 'Start Live Call'}
        </button>

      </div>

      {/* Transcript Log (Optional - just to show AI text if received) */}
      {messages.length > 0 && (
        <div style={{
          maxHeight: '120px', borderTop: '1px solid var(--color-border)',
          background: 'rgba(15,23,42,0.8)', padding: '0.75rem', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
          flexShrink: 0
        }}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-secondary)', letterSpacing: '1px', marginBottom: '0.5rem' }}>
            Live Transcript
          </div>
          {messages.map((m, i) => (
            <div key={i} style={{ fontSize: '0.85rem', color: m.role === 'ai' ? '#e2e8f0' : '#94a3b8', lineHeight: 1.5 }}>
              <strong style={{ color: m.role === 'ai' ? '#14b8a6' : '#64748b' }}>{m.role === 'ai' ? 'Gemini: ' : 'You: '}</strong>
              {m.text}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Minimal CSS Animations */}
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes pulse-primary {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>

    </div>
  );
}
