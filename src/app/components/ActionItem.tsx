import { useState } from 'react';
import { Button, cn } from './shared';
import { CheckCircle2, Circle, AlertTriangle, ArrowRight, Lightbulb, RefreshCw, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type ActionType = 'direct' | 'proxy' | 'commitment' | 'reflection';

export interface Action {
  id: string;
  title: string;
  type: ActionType;
  fallbackOptions?: string[];
  isImmediate?: boolean;
}

interface ActionItemProps {
  action: Action;
  onComplete: () => void;
}

export function ActionItem({ action, onComplete }: ActionItemProps) {
  const [state, setState] = useState<'original' | 'blocked' | 'workaround_suggested' | 'workaround_selected' | 'completed'>('original');
  const [selectedFallback, setSelectedFallback] = useState<string | null>(null);

  const getActionTypeLabel = (type: ActionType) => {
    switch (type) {
      case 'direct': return 'Direct';
      case 'proxy': return 'Proxy';
      case 'commitment': return 'Commit';
      case 'reflection': return 'Reflect';
    }
  };

  const handleComplete = () => {
    setState('completed');
    setTimeout(onComplete, 400);
  };

  return (
    <div className={cn(
      "border rounded-2xl p-4 sm:p-5 transition-all duration-300",
      state === 'completed' ? "bg-green-50/40 border-green-100" : "bg-white border-gray-100 shadow-sm hover:shadow-md"
    )}>
      <AnimatePresence mode="wait">
        {(state === 'original' || state === 'workaround_selected' || state === 'completed') && (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="space-y-3"
          >
            <div className="flex items-start gap-3">
              <button onClick={handleComplete} className="mt-0.5 shrink-0 text-gray-300 hover:text-green-500 transition-colors">
                {state === 'completed' ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <Circle className="w-6 h-6" />}
              </button>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                    {getActionTypeLabel(action.type)}
                  </span>
                  {action.isImmediate && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5 fill-orange-700" /> Now
                    </span>
                  )}
                  {state === 'workaround_selected' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                      <RefreshCw className="w-2.5 h-2.5" /> Alt
                    </span>
                  )}
                </div>
                <p className={cn("text-sm font-semibold", state === 'completed' && "text-gray-400 line-through")}>
                  {state === 'workaround_selected' && selectedFallback ? selectedFallback : action.title}
                </p>
              </div>
            </div>

            {state === 'original' && (
              <div className="flex flex-wrap gap-2 pl-9">
                <button onClick={handleComplete} className="text-[11px] font-semibold text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors">
                  Done
                </button>
                <button onClick={() => setState('blocked')} className="text-[11px] font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors">
                  Can't right now
                </button>
              </div>
            )}
          </motion.div>
        )}

        {state === 'blocked' && (
          <motion.div
            key="blocked"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <div className="flex gap-3 text-orange-700 bg-orange-50 p-3.5 rounded-xl border border-orange-100">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold">Obstacle Detected</p>
                <p className="text-xs opacity-80 mt-0.5">Let's find a lower-friction alternative.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="gap-1.5 text-xs h-8 px-4 rounded-lg" onClick={() => setState('workaround_suggested')}>
                <Lightbulb className="w-3 h-3" /> Get Alternatives
              </Button>
              <Button variant="ghost" size="sm" className="text-xs h-8 text-gray-500" onClick={() => setState('original')}>
                Cancel
              </Button>
            </div>
          </motion.div>
        )}

        {state === 'workaround_suggested' && action.fallbackOptions && (
          <motion.div
            key="workaround"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <p className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-purple-600 fill-purple-600" /> Alternatives:
            </p>
            {action.fallbackOptions.map((fb, idx) => (
              <button
                key={idx}
                onClick={() => { setSelectedFallback(fb); setState('workaround_selected'); }}
                className="w-full text-left p-3 rounded-xl border border-purple-100 bg-purple-50/50 hover:bg-purple-100 hover:border-purple-200 transition-colors flex items-center justify-between group"
              >
                <span className="text-xs font-semibold text-purple-900">{fb}</span>
                <ArrowRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
            <button onClick={() => setState('original')} className="w-full text-center text-xs font-medium text-gray-400 hover:text-gray-600 py-2">
              Back to original
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
