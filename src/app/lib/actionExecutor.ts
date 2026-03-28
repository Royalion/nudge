import { Dispatch } from 'react';
import { Goal } from './store';

/**
 * Shared action executor used by both the DashboardPage and CoachPage chat interfaces.
 * Eliminates duplicated switch/case logic for AI-driven CRUD operations.
 */

type ActionType = any; // matches the store's ActionType union

interface ExecuteActionParams {
  action: string;
  payload: any;
  goals: Goal[];
  dispatch: Dispatch<ActionType>;
  onGoalCreated?: (goalId: string, title: string) => void;
  onGoalDeleted?: (title: string) => void;
  onAllGoalsDeleted?: (count: number) => void;
  onGoalUpdated?: () => void;
  onGoalStatusChanged?: (title: string, status: string) => void;
  onProgressLogged?: (progress: number) => void;
  onSettingsUpdated?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Resumed',
  paused: 'Paused',
  completed: 'Completed',
  archived: 'Archived',
};

/**
 * Execute an AI action against the store.
 * Returns the created goal ID if action is CREATE_GOAL, otherwise undefined.
 */
export function executeAction({
  action,
  payload,
  goals,
  dispatch,
  onGoalCreated,
  onGoalDeleted,
  onAllGoalsDeleted,
  onGoalUpdated,
  onGoalStatusChanged,
  onProgressLogged,
  onSettingsUpdated,
}: ExecuteActionParams): string | undefined {
  if (!payload) return undefined;

  switch (action) {
    case 'CREATE_GOAL': {
      const goalId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
      dispatch({
        type: 'ADD_GOAL',
        payload: {
          id: goalId,
          title: payload.title,
          category: payload.category || 'Dynamic',
          progress: 0,
          status: 'active',
          targetDate: payload.targetDate,
          description: payload.description,
          color: 'text-stride-500',
          plan: payload.plan,
          pace: payload.pace,
          metric: payload.metric,
          activities: payload.activities,
          replanCount: 0,
        },
      });
      onGoalCreated?.(goalId, payload.title);
      return goalId;
    }

    case 'DELETE_GOAL':
      dispatch({ type: 'DELETE_GOAL', payload: payload.goalId });
      onGoalDeleted?.(payload.goalTitle);
      break;

    case 'DELETE_ALL_GOALS': {
      const goalIds = goals.map((g) => g.id);
      goalIds.forEach((id) => dispatch({ type: 'DELETE_GOAL', payload: id }));
      onAllGoalsDeleted?.(payload.goalCount || goalIds.length);
      break;
    }

    case 'UPDATE_GOAL':
      dispatch({
        type: 'UPDATE_GOAL_DATA',
        payload: { id: payload.goalId, ...payload.updates },
      } as any);
      onGoalUpdated?.();
      break;

    case 'UPDATE_GOAL_STATUS': {
      dispatch({
        type: 'UPDATE_GOAL_STATUS',
        payload: { id: payload.goalId, status: payload.newStatus },
      });
      onGoalStatusChanged?.(
        payload.goalTitle,
        STATUS_LABELS[payload.newStatus] || payload.newStatus
      );
      break;
    }

    case 'LOG_PROGRESS': {
      if (payload.goalId) {
        const goal = goals.find((g) => g.id === payload.goalId);
        const newProgress =
          payload.newProgress ??
          Math.min(100, (goal?.progress || 0) + (payload.progressIncrement || 5));
        dispatch({
          type: 'UPDATE_GOAL_DATA',
          payload: { id: payload.goalId, progress: newProgress },
        } as any);
        onProgressLogged?.(newProgress);
      }
      break;
    }

    case 'UPDATE_SETTINGS':
      if (payload.settings) {
        dispatch({
          type: 'UPDATE_NOTIFICATION_SETTINGS',
          payload: payload.settings,
        });
        onSettingsUpdated?.();
      }
      break;
  }

  return undefined;
}
