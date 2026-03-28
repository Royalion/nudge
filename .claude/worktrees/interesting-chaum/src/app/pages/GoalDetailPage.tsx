import { useParams, Link, useSearchParams, useNavigate } from 'react-router';
import { Button, Input, Label, cn } from '../components/shared';
import { ArrowLeft, Edit2, CheckCircle2, Calendar, Activity, Zap, X, Target, ChevronDown, ChevronUp, Sparkles, MessageSquare, PenLine, Trash2, Trophy, AlertTriangle, Layers } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../lib/store';
import { toast } from 'sonner';
import { getCategoryColors, getDynamicActionLabel, isLoggedToday, haptic } from '../lib/constants';

const getCategoryColor = (cat: string) => getCategoryColors(cat).bg;

const getTodayFocus = (goal: any): string => {
  if (goal.plan?.todayFocus) return goal.plan.todayFocus;
  const pace = goal.pace;
  if (pace?.label) return `${pace.label}. Stay consistent and trust the process.`;
  const plan = goal.plan;
  if (plan?.implementationIntentionRules?.length > 0) return plan.implementationIntentionRules[0];
  if (plan?.summary) {
    const sentences = plan.summary.split('.');
    if (sentences.length > 1) return sentences[0].trim() + '.';
    return plan.summary;
  }
  return 'Focus on making progress today. Every small step counts toward your goal.';
};

export function GoalDetailPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { state, dispatch } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [editForm, setEditForm] = useState({ metric: '', deadline: '' });
  const [planExpanded, setPlanExpanded] = useState(false);
  const [logConfirm, setLogConfirm] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [logNote, setLogNote] = useState('');
  const [editingLogIdx, setEditingLogIdx] = useState<number | null>(null);
  const [editLogNote, setEditLogNote] = useState('');
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  const goal = state.goals.find(g => g.id === id);

  useEffect(() => {
    if (searchParams.get('demoEdit') === 'true') {
      setIsEditing(true);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  if (!goal) {
    return (
      <div className="max-w-lg mx-auto pt-16 px-4 text-center">
        <p className="text-stride-500 font-medium">Goal not found.</p>
        <Button variant="ghost" onClick={() => navigate('/dashboard/goals')} className="mt-4 text-sm">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Goals
        </Button>
      </div>
    );
  }

  const barColor = getCategoryColor(goal.category as string);
  const actionLabel = getDynamicActionLabel(goal);
  const todayFocus = getTodayFocus(goal);

  // Check if user already logged today for this goal
  const todayLogsCount = useMemo(() => {
    if (!goal.logs) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return goal.logs.filter((log: any) => {
      const logDate = new Date(log.date);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === today.getTime();
    }).length;
  }, [goal.logs]);
  const alreadyLoggedToday = todayLogsCount > 0;

  const handleLogButtonClick = () => {
    if (alreadyLoggedToday && !showDuplicateWarning) {
      setShowDuplicateWarning(true);
      return;
    }
    setShowDuplicateWarning(false);
    handleLogAction();
  };

  const handleUpdate = () => {
    setIsEditing(false);
    setIsRecalculating(true);
    setTimeout(() => {
      setIsRecalculating(false);
      const isPremium = state.userState?.isPremium;
      const replanCount = goal?.replanCount || 0;
      if (!isPremium && replanCount >= 3) {
        navigate(`/dashboard?goalId=${goal?.id}&replan=limit`);
        return;
      }
      if (goal) {
        dispatch({
          type: 'UPDATE_GOAL_DATA',
          payload: { id: goal.id, targetDate: editForm.deadline || goal.targetDate, replanCount: replanCount + 1 }
        });
      }
    }, 2000);
  };

  const handleLogAction = () => {
    setLogConfirm(true);
    const currentProgress = goal.progress || 0;
    const increment = Math.max(1, Math.round((100 - currentProgress) * 0.08));
    const newProgress = Math.min(100, currentProgress + increment);

    // Update best streak
    const currentStreak = calcStreak() + 1;
    const newBestStreak = Math.max(goal.bestStreak || 0, currentStreak);

    dispatch({
      type: 'UPDATE_GOAL_DATA',
      payload: {
        id: goal.id,
        progress: newProgress,
        bestStreak: newBestStreak,
        logs: [
          ...(goal.logs || []),
          { date: new Date().toISOString(), action: actionLabel, progress: newProgress, ...(logNote.trim() ? { note: logNote.trim() } : {}) }
        ]
      }
    } as any);

    toast.success('Action logged!', { description: `Progress updated to ${newProgress}%.` });
    setLogNote('');
    setShowNoteInput(false);
    setTimeout(() => setLogConfirm(false), 2000);
  };

  const handleDeleteLog = (idx: number) => {
    const logs = [...(goal.logs || [])];
    logs.splice(idx, 1);
    dispatch({ type: 'UPDATE_GOAL_DATA', payload: { id: goal.id, logs } } as any);
    toast.success('Log entry removed');
  };

  const handleEditLogSave = (idx: number) => {
    const logs = [...(goal.logs || [])];
    logs[idx] = { ...logs[idx], note: editLogNote.trim() || undefined };
    dispatch({ type: 'UPDATE_GOAL_DATA', payload: { id: goal.id, logs } } as any);
    setEditingLogIdx(null);
    toast.success('Log entry updated');
  };

  const daysRemaining = useMemo(() => {
    if (!goal.targetDate) return null;
    const target = new Date(goal.targetDate);
    if (isNaN(target.getTime())) return goal.targetDate;
    const diff = Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Overdue';
    if (diff === 0) return 'Due today';
    if (diff === 1) return '1 day left';
    return `${diff} days left`;
  }, [goal.targetDate]);

  const calcStreak = () => {
    if (!goal.logs || goal.logs.length === 0) return 0;
    let count = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sortedLogs = [...goal.logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let checkDate = new Date(today);
    for (const log of sortedLogs) {
      const logDate = new Date(log.date);
      logDate.setHours(0, 0, 0, 0);
      if (logDate.getTime() === checkDate.getTime()) {
        count++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (logDate.getTime() < checkDate.getTime()) {
        break;
      }
    }
    return count;
  };

  const streak = useMemo(calcStreak, [goal.logs]);
  const bestStreak = goal.bestStreak || streak;

  // Recent logs (last 10)
  const recentLogs = useMemo(() => {
    if (!goal.logs || goal.logs.length === 0) return [];
    return [...goal.logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
  }, [goal.logs]);

  // Linked sibling goals
  const siblingGoals = useMemo(() => {
    if (!goal.linkedGroupId) return [];
    return state.goals.filter(g => g.linkedGroupId === goal.linkedGroupId && g.id !== goal.id);
  }, [goal.linkedGroupId, state.goals, goal.id]);

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 sm:px-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/dashboard/goals')}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-stride-50 transition-colors shrink-0 mt-0.5"
          >
            <ArrowLeft className="w-5 h-5 text-stride-600" />
          </button>
          <div>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md text-white uppercase tracking-wider inline-block mb-1.5", barColor)}>
              {goal.category}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stride-900 leading-tight">{goal.title}</h1>
            {goal.description && (
              <p className="text-sm text-stride-500 leading-relaxed mt-1">{goal.description}</p>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs font-semibold rounded-xl h-9 px-3 shrink-0"
          onClick={() => setIsEditing(true)}
        >
          <Edit2 className="w-3 h-3" /> Edit
        </Button>
      </div>

      {/* Edit Panel */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-stride-50 rounded-2xl p-5 border border-stride-200/60 relative space-y-4">
              <button
                onClick={() => setIsEditing(false)}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full hover:bg-stride-100"
              >
                <X className="w-4 h-4 text-stride-500" />
              </button>
              <div>
                <h3 className="text-sm font-bold text-stride-800">Update Constraints</h3>
                <p className="text-xs text-stride-500 mt-0.5">AI will recalculate your path.</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Adjust Target</Label>
                  <Input placeholder="e.g., Lower to 3km" value={editForm.metric} onChange={e => setEditForm({ ...editForm, metric: e.target.value })} className="h-10 text-sm bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Shift Timeline</Label>
                  <Input placeholder="e.g., Push out 2 weeks" value={editForm.deadline} onChange={e => setEditForm({ ...editForm, deadline: e.target.value })} className="h-10 text-sm bg-white" />
                </div>
              </div>
              <Button className="h-9 text-xs px-5 rounded-xl" onClick={handleUpdate}>
                Recalculate Plan
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recalculating Overlay */}
      <AnimatePresence>
        {isRecalculating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm"
          >
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto border-3 border-stride-100 border-t-stride-600 rounded-full animate-spin" />
              <div>
                <h3 className="text-lg font-bold text-stride-900">Recalculating...</h3>
                <p className="text-sm text-stride-500 mt-1">Adjusting your execution plan.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-stride-100/80 shadow-sm p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-stride-900 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-stride-400" /> Progress
          </h3>
          <span className="text-2xl font-bold text-stride-900">{goal.progress}%</span>
        </div>
        <div className="h-2.5 bg-stride-100 rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", barColor)}
            initial={{ width: 0 }}
            animate={{ width: `${goal.progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className="flex gap-3 mt-4 flex-wrap">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-stride-500">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" /> {streak} day streak
            </div>
          )}
          {bestStreak > 0 && bestStreak > streak && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-stride-500">
              <Trophy className="w-3.5 h-3.5 text-amber-500" /> Best: {bestStreak} days
            </div>
          )}
          {daysRemaining && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-stride-500">
              <Calendar className="w-3.5 h-3.5" /> {daysRemaining}
            </div>
          )}
          {goal.logs && goal.logs.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-stride-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> {goal.logs.length} logged
            </div>
          )}
        </div>
      </motion.div>

      {/* Execution Plan — collapsible */}
      {goal.plan ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <button
            onClick={() => setPlanExpanded(!planExpanded)}
            className="w-full bg-stride-50/60 rounded-2xl border border-stride-200/40 p-4 sm:p-5 text-left transition-colors hover:bg-stride-50"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stride-700 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Execution Plan
              </h3>
              <div className="flex items-center gap-2">
                {goal.pace?.label && (
                  <span className="text-[10px] font-bold text-stride-600 bg-stride-100 px-2 py-0.5 rounded-md hidden sm:inline">
                    {goal.pace.label}
                  </span>
                )}
                {planExpanded ? (
                  <ChevronUp className="w-4 h-4 text-stride-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stride-500" />
                )}
              </div>
            </div>
            <p className="text-sm text-stride-700 leading-relaxed mt-2 line-clamp-2">
              {goal.plan.summary}
            </p>
          </button>

          <AnimatePresence>
            {planExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-stride-50/30 rounded-b-2xl border border-t-0 border-stride-200/40 px-4 sm:px-5 pb-5 pt-2 space-y-3 -mt-2">
                  {goal.pace?.label && (
                    <div className="bg-white/60 rounded-xl px-3 py-2 border border-stride-100 inline-block sm:hidden">
                      <span className="text-xs font-bold text-stride-800">{goal.pace.label}</span>
                    </div>
                  )}
                  {goal.plan.projectionOfSuccess && (
                    <p className="text-xs text-stride-600 leading-relaxed">
                      {goal.plan.projectionOfSuccess}
                    </p>
                  )}
                  {goal.plan.implementationIntentionRules?.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-stride-600">Daily Rules</h4>
                      <ul className="space-y-1">
                        {goal.plan.implementationIntentionRules.map((rule, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-stride-800 font-medium">
                            <span className="w-4 h-4 rounded-full bg-stride-200/60 flex items-center justify-center shrink-0 text-[9px] font-bold mt-0.5">{i + 1}</span>
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-stride-50 rounded-2xl border border-stride-200/60 p-5 text-center space-y-3"
        >
          <div className="w-10 h-10 bg-stride-100 rounded-xl flex items-center justify-center mx-auto">
            <Zap className="w-5 h-5 text-stride-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stride-900">No Execution Plan Yet</h3>
            <p className="text-xs text-stride-500 mt-1">Ask the AI Agent to generate a structured plan for this goal.</p>
          </div>
          <Link to={`/dashboard?planGoal=${goal.id}`}>
            <Button className="h-9 text-xs px-5 rounded-xl">Generate Plan</Button>
          </Link>
        </motion.div>
      )}

      {/* Today's Focus */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-stride-800 to-stride-900 rounded-2xl p-5 text-white"
      >
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-stride-300 fill-stride-300" />
          <h3 className="text-sm font-bold">Today's Focus</h3>
        </div>
        <div className="bg-white/10 rounded-xl p-4 border border-white/5">
          <p className="font-semibold text-sm leading-relaxed">
            {todayFocus}
          </p>
        </div>

        {/* Note annotation toggle + input */}
        <AnimatePresence>
          {showNoteInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <textarea
                value={logNote}
                onChange={e => setLogNote(e.target.value)}
                placeholder="Add a note... (e.g., Ran 3 miles in 28 min, felt great)"
                className="w-full mt-3 bg-white/10 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-stride-400 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none h-20"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Duplicate log warning */}
        <AnimatePresence>
          {showDuplicateWarning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 bg-amber-500/20 border border-amber-400/30 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-200">
                  <AlertTriangle className="w-4 h-4" />
                  <p className="text-xs font-bold">Already logged today</p>
                </div>
                <p className="text-xs text-amber-100/80 leading-relaxed">
                  You've already logged {todayLogsCount} {todayLogsCount === 1 ? 'action' : 'actions'} for this goal today. Are you sure you want to log another?
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => { setShowDuplicateWarning(false); handleLogAction(); }}
                    className="bg-white text-stride-900 hover:bg-stride-50 text-xs h-9 px-4 rounded-lg font-semibold"
                  >
                    Yes, log again
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowDuplicateWarning(false)}
                    className="text-xs h-9 px-4 rounded-lg text-amber-200 hover:text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2 mt-4">
          <Button
            onClick={handleLogButtonClick}
            disabled={logConfirm}
            className={cn(
              "flex-1 h-11 text-sm font-bold rounded-xl transition-all relative",
              logConfirm
                ? "bg-green-500 hover:bg-green-500 text-white"
                : "text-stride-900 bg-white hover:bg-stride-50"
            )}
          >
            {logConfirm ? (
              <motion.span
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Logged!
              </motion.span>
            ) : (
              <span className="flex items-center gap-1.5">
                {alreadyLoggedToday && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                )}
                {actionLabel}
              </span>
            )}
            {alreadyLoggedToday && !logConfirm && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-green-500 text-[9px] font-bold text-white px-1 shadow-sm">
                {todayLogsCount}
              </span>
            )}
          </Button>
          {!logConfirm && (
            <button
              onClick={() => setShowNoteInput(!showNoteInput)}
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0",
                showNoteInput
                  ? "bg-white text-stride-900"
                  : "bg-white/15 text-stride-300 hover:bg-white/25 hover:text-white"
              )}
              title="Add a note"
            >
              <PenLine className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>

      {/* Recent Log Entries */}
      {recentLogs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-2"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-stride-500 px-1">Recent Logs</h3>
          <div className="bg-white rounded-2xl border border-stride-100/80 shadow-sm divide-y divide-stride-50 overflow-hidden">
            {recentLogs.map((log, idx) => {
              const logDate = new Date(log.date);
              const isToday = new Date().toDateString() === logDate.toDateString();
              const isYesterday = new Date(Date.now() - 86400000).toDateString() === logDate.toDateString();
              const label = isToday ? 'Today' : isYesterday ? 'Yesterday' : logDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              const realIdx = (goal.logs || []).length - 1 - idx; // reverse index

              return (
                <div key={idx} className="p-3.5 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-stride-800 truncate block">{log.action}</span>
                        <span className="text-[10px] font-semibold text-stride-400">{label} · {log.progress}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                      <button
                        onClick={() => { setEditingLogIdx(idx); setEditLogNote(log.note || ''); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stride-50 text-stride-400 hover:text-stride-600"
                        title="Edit note"
                      >
                        <PenLine className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteLog(realIdx)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-stride-400 hover:text-red-500"
                        title="Delete log"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {editingLogIdx === idx ? (
                    <div className="mt-2 ml-6.5 flex gap-2">
                      <input
                        value={editLogNote}
                        onChange={e => setEditLogNote(e.target.value)}
                        placeholder="Add or edit note..."
                        className="flex-1 h-8 text-xs border border-stride-200 rounded-lg px-2.5 focus:outline-none focus:ring-1 focus:ring-stride-500/30"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleEditLogSave(realIdx); if (e.key === 'Escape') setEditingLogIdx(null); }}
                      />
                      <Button size="sm" className="h-8 text-[11px] px-3 rounded-lg" onClick={() => handleEditLogSave(realIdx)}>Save</Button>
                      <Button size="sm" variant="ghost" className="h-8 text-[11px] px-2" onClick={() => setEditingLogIdx(null)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : log.note ? (
                    <div className="mt-1.5 ml-6.5 text-xs text-stride-500 bg-stride-50/60 rounded-lg px-3 py-1.5 italic">
                      "{log.note}"
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Linked Sibling Goals */}
      {siblingGoals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="space-y-2"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-stride-500 px-1 flex items-center gap-1.5">
            <Layers className="w-3 h-3" /> {goal.linkedGroupName || 'Linked Goals'}
          </h3>
          <div className="bg-white rounded-2xl border border-stride-100/80 shadow-sm divide-y divide-stride-50 overflow-hidden">
            {siblingGoals.map((sg) => {
              const sgColor = getCategoryColor(sg.category as string);
              return (
                <Link
                  key={sg.id}
                  to={`/dashboard/goals/${sg.id}`}
                  className="flex items-center gap-3 p-3.5 hover:bg-stride-50/50 transition-colors"
                >
                  <div className={cn("w-2 h-2 rounded-full shrink-0", sgColor)} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-stride-800 truncate block">{sg.title}</span>
                    <span className="text-[10px] font-semibold text-stride-400">{sg.category} · {sg.progress}%</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-12 h-1.5 bg-stride-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", sgColor)} style={{ width: `${sg.progress}%` }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Ask Coach CTA */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Link
          to="/dashboard"
          className="flex items-center justify-center gap-2 py-3.5 border border-dashed border-stride-200 text-stride-400 font-semibold rounded-2xl hover:border-stride-300 hover:text-stride-600 hover:bg-stride-50/50 transition-all text-sm"
        >
          <MessageSquare className="w-4 h-4" /> Ask Agent about this goal
        </Link>
      </motion.div>
    </div>
  );
}