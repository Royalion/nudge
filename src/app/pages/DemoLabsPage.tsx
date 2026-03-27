import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Button, cn } from '../components/shared';
import { ArrowRight, CheckCircle2, Target, Sparkles, X, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import newSvgPaths from "../../imports/svg-ouag2489bx";
import { getCategoryColors } from '../lib/constants';

// ── Types ──
type DemoStep = 'chat' | 'goals' | 'complete';

interface DemoGoal {
  id: string;
  title: string;
  category: string;
  description: string;
  plan: {
    summary: string;
    actions: { label: string; done: boolean }[];
  };
  progress: number;
}

// ── Predefined goals ──
const GOAL_OPTIONS = [
  {
    id: 'run-5k',
    emoji: '🏃',
    label: 'Run a 5K in 30 days',
    category: 'Health',
    description: 'Build up from zero to running a full 5K without stopping in 30 days.',
    plan: {
      summary: 'Progressive running plan: start with walk-run intervals and build endurance over 4 weeks.',
      actions: [
        { label: 'Walk-run 15 min intervals', done: true },
        { label: 'Run 1K without stopping', done: true },
        { label: 'Complete 2.5K run', done: true },
        { label: 'Run full 5K at your pace', done: false },
      ],
    },
  },
  {
    id: 'save-1k',
    emoji: '💰',
    label: 'Save $1,000 this month',
    category: 'Money',
    description: 'Build an emergency fund by saving $1,000 through small daily wins.',
    plan: {
      summary: 'Micro-saving strategy: automate transfers, cut 3 subscriptions, and meal-prep to save $33/day.',
      actions: [
        { label: 'Set up auto-transfer $15/day', done: true },
        { label: 'Cancel 3 unused subscriptions', done: true },
        { label: 'Meal prep for the week', done: true },
        { label: 'Hit $1,000 savings target', done: false },
      ],
    },
  },
  {
    id: 'meditate',
    emoji: '🧘',
    label: 'Meditate daily for 2 weeks',
    category: 'Mind',
    description: 'Build a consistent meditation habit starting with just 5 minutes per day.',
    plan: {
      summary: 'Habit stacking: attach 5-min meditation to your morning coffee routine, then increase to 10 min.',
      actions: [
        { label: '5 min guided meditation', done: true },
        { label: 'Complete 7-day streak', done: true },
        { label: 'Increase to 10 min sessions', done: true },
        { label: 'Complete full 14-day streak', done: false },
      ],
    },
  },
  {
    id: 'learn-guitar',
    emoji: '🎸',
    label: 'Learn 3 guitar chords',
    category: 'Career',
    description: 'Learn to play G, C, and D chords smoothly enough to strum a simple song.',
    plan: {
      summary: 'Focused practice: 15 min/day on finger placement drills, then chord transitions.',
      actions: [
        { label: 'Master G chord shape', done: true },
        { label: 'Master C chord shape', done: true },
        { label: 'Practice G→C→D transitions', done: true },
        { label: 'Play a full song with all 3', done: false },
      ],
    },
  },
];

// ── Chat messages for the flow ──
function getChatFlow(goal: typeof GOAL_OPTIONS[0]) {
  return [
    { role: 'assistant' as const, text: `Great choice! Let me build your plan for "${goal.label}"...` },
    { role: 'assistant' as const, text: `✅ **${goal.plan.summary}**\n\nI've created ${goal.plan.actions.length} milestones to get you there. The first 3 are already done — you're almost at the finish line!` },
    { role: 'assistant' as const, text: `Your goal is set up and ready to go! Head to your goals to see it in action. 🎯` },
  ];
}

// ── Mini logo ──
function DemoLogo() {
  return (
    <svg width={28} height={28} viewBox="0 0 48 48" fill="none" className="shrink-0">
      <path d={newSvgPaths.pf24700} fill="url(#demo-a)" />
      <path d={newSvgPaths.p3dc95c00} fill="url(#demo-b)" />
      <defs>
        <radialGradient cx="0" cy="0" gradientTransform="translate(24 25.5) rotate(92.0096) scale(28.5175)" gradientUnits="userSpaceOnUse" id="demo-a" r="1">
          <stop stopColor="#56EFFF" /><stop offset="1" stopColor="#004A53" />
        </radialGradient>
        <radialGradient cx="0" cy="0" gradientTransform="translate(24 25.5) rotate(92.0096) scale(28.5175)" gradientUnits="userSpaceOnUse" id="demo-b" r="1">
          <stop stopColor="#56EFFF" /><stop offset="1" stopColor="#004A53" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// ── Confetti helpers ──
function fireSparkle() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#3B8895', '#56EFFF', '#004A53', '#F59E0B', '#10B981'],
  });
}

function fireFullPageConfetti() {
  const duration = 4000;
  const end = Date.now() + duration;
  const colors = ['#3B8895', '#56EFFF', '#004A53', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6'];

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();

  // Big burst
  setTimeout(() => {
    confetti({
      particleCount: 200,
      spread: 120,
      origin: { y: 0.35 },
      colors,
      startVelocity: 45,
      gravity: 0.8,
    });
  }, 500);
}

// ── Typing indicator ──
function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-stride-300"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
export function DemoLabsPage() {
  const [step, setStep] = useState<DemoStep>('chat');
  const [selectedGoal, setSelectedGoal] = useState<typeof GOAL_OPTIONS[0] | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
    { role: 'assistant', text: 'Hey! 👋 I\'m your Nudge AI coach. Pick a goal below and I\'ll build a complete plan for you in seconds.' },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [chatFlowIndex, setChatFlowIndex] = useState(0);
  const [goalCreated, setGoalCreated] = useState(false);
  const [demoGoal, setDemoGoal] = useState<DemoGoal | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  // Drip-feed chat messages after goal selection
  const advanceChat = useCallback(() => {
    if (!selectedGoal) return;
    const flow = getChatFlow(selectedGoal);
    if (chatFlowIndex >= flow.length) return;

    setIsTyping(true);
    const delay = chatFlowIndex === 0 ? 1200 : 1800;

    setTimeout(() => {
      setIsTyping(false);
      setChatMessages(prev => [...prev, flow[chatFlowIndex]]);

      // Fire sparkle on the "goal set up" message
      if (chatFlowIndex === 1) {
        fireSparkle();
        setGoalCreated(true);
        // Create the demo goal object
        setDemoGoal({
          id: selectedGoal.id,
          title: selectedGoal.label,
          category: selectedGoal.category,
          description: selectedGoal.description,
          plan: {
            summary: selectedGoal.plan.summary,
            actions: selectedGoal.plan.actions.map(a => ({ ...a })),
          },
          progress: 75,
        });
      }

      setChatFlowIndex(prev => prev + 1);
    }, delay);
  }, [selectedGoal, chatFlowIndex]);

  useEffect(() => {
    if (selectedGoal && chatFlowIndex < getChatFlow(selectedGoal).length) {
      advanceChat();
    }
  }, [chatFlowIndex, selectedGoal, advanceChat]);

  const handleSelectGoal = (goal: typeof GOAL_OPTIONS[0]) => {
    if (selectedGoal) return; // prevent re-selection
    setSelectedGoal(goal);
    setChatMessages(prev => [...prev, { role: 'user', text: goal.label }]);
    setChatFlowIndex(0);
    // The useEffect above will start dripping messages
  };

  const handleLogFinalAction = () => {
    if (!demoGoal) return;
    setDemoGoal(prev => prev ? {
      ...prev,
      progress: 100,
      plan: {
        ...prev.plan,
        actions: prev.plan.actions.map(a => ({ ...a, done: true })),
      },
    } : null);
    fireFullPageConfetti();
    setStep('complete');
  };

  // ─── RENDER ───
  return (
    <div className="min-h-screen bg-[#F7FAFA] font-['Manrope',system-ui,sans-serif] antialiased flex flex-col">

      {/* Nav */}
      <nav className="sticky top-0 z-50 px-5 py-3 bg-white/80 backdrop-blur-2xl border-b border-stride-100/40">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <DemoLogo />
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-br from-[#3B8895] to-[#004A53] bg-clip-text text-transparent">Nudge</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-stride-400 bg-stride-50 px-3 py-1.5 rounded-full">Interactive Demo</span>
            <Link to="/" className="text-stride-400 hover:text-stride-700 transition-colors">
              <X className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Step indicator */}
      <div className="max-w-3xl mx-auto w-full px-5 pt-5">
        <div className="flex items-center gap-2">
          {[
            { key: 'chat', label: 'Set a goal' },
            { key: 'goals', label: 'View goals' },
            { key: 'complete', label: 'Achieve it' },
          ].map((s, i) => {
            const active = step === s.key;
            const done = (step === 'goals' && i === 0) || (step === 'complete' && i < 2);
            return (
              <div key={s.key} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all",
                  done ? "bg-emerald-500 text-white" : active ? "bg-stride-800 text-white" : "bg-stride-100 text-stride-400"
                )}>
                  {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={cn("text-xs font-semibold hidden sm:block", active || done ? "text-stride-800" : "text-stride-400")}>{s.label}</span>
                {i < 2 && <div className={cn("flex-1 h-0.5 rounded-full", done ? "bg-emerald-400" : "bg-stride-100")} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-5 py-6">
        <AnimatePresence mode="wait">

          {/* ──── STEP 1: Chat ──── */}
          {step === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-col h-[calc(100vh-200px)] max-h-[700px]"
            >
              {/* Chat area */}
              <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-1">
                {chatMessages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-stride-600 to-stride-800 flex items-center justify-center mr-2.5 mt-0.5 shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[85%] sm:max-w-[75%] px-4 py-3 text-sm leading-relaxed rounded-2xl",
                      msg.role === 'user'
                        ? 'bg-stride-800 text-white rounded-br-md'
                        : 'bg-white border border-stride-100 text-stride-800 rounded-bl-md shadow-sm'
                    )}>
                      {msg.text.split('\n').map((line, li) => (
                        <p key={li} className={li > 0 ? 'mt-2' : ''}>
                          {line.replace(/\*\*(.*?)\*\*/g, '').split(/(\*\*.*?\*\*)/).length > 1
                            ? line.split(/\*\*(.*?)\*\*/).map((part, pi) =>
                                pi % 2 === 1 ? <strong key={pi} className="font-bold">{part}</strong> : part
                              )
                            : line
                          }
                        </p>
                      ))}
                    </div>
                  </motion.div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-stride-600 to-stride-800 flex items-center justify-center mr-2.5 mt-0.5 shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-white border border-stride-100 rounded-2xl rounded-bl-md shadow-sm">
                      <TypingDots />
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Goal picker or "view goals" CTA */}
              <div className="pt-4 border-t border-stride-100">
                {!selectedGoal ? (
                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold text-stride-400 uppercase tracking-wider mb-3">Choose a goal to try:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {GOAL_OPTIONS.map(goal => (
                        <motion.button
                          key={goal.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectGoal(goal)}
                          className="flex items-center gap-3 p-3.5 bg-white rounded-xl border-2 border-stride-100 hover:border-stride-300 hover:shadow-md transition-all text-left group"
                        >
                          <span className="text-2xl">{goal.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-stride-800 truncate">{goal.label}</p>
                            <p className="text-[11px] text-stride-400 font-medium">{goal.category}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-stride-300 group-hover:text-stride-500 transition-colors shrink-0" />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ) : goalCreated ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Button
                      onClick={() => setStep('goals')}
                      className="w-full h-12 text-base font-bold shadow-lg shadow-stride-800/15 gap-2"
                    >
                      <Target className="w-4.5 h-4.5" /> View your goals
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </motion.div>
                ) : (
                  <div className="text-center py-3">
                    <p className="text-xs text-stride-400 font-medium animate-pulse">Setting up your goal...</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ──── STEP 2: Goals list ──── */}
          {step === 'goals' && demoGoal && (
            <motion.div
              key="goals"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-stride-900">Your Goals</h1>
                <p className="text-sm text-stride-500 font-medium mt-1">1 active goal — almost there!</p>
              </div>

              {/* Goal card */}
              <div className="bg-white rounded-2xl border border-stride-100/80 shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider",
                      getCategoryColors(demoGoal.category).bg, getCategoryColors(demoGoal.category).text
                    )}>
                      {demoGoal.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-stride-900">{demoGoal.title}</h3>
                  <p className="text-sm text-stride-500 mt-1">{demoGoal.description}</p>

                  {/* Progress */}
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-stride-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${demoGoal.progress}%` }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                        className={cn("h-full rounded-full", getCategoryColors(demoGoal.category).bar)}
                      />
                    </div>
                    <span className="text-sm font-bold text-stride-600">{demoGoal.progress}%</span>
                  </div>
                </div>

                {/* Action plan */}
                <div className="border-t border-stride-50 p-5 bg-stride-50/30">
                  <p className="text-xs font-semibold text-stride-400 uppercase tracking-wider mb-3">Action Plan</p>
                  <p className="text-sm text-stride-600 mb-4 leading-relaxed">{demoGoal.plan.summary}</p>

                  <div className="space-y-2.5">
                    {demoGoal.plan.actions.map((action, i) => {
                      const isLast = i === demoGoal.plan.actions.length - 1;
                      const isFinal = isLast && !action.done;
                      return (
                        <div key={i} className={cn(
                          "flex items-center gap-3 p-3 rounded-xl transition-all",
                          action.done ? "bg-emerald-50/80" : isFinal ? "bg-white border-2 border-stride-200 shadow-sm" : "bg-white border border-stride-100"
                        )}>
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                            action.done ? "bg-emerald-500" : "bg-stride-100"
                          )}>
                            {action.done ? (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            ) : (
                              <span className="text-[10px] font-bold text-stride-400">{i + 1}</span>
                            )}
                          </div>
                          <span className={cn(
                            "text-sm font-medium flex-1",
                            action.done ? "text-emerald-700 line-through opacity-70" : "text-stride-800"
                          )}>
                            {action.label}
                          </span>
                          {isFinal && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={handleLogFinalAction}
                              className="px-4 py-2 bg-stride-800 text-white text-xs font-bold rounded-full shadow-md shadow-stride-800/20 hover:bg-stride-700 transition-colors"
                            >
                              Log & Complete
                            </motion.button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <p className="text-xs text-stride-400 text-center font-medium">
                Tap "Log & Complete" on the final action to see what happens when you achieve a goal ✨
              </p>
            </motion.div>
          )}

          {/* ──── STEP 3: Goal achieved celebration ──── */}
          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="flex flex-col items-center justify-center text-center py-12 sm:py-20 px-4"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/30"
              >
                <CheckCircle2 className="w-12 h-12 text-white" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stride-900 mb-4"
              >
                Goal Achieved! 🎉
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-lg text-stride-500 max-w-md leading-relaxed mb-2"
              >
                You just experienced the full Nudge loop — from setting a goal to crushing it.
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 }}
                className="text-base text-stride-400 max-w-sm leading-relaxed mb-10"
              >
                Imagine doing this with your real goals. An AI coach that plans, tracks, adapts, and celebrates with you — every single day.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm"
              >
                <Link to="/signup" className="w-full sm:flex-1">
                  <Button className="w-full h-12 text-base font-bold shadow-lg shadow-stride-800/15 gap-2">
                    Start for free <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/" className="w-full sm:flex-1">
                  <Button variant="outline" className="w-full h-12 text-base font-bold border-2">
                    Back to home
                  </Button>
                </Link>
              </motion.div>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                onClick={() => {
                  setStep('chat');
                  setSelectedGoal(null);
                  setChatMessages([{ role: 'assistant', text: 'Hey! 👋 I\'m your Nudge AI coach. Pick a goal below and I\'ll build a complete plan for you in seconds.' }]);
                  setIsTyping(false);
                  setChatFlowIndex(0);
                  setGoalCreated(false);
                  setDemoGoal(null);
                }}
                className="mt-6 text-sm font-semibold text-stride-400 hover:text-stride-600 transition-colors underline underline-offset-4"
              >
                Try another goal
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
