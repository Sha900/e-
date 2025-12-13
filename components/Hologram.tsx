import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Icosahedron, Torus, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { VisionMode } from '../types';

interface HologramProps {
  volume: number; // 0 to 1
  visionMode: VisionMode;
}

// Simple synthesizer for futuristic UI sounds without external assets
const playTransitionSound = (mode: VisionMode) => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (mode === VisionMode.ON) {
        // "Power Up" Sweep
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.4);
        
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        osc.start(now);
        osc.stop(now + 0.4);
    } else {
        // "Power Down" Drop
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        osc.start(now);
        osc.stop(now + 0.3);
    }
  } catch (e) {
    console.error("Audio synth failed", e);
  }
};

const Hologram: React.FC<HologramProps> = ({ volume, visionMode }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Transition State
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Smooth volume transition
  const smoothVol = useRef(0);

  // Dynamic Colors
  const primaryColor = visionMode === VisionMode.ON ? '#8b5cf6' : '#10b981'; // Purple (Vision) vs Emerald (Default)
  const secondaryColor = visionMode === VisionMode.ON ? '#3b82f6' : '#34d399';

  // Handle Transition Effects
  useEffect(() => {
      // Play Sound
      playTransitionSound(visionMode);

      if (visionMode === VisionMode.ON) {
          setIsTransitioning(true);
          const timer = setTimeout(() => setIsTransitioning(false), 600); // 600ms shockwave
          return () => clearTimeout(timer);
      }
  }, [visionMode]);

  useFrame((state, delta) => {
    // Lerp volume for smoothness
    smoothVol.current = THREE.MathUtils.lerp(smoothVol.current, volume, 0.1);
    
    const time = state.clock.getElapsedTime();
    let pulse = 1 + smoothVol.current * 1.5;

    // Normal pulsating effect for Vision Mode
    if (visionMode === VisionMode.ON && !isTransitioning) {
        const visionPulse = Math.sin(time * 3) * 0.15; // Rhythmic breathing
        pulse += visionPulse;
    }

    // --- TRANSITION ANIMATION OVERRIDE ---
    let rotationSpeed = 1;
    let transitionScale = 0;
    
    if (isTransitioning) {
        // High speed spin
        rotationSpeed = 20; 
        // Shockwave expansion
        transitionScale = Math.sin(time * 20) * 0.5; 
        pulse += transitionScale; 
    }
    // -------------------------------------

    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.2 * rotationSpeed;
      meshRef.current.rotation.y += delta * 0.5 * rotationSpeed;
      meshRef.current.scale.setScalar(pulse);
    }

    if (ringRef.current) {
      ringRef.current.rotation.x -= delta * 0.5;
      ringRef.current.rotation.z += delta * 0.2 * (isTransitioning ? 5 : 1);
      ringRef.current.scale.setScalar((1.5 + smoothVol.current * 0.5) + (transitionScale * 0.5));
    }
    
    if (coreRef.current) {
        coreRef.current.scale.setScalar(0.5 + Math.sin(time * 2) * 0.1 + smoothVol.current + (isTransitioning ? 0.5 : 0));
    }

    if (groupRef.current) {
        // Floating effect
        groupRef.current.position.y = Math.sin(time) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Outer Wireframe Shell */}
      <Icosahedron args={[1.5, 1]} ref={meshRef}>
        <meshBasicMaterial 
            color={isTransitioning ? "white" : primaryColor} 
            wireframe 
            transparent 
            opacity={isTransitioning ? 0.8 : 0.3} 
        />
      </Icosahedron>

      {/* Rotating Ring */}
      <Torus args={[2.2, 0.05, 16, 100]} ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
         <meshBasicMaterial 
            color={isTransitioning ? "#cyan" : secondaryColor} 
            transparent 
            opacity={0.6} 
         />
      </Torus>

      {/* Inner Core */}
      <Sphere args={[0.8, 32, 32]} ref={coreRef}>
        <meshBasicMaterial 
            color={isTransitioning ? "white" : primaryColor} 
            wireframe 
            transparent 
            opacity={isTransitioning ? 0.5 : 0.1} 
        />
      </Sphere>
      
      {/* Glow Effect (Simulated with Sphere) */}
      <Sphere args={[0.6, 16, 16]}>
        <meshBasicMaterial 
            color={visionMode === VisionMode.ON || isTransitioning ? "white" : "#ccfbf1"} 
            transparent 
            opacity={(0.8 + smoothVol.current) * (isTransitioning ? 1.5 : 1)} 
        />
      </Sphere>

    </group>
  );
};

export default Hologram;