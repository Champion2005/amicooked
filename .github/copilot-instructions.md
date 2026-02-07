# AI Coding Agent Instructions for `amicooked`

## Project Context
- Treat this as an early-stage hackathon project: decisions are still open.
- Expect requirements and scope to change quickly; keep your changes easy to revert.
- Information about the project idea, requirements, and current progress is in `project_info/`. Review it before making assumptions.

## Choosing Stack & Architecture
- The tech stack consists of React, Tailwind, GraphQL, ShadCN UI and Firebase.
- Outline a simple architecture (key folders, entrypoints, and data flow) in a short markdown note or PR description before generating lots of code.
- Prefer lightweight, hackathon-friendly choices (simple setup, minimal boilerplate, few external services) unless the user explicitly asks for something heavier.

## Working in This Repo
- Keep initial commits small and focused: e.g., scaffold a minimal runnable app before adding extra features or tools.
- When adding structure, favor clear, conventional layouts (e.g., `src/`, `api/`, `frontend/`, `backend/`) and explain your choices in a brief summary.
- Avoid introducing complex infrastructure (containers, CI/CD, cloud services) unless the user explicitly requests it.

## Dependencies and Tooling
- Ask before adding major dependencies, frameworks, or build tools; explain why each addition helps the project win a hackathon (speed, reliability, or demo value).
- If the user approves, set up minimal scripts in the chosen ecosystem (e.g., `npm run dev`, `pytest`, etc.) and document them in the README.

## Collaboration Style
- When the user requests a feature, first restate your understanding and, if needed, ask targeted clarifying questions instead of guessing.
- Prefer incremental enhancements over large speculative refactors; align with the user before reshaping project structure.
- After making changes, provide a concise summary of what you added, how to run it, and any follow-up suggestions.

## README and Docs
- Keep the main README up to date with any new stack choice, setup steps, and primary run commands.
- If the architecture grows beyond a few files, consider adding a short `docs/architecture.md` or similar overview and link it from the README.
