# CareerConnect

_AI-powered full-stack job portal connecting job seekers with employers — with resume analysis, cover letter generation, interview prep, and career coaching._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/career-connect run dev` — run the frontend (port 19107, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite + Tailwind CSS v4 + shadcn/ui + Wouter routing
- API: Express 5 on port 8080
- DB: PostgreSQL + Drizzle ORM
- Auth: Simple base64 token (userId:email:timestamp) stored in localStorage; password = SHA-256 + "careerconnect_salt"
- AI: OpenRouter (gpt-4o-mini) for resume analysis, cover letters, career coaching, interview prep
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/db/src/schema/` — DB schemas (users, companies, jobs, applications, saved_jobs, reviews)
- `lib/api-spec/openapi.yaml` — API contract source of truth (35+ endpoints)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/career-connect/src/pages/` — React page components
- `artifacts/career-connect/src/components/` — Shared React components (Navbar, JobCard, CompanyCard, AuthProvider)
- `artifacts/career-connect/src/lib/` — Auth utilities and helpers

## Architecture decisions

- **Auth**: Simple base64 token (not JWT) for simplicity. Token is userId:email:timestamp base64-encoded. Sent as `Authorization` header.
- **AI fallback**: All AI routes (analyze-resume, cover-letter, career-coach, interview-prep) return sensible fallback data if the AI API fails, so the UX never breaks.
- **Company logos**: No external logo APIs used — initials fallback used throughout to avoid CORS/sandbox issues.
- **URL routing**: Wouter used for client-side routing with BASE_URL from Vite for correct path-based proxy behavior.
- **Stats routes**: Registered directly on the statsRouter without prefix (no `/stats` parent) but individually at `/stats`, `/dashboard`, `/recruiter/dashboard`.

## Product

- **Job seekers**: Browse/search 10 seeded jobs, filter by type/level/location, save jobs, apply with cover letters, track application status in dashboard.
- **Recruiters**: Post new jobs, view applicants, update application statuses (pending → reviewing → interview → offer/rejected).
- **Admins**: Platform-wide stats dashboard (users, jobs, companies, applications).
- **AI Tools**: Resume analyzer with score/strengths/improvements, cover letter generator, AI career coach Q&A, interview prep question generator.
- **Companies**: Browse company profiles with industry, ratings, open positions, reviews; write company reviews.

## Demo Accounts

- Job seeker: `alex@example.com` / `password123`
- Recruiter: `sarah@example.com` / `password123`
- Admin: `marcus@example.com` / `password123`

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always restart the api-server workflow after changing route files (it builds from source).
- `SelectItem` must never have empty string values — use sentinel "all" for "all options" states.
- AI routes at `artifacts/api-server/src/routes/ai.ts` require `OPENROUTER_API_KEY` env var; graceful fallback included.
- Stats routes are mounted WITHOUT a prefix — registered directly at root of the stats router which is `router.use(statsRouter)` in routes/index.ts.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
