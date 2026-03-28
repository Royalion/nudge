import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAppStore } from '../lib/store';
import { Sparkles } from 'lucide-react';

/**
 * NewGoalPage now redirects to the Agent chat (dashboard).
 * All goal creation happens through the AI agent in a conversational flow.
 */
export function NewGoalPage() {
  const navigate = useNavigate();
  const { dispatch } = useAppStore();

  useEffect(() => {
    // Inject a user message with goal creation intent to kick off the flow
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: Math.random().toString(),
        role: 'user',
        content: 'I want to create a new goal',
        status: 'success',
        timestamp: Date.now(),
        actionType: 'NONE',
      }
    });
    navigate('/dashboard', { replace: true });
  }, [dispatch, navigate]);

  // Brief loading state while redirecting
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-stride-500 to-stride-700 text-white flex items-center justify-center animate-pulse shadow-lg shadow-stride-600/20">
          <Sparkles className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-stride-400">Redirecting to Agent...</p>
      </div>
    </div>
  );
}