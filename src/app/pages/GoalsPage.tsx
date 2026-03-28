import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button, cn } from '../components/shared';
import { Target, Plus, ChevronRight, CheckCircle2, PauseCircle, Archive, MoreHorizontal, Zap, TrendingUp, Layers, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../components/ui/dropdown-menu';
import { useAppStore, Category, GoalStatus, Goal, Activity } from '../lib/store';
import { motion } from 'motion/react';
import { getCategoryColors } from '../lib/constants';

interface GoalWithActivities extends Goal {
  activities?: Activity[];
}

const MESSAGES = ['Great job! 💪', 'Nice work! Keep it up', 'Progress logged ✓', "Logged! You're on a roll"];
const EMOJI_SETS: Record<string, string[]> = {
  '💰': ['💰', '💵', '💴'],
  '☕': ['☕', '🚫', '✨'],
  '💪': ['💪', '🏋️', '🎯'],
  '📚': ['📚', '✏️', '🧠'],
  '🗣️': ['🗣️', '💬', '🌍'],
  '📖': ['📖', '📝', '💡'],
  '🍱': ['🍱', '🥗', '😋'],
  '🛍️': ['🛍️', '💸', '♻️']
};

const getColors = (cat: string) => getCategoryColors(cat);

// Confetti Animation
const Confetti: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const colors = ['#0d7d7d', '#0a9d9d', '#51cf66', '#ffa94d', '#ff6b6b'];
  const particleCount = 24;

  useEffect(() => {
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      const size = Math.random() * 8 + 4;
      const angle = (Math.PI * 2 * i) / particleCount;
      const velocity = Math.random() * 180 + 120;
      const dirX = Math.cos(angle) * velocity * 0.6;
      const dirY = -Math.sin(angle) * velocity - 180;
      const rot = Math.random() * 360;

      particle.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: ${size}px;
        height: ${size}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
        pointer-events: none;
        --tx: ${dirX}px;
        --ty: ${dirY}px;
        --rot: ${rot}deg;
        animation: confetti-burst 0.8s ease-out forwards;
        z-index: 999;
      `;

      document.body.appendChild(particle);
      setTimeout(() => particle.remove(), 800);
    }
  }, [x, y]);

  return null;
};

// Emoji Float Component
const EmojiFloat: React.FC<{ x: number; y: number; emoji: string }> = ({ x, y, emoji }) => {
  const emojis = EMOJI_SETS[emoji] || ['✨'];
  const count = 7;

  useEffect(() => {
    for (let i = 0; i < count; i++) {
      const emojiEl = document.createElement('div');
      const size = Math.random() * 48 + 32;
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const distance = Math.random() * 140 + 100;
      const ex = Math.cos(angle) * distance;
      const ey = -Math.sin(angle) * distance - 140;

      emojiEl.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        font-size: ${size}px;
        pointer-events: none;
        --ex: ${ex}px;
        --ey: ${ey}px;
        animation: emoji-float-slow 2.2s ease-out forwards;
        z-index: 998;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
      `;

      emojiEl.textContent = emojis[i % emojis.length];
      document.body.appendChild(emojiEl);
      setTimeout(() => emojiEl.remove(), 2200);
    }
  }, [x, y, emoji]);

  return null;
};

// Skip Reason Modal
interface SkipReasonModalProps {
  activity: Activity;
  goal: GoalWithActivities;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, category: string) => void;
  isLoading?: boolean;
}

const SkipReasonModal: React.FC<SkipReasonModalProps> = ({ activity, goal, isOpen, onClose, onSubmit, isLoading }) => {
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
        <h3 className="text-lg font-bold text-slate-900 mb-2">Can't complete this activity?</h3>
        <p className="text-sm text-slate-600 mb-4">"{activity.text}"</p>

        <div className="space-y-3 mb-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700 mb-2 block">What's stopping you?</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-800"
            >
              <option value="">Select reason...</option>
              <option value="too_tired">Too tired</option>
              <option value="not_enough_time">Not enough time</option>
              <option value="external_blocker">External blocker</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700 mb-2 block">Tell us more (optional)</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Office was closed, felt sick, family emergency..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 resize-none"
              rows={3}
            />
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (category || reason) {
                onSubmit(reason, category);
              }
            }}
            disabled={(!category && !reason) || isLoading}
            className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 disabled:opacity-50"
          >
            {isLoading ? 'Analyzing...' : 'Get New Plan'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Regeneration Modal
interface RegenerationModalProps {
  newActivities: Activity[];
  strategy: string;
  message: string;
  goal: GoalWithActivities;
  isOpen: boolean;
  onAccept: () => void;
  onModify: () => void;
  isLoading?: boolean;
}

const RegenerationModal: React.FC<RegenerationModalProps> = ({
  newActivities,
  strategy,
  message,
  goal,
  isOpen,
  onAccept,
  onModify,
  isLoading
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-xl max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-slate-900 mb-2">New Plan for You</h3>
        <p className="text-sm text-slate-600 mb-4">{message}</p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-slate-700">
            <strong>Strategy:</strong> {strategy.replace(/_/g, ' ').toUpperCase()}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <p className="text-sm font-semibold text-slate-700">Your updated activities:</p>
          {newActivities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-lg">{activity.emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{activity.text}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {activity.dueDateTier === 'today' && '📍 Today'} {activity.dueDateTier === 'week' && '📅 This week'}{' '}
                  {activity.dueDateTier === 'future' && '🔮 Future'}
                  {activity.intensity && ` • Intensity: ${activity.intensity}/10`}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onModify}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Chat with Agent
          </button>
          <button
            onClick={onAccept}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 disabled:opacity-50"
          >
            Accept Plan
          </button>
        </div>
      </div>
    </div>
  );
};

// Activity Item Component
const ActivityItem: React.FC<{
  activity: Activity;
  onCheck: (activity: Activity, circleElement: HTMLElement) => void;
  onCantDo: (activity: Activity) => void;
  isDueToday?: boolean;
}> = ({ activity, onCheck, onCantDo, isDueToday }) => {
  const circleRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (circleRef.current && !activity.isLogged) {
      onCheck(activity, circleRef.current);
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 transition-all',
        activity.isLogged && 'bg-blue-50 border-blue-200'
      )}
    >
      <div
        ref={circleRef}
        className={cn(
          'w-8 h-8 border-2 border-slate-800 rounded-full cursor-pointer flex items-center justify-center bg-white flex-shrink-0 transition-all',
          activity.isLogged && 'bg-gradient-to-br from-slate-800 to-slate-700 border-slate-700'
        )}
        onClick={handleClick}
      >
        <span className={cn('text-sm font-bold text-slate-800 opacity-0', activity.isLogged && 'text-white opacity-100')}>
          ✓
        </span>
      </div>
      <div className="flex-1">
        <div
          className={cn(
            'text-sm font-medium text-slate-900',
            isDueToday && 'font-bold text-slate-800',
            activity.isLogged && 'line-through text-slate-500'
          )}
        >
          {activity.text}
        </div>
      </div>
      <button
        onClick={() => onCantDo(activity)}
        disabled={activity.isLogged}
        className={cn(
          'text-xs font-semibold px-2 py-1 rounded text-red-600 hover:bg-red-50 transition-colors',
          activity.isLogged && 'opacity-50 cursor-not-allowed'
        )}
      >
        I can't do this
      </button>
    </div>
  );
};

export function GoalsPage() {
  const { state, dispatch } = useAppStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'active' | 'completed' | 'paused' | 'archived'>('active');
  const [viewMode, setViewMode] = useState<'list' | 'stack'>('list');
  const [stackIndex, setStackIndex] = useState(0);
  const [confetti, setConfetti] = useState<{ x: number; y: number } | null>(null);
  const [emojiPop, setEmojiPop] = useState<{ x: number; y: number; emoji: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedAccordions, setExpandedAccordions] = useState<Set<string>>(new Set());

  // New state for activity adaptation
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [skipModalActivity, setSkipModalActivity] = useState<Activity | null>(null);
  const [skipModalGoal, setSkipModalGoal] = useState<GoalWithActivities | null>(null);
  const [regenerationModalOpen, setRegenerationModalOpen] = useState(false);
  const [newActivities, setNewActivities] = useState<Activity[]>([]);
  const [regenerationMessage, setRegenerationMessage] = useState('');
  const [regenerationStrategy, setRegenerationStrategy] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const filteredGoals = state.goals.filter((g) => g.status === filter) as GoalWithActivities[];
  const activeGoalsCount = state.goals.filter((g) => g.status === 'active').length;
  const canAddGoal = state.userState?.isPremium || activeGoalsCount < 3;

  const updateGoalStatus = (id: string, status: GoalStatus) => {
    dispatch({ type: 'UPDATE_GOAL_STATUS', payload: { id, status } });
  };

  const deleteGoal = (id: string) => {
    dispatch({ type: 'DELETE_GOAL', payload: id });
  };

  const duplicateGoal = (goal: Goal) => {
    if (!canAddGoal) return;
    const newGoal = { ...goal, id: Math.random().toString(), title: `${goal.title} (Copy)`, progress: 0 };
    dispatch({ type: 'ADD_GOAL', payload: newGoal });
  };

  const handleActivityCheck = (activity: Activity, circleElement: HTMLElement) => {
    const rect = circleElement.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    activity.isLogged = true;
    circleElement.classList.add('hit');

    setConfetti({ x, y });
    setEmojiPop({ x, y, emoji: activity.emoji });
    setToastMessage(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
  };

  const handleCantDoThis = (activity: Activity, goal: GoalWithActivities) => {
    setSkipModalActivity(activity);
    setSkipModalGoal(goal);
    setSkipModalOpen(true);
  };

  const handleRegenerateActivities = async (reason: string, reasonCategory: string) => {
    if (!skipModalActivity || !skipModalGoal) return;

    setIsRegenerating(true);
    try {
      const response = await fetch(`${window.location.origin}/api/activity-regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalTitle: skipModalGoal.title,
          goalCategory: skipModalGoal.category,
          activity: skipModalActivity,
          skipReason: reason,
          skipReasonCategory: reasonCategory,
          currentActivities: skipModalGoal.activities,
          goalDeadline: skipModalGoal.targetDate
        })
      });

      const data = await response.json();

      if (data.newActivities) {
        setNewActivities(data.newActivities);
        setRegenerationMessage(data.message);
        setRegenerationStrategy(data.strategy);
        setSkipModalOpen(false);
        setRegenerationModalOpen(true);

        // Show toast
        setToastMessage('Plan regenerated! Check out the new activities below.');
      }
    } catch (error) {
      console.error('Failed to regenerate activities:', error);
      setToastMessage('Failed to regenerate activities. Try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleAcceptNewActivities = () => {
    if (skipModalGoal && newActivities.length > 0) {
      dispatch({
        type: 'UPDATE_GOAL_DATA',
        payload: {
          id: skipModalGoal.id,
          activities: newActivities
        }
      });
      setRegenerationModalOpen(false);
      setToastMessage('Activities updated! Keep pushing forward.');
    }
  };

  const handleModifyPlan = () => {
    // Navigate to agent/chat page with context
    navigate(`/dashboard?modifyGoal=${skipModalGoal?.id}`);
  };

  const toggleAccordion = (goalId: string) => {
    const newSet = new Set(expandedAccordions);
    if (newSet.has(goalId)) {
      newSet.delete(goalId);
    } else {
      newSet.add(goalId);
    }
    setExpandedAccordions(newSet);
  };

  const overallProgress =
    activeGoalsCount > 0
      ? Math.round(state.goals.filter((g) => g.status === 'active').reduce((acc, g) => acc + g.progress, 0) / activeGoalsCount)
      : 0;

  // Add styles for animations
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes confetti-burst {
        to {
          transform: translate(var(--tx), var(--ty)) rotateZ(var(--rot)) scale(0.2);
          opacity: 0;
        }
      }

      @keyframes emoji-float-slow {
        to {
          transform: translate(var(--ex), var(--ey)) scale(0.4);
          opacity: 0;
        }
      }

      @keyframes toast-slide-in {
        from {
          transform: translateX(-50%) translateY(-20px);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }

      @keyframes checkmark-fly-in {
        0% {
          opacity: 0;
          transform: translateX(-40px) translateY(-40px) scale(0.3) rotate(-45deg);
        }
        60% {
          opacity: 1;
          transform: translateX(0) translateY(0) scale(1.2) rotate(0deg);
        }
        100% {
          opacity: 1;
          transform: translateX(0) translateY(0) scale(1) rotate(0deg);
        }
      }

      @keyframes circle-shake-grow {
        0% { transform: scale(1); }
        25% { transform: scale(1.15) translateX(-3px); }
        50% { transform: scale(1.2) translateX(3px); }
        75% { transform: scale(1.15) translateX(-2px); }
        100% { transform: scale(1); }
      }

      .check-circle.hit {
        animation: circle-shake-grow 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .toast-notification {
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: white;
        border-radius: 12px;
        padding: 16px 24px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        z-index: 1000;
        animation: toast-slide-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        font-size: 14px;
        font-weight: 600;
        color: #1a3a3a;
      }

      @media (max-width: 640px) {
        .toast-notification {
          left: 20px;
          right: 20px;
          transform: translateX(0);
          width: auto;
        }
      }
    `;
    document.head.appendChild(styleSheet);
    return () => document.head.removeChild(styleSheet);
  }, []);

  if (viewMode === 'stack' && filter === 'active' && filteredGoals.length > 0) {
    // Limit visible cards to 5, with remaining cards replacing the 5th one
    const MAX_VISIBLE_STACKS = 5;
    const visibleGoals = filteredGoals.slice(stackIndex, stackIndex + MAX_VISIBLE_STACKS);

    return (
      <div className="max-w-3xl mx-auto space-y-6 py-6 px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Goals</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className="px-3 py-2 rounded-lg text-sm font-semibold bg-slate-100 text-slate-600"
            >
              List
            </button>
            <button onClick={() => setViewMode('stack')} className="px-3 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-white">
              Stack
            </button>
          </div>
        </div>

        <div className="relative min-h-[480px]">
          {visibleGoals.map((goal, index) => {
            const colors = getColors(goal.category as string);
            const isActive = index === 0;

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-x-0 bg-white rounded-2xl border border-slate-100 shadow-lg p-6 flex flex-col"
                style={{
                  top: `${index * 12}px`,
                  transform: `scale(${1 - index * 0.02}) rotateZ(${-4 * index}deg)`,
                  zIndex: MAX_VISIBLE_STACKS - index,
                  pointerEvents: isActive ? 'auto' : 'none',
                  width: 'calc(100% - 0px)'
                }}
              >
                <h2 className="text-xl font-bold text-slate-900 mb-2">{goal.title}</h2>
                <span className={cn('text-xs font-bold px-2 py-1 rounded-md uppercase w-fit', colors.bg, colors.text)}>
                  {goal.category}
                </span>

                <div className="mt-4 flex-1">
                  <div className="text-sm font-medium text-slate-600 mb-2">Progress: {goal.progress}%</div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', colors.bar)} style={{ width: `${goal.progress}%` }} />
                  </div>
                </div>

                {goal.activities && goal.activities.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {goal.activities
                      .filter((a) => a.dueDateTier === 'today')
                      .map((activity) => (
                        <ActivityItem
                          key={activity.id}
                          activity={activity}
                          onCheck={handleActivityCheck}
                          onCantDo={() => handleCantDoThis(activity, goal)}
                          isDueToday={true}
                        />
                      ))}
                  </div>
                )}

                {isActive && (
                  <div className="mt-6 flex gap-2">
                    <button
                      onClick={() => setStackIndex(Math.max(0, stackIndex - 1))}
                      disabled={stackIndex === 0}
                      className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 disabled:opacity-50"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={() => setStackIndex(Math.min(filteredGoals.length - MAX_VISIBLE_STACKS, stackIndex + 1))}
                      disabled={stackIndex >= filteredGoals.length - MAX_VISIBLE_STACKS}
                      className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 disabled:opacity-50"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6 px-4 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Goals</h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">{activeGoalsCount} active</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            onClick={() => setViewMode('list')}
            className="px-3 py-2 rounded-lg text-sm font-semibold bg-slate-800 text-white"
          >
            List
          </button>
          {filter === 'active' && (
            <button onClick={() => setViewMode('stack')} className="px-3 py-2 rounded-lg text-sm font-semibold bg-slate-100 text-slate-600">
              Stack
            </button>
          )}
          {canAddGoal ? (
            <Link to="/dashboard/goals/new">
              <Button className="gap-1.5 rounded-xl text-sm h-9 px-4">
                <Plus className="w-3.5 h-3.5" /> Add Goal
              </Button>
            </Link>
          ) : (
            <Link to="/dashboard/upgrade">
              <Button className="gap-1.5 rounded-xl text-sm h-9 px-4 bg-gradient-to-r from-slate-500 to-slate-600 text-white">
                <Zap className="w-3.5 h-3.5 fill-white" /> Upgrade
              </Button>
            </Link>
          )}
        </div>
      </div>

      {activeGoalsCount > 0 && filter === 'active' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-600 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-slate-400" /> Overall Progress
            </span>
            <span className="text-sm font-bold text-slate-900">{overallProgress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-slate-600 rounded-full transition-all duration-700" style={{ width: `${overallProgress}%` }} />
          </div>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto">
        {(['active', 'paused', 'completed', 'archived'] as const).map((t) => {
          const count = state.goals.filter((g) => g.status === t).length;
          const isActive = filter === t;
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              disabled={count === 0 && !isActive}
              className={cn(
                'px-4 py-2.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-all',
                isActive ? 'bg-slate-800 text-white' : count === 0 ? 'bg-slate-50 text-slate-300 cursor-not-allowed opacity-50' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
              )}
            >
              {t} ({count})
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {filteredGoals.length === 0 ? (
          <div className="text-center py-16">
            <Target className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="font-semibold text-slate-600 text-sm">
              {filter === 'active' ? 'No active goals yet' : `No ${filter} goals`}
            </p>
          </div>
        ) : (
          filteredGoals.map((goal, index) => {
            const colors = getColors(goal.category as string);
            const dueTodayActivities = goal.activities?.filter((a) => a.dueDateTier === 'today') || [];

            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={cn('text-xs font-bold px-2 py-1 rounded-md uppercase', colors.bg, colors.text)}>
                          {goal.category}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-900 text-base">{goal.title}</h3>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                          <Link to={`/dashboard/goals/${goal.id}`}>
                            <Target className="w-3.5 h-3.5 mr-2" /> View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateGoal(goal)}>
                          <Plus className="w-3.5 h-3.5 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {goal.status !== 'active' && (
                          <DropdownMenuItem onClick={() => updateGoalStatus(goal.id, 'active')}>
                            <Target className="w-3.5 h-3.5 mr-2" /> Mark Active
                          </DropdownMenuItem>
                        )}
                        {goal.status !== 'paused' && (
                          <DropdownMenuItem onClick={() => updateGoalStatus(goal.id, 'paused')}>
                            <PauseCircle className="w-3.5 h-3.5 mr-2" /> Pause
                          </DropdownMenuItem>
                        )}
                        {goal.status !== 'completed' && (
                          <DropdownMenuItem onClick={() => updateGoalStatus(goal.id, 'completed')}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Complete
                          </DropdownMenuItem>
                        )}
                        {goal.status !== 'archived' && (
                          <DropdownMenuItem onClick={() => updateGoalStatus(goal.id, 'archived')}>
                            <Archive className="w-3.5 h-3.5 mr-2" /> Archive
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => deleteGoal(goal.id)} className="text-red-600">
                          Delete Goal
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-3 flex items-center gap-3 mb-4">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', colors.bar)} style={{ width: `${goal.progress}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-500 w-8 text-right">{goal.progress}%</span>
                  </div>

                  {goal.plan?.summary && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-slate-700">{goal.plan.summary}</div>
                  )}

                  {dueTodayActivities.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">📍 Due Today</h4>
                      <div className="space-y-2">
                        {dueTodayActivities.map((activity) => (
                          <ActivityItem
                            key={activity.id}
                            activity={activity}
                            onCheck={handleActivityCheck}
                            onCantDo={() => handleCantDoThis(activity, goal)}
                            isDueToday={true}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {goal.activities && goal.activities.length > 0 && (
                    <div className="border-t border-slate-200 pt-3">
                      <button
                        onClick={() => toggleAccordion(goal.id)}
                        className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 w-full py-2"
                      >
                        View all activities
                        <span className={cn('transition-transform', expandedAccordions.has(goal.id) && 'rotate-180')}>
                          ▼
                        </span>
                      </button>

                      {expandedAccordions.has(goal.id) && (
                        <div className="mt-3 space-y-2 pt-3 border-t border-slate-200">
                          {goal.activities
                            .filter((a) => a.dueDateTier !== 'today')
                            .map((activity) => (
                              <ActivityItem
                                key={activity.id}
                                activity={activity}
                                onCheck={handleActivityCheck}
                                onCantDo={() => handleCantDoThis(activity, goal)}
                              />
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!goal.plan && goal.status === 'active' && (
                    <Link to={`/dashboard?planGoal=${goal.id}`} className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-700">
                      <Zap className="w-3 h-3" /> Generate execution plan
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {confetti && <Confetti x={confetti.x} y={confetti.y} />}
      {emojiPop && <EmojiFloat x={emojiPop.x} y={emojiPop.y} emoji={emojiPop.emoji} />}
      {toastMessage && <div className="toast-notification">{toastMessage}</div>}

      <SkipReasonModal
        activity={skipModalActivity!}
        goal={skipModalGoal!}
        isOpen={skipModalOpen && !!skipModalActivity && !!skipModalGoal}
        onClose={() => setSkipModalOpen(false)}
        onSubmit={handleRegenerateActivities}
        isLoading={isRegenerating}
      />

      <RegenerationModal
        newActivities={newActivities}
        strategy={regenerationStrategy}
        message={regenerationMessage}
        goal={skipModalGoal!}
        isOpen={regenerationModalOpen}
        onAccept={handleAcceptNewActivities}
        onModify={handleModifyPlan}
        isLoading={false}
      />
    </div>
  );
}
