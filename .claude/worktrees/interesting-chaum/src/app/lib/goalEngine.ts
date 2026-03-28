import { Category } from './store';

// ── Types ──────────────────────────────────────────────────────────

export interface PlanData {
  summary: string;
  projectionOfSuccess: string;
  implementationIntentionRules: string[];
  fallbackOptions: string[];
}

export interface PaceData {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  amount: number;
  label: string;
}

export interface MetricData {
  unit: string;
  targetValue: number;
  currentValue: number;
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  options?: string[];
  why?: string;
}

export interface EngineContext {
  goalText: string;
  targetDate?: string;
  category?: Category;
  answers: Record<string, string>;
}

export interface EngineResult {
  metric: MetricData;
  pace: PaceData;
  plan: PlanData;
  actions: { title: string; frequency: string; isFallback: boolean }[];
}

// ── Local Fallback Engine ──────────────────────────────────────────
// Used ONLY when the API is unavailable. The primary flow uses
// /api/goal-analyze and /api/goal-plan for dynamic, AI-powered
// question generation and plan building.

function calculateWeeks(targetDate?: string): number {
  if (!targetDate) return 12;
  const diffTime = Math.abs(new Date(targetDate).getTime() - Date.now());
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  return Math.max(1, diffWeeks);
}

export class GoalEngine {

  /**
   * Quick local classification — used as a fallback when AI is unavailable.
   * The primary flow uses /api/goal-analyze which lets GPT handle categorization.
   */
  static classifyGoal(text: string): Category {
    const t = text.toLowerCase();
    if (t.includes('run') || t.includes('workout') || t.includes('muscle') || t.includes('marathon') || t.includes('fit') || t.includes('exercise')) return 'Health';
    if (t.includes('save') || t.includes('money') || t.includes('invest') || t.includes('debt') || t.includes('finance')) return 'Money';
    if (t.includes('lose') || t.includes('weight') || t.includes('diet') || t.includes('eat') || t.includes('nutrition')) return 'Weight';
    if (t.includes('read') || t.includes('habit') || t.includes('focus') || t.includes('productive')) return 'Productivity';
    if (t.includes('job') || t.includes('study') || t.includes('career') || t.includes('learn') || t.includes('promotion')) return 'Career';
    if (t.includes('sleep') || t.includes('meditate') || t.includes('mental') || t.includes('anxiety')) return 'Mind';
    if (t.includes('friend') || t.includes('partner') || t.includes('relationship') || t.includes('date') || t.includes('wife') || t.includes('husband')) return 'Relationships';
    if (t.includes('clean') || t.includes('organize') || t.includes('chore') || t.includes('home') || t.includes('house')) return 'Home';
    if (t.includes('time') || t.includes('discipline') || t.includes('routine') || t.includes('morning')) return 'Discipline';
    return 'Dynamic';
  }

  /**
   * Lightweight local plan generation — fallback only.
   * The primary flow uses /api/goal-plan for rich, AI-powered plans.
   */
  static generateFallbackPlan(ctx: EngineContext): EngineResult {
    const weeks = calculateWeeks(ctx.targetDate);
    return {
      metric: { unit: 'progress units', targetValue: 100, currentValue: 0 },
      pace: { frequency: 'weekly', amount: Math.ceil(100 / weeks), label: `${Math.ceil(100 / weeks)} units/week` },
      plan: {
        summary: `Execute consistent weekly progress towards "${ctx.goalText}".`,
        projectionOfSuccess: `Maintaining pace will achieve this goal in approximately ${weeks} weeks.`,
        implementationIntentionRules: [
          'If I encounter friction, I will do the absolute minimum to keep moving.',
          'I will review progress every Sunday evening.',
        ],
        fallbackOptions: [
          'Spend 5 minutes planning the next tiny step',
          'Do one micro-action related to the goal',
        ],
      },
      actions: [
        { title: 'Main weekly progress block', frequency: 'weekly', isFallback: false },
        { title: '5-minute micro-action', frequency: 'daily', isFallback: true },
      ],
    };
  }
}
