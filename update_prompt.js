const fs = require('fs');
const file = '/sessions/bold-dazzling-bohr/mnt/nudge/supabase/functions/server/index.tsx';
let content = fs.readFileSync(file, 'utf-8');

// Find and replace the GOAL_PLAN_PROMPT
const oldPrompt = `Your plan must be:
- Specific to the user's answers and constraints
- Measurable with a clear metric
- Time-bound with calculated pacing
- Include implementation intention rules (if-then plans)
- Include lower-friction fallback alternatives for when the user is blocked/tired
- Realistic given the user's stated resources and baseline`;

const newPrompt = `Your plan must be:
- Specific to the user's answers and constraints
- Measurable with a clear metric
- Time-bound with calculated pacing
- Include implementation intention rules (if-then plans)
- Include lower-friction fallback alternatives for when the user is blocked/tired
- Include concrete daily/weekly activities to track progress
- Realistic given the user's stated resources and baseline`;

content = content.replace(oldPrompt, newPrompt);

// Add activities to the JSON response example
const oldActions = `  "actions": [
    { "title": "Primary daily/weekly action", "frequency": "daily", "isFallback": false },
    { "title": "Fallback micro-action", "frequency": "daily", "isFallback": true }
  ],
  "weeklyMilestones": [`;

const newActions = `  "actions": [
    { "title": "Primary daily/weekly action", "frequency": "daily", "isFallback": false },
    { "title": "Fallback micro-action", "frequency": "daily", "isFallback": true }
  ],
  "activities": [
    {
      "id": "activity_1",
      "text": "Today's primary specific action (e.g., 'Do 30 minutes of cardio' or 'Transfer $50 to savings')",
      "dueDateTier": "today",
      "emoji": "💪",
      "isLogged": false
    },
    {
      "id": "activity_2",
      "text": "Secondary activity for today if needed",
      "dueDateTier": "today",
      "emoji": "🎯",
      "isLogged": false
    },
    {
      "id": "activity_3",
      "text": "Weekly milestone (e.g., 'Complete 3 gym sessions this week')",
      "dueDateTier": "week",
      "emoji": "📅",
      "isLogged": false
    },
    {
      "id": "activity_4",
      "text": "Another important weekly activity",
      "dueDateTier": "week",
      "emoji": "✨",
      "isLogged": false
    }
  ],
  "weeklyMilestones": [`;

content = content.replace(oldActions, newActions);

fs.writeFileSync(file, content, 'utf-8');
console.log('Updated GOAL_PLAN_PROMPT to include activities generation');
