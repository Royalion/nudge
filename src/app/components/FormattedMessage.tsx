import React from 'react';

/**
 * Renders AI text with rich formatting:
 * - **bold** text
 * - *italic* text
 * - Numbered questions (1. ... 2. ...) as styled cards
 * - Bullet points (- item or • item)
 * - Line breaks preserved
 * - Inline code `text`
 */
export function FormattedMessage({ text }: { text: string }) {
  const { intro, questions } = parseQuestions(text);

  // If there are numbered questions, render intro + question cards
  if (questions.length > 0) {
    return (
      <div className="space-y-3">
        {intro && (
          <div className="text-[15px] leading-relaxed">
            {renderRichText(intro.trim())}
          </div>
        )}
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div
              key={i}
              className="bg-stride-50/70 border border-stride-100 rounded-xl px-3.5 py-3"
            >
              <div className="text-[13px] leading-relaxed text-stride-800">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-stride-600 text-white text-[11px] font-bold mr-2 -mt-0.5 align-middle shrink-0">
                  {i + 1}
                </span>
                {renderInlineFormatting(q)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Otherwise render rich text with bullets, bold, etc.
  return (
    <div className="text-[15px] leading-relaxed">
      {renderRichText(text)}
    </div>
  );
}

/**
 * Renders a block of text with paragraph breaks, bullet lists, and inline formatting.
 */
function renderRichText(text: string): React.ReactNode {
  // Split into paragraphs by double newline or detect structure
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let currentParagraph: string[] = [];
  let currentBullets: string[] = [];
  let blockKey = 0;

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const joined = currentParagraph.join('\n').trim();
      if (joined) {
        blocks.push(
          <p key={blockKey++} className="whitespace-pre-wrap">
            {renderInlineFormatting(joined)}
          </p>
        );
      }
      currentParagraph = [];
    }
  };

  const flushBullets = () => {
    if (currentBullets.length > 0) {
      blocks.push(
        <ul key={blockKey++} className="space-y-1.5 my-2">
          {currentBullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-[14px]">
              <span className="w-1.5 h-1.5 rounded-full bg-stride-400 mt-[7px] shrink-0" />
              <span>{renderInlineFormatting(b)}</span>
            </li>
          ))}
        </ul>
      );
      currentBullets = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Bullet point detection: - item, • item, * item (but not **bold**)
    const bulletMatch = trimmed.match(/^[-•]\s+(.+)$/) || trimmed.match(/^\*\s+(?!\*)(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      currentBullets.push(bulletMatch[1]);
      continue;
    }

    // If we had bullets and now hit a non-bullet line, flush bullets
    if (currentBullets.length > 0) {
      flushBullets();
    }

    // Empty line = paragraph break
    if (trimmed === '') {
      flushParagraph();
      continue;
    }

    currentParagraph.push(line);
  }

  flushBullets();
  flushParagraph();

  return <>{blocks}</>;
}

/**
 * Renders inline formatting: **bold**, *italic*, `code`
 */
function renderInlineFormatting(text: string): React.ReactNode {
  // Regex to match **bold**, *italic*, `code`
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Push text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // **bold**
      parts.push(
        <strong key={key++} className="font-semibold text-stride-900">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // *italic*
      parts.push(
        <em key={key++} className="italic">
          {match[3]}
        </em>
      );
    } else if (match[4]) {
      // `code`
      parts.push(
        <code key={key++} className="bg-stride-100 text-stride-700 px-1 py-0.5 rounded text-[13px] font-mono">
          {match[4]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>;
}

/**
 * Extracts contextual suggestion options from the last AI message.
 */
export function getContextualSuggestions(
  lastAssistantText: string | undefined | null
): { label: string; text: string }[] | null {
  if (!lastAssistantText) return null;

  const { questions } = parseQuestions(lastAssistantText);
  if (questions.length === 0) return null;

  const suggestions: { label: string; text: string }[] = [];

  for (const q of questions) {
    const lower = q.toLowerCase();

    // Extract options in parentheses like "(e.g., running, strength training, yoga)"
    const parenMatch = q.match(/\((?:e\.g\.?,?\s*)?([^)]+)\)/i);
    if (parenMatch) {
      const options = parenMatch[1].split(/,\s*/).map(s => s.trim()).filter(Boolean);
      for (const opt of options.slice(0, 2)) {
        if (opt.length < 40 && suggestions.length < 5) {
          suggestions.push({ label: capitalize(opt), text: capitalize(opt) });
        }
      }
      continue;
    }

    if (lower.includes('target date') || lower.includes('deadline') || lower.includes('timeline') || lower.includes('when') || lower.includes('how long')) {
      if (suggestions.length < 5) suggestions.push({ label: '3 months', text: 'About 3 months' });
      if (suggestions.length < 5) suggestions.push({ label: '6 months', text: 'Around 6 months' });
      continue;
    }

    if (lower.includes('how many times') || lower.includes('how often') || lower.includes('frequency')) {
      if (suggestions.length < 5) suggestions.push({ label: '3x per week', text: '3 times a week' });
      if (suggestions.length < 5) suggestions.push({ label: 'Daily', text: 'Every day' });
      continue;
    }

    if (lower.includes('current level') || lower.includes('beginner') || lower.includes('experience')) {
      if (suggestions.length < 5) suggestions.push({ label: 'Beginner', text: 'Beginner' });
      if (suggestions.length < 5) suggestions.push({ label: 'Intermediate', text: 'Intermediate' });
      continue;
    }

    if (lower.includes('motivat') || lower.includes('why') || lower.includes('what drives')) {
      if (suggestions.length < 5) suggestions.push({ label: 'Health & energy', text: 'For better health and more energy' });
      continue;
    }

    if (lower.includes('budget') || lower.includes('how much') || lower.includes('amount')) {
      if (suggestions.length < 5) suggestions.push({ label: 'Flexible', text: "I'm flexible on the amount" });
      continue;
    }
  }

  const seen = new Set<string>();
  const unique = suggestions.filter(s => {
    if (seen.has(s.label)) return false;
    seen.add(s.label);
    return true;
  });

  return unique.length > 0 ? unique.slice(0, 4) : null;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function parseQuestions(text: string): { intro: string; questions: string[] } {
  // Match patterns like "1) ...", "1. ...", "1: ...", "1- ..."
  const regex = /(?:^|\n)\s*(\d+)[).:\-]\s+/g;
  const matches: { index: number; length: number; num: number; fullMatchStart: number }[] = [];

  let m;
  while ((m = regex.exec(text)) !== null) {
    const fullMatchStart = m.index;
    const contentStart = m.index + m[0].length;
    matches.push({
      index: fullMatchStart,
      length: contentStart - fullMatchStart,
      num: parseInt(m[1]),
      fullMatchStart,
    });
  }

  // Need at least 2 sequential questions to treat as a list
  if (matches.length < 2) return { intro: text, questions: [] };

  // Check they're reasonably sequential
  const isSequential = matches.every((match, i) => i === 0 || match.num > matches[i - 1].num);
  if (!isSequential) return { intro: text, questions: [] };

  const intro = text.slice(0, matches[0].fullMatchStart).trim();
  const questions: string[] = [];

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].fullMatchStart + matches[i].length;
    const end = i < matches.length - 1 ? matches[i + 1].fullMatchStart : text.length;
    questions.push(text.slice(start, end).trim());
  }

  return { intro, questions };
}
