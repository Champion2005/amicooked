# amicooked 🔥 - WinHacks 2026 Project

**amicooked** is an AI-powered GitHub portfolio auditor designed to give developers a brutally honest reality check on their employability. By analyzing granular account data, the platform determines if a user's career prospects are "cooked" and provides a personalized roadmap to recovery.

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + ShadCN UI
- **Backend/Services:** Firebase (Auth + Firestore)
- **APIs:** GitHub GraphQL API, OpenRouter AI
- **Language:** JavaScript (JSX, no TypeScript)

## Features

- 🔐 GitHub OAuth authentication
- 📊 Comprehensive GitHub profile analysis (repos, commits, PRs, languages)
- 🤖 AI-powered "Cooked Level" calculation (0-10 scale)
- 📈 Personalized improvement roadmap
- 🎨 Clean, responsive UI with ShadCN components

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure GitHub OAuth (IMPORTANT)

You need to add the **GitHub Client Secret** to Firebase:

1. Go to your [Firebase Console](https://console.firebase.google.com)
2. Select project: `amicooked-b65b3`
3. Navigate to **Authentication** → **Sign-in method**
4. Enable **GitHub** provider
5. Add your GitHub OAuth credentials:
   - **Client ID:** `Iv23liQFpUv5Wmg5Aemi` (already in code)
   - **Client Secret:** `[YOUR_GITHUB_CLIENT_SECRET]` ⚠️ Add this in Firebase console

6. Set the **Authorization callback URL** in your GitHub OAuth app to:
   ```
   https://amicooked-b65b3.firebaseapp.com/__/auth/handler
   ```

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
amicooked/
├── src/
│   ├── components/
│   │   └── ui/           # ShadCN UI components (Button, Card)
│   ├── pages/
│   │   ├── Landing.jsx   # GitHub sign-in page
│   │   ├── Dashboard.jsx # User context input
│   │   └── Results.jsx   # Cooked Level results & recommendations
│   ├── services/
│   │   ├── github.js     # GitHub GraphQL API calls
│   │   └── openrouter.js # AI analysis with OpenRouter
│   ├── config/
│   │   └── firebase.js   # Firebase configuration
│   ├── utils/
│   │   └── cn.js         # Tailwind utility functions
│   ├── App.jsx           # Main router
│   ├── main.jsx          # React entry point
│   └── index.css         # Tailwind + global styles
├── public/               # Static assets
└── package.json          # Dependencies
```

## How It Works

1. **Sign In:** User authenticates with GitHub OAuth
2. **Context:** User enters their education/career stage (e.g., "Sophomore CS Student")
3. **Analysis:** 
   - Fetch GitHub data via GraphQL (repos, commits, PRs, languages, streaks)
   - Send to OpenRouter AI for analysis
   - AI generates a "Cooked Level" (0-10) and recommendations
4. **Results:** Display level, stats, tech stack, and actionable roadmap

## API Keys & Credentials

All credentials are already configured in the codebase:
- ✅ Firebase config (public keys)
- ✅ GitHub OAuth Client ID
- ✅ OpenRouter API key
- ⚠️ **GitHub Client Secret** (add to Firebase console manually)

## Deployment

When ready to deploy:

```bash
npm run build
```

Deploy the `dist/` folder to:
- Firebase Hosting
- Vercel
- Netlify
- Or any static hosting service

Update the GitHub OAuth callback URL to your production domain.

## Development Tips

- Use `npm run dev` for hot reload during development
- Check browser console for API errors
- GitHub token is stored in `localStorage` after sign-in
- OpenRouter uses `auto` model selection for cost efficiency

## Troubleshooting

**"Authentication failed"**
- Ensure GitHub Client Secret is added to Firebase console
- Check that callback URL matches in GitHub OAuth app settings

**"GitHub API error"**
- Verify user granted `repo`, `read:user`, and `user:email` scopes
- Check that GitHub token is valid in localStorage

**"AI analysis failed"**
- Verify OpenRouter API key is valid
- Check network tab for API response errors

---

Built with ❤️ for WinHacks 2026
