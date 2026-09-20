# SPEC: classmgr 微信小程序迁移（第一阶段：本地可运行）

## 背景
- 项目：~/code/classmgr（uni-app 前端 + Koa 后端 + Prisma SQLite）
- 目标：改造为可编译 mp-weixin 的微信小程序 + 后端可上云托管（MySQL）。**本阶段验收标准 = 前端 `npm run build:mp-weixin` 编译通过 + 后端本地跑通 + 前端 H5/本地模式仍能正常访问后端**
- AppID 尚未申请：manifest.json 的 mp-weixin.appid 填占位符 `wxTODO_FILL_LATER`，不阻塞

## 改动清单

### 1. profile 页浏览器 API 条件编译（src/pages/profile/profile.vue）
- 文件里 `document.createElement('canvas')` / `new Image()` / `FileReader`（约 226 行起的 `compressImage` 函数）在小程序端不存在
- 改法：小程序端走已有的 `uni.compressImage` 路径（约 144 行已存在），把 canvas/Blob/FileReader 那段 H5 压缩逻辑用 `// #ifdef H5` ... `// #endif` 条件编译包裹；小程序端直接把压缩后的 tempFilePath 经 `uni.getFileSystemManager().readFile` 转 base64（现有 `fileToBase64` 已用 `uni.getFileSystemManager`，确认它在 mp-weixin 下可用即可）
- 自查：改造后 grep 该文件确认 `document.` 与 `new Image(` 只出现在 `#ifdef H5` 块内

### 2. request.ts 双模式（src/utils/request.ts）
- 现状：`BASE_URL = '/api/classmgr'` 相对路径，H5 靠 vite 代理
- 改法（最小改动，不引 wx.cloud）：
  ```ts
  // #ifdef H5
  const BASE_URL = '/api/classmgr'
  // #endif
  // #ifndef H5
  const BASE_URL = 'https://CLASSMGR_API_DOMAIN/api/classmgr'  // 云托管域名，部署时替换
  // #endif
  ```
- `uni.request` 本身跨端兼容，其余逻辑不动

### 3. 后端 MySQL 双支持（server/）
- `server/prisma/schema.prisma`：datasource provider 保持 sqlite **不动**，新增注释行注明部署时改 mysql + DATABASE_URL（本阶段不做 schema provider 切换——本地开发继续用 SQLite，云上用 MySQL 时 Prisma schema 语法两者兼容，只需改 provider 一行）
  - ⚠️ 但要先验证：grep schema 里是否有 SQLite 专有类型/特性（如 `@db.SQLite` 特定注解、Json 与 Boolean 默认值差异），有则列出来
- `server/src/index.ts` 或 env 读取处：确认 DATABASE_URL 已从环境变量读取（而不是硬编码 file:./dev.db）。若硬编码，改成 `process.env.DATABASE_URL ?? 'file:./dev.db'`

### 4. 云托管部署物料（server/ 下新增，照抄 fashion-ecommerce/backend 模式）
- `server/Dockerfile`：node:20-alpine，npm ci → prisma generate → COPY src → CMD npx tsx src/index.ts，带 `ARG CACHE_BUST`
- `server/docker-entrypoint.sh`：参考 fashion 的带重试版（`timeout 90 npx prisma db push --skip-generate --accept-data-loss` 重试6次间隔10s，结果写 /tmp/dbpush.status），⚠️ 数据库不可达不挂死容器
- `server/container.config.json`：基本骨架
- 这些文件写了但不要求本地验证 Docker 构建（Hermes 主 agent 部署阶段负责）

## 禁改清单（do-not-touch）
- 所有业务逻辑（路由处理函数、points/lottery/cron 计算）
- 前端 10 个页面的业务代码（除 profile.vue 指定段落）
- prisma schema 的 model 定义
- server/package.json 依赖（不新增任何依赖）

## 构建验证（主 agent 侧执行，CC 不跑 npm）
CC 完成后 Hermes 逐项补跑：
1. `cd ~/code/classmgr && npm run build:mp-weixin`（或查 package.json scripts 确认实际命令名）→ dist/build/mp-weixin/ 产出
2. grep dist/build/mp-weixin/pages/profile/ 确认 `document.` 零残留
3. `cd server && npx prisma generate` 通过 + `npx tsx src/index.ts` 本地起服 + curl /api/classmgr 探活
4. H5 dev 模式冒烟：npm run dev 后 curl 代理路径

## 交付要求
- 列出所有改动文件的 git diff --stat
- 不 commit
- 报告 SQLite→MySQL 的兼容性检查结果（schema 里有无 SQLite 专有语法）
