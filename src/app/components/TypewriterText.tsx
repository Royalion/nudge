import { useState, useEffect, useRef } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number; // ms per word
  onComplete?: () => void;
}

export function TypewriterText({ text, speed = 30, onComplete }: TypewriterTextProps) {
  const [displayedWords, setDisplayedWords] = useState(0);
  const words = text.split(/(\s+)/); // preserve whitespace
  const completedRef = useRef(false);

  useEffect(() => {
    if (displayedWords >= words.length) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
      return;
    }

    const timer = setTimeout(() => {
      // Reveal 2-3 words at a time for natural feel
      setDisplayedWords(prev => Math.min(prev + 2, words.length));
    }, speed);

    return () => clearTimeout(timer);
  }, [displayedWords, words.length, speed, onComplete]);

  const visible = words.slice(0, displayedWords).join('');

  return (
    <span className="whitespace-pre-wrap">
      {visible}
      {displayedWords < words.length && (
        <span className="inline-block w-[3px] h-[1em] bg-stride-400 ml-0.5 align-text-bottom animate-pulse rounded-full" />
      )}
    </span>
  );
}
