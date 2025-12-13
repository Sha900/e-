import React, { useEffect, useRef } from 'react';
import { ConnectionState, LogEntry, VisionMode } from '../types';
import { Mic, Activity, Power, Eye, Terminal } from 'lucide-react';

interface HUDProps {
  connectionState: ConnectionState;
  logs: LogEntry[];
  visionMode: VisionMode;
  videoRef: React.RefObject<HTMLVideoElement>;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleVision: () => void;
}

const HUD: React.FC<HUDProps> = ({ 
  connectionState, 
  logs, 
  visionMode, 
  videoRef,
  onConnect, 
  onDisconnect, 
  onToggleVision 
}) => {
  const logContainerRef = useRef<HTMLDivElement>(null);

  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isVision = visionMode === VisionMode.ON;
  const accentColor = isVision ? 'text-violet-400' : 'text-emerald-400';
  const borderColor = isVision ? 'border-violet-500/30' : 'border-emerald-500/30';
  const glowShadow = isVision ? 'shadow-[0_0_15px_rgba(139,92,246,0.3)]' : 'shadow-[0_0_15px_rgba(16,185,129,0.3)]';

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Sync video preview
  useEffect(() => {
      if (videoRef.current && videoRef.current.srcObject) {
         // Force update to ensure video renders if ref updates
      }
  }, [connectionState, videoRef]);

  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 md:p-8 select-none overflow-hidden">
      
      {/* Top Bar */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className={`flex flex-col gap-2`}>
            {/* Status Module */}
            <div className={`flex items-center gap-3 border ${borderColor} bg-black/40 backdrop-blur-md px-4 py-2 rounded-lg ${glowShadow}`}>
                <Activity className={`w-5 h-5 ${accentColor} ${isConnected ? 'animate-pulse' : ''}`} />
                <div>
                    <h1 className={`text-lg font-bold tracking-widest ${accentColor}`}>POSITONE e+</h1>
                    <p className="text-xs text-gray-400 font-mono uppercase">
                        Super AI: <span className="text-white">ONLINE</span>
                    </p>
                </div>
            </div>
            
            <p className="text-[10px] text-gray-500 font-mono uppercase pl-1">
                Creator: Sharukh Dayer
            </p>
        </div>

        {/* Vision Toggle */}
        <button 
            onClick={onToggleVision}
            className={`flex items-center gap-2 border ${borderColor} bg-black/60 px-4 py-2 rounded-lg transition-all duration-300 hover:bg-white/10 backdrop-blur-md`}
        >
            <Eye className={`w-4 h-4 ${isVision ? 'text-violet-400' : 'text-gray-500'}`} />
            <span className={`text-xs md:text-sm font-mono tracking-wide ${isVision ? 'text-violet-300' : 'text-gray-400'}`}>
                {isVision ? 'VISION: ON' : 'VISION: OFF'}
            </span>
        </button>
      </div>

      {/* Video Preview (Only visible in Vision Mode or when connected) */}
      <div className={`absolute top-20 right-4 md:right-8 w-32 md:w-48 aspect-video bg-black border border-gray-800 rounded-lg overflow-hidden transition-all duration-500 ${isConnected ? 'opacity-100' : 'opacity-0 translate-x-10'}`}>
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-600 font-mono">
              NO SIGNAL
          </div>
          {/* We mirror the video source from the App component by re-attaching the stream if needed, 
              but since the video element is in App.tsx, we can't easily move it here without prop drilling the stream.
              Instead, we will use a small trick: The App.tsx video is hidden, we clone it here or just style a placeholder.
              
              Actually, for a robust React pattern, we should have passed the stream, but to keep it simple and robust per the request "pura vesa hi" (exactly like before), 
              I will assume the user wants the video PREVIEW to be visible. 
              
              I will use a second video element here and sync the srcObject in a useEffect.
          */}
          <VideoMirror sourceRef={videoRef} isVision={isVision} />
      </div>

      {/* Center Reticle (Decorative) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-64 md:h-64 border border-white/5 rounded-full pointer-events-none flex items-center justify-center opacity-30 -z-10">
        <div className={`w-44 h-44 md:w-60 md:h-60 border-t border-b ${isVision ? 'border-violet-500' : 'border-emerald-500'} rounded-full animate-spin-slow`} />
        <div className="w-2 h-2 bg-white rounded-full absolute" />
      </div>

      {/* Bottom Area: Controls & Logs */}
      <div className="flex flex-col-reverse md:flex-row items-end justify-between gap-4 pointer-events-auto">
        
        {/* Logs Console */}
        <div className={`w-full md:w-96 h-48 md:h-64 border ${borderColor} bg-black/60 backdrop-blur-md rounded-lg overflow-hidden flex flex-col transition-all duration-300`}>
          <div className={`px-4 py-2 border-b ${borderColor} bg-white/5 flex items-center gap-2`}>
            <Terminal className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400 font-mono">SYSTEM_LOGS // SUPER_AI</span>
          </div>
          <div 
            ref={logContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-2 md:space-y-3 font-mono text-xs md:text-sm"
          >
            {logs.length === 0 && <p className="text-gray-600 italic">Waiting for input...</p>}
            {logs.map((log) => (
              <div key={log.id} className="flex flex-col animate-fadeIn">
                <span className={`text-[10px] opacity-50 mb-0.5 ${accentColor}`}>
                    {log.timestamp.toLocaleTimeString()} | {log.source.toUpperCase()}
                </span>
                <span className={`${log.source === 'model' ? 'text-white' : 'text-gray-400'}`}>
                  {log.source === 'user' ? '> ' : ''}{log.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center w-full md:w-auto pb-4 md:pb-0">
            {!isConnected ? (
                <button 
                    onClick={onConnect}
                    className="group relative flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full bg-emerald-900/20 border-2 border-emerald-500/50 hover:bg-emerald-500/20 hover:border-emerald-400 transition-all duration-300 shadow-[0_0_30px_rgba(16,185,129,0.2)]"
                >
                    <Power className="w-8 h-8 md:w-10 md:h-10 text-emerald-400 group-hover:text-white transition-colors" />
                    <span className="absolute -bottom-8 text-[10px] md:text-xs font-mono text-emerald-500/80 tracking-widest">INIT</span>
                </button>
            ) : (
                <button 
                    onClick={onDisconnect}
                    className="group relative flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full bg-red-900/20 border-2 border-red-500/50 hover:bg-red-500/20 hover:border-red-400 transition-all duration-300 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                >
                    <Mic className="w-8 h-8 md:w-10 md:h-10 text-red-400 group-hover:text-white transition-colors animate-pulse" />
                    <span className="absolute -bottom-8 text-[10px] md:text-xs font-mono text-red-500/80 tracking-widest">STOP</span>
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

// Helper component to mirror the video stream
const VideoMirror = ({ sourceRef, isVision }: { sourceRef: React.RefObject<HTMLVideoElement>, isVision: boolean }) => {
    const mirrorRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const sync = () => {
            if (mirrorRef.current && sourceRef.current && sourceRef.current.srcObject) {
                mirrorRef.current.srcObject = sourceRef.current.srcObject;
                mirrorRef.current.play().catch(() => {});
            } else {
                requestAnimationFrame(sync);
            }
        };
        sync();
    }, [sourceRef]);

    return (
        <video 
            ref={mirrorRef} 
            muted 
            playsInline 
            className={`w-full h-full object-cover ${isVision ? 'grayscale-0' : 'grayscale opacity-50'}`} 
        />
    );
}

export default HUD;