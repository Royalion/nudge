import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { useAuth } from '../lib/auth';
import { useAppStore } from '../lib/store';
import { Button, cn } from '../components/shared';
import { FormattedMessage, getContextualSuggestions } from '../components/FormattedMessage';
import { Send, Zap, CheckCircle2, Trash2, RefreshCcw, ExternalLink, ChevronDown, ThumbsUp, ThumbsDown, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { triggerCelebration } from '../components/GoalConfetti';
import { isLoggedToday, haptic, truncateHistoryForAPI, uid } from '../lib/constants';
import { executeAction as sharedExecuteAction } from '../lib/actionExecutor';
import { motion, AnimatePresence } from 'motion/react';

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-be80a8fc`;

// Stable session ID for feedback tracking
const SESSION_ID = uid();

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string | React.ReactNode;
  actionType?: string;
  actionPayload?: any;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  actionHandled?: boolean;
  createdGoalId?: string;
};

// ── Feedback state per message ──
type FeedbackState = Record<string, 'up' | 'down' | null>;

// ── Send feedback to server (fire & forget) ──
function sendFeedback(messageId: string, messageContent: string, feedback: 'up' | 'down') {
  fetch(`${SERVER_URL}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
    body: JSON.stringify({ messageId, messageContent, feedback, sessionId: SESSION_ID }),
  }).catch(err => console.error('Feedback send error:', err));
}

// ── Animated feedback toast ──
function FeedbackToast({ type }: { type: 'up' | 'down' | 'copied' }) {
  const config = {
    up: { icon: <ThumbsUp className="w-4 h-4" />, label: 'Thanks for the feedback!', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    down: { icon: <ThumbsDown className="w-4 h-4" />, label: 'Noted — we\'ll improve', color: 'text-red-600 bg-red-50 border-red-200' },
    copied: { icon: <Check className="w-4 h-4" />, label: 'Copied to clipboard', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  }[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn("flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-semibold shadow-sm", config.color)}
    >
      {config.icon}
      {config.label}
    </motion.div>
  );
}

// ── Message action bar ──
function MessageActions({
  msg,
  feedbackState,
  onFeedback,
  onCopy,
}: {
  msg: Message;
  feedbackState: 'up' | 'down' | null;
  onFeedback: (type: 'up' | 'down') => void;
  onCopy: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-0.5 mt-1.5 -ml-1">
      <button
        onClick={() => onFeedback('up')}
        className={cn(
          "p-1.5 rounded-lg transition-all",
          feedbackState === 'up'
            ? "text-emerald-600 bg-emerald-50"
            : "text-gray-300 hover:text-gray-500 hover:bg-gray-50"
        )}
        title="Helpful"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onFeedback('down')}
        className={cn(
          "p-1.5 rounded-lg transition-all",
          feedbackState === 'down'
            ? "text-red-500 bg-red-50"
            : "text-gray-300 hover:text-gray-500 hover:bg-gray-50"
        )}
        title="Not helpful"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={handleCopy}
        className={cn(
          "p-1.5 rounded-lg transition-all",
          copied
            ? "text-blue-500 bg-blue-50"
            : "text-gray-300 hover:text-gray-500 hover:bg-gray-50"
        )}
        title="Copy message"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export function CoachPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const goalId = searchParams.get('goalId');
  const mode = searchParams.get('mode');
  const { state, dispatch } = useAppStore();
  const { session } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>({});
  const [inlineToast, setInlineToast] = useState<{ type: 'up' | 'down' | 'copied'; key: number } | null>(null);
  const [processingPhase, setProcessingPhase] = useState<string | null>(null);

  // Cycle through processing phases for long requests
  useEffect(() => {
    if (!isTyping) return;
    setProcessingPhase('thinking');
    const t1 = setTimeout(() => setProcessingPhase('analyzing'), 2000);
    const t2 = setTimeout(() => setProcessingPhase('building'), 5000);
    const t3 = setTimeout(() => setProcessingPhase('finalizing'), 9000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [isTyping]);

  // Last actionable message id for ephemeral buttons
  const lastActionableMsgId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'assistant' && msg.actionType && msg.actionType !== 'NONE' && !msg.actionHandled) {
        return msg.id;
      }
    }
    return null;
  }, [messages]);

  // ── Scroll detection ──
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 120);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  // Initialize
  useEffect(() => {
    if (mode === 'clarify' && goalId) {
      const goal = state.goals.find(g => g.id === goalId);
      if (goal) {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            id: Math.random().toString(),
            role: 'user',
            content: `I want to build an execution plan for my goal "${goal.title}"`,
            status: 'success',
            timestamp: Date.now(),
          }
        });
        navigate('/dashboard', { replace: true });
        return;
      }
    }
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: buildWelcomeMessage(),
    }]);
  }, [mode, goalId]);

  const buildWelcomeMessage = () => {
    const activeGoals = state.goals.filter(g => g.status === 'active');
    if (activeGoals.length === 0) {
      return (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-800">
            I'm your AI Agent with <b>full control</b> over your goals, plans, and settings.
          </p>
          <p className="text-sm text-gray-600">
            You don't have any goals yet. Tell me what you want to achieve — I'll create the goal AND build your execution plan in one shot.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-sm font-medium text-gray-800">
          I'm your AI Agent. I can create goals with execution plans, delete, rename, pause, resume, log progress — anything you need.
        </p>
        <div className="space-y-2">
          {activeGoals.slice(0, 4).map(goal => (
            <div key={goal.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{goal.title}</p>
                <p className="text-[11px] text-gray-500">{goal.category} • {goal.status}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-900 rounded-full" style={{ width: `${goal.progress}%` }} />
                </div>
                <span className="text-xs font-bold text-gray-600">{goal.progress}%</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-600">
          What would you like to do?
        </p>
      </div>
    );
  };

  // ── Send message to AI ──
  const sendToAI = async (userText: string) => {
    setIsTyping(true);
    setProcessingPhase('thinking');

    const newHistory = [...chatHistory, { role: 'user', content: userText }];
    setChatHistory(newHistory);

    try {
      const res = await fetch(`${SERVER_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
        body: JSON.stringify({
          message: userText,
          history: newHistory,
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Chat failed');

      setChatHistory(prev => [...prev, { role: 'assistant', content: data.text }]);

      let createdGoalId: string | undefined;
      if (data.action && data.action !== 'NONE' && !data.requiresConfirmation) {
        createdGoalId = executeAction(data.action, data.payload);
      }

      const msgId = Math.random().toString();
      const responseMsg: Message = {
        id: msgId,
        role: 'assistant',
        content: data.text,
        actionType: data.action,
        actionPayload: data.payload,
        requiresConfirmation: data.requiresConfirmation,
        confirmationMessage: data.confirmationMessage,
        actionHandled: data.action === 'CREATE_GOAL' && !data.requiresConfirmation ? true : undefined,
        createdGoalId,
      };

      setMessages(prev => [...prev, responseMsg]);
    } catch (err: any) {
      console.error('Agent chat error:', err);
      // Log error to server
      fetch(`${SERVER_URL}/api/error-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ error: err.message, context: 'chat_send', sessionId: SESSION_ID }),
      }).catch(() => {});
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        role: 'assistant',
        content: `I encountered an error: ${err.message}. Please try again.`,
      }]);
    } finally {
      setIsTyping(false);
      setProcessingPhase(null);
    }
  };

  // ── Execute actions ──
  const executeAction = (action: string, payload: any): string | undefined => {
    if (!payload) return;

    switch (action) {
      case 'CREATE_GOAL': {
        const newGoalId = uid();
        dispatch({
          type: 'ADD_GOAL',
          payload: {
            id: newGoalId,
            title: payload.title,
            category: payload.category || 'Dynamic',
            progress: 0,
            status: 'active',
            targetDate: payload.targetDate,
            color: 'text-purple-500',
            description: payload.description,
            plan: payload.plan,
            pace: payload.pace,
            metric: payload.metric,
            replanCount: 0,
          }
        });
        toast.success(`"${payload.title}" created with execution plan`, {
          action: { label: 'View', onClick: () => navigate(`/dashboard/goals/${newGoalId}`) },
        });
        triggerCelebration();
        return newGoalId;
      }

      case 'DELETE_GOAL':
        dispatch({ type: 'DELETE_GOAL', payload: payload.goalId });
        toast.success(`"${payload.goalTitle}" deleted`);
        break;

      case 'DELETE_ALL_GOALS': {
        const ids = state.goals.map(g => g.id);
        ids.forEach(id => dispatch({ type: 'DELETE_GOAL', payload: id }));
        toast.success(`All ${ids.length} goals deleted`);
        break;
      }

      case 'UPDATE_GOAL':
        dispatch({ type: 'UPDATE_GOAL_DATA', payload: { id: payload.goalId, ...payload.updates } } as any);
        toast.success('Goal updated');
        break;

      case 'UPDATE_GOAL_STATUS': {
        dispatch({ type: 'UPDATE_GOAL_STATUS', payload: { id: payload.goalId, status: payload.newStatus } });
        const labels: Record<string, string> = { active: 'Resumed', paused: 'Paused', completed: 'Completed', archived: 'Archived' };
        toast.success(`"${payload.goalTitle}" ${labels[payload.newStatus] || payload.newStatus}`);
        break;
      }

      case 'LOG_PROGRESS':
        if (payload.goalId) {
          const goal = state.goals.find(g => g.id === payload.goalId);
          const newProgress = payload.newProgress ?? Math.min(100, (goal?.progress || 0) + (payload.progressIncrement || 5));
          dispatch({ type: 'UPDATE_GOAL_DATA', payload: { id: payload.goalId, progress: newProgress } } as any);
          toast.success('Progress logged', { description: `Now at ${newProgress}%.` });
        }
        break;

      case 'UPDATE_SETTINGS':
        if (payload.settings) {
          dispatch({ type: 'UPDATE_NOTIFICATION_SETTINGS', payload: payload.settings });
          toast.success('Settings updated');
        }
        break;

      case 'CREATE_COMPOUND_GOALS': {
        const goals = Array.isArray(payload) ? payload : [];
        const linkedGroupId = uid();
        const linkedGroupName = goals[0]?.linkedGroupName || 'Linked Goals';
        const createdIds: string[] = [];
        goals.forEach((g: any) => {
          const gId = uid();
          createdIds.push(gId);
          dispatch({
            type: 'ADD_GOAL',
            payload: {
              id: gId,
              title: g.title,
              category: g.category || 'Dynamic',
              progress: 0,
              status: 'active',
              targetDate: g.targetDate,
              color: 'text-stride-500',
              description: g.description,
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
        triggerCelebration();
        return createdIds[0];
      }
    }
    return undefined;
  };

  const markHandled = (msgId: string, createdGoalId?: string) => {
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, actionHandled: true, createdGoalId } : m
    ));
  };

  const handleConfirmAction = (msgId: string, action: string, payload: any) => {
    const createdGoalId = executeAction(action, payload);
    markHandled(msgId, createdGoalId);
  };

  const handleCancelAction = (msgId: string) => {
    markHandled(msgId);
    setMessages(prev => [...prev, {
      id: Math.random().toString(),
      role: 'assistant',
      content: 'No problem — action cancelled.',
    }]);
  };

  // ── Feedback handlers ──
  const handleFeedback = (msgId: string, type: 'up' | 'down', content: string) => {
    setFeedbackState(prev => ({ ...prev, [msgId]: prev[msgId] === type ? null : type }));
    const newType = feedbackState[msgId] === type ? null : type;
    if (newType) {
      sendFeedback(msgId, content, newType);
      showInlineToast(newType);
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content).catch(() => {});
    showInlineToast('copied');
  };

  const showInlineToast = (type: 'up' | 'down' | 'copied') => {
    setInlineToast({ type, key: Date.now() });
    setTimeout(() => setInlineToast(null), 2000);
  };

  // Auto-scroll on new messages (only if near bottom)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distFromBottom < 200) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: Message = { id: Math.random().toString(), role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input.trim();
    setInput('');
    sendToAI(currentInput);
  };

  // ── Render action UI ──
  const renderActionUI = (msg: Message) => {
    if (!msg.actionType || msg.actionType === 'NONE') return null;

    if (msg.actionHandled) {
      if (msg.actionType === 'CREATE_GOAL' && msg.createdGoalId) {
        return (
          <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-bold">Goal created with plan</span>
              </div>
              <Link
                to={`/dashboard/goals/${msg.createdGoalId}`}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
              >
                View goal <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
        );
      }
      if (msg.requiresConfirmation) {
        return (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
            <CheckCircle2 className="w-3 h-3" /> Confirmed
          </div>
        );
      }
      return (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
          <CheckCircle2 className="w-3 h-3" /> Done
        </div>
      );
    }

    if (msg.id !== lastActionableMsgId) return null;

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
              className="bg-red-600 hover:bg-red-700 text-white text-xs h-8 px-4 rounded-lg font-semibold"
            >
              Yes, confirm
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCancelAction(msg.id)}
              className="text-xs h-8 px-4 rounded-lg"
            >
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    if (msg.actionType === 'SUGGEST_FALLBACK' && msg.actionPayload?.options) {
      return (
        <div className="mt-3 space-y-1.5">
          {msg.actionPayload.options.map((opt: string, i: number) => (
            <button
              key={i}
              onClick={() => {
                markHandled(msg.id);
                setInput(opt);
              }}
              className="w-full text-left bg-amber-50 border border-amber-100 hover:border-amber-200 px-3 py-2 rounded-lg text-xs font-semibold text-amber-900 transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] md:h-[100dvh]">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-gray-100/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[8px] bg-gradient-to-br from-stride-600 to-stride-800 text-white flex items-center justify-center shadow-sm shadow-stride-600/15">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-stride-900">Nudge Agent</h2>
            <p className="text-[11px] text-stride-500">Full control • Goals • Plans • Settings</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setMessages([{ id: 'welcome', role: 'assistant', content: buildWelcomeMessage() }]);
            setChatHistory([]);
            setFeedbackState({});
          }}
          className="text-xs h-7 px-2.5"
        >
          <RefreshCcw className="w-3 h-3 mr-1" /> Reset
        </Button>
      </div>

      {/* Messages */}
      <div className="relative flex-1 overflow-y-auto px-4 py-5 space-y-4" ref={scrollRef}>
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((msg) => {
            const textContent = typeof msg.content === 'string' ? msg.content : '';
            return (
              <div key={msg.id} className={cn("flex gap-2.5", msg.role === 'user' ? "justify-end" : "")}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-stride-500 to-stride-700 text-white flex items-center justify-center shrink-0 mt-1 shadow-sm shadow-stride-500/15">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="max-w-[85%]">
                  <div className={cn(
                    "rounded-2xl text-[15px] leading-relaxed",
                    msg.role === 'user'
                      ? "bg-stride-800 text-white px-4 py-3 rounded-br-md"
                      : "bg-white border border-stride-100/80 shadow-sm px-4 py-3 rounded-bl-md text-stride-800"
                  )}>
                    {typeof msg.content === 'string' ? (
                      <FormattedMessage text={msg.content} />
                    ) : (
                      msg.content
                    )}
                    {renderActionUI(msg)}
                  </div>
                  {/* Feedback actions for assistant messages */}
                  {msg.role === 'assistant' && msg.id !== 'welcome' && (
                    <MessageActions
                      msg={msg}
                      feedbackState={feedbackState[msg.id] || null}
                      onFeedback={(type) => handleFeedback(msg.id, type, textContent)}
                      onCopy={() => handleCopyMessage(textContent)}
                    />
                  )}
                </div>
              </div>
            );
          })}
          {isTyping && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-stride-500 to-stride-700 text-white flex items-center justify-center shrink-0 mt-1 shadow-sm shadow-stride-500/15">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-stride-100/80 shadow-sm px-4 py-3 rounded-2xl rounded-bl-md"
              >
                <div className="flex items-center gap-3">
                  {/* Animated processing spinner */}
                  <div className="relative w-5 h-5">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 rounded-full border-2 border-stride-200 border-t-stride-500"
                    />
                  </div>
                  <motion.span
                    key={processingPhase}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-[13px] font-medium text-stride-500"
                  >
                    {processingPhase === 'thinking' && 'Thinking...'}
                    {processingPhase === 'analyzing' && 'Analyzing your request...'}
                    {processingPhase === 'building' && 'Building your plan...'}
                    {processingPhase === 'finalizing' && 'Almost there...'}
                    {!processingPhase && 'Processing...'}
                  </motion.span>
                </div>
              </motion.div>
            </div>
          )}
        </div>

        {/* Inline feedback toast */}
        <div className="fixed bottom-36 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <AnimatePresence>
            {inlineToast && (
              <FeedbackToast key={inlineToast.key} type={inlineToast.type} />
            )}
          </AnimatePresence>
        </div>

        {/* Scroll to bottom FAB */}
        <AnimatePresence>
          {showScrollBtn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={scrollToBottom}
              className="fixed bottom-36 right-6 md:right-auto md:left-1/2 md:translate-x-[calc(50%+320px)] w-9 h-9 bg-white rounded-full shadow-lg shadow-black/10 border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors z-40"
              title="Scroll to bottom"
            >
              <motion.div
                animate={{ y: [0, 3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ChevronDown className="w-4 h-4 text-gray-600" />
              </motion.div>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Quick actions */}
      {!isTyping && (() => {
        const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant' && typeof m.content === 'string');
        const lastText = lastAssistant && typeof lastAssistant.content === 'string' ? lastAssistant.content : null;
        const contextual = getContextualSuggestions(lastText);
        const chips = contextual
          ? contextual.map(s => ({ label: s.label, text: s.text }))
          : [
              { label: 'Create a new goal', text: 'I want to create a new goal' },
              { label: 'Show my goals', text: 'Show me all my goals and their status' },
              { label: 'Log progress', text: 'I want to log progress on one of my goals' },
              { label: 'Delete a goal', text: 'I want to delete a goal' },
            ];
        return (
          <div className="shrink-0 px-4 pb-1">
            <div className="max-w-2xl mx-auto flex gap-2 overflow-x-auto hide-scrollbar pb-1">
              {chips.map(qa => (
                <button
                  key={qa.label}
                  onClick={() => setInput(qa.text)}
                  className="shrink-0 px-3 py-2 rounded-full bg-stride-50 hover:bg-stride-100 text-xs font-semibold text-stride-600 transition-colors whitespace-nowrap active:scale-[0.97]"
                >
                  {qa.label}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Input */}
      <div className="shrink-0 px-4 py-3 bg-white/80 backdrop-blur-xl border-t border-gray-100/60">
        <form onSubmit={handleSend} className="relative max-w-2xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Create, delete, rename, pause, log progress..."
            className="w-full h-12 pl-4 pr-12 bg-stride-50/60 border border-stride-200/50 rounded-xl text-[15px] placeholder:text-stride-400 focus:outline-none focus:ring-2 focus:ring-stride-500/30 focus:border-stride-400 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-stride-800 text-white rounded-lg flex items-center justify-center hover:bg-stride-900 transition-colors disabled:opacity-30 shadow-sm shadow-stride-800/15"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}