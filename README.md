# FocusTube

FocusTube is a distraction-free YouTube video player designed for studying and focused learning. It acts as a personal library where only the content you explicitly add exists. No recommendations, no comments, no algorithmic feeds.

## Features

- **Progress Syncing:** Watch progress syncs seamlessly across devices (using Supabase).
- **Offline Library:** Your library and watch progress are available offline (using IndexedDB).
- **Distraction-Free Player:** Built with the YouTube IFrame Player API. No related videos or comments.
- **PWA Ready:** Installable on desktop, iOS, and Android.
- **Single User Authentication:** Built for one user. Secure password-based auth without a full user system.

## Setup Instructions

### 1. Prerequisites

- A [Vercel](https://vercel.com/) account for deployment.
- A [Supabase](https://supabase.com/) account for database sync.
- A Google Cloud Console project with the **YouTube Data API v3** enabled.

### 2. Environment Variables

Create a `.env.local` file with the following variables (also set these in Vercel):

```
YOUTUBE_API_KEY=your_youtube_api_key
ADMIN_PASSWORD=your_secure_password
AUTH_SECRET=a_long_random_string_for_jwt_signing
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CRON_SECRET=a_random_string_for_vercel_cron
```

**Security Warning:** Do NOT prefix any of these variables with `NEXT_PUBLIC_`. All access happens server-side.

### 3. Database Setup (Supabase)

1. Create a new Supabase project.
2. Go to the SQL Editor and run the script found in `supabase/migrations/00000_init.sql`. This will create the required tables and enable Row Level Security (RLS) blocking public access.
3. Your database is now ready and will only be accessed server-side via the service role key.

### 4. Keep-Alive Cron

Supabase pauses free-tier projects after roughly 7 days of inactivity. To prevent this, FocusTube includes a keep-alive endpoint (`/api/keep-alive`) that pings the database.
Vercel is configured via `vercel.json` to call this endpoint once daily.

### 5. Running Locally

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` and log in with your `ADMIN_PASSWORD`.

### 6. Deployment & PWA Installation

Deploy the app to Vercel by pushing your repository and setting the environment variables in the Vercel dashboard.

To install the app on your mobile device:
1. Open the deployed URL in Safari (iOS) or Chrome (Android).
2. Tap "Share" (iOS) or the menu icon (Android).
3. Select "Add to Home Screen".
