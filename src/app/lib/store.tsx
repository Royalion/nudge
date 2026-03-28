import { createContext, useContext, useReducer, useEffect, useRef, ReactNode, Dispatch } from 'react';
import { useAuth } from './auth';
import { getFreshToken } from './supabase';
import { projectId, publicAnonKey } from '/utils/supabase/info';

// ────────────────────────────────── TYPES ──────────────────────────────────
export type GoalStatus = 'active' | 'paused' | 'completed' | 'archived';
export type Category = 'Health' | 'Money' | 'Weight' | 'Career' | 'Mind' | 'Relationships' | 'Home' | 'Discipline' | 'Productivity' | 'Dynamic';

export interface Activity {
  id: string;
  text: string;
  dueDateTier: 'today' | 'week' | 'future';
  isLogged: boolean;
  emoji: string;
  completedAt?: string;
  // Activity adaptation metadata
  type?: 'sequential' | 'flexible' | 'time_sensitive' | 'frequency' | 'tracking';
  prerequisiteFor?: string[];
  minimalVersion?: string;
  intensity?: number;
  deadline?: string;
  frequency?: string;
  canPostpone?: boolean;
  skipReason?: string;
  skipReasonCategory?: 'too_tired' | 'not_enough_time' | 'external_blocker' | 'other';
  regeneratedFrom?: string;
  regeneratedAt?: string;
}

export interface Goal {
  id: string;
  title: string;
  category: Category | string;
  progress: number;
  status: GoalStatus;
  targetDate?: string;
  description?: string;
  color: string;
  metric?: {
    unit: string;
    targetValue: number;
    currentValue: number;
  };
  deadline?: string;
  pace?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    amount: number;
    label?: string;
  };
  plan?: {
    summary: string;
    projectionOfSuccess: string;
    implementationIntentionRules: string[];
    fallbackOptions: string[];
    todayAction?: string;
    todayFocus?: string;
    todayActionLabel?: string;
  };
  activities?: Activity[];
  logs?: LogEntry[];
  replanCount?: number;
  bestStreak?: number;
  createdAt?: string;
  linkedGroupId?: string;
  linkedGroupName?: string;
}

export interface LogEntry {
  date: string;
  action: string;
  progress: number;
  note?: string;
}

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | ReactNode;
  actionType?: 'CREATE_GOAL' | 'LOG_PROGRESS' | 'SUGGEST_FALLBACK' | 'UPDATE_PLAN' | 'DELETE_GOAL' | 'DELETE_ALL_GOALS' | 'UPDATE_GOAL' | 'UPDATE_GOAL_STATUS' | 'UPDATE_SETTINGS' | 'NONE';
  actionPayload?: any;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  actionHandled?: boolean;
  createdGoalId?: string;
  status: 'sending' | 'success' | 'error';
  errorMessage?: string;
  timestamp: number;
  isNew?: boolean;
};

// Serializable version of Message for persistence (no ReactNode)
export type SerializableMessage = Omit<Message, 'content' | 'isNew'> & {
  content: string;
};

export type NotificationSettings = {
  pushEnabled: boolean;
  emailEnabled: boolean;
  dailyCheckInTime: string;
  frequency: 'high' | 'balanced' | 'low';
  coachProactive: boolean;
};

export type RetentionState = {
  lastActiveDate: string;
  daysMissed: number;
  isRecoveryMode: boolean;
  hasSeenReminderPrompt: boolean;
};

export type UserState = {
  isPremium: boolean;
  createdAt?: string;
};

// ───────────────────────────── PERSISTABLE STATE ──────────────────────────
// Everything the user would lose if we didn't save it
export interface PersistableState {
  goals: Goal[];
  messages: SerializableMessage[];
  notificationSettings: NotificationSettings;
  retentionState: RetentionState;
  userState: UserState;
}

// ─────────────────────────────── FULL STATE ──────────────────────────────
interface State {
  goals: Goal[];
  actions: { id: string; title: string; type: string; fallbackOptions?: string[]; isImmediate?: boolean }[];
  messages: Message[];
  isAiAvailable: boolean;
  notificationSettings: NotificationSettings;
  retentionState: RetentionState;
  userState: UserState;
  _hydrated: boolean;
  _hydrating: boolean;
  _saveVersion: number;
}

// ──────────────────────────────── ACTIONS ─────────────────────────────────
type ActionType =
  | { type: 'ADD_GOAL'; payload: Goal }
  | { type: 'UPDATE_GOAL_STATUS'; payload: { id: string; status: GoalStatus } }
  | { type: 'UPDATE_GOAL_DATA'; payload: Partial<Goal> & { id: string } }
  | { type: 'DELETE_GOAL'; payload: string }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE_STATUS'; payload: { id: string; status: 'success' | 'error'; errorMessage?: string; actionType?: string; actionPayload?: any; content?: string; requiresConfirmation?: boolean; confirmationMessage?: string } }
  | { type: 'MARK_ACTION_HANDLED'; payload: { id: string; createdGoalId?: string } }
  | { type: 'SET_AI_AVAILABILITY'; payload: boolean }
  | { type: 'COMPLETE_ACTION'; payload: string }
  | { type: 'UPDATE_NOTIFICATION_SETTINGS'; payload: Partial<NotificationSettings> }
  | { type: 'UPDATE_RETENTION_STATE'; payload: Partial<RetentionState> }
  | { type: 'DISMISS_REMINDER_PROMPT' }
  | { type: 'UPGRADE_TO_PREMIUM' }
  | { type: 'HYDRATE_STATE'; payload: PersistableState }
  | { type: 'SET_HYDRATING'; payload: boolean };

// ──────────────────────────── DEFAULT MESSAGES ───────────────────────────
const defaultMessages: Message[] = [
  {
    id: 'init-1',
    role: 'system',
    content: 'Connected securely. AI agent is ready.',
    status: 'success',
    timestamp: Date.now() - 10000
  },
  {
    id: 'init-2',
    role: 'assistant',
    content: "Hi there! I'm your Nudge agent. I can create goals with execution plans, track your progress, and help you stay on pace. What would you like to work on?",
    status: 'success',
    timestamp: Date.now() - 5000
  }
];

const initialState: State = {
  goals: [],
  actions: [],
  messages: [...defaultMessages],
  isAiAvailable: true,
  notificationSettings: {
    pushEnabled: false,
    emailEnabled: false,
    dailyCheckInTime: '09:00',
    frequency: 'balanced',
    coachProactive: true,
  },
  retentionState: {
    lastActiveDate: new Date().toISOString(),
    daysMissed: 0,
    isRecoveryMode: false,
    hasSeenReminderPrompt: false,
  },
  userState: {
    isPremium: false,
  },
  _hydrated: false,
  _hydrating: false,
  _saveVersion: 0,
};

// ────────────────────── PERSISTENCE CONFIGURATION ────────────────────────
// Actions that should trigger a backend save
// Note: Messages are session-only and should NOT be persisted
const PERSISTABLE_ACTIONS = new Set([
  'ADD_GOAL', 'UPDATE_GOAL_STATUS', 'UPDATE_GOAL_DATA', 'DELETE_GOAL',
  'MARK_ACTION_HANDLED',
  'UPDATE_NOTIFICATION_SETTINGS', 'UPDATE_RETENTION_STATE',
  'DISMISS_REMINDER_PROMPT', 'UPGRADE_TO_PREMIUM'
]);

// Max messages to persist (keep recent history, trim old ones)
const MAX_PERSISTED_MESSAGES = 200;

// ──────────────────────── SERIALIZATION HELPERS ──────────────────────────
function serializeMessages(messages: Message[]): SerializableMessage[] {
  return messages
    .filter(m => m.status !== 'sending' && typeof m.content === 'string')
    .slice(-MAX_PERSISTED_MESSAGES)
    .map(m => ({
      id: m.id,
      role: m.role,
      content: m.content as string,
      actionType: m.actionType,
      actionPayload: m.actionPayload,
      requiresConfirmation: m.requiresConfirmation,
      confirmationMessage: m.confirmationMessage,
      actionHandled: m.actionHandled,
      createdGoalId: m.createdGoalId,
      status: m.status,
      errorMessage: m.errorMessage,
      timestamp: m.timestamp,
    }));
}

function deserializeMessages(msgs: SerializableMessage[]): Message[] {
  if (!msgs || !Array.isArray(msgs) || msgs.length === 0) {
    return [...defaultMessages];
  }
  return msgs.map(m => ({
    ...m,
    isNew: false, // Never animate restored messages
  }));
}

// ──────────────────────────────── REDUCER ─────────────────────────────────
const reducer = (state: State, action: ActionType): State => {
  const shouldPersist = PERSISTABLE_ACTIONS.has(action.type);
  const bumpVersion = (s: State) => shouldPersist ? { ...s, _saveVersion: s._saveVersion + 1 } : s;

  switch (action.type) {
    case 'SET_HYDRATING':
      return { ...state, _hydrating: action.payload };

    case 'HYDRATE_STATE': {
      const restored = action.payload;
      return {
        ...state,
        goals: restored.goals || [],
        messages: [...defaultMessages], // Messages are session-only, always start fresh
        notificationSettings: { ...state.notificationSettings, ...(restored.notificationSettings || {}) },
        retentionState: { ...state.retentionState, ...(restored.retentionState || {}) },
        userState: { ...state.userState, ...(restored.userState || {}) },
        _hydrated: true,
        _hydrating: false,
      };
    }

    case 'ADD_GOAL':
      return bumpVersion({
        ...state,
        goals: [...state.goals, { ...action.payload, createdAt: action.payload.createdAt || new Date().toISOString() }]
      });

    case 'UPDATE_GOAL_STATUS':
      return bumpVersion({
        ...state,
        goals: state.goals.map(g => g.id === action.payload.id ? { ...g, status: action.payload.status } : g)
      });

    case 'UPDATE_GOAL_DATA':
      return bumpVersion({
        ...state,
        goals: state.goals.map(g => g.id === action.payload.id ? { ...g, ...action.payload } : g)
      });

    case 'DELETE_GOAL':
      return bumpVersion({ ...state, goals: state.goals.filter(g => g.id !== action.payload) });

    case 'ADD_MESSAGE':
      return bumpVersion({ ...state, messages: [...state.messages, action.payload] });

    case 'UPDATE_MESSAGE_STATUS':
      return bumpVersion({
        ...state,
        messages: state.messages.map(m =>
          m.id === action.payload.id
            ? {
                ...m,
                status: action.payload.status,
                errorMessage: action.payload.errorMessage,
                actionType: action.payload.actionType as any,
                actionPayload: action.payload.actionPayload,
                requiresConfirmation: action.payload.requiresConfirmation,
                confirmationMessage: action.payload.confirmationMessage,
                content: action.payload.content || m.content,
                isNew: action.payload.status === 'success' && m.status === 'sending',
              }
            : m
        )
      });

    case 'MARK_ACTION_HANDLED':
      return bumpVersion({
        ...state,
        messages: state.messages.map(m =>
          m.id === action.payload.id
            ? { ...m, actionHandled: true, createdGoalId: action.payload.createdGoalId }
            : m
        )
      });

    case 'SET_AI_AVAILABILITY':
      return { ...state, isAiAvailable: action.payload };

    case 'COMPLETE_ACTION':
      return { ...state, actions: state.actions.filter(a => a.id !== action.payload) };

    case 'UPDATE_NOTIFICATION_SETTINGS':
      return bumpVersion({ ...state, notificationSettings: { ...state.notificationSettings, ...action.payload } });

    case 'UPDATE_RETENTION_STATE':
      return bumpVersion({ ...state, retentionState: { ...(state.retentionState || {}), ...action.payload } });

    case 'DISMISS_REMINDER_PROMPT':
      return bumpVersion({ ...state, retentionState: { ...(state.retentionState || {}), hasSeenReminderPrompt: true } });

    case 'UPGRADE_TO_PREMIUM':
      return bumpVersion({ ...state, userState: { ...(state.userState || {}), isPremium: true } });

    default:
      return state;
  }
};

// ──────────────────────────── CONTEXT & HOOKS ────────────────────────────
const AppStoreContext = createContext<{
  state: State;
  dispatch: Dispatch<ActionType>;
} | null>(null);

// ─────────────────────── DEBOUNCED SAVE HOOK ─────────────────────────────
function useDebouncedSave(state: State, accessToken: string | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedVersionRef = useRef(0);
  const isSavingRef = useRef(false);
  const stateRef = useRef(state);

  // Keep stateRef in sync so debounced save always has latest state
  stateRef.current = state;

  useEffect(() => {
    if (!accessToken || !state._hydrated) return;
    if (state._saveVersion <= lastSavedVersionRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;

      // Use stateRef.current to always get the latest state,
      // not the potentially stale closure-captured state
      const currentState = stateRef.current;
      const persistable: PersistableState = {
        goals: currentState.goals,
        messages: [], // Messages are session-only, not persisted
        notificationSettings: currentState.notificationSettings,
        retentionState: {
          ...currentState.retentionState,
          lastActiveDate: new Date().toISOString(),
        },
        userState: currentState.userState,
      };

      try {
        // Get a fresh user token for user identification
        const freshToken = await getFreshToken();
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-be80a8fc/api/state/save`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-User-Token': freshToken
          },
          body: JSON.stringify({ state: persistable })
        });
        if (res.ok) {
          lastSavedVersionRef.current = currentState._saveVersion;
          console.log('[Nudge] State saved successfully, version:', currentState._saveVersion);
        } else {
          const errText = await res.text();
          console.error('[Nudge] State save failed:', res.status, errText);
        }
      } catch (err) {
        console.error('[Nudge] State save network error:', err);
      } finally {
        isSavingRef.current = false;
      }
    }, 600);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state._saveVersion, state._hydrated, accessToken]);

  // Flush on unmount / page close
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentState = stateRef.current;
      if (!accessToken || !currentState._hydrated) return;
      if (currentState._saveVersion <= lastSavedVersionRef.current) return;

      const persistable: PersistableState = {
        goals: currentState.goals,
        messages: [], // Messages are session-only, not persisted
        notificationSettings: currentState.notificationSettings,
        retentionState: { ...currentState.retentionState, lastActiveDate: new Date().toISOString() },
        userState: currentState.userState,
      };

      // Use fetch with keepalive for reliability on page close
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-be80a8fc/api/state/save`;
      try {
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-User-Token': accessToken
          },
          body: JSON.stringify({ state: persistable }),
          keepalive: true,
        });
      } catch (_) { /* best-effort flush */ }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [accessToken]);
}

// ──────────────────────────── PROVIDER ────────────────────────────────────
export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { session, user, loading: authLoading } = useAuth();
  const accessToken = session?.access_token || null;
  const hasLoadedRef = useRef(false);
  const stateRef = useRef(state);

  // Keep stateRef in sync so debounced save always has latest state
  stateRef.current = state;

  // Reset load tracking when user signs out so next login triggers a fresh load
  useEffect(() => {
    if (!user && !authLoading) {
      hasLoadedRef.current = false;
    }
  }, [user, authLoading]);

  // Load state from backend on login
  useEffect(() => {
    if (authLoading) return;
    if (!accessToken || !user?.id) {
      // Guest / logged out — mark hydrated with empty state
      if (!state._hydrated) {
        dispatch({
          type: 'HYDRATE_STATE',
          payload: {
            goals: [],
            messages: [], // Session-only, will be filled with defaultMessages
            notificationSettings: initialState.notificationSettings,
            retentionState: initialState.retentionState,
            userState: initialState.userState,
          }
        });
      }
      return;
    }
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    dispatch({ type: 'SET_HYDRATING', payload: true });

    (async () => {
      try {
        // Get a fresh token to avoid "Invalid JWT" from expired tokens
        const freshToken = await getFreshToken();
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-be80a8fc/api/state/load`;
        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'X-User-Token': freshToken
          }
        });
        const data = await res.json();
        if (data.state) {
          console.log('[Nudge] State loaded from backend:', {
            goals: data.state.goals?.length || 0,
            messages: data.state.messages?.length || 0,
          });
          dispatch({ type: 'HYDRATE_STATE', payload: data.state });
        } else {
          console.log('[Nudge] No saved state found, initializing fresh state for new user');
          // New user — empty state
          dispatch({
            type: 'HYDRATE_STATE',
            payload: {
              goals: [],
              messages: [], // Session-only, will be filled with defaultMessages
              notificationSettings: initialState.notificationSettings,
              retentionState: initialState.retentionState,
              userState: { isPremium: false, createdAt: new Date().toISOString() },
            }
          });
        }
      } catch (err) {
        console.error('State load error:', err);
        dispatch({
          type: 'HYDRATE_STATE',
          payload: {
            goals: [],
            messages: [], // Session-only, will be filled with defaultMessages
            notificationSettings: initialState.notificationSettings,
            retentionState: initialState.retentionState,
            userState: initialState.userState,
          }
        });
      }
    })();
  }, [accessToken, user?.id, authLoading]);

  // Auto-save to backend on state changes
  useDebouncedSave(state, accessToken);

  return (
    <AppStoreContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppStoreContext);
  if (!context) throw new Error('useAppStore must be used within an AppStoreProvider');
  return context;
}