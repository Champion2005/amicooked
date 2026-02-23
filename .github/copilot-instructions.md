# AI Coding Agent Instructions for `amicooked`

## Product Context
`amicooked` is a pre-release AI-powered GitHub portfolio auditor. Users sign in with GitHub OAuth, the app fetches their activity via the GitHub GraphQL API v4, runs an AI analysis via OpenRouter, and returns a "Cooked Level" score (1–10) with a personalized recovery roadmap. There is a freemium model with a payment page for pro features.

Review `project_info/` before making assumptions about scope or intent.

## Tech Stack
- **Frontend:** React 18 + Vite, React Router v6
- **Styling:** Tailwind CSS v3 + ShadCN UI components (see `src/components/ui/`)
- **Auth & DB:** Firebase Auth (GitHub OAuth provider) + Firestore
- **AI:** OpenRouter API (called from the client via `src/services/openrouter.js`)
- **Data:** GitHub GraphQL API v4 (authenticated with the user's OAuth token)

## Project Structure
```
src/
  pages/          # Route-level components (Landing, Dashboard, Profile, Results, Payment)
  components/     # Reusable UI components; ui/ holds ShadCN primitives
  services/       # External API calls and business logic (github.js, agent.js, openrouter.js, etc.)
  hooks/          # Custom React hooks (e.g., useGitHubSignIn.js)
  config/         # Firebase init, agent instructions, plan definitions, tag suggestions
  utils/          # Pure utility functions (cn.js, formatEducation.js)
```

## Security
- **Never hardcode secrets.** All API keys, Firebase config values, and the OpenRouter API key must live in `.env` (prefixed `VITE_`) and be read via `import.meta.env`. A `.env.example` should document every required variable. The Firebase config currently in `src/config/firebase.js` must be migrated to environment variables.
- **OAuth tokens** received from GitHub must never be logged, stored in `localStorage`, or exposed in URLs. Store them only in memory or a short-lived secure session.
- **Firestore security rules** (`firestore.rules`) must enforce that users can only read and write their own documents. No rule should allow unauthenticated access to user data.
- **Authenticated routes** — any page beyond the landing page must redirect unauthenticated users to `/`. Implement a reusable `ProtectedRoute` wrapper and apply it in `App.jsx`.
- **Input sanitization** — any user-supplied text (profile inputs, tags, chat messages) must be trimmed and length-capped before being stored in Firestore or sent to the AI.
- **AI prompts** — never inject raw user input directly into system prompts without sanitization. Treat all user content as untrusted data in prompt construction.
- **Dependency hygiene** — avoid adding packages with known vulnerabilities; prefer well-maintained libraries with small surface areas.

## Code Quality & Practices
- **Component responsibility:** Pages own data fetching and state; components receive data via props and emit events via callbacks. Avoid deeply nested prop drilling — use context or a custom hook when data is needed across multiple components.
- **Error handling:** Every `async` function in `services/` must handle and surface errors explicitly. Use the existing `Toast` system for user-facing errors rather than `console.error` alone. Wrap page-level renders in the existing `ErrorBoundary`.
- **Loading & empty states:** Every data-fetching operation must have a corresponding loading skeleton or spinner and a graceful empty state. Never leave the UI blank or frozen.
- **PropTypes or JSDoc:** Document the expected shape of props for all components, either with PropTypes or JSDoc `@param` annotations, so intent is clear without requiring TypeScript.
- **No magic numbers or strings:** Extract constants (score thresholds, plan limits, API endpoints) to the appropriate file in `src/config/`.
- **Service layer isolation:** All network calls (GitHub API, OpenRouter, Firestore) belong exclusively in `src/services/`. Pages and components must not directly call `fetch` or Firebase SDK methods.
- **Hook conventions:** Custom hooks must be prefixed `use`, return a stable API, and never produce side effects outside of `useEffect`.
- **Avoid dead code:** Remove unused imports, variables, and commented-out blocks before considering a task complete.
- **Consistent formatting:** Follow the existing code style (2-space indent, single quotes, no semicolons where not present). Run the project linter before marking work done.

## UI & Design
- **ShadCN first:** Reach for a ShadCN primitive (`Button`, `Card`, etc. in `src/components/ui/`) before writing custom UI. Only build a new primitive if nothing in ShadCN covers the use case.
- **Tailwind conventions:** Use Tailwind utility classes directly; avoid inline `style` props. Use the `cn()` utility from `src/utils/cn.js` for conditional class merging.
- **Responsiveness:** All pages must be usable on mobile (375 px) through desktop (1440 px). Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`) rather than media query overrides.
- **Accessibility:** Interactive elements must have accessible labels (`aria-label`, `aria-describedby`, or visible text). Color alone must not convey meaning. Keyboard navigation must work on all interactive elements.
- **Consistency:** Maintain a uniform visual language — spacing, typography scale, and color tokens should not vary arbitrarily between pages. Reuse shared layouts and heading styles.
- **Micro-interactions:** Buttons must show disabled + loading states during async operations. Transitions should be subtle (Tailwind `transition`, `duration-200`) and purposeful.

## Collaboration Style
- Restate your understanding of a request and flag any ambiguity before writing significant code.
- Prefer small, focused changes over large speculative refactors. Align with the user before restructuring files or folders.
- After completing changes, provide a concise summary: what changed, how to test it, and any follow-up considerations.
- Ask before introducing a new dependency; briefly justify why it's the right choice for a production-bound product.

## Pre-Release Readiness
- Flag any feature that stores, transmits, or displays personal data — ensure it aligns with Firestore rules and minimal-data principles.
- Prefer defensive defaults: fail closed (deny access) rather than open when authorization state is uncertain.
- Keep the README accurate: document all required environment variables, setup steps, and `npm` scripts whenever they change.

## TODO
Mention this next time to remind. Do not implement unless explicitly asked to. This is just for reference, reminder, and progress tracking.

- [ ] billing section in settings page has issue where buttons dont have enough vertical padding so text overflows. Fix the button styles to ensure all text is fully visible and buttons are easily tappable on mobile.
- [ ] Make more memories available to pro and ultimate plans, and add a UI section in settings to view and manage saved memories (delete, export, etc.), (75 for student, 200 for pro, 500 for ultimate). Ensure pricing page reflects these benefits and limits are managed in the agent persistence logic.
- [ ] Make danger zone take up the 2 columns and make profile in settings do the same. thanks g