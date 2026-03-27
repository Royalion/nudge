import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

/**
 * Fires confetti from a given element's position + plays a short celebration chime.
 * Call `triggerCelebration(element)` with the DOM node to originate confetti from.
 */
export function triggerCelebration(element?: HTMLElement | null) {
  // ── Confetti ──
  if (element) {
    const rect = element.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    // Burst 1: fast spread
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { x, y },
      colors: ['#3B8895', '#1D4E56', '#FFD700', '#FF6B6B', '#34D399', '#A78BFA'],
      startVelocity: 30,
      gravity: 0.8,
      ticks: 60,
      scalar: 0.9,
      disableForReducedMotion: true,
    });

    // Burst 2: slower, wider
    setTimeout(() => {
      confetti({
        particleCount: 30,
        spread: 100,
        origin: { x, y: y - 0.05 },
        colors: ['#3B8895', '#FFD700', '#34D399'],
        startVelocity: 20,
        gravity: 1,
        ticks: 50,
        scalar: 0.7,
        disableForReducedMotion: true,
      });
    }, 150);
  } else {
    // Fallback: center of screen
    confetti({
      particleCount: 80,
      spread: 90,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#3B8895', '#1D4E56', '#FFD700', '#FF6B6B', '#34D399'],
      disableForReducedMotion: true,
    });
  }

  // ── Celebration Sound (Web Audio API synth chime) ──
  playCelebrationSound();
}

function playCelebrationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Play a short ascending major chord arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const durations = [0.12, 0.12, 0.12, 0.25];

    let startTime = ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + durations[i]);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + durations[i] + 0.05);

      startTime += durations[i] * 0.6; // slight overlap for richness
    });

    // Cleanup
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // Audio not available — silent fallback
  }
}

/**
 * Hook: returns a ref and fires confetti when `fire` changes to true.
 */
export function useGoalConfetti(fire: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const hasFired = useRef(false);

  useEffect(() => {
    if (fire && !hasFired.current) {
      hasFired.current = true;
      // Small delay so the element is rendered
      requestAnimationFrame(() => {
        triggerCelebration(ref.current);
      });
    }
  }, [fire]);

  return ref;
}
