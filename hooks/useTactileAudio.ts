import { useRef } from 'react';

export const useTactileAudio = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const droneNodeRef = useRef<{
    osc1: OscillatorNode;
    osc2: OscillatorNode;
    filter: BiquadFilterNode;
    gainNode: GainNode;
  } | null>(null);

  const initContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtxRef.current = new AudioCtxClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  };

  const playClick = () => {
    const ctx = initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // Primary keystroke dynamic click transient (simulating high tension metal tap)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1100, now);
    osc1.frequency.exponentialRampToValueAtTime(150, now + 0.035);
    
    gain1.gain.setValueAtTime(0.06, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    // High-pitched switch contact tick
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(3400, now);
    osc2.frequency.setValueAtTime(2600, now + 0.001);
    
    gain2.gain.setValueAtTime(0.04, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.006);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.04);
    osc2.stop(now + 0.008);
  };

  const startDeepDrone = () => {
    const ctx = initContext();
    if (!ctx) return;
    
    if (droneNodeRef.current) return;

    const now = ctx.currentTime;
    
    // Heavy tactical deep research engine hum (55 Hz low A sine wave base)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(55, now);
    
    // Slow LFO to modulate filter and make the engine breathe
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(0.18, now); // ~18 second cycle
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(2.5, now);
    filter.frequency.setValueAtTime(130, now);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(40, now);
    
    osc2.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    // Smooth ramp in to prevent pops
    gainNode.gain.linearRampToValueAtTime(0.24, now + 1.2);

    osc1.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);

    droneNodeRef.current = { osc1, osc2, filter, gainNode };
  };

  const stopDeepDrone = () => {
    if (!droneNodeRef.current || !audioCtxRef.current) return;
    
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;
    const { osc1, osc2, gainNode } = droneNodeRef.current;

    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.6);

    setTimeout(() => {
      try {
        osc1.stop();
        osc2.stop();
      } catch (e) {}
      droneNodeRef.current = null;
    }, 700);
  };

  const playTransition = () => {
    const ctx = initContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Synth pulse: Sub-bass sweeping up into low-mid frequency to create anticipation
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(80, now);
    subOsc.frequency.exponentialRampToValueAtTime(320, now + 0.45);
    subGain.gain.setValueAtTime(0.18, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.5);

    // 2. High-frequency digital artifact: Staggered sine sweeps mimicking datastream transients
    for (let i = 0; i < 6; i++) {
      const delay = i * 0.05;
      const freq = 2200 + i * 650;
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      
      // Dynamic micro-sweeping pitch slide
      osc.frequency.exponentialRampToValueAtTime(freq / 1.8, now + delay + 0.06);

      gain.gain.setValueAtTime(0.03, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + delay);
      osc.stop(now + delay + 0.07);
    }

    // 3. Noise glitch: sputtered bandpassed white noise simulation for alchemical static
    const bufferSize = ctx.sampleRate * 0.12; // 120ms block
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(9000, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(14000, now + 0.12);
    noiseFilter.Q.setValueAtTime(12, now);

    const noiseGain = ctx.createGain();
    // Fragmented sputtering trigger schedule
    noiseGain.gain.setValueAtTime(0.06, now);
    noiseGain.gain.setValueAtTime(0.01, now + 0.03);
    noiseGain.gain.setValueAtTime(0.05, now + 0.06);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseNode.start(now);
    noiseNode.stop(now + 0.13);
  };

  const playShimmer = () => {
    const ctx = initContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      
      gain.gain.setValueAtTime(0.025, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.23);
    });
  };

  const playSuccess = () => {
    const ctx = initContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    osc1.frequency.setValueAtTime(659.25, now + 0.08);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now);
    osc2.frequency.setValueAtTime(1046.50, now + 0.08);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.3);
  };

  return { playClick, startDeepDrone, stopDeepDrone, playTransition, playShimmer, playSuccess };
};
