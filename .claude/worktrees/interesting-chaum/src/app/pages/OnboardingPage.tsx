import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Button, Input, Textarea, Select, Label, Card, cn } from '../components/shared';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, ArrowLeft, Plus, Check, Trash2, 
  DollarSign, Activity, Apple, Target, Brain, 
  Heart, Briefcase, TrendingUp, CheckCircle, Compass, Sparkles, X, Repeat, Rocket
} from 'lucide-react';
import svgPaths from "../../imports/svg-oznyxr4yzp";
import newSvgPaths from "../../imports/svg-ouag2489bx";

import { ActionItem, Action } from '../components/ActionItem';

const GOAL_CATEGORIES = [
  { id: 'money', label: 'Money', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { id: 'fitness', label: 'Fitness / Exercise', icon: Activity, color: 'text-orange-600', bg: 'bg-orange-100' },
  { id: 'nutrition', label: 'Nutrition / Weight', icon: Apple, color: 'text-red-600', bg: 'bg-red-100' },
  { id: 'productivity', label: 'Productivity / Focus', icon: Target, color: 'text-blue-600', bg: 'bg-blue-100' },
  { id: 'mental', label: 'Mental Wellbeing', icon: Brain, color: 'text-purple-600', bg: 'bg-purple-100' },
  { id: 'relationships', label: 'Relationships', icon: Heart, color: 'text-pink-600', bg: 'bg-pink-100' },
  { id: 'career', label: 'Career / Education', icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { id: 'growth', label: 'Personal Growth', icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-100' },
  { id: 'habits', label: 'Habits / Discipline', icon: CheckCircle, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  { id: 'other', label: 'Other', icon: Compass, color: 'text-gray-600', bg: 'bg-gray-100' },
];

const GOAL_TEMPLATES: Record<string, string[]> = {
  money: ['Save $200 this month', 'Pay off credit card debt', 'Build a 3-month emergency fund'],
  fitness: ['Lose 5 pounds in 6 weeks', 'Run a 5K', 'Workout 3 times a week'],
  nutrition: ['Eat 5 servings of vegetables daily', 'Cut out sugary drinks', 'Cook dinner at home 4 nights a week'],
  productivity: ['Read 1 book per month', 'Stop procrastinating on mornings', 'Implement the Pomodoro technique'],
  mental: ['Meditate 10 minutes daily', 'Sleep 8 hours every night', 'Write in a journal daily'],
  relationships: ['Call mom once a week', 'Be more patient with my brother', 'Schedule a weekly date night'],
  career: ['Apply to 10 jobs this month', 'Update my resume and LinkedIn', 'Ask for a promotion'],
  growth: ['Learn a new language', 'Take a public speaking course', 'Read 12 books this year'],
  habits: ['Make bed every morning', 'No screen time 1 hour before bed', 'Drink 8 glasses of water daily'],
  other: ['Start a side hustle', 'Plan a vacation', 'Declutter the house'],
};

type Goal = {
  id: string;
  categoryId: string;
  statement: string;
  outcome: string;
  timeframe: string;
  priority: string;
};

type Step = 'WELCOME' | 'GOALS_LIST' | 'ADD_CATEGORY' | 'ADD_DETAILS' | 'PREFERENCES' | 'REVIEW' | 'CLARIFY_GOALS' | 'GENERATING_PLANS' | 'REVIEW_PLANS';

export function OnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState<Step>('WELCOME');
  
  const [goals, setGoals] = useState<Goal[]>([]);
  
  // Temporary state for the goal currently being added
  const [currentGoalCategory, setCurrentGoalCategory] = useState<string | null>(null);
  const [currentGoalDetails, setCurrentGoalDetails] = useState({
    statement: '',
    outcome: '',
    timeframe: '',
    priority: 'medium'
  });

  useEffect(() => {
    if (location.state?.demoGoal) {
      setCurrentGoalCategory(location.state.demoGoal.categoryId);
      setCurrentGoalDetails(prev => ({ ...prev, statement: location.state.demoGoal.statement }));
      setStep('ADD_DETAILS');
      // Clear state so it doesn't trigger again on reload
      navigate('.', { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const [preferences, setPreferences] = useState({
    checkInTime: 'Morning',
    coachTone: 'Encouraging'
  });

  const [clarifyGoalIndex, setClarifyGoalIndex] = useState(0);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, Record<string, string>>>({});
  const [generatedPlans, setGeneratedPlans] = useState<Record<string, any>>({});

  const handleStartAddGoal = () => {
    setCurrentGoalCategory(null);
    setCurrentGoalDetails({ statement: '', outcome: '', timeframe: '', priority: 'medium' });
    setStep('ADD_CATEGORY');
  };

  const handleSelectCategory = (categoryId: string) => {
    setCurrentGoalCategory(categoryId);
    setStep('ADD_DETAILS');
  };

  const handleSaveGoal = () => {
    if (!currentGoalCategory || !currentGoalDetails.statement) return;
    
    const newGoal: Goal = {
      id: Math.random().toString(36).substring(7),
      categoryId: currentGoalCategory,
      ...currentGoalDetails
    };
    
    setGoals([...goals, newGoal]);
    setStep('GOALS_LIST');
  };

  const removeGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const handleComplete = () => {
    setClarifyGoalIndex(0);
    setStep('CLARIFY_GOALS');
  };

  const getCategory = (id: string) => GOAL_CATEGORIES.find(c => c.id === id);

  const getQuestions = (categoryId: string, statement: string) => {
    const isVague = statement.toLowerCase().includes('happier') || statement.toLowerCase().includes('better');
    const isUnrealistic = statement.toLowerCase().includes('1m') || statement.toLowerCase().includes('million');
    
    let baseQuestions = [
      { id: 'metric', label: isVague ? 'This is a broad goal. What specific measurable action makes you feel this way?' : 'How exactly will you measure success?', placeholder: isVague ? 'e.g. 2 hours of free time, call a friend' : 'e.g. 10 lbs lost, $1000 saved, 5 days/week' },
      { id: 'current', label: 'What is your current baseline or habit?', placeholder: 'e.g. I currently save $0, I run 1 mile' },
      { id: 'resources', label: 'What resources do you have available?', placeholder: 'e.g. Gym membership, $100/mo budget, free weekends' },
      { id: 'obstacle', label: 'What is the biggest likely obstacle?', placeholder: 'e.g. I get lazy on weekends, unexpected expenses' },
      { id: 'difficulty', label: 'What is your preferred difficulty?', type: 'select', options: ['Easy & Steady', 'Moderate (Recommended)', 'Aggressive (Fast but hard)'] },
      { id: 'effort', label: 'How much time/effort can you dedicate weekly?', type: 'select', options: ['1-2 hours', '3-5 hours', '5-10 hours', '10+ hours'] },
    ];

    if (isUnrealistic) {
      baseQuestions.unshift({
        id: 'reframe',
        label: 'This goal seems highly unrealistic for standard timelines. How about we reframe to a practical stepping stone?',
        type: 'select',
        options: ['Yes, reframe to "Create a high-income skill roadmap"', 'Yes, reframe to "Launch a minimum viable product"', 'No, keep my impossible goal']
      });
    }

    return baseQuestions;
  };

  const handleClarificationChange = (goalId: string, questionId: string, value: string) => {
    setClarificationAnswers(prev => ({
      ...prev,
      [goalId]: {
        ...(prev[goalId] || {}),
        [questionId]: value
      }
    }));
  };

  const generateAllPlans = () => {
    const plans: Record<string, any> = {};
    goals.forEach(goal => {
      const answers = clarificationAnswers[goal.id] || {};
      const metricText = answers.metric || 'your success metric';
      const obstacleText = answers.obstacle || 'typical roadblocks';
      let resourceText = answers.resources || 'your available resources';
      const effortText = answers.effort || 'consistent effort';
      
      const statementLower = goal.statement.toLowerCase();
      let reframedStatement = goal.statement;
      let isReframed = false;
      
      if (answers.reframe && answers.reframe.startsWith('Yes')) {
        reframedStatement = answers.reframe.replace('Yes, reframe to ', '').replace(/"/g, '');
        isReframed = true;
      }
      
      const lacksResources = resourceText.toLowerCase().includes('none') || resourceText.toLowerCase().includes('no laptop') || resourceText.toLowerCase().includes('don\'t have');
      
      plans[goal.id] = {
        outcomeSummary: isReframed ? `Reframed Goal: Achieve a practical target of "${reframedStatement}" by your deadline.` : `Achieve a measurable target of "${metricText}" by your deadline of ${goal.timeframe}.`,
        planSummary: lacksResources ? 
          `Constraint Detected: You lack standard resources. We will implement a low-friction "Scrappy" strategy using alternative methods to bypass "${obstacleText}".` : 
          `We will implement a ${answers.difficulty || 'Moderate'} execution strategy, utilizing "${resourceText}" to maintain momentum. We've built in contingencies for when you encounter "${obstacleText}".`,
        actionBreakdown: [
          `Phase 1: ${lacksResources ? 'Identify zero-cost workarounds' : 'Baseline setup & preparation'}`,
          `Phase 2: Establish the "${effortText}" weekly cadence`,
          `Phase 3: Optimize to overcome "${obstacleText}"`,
          `Phase 4: Final push to hit "${isReframed ? reframedStatement : metricText}"`
        ],
        routines: [
          `Daily: Execute 1 small step towards ${isReframed ? reframedStatement.toLowerCase() : goal.statement.toLowerCase()}`,
          `Weekly: Review progress against "${isReframed ? reframedStatement : metricText}"`,
          `Weekly: Pre-plan around "${obstacleText}"`
        ],
        nextActions: [
          {
            id: `${goal.id}-a1`,
            title: lacksResources ? `Find a pen and paper to draft your first step (No laptop needed)` : `Define exact starting baseline for "${isReframed ? reframedStatement : metricText}"`,
            type: 'direct',
            isImmediate: true,
            fallbackOptions: lacksResources ? 
              [`Use your phone's notes app`, `Borrow a friend's device for 10 minutes`] : 
              [`Just estimate your current number if you can't measure exactly yet`, `Write down your best guess on a sticky note`]
          },
          {
            id: `${goal.id}-a2`,
            title: lacksResources ? `Complete first tiny action using alternative method` : `Set up environment using "${resourceText}"`,
            type: 'commitment',
            fallbackOptions: [
              `Use whatever alternative is in the room right now`,
              `Schedule 10 minutes tomorrow to find what you need`
            ]
          },
          {
            id: `${goal.id}-a3`,
            title: `Log how you will handle "${obstacleText}"`,
            type: 'reflection',
            fallbackOptions: [
              `Mentally commit to pausing when it happens`,
              `Ask a friend to hold you accountable`
            ]
          }
        ]
      };
    });
    setGeneratedPlans(plans);
  };

  const handleNextClarification = () => {
    if (clarifyGoalIndex === goals.length - 1) {
      setStep('GENERATING_PLANS');
      setTimeout(() => {
        generateAllPlans();
        setStep('REVIEW_PLANS');
      }, 3000);
    } else {
      setClarifyGoalIndex(i => i + 1);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FAFA] flex flex-col font-sans text-stride-900">
      {/* Header */}
      <header className="absolute top-0 w-full p-6 flex justify-between items-center z-10 bg-white/50 backdrop-blur-sm border-b border-gray-100">
        <div className="flex items-center gap-2 font-bold text-xl">
          <svg width={30} height={30} viewBox="0 0 48 48" fill="none" className="shrink-0">
            <path d={newSvgPaths.pf24700} fill="url(#ob-lg-a)" />
            <path d={newSvgPaths.p3dc95c00} fill="url(#ob-lg-b)" />
            <defs>
              <radialGradient cx="0" cy="0" gradientTransform="translate(24 25.5) rotate(92.0096) scale(28.5175)" gradientUnits="userSpaceOnUse" id="ob-lg-a" r="1">
                <stop stopColor="#56EFFF" />
                <stop offset="1" stopColor="#004A53" />
              </radialGradient>
              <radialGradient cx="0" cy="0" gradientTransform="translate(24 25.5) rotate(92.0096) scale(28.5175)" gradientUnits="userSpaceOnUse" id="ob-lg-b" r="1">
                <stop stopColor="#56EFFF" />
                <stop offset="1" stopColor="#004A53" />
              </radialGradient>
            </defs>
          </svg>
          Nudge
        </div>
        {step !== 'WELCOME' && (
          <div className="text-sm font-medium text-gray-500">
            Setup Progress: {goals.length} Goal{goals.length !== 1 && 's'} Added
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 pt-24 pb-24 relative overflow-hidden">
        <AnimatePresence mode="wait">
          
          {step === 'WELCOME' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-lg text-center space-y-8"
            >
              <div className="w-24 h-24 mx-auto rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex items-center justify-center border border-gray-100">
                <Sparkles className="w-10 h-10 text-black" />
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Welcome to Nudge</h1>
                <p className="text-lg text-gray-600 max-w-md mx-auto leading-relaxed">
                  We're going to build a personalized system for your life. Instead of just tracking tasks, we help you balance multiple meaningful goals by breaking them down into actionable daily progress rings.
                </p>
              </div>
              <Button size="lg" className="w-full sm:w-auto px-12 h-14 text-lg" onClick={() => setStep('GOALS_LIST')}>
                Get Started
              </Button>
            </motion.div>
          )}

          {step === 'GOALS_LIST' && (
            <motion.div
              key="goals_list"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl"
            >
              <div className="text-center mb-10 space-y-3">
                <h2 className="text-3xl font-bold tracking-tight">Your Goals</h2>
                <p className="text-gray-500 text-lg">
                  {goals.length === 0 
                    ? "Let's add the first goal you want to focus on." 
                    : "Add more goals or continue to finalize your system."}
                </p>
              </div>

              {goals.length > 0 && (
                <div className="space-y-4 mb-8">
                  {goals.map((goal) => {
                    const cat = getCategory(goal.categoryId);
                    const Icon = cat?.icon || Target;
                    return (
                      <Card key={goal.id} className="p-4 flex items-center justify-between border-transparent shadow-md hover:shadow-lg transition-shadow bg-white">
                        <div className="flex items-center gap-4">
                          <div className={cn("p-3 rounded-xl", cat?.bg, cat?.color)}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{goal.statement}</h3>
                            <p className="text-sm text-gray-500">Target: {goal.timeframe} • {cat?.label}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeGoal(goal.id)} className="text-gray-400 hover:text-red-500">
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <Button 
                  size="lg" 
                  variant={goals.length > 0 ? "outline" : "default"} 
                  className="w-full sm:w-auto h-14 text-lg gap-2 px-8" 
                  onClick={handleStartAddGoal}
                >
                  <Plus className="w-5 h-5" /> Add {goals.length > 0 ? 'Another ' : ''}Goal
                </Button>
                
                {goals.length > 0 && (
                  <Button size="lg" className="w-full sm:w-auto h-14 text-lg gap-2 px-8" onClick={() => setStep('PREFERENCES')}>
                    Continue <ArrowRight className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {step === 'ADD_CATEGORY' && (
            <motion.div
              key="add_category"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-4xl"
            >
              <div className="text-center mb-10 space-y-3">
                <h2 className="text-3xl font-bold tracking-tight">Choose an Area</h2>
                <p className="text-gray-500 text-lg">What area of your life does this goal belong to?</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {GOAL_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat.id)}
                    className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-black/10 transition-all gap-4 text-center group"
                  >
                    <div className={cn("p-4 rounded-full transition-transform group-hover:scale-110", cat.bg, cat.color)}>
                      <cat.icon className="w-8 h-8" />
                    </div>
                    <span className="font-semibold text-sm">{cat.label}</span>
                  </button>
                ))}
              </div>

              <div className="mt-12 text-center">
                <Button variant="ghost" onClick={() => setStep('GOALS_LIST')}>
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'ADD_DETAILS' && (
            <motion.div
              key="add_details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-2xl bg-white p-8 sm:p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100"
            >
              <div className="flex items-center gap-4 mb-8 border-b border-gray-100 pb-6">
                <button onClick={() => setStep('ADD_CATEGORY')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                {currentGoalCategory && (
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", getCategory(currentGoalCategory)?.bg, getCategory(currentGoalCategory)?.color)}>
                      {(() => {
                        const Icon = getCategory(currentGoalCategory)?.icon || Target;
                        return <Icon className="w-5 h-5" />;
                      })()}
                    </div>
                    <h2 className="text-2xl font-bold">Define your {getCategory(currentGoalCategory)?.label} goal</h2>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Goal Statement</Label>
                  {currentGoalCategory && GOAL_TEMPLATES[currentGoalCategory]?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {GOAL_TEMPLATES[currentGoalCategory].map((template) => (
                        <button
                          key={template}
                          onClick={() => setCurrentGoalDetails(p => ({ ...p, statement: template }))}
                          className="text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                        >
                          {template}
                        </button>
                      ))}
                    </div>
                  )}
                  <Input 
                    placeholder="e.g., Save $5,000 for a down payment"
                    className="text-lg h-12"
                    value={currentGoalDetails.statement}
                    onChange={(e) => setCurrentGoalDetails(p => ({ ...p, statement: e.target.value }))}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold">Desired Outcome (Why?)</Label>
                  <Textarea 
                    placeholder="What will achieving this mean to you?"
                    value={currentGoalDetails.outcome}
                    onChange={(e) => setCurrentGoalDetails(p => ({ ...p, outcome: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Target Timeline</Label>
                    <Select 
                      className="h-12"
                      value={currentGoalDetails.timeframe}
                      onChange={(e) => setCurrentGoalDetails(p => ({ ...p, timeframe: e.target.value }))}
                    >
                      <option value="">Select a timeframe</option>
                      <option value="1 Month">1 Month</option>
                      <option value="3 Months">3 Months</option>
                      <option value="6 Months">6 Months</option>
                      <option value="1 Year">1 Year</option>
                      <option value="Ongoing">Ongoing Habit</option>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Priority</Label>
                    <Select 
                      className="h-12"
                      value={currentGoalDetails.priority}
                      onChange={(e) => setCurrentGoalDetails(p => ({ ...p, priority: e.target.value }))}
                    >
                      <option value="low">Low - Nice to have</option>
                      <option value="medium">Medium - Important</option>
                      <option value="high">High - Essential focus</option>
                    </Select>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setStep('GOALS_LIST')}>Cancel</Button>
                  <Button 
                    size="lg" 
                    onClick={handleSaveGoal}
                    disabled={!currentGoalDetails.statement || !currentGoalDetails.timeframe}
                  >
                    Save Goal
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'PREFERENCES' && (
            <motion.div
              key="preferences"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-lg bg-white p-8 sm:p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100"
            >
              <div className="text-center mb-8 space-y-3">
                <h2 className="text-3xl font-bold tracking-tight">AI Coach Preferences</h2>
                <p className="text-gray-500 text-lg">How should your AI coach interact with you?</p>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <Label className="text-lg font-semibold block">Daily Check-in Time</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Morning', 'Afternoon', 'Evening'].map(time => (
                      <button
                        key={time}
                        onClick={() => setPreferences(p => ({ ...p, checkInTime: time }))}
                        className={cn(
                          "py-3 rounded-xl border font-medium transition-colors",
                          preferences.checkInTime === time 
                            ? "bg-black text-white border-black" 
                            : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                        )}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-lg font-semibold block">Coach Tone</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Encouraging', 'Tough Love', 'Analytical', 'Casual'].map(tone => (
                      <button
                        key={tone}
                        onClick={() => setPreferences(p => ({ ...p, coachTone: tone }))}
                        className={cn(
                          "py-3 px-4 rounded-xl border font-medium transition-colors text-left",
                          preferences.coachTone === tone 
                            ? "bg-black text-white border-black" 
                            : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                        )}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                  <Button variant="ghost" onClick={() => setStep('GOALS_LIST')} className="gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button size="lg" onClick={() => setStep('REVIEW')} className="gap-2 px-8">
                    Review System <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'REVIEW' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl"
            >
              <div className="text-center mb-10 space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-black flex items-center justify-center mb-6">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Your System is Ready</h2>
                <p className="text-gray-500 text-lg">Review your goals before we generate your daily plan.</p>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-gray-400" /> Focus Areas ({goals.length})
                  </h3>
                  <div className="space-y-3">
                    {goals.map((goal) => {
                      const cat = getCategory(goal.categoryId);
                      return (
                        <div key={goal.id} className="flex items-start justify-between p-4 rounded-2xl bg-gray-50">
                          <div>
                            <div className="font-semibold text-gray-900">{goal.statement}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              {cat?.label} • Target: {goal.timeframe} • {goal.priority.charAt(0).toUpperCase() + goal.priority.slice(1)} Priority
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-gray-400" /> Coach Preferences
                  </h3>
                  <div className="flex gap-4">
                    <div className="px-4 py-2 bg-gray-50 rounded-lg text-sm font-medium">
                      Check-in: {preferences.checkInTime}
                    </div>
                    <div className="px-4 py-2 bg-gray-50 rounded-lg text-sm font-medium">
                      Tone: {preferences.coachTone}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
                <Button variant="ghost" onClick={() => setStep('PREFERENCES')} size="lg">
                  Make Changes
                </Button>
                <Button size="lg" className="h-14 px-10 text-lg shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/20 transition-all" onClick={handleComplete}>
                  Continue to Goal Engine <Sparkles className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'CLARIFY_GOALS' && goals[clarifyGoalIndex] && (
            <motion.div
              key={`clarify-${goals[clarifyGoalIndex].id}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full max-w-2xl bg-white p-8 sm:p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100"
            >
              <div className="mb-8">
                <div className="text-sm font-semibold text-blue-600 mb-2 uppercase tracking-wider">AI Coach Intake ({clarifyGoalIndex + 1} of {goals.length})</div>
                <h2 className="text-2xl font-bold">Let's refine: {goals[clarifyGoalIndex].statement}</h2>
                <p className="text-gray-500 mt-2">I need a few more details to build a practical, actionable plan for this goal.</p>
              </div>

              <div className="space-y-6">
                {getQuestions(goals[clarifyGoalIndex].categoryId, goals[clarifyGoalIndex].statement).map(q => (
                  <div key={q.id} className="space-y-2">
                    <Label className="text-base font-semibold text-gray-800">{q.label}</Label>
                    {q.type === 'select' ? (
                      <Select 
                        className="h-12 text-base w-full bg-white border-gray-300"
                        value={clarificationAnswers[goals[clarifyGoalIndex].id]?.[q.id] || ''}
                        onChange={e => handleClarificationChange(goals[clarifyGoalIndex].id, q.id, e.target.value)}
                      >
                        <option value="">Select an option</option>
                        {q.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </Select>
                    ) : (
                      <Input 
                        className="h-12 text-base"
                        placeholder={q.placeholder}
                        value={clarificationAnswers[goals[clarifyGoalIndex].id]?.[q.id] || ''}
                        onChange={e => handleClarificationChange(goals[clarifyGoalIndex].id, q.id, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-8 mt-8 border-t border-gray-100 flex justify-between items-center">
                <Button variant="ghost" onClick={() => {
                  if (clarifyGoalIndex > 0) setClarifyGoalIndex(i => i - 1);
                  else setStep('REVIEW');
                }}>Back</Button>
                <Button size="lg" onClick={handleNextClarification} className="px-8">
                  {clarifyGoalIndex === goals.length - 1 ? 'Generate My Plans' : 'Next Goal'} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'GENERATING_PLANS' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-lg text-center space-y-8 py-12"
            >
              <div className="w-24 h-24 mx-auto border-4 border-gray-100 border-t-black rounded-full animate-spin" />
              <div className="space-y-4">
                <h2 className="text-3xl font-bold">Translating Goals...</h2>
                <p className="text-gray-500 text-lg">Your AI coach is structuring outcomes, breaking down actions, and scheduling your routines.</p>
              </div>
            </motion.div>
          )}

          {step === 'REVIEW_PLANS' && (
            <motion.div
              key="review_plans"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-4xl"
            >
              <div className="text-center mb-10 space-y-3">
                <div className="w-16 h-16 mx-auto rounded-[1.25rem] bg-black flex items-center justify-center mb-6 shadow-xl shadow-black/20">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight">Your Action Plans are Ready</h2>
                <p className="text-gray-500 text-lg">We've converted your goals into executable systems.</p>
              </div>

              <div className="space-y-8 mb-12">
                {goals.map(goal => {
                  const plan = generatedPlans[goal.id];
                  if (!plan) return null;
                  return (
                    <Card key={goal.id} className="overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-gray-100 rounded-3xl">
                      {/* Outcome Goal */}
                      <div className="bg-[#F7FAFA] p-6 sm:p-8 border-b border-gray-100">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                          <Target className="w-4 h-4" /> Outcome Goal
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{goal.statement}</h3>
                        <p className="text-gray-600 mt-2 text-lg">{plan.outcomeSummary}</p>
                      </div>
                      
                      {/* Action Plan */}
                      <div className="p-6 sm:p-8">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                          <Activity className="w-4 h-4" /> Action Plan Strategy
                        </div>
                        <p className="text-gray-800 mb-8 font-medium leading-relaxed text-lg">{plan.planSummary}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <Compass className="w-5 h-5 text-gray-400" /> Milestone Breakdown
                            </h4>
                            <ul className="space-y-4">
                              {plan.actionBreakdown.map((step: string, i: number) => (
                                <li key={i} className="flex items-start gap-3 text-base text-gray-700">
                                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-gray-600">{i+1}</div>
                                  {step}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <Repeat className="w-5 h-5 text-gray-400" /> Daily & Weekly Routines
                            </h4>
                            <ul className="space-y-4">
                              {plan.routines.map((routine: string, i: number) => (
                                <li key={i} className="flex items-start gap-3 text-base text-gray-700">
                                  <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                                  {routine}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Next Actions */}
                        <div className="mt-10 pt-8 border-t border-gray-100">
                          <div className="flex items-center justify-between mb-6">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                              <Rocket className="w-5 h-5 text-gray-400" /> Today's Next Actions
                            </h4>
                            <span className="text-sm text-gray-500 font-medium">
                              Select an option to begin
                            </span>
                          </div>
                          
                          <div className="space-y-4">
                            {plan.nextActions.map((action: Action) => (
                              <ActionItem 
                                key={action.id} 
                                action={action} 
                                onComplete={() => console.log('Completed', action.id)} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-center pb-8">
                <Button size="lg" className="h-14 px-12 text-lg shadow-xl shadow-black/20 hover:shadow-2xl hover:shadow-black/20 transition-all" onClick={() => navigate('/dashboard')}>
                  Start Executing <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}