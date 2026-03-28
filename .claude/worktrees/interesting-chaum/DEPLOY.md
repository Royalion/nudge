# Nudge — Deployment Guide

Your app is fully migration-ready. Follow these steps to go live on Vercel for free.

---

## Step 1: Create a GitHub Account (5 mins)

1. Go to **https://github.com**
2. Click **Sign up**
3. Enter your email, create a password, and choose a username
4. Verify your email
5. Done — you have GitHub!

---

## Step 2: Create a New Repository (2 mins)

1. Once logged in to GitHub, click the **+** icon (top right) → **New repository**
2. Name it: `nudge` (or whatever you like)
3. Set it to **Private** (recommended)
4. **Do NOT** check "Add a README file" — leave everything else unchecked
5. Click **Create repository**
6. GitHub will show you a page with setup commands — you'll need the repo URL (looks like `https://github.com/YOUR_USERNAME/nudge.git`)

---

## Step 3: Push Your Code to GitHub (5 mins)

Open **Terminal** (Mac: search "Terminal" in Spotlight) and run these commands one by one.

First, navigate to your Nudge folder:
```bash
cd ~/Documents/Claude/Claude\ Cowork/Nudge
```

Then initialize git and push:
```bash
git init
git add .
git commit -m "Initial commit: Nudge app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nudge.git
git push -u origin main
```

> Replace `YOUR_USERNAME` with your actual GitHub username from Step 1.

When prompted, enter your GitHub username and password (or a Personal Access Token if GitHub asks for one — see note below).

**Note on GitHub authentication:** GitHub no longer accepts passwords for git push. If it fails, you'll need a Personal Access Token:
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Check `repo` scope → Generate
4. Copy the token and use it as your password when pushing

---

## Step 4: Deploy to Vercel (3 mins)

1. Go to **https://vercel.com** and click **Sign Up**
2. Choose **Continue with GitHub** — authorize Vercel to access your GitHub
3. Click **Add New → Project**
4. Find and select your `nudge` repository
5. Vercel will auto-detect Vite. The settings should be:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
6. Click **Deploy**
7. Wait ~2 minutes — your app will be live at `https://nudge-XXXX.vercel.app`!

---

## Step 5: Test Your Live App

1. Open the Vercel URL
2. Try signing up / logging in
3. Create a goal and test the AI coach
4. Verify everything works end-to-end

---

## Future Updates (10 mins per change)

Whenever you want to change something in the app, just tell Claude in Cowork:
- *"Change the dashboard color to blue"*
- *"Add a new page for weekly reviews"*
- *"Fix the check-in form"*

Claude will update the files in your Nudge folder. Then you just run:
```bash
cd ~/Documents/Claude/Claude\ Cowork/Nudge
git add .
git commit -m "describe your change"
git push
```

Vercel will automatically detect the push and redeploy your app within 2 minutes. That's it!

---

## Your App's Architecture

| Component | Where it runs | Cost |
|-----------|--------------|------|
| Frontend (React) | Vercel | Free |
| Database | Supabase | Free |
| Auth | Supabase | Free |
| AI Coach | Supabase Edge Function → OpenAI | Pay per use (same as before) |
| Version control | GitHub | Free |

**Total monthly cost:** Just your Claude Pro subscription ($20/month)
