import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js';
import * as kv from './kv_store.tsx';

const app = new Hono().basePath('/make-server-be80a8fc');

app.use('*', logger(console.log));
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization', 'X-User-Token', 'X-Admin-Secret'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// ── Analytics helpers ────────────────────────────────────────────────
function todayKey() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

async function trackEvent(event: string, meta?: Record<string, any>) {
  try {
    const day = todayKey();
    const key = `analytics:${day}:${event}`;
    const current = await kv.get(key) as any;
    if (current && typeof current === 'object') {
      current.count = (current.count || 0) + 1;
      current.lastAt = new Date().toISOString();
      if (meta) current.meta = { ...(current.meta || {}), ...meta };
      await kv.set(key, current);
    } else {
      await kv.set(key, { count: 1, firstAt: new Date().toISOString(), lastAt: new Date().toISOString(), meta: meta || {} });
    }
  } catch (e) {
    console.error('Analytics track error:', e);
  }
}

async function trackDAU(userId: string) {
  try {
    const day = todayKey();
    const key = `dau:${day}`;
    const current = await kv.get(key) as any;
    if (current && typeof current === 'object') {
      if (!current.users.includes(userId)) {
        current.users.push(userId);
        current.count = current.users.length;
      }
      await kv.set(key, current);
    } else {
      await kv.set(key, { count: 1, users: [userId], date: day });
    }
  } catch (e) {
    console.error('DAU track error:', e);
  }
}

// ── Simple in-memory rate limiter ────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX_CHAT = 20;  // 20 chat requests per minute
const RATE_LIMIT_MAX_GENERAL = 60; // 60 general requests per minute

function checkRateLimit(identifier: string, max: number): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: max - 1 };
  }
  entry.count++;
  if (entry.count > max) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true, remaining: max - entry.count };
}

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 300_000);

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'stride-edge-ai', timestamp: new Date().toISOString() }));

// ── Helper: call OpenAI ─────────────────────────────────────────────
async function callOpenAI(systemPrompt: string, userPrompt: string, temperature = 0.7) {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('MISSING_API_KEY');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('OpenAI API Error:', errorData);
    throw new Error('LLM_SERVICE_ERROR: ' + (errorData.error?.message || 'Unknown error'));
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

// ── 1. GOAL ANALYZE ─────────────────────────────────────────────────
// Takes a raw goal description and returns:
//   - auto-categorized category
//   - a refined goal title (if needed)
//   - dynamic clarifying questions specific to THIS goal (max 5)
//   - any auto-inferred data (suggested deadline, metric, etc.)
const GOAL_ANALYZE_PROMPT = `
You are an expert goal strategist for the "Nudge" app.

Given a user's raw goal description, you must:
1. Auto-categorize it into EXACTLY ONE of: Health, Money, Weight, Career, Mind, Relationships, Home, Discipline, Productivity, Dynamic
2. Create a clean, concise goal title (max 8 words) if the user's input is too verbose or vague
3. Infer any data you can automatically (e.g. if they mention "by December", extract the deadline)
4. Generate 2-5 DYNAMIC clarifying questions that are SPECIFIC to this exact goal. These questions should:
   - Be things you genuinely need to know to build a great plan for THIS specific goal
   - NOT be generic questions you'd ask for every goal
   - Each question should have 2-4 quick-tap options when possible, but also allow free text
   - Be ordered from most critical to least critical
   - Never ask for info the user already provided in their description
   - Focus on: current baseline, constraints, available resources, intensity preference, or goal-specific nuances

Today's date is ${new Date().toISOString().split('T')[0]}.

Respond in JSON:
{
  "category": "Health",
  "title": "Run a 5K in under 25 minutes",
  "inferredDeadline": "2026-06-01" | null,
  "inferredMetric": { "unit": "minutes", "targetValue": 25 } | null,
  "analysisNote": "Short 1-sentence insight about this goal for the user",
  "questions": [
    {
      "id": "unique_id",
      "question": "The specific question text",
      "options": ["Option A", "Option B", "Option C"],
      "why": "Brief reason this question matters for the plan"
    }
  ]
}
`;

app.post('/api/goal-analyze', async (c) => {
  try {
    const body = await c.req.json();
    const goalText = body.goalText || '';
    const existingGoals = body.existingGoals || [];

    if (!goalText.trim()) {
      return c.json({ error: 'EMPTY_GOAL', message: 'Please describe your goal.' }, 400);
    }

    const userPrompt = `Goal description: "${goalText}"
${existingGoals.length > 0 ? `\nUser's existing goals: ${existingGoals.map((g: any) => g.title).join(', ')}` : ''}
Analyze this goal and generate dynamic, goal-specific clarifying questions.`;

    const result = await callOpenAI(GOAL_ANALYZE_PROMPT, userPrompt, 0.6);
    return c.json(result);

  } catch (e: any) {
    console.error('Goal Analyze Error:', e);
    if (e.message === 'MISSING_API_KEY') {
      return c.json({ error: 'MISSING_API_KEY', message: 'OpenAI API key is not configured.' }, 500);
    }
    return c.json({ error: 'INTERNAL_SERVER_ERROR', message: e.message }, 500);
  }
});

// ── 2. GOAL PLAN GENERATE ───────────────────────────────────────────
// Takes the analyzed goal + user's answers to clarifying questions
// Returns a full, structured execution plan
const GOAL_PLAN_PROMPT = `
You are an expert execution strategist for the "Nudge" app.

Given a goal and the user's answers to clarifying questions, generate a comprehensive, measurable execution plan.

Today's date is ${new Date().toISOString().split('T')[0]}.

Your plan must be:
- Specific to the user's answers and constraints
- Measurable with a clear metric
- Time-bound with calculated pacing
- Include implementation intention rules (if-then plans)
- Include lower-friction fallback alternatives for when the user is blocked/tired
- Realistic given the user's stated resources and baseline
- Include concrete daily/weekly activities to track progress

Respond in JSON:
{
  "metric": {
    "unit": "workouts",
    "targetValue": 48,
    "currentValue": 0
  },
  "pace": {
    "frequency": "weekly",
    "amount": 4,
    "label": "4 workouts/week"
  },
  "plan": {
    "summary": "A 2-3 sentence actionable summary of the strategy",
    "projectionOfSuccess": "A motivating sentence about expected outcome if they maintain pace",
    "implementationIntentionRules": [
      "If [trigger], then I will [specific action].",
      "If [obstacle], then I will [workaround]."
    ],
    "fallbackOptions": [
      "Lower-friction alternative 1",
      "Lower-friction alternative 2"
    ],
    "todayAction": "A specific, concrete action the user should do TODAY. e.g. 'Run 2 miles at conversational pace' or 'Transfer $50 to savings account' or 'Read 20 pages of your current book'. Must be ultra-specific and immediately actionable.",
    "todayFocus": "A short motivational focus statement for today that contextualizes the action. e.g. 'Build your aerobic base with an easy run. Don't worry about speed — just get moving.' Keep it 1-2 sentences.",
    "todayActionLabel": "A SHORT 3-5 word button label for logging this daily action. Must start with 'Log'. Examples: 'Log gym session', 'Log morning run', 'Log savings deposit', 'Log chapter read'. NEVER exceed 5 words."
  },
  "actions": [
    { "title": "Primary daily/weekly action", "frequency": "daily", "isFallback": false },
    { "title": "Fallback micro-action", "frequency": "daily", "isFallback": true }
  ],
  "activities": [
    {
      "id": "activity_1",
      "text": "Today's primary specific action (e.g., 'Do 30 minutes of cardio' or 'Transfer $50 to savings')",
      "dueDateTier": "today",
      "emoji": "💪",
      "isLogged": false,
      "type": "flexible",
      "intensity": 7,
      "minimalVersion": "Lighter version of this activity if user can't do full version",
      "canPostpone": true
    },
    {
      "id": "activity_2",
      "text": "Secondary activity for today if needed",
      "dueDateTier": "today",
      "emoji": "🎯",
      "isLogged": false,
      "type": "flexible",
      "intensity": 5,
      "canPostpone": true
    },
    {
      "id": "activity_3",
      "text": "Weekly milestone (e.g., 'Complete 3 gym sessions this week')",
      "dueDateTier": "week",
      "emoji": "📅",
      "isLogged": false,
      "type": "frequency",
      "frequency": "as needed",
      "canPostpone": true
    },
    {
      "id": "activity_4",
      "text": "Another important weekly activity",
      "dueDateTier": "week",
      "emoji": "✨",
      "isLogged": false,
      "type": "flexible",
      "intensity": 6,
      "canPostpone": true
    }
  ],
  "weeklyMilestones": [
    "Week 1-2: ...",
    "Week 3-4: ...",
    "Week 5+: ..."
  ]
}
`;

app.post('/api/goal-plan', async (c) => {
  try {
    const body = await c.req.json();
    const { goalTitle, goalText, category, deadline, answers } = body;

    if (!goalTitle && !goalText) {
      return c.json({ error: 'EMPTY_GOAL', message: 'Goal information is required.' }, 400);
    }

    const answersText = Object.entries(answers || {})
      .map(([q, a]) => `Q: ${q}\nA: ${a}`)
      .join('\n\n');

    const userPrompt = `Goal: "${goalTitle || goalText}"
Category: ${category}
${deadline ? `Target Deadline: ${deadline}` : 'No deadline specified (suggest a reasonable one)'}

User's answers to clarifying questions:
${answersText || 'No additional answers provided.'}

Generate the execution plan.`;

    const result = await callOpenAI(GOAL_PLAN_PROMPT, userPrompt, 0.6);
    return c.json(result);

  } catch (e: any) {
    console.error('Goal Plan Generate Error:', e);
    if (e.message === 'MISSING_API_KEY') {
      return c.json({ error: 'MISSING_API_KEY', message: 'OpenAI API key is not configured.' }, 500);
    }
    return c.json({ error: 'INTERNAL_SERVER_ERROR', message: e.message }, 500);
  }
});

// ── 2B. ACTIVITY REGENERATE ────────────────────────────────────────
// When user clicks "I can't do this", regenerate activities intelligently
const ACTIVITY_REGENERATE_PROMPT = `
You are an expert goal adaptation strategist for the "Nudge" app.

A user cannot complete an activity. Your job is to:
1. Analyze the activity type (sequential, flexible, time-sensitive, frequency-based, tracking)
2. Analyze the goal context
3. Recommend the best strategy:
   - For SEQUENTIAL activities: Postpone to tomorrow, regenerate full week with extended timeline
   - For FLEXIBLE activities: Offer minimal version TODAY, or shift across next 3 days
   - For TIME-SENSITIVE: If deadline impossible, move to next available day + adjust schedule
   - For FREQUENCY: Redistribute across remaining days in period
   - For TRACKING: Offer to do later today, or tomorrow
4. Return new activities that keep user on track to meet their goal

Today's date is ${new Date().toISOString().split('T')[0]}.

Respond in JSON:
{
  "strategy": "lighter_today" | "postpone_and_regenerate_week" | "reschedule_day" | "redistribute_frequency" | "later_today",
  "explanation": "Brief explanation of why we chose this strategy",
  "newActivities": [
    {
      "id": "activity_X",
      "text": "Specific actionable activity",
      "dueDateTier": "today" | "week" | "future",
      "emoji": "📅",
      "type": "sequential" | "flexible" | "time_sensitive" | "frequency" | "tracking",
      "minimalVersion": "Lighter alternative if applicable",
      "intensity": 5,
      "deadline": "YYYY-MM-DD if time-sensitive",
      "prerequisiteFor": [],
      "frequency": "3x/week if applicable",
      "canPostpone": true,
      "regeneratedFrom": "original_activity_id"
    }
  ],
  "message": "Friendly message to show user in modal explaining the new plan"
}
`;

app.post('/api/activity-regenerate', async (c) => {
  try {
    const body = await c.req.json();
    const { goalTitle, goalCategory, activity, skipReason, skipReasonCategory, currentActivities, goalDeadline } = body;

    if (!activity || !goalTitle) {
      return c.json({ error: 'BAD_REQUEST', message: 'Activity and goal information required.' }, 400);
    }

    const userPrompt = `
Goal: "${goalTitle}" (Category: ${goalCategory})
${goalDeadline ? `Target Deadline: ${goalDeadline}` : ''}

Activity the user cannot complete:
- Text: "${activity.text}"
- Type: ${activity.type || 'flexible'}
- Intensity: ${activity.intensity || 5}/10
- Due: ${activity.dueDateTier}

User's reason: ${skipReason || 'Not specified'}
Reason category: ${skipReasonCategory || 'other'}

Current activities for this goal:
${currentActivities?.map((a: any) => \`- [\${a.isLogged ? 'x' : ' '}] \${a.text} (dueDateTier: \${a.dueDateTier})\`).join('\\n') || 'None'}

Analyze this activity and user situation. Recommend the best adaptation strategy and generate new activities.`;

    const result = await callOpenAI(ACTIVITY_REGENERATE_PROMPT, userPrompt, 0.7);
    return c.json(result);

  } catch (e: any) {
    console.error('Activity Regenerate Error:', e);
    if (e.message === 'MISSING_API_KEY') {
      return c.json({ error: 'MISSING_API_KEY', message: 'OpenAI API key is not configured.' }, 500);
    }
    return c.json({ error: 'INTERNAL_SERVER_ERROR', message: e.message }, 500);
  }
});

// ── 3. CHAT (existing) ──────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are an elite AI Agent for a web app called "Nudge".
You have FULL control over the user's goals, settings, and account state.
You can create, read, update, rename, delete, pause, resume, complete, and archive goals.
You can modify user settings and account state.
You are the PRIMARY interface — the user talks to you and you take action.
You are NOT a supplementary "coach" — you ARE the agent that runs everything.

Today's date is ${new Date().toISOString().split('T')[0]}.

You MUST respond in valid JSON format exactly matching this schema:
{
  "text": "Your conversational response to the user.",
  "action": "CREATE_GOAL" | "CREATE_COMPOUND_GOALS" | "DELETE_GOAL" | "DELETE_ALL_GOALS" | "UPDATE_GOAL" | "UPDATE_GOAL_STATUS" | "LOG_PROGRESS" | "SUGGEST_FALLBACK" | "UPDATE_PLAN" | "UPDATE_SETTINGS" | "NONE",
  "payload": null,
  "requiresConfirmation": false,
  "confirmationMessage": null
}

PAYLOAD SCHEMAS BY ACTION:

CREATE_GOAL (IMPORTANT — this is a COMPLETE goal with execution plan):
{
  "title": "...",
  "category": "Health"|"Money"|"Career"|"Relationships"|"Mind"|"Discipline"|"Weight"|"Productivity"|"Home"|"Dynamic",
  "targetDate": "YYYY-MM-DD" | null,
  "description": "...",
  "plan": {
    "summary": "A 2-3 sentence overview of the execution strategy.",
    "projectionOfSuccess": "Based on the pace and commitment level, here's the projection...",
    "implementationIntentionRules": ["If X then Y...", "If X then Y..."],
    "fallbackOptions": ["Easier alternative 1", "Easier alternative 2"],
    "todayAction": "A specific, concrete action the user should do TODAY. e.g. 'Run 2 miles at conversational pace' or 'Transfer $50 to savings account' or 'Read 20 pages of your current book'. Must be ultra-specific and immediately actionable.",
    "todayFocus": "A short motivational focus statement for today that contextualizes the action. e.g. 'Build your aerobic base with an easy run. Don't worry about speed — just get moving.' Keep it 1-2 sentences.",
    "todayActionLabel": "A SHORT 3-5 word button label for logging this daily action. Must start with 'Log'. Examples: 'Log gym session', 'Log morning run', 'Log savings deposit', 'Log chapter read'. NEVER exceed 5 words."
  },
  "pace": {
    "frequency": "daily"|"weekly"|"monthly",
    "amount": 1,
    "label": "e.g. Run 3x per week, 5 miles each"
  },
  "metric": {
    "unit": "e.g. miles, pages, dollars, sessions",
    "targetValue": 100,
    "currentValue": 0
  },
  "activities": [
    {
      "id": "activity_1",
      "text": "Specific actionable activity",
      "dueDateTier": "today"|"week"|"future",
      "emoji": "📅",
      "type": "sequential"|"flexible"|"time_sensitive"|"frequency"|"tracking",
      "intensity": 5,
      "minimalVersion": "Lighter alternative if user gets stuck"
    }
  ]
}

CREATE_COMPOUND_GOALS (array of exactly 3 goal objects, same schema as CREATE_GOAL):
[
  {
    "title": "...", "category": "Health", "targetDate": "YYYY-MM-DD", "description": "...",
    "linkedGroupName": "Get Healthy",
    "plan": { ... same as CREATE_GOAL plan ... },
    "pace": { ... }, "metric": { ... },
    "activities": [ ... 5-7 activities per goal, same schema as CREATE_GOAL ... ]
  },
  { ... second goal with activities ... },
  { ... third goal with activities ... }
]
Each goal must include a "linkedGroupName" field with the user's broad aspiration and activities array with 5-7 generated activities.

GOAL CREATION FLOW:
- When a user wants to create a new goal, do NOT create it immediately.
- First, use action: "NONE" and ask 2-4 smart clarifying questions in your "text" field. Ask about timeline, current level, constraints, motivation — whatever is most relevant to THIS specific goal.
- Once you have enough information (after the user answers), THEN use CREATE_GOAL with the FULL payload including plan, pace, metric, AND activities.
- ACTIVITIES GENERATION: Generate 5-7 specific, actionable activities that break down the goal into concrete daily/weekly tasks. For each activity:
  * Set dueDateTier to distribute across "today" (1-2 tasks), "week" (3-4 tasks), and "future" (1-2 tasks)
  * Choose appropriate type: "sequential" (must do first), "flexible" (can do anytime), "time_sensitive" (has deadline), "frequency" (do X times), "tracking" (monitor metric)
  * Set intensity 1-10 based on effort required
  * Include minimalVersion for flexible alternatives when user struggles
  * Use relevant emoji that matches the activity
- The goal will be automatically created AND its execution plan with activities will be saved in one shot.
- In your "text" field for the CREATE_GOAL action, give a brief celebratory summary and mention the user can view the full plan and activities in the Goals section.

COMPOUND GOALS:
- When a user requests a broad, multi-faceted goal (e.g. "I want to get healthy", "I want to improve my life", "I want to be more disciplined"), recognize this as a COMPOUND goal.
- COMPOUND goals should be broken into exactly 3 specific, actionable sub-goals that together achieve the broader aspiration.
- Use CREATE_COMPOUND_GOALS with a payload that is an ARRAY of 3 goal objects (same schema as CREATE_GOAL).
- Each sub-goal gets its own category, pace, metric, and plan — but they share a linkedGroupName (the user's broad aspiration, e.g. "Get Healthy").
- The sub-goals should complement each other and cover different aspects of the broad goal.
- Example: "I want to get healthy" → [Exercise routine goal, Nutrition goal, Sleep/recovery goal].
- In your "text" field, celebrate and explain the 3 linked goals you created. Mention they are grouped together and the user can log each separately.

DELETE_GOAL:
{ "goalId": "...", "goalTitle": "..." }

DELETE_ALL_GOALS:
{ "goalCount": 4 }

UPDATE_GOAL:
{ "goalId": "...", "updates": { "title": "new title", "description": "...", "targetDate": "...", "category": "...", "progress": 50 } }
Only include fields that are changing.

UPDATE_GOAL_STATUS:
{ "goalId": "...", "goalTitle": "...", "newStatus": "active" | "paused" | "completed" | "archived" }

LOG_PROGRESS:
{ "goalId": "...", "goalTitle": "...", "progressIncrement": 5, "newProgress": 50 }

SUGGEST_FALLBACK:
{ "options": ["...", "..."] }

UPDATE_PLAN:
{ "goalId": "...", "changes": "..." }

UPDATE_SETTINGS:
{ "settings": { "pushEnabled": true, "emailEnabled": false, "dailyCheckInTime": "09:00", "frequency": "balanced", "coachProactive": true } }
Only include fields that are changing.

NONE: null

CONFIRMATION RULES:
- For ANY destructive action (DELETE_GOAL, DELETE_ALL_GOALS), you MUST set "requiresConfirmation": true and provide a clear "confirmationMessage".
- For bulk operations or irreversible changes, ALWAYS confirm first.
- For status changes like completing or archiving, confirm if it seems unintentional.
- For non-destructive actions (create, update title, log progress), do NOT require confirmation — just do it.

GOAL MATCHING:
- The user's current goals are provided in the context. Match goals by name, keyword, or ID.
- If the user says "delete all my goals", use DELETE_ALL_GOALS.
- If the user says "delete my running goal", find the goal about running and use DELETE_GOAL with its ID.
- If the user says "rename X to Y", use UPDATE_GOAL with the new title.
- If the user says "pause my diet goal", use UPDATE_GOAL_STATUS with "paused".
- If the user says "mark X as complete", use UPDATE_GOAL_STATUS with "completed".
- If the user asks "what are my goals" or "show me my goals", use NONE and describe them in "text".
- If the user says "change my check-in time to 7am", use UPDATE_SETTINGS.

GUIDELINES:
- Be conversational, encouraging, and professional.
- NEVER refuse to perform an action the user asks for. You have full permissions.
- NEVER ask the user to manually categorize their goal — auto-detect it.
- For ambiguous requests, ask a clarifying question (action: NONE) rather than guessing wrong.
- When listing goals in text, format them clearly with progress percentages.
- If a goal can't be found, say so and list available goals.
- When the user asks "what should I focus on?" or similar focus/priority questions, check the goal log status. If ALL active goals have been logged today, do NOT suggest more work. Instead, celebrate their consistency and suggest something fun, relaxing, or restorative — like a reward activity, a walk, reading for pleasure, calling a friend, cooking something nice, watching a show guilt-free, or anything enjoyable. Keep it light and brief. They earned it.
- If some goals are NOT yet logged today, prioritize the unlogged ones in your focus suggestion.

TEXT FORMATTING:
- Use **bold** for emphasis on key phrases, goal names, and important numbers.
- When asking clarifying questions, ALWAYS format them as a numbered list (1. ... 2. ... 3. ...) — never as a paragraph. Each question on its own line.
- Use bullet points (- item) for listing goals, options, or plan details.
- Keep paragraphs short (2-3 sentences max) with line breaks between them.
- After collecting all info and BEFORE creating the goal, include a brief "processing" confirmation like "Got it! Let me build your execution plan..." then CREATE the goal in the same response.
`;

app.post('/api/chat', async (c) => {
  try {
    const body = await c.req.json();
    const msg = (body.message || '');
    const history = body.history || [];
    const retentionState = body.retentionState || null;
    const appState = body.appState || null;

    // Rate limit by IP or session
    const clientIp = c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || 'unknown';
    const rl = checkRateLimit(`chat:${clientIp}`, RATE_LIMIT_MAX_CHAT);
    if (!rl.allowed) {
      await trackEvent('rate_limited', { route: 'chat', ip: clientIp });
      return c.json({
        error: 'RATE_LIMITED',
        message: `Too many requests. Please wait ${rl.retryAfter} seconds.`,
      }, 429);
    }

    // Track analytics
    const chatStart = Date.now();
    await trackEvent('chat_request');

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!apiKey) {
      return c.json({ 
        error: 'MISSING_API_KEY', 
        message: 'OpenAI API key is not configured on the server. Please add the secret.' 
      }, 500);
    }

    // Build contextual system prompt with full app state
    let contextualSystemPrompt = SYSTEM_PROMPT;

    // Inject current goals context
    if (appState?.goals?.length > 0) {
      contextualSystemPrompt += `\n\nCURRENT GOALS (${appState.goals.length} total):\n`;
      appState.goals.forEach((g: any) => {
        contextualSystemPrompt += `- ID: "${g.id}" | Title: "${g.title}" | Category: ${g.category} | Status: ${g.status} | Progress: ${g.progress}%${g.targetDate ? ` | Deadline: ${g.targetDate}` : ''}${g.pace?.label ? ` | Pace: ${g.pace.label}` : ''}${g.loggedToday ? ' | LOGGED TODAY ✓' : ' | NOT logged today'}\n`;
      });
    } else {
      contextualSystemPrompt += '\n\nCURRENT GOALS: The user has no goals yet.\n';
    }

    // Inject user state
    if (appState?.userState) {
      contextualSystemPrompt += `\nUSER STATE: Premium: ${appState.userState.isPremium ? 'Yes' : 'No (free tier — max 3 active goals, max 3 replans per goal)'}\n`;
    }

    // Inject notification settings
    if (appState?.notificationSettings) {
      const ns = appState.notificationSettings;
      contextualSystemPrompt += `\nNOTIFICATION SETTINGS: Check-in time: ${ns.dailyCheckInTime} | Frequency: ${ns.frequency} | Push: ${ns.pushEnabled ? 'on' : 'off'} | Email: ${ns.emailEnabled ? 'on' : 'off'} | Proactive coach: ${ns.coachProactive ? 'on' : 'off'}\n`;
    }

    // Recovery mode context
    if (retentionState?.isRecoveryMode) {
      contextualSystemPrompt += `\nCRITICAL CONTEXT: The user is in "Recovery Mode". They have missed ${retentionState.daysMissed} days of logging. Be gentle. Suggest micro-actions using SUGGEST_FALLBACK.`;
    }

    // Prepare message array for OpenAI
    const messages = [
      { role: 'system', content: contextualSystemPrompt },
      ...history
        .filter((m: any) => m.role === 'user' || m.role === 'assistant')
        .map((m: any) => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : ''
        })),
      { role: 'user', content: msg }
    ].filter(m => m.content.trim() !== '');

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        response_format: { type: "json_object" },
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      return c.json({ 
        error: 'LLM_SERVICE_ERROR', 
        message: 'The AI provider returned an error: ' + (errorData.error?.message || 'Unknown error') 
      }, 502);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const parsed = JSON.parse(content);
      // Track latency and action type
      const latency = Date.now() - chatStart;
      trackEvent('chat_latency', { avgMs: latency });
      if (parsed.action && parsed.action !== 'NONE') {
        trackEvent(`action:${parsed.action}`);
      }
      return c.json(parsed);
    } catch (parseError) {
      console.error('Failed to parse LLM response as JSON:', content);
      return c.json({
        text: content,
        action: 'NONE',
        payload: null
      });
    }

  } catch (e: any) {
    console.error('Edge Function Error:', e);
    return c.json({ 
      error: 'INTERNAL_SERVER_ERROR', 
      message: e.message || 'The backend proxy encountered an unexpected error.' 
    }, 500);
  }
});

// ── STATE PERSISTENCE ────────────────────────────────────────────────
app.post('/api/state/save', async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    // Read user token from X-User-Token header (Authorization is consumed by the Edge Function gateway)
    const accessToken = c.req.header('X-User-Token');
    if (!accessToken) {
      return c.json({ error: 'UNAUTHORIZED', message: 'No user token provided.' }, 401);
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user?.id) {
      return c.json({ error: 'UNAUTHORIZED', message: `Invalid session: ${authError?.message || 'no user'}` }, 401);
    }
    const body = await c.req.json();
    const stateToSave = body.state;
    if (!stateToSave) {
      return c.json({ error: 'BAD_REQUEST', message: 'No state provided.' }, 400);
    }
    await kv.set(`user_state:${user.id}`, stateToSave);
    return c.json({ success: true });
  } catch (e: any) {
    console.error('State Save Error:', e);
    return c.json({ error: 'INTERNAL_SERVER_ERROR', message: e.message }, 500);
  }
});

app.get('/api/state/load', async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    // Read user token from X-User-Token header (Authorization is consumed by the Edge Function gateway)
    const accessToken = c.req.header('X-User-Token');
    if (!accessToken) {
      return c.json({ error: 'UNAUTHORIZED', message: 'No user token provided.' }, 401);
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user?.id) {
      return c.json({ error: 'UNAUTHORIZED', message: `Invalid session: ${authError?.message || 'no user'}` }, 401);
    }
    const state = await kv.get(`user_state:${user.id}`);
    // Track DAU on state load (every login/session restore)
    trackDAU(user.id);
    trackEvent('state_load');
    return c.json({ state: state || null });
  } catch (e: any) {
    console.error('State Load Error:', e);
    return c.json({ error: 'INTERNAL_SERVER_ERROR', message: e.message }, 500);
  }
});

// ── Signup ───────────────────────────────────────────────────────────
app.post('/signup', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name } = body;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.error('Signup error:', error);
      return c.json({ error: error.message }, 400);
    }

    // Track signup event
    trackEvent('signup');

    return c.json({ user: data.user });
  } catch (e: any) {
    console.error('Signup Error:', e);
    return c.json({ error: e.message }, 500);
  }
});

// ── FEEDBACK ─────────────────────────────────────────────────────────
app.post('/api/feedback', async (c) => {
  try {
    const body = await c.req.json();
    const { messageId, messageContent, feedback, sessionId } = body;
    if (!messageId || !feedback) {
      return c.json({ error: 'BAD_REQUEST', message: 'messageId and feedback required.' }, 400);
    }
    const entry = {
      messageId,
      messageContent: (typeof messageContent === 'string' ? messageContent : '').slice(0, 2000),
      feedback, // 'up' | 'down'
      sessionId: sessionId || 'unknown',
      timestamp: new Date().toISOString(),
    };
    // Store by timestamp-based key for easy prefix listing
    const key = `feedback:${Date.now()}_${messageId}`;
    await kv.set(key, entry);
    return c.json({ success: true });
  } catch (e: any) {
    console.error('Feedback Save Error:', e);
    return c.json({ error: 'INTERNAL_SERVER_ERROR', message: e.message }, 500);
  }
});

// ── ERROR LOG ────────────────────────────────────────────────────────
app.post('/api/error-log', async (c) => {
  try {
    const body = await c.req.json();
    const { error, context, sessionId } = body;
    const entry = {
      error: String(error).slice(0, 2000),
      context: String(context || '').slice(0, 1000),
      sessionId: sessionId || 'unknown',
      timestamp: new Date().toISOString(),
    };
    const key = `errorlog:${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await kv.set(key, entry);
    return c.json({ success: true });
  } catch (e: any) {
    console.error('Error Log Save Error:', e);
    return c.json({ error: 'INTERNAL_SERVER_ERROR', message: e.message }, 500);
  }
});

// ── ADMIN ROUTES ─────────────────────────────────────────────────────
function verifyAdmin(c: any): boolean {
  const secret = c.req.header('X-Admin-Secret');
  const expected = Deno.env.get('ADMIN_SECRET');
  if (!expected || !secret || secret !== expected) return false;
  return true;
}

app.get('/api/admin/feedback', async (c) => {
  if (!verifyAdmin(c)) return c.json({ error: 'FORBIDDEN' }, 403);
  try {
    const page = parseInt(c.req.query('page') || '1');
    const perPage = parseInt(c.req.query('perPage') || '20');
    const entries = await kv.getByPrefix('feedback:');
    const sorted = (entries || []).sort((a: any, b: any) =>
      (b?.timestamp || '').localeCompare(a?.timestamp || '')
    );
    const total = sorted.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    const paginated = sorted.slice(start, start + perPage);
    return c.json({ feedback: paginated, total, page, perPage, totalPages });
  } catch (e: any) {
    console.error('Admin Feedback List Error:', e);
    return c.json({ error: 'INTERNAL_SERVER_ERROR', message: e.message }, 500);
  }
});

app.get('/api/admin/error-logs', async (c) => {
  if (!verifyAdmin(c)) return c.json({ error: 'FORBIDDEN' }, 403);
  try {
    const page = parseInt(c.req.query('page') || '1');
    const perPage = parseInt(c.req.query('perPage') || '20');
    const entries = await kv.getByPrefix('errorlog:');
    const sorted = (entries || []).sort((a: any, b: any) =>
      (b?.timestamp || '').localeCompare(a?.timestamp || '')
    );
    const total = sorted.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    const paginated = sorted.slice(start, start + perPage);
    return c.json({ logs: paginated, total, page, perPage, totalPages });
  } catch (e: any) {
    console.error('Admin Error Logs Error:', e);
    return c.json({ error: 'INTERNAL_SERVER_ERROR', message: e.message }, 500);
  }
});

app.get('/api/admin/stats', async (c) => {
  if (!verifyAdmin(c)) return c.json({ error: 'FORBIDDEN' }, 403);
  try {
    const feedback = await kv.getByPrefix('feedback:');
    const errors = await kv.getByPrefix('errorlog:');
    const thumbsUp = (feedback || []).filter((f: any) => f?.feedback === 'up').length;
    const thumbsDown = (feedback || []).filter((f: any) => f?.feedback === 'down').length;

    // DAU for last 7 days
    const dauData: { date: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const dau = await kv.get(`dau:${dayStr}`) as any;
      dauData.push({ date: dayStr, count: dau?.count || 0 });
    }

    // Analytics events for today
    const today = new Date().toISOString().split('T')[0];
    const chatReqs = await kv.get(`analytics:${today}:chat_request`) as any;
    const signups = await kv.get(`analytics:${today}:signup`) as any;
    const stateLoads = await kv.get(`analytics:${today}:state_load`) as any;
    const rateLimited = await kv.get(`analytics:${today}:rate_limited`) as any;
    const latency = await kv.get(`analytics:${today}:chat_latency`) as any;

    // Total registered users (user_state prefix count)
    const userStates = await kv.getByPrefix('user_state:');
    const totalUsers = (userStates || []).length;

    return c.json({
      totalFeedback: (feedback || []).length,
      thumbsUp,
      thumbsDown,
      totalErrors: (errors || []).length,
      totalUsers,
      dau: dauData,
      today: {
        chatRequests: chatReqs?.count || 0,
        signups: signups?.count || 0,
        stateLoads: stateLoads?.count || 0,
        rateLimited: rateLimited?.count || 0,
        avgLatencyMs: latency?.meta?.avgMs || 0,
      },
    });
  } catch (e: any) {
    return c.json({ error: 'INTERNAL_SERVER_ERROR', message: e.message }, 500);
  }
});

// Admin: list registered users (email, created_at, goal count)
app.get('/api/admin/users', async (c) => {
  if (!verifyAdmin(c)) return c.json({ error: 'FORBIDDEN' }, 403);
  try {
    const page = parseInt(c.req.query('page') || '1');
    const perPage = parseInt(c.req.query('perPage') || '20');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = (data?.users || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.user_metadata?.name || '',
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at,
      provider: u.app_metadata?.provider || 'email',
    }));
    // Supabase doesn't return total count easily, so we estimate based on whether a full page was returned
    const hasMore = users.length === perPage;
    return c.json({ users, page, perPage, hasMore });
  } catch (e: any) {
    console.error('Admin Users Error:', e);
    return c.json({ error: 'INTERNAL_SERVER_ERROR', message: e.message }, 500);
  }
});

// Admin: system health
app.get('/api/admin/health', async (c) => {
  if (!verifyAdmin(c)) return c.json({ error: 'FORBIDDEN' }, 403);
  const checks: Record<string, any> = {};

  // KV store check
  try {
    const start = Date.now();
    await kv.get('__health_check__');
    checks.kvStore = { status: 'ok', latencyMs: Date.now() - start };
  } catch (e: any) {
    checks.kvStore = { status: 'error', error: e.message };
  }

  // OpenAI key check
  checks.openaiKey = Deno.env.get('OPENAI_API_KEY') ? { status: 'configured' } : { status: 'missing' };
  checks.adminSecret = Deno.env.get('ADMIN_SECRET') ? { status: 'configured' } : { status: 'missing' };

  // Memory (approximate)
  checks.timestamp = new Date().toISOString();
  checks.rateLimitEntries = rateLimitMap.size;

  return c.json({ status: 'ok', checks });
});

Deno.serve(app.fetch);