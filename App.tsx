import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import Hologram from './components/Hologram';
import HUD from './components/HUD';
import { LiveClient } from './services/liveClient';
import { ConnectionState, LogEntry, VisionMode } from './types';

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [visionMode, setVisionMode] = useState<VisionMode>(VisionMode.OFF);
  const [audioVolume, setAudioVolume] = useState<number>(0);

  const liveClientRef = useRef<LiveClient | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize Client
  useEffect(() => {
    const apiKey = process.env.API_KEY;
    if (apiKey) {
      liveClientRef.current = new LiveClient(apiKey);
      
      // Bind Callbacks
      liveClientRef.current.onStateChange = (stateStr) => {
         setConnectionState(stateStr as ConnectionState);
      };
      
      liveClientRef.current.onLog = (text, source) => {
          // Detect Vision Mode trigger in text
          if (source === 'user' && text.toLowerCase().includes('vision mode on')) {
              setVisionMode(VisionMode.ON);
          }
          if (source === 'user' && text.toLowerCase().includes('vision mode off')) {
            setVisionMode(VisionMode.OFF);
          }

          setLogs(prev => [...prev, {
              id: Math.random().toString(36).substring(7),
              source,
              text,
              timestamp: new Date()
          }]);
      };

      liveClientRef.current.onAudioLevel = (level) => {
          setAudioVolume(level);
      };
    }

    return () => {
        if(liveClientRef.current) {
            liveClientRef.current.disconnect();
        }
    };
  }, []);

  const handleConnect = useCallback(() => {
    if (liveClientRef.current) {
        liveClientRef.current.connect(videoRef.current);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    if (liveClientRef.current) {
        liveClientRef.current.disconnect();
    }
  }, []);

  const handleToggleVision = useCallback(() => {
     const newMode = visionMode === VisionMode.OFF ? VisionMode.ON : VisionMode.OFF;
     setVisionMode(newMode);
     
     if (connectionState === ConnectionState.CONNECTED && liveClientRef.current) {
         liveClientRef.current.sendMessage(
             newMode === VisionMode.ON 
             ? "Vision Mode Activated. I am now analyzing the visual stream." 
             : "Vision Mode Deactivated."
         );
     }
  }, [visionMode, connectionState]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      
      {/* Hidden Video Element for Stream Capture */}
      <video ref={videoRef} className="hidden" muted playsInline />

      {/* 3D Background / Hologram Layer */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
          <color attach="background" args={['#050505']} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} color={visionMode === VisionMode.ON ? "#8b5cf6" : "#10b981"} />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color="blue" />
          
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          
          <Hologram volume={audioVolume} visionMode={visionMode} />
          
          <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            maxPolarAngle={Math.PI / 1.5} 
            minPolarAngle={Math.PI / 3}
          />
        </Canvas>
      </div>

      {/* Grid Overlay */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
            backgroundImage: `linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
        }}
      ></div>

      {/* UI Overlay */}
      <HUD 
        connectionState={connectionState}
        logs={logs}
        visionMode={visionMode}
        videoRef={videoRef}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onToggleVision={handleToggleVision}
      />
    </div>
  );
};

export default App;