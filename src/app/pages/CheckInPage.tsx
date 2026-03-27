import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router';
import { Button, cn } from '../components/shared';
import { CheckCircle2, ChevronRight, Sparkles, PartyPopper, MessageSquare, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../lib/store';
import { toast } from 'sonner';
import { getCategoryColors, getDynamicActionLabel, isLoggedToday, haptic } from '../lib/constants';

const getColors = (cat: string) => getCategoryColors(cat);

export function CheckInPage() {
  const { state, dispatch } = useAppStore();
  const navigate = useNavigate();
  const [justLogged, setJustLogged] = useState<Set<string>>(new Set());

  const activeGoals = state.goals.filter(g => g.status === 'active');

  const goalStatuses = useMemo(() => {
    return activeGoals.map(g => ({
      ...g,
      loggedToday: isLoggedToday(g) || justLogged.has(g.id),
      actionLabel: getDynamicActionLabel(g),
    }));
  }, [activeGoals, justLogged]);

  const allLoggedToday = goalStatuses.length > 0 && goalStatuses.every(g => g.loggedToday);
  const loggedCount = goalStatuses.filter(g => g.loggedToday).length;
  const progress = goalStatuses.length > 0 ? Math.round((loggedCount / goalStatuses.length) * 100) : 0;

  const handleQuickLog = (goal: any) => {
    const currentProgress = goal.progress || 0;
    const increment = Math.max(1, Math.round((100 - currentProgress) * 0.08));
    const newProgress = Math.min(100, currentProgress + increment);

    dispatch({
      type: 'UPDATE_GOAL_DATA',
      payload: {
        id: goal.id,
        progress: newProgress,
        logs: [
          ...(goal.logs || []),
          { date: new Date().toISOString(), action: getDynamicActionLabel(goal), progress: newProgress }
        ]
      }
    } as any);

    setJustLogged(prev => new Set(prev).add(goal.id));
    toast.success(`Logged for "${goal.title}"`, { description: `Progress: ${newProgress}%` });
    haptic();
  };

  const handleLogAll = () => {
    goalStatuses.filter(g => !g.loggedToday).forEach(goal => {
      const currentProgress = goal.progress || 0;
      const increment = Math.max(1, Math.round((100 - currentProgress) * 0.08));
      const newProgress = Math.min(100, currentProgress + increment);

      dispatch({
        type: 'UPDATE_GOAL_DATA',
        payload: {
          id: goal.id,
          progress: newProgress,
          logs: [
            ...(goal.logs || []),
            { date: new Date().toISOString(), action: getDynamicActionLabel(goal), progress: newProgress }
          ]
        }
      } as any);

      setJustLogged(prev => new Set(prev).add(goal.id));
    });
    toast.success('All goals logged for today!');
    haptic();
  };

  // No goals state
  if (activeGoals.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-stride-50 flex items-center justify-center mx-auto">
          <Target className="w-7 h-7 text-stride-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stride-900">No Active Goals</h1>
          <p className="text-sm text-stride-500 mt-2 max-w-sm mx-auto">
            Create your first goal with the AI Agent, then come back here for your daily check-in.
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard')} className="gap-1.5 rounded-xl">
          <MessageSquare className="w-4 h-4" /> Go to Agent
        </Button>
      </div>
    );
  }

  // All checked in — celebration state
  if (allLoggedToday) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4 text-center space-y-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 200 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto shadow-xl shadow-green-500/20"
        >
          <CheckCircle2 className="w-12 h-12 text-white" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <h1 className="text-2xl font-bold tracking-tight text-stride-900">All Caught Up!</h1>
          <p className="text-stride-500 text-[15px] max-w-sm mx-auto leading-relaxed">
            You've logged all {goalStatuses.length} goal{goalStatuses.length !== 1 ? 's' : ''} for today. Great job staying consistent!
          </p>
        </motion.div>

        {/* Celebration sparkles */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-3"
        >
          {[0, 1, 2, 3, 4].map(i => (
            <motion.div
              key={i}
              animate={{ y: [-6, 0, -3, 0], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 1.5, delay: i * 0.1, repeat: Infinity, repeatDelay: 2 }}
            >
              <Sparkles className={cn(
                "w-5 h-5",
                i % 3 === 0 ? "text-amber-400" : i % 3 === 1 ? "text-emerald-400" : "text-stride-400"
              )} />
            </motion.div>
          ))}
        </motion.div>

        {/* Summary cards */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-2"
        >
          {goalStatuses.map((goal) => {
            const colors = getColors(goal.category as string);
            return (
              <Link
                key={goal.id}
                to={`/dashboard/goals/${goal.id}`}
                className="flex items-center gap-3 bg-white rounded-xl border border-green-100 p-3.5 hover:bg-green-50/30 transition-colors"
              >
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stride-900 truncate">{goal.title}</p>
                  <p className="text-[11px] text-stride-400 font-medium">{goal.category} · {goal.progress}%</p>
                </div>
                <ChevronRight className="w-4 h-4 text-stride-300" />
              </Link>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <p className="text-xs text-stride-400 font-medium">Come back tomorrow to keep your streak going.</p>
        </motion.div>
      </div>
    );
  }

  // Active check-in state
  return (
    <div className="max-w-lg mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-stride-900">Daily Check-in</h1>
        <p className="text-sm text-stride-500">Tap a card to log your progress for today.</p>
      </div>

      {/* Progress Summary */}
      <div className="bg-white rounded-2xl border border-stride-100/80 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-stride-500">Today's Progress</span>
          <span className="text-lg font-bold text-stride-900">{loggedCount}/{goalStatuses.length}</span>
        </div>
        <div className="h-2 bg-stride-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-green-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Log All Button */}
      {loggedCount < goalStatuses.length && (
        <Button
          onClick={handleLogAll}
          className="w-full h-12 rounded-xl text-sm font-bold gap-2 bg-stride-800 hover:bg-stride-900 shadow-md"
        >
          <CheckCircle2 className="w-4 h-4" />
          Log All Remaining ({goalStatuses.length - loggedCount})
        </Button>
      )}

      {/* Goal Cards */}
      <div className="space-y-3">
        {goalStatuses.map((goal, index) => {
          const colors = getColors(goal.category as string);
          const logged = goal.loggedToday;

          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, type: 'spring', damping: 25, stiffness: 350 }}
              className={cn(
                "bg-white rounded-2xl border shadow-sm overflow-hidden transition-all",
                logged ? "border-green-200 bg-green-50/30" : "border-stride-100/80 hover:shadow-md"
              )}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider", colors.bg, colors.text)}>
                        {goal.category}
                      </span>
                      {logged && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-green-50 text-green-700">
                          ✓ Logged
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-stride-900 text-[15px] leading-tight truncate">{goal.title}</h3>
                  </div>

                  {logged ? (
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleQuickLog(goal)}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-stride-800 text-white text-xs font-bold hover:bg-stride-900 active:scale-[0.97] transition-all shadow-sm shrink-0"
                    >
                      {goal.actionLabel}
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-stride-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700", logged ? "bg-green-500" : colors.bar)}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-stride-500 w-8 text-right">{goal.progress}%</span>
                </div>

                {goal.plan?.todayAction && !logged && (
                  <p className="mt-2 text-[11px] text-stride-400 font-medium truncate">
                    Today: {goal.plan.todayAction}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Chat check-in option */}
      <div className="text-center pt-2 pb-8">
        <button
          onClick={() => {
            navigate('/dashboard');
            // Small delay to let navigation complete, then we'll rely on the quick action
          }}
          className="inline-flex items-center gap-2 text-sm font-semibold text-stride-500 hover:text-stride-700 transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          Or check in via the AI Agent
        </button>
      </div>
    </div>
  );
}