# CareerConnect — Windows 11 / VS Code Setup

## Prerequisites

1. **Node.js 20.6+** — https://nodejs.org (v20.6+ required for `--env-file` support)
2. **pnpm** — `npm install -g pnpm`
3. **PostgreSQL** — https://www.postgresql.org/download/windows/ (port 5432 or 5433)

---

## First-time Setup

```powershell
# 1. Install all packages
pnpm install

# 2. Configure environment
copy .env.example .env
```

Edit `.env` with your PostgreSQL credentials:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/careerconnect
PORT=8081
```

> **Note:** If your password contains special characters (e.g. `@`), encode them:
> `@` → `%40`, `#` → `%23`, `$` → `%24`

```powershell
# 3. Create database tables
pnpm db:push

# 4. Seed demo data (optional but recommended)
pnpm db:seed

# 5. Start both servers
pnpm dev
```

Open http://localhost:5173 in your browser.

---

## Common commands

```powershell
pnpm dev              # start frontend + backend together
pnpm db:push          # create/update database tables
pnpm db:seed          # seed demo accounts and sample data
pnpm db:setup         # push + seed in one step (first time setup)
pnpm build            # full TypeScript build
pnpm typecheck        # type-check all packages
```

---

## Run servers separately

```powershell
# Terminal 1 — API server (http://localhost:8081)
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend (http://localhost:5173)
pnpm --filter @workspace/career-connect run dev
```

---

## Environment variables

| Variable             | Default                                                        | Required |
|----------------------|----------------------------------------------------------------|----------|
| `DATABASE_URL`       | `postgresql://postgres:password@localhost:5432/careerconnect` | **Yes**  |
| `PORT`               | `8081`                                                         | No       |
| `OPENROUTER_API_KEY` | _(none)_ — AI features show fallback responses without it      | No       |

---

## Demo accounts (after `pnpm db:seed`)

| Role       | Email               | Password    |
|------------|---------------------|-------------|
| Job seeker | alex@example.com    | password123 |
| Recruiter  | sarah@example.com   | password123 |
| Admin      | marcus@example.com  | password123 |

---

## How environment variables are loaded

- **API server**: Node.js `--env-file=../../.env` flag in the start script — loads `.env` before any module runs, solving the ESM import hoisting issue.
- **drizzle-kit**: `drizzle.config.ts` reads and parses `.env` itself using `fs.readFileSync` — necessary because drizzle-kit runs its own esbuild context and does not inherit Node's `--env-file`.

---

## Troubleshooting

**`pnpm db:push` fails with "No schema files found"**
This was a bug caused by `import.meta.dirname` being `undefined` inside drizzle-kit's esbuild context. Fixed by using a relative schema path (`"./src/schema/index.ts"`) instead.

**`DATABASE_URL is not set` warning on backend start**
The `.env` file in the workspace root must exist. Run `copy .env.example .env` and fill in your credentials. The API server loads it via `--env-file=../../.env`.

**Port already in use**
Change `PORT` in `.env` (API server). The Vite proxy automatically picks up the new port via `API_PORT` env var (set `API_PORT=8081` in `.env`).

**pnpm `approve-builds` error for esbuild**
`.npmrc` already has `approve-builds=true`. If you still see it, run `pnpm approve-builds` once.
