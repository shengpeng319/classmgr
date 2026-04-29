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
npx prisma migrate dev   # apply schema → SQLite
npx prisma db seed       # populate seed data
```

## Dev Commands

```bash
# Frontend (root)
npm run dev:h5           # H5/web dev server (vite, port 5173)
npm run dev:app          # native app (Android/iOS)
npm run dev:mp-weixin    # WeChat Mini Program

# Backend (server/)
npm run dev              # tsx watch → port 3000 (env: PORT)
npm run mcp              # MCP server (stdio, for AI agent integration)
npm run db:migrate       # prisma migrate dev
npm run db:studio        # prisma studio (DB browser GUI)
```

## Architecture

- **Frontend**: Uni-app (Vue 3 Composition API + `<script setup>` + TypeScript), path alias `@/` → `src/`
- **Backend**: Koa 2 + TypeScript, port 3000, API prefix `/api/classmgr`
- **Database**: SQLite via Prisma ORM, file at `server/prisma/dev.db`
- **Auth**: JWT (7-day expiry), Bearer token header
- **Cron**: node-cron runs daily at 00:15 Asia/Shanghai — auto-generates `Task` records from active `Schedule` entries with `isDailyTask: true`

## Critical Gotchas

- **API base URL is hardcoded** in `src/utils/request.ts:1` → `http://192.168.101.50:3000/api/classmgr`. Change this for local dev if your machine is not on that IP.
- The cron only fires while the server process is running. Tasks for today are not backfilled on restart.
- This is a **Uni-app project** — use the `uni` CLI for builds, not Vite directly (the `npm run dev:app` / `dev:mp-weixin` / `build:*` scripts handle this). Vite is only used under the hood for H5.
- All platform differences use Uni-app conditional compilation (`#ifdef` / `#ifndef`), not runtime detection.
- `src/pages.json` is the single source of truth for page routing and the 5-tab bar (今日任务, 历史任务, 课程表, 积分, 抽卡). New pages must be registered here.
- There are **no lint, typecheck, or test scripts** in either `package.json`. TypeScript is checked only at build time.
- Database schema changes require a Prisma migration: `cd server && npm run db:migrate`

## API Conventions

- Response format: `{ code: number, message: string, data?: any }`
- All requests flow through `src/utils/request.ts` (token injected from `uni.getStorageSync('token')`)
- API functions live in `src/api/` — one file per domain (task.ts, schedule.ts, card.ts, etc.)
- Backend routes in `server/src/routes/`, aggregated at `server/src/routes/index.ts`
- Admin routes require both `authMiddleware` and `adminMiddleware` (role check)

## Database (Prisma)

- 10 models: User, RememberedUser, Course, CourseStudent, Record, Card, StudentCard, Task, Schedule, PointRecord, PresetPointItem
- Seed users: `admin`/`admin123` (admin role), `user`/`user123`, `daniel`/`daniel123`, `sophia`/`sophia123`
- Static files (avatars) served from `server/uploads/`

## Multi-User Filtering (Admin)

Admin pages use the `userFilter` Pinia store (`src/stores/userFilter.ts`) to toggle which users' data is shown. Components: `FilterBar.vue` (horizontal avatar strip), `UserSelector.vue` (single-user picker).
