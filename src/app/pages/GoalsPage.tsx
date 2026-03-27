import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button, cn } from '../components/shared';
import { Target, Plus, ChevronRight, CheckCircle2, PauseCircle, Archive, MoreHorizontal, Zap, TrendingUp, Layers } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../components/ui/dropdown-menu';
import { useAppStore, Category, GoalStatus, Goal } from '../lib/store';
import { motion } from 'motion/react';
import { getCategoryColors } from '../lib/constants';

const getColors = (cat: string) => getCategoryColors(cat);

export function GoalsPage() {
  const { state, dispatch } = useAppStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'active' | 'completed' | 'paused' | 'archived'>('active');

  const filteredGoals = state.goals.filter(g => g.status === filter);
  const activeGoalsCount = state.goals.filter(g => g.status === 'active').length;
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

  const overallProgress = activeGoalsCount > 0
    ? Math.round(state.goals.filter(g => g.status === 'active').reduce((acc, g) => acc + g.progress, 0) / activeGoalsCount)
    : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stride-900">Goals</h1>
          <p className="text-sm text-stride-500 font-medium mt-0.5">{activeGoalsCount} active</p>
        </div>
        {canAddGoal ? (
          <Link to="/dashboard/goals/new">
            <Button className="gap-1.5 rounded-xl text-sm h-9 px-4 shadow-sm shadow-stride-800/10">
              <Plus className="w-3.5 h-3.5" /> Add Goal
            </Button>
          </Link>
        ) : (
          <Link to="/dashboard/upgrade">
            <Button className="gap-1.5 rounded-xl text-sm h-9 px-4 bg-gradient-to-r from-stride-500 to-stride-600 text-white shadow-sm border-0">
              <Zap className="w-3.5 h-3.5 fill-white" /> Upgrade
            </Button>
          </Link>
        )}
      </div>

      {/* Overall Progress Summary */}
      {activeGoalsCount > 0 && filter === 'active' && (
        <div className="bg-white rounded-2xl border border-stride-100/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-stride-600 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-stride-400" /> Overall Progress
            </span>
            <span className="text-sm font-bold text-stride-900">{overallProgress}%</span>
          </div>
          <div className="h-2 bg-stride-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-stride-600 rounded-full transition-all duration-700"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="flex gap-4 mt-4">
            {state.goals.filter(g => g.status === 'active').map(goal => {
              const colors = getColors(goal.category as string);
              return (
                <div key={goal.id} className="flex items-center gap-1.5 text-xs">
                  <div className={cn("w-2 h-2 rounded-full", colors.dot)} />
                  <span className="font-medium text-stride-500 truncate max-w-[80px]">{goal.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
        {(['active', 'paused', 'completed', 'archived'] as const).map((t) => {
          const count = state.goals.filter(g => g.status === t).length;
          const isActive = filter === t;
          const isEmpty = count === 0 && !isActive;
          return (
            <button
              key={t}
              onClick={() => !isEmpty && setFilter(t)}
              disabled={isEmpty}
              className={cn(
                "px-4 py-2.5 rounded-full text-xs font-semibold capitalize tracking-wide whitespace-nowrap transition-all",
                isActive
                  ? "bg-stride-800 text-white shadow-sm"
                  : isEmpty
                  ? "bg-stride-50/50 text-stride-300 cursor-not-allowed opacity-50"
                  : "bg-stride-50 text-stride-500 hover:bg-stride-100"
              )}
            >
              {t} ({count})
            </button>
          );
        })}
      </div>

      {/* Goals List */}
      <div className="space-y-3">
        {filteredGoals.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-stride-50 flex items-center justify-center mx-auto mb-4">
              <Target className="w-6 h-6 text-stride-400" />
            </div>
            <p className="font-semibold text-stride-600 text-sm">
              {filter === 'active' ? 'No active goals yet' : `No ${filter} goals`}
            </p>
            <p className="text-xs text-stride-400 mt-1 max-w-xs mx-auto">
              {filter === 'active'
                ? 'Head to the AI Agent and describe what you want to achieve. It will create your goal with a full execution plan in seconds.'
                : filter === 'paused'
                ? 'Paused goals will appear here. You can pause any active goal from its detail page or via the Agent.'
                : filter === 'completed'
                ? 'Completed goals will appear here. Mark a goal as complete when you\'ve reached your target.'
                : 'Archived goals will appear here. Archive goals you no longer want to track.'}
            </p>
            {filter === 'active' && canAddGoal && (
              <div className="flex flex-col items-center gap-2 mt-5">
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="gap-1.5 rounded-xl text-sm h-9 px-5"
                >
                  <Zap className="w-3.5 h-3.5" /> Ask Agent to create a goal
                </Button>
                <span className="text-[10px] text-stride-300 font-medium">or</span>
                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard/goals/new')}
                  className="gap-1.5 rounded-xl text-sm h-9 px-5"
                >
                  <Plus className="w-3.5 h-3.5" /> Create manually
                </Button>
              </div>
            )}
          </div>
        ) : (
          filteredGoals.map((goal, index) => {
            const colors = getColors(goal.category as string);
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, type: 'spring', damping: 25, stiffness: 350 }}
                className="bg-white rounded-2xl border border-stride-100/80 shadow-sm hover:shadow-md hover:border-stride-200 transition-all group"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/dashboard/goals/${goal.id}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider", colors.bg, colors.text)}>
                          {goal.category}
                        </span>
                        {goal.targetDate && (
                          <span className="text-[10px] font-medium text-stride-400">{goal.targetDate}</span>
                        )}
                        {goal.linkedGroupName && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-stride-500 bg-stride-50 border border-stride-200/60 px-1.5 py-0.5 rounded-md">
                            <Layers className="w-2.5 h-2.5" /> {goal.linkedGroupName}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-stride-900 text-[15px] leading-tight group-hover:text-stride-800 truncate">
                        {goal.title}
                      </h3>
                    </Link>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 text-stride-400 hover:text-stride-700 hover:bg-stride-50 rounded-lg transition-colors shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 bg-white border border-stride-100 rounded-xl p-1 shadow-xl z-50">
                        <DropdownMenuItem className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-stride-700 hover:bg-stride-50 rounded-lg outline-none cursor-pointer" asChild>
                          <Link to={`/dashboard/goals/${goal.id}`}>
                            <Target className="w-3.5 h-3.5" /> View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-stride-700 hover:bg-stride-50 rounded-lg outline-none cursor-pointer"
                          onClick={() => duplicateGoal(goal)}
                        >
                          <Plus className="w-3.5 h-3.5" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="h-px bg-stride-100 my-1" />

                        {goal.status !== 'active' && (
                          <DropdownMenuItem onClick={() => updateGoalStatus(goal.id, 'active')} className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-stride-700 hover:bg-stride-50 rounded-lg outline-none cursor-pointer">
                            <Target className="w-3.5 h-3.5" /> Mark Active
                          </DropdownMenuItem>
                        )}
                        {goal.status !== 'paused' && (
                          <DropdownMenuItem onClick={() => updateGoalStatus(goal.id, 'paused')} className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-stride-700 hover:bg-stride-50 rounded-lg outline-none cursor-pointer">
                            <PauseCircle className="w-3.5 h-3.5" /> Pause
                          </DropdownMenuItem>
                        )}
                        {goal.status !== 'completed' && (
                          <DropdownMenuItem onClick={() => updateGoalStatus(goal.id, 'completed')} className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-green-600 hover:bg-green-50 rounded-lg outline-none cursor-pointer">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                          </DropdownMenuItem>
                        )}
                        {goal.status !== 'archived' && (
                          <DropdownMenuItem onClick={() => updateGoalStatus(goal.id, 'archived')} className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium text-stride-700 hover:bg-stride-50 rounded-lg outline-none cursor-pointer">
                            <Archive className="w-3.5 h-3.5" /> Archive
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator className="h-px bg-stride-100 my-1" />
                        <DropdownMenuItem onClick={() => deleteGoal(goal.id)} className="flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg outline-none cursor-pointer">
                          Delete Goal
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-stride-100 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", colors.bar)}
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-stride-500 w-8 text-right">{goal.progress}%</span>
                  </div>

                  {!goal.plan && goal.status === 'active' && (
                    <Link
                      to={`/dashboard?planGoal=${goal.id}`}
                      className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-stride-600 hover:text-stride-700"
                    >
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

      {/* Ask Agent CTA */}
      {filter === 'active' && filteredGoals.length > 0 && (
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full py-3.5 border border-dashed border-stride-200 text-stride-400 font-semibold rounded-2xl hover:border-stride-300 hover:text-stride-600 hover:bg-stride-50/50 transition-all flex justify-center items-center gap-2 text-sm"
        >
          <Zap className="w-4 h-4" /> Ask Agent to create a new goal
        </button>
      )}
    </div>
  );
}