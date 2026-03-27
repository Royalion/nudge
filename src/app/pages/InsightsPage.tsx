import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { cn } from '../components/shared';
import { useAppStore, type Goal } from '../lib/store';
import {
  Flame, TrendingUp, Target, Calendar, ChevronRight, ChevronDown,
  BarChart3, Zap, CheckCircle2, Clock, ArrowUpRight, Circle,
  Sparkles, MessageSquare, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getCategoryColors } from '../lib/constants';

const getColors = (cat: string) => getCategoryColors(cat);

export function InsightsPage() {
  const { state } = useAppStore();
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [goalFilterOpen, setGoalFilterOpen] = useState(false);
  const [dateRange, setDateRange] = useState<'week' | 'last-week' | 'month' | 'all'>('week');

  const activeGoals = state.goals.filter(g => g.status === 'active');
  const completedGoals = state.goals.filter(g => g.status === 'completed');
  const allGoals = state.goals;

  const selectedGoal = selectedGoalId ? state.goals.find(g => g.id === selectedGoalId) : null;

  // Goals to analyze (filtered or all)
  const analysisGoals = selectedGoal ? [selectedGoal] : activeGoals;

  const overallProgress = useMemo(() => {
    if (analysisGoals.length === 0) return 0;
    return Math.round(analysisGoals.reduce((acc, g) => acc + g.progress, 0) / analysisGoals.length);
  }, [analysisGoals]);

  // Compute real stats from logs
  const stats = useMemo(() => {
    let totalLogs = 0;
    let streakDays = 0;
    const logDates = new Set<string>();

    analysisGoals.forEach(g => {
      if (g.logs) {
        totalLogs += g.logs.length;
        g.logs.forEach((log: any) => {
          const d = new Date(log.date);
          d.setHours(0, 0, 0, 0);
          logDates.add(d.toISOString());
        });
      }
    });

    // Calculate streak from unique dates
    const sortedDates = Array.from(logDates).sort().reverse();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let checkDate = new Date(today);
    for (const dateStr of sortedDates) {
      const d = new Date(dateStr);
      if (d.getTime() === checkDate.getTime()) {
        streakDays++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (d.getTime() < checkDate.getTime()) {
        break;
      }
    }

    // Weekly activity (last 7 days)
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weeklyActivity: number[] = new Array(7).fill(0);
    const now = new Date();
    analysisGoals.forEach(g => {
      (g.logs || []).forEach((log: any) => {
        const logDate = new Date(log.date);
        const daysDiff = Math.floor((now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff >= 0 && daysDiff < 7) {
          const dayIndex = (logDate.getDay() + 6) % 7; // Mon=0
          weeklyActivity[dayIndex]++;
        }
      });
    });

    const weeklyTotal = weeklyActivity.reduce((a, b) => a + b, 0);

    return { totalLogs, streakDays, weekDays, weeklyActivity, weeklyTotal };
  }, [analysisGoals]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const cats: Record<string, { count: number; avgProgress: number }> = {};
    analysisGoals.forEach(g => {
      const cat = g.category as string;
      if (!cats[cat]) cats[cat] = { count: 0, avgProgress: 0 };
      cats[cat].count++;
      cats[cat].avgProgress += g.progress;
    });
    return Object.entries(cats).map(([cat, data]) => ({
      category: cat,
      count: data.count,
      avgProgress: Math.round(data.avgProgress / data.count),
    })).sort((a, b) => b.avgProgress - a.avgProgress);
  }, [analysisGoals]);

  // All activity logs (for Recent Activity section)
  const recentActivity = useMemo(() => {
    const logs: { goalTitle: string; goalCategory: string; action: string; date: string; progress: number; note?: string }[] = [];
    const goalsToScan = selectedGoal ? [selectedGoal] : allGoals;

    // Date range boundaries
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    let rangeStart: Date | null = null;
    if (dateRange === 'week') {
      rangeStart = new Date(now);
      rangeStart.setDate(rangeStart.getDate() - 7);
      rangeStart.setHours(0, 0, 0, 0);
    } else if (dateRange === 'last-week') {
      const end = new Date(now);
      end.setDate(end.getDate() - 7);
      rangeStart = new Date(end);
      rangeStart.setDate(rangeStart.getDate() - 7);
      rangeStart.setHours(0, 0, 0, 0);
      now.setTime(end.getTime());
      now.setHours(23, 59, 59, 999);
    } else if (dateRange === 'month') {
      rangeStart = new Date(now);
      rangeStart.setDate(rangeStart.getDate() - 30);
      rangeStart.setHours(0, 0, 0, 0);
    }
    // 'all' => rangeStart stays null

    goalsToScan.forEach(g => {
      (g.logs || []).forEach((log: any) => {
        const logDate = new Date(log.date);
        if (rangeStart && logDate < rangeStart) return;
        if (logDate > now) return;
        logs.push({
          goalTitle: g.title,
          goalCategory: g.category as string,
          action: log.action || 'Action logged',
          date: log.date,
          progress: log.progress || 0,
          note: log.note,
        });
      });
    });
    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 30);
  }, [allGoals, selectedGoal, dateRange]);

  const maxActivity = Math.max(...stats.weeklyActivity, 1);

  // Empty state
  if (allGoals.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-6 px-4 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stride-900">Insights</h1>
          <p className="text-sm text-stride-500 font-medium mt-0.5">Your progress at a glance.</p>
        </div>
        <div className="text-center py-20 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-stride-50 flex items-center justify-center mx-auto">
            <BarChart3 className="w-7 h-7 text-stride-400" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-stride-900">No insights yet</h2>
            <p className="text-sm text-stride-500 max-w-sm mx-auto leading-relaxed">
              Once you create goals and start logging actions, your progress data, streaks, and trends will appear here.
            </p>
          </div>
          <div className="pt-2 space-y-2">
            <p className="text-xs font-semibold text-stride-400 uppercase tracking-wider">Tips to get started</p>
            <div className="flex flex-col items-center gap-2 text-sm text-stride-600">
              <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-stride-500" /> Tell the AI Agent your first goal</span>
              <span className="flex items-center gap-2"><Target className="w-4 h-4 text-blue-500" /> Log daily actions to build streaks</span>
              <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-500" /> Track trends across all goals</span>
            </div>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-stride-800 hover:text-stride-900 mt-4 transition-colors"
          >
            <MessageSquare className="w-4 h-4" /> Go to Agent
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6 px-4 sm:px-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stride-900">Insights</h1>
        <p className="text-sm text-stride-500 font-medium mt-0.5">Your progress at a glance.</p>
      </div>

      {/* Goal Filter */}
      {allGoals.length > 1 && (
        <div className="relative">
          <button
            onClick={() => setGoalFilterOpen(!goalFilterOpen)}
            className="w-full flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              {selectedGoal ? (
                <>
                  <div className={cn("w-2.5 h-2.5 rounded-full", getColors(selectedGoal.category as string).bg)} />
                  <span className="text-sm font-semibold text-gray-900">{selectedGoal.title}</span>
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-600">All Goals Overview</span>
                </>
              )}
            </div>
            <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", goalFilterOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {goalFilterOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full left-0 right-0 z-20 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden"
              >
                <button
                  onClick={() => { setSelectedGoalId(null); setGoalFilterOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-gray-50 transition-colors text-left",
                    !selectedGoalId && "bg-gray-50 font-semibold"
                  )}
                >
                  <BarChart3 className="w-4 h-4 text-gray-400" />
                  <span>All Goals Overview</span>
                </button>
                {allGoals.map(g => {
                  const colors = getColors(g.category as string);
                  return (
                    <button
                      key={g.id}
                      onClick={() => { setSelectedGoalId(g.id); setGoalFilterOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-gray-50 transition-colors text-left",
                        selectedGoalId === g.id && "bg-gray-50 font-semibold"
                      )}
                    >
                      <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", colors.bg)} />
                      <span className="truncate flex-1">{g.title}</span>
                      <span className="text-xs text-gray-400 shrink-0">{g.progress}%</span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: selectedGoal ? 'Progress' : 'Active Goals', value: selectedGoal ? `${selectedGoal.progress}%` : activeGoals.length, icon: Target, accent: 'text-blue-500' },
          { label: 'Completed', value: selectedGoal ? (selectedGoal.status === 'completed' ? 1 : 0) : completedGoals.length, icon: CheckCircle2, accent: 'text-green-500' },
          { label: 'Current Streak', value: stats.streakDays > 0 ? `${stats.streakDays}d` : '0d', icon: Flame, accent: 'text-orange-500' },
          { label: 'Actions Logged', value: stats.totalLogs, icon: Activity, accent: 'text-purple-500' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <card.icon className={cn("w-4 h-4", card.accent)} />
            </div>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">{card.value}</div>
            <div className="text-[11px] font-semibold text-gray-400 mt-0.5">{card.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Overall Progress */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-gray-400" /> {selectedGoal ? 'Goal Progress' : 'Overall Progress'}
          </h2>
          <span className="text-2xl font-bold text-gray-900">{overallProgress}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", selectedGoal ? getColors(selectedGoal.category as string).bar : "bg-gray-900")}
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2.5">
          {overallProgress === 0
            ? "Start logging actions to see your progress grow here."
            : overallProgress >= 70
            ? "Excellent momentum! You're ahead of schedule."
            : overallProgress >= 40
            ? "Good progress. Stay consistent to accelerate."
            : "Early stages. Focus on building daily habits first."}
        </p>
      </motion.div>

      {/* Weekly Activity */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-gray-400" /> This Week
          </h2>
          <span className="text-xs font-semibold text-gray-400">
            {stats.weeklyTotal} action{stats.weeklyTotal !== 1 ? 's' : ''} logged
          </span>
        </div>

        {stats.weeklyTotal === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs text-gray-400 font-medium">No actions logged this week yet.</p>
            <p className="text-[11px] text-gray-300 mt-1">Log an action on any goal to see your weekly activity here.</p>
          </div>
        ) : (
          <div className="flex items-end justify-between gap-2 h-28">
            {stats.weekDays.map((day, i) => {
              const height = (stats.weeklyActivity[i] / maxActivity) * 100;
              const isToday = i === (new Date().getDay() + 6) % 7;
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end justify-center h-20">
                    <motion.div
                      className={cn(
                        "w-full max-w-[28px] rounded-lg transition-colors",
                        stats.weeklyActivity[i] === 0
                          ? "bg-gray-100"
                          : isToday
                          ? "bg-gray-900"
                          : "bg-gray-300"
                      )}
                      initial={{ height: 0 }}
                      animate={{ height: stats.weeklyActivity[i] === 0 ? 6 : `${height}%` }}
                      transition={{ duration: 0.5, delay: 0.3 + i * 0.05 }}
                    />
                  </div>
                  <span className={cn(
                    "text-[10px] font-semibold",
                    isToday ? "text-gray-900" : "text-gray-400"
                  )}>
                    {day}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Streak Card */}
      {stats.streakDays > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-gray-900 rounded-2xl p-5 text-white"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <Flame className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <div className="text-3xl font-bold tracking-tight">{stats.streakDays}</div>
                <div className="text-xs font-semibold text-gray-400 mt-0.5">Day Streak</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-gray-500">Keep it going!</div>
              <div className="text-sm font-bold text-gray-300">Don't break the chain</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Category Breakdown (only when viewing all goals) */}
      {!selectedGoal && categoryBreakdown.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
        >
          <h2 className="text-sm font-bold text-gray-900 mb-4">Progress by Category</h2>
          <div className="space-y-3.5">
            {categoryBreakdown.map((item) => {
              const colors = getColors(item.category);
              return (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2.5 h-2.5 rounded-full", colors.bg)} />
                      <span className="text-xs font-semibold text-gray-700">{item.category}</span>
                      <span className="text-[10px] font-medium text-gray-400">
                        {item.count} goal{item.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-gray-900">{item.avgProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className={cn("h-full rounded-full", colors.bar)}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.avgProgress}%` }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Goal-level Detail (only for all goals view) */}
      {!selectedGoal && activeGoals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="p-5 pb-3">
            <h2 className="text-sm font-bold text-gray-900">Goal Progress</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {activeGoals.map((goal) => {
              const colors = getColors(goal.category as string);
              const loggedToday = (() => {
                if (!goal.logs || goal.logs.length === 0) return false;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return goal.logs.some((log: any) => {
                  const logDate = new Date(log.date);
                  logDate.setHours(0, 0, 0, 0);
                  return logDate.getTime() === today.getTime();
                });
              })();
              const isOnTrack = loggedToday || goal.progress >= 70;
              return (
                <Link
                  key={goal.id}
                  to={`/dashboard/goals/${goal.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors group"
                >
                  <div className={cn("w-2 h-2 rounded-full shrink-0", colors.bg)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate group-hover:text-black">
                      {goal.title}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", colors.bar)}
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-gray-400">{goal.progress}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-md",
                      loggedToday ? "bg-green-50 text-green-700" : goal.progress >= 40 ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                    )}>
                      {loggedToday ? 'Logged Today' : goal.progress >= 40 ? 'On Track' : 'Needs Focus'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* AI Insight Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-br from-stride-50 to-stride-100/50 rounded-2xl border border-stride-200/40 p-5"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-stride-200/60 flex items-center justify-center shrink-0">
            <Zap className="w-4.5 h-4.5 text-stride-700 fill-stride-700" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-stride-900">AI Insight</h3>
            <p className="text-xs text-stride-600 mt-1 leading-relaxed">
              {analysisGoals.length === 0
                ? "No active goals yet. Start by telling the AI Coach what you want to achieve."
                : stats.totalLogs === 0
                ? "Start logging daily actions to unlock personalized insights and trend analysis."
                : selectedGoal
                ? overallProgress >= 60
                  ? `Great progress on "${selectedGoal.title}"! You've logged ${stats.totalLogs} actions. Consider pushing the pace to finish ahead of schedule.`
                  : `Keep building momentum on "${selectedGoal.title}". Consistency is key — even small daily actions compound over time.`
                : overallProgress >= 60
                ? `Your ${categoryBreakdown[0]?.category || 'top'} goal is performing well. Consider increasing the pace to finish ahead of schedule.`
                : `Focus on consistency this week. Even 5 minutes of progress on your ${categoryBreakdown[categoryBreakdown.length - 1]?.category || 'lowest'} goal compounds over time.`}
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1 text-xs font-semibold text-stride-700 hover:text-stride-900 mt-2 transition-colors"
            >
              Talk to Agent <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Recent Activity — moved here from GoalDetailPage */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-gray-400" />
            Recent Activity
            {selectedGoal && <span className="text-xs font-medium text-gray-400">— {selectedGoal.title}</span>}
          </h3>
        </div>

        {/* Date range tabs */}
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
          {([
            { key: 'week' as const, label: 'This Week' },
            { key: 'last-week' as const, label: 'Last Week' },
            { key: 'month' as const, label: 'This Month' },
            { key: 'all' as const, label: 'All Time' },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setDateRange(tab.key)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                dateRange === tab.key
                  ? "bg-stride-800 text-white shadow-sm"
                  : "bg-stride-50 text-stride-500 hover:bg-stride-100"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {recentActivity.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <Circle className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-500">
              {dateRange === 'all' ? 'No activity logged yet' : `No activity in this period`}
            </p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
              {selectedGoal
                ? `Visit "${selectedGoal.title}" and use the action button to log your first action.`
                : dateRange !== 'all'
                ? 'Try selecting a different time range or log an action on any goal.'
                : 'Open any goal and tap the action button to start tracking your progress.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
            {recentActivity.map((item, i) => {
              const colors = getColors(item.goalCategory);
              const date = new Date(item.date);
              const isToday = new Date().toDateString() === date.toDateString();
              const isYesterday = new Date(Date.now() - 86400000).toDateString() === date.toDateString();
              const dateLabel = isToday ? 'Today' : isYesterday ? 'Yesterday' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

              return (
                <div key={i} className="p-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-gray-900 block truncate">
                          {item.action}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          {!selectedGoal && (
                            <>
                              <div className={cn("w-1.5 h-1.5 rounded-full", colors.bg)} />
                              <span className="text-[10px] font-semibold text-gray-400 truncate">{item.goalTitle}</span>
                              <span className="text-[10px] text-gray-300">·</span>
                            </>
                          )}
                          <span className="text-[10px] text-gray-400 font-semibold">{dateLabel}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-gray-400 shrink-0 ml-3">{item.progress}%</span>
                  </div>
                  {item.note && (
                    <div className="ml-8 mt-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5 italic">
                      "{item.note}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Premium upsell for non-premium */}
      {!state.userState?.isPremium && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Link to="/dashboard/upgrade" className="block">
            <div className="bg-gray-900 rounded-2xl p-5 text-white flex items-center justify-between group hover:bg-black transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                </div>
                <div>
                  <div className="text-sm font-bold">Unlock Advanced Analytics</div>
                  <div className="text-xs text-gray-400 mt-0.5">Heatmaps, projections, and AI-powered insights</div>
                </div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors shrink-0" />
            </div>
          </Link>
        </motion.div>
      )}
    </div>
  );
}