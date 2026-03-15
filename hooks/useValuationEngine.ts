'use client';
import { useEffect, useRef } from 'react';
import { useApexStore } from '@/store/apex-store';
import { GameEngine } from '@/lib/game-engine';

export function useValuationEngine() {
  const { isLive, tickGameClock, processGameEvent, gameClock, addLogEntry, pushLatency } = useApexStore();
  const engineRef = useRef<GameEngine | null>(null);
  const rafRef    = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const clockAccRef = useRef<number>(0);

  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new GameEngine();
    }

    if (!isLive) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const tick = (timestamp: number) => {
      const delta = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
      lastTimeRef.current = timestamp;
      const t0 = performance.now();

      // Update game clock (1 real second = ~3 game seconds for pacing)
      clockAccRef.current += delta;
      if (clockAccRef.current >= 333) {
        tickGameClock(1);
        clockAccRef.current = 0;
      }

      // Run game engine tick
      const clock = useApexStore.getState().gameClock;
      if (clock > 0 && engineRef.current) {
        const events = engineRef.current.update(delta, clock);
        events.forEach(processGameEvent);
      }

      const engineLatency = Math.round(performance.now() - t0);
      pushLatency(engineLatency);

      if (useApexStore.getState().gameClock > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        addLogEntry('FINAL BUZZER — Game session complete. All positions settled.', 'ALERT');
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isLive]);

  return { engine: engineRef.current };
}
