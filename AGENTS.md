# ClassMgr (小孩课程管理系统)

## Setup

Two separate npm projects — install both:

```bash
npm install              # root: Uni-app frontend
cd server && npm install # backend: Koa + Prisma
```

First run requires database setup:

```bash
cd server
npx prisma migrate dev   # apply schema → SQLite (server/prisma/dev.db)
npx prisma db seed       # populate seed data
```

## Dev Commands

```bash
# Frontend (root) — Uni-app, use `uni` CLI (NOT vite directly)
npm run dev:h5           # H5/web, vite under the hood, default :5173
npm run dev:app          # native app (Android/iOS)
npm run dev:mp-weixin    # WeChat Mini Program

# Backend (server/)
npm run dev              # tsx watch src/index.ts → :3000
npm run build            # tsc → dist/
npm run mcp              # MCP server (stdio, for AI agent integration)
npm run db:migrate       # prisma migrate dev
npm run db:studio        # prisma studio (DB browser GUI)
```

Port/host are env-driven, not flags:
- Backend: `CLSMGR_BACKEND_PORT` (default 3000), `CLSMGR_HOST` (default 0.0.0.0), `JWT_SECRET`.
- Frontend (H5): `CLSMGR_FRONTEND_PORT` (default 5173).

`start.sh` is the one-line start on this machine — it (re)launches both via macOS `launchctl` (`com.classmgr.backend`, `com.classmgr.frontend`).

## Architecture

- **Frontend**: Uni-app (Vue 3 Composition API + `<script setup>` + TypeScript), path alias `@/` → `src/`.
- **Backend**: Koa 2 + TypeScript, API prefix `/api/classmgr`, aggregated in `server/src/routes/index.ts` (10 route modules). Health check at `GET /health`.
- **Database**: SQLite via Prisma ORM, file at `server/prisma/dev.db`.
- **Auth**: JWT 7-day expiry (`server/src/utils/jwt.ts`), `Authorization: Bearer <token>` header.
- **Cron**: node-cron runs `15 0 * * *` Asia/Shanghai (00:15) — generates `Task` records from active `Schedule` entries where `isDailyTask: true`. On server startup `generateDailyTasks()` also runs once to backfill today's tasks.

## Critical Gotchas

- **API base URL is relative** — frontend hardcodes `/api/classmgr` in `src/utils/request.ts:1`. In H5 dev this works via the **Vite proxy** (`vite.config.ts` forwards `/api` and `/uploads` to the backend). For App / WeChat-MP builds, a relative URL has no origin — you must swap in an absolute base URL before targeting those platforms.
- **This is a Uni-app project** — invoke the `uni` CLI via the `npm run dev:*` / `build:*` scripts. Vite is only used under the hood for H5.
- All platform differences use Uni-app conditional compilation (`#ifdef` / `#ifndef`), not runtime detection.
- `src/pages.json` is the single source of truth for routing and the 5-tab bar (今日任务, 历史任务, 课程表, 积分, 抽卡). **`pages/login/login` is the entry page** (first entry in `pages`). New pages must be registered here.
- H5 is served under the `/classmgr/` base path (Vite `base: '/classmgr/'`), not site root.
- There are **no lint, typecheck, or test scripts** in either `package.json` (`@playwright/test` is a leftover dep with no config/script). TypeScript is checked only at build time — run `cd server && npm run build` to typecheck the backend.
- Database schema changes require a Prisma migration: `cd server && npm run db:migrate`.
- Avatar/static files are served by the backend from `server/uploads/` (path `/uploads/*`), proxied to the frontend in H5 dev.

## API Conventions

- Response shape: `{ code: number, message: string, data?: any }`.
- All requests flow through `src/utils/request.ts` (token injected from `uni.getStorageSync('token')`).
- API functions live in `src/api/` — one file per domain (`task.ts`, `schedule.ts`, `card.ts`, `course.ts`, `lottery.ts`, `presetPointItem.ts`, `student.ts`).
- Backend routes in `server/src/routes/` (one file per domain), registered in `server/src/routes/index.ts`.
- Admin-protected routes require both `authMiddleware` and `adminMiddleware` (role check in `server/src/middleware/auth.ts`).

## Database (Prisma)

- 11 models: User, RememberedUser, Course, CourseStudent, Record, Card, StudentCard, Task, Schedule, PointRecord, PresetPointItem.
- Seed users: `admin`/`admin123` (admin role), `user`/`user123`, `daniel`/`daniel123`, `sophia`/`sophia123` (daniel/sophia also get seeded tasks + schedules).

## Multi-User Filtering (Admin)

Admin pages use the `userFilter` Pinia store (`src/stores/userFilter.ts`) to toggle which users' data is shown. Components: `FilterBar.vue` (horizontal avatar strip), `UserSelector.vue` (single-user picker).
