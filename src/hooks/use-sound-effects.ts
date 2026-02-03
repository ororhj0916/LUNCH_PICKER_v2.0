import { useCallback, useRef } from "react";

export function useSoundEffects() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
        masterGainRef.current = audioContextRef.current.createGain();
        masterGainRef.current.gain.value = 0.3; // Global volume (30%)
        masterGainRef.current.connect(audioContextRef.current.destination);
      }
    }
    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume();
    }
  }, []);

  const playTone = useCallback(
    (freq: number, type: OscillatorType, duration: number, startTime = 0) => {
      initAudio();
      if (!audioContextRef.current || !masterGainRef.current) return;

      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

      // Envelope to avoid clicking
      gain.gain.setValueAtTime(0, ctx.currentTime + startTime);
      gain.gain.linearRampToValueAtTime(1, ctx.currentTime + startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + startTime + duration
      );

      osc.connect(gain);
      gain.connect(masterGainRef.current);

      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration + 0.1);
    },
    [initAudio]
  );

  const playHover = useCallback(() => {
    // Short high blip
    playTone(800, "square", 0.05);
  }, [playTone]);

  const playClick = useCallback(() => {
    // Solid selection sound
    playTone(400, "square", 0.1);
    playTone(600, "square", 0.1, 0.05);
  }, [playTone]);

  const playTick = useCallback(() => {
    // Mechanical ticking for shuffling
    playTone(200, "sawtooth", 0.03);
  }, [playTone]);

  const playSuccess = useCallback(() => {
    // Power up / Zelda item get style
    const now = 0;
    playTone(440, "square", 0.1, now); // A4
    playTone(554, "square", 0.1, now + 0.1); // C#5
    playTone(659, "square", 0.1, now + 0.2); // E5
    playTone(880, "square", 0.4, now + 0.3); // A5
  }, [playTone]);

  const playError = useCallback(() => {
    playTone(150, "sawtooth", 0.3);
    playTone(100, "sawtooth", 0.3, 0.1);
  }, [playTone]);

  return {
    playHover,
    playClick,
    playTick,
    playSuccess,
    playError,
  };
}
