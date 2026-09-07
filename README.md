<<<<<<< HEAD
# Connect Digitals — Admin Dashboard

React SPA for the Connect Digitals Promotion Platform admin interface.

## Stack

- React 18, TypeScript, Vite
- React Router v6, TanStack Query v5
- Zustand (auth state)
- Deploys to **Netlify** (static SPA)

## Setup

```bash
cp .env.example .env
# Set VITE_API_URL to your backend URL
npm install
npm run dev
```

## Environment variables

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `https://your-api.onrender.com/api/v1` |

## Deploy to Netlify

1. Push this repo to GitHub
2. New site → Import from GitHub → select this repo
3. Build settings are auto-detected from `netlify.toml`
4. Add `VITE_API_URL` environment variable in Netlify → Site settings → Environment variables
5. Deploy

### Netlify build settings (already in `netlify.toml`)

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Publish directory | `dist` |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server on port 5174 |
| `npm run build` | Production build to `dist/` |
| `npm run typecheck` | TypeScript check only |
=======
# Connect-Digitals-Promotion-Platform
>>>>>>> be0b6888761768d4eeb3ac00547e8f8b7af137e0
