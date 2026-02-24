# amicooked

**AI-powered GitHub portfolio auditor** — Built for WinHacks 2026

Users sign in with GitHub OAuth, the app fetches their activity via GitHub GraphQL API v4, runs an AI analysis via OpenRouter, and returns a "Cooked Level" score (1–10) with a personalized recovery roadmap.

**Created by:** Katarina Mantay, Aditya Patel, Norika Upadhyay

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS v3 + ShadCN UI
- **Auth & DB:** Firebase Auth (GitHub OAuth provider) + Firestore
- **AI:** OpenRouter API (client-side, via `src/services/openrouter.js`)
- **Data:** GitHub GraphQL API v4 (authenticated with user's OAuth token)
- **Language:** JavaScript (JSX, no TypeScript)

## Features

- GitHub OAuth authentication
- Comprehensive GitHub profile analysis (repos, commits, PRs, languages, streaks)
- AI-powered "Cooked Level" calculation (1–10 scale)
- Personalized improvement roadmap with actionable recommendations
- AI-recommended projects tailored to skill gaps
- Interactive AI chat agent with persistent memory (paid plans)
- Job Fit Checker
- Progress tracking and score history
- Customizable AI agent identity (Pro+)
- Saved project analysis with per-project AI chat
- Freemium model with tiered plans (Free, Student, Pro, Ultimate)
- Roast intensity preferences and dev nicknames
- Responsive design (mobile through desktop)

## Project Structure

```
amicooked/
├── src/
│   ├── App.jsx                  # Main router with protected routes
│   ├── main.jsx                 # React entry point
│   ├── index.css                # Tailwind + global styles
│   ├── assets/                  # Static assets (logo, images)
│   ├── components/
│   │   ├── ChatMessage.jsx      # AI chat message rendering
│   │   ├── ChatPopup.jsx        # Floating AI chat interface
│   │   ├── ErrorBoundary.jsx    # Global error boundary
│   │   ├── LanguageBreakdown.jsx  # Language distribution visualization
│   │   ├── ProtectedRoute.jsx   # Auth guard for protected pages
│   │   ├── SavedProjectsOverlay.jsx  # Saved projects panel with AI chat
│   │   └── ui/                  # ShadCN UI primitives
│   │       ├── Button.jsx
│   │       ├── Card.jsx
│   │       ├── TagInput.jsx
│   │       └── Toast.jsx
│   ├── config/
│   │   ├── agent-instructions.js  # AI agent system prompts
│   │   ├── agentPersonality.js    # Agent personality presets
│   │   ├── firebase.js            # Firebase initialization (reads from env vars)
│   │   ├── plans.js               # Plan definitions, limits, pricing, features, FAQs
│   │   ├── preferences.js         # User preference options (roast intensity, etc.)
│   │   └── tagSuggestions.js      # Autocomplete suggestions for tags
│   ├── hooks/
│   │   └── useGitHubSignIn.js   # Shared GitHub OAuth sign-in hook
│   ├── pages/
│   │   ├── Dashboard.jsx        # Main analysis trigger page
│   │   ├── Landing.jsx          # Public landing / sign-in page
│   │   ├── Pricing.jsx          # Pricing plans page
│   │   ├── Profile.jsx          # User profile setup
│   │   ├── Results.jsx          # Analysis results display
│   │   └── Settings.jsx         # User settings, agent config, account management
│   ├── services/
│   │   ├── accountDeletion.js   # Account deletion and data reset
│   │   ├── agent.js             # AI agent orchestration with memory
│   │   ├── agentPersistence.js  # Agent state persistence to Firestore
│   │   ├── chat.js              # Chat message CRUD
│   │   ├── github.js            # GitHub GraphQL API calls
│   │   ├── openrouter.js        # OpenRouter AI API integration
│   │   ├── projectChat.js       # Per-project AI chat service
│   │   ├── savedProjects.js     # Saved project management
│   │   ├── skills.js            # Pluggable agent skills
│   │   ├── usage.js             # Usage tracking and limit enforcement
│   │   └── userProfile.js       # User profile and preferences CRUD
│   ├── utils/
│   │   ├── cn.js                # Tailwind class merging utility
│   │   ├── confetti.js          # Confetti animation utility
│   │   └── formatEducation.js   # Education level formatting
│   └── examples/
│       └── agent-integration-examples.jsx
├── project_info/                # Product planning documents
├── firestore.rules              # Firestore security rules
├── firebase.json                # Firebase project config
├── .env.example                 # Required environment variables template
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## Routes

| Path | Page | Auth Required |
|------|------|:---:|
| `/` | Landing (sign-in) | No |
| `/pricing` | Pricing plans | No |
| `/dashboard` | Analysis trigger | Yes |
| `/profile` | Profile setup | Yes |
| `/results` | Analysis results | Yes |
| `/settings` | Settings & account | Yes |

## Setup Instructions

### Prerequisites

- Node.js >= 20.19.0
- npm
- A GitHub OAuth App (configured in Firebase)
- An OpenRouter API key

### 1. Clone and install

```bash
git clone <repo-url>
cd amicooked
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env` with your values:

```
VITE_OPENROUTER_API_KEY=your_openrouter_api_key
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 3. Configure GitHub OAuth in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Authentication → Sign-in method**
4. Enable **GitHub** provider
5. Add your GitHub OAuth App credentials (Client ID + Client Secret)
6. Set the Authorization callback URL in your GitHub OAuth App to:
   ```
   https://<your-project>.firebaseapp.com/__/auth/handler
   ```

### 4. Run the dev server

```bash
npm run dev
```

App runs at `http://localhost:5173`

## How It Works

1. **Sign In** — Authenticate with GitHub OAuth via Firebase
2. **Profile** — Enter education level, interests, experience for contextual analysis
3. **Analyze** — The app fetches GitHub data (repos, commits, PRs, languages, streaks) via GraphQL, sends it to OpenRouter AI for scoring
4. **Results** — View your Cooked Level (1–10), category breakdowns, AI summary, and recommended projects
5. **Chat** — Ask the AI agent follow-up questions; it remembers your goals and progress (paid plans)
6. **Improve** — Follow the personalized roadmap to lower your Cooked Level

## Cooked Level Scale

| Level | Score | Meaning |
|-------|:-----:|---------|
| Cooking | 9–10 | Top tier — highly competitive |
| Toasted | 7–8 | Above average — solid with some gaps |
| Cooked | 5–6 | Below average — needs focused effort |
| Well-Done | 3–4 | Significantly below average |
| Burnt | 1–2 | Near-dormant — needs major changes |

## Plans

| Feature | Free | Student ($3/mo) | Pro ($10/mo) | Ultimate ($15/mo) |
|---------|:----:|:-------:|:---:|:--------:|
| AI Messages/mo | 5 | 100 | 300 | 1,200 |
| Regenerations/mo | 1 | 25 | 75 | 300 |
| Agent Memory | — | 75 items | 200 items | 500 items |
| In-Depth Stats | — | ✓ | ✓ | ✓ |
| Custom Agent | — | — | ✓ | ✓ |

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |

## Deployment

```bash
npm run build
```

Deploy the `dist/` folder to Firebase Hosting, Vercel, Netlify, or any static host. Update your GitHub OAuth callback URL to match your production domain.

## Security Notes

- All API keys and Firebase config are stored in environment variables (`.env`, gitignored)
- GitHub OAuth tokens are stored in `sessionStorage` (cleared on tab close)
- Firestore security rules enforce user-level access control
- Protected routes redirect unauthenticated users to the landing page
- Usage limits are enforced both client-side and via Firestore rules

## Troubleshooting

**"Authentication failed"**
- Ensure GitHub Client Secret is added to Firebase Console
- Check that the callback URL matches in your GitHub OAuth App settings

**"GitHub API error"**
- Verify user granted `repo`, `read:user`, and `user:email` scopes
- The GitHub token lives in sessionStorage — if it's missing, sign out and sign back in

**"AI analysis failed"**
- Verify your OpenRouter API key is valid in `.env`
- Check the browser network tab for API response errors

**App won't start / Firebase errors**
- Ensure all `VITE_FIREBASE_*` variables are set in `.env`
- Run `cp .env.example .env` and fill in your values

---

Built with ❤️ for WinHacks 2026
