# Stillpoint

A minimal daily mental wellness tracker with cross-device sync. Built on habit stacking — anchor new practices to routines you already have.

## Setup (10 minutes)

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New Project**, give it a name, set a database password
3. Wait for it to spin up (~1 min)

### 2. Create the database table

1. In your Supabase dashboard, go to **SQL Editor**
2. Paste the contents of `supabase-schema.sql` and click **Run**
3. That's it — one table with row-level security

### 3. Get your API keys

1. Go to **Settings → API** in your Supabase dashboard
2. Copy the **Project URL** and **anon/public** key
3. Create a `.env` file in this project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Enable magic link auth

1. In Supabase, go to **Authentication → Providers**
2. Make sure **Email** is enabled (it is by default)
3. Optionally go to **Authentication → URL Configuration** and set your site URL to your Vercel domain once deployed

### 5. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import it
3. Add these **Environment Variables** in Vercel's settings:
   - `VITE_SUPABASE_URL` → your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` → your anon key
4. Click **Deploy**

After deploying, go back to Supabase **Authentication → URL Configuration** and add your Vercel URL to the **Redirect URLs** list. This ensures the magic link redirects work correctly.

## How It Works

Six micro-habits (all ≤5 min) spread across your day, each "stacked" onto something you already do. Data syncs via Supabase so you can check things off on your phone and see it on your laptop. localStorage is used as a fast cache for instant loading.

## Architecture

- **Frontend**: React + Vite (static, deployed to Vercel)
- **Backend**: Supabase (Postgres + Auth + Row Level Security)
- **Auth**: Magic link (passwordless email)
- **Storage**: One JSONB row per user in `wellness_data`, upserted on each change
- **Customization**: Daily habits are defined in `src/Tracker.jsx`
