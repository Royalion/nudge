import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { useAuth } from '../lib/auth';
import { Button, cn } from '../components/shared';
import { useAppStore, type Message } from '../lib/store';
import { TypewriterText } from '../components/TypewriterText';
import { FormattedMessage, getContextualSuggestions } from '../components/FormattedMessage';
import {
  Send, Zap, Target, CheckCircle2,
  AlertTriangle, RefreshCcw, ChevronRight,
  Sparkles, ArrowRight, ExternalLink, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { triggerCelebration } from '../components/GoalConfetti';
import { getCategoryColors, getDynamicActionLabel, isLoggedToday, haptic, truncateHistoryForAPI, uid } from '../lib/constants';
import { executeAction as sharedExecuteAction } from '../lib/actionExecutor';

const getCategoryColor = (cat: string) => getCategoryColors(cat).bg;
const getFullColors = (cat: string) => getCategoryColors(cat);

export function DashboardPage() {
  const { state, dispatch } = useAppStore();
  const { session } = useAuth();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showGoalsSummary, setShowGoalsSummary] = useState(false);
  const [celebratingGoal, setCelebratingGoal] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollSentinelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSendingRef = useRef(false);
  const [animatedMsgIds, setAnimatedMsgIds] = useState<Set<string>>(new Set());
  const [checkinLoggedIds, setCheckinLoggedIds] = useState<Set<string>>(new Set());

  const hasGoals = state.goals.length > 0;
  const activeGoals = state.goals.filter(g => g.status === 'active');

  // Smooth auto-scroll using sentinel element
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    scrollSentinelRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);

  // Handle URL params for generating plans from other pages
  useEffect(() => {
    const planGoalId = searchParams.get('planGoal');
    if (planGoalId) {
      const goal = state.goals.find(g => g.id === planGoalId);
      if (goal) {
        setSearchParams({});
        const msg = `I want to build an execution plan for my goal "${goal.title}"`;
        setInput(msg);
        setTimeout(() => {
          dispatch({
            type: 'ADD_MESSAGE',
            payload: { id: uid(), role: 'user', content: msg, status: 'success', timestamp: Date.now() }
          });
          setInput('');
          setIsTyping(true);
          sendToAI(msg);
        }, 300);
      }
    }
  }, [searchParams]);

  // Find the last actionable message id (for ephemeral button logic)
  const lastActionableMsgId = useMemo(() => {
    for (let i = state.messages.length - 1; i >= 0; i--) {
      const msg = state.messages[i];
      if (msg.role === 'assistant' && msg.actionType && msg.actionType !== 'NONE' && !msg.actionHandled) {
        return msg.id;
      }
    }
    return null;
  }, [state.messages]);

  // Proactive Retention Check
  useEffect(() => {
    if (state.retentionState?.isRecoveryMode && state.messages.length <= 2) {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: uid(),
          role: 'assistant',
          content: "Welcome back! I noticed you've been away. That's completely okay. Let's start with something easy today. Pick one small win below, or just tell me what's on your mind.",
          status: 'success',
          timestamp: Date.now(),
          actionType: 'SUGGEST_FALLBACK',
          actionPayload: {
            options: [
              "Quick 2-minute goal review",
              "Log one tiny win from today",
              "Reschedule everything to tomorrow"
            ]
          }
        }
      });
    }
  }, [state.retentionState?.isRecoveryMode, state.messages.length, dispatch]);

  // Proactive greeting on fresh session
  const { user } = useAuth();
  useEffect(() => {
    if (!state.retentionState?.isRecoveryMode && state.messages.length <= 2 && state._hydrated && user) {
      const firstName = user.user_metadata?.first_name || user.email?.split('@')[0] || 'there';
      const unloggedGoals = state.goals.filter(g => g.status === 'active' && !isLoggedToday(g));
      const unloggedCount = unloggedGoals.length;

      let greetingContent = `Hey ${firstName}! `;
      if (unloggedCount > 0) {
        greetingContent += `You have ${unloggedCount} goal${unloggedCount === 1 ? '' : 's'} that need${unloggedCount === 1 ? 's' : ''} attention today. What would you like to focus on?`;
      } else if (state.goals.length > 0) {
        greetingContent += `Great to see you! Ready to work on your goals today?`;
      } else {
        greetingContent += `Let's build something meaningful together. What goal would you like to work toward?`;
      }

      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: uid(),
          role: 'assistant',
          content: greetingContent,
          status: 'success',
          timestamp: Date.now(),
          actionType: 'NONE'
        }
      });
    }
  }, [state._hydrated, user, state.goals, state.messages.length, state.retentionState?.isRecoveryMode, dispatch]);

  // Auto-scroll chat — smooth on new messages
  useEffect(() => {
    scrollToBottom();
  }, [state.messages, isTyping, scrollToBottom]);

  // Keyboard shortcut: Escape to clear input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setInput('');
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !state.isAiAvailable || isSendingRef.current) return;

    haptic('light');
    const userMsgId = uid();
    const currentInput = input;

    dispatch({
      type: 'ADD_MESSAGE',
      payload: { id: userMsgId, role: 'user', content: currentInput, status: 'success', timestamp: Date.now() }
    });

    setInput('');
    setIsTyping(true);
    inputRef.current?.focus();

    await sendToAI(currentInput);
  };

  // Core API call with request deduplication
  const sendToAI = async (messageText: string) => {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    const assistantMsgId = uid();

    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-be80a8fc/api/chat`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          message: messageText,
          history: truncateHistoryForAPI(state.messages),
          retentionState: state.retentionState,
          appState: {
            goals: state.goals.map(g => ({
              id: g.id, title: g.title, category: g.category, status: g.status,
              progress: g.progress, targetDate: g.targetDate, pace: g.pace, description: g.description,
              loggedToday: isLoggedToday(g),
            })),
            userState: state.userState,
            notificationSettings: state.notificationSettings,
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Network error');
      }

      if (state.retentionState?.isRecoveryMode) {
        dispatch({ type: 'UPDATE_RETENTION_STATE', payload: { isRecoveryMode: false, daysMissed: 0 } });
      }

      // Auto-execute non-destructive, non-confirmation actions via shared executor
      let createdGoalId: string | undefined;
      if (data.action && data.action !== 'NONE' && !data.requiresConfirmation) {
        createdGoalId = localExecuteAction(data.action, data.payload);
      }

      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: assistantMsgId,
          role: 'assistant',
          content: data.text,
          status: 'success',
          timestamp: Date.now(),
          actionType: data.action,
          actionPayload: data.payload,
          requiresConfirmation: data.requiresConfirmation,
          confirmationMessage: data.confirmationMessage,
          actionHandled: !!createdGoalId && (data.action === 'CREATE_GOAL' || data.action === 'CREATE_COMPOUND_GOALS'),
          createdGoalId: createdGoalId,
          isNew: true,
        }
      });

      // Goal creation celebration
      if (createdGoalId && (data.action === 'CREATE_GOAL' || data.action === 'CREATE_COMPOUND_GOALS')) {
        setCelebratingGoal(createdGoalId);
        setTimeout(() => setCelebratingGoal(null), 3000);
        triggerCelebration();
        haptic('heavy');
      }

      if (!state.isAiAvailable) dispatch({ type: 'SET_AI_AVAILABILITY', payload: true });

    } catch (err: any) {
      console.error('[Nudge] LLM API Error:', err);
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: assistantMsgId,
          role: 'assistant',
          content: 'I encountered an error processing your request.',
          status: 'error',
          errorMessage: err.message || 'Failed to connect.',
          timestamp: Date.now(),
        }
      });
      if (err.message === 'Failed to fetch') {
        dispatch({ type: 'SET_AI_AVAILABILITY', payload: false });
      }
    } finally {
      setIsTyping(false);
      isSendingRef.current = false;
    }
  };

  // Execute actions — delegates to shared executor with toast callbacks
  const localExecuteAction = (action: string, payload: any): string | undefined => {
    if (!payload) return;

    // Handle CREATE_COMPOUND_GOALS locally since it has special array/linked logic
    if (action === 'CREATE_COMPOUND_GOALS') {
      const goals = Array.isArray(payload) ? payload : [];
      const linkedGroupId = uid();
      const linkedGroupName = goals[0]?.linkedGroupName || 'Linked Goals';
      const createdIds: string[] = [];
      goals.forEach((g: any) => {
        const goalId = uid();
        createdIds.push(goalId);
        dispatch({
          type: 'ADD_GOAL',
          payload: {
            id: goalId,
            title: g.title,
            category: g.category || 'Dynamic',
            progress: 0,
            status: 'active',
            targetDate: g.targetDate,
            description: g.description,
            color: 'text-stride-500',
            plan: g.plan,
            pace: g.pace,
            metric: g.metric,
            replanCount: 0,
            linkedGroupId,
            linkedGroupName,
          }
        });
      });
      toast.success(`${goals.length} linked goals created`, {
        description: `Grouped under "${linkedGroupName}"`,
        action: { label: 'View', onClick: () => navigate(`/dashboard/goals/${createdIds[0]}`) },
      });
      return createdIds[0];
    }

    return sharedExecuteAction({
      action,
      payload,
      goals: state.goals,
      dispatch,
      onGoalCreated: (goalId, title) => {
        toast.success(`"${title}" created with execution plan`, {
          description: 'Tap to view goal details.',
          action: { label: 'View', onClick: () => navigate(`/dashboard/goals/${goalId}`) },
        });
      },
      onGoalDeleted: (title) => toast.success(`"${title}" deleted`),
      onAllGoalsDeleted: (count) => toast.success(`All ${count} goals deleted`),
      onGoalUpdated: () => toast.success('Goal updated'),
      onGoalStatusChanged: (title, status) => toast.success(`"${title}" ${status}`),
      onProgressLogged: (progress) => toast.success('Progress logged', { description: `Now at ${progress}%.` }),
      onSettingsUpdated: () => toast.success('Settings updated'),
    });
  };

  const handleConfirmAction = (msgId: string, action: string, payload: any) => {
    haptic('medium');
    const createdGoalId = localExecuteAction(action, payload);
    dispatch({ type: 'MARK_ACTION_HANDLED', payload: { id: msgId, createdGoalId } });
  };

  const handleCancelAction = (msgId: string) => {
    dispatch({ type: 'MARK_ACTION_HANDLED', payload: { id: msgId } });
    dispatch({
      type: 'ADD_MESSAGE',
      payload: { id: uid(), role: 'system', content: 'Action cancelled.', status: 'success', timestamp: Date.now() }
    });
  };

  const handleRetry = () => {
    const retryMsg = 'Please retry my last request.';
    dispatch({
      type: 'ADD_MESSAGE',
      payload: { id: uid(), role: 'user', content: retryMsg, status: 'success', timestamp: Date.now() }
    });
    setIsTyping(true);
    sendToAI(retryMsg);
  };

  // Handle inline check-in: log a goal directly from the chat
  const handleInlineCheckIn = (goalId: string) => {
    const goal = state.goals.find(g => g.id === goalId);
    if (!goal) return;

    haptic('medium');
    const currentProgress = goal.progress || 0;
    const increment = Math.max(1, Math.round((100 - currentProgress) * 0.08));
    const newProgress = Math.min(100, currentProgress + increment);
    const actionLabel = getDynamicActionLabel(goal);

    dispatch({
      type: 'UPDATE_GOAL_DATA',
      payload: {
        id: goal.id,
        progress: newProgress,
        logs: [
          ...(goal.logs || []),
          { date: new Date().toISOString(), action: actionLabel, progress: newProgress }
        ]
      }
    } as any);

    setCheckinLoggedIds(prev => new Set(prev).add(goalId));
    toast.success(`Logged for "${goal.title}"`, { description: `Progress: ${newProgress}%` });
  };

  // Trigger the check-in flow in chat
  const triggerCheckinInChat = () => {
    const goals = state.goals.filter(g => g.status === 'active');
    if (goals.length === 0) return;
    haptic('light');

    const allLogged = goals.every(g => isLoggedToday(g));
    
    if (allLogged) {
      dispatch({
        type: 'ADD_MESSAGE',
        payload: { id: uid(), role: 'user', content: 'I want to do my daily check-in', status: 'success', timestamp: Date.now() }
      });
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: 'checkin-done-' + Date.now(),
          role: 'assistant',
          content: "You've already logged all your goals for today! Great job staying consistent. Come back tomorrow to keep your streak going.",
          status: 'success',
          timestamp: Date.now(),
          isNew: true,
        }
      });
      return;
    }

    dispatch({
      type: 'ADD_MESSAGE',
      payload: { id: uid(), role: 'user', content: 'I want to do my daily check-in', status: 'success', timestamp: Date.now() }
    });
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: 'checkin-cards-' + Date.now(),
        role: 'assistant',
        content: '__CHECKIN_CARDS__',
        status: 'success',
        timestamp: Date.now(),
        isNew: true,
      }
    });
  };

  // Render inline check-in cards for a special message
  const renderCheckinCards = () => {
    const goals = state.goals.filter(g => g.status === 'active');
    const unlogged = goals.filter(g => !isLoggedToday(g) && !checkinLoggedIds.has(g.id));
    const allDone = unlogged.length === 0 && goals.length > 0;

    return (
      <div className="space-y-3 w-full">
        <p className="text-[15px] leading-relaxed text-stride-800">
          {allDone 
            ? "All goals logged for today! Great work staying on track."
            : `Here are your ${goals.length} active goal${goals.length !== 1 ? 's' : ''}. Tap to log each one, or tell me about your day and I'll handle it.`
          }
        </p>
        <div className="space-y-2">
          {goals.map(goal => {
            const colors = getFullColors(goal.category as string);
            const isLogged = isLoggedToday(goal) || checkinLoggedIds.has(goal.id);
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-xl border p-3 transition-all",
                  isLogged
                    ? "bg-green-50/60 border-green-200"
                    : "bg-white border-stride-100 hover:border-stride-200 shadow-sm"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider", colors.bg, colors.text)}>{goal.category}</span>
                      {isLogged && (
                        <span className="text-[10px] font-bold text-green-600 ml-1">✓</span>
                      )}
                    </div>
                    <p className={cn(
                      "text-sm font-semibold truncate",
                      isLogged ? "text-stride-500" : "text-stride-900"
                    )}>{goal.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-16 h-1 bg-stride-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", isLogged ? "bg-green-500" : colors.bar)} style={{ width: `${goal.progress}%` }} />
                      </div>
                      <span className="text-[10px] font-semibold text-stride-400">{goal.progress}%</span>
                    </div>
                  </div>
                  {isLogged ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
                  ) : (
                    <button
                      onClick={() => handleInlineCheckIn(goal.id)}
                      className="min-h-[36px] px-3 py-1.5 rounded-lg bg-stride-800 text-white text-[11px] font-bold hover:bg-stride-900 active:scale-[0.97] transition-all shrink-0"
                    >
                      {getDynamicActionLabel(goal)}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
        {unlogged.length > 1 && (
          <button
            onClick={() => unlogged.forEach(g => handleInlineCheckIn(g.id))}
            className="w-full py-2.5 rounded-xl bg-stride-50 border border-stride-200/60 text-xs font-bold text-stride-700 hover:bg-stride-100 transition-colors"
          >
            Log all remaining ({unlogged.length})
          </button>
        )}
      </div>
    );
  };

  // Render action-specific UI for a message
  const renderActionUI = (msg: Message) => {
    if (!msg.actionType || msg.actionType === 'NONE') return null;

    // Already handled
    if (msg.actionHandled) {
      if (msg.actionType === 'CREATE_GOAL' && msg.createdGoalId) {
        const isCelebrating = celebratingGoal === msg.createdGoalId;
        return (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300, delay: 0.3 }}
            className="mt-3"
          >
            <AnimatePresence>
              {isCelebrating && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2 mb-2"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ y: 0 }}
                      animate={{ y: [-8, 0, -4, 0] }}
                      transition={{ duration: 0.6, delay: i * 0.1, repeat: 2 }}
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    </motion.div>
                  ))}
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-xs font-bold text-stride-600"
                  >
                    Goal created!
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
            <Link
              to={`/dashboard/goals/${msg.createdGoalId}`}
              className="flex items-center justify-between bg-stride-50 border border-stride-200/60 rounded-xl p-3 hover:bg-stride-100/60 transition-colors group"
            >
              <div className="flex items-center gap-2 text-stride-700">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-bold">Goal created with plan</span>
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-stride-600 group-hover:text-stride-800 transition-colors">
                View goal <ExternalLink className="w-3 h-3" />
              </span>
            </Link>
          </motion.div>
        );
      }
      if (msg.actionType === 'DELETE_GOAL' || msg.actionType === 'DELETE_ALL_GOALS') {
        return (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-stride-400">
            <Trash2 className="w-3 h-3" /> Action completed
          </div>
        );
      }
      if (msg.requiresConfirmation) {
        return (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-stride-400">
            <CheckCircle2 className="w-3 h-3" /> Confirmed
          </div>
        );
      }
      return null;
    }

    // Not the latest actionable message
    if (msg.id !== lastActionableMsgId) {
      if (msg.actionType === 'CREATE_GOAL' && msg.actionPayload) {
        return (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-stride-400">
            <CheckCircle2 className="w-3 h-3" /> Processed
          </div>
        );
      }
      return null;
    }

    // Confirmation UI for destructive actions
    if (msg.requiresConfirmation && msg.actionPayload) {
      return (
        <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center gap-2 text-red-800">
            <Trash2 className="w-4 h-4" />
            <p className="text-xs font-bold uppercase tracking-wider">Confirm action</p>
          </div>
          <p className="text-xs font-medium text-red-700">{msg.confirmationMessage}</p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => handleConfirmAction(msg.id, msg.actionType!, msg.actionPayload)}
              className="bg-red-600 hover:bg-red-700 text-white text-xs h-9 px-4 rounded-lg font-semibold"
            >
              Yes, confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCancelAction(msg.id)}
              className="text-xs h-9 px-4 rounded-lg"
            >
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    // SUGGEST_FALLBACK options
    if (msg.actionType === 'SUGGEST_FALLBACK' && msg.actionPayload?.options) {
      return (
        <div className="mt-3 space-y-1.5">
          {msg.actionPayload.options.map((opt: string, i: number) => (
            <button
              key={i}
              onClick={() => {
                dispatch({ type: 'MARK_ACTION_HANDLED', payload: { id: msg.id } });
                dispatch({
                  type: 'ADD_MESSAGE',
                  payload: { id: uid(), role: 'user', content: opt, status: 'success', timestamp: Date.now() }
                });
                setInput('');
                setIsTyping(true);
                sendToAI(opt);
              }}
              className="w-full text-left bg-stride-50 border border-stride-200/60 hover:border-stride-300 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-stride-700 transition-colors group flex items-center justify-between"
            >
              {opt}
              <ChevronRight className="w-3 h-3 text-stride-400 group-hover:text-stride-600 opacity-0 group-hover:opacity-100 transition-all" />
            </button>
          ))}
        </div>
      );
    }

    return null;
  };

  const defaultQuickActions = hasGoals
    ? [
        { label: '✅ Daily check-in', action: () => triggerCheckinInChat() },
        { label: 'Log progress', action: () => setInput('I want to log my progress today') },
        { label: 'Add new goal', action: () => setInput('I want to set a new goal') },
        { label: 'What should I focus on?', action: () => setInput('What should I focus on today?') },
      ]
    : [
        { label: 'Help me set a goal', action: () => setInput('Help me set my first goal') },
        { label: 'I want to get fit', action: () => setInput('I want to start a fitness routine') },
        { label: 'I want to save money', action: () => setInput('I want to start saving money') },
        { label: 'I want to be more productive', action: () => setInput('I want to be more productive') },
      ];

  // Contextual suggestions with dynamic chips
  const quickActions = useMemo(() => {
    const lastAssistant = [...state.messages].reverse().find(m => m.role === 'assistant' && m.status === 'success');
    const lastText = lastAssistant && typeof lastAssistant.content === 'string' ? lastAssistant.content : null;

    // Dynamic contextual chips based on message content
    let dynamicChips: { label: string; action: () => void }[] | null = null;

    if (lastText && state.messages.length <= 4) {
      // Fresh session greeting - suggest action chips
      dynamicChips = [
        { label: 'View Goals', action: () => navigate('/dashboard/goals') },
        { label: 'New Goal', action: () => setInput('I want to create a new goal') },
        { label: 'How am I doing?', action: () => setInput('How am I doing with my goals?') },
      ];
    } else if (lastText?.toLowerCase().includes('goal') && lastText?.toLowerCase().includes('create')) {
      // Goal creation context
      dynamicChips = [
        { label: 'Health', action: () => setInput('Health goal') },
        { label: 'Career', action: () => setInput('Career goal') },
        { label: 'Learning', action: () => setInput('Learning goal') },
      ];
    } else if (lastText?.toLowerCase().includes('progress') || lastText?.toLowerCase().includes('log')) {
      // Progress/logging context
      dynamicChips = [
        { label: 'Log Progress', action: () => setInput('I completed my workout today') },
        { label: 'View Goals', action: () => navigate('/dashboard/goals') },
        { label: 'Something else', action: () => setInput('') },
      ];
    } else if (lastText?.toLowerCase().includes('frequency') || lastText?.toLowerCase().includes('how often')) {
      // Frequency selection context
      dynamicChips = [
        { label: 'Daily', action: () => setInput('Daily') },
        { label: 'Weekly', action: () => setInput('Weekly') },
        { label: '3x per week', action: () => setInput('3 times per week') },
        { label: 'Weekdays', action: () => setInput('Weekdays') },
      ];
    }

    if (dynamicChips) {
      return dynamicChips;
    }

    const contextual = getContextualSuggestions(lastText);
    if (contextual) {
      return contextual.map(s => ({
        label: s.label,
        action: () => setInput(s.text),
      }));
    }
    return defaultQuickActions;
  }, [state.messages, hasGoals, navigate]);

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] md:h-[100dvh]">
      {/* Floating Goals Summary */}
      <AnimatePresence>
        {showGoalsSummary && activeGoals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute top-14 md:top-0 left-0 right-0 z-30 p-3 md:p-4"
          >
            <div className="bg-white rounded-2xl shadow-xl shadow-stride-900/6 border border-stride-100 p-4 max-w-lg mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-stride-900">Active Goals</h3>
                <button onClick={() => setShowGoalsSummary(false)} className="text-stride-400 hover:text-stride-600">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </button>
              </div>
              <div className="space-y-2.5">
                {activeGoals.map(goal => (
                  <Link
                    key={goal.id}
                    to={`/dashboard/goals/${goal.id}`}
                    className="flex items-center gap-3 group"
                  >
                    <div className={cn("w-2 h-2 rounded-full shrink-0", getCategoryColor(goal.category as string))} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-stride-800 group-hover:text-stride-900 truncate block">{goal.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-16 h-1 bg-stride-100 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", getCategoryColor(goal.category as string))}
                          style={{ width: `${goal.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-stride-500 w-8 text-right">{goal.progress}%</span>
                    </div>
                  </Link>
                ))}
              </div>
              <Link
                to="/dashboard/goals"
                className="flex items-center justify-center gap-1.5 mt-3 pt-3 border-t border-stride-100 text-xs font-semibold text-stride-500 hover:text-stride-800 transition-colors"
              >
                View all goals <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Bar */}
      {activeGoals.length > 0 && (
        <button
          onClick={() => setShowGoalsSummary(!showGoalsSummary)}
          className="shrink-0 px-4 py-2.5 flex items-center justify-center gap-3 bg-white/60 backdrop-blur-sm border-b border-stride-100/40 hover:bg-white/80 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            {activeGoals.slice(0, 5).map(goal => (
              <div key={goal.id} className="flex items-center gap-1">
                <div className={cn("w-1.5 h-1.5 rounded-full", getCategoryColor(goal.category as string))} />
                <div className="w-8 h-1 bg-stride-100 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", getCategoryColor(goal.category as string))}
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <span className="text-[11px] font-semibold text-stride-400">
            {activeGoals.length} goal{activeGoals.length !== 1 ? 's' : ''} active
          </span>
          <ChevronRight className={cn("w-3 h-3 text-stride-400 transition-transform", showGoalsSummary && "rotate-90")} />
        </button>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto scroll-smooth" ref={scrollRef}>
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          {/* Empty state / Welcome */}
          {state.messages.length <= 2 && !hasGoals && (
            <div className="pt-8 pb-4 text-center space-y-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-stride-500 to-stride-700 text-white flex items-center justify-center mx-auto shadow-lg shadow-stride-600/20"
              >
                <Sparkles className="w-7 h-7" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <h1 className="text-2xl font-bold tracking-tight text-stride-900">Welcome to Nudge</h1>
                <p className="text-stride-500 mt-2 text-[15px] max-w-sm mx-auto leading-relaxed">
                  Tell me what you want to achieve. I'll build your goal and execution plan right here in the conversation.
                </p>
              </motion.div>
            </div>
          )}

          {state.messages.map((msg) => {
            if (msg.role === 'system') {
              return (
                <div key={msg.id} className="flex justify-center my-3">
                  <span className="text-[11px] font-semibold text-stride-400 bg-stride-50 px-3 py-1 rounded-full">
                    {typeof msg.content === 'string' ? msg.content : 'System update'}
                  </span>
                </div>
              );
            }

            const isAssistant = msg.role === 'assistant';
            const isNewAssistant = isAssistant && msg.isNew && !animatedMsgIds.has(msg.id);
            const textContent = typeof msg.content === 'string' ? msg.content : '';

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                className={cn("flex gap-2.5", msg.role === 'user' ? "justify-end" : "")}
              >
                {isAssistant && (
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-stride-500 to-stride-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-3 h-3" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[85%] text-[15px] leading-relaxed",
                  msg.role === 'user'
                    ? "bg-stride-800 text-white px-4 py-3 rounded-2xl rounded-br-md"
                    : msg.status === 'error'
                    ? "bg-red-50 border border-red-100 text-red-900 px-4 py-3 rounded-2xl rounded-bl-md"
                    : "text-stride-800 pt-1"
                )}>
                  {isAssistant && msg.status === 'success' && textContent && (
                    textContent === '__CHECKIN_CARDS__' ? (
                      renderCheckinCards()
                    ) : isNewAssistant ? (
                      <TypewriterText
                        text={textContent}
                        speed={25}
                        onComplete={() => setAnimatedMsgIds(prev => new Set(prev).add(msg.id))}
                      />
                    ) : (
                      <FormattedMessage text={textContent} />
                    )
                  )}

                  {msg.role === 'user' && textContent && (
                    <p className="whitespace-pre-wrap">{textContent}</p>
                  )}

                  {msg.status === 'error' && (
                    <div className="space-y-2">
                      {textContent && <p className="whitespace-pre-wrap">{textContent}</p>}
                      <div className="flex items-center gap-1.5 text-xs font-medium text-red-700">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {msg.errorMessage}
                      </div>
                      <Button size="sm" onClick={handleRetry} className="bg-red-100 text-red-800 hover:bg-red-200 text-xs h-8 px-3 rounded-lg">
                        <RefreshCcw className="w-3 h-3 mr-1" /> Retry
                      </Button>
                    </div>
                  )}

                  {msg.status === 'success' && renderActionUI(msg)}
                </div>
              </motion.div>
            );
          })}

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-2.5"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-stride-500 to-stride-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="w-3 h-3" />
              </div>
              <div className="flex items-center gap-1 pt-2">
                <motion.div className="w-1.5 h-1.5 rounded-full bg-stride-400" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }} />
                <motion.div className="w-1.5 h-1.5 rounded-full bg-stride-400" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }} />
                <motion.div className="w-1.5 h-1.5 rounded-full bg-stride-400" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }} />
              </div>
            </motion.div>
          )}

          {/* Scroll sentinel for smooth auto-scroll */}
          <div ref={scrollSentinelRef} className="h-px" />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="shrink-0 border-t border-stride-100/40 bg-white/80 backdrop-blur-xl">
        {!isTyping && (
          <div className="max-w-2xl mx-auto px-4 pt-2.5 pb-1">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {quickActions.map((qa, i) => (
                <button
                  key={i}
                  onClick={() => {
                    qa.action();
                    inputRef.current?.focus();
                  }}
                  className="shrink-0 px-3.5 py-2 rounded-full bg-stride-50 hover:bg-stride-100 text-xs font-semibold text-stride-600 transition-colors whitespace-nowrap active:scale-[0.97]"
                >
                  {qa.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="max-w-2xl mx-auto px-4 pb-3 pt-1.5">
          <form onSubmit={handleSend} className="relative">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={state.isAiAvailable ? "Tell me what you want to achieve..." : "AI offline. Please use manual wizard."}
              disabled={!state.isAiAvailable || isTyping}
              className="w-full h-12 pl-4 pr-12 bg-stride-50/60 border border-stride-200/50 rounded-xl text-[15px] placeholder:text-stride-400 focus:outline-none focus:ring-2 focus:ring-stride-500/30 focus:border-stride-400 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || !state.isAiAvailable || isTyping}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-stride-800 text-white rounded-lg flex items-center justify-center hover:bg-stride-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm shadow-stride-800/15"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}