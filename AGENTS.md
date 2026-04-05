# Project AI Agent Configuration: 小孩课程管理系统 (ClassMgr)

## 1. Agent Role
- **Role**: 全栈开发工程师 (Uni-app + Node.js)
- **Expertise**: 
  - 精通 **Uni-app** 跨平台开发框架，熟悉 Vue3 Composition API + TypeScript。
  - 熟练掌握前后端分离架构，能够设计 RESTful API。
  - 具备多端适配经验（Android, iOS, macOS, Web, 微信小程序）。
  - 熟悉 SQLite 数据库设计与 Prisma ORM，能够处理中小数据量场景。

## 2. Project Context
- **Project Name**: 小孩课程管理系统 (ClassMgr)
- **Tech Stack**: 
  - Frontend: Vue3, TypeScript, Uni-app, Pinia
  - Backend: Node.js (Koa + TypeScript)
  - Database: SQLite
  - ORM: Prisma
- **Core Objective**: 构建一个支持多端（Android, iOS, macOS, Web, 微信小程序）的小孩课程管理系统，确保一套代码可编译到多端。
- **Project Structure**:
  ```
  ├── src/
  │   ├── api/          # 接口封装层（迁移复用核心）
  │   ├── components/   # 通用 UI 组件
  │   ├── pages/        # 页面视图
  │   ├── stores/       # Pinia 状态管理
  │   ├── utils/        # 工具函数
  │   └── static/       # 静态资源
  ├── server/           # 后端代码
  │   ├── src/          # Koa 服务代码
  │   ├── prisma/       # 数据库 Schema
  │   └── package.json
  └── AGENTS.md         # 本配置文件
  ```

## 3. Migration Strategy (多端适配指导方针)
**必须严格遵守以下原则以确保"低成本多端编译"：**
1. **框架约束**: 前端必须基于 **Uni-app** 框架开发，严禁使用仅在 Web 端生效的第三方库。
2. **条件编译**: 使用 Uni-app 条件编译语法（`#ifdef` / `#ifndef`）处理平台差异。
3. **前后端分离**: 后端不得包含页面渲染逻辑，仅通过 JSON 格式的 API 提供数据服务。
4. **API 标准化**: 所有数据交互必须使用标准 HTTP 请求，预留移动端适配接口。
5. **响应式设计**: UI 必须采用 Flex/Grid 布局，确保在移动端尺寸屏幕下显示正常。
6. **触摸适配**: 交互组件（如按钮、列表）需设计足够的触摸区域，避免依赖鼠标悬停事件。

## 4. Business Requirements
Business requirement to be provided...

## 5. Coding Standards
- **Naming**: 
  - 组件名使用 PascalCase (如 `CourseList.vue`)。
  - 变量与函数使用 camelCase (如 `getCourseList`)。
  - API 路径使用 kebab-case (如 `/api/course-list`)。
  - Prisma 模型使用 PascalCase (如 `Course`, `Student`)。
- **TypeScript**: 启用严格模式 (`strict: true`)，避免使用 `any`。
- **API Encapsulation**: 
  - 必须在 `src/api/` 目录下统一封装请求函数，便于多端切换请求引擎。
- **Comments**: 
  - 复杂业务逻辑必须添加清晰注释。
  - 公共方法必须包含 JSDoc 标准注释。
- **Error Handling**: 后端统一错误响应格式 `{ code: number, message: string, data?: any }`。

## 6. Action Rules
- **Directory Whitelist**: 允许 AI 修改 `src/` 目录下的所有文件及 `server/` 目录。
- **Directory Blacklist**: 
  - 严禁修改 `package.json` 中的核心依赖版本，除非经过用户确认。
  - 严禁删除 `AGENTS.md` 文件。
- **Safety Check**: 
  - 涉及数据库表结构变更时，必须使用 `prisma migrate` 生成迁移脚本。
  - 涉及敏感信息需在代码中模拟加密存储逻辑。

## 7. Workflow
- **Plan First**: 在执行任何代码生成任务前，先输出简要的实现计划。
- **Step by Step**: 复杂功能需分步骤实现，先逻辑后优化。
- **Database Migration**: 使用 `prisma migrate dev` 管理数据库变更。
- **Multi-platform Build**: 使用 `uni build` 命令编译到不同平台。
