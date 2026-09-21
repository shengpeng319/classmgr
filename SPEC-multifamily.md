# ClassMgr 多家庭改造 — 实施规格 (spec)

> 状态：批1-4 按序执行，每批完成后由主 agent review/build/commit。
> 原则：孩子=档案不是账号；admin 兼家长；接口加 v2 前缀；不做旧数据格式兼容层（无存量客户），但保留 v2 版本化。

## 背景与决策（已拍板）

- 现状：单家庭硬编码。User 表 role=admin/user 混用（孩子也是登录账号）。
- 目标：多家庭。家庭=Family，孩子=家长名下档案 Child（**不是登录账号**），家长=登录账号 role=parent，admin=兼家长的超级管理员（能看到所有家庭 + 自己家）。
- 孩子档案字段（第一期）：name/gender/avatar。不加密码 username（孩子不登录）。
- 无存量客户：旧接口可直接废弃，但新接口一律挂 `/api/classmgr/v2/` 前缀，为将来版本化预留。
- 兼容预留三件套：v2 前缀；`/health` 与 login 响应带 `minSupportedVersion: "2.0.0"`；数据模型一次到位只加列不改表。

## 批1：数据库（schema + 迁移）

`server/prisma/schema.prisma` 新增/修改：

```prisma
model Family {
  id        String   @id @default(uuid())
  name      String   // 家庭名称，默认"XX家"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  users     User[]
  children  Child[]
}

model Child {
  id           String    @id @default(uuid())
  familyId     String
  name         String
  gender       String    @default("male")
  avatar       String?
  points       Int       @default(0)   // 积分从 User 迁来
  isActive     Boolean   @default(true) // 二期"启用/停用"预留
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  family       Family    @relation(fields: [familyId], references: [id])
  tasks        Task[]
  schedules    Schedule[]
  pointRecords PointRecord[]
  studentCards StudentCard[]
  records      Record[]
}

model User 修改：
  + familyId  String?   // admin/parent 必有；预留 null
  role 含义变更: "admin"=兼家长的管理员, "parent"=家长, 旧值 "user" 迁移时统一转 "parent"
  删除孩子才需要的字段? 不删列（password/username 留着，admin/parent 都要用）

业务表修改（Task/Schedule/PointRecord/StudentCard/Record/CourseStudent）：
  + childId  String?    // 迁移后非空；CourseStudent 挂 Child.id
  保留 userId 列一版（不删，避免大迁移脚本；代码不再读写）— ponytail: 以后清列
```

迁移脚本 `server/prisma/migrations/` + `server/scripts/migrate_family.ts`：
1. 建 Family："盛鹏家"，sp(daniel/sophia 的管理账号) 为成员
2. role=user 的 daniel/sophia：其 Task/Schedule/PointRecord/StudentCard/Record 全部转挂新建 Child 档案（daniel、sophia 各一，归 sp 的 family），User 行保留但不再使用
3. sp: role=admin 不变，familyId=盛鹏家
4. seed 文件同步改（prisma/seed.ts 产出多家庭样例：第二家庭示例）
5. **验证断言**：迁移后 select Count(*) 每张业务表 childId 非空率 = 原 userId 非空率

## 批2：后端接口（全部挂 v2）

新增 `server/src/routes/v2/`（或统一 v2 helper + family scope middleware）：

- middleware `familyScope`：从 JWT 取 user → 查 familyId → ctx.state.family。admin 可带 ?familyId= 查任意家庭；parent 锁定自己家庭
- `POST /v2/auth/register`：注册即建 Family（name 默认 "{name}家"），role=parent；邀请码/家庭加入逻辑二期
- `GET/POST/PUT/DELETE /v2/children`：孩子档案 CRUD（校验属于当前家庭）
- `GET/POST/PUT/DELETE /v2/tasks|schedules`：查询自动按家庭过滤；创建/修改校验 childId 属于当前家庭
- `GET /v2/children/:id/points`、`POST /v2/point-records`：积分读写迁到 Child
- `POST /v2/lottery/draw`：抽卡扣 Child.points、StudentCard 挂 childId
- `GET /v2/family`：当前用户家庭信息 + children 列表（前端启动数据源）
- `/health` 加 `minSupportedVersion`
- 旧接口：删除孩子端登录语义（auth/login 拒绝已迁移的 daniel/sophia 之类的旧孩子账号），其余保留但代码里标记 @deprecated 一版

## 批3：前端

- `src/api/` 新增 v2 模块（child.ts, family.ts…），旧模块删除或改指向 v2（无存量客户，直接改）
- 登录后拉 `/v2/family` → Pinia store `familyStore`（替代 userFilter 的"选孩子"逻辑）
- 「我的孩子」页（家长/管理员）：列表+增删改档案+切换当前查看的孩子
- 各业务页（今日任务/课表/积分/抽卡/历史）：数据源 childId 化，顶部孩子切换条复用 FilterBar 样式
- 注册页：家长注册（去掉"角色选择"）
- 顶部 layout 不动

## 批4：AI 助手

- aiTools.ts：ctx 加 familyId；resolveTargetUser 改为 resolveChild（在当前家庭 children 中模糊匹配 name）；admin=全部家庭 children 可见（带 familyName 标注）
- list_schedules/list_tasks/list_point_records/get_points/create_*：childId 化
- 系统 prompt：孩子概念说明不变，owner 语义=Child.name

## 验收（每批）

- 批1：`npx prisma migrate dev` 本地过 + migrate_family.ts 跑完断言全绿 + seed 后多家庭数据可见
- 批2：curl 脚本打 v2 全接口，双家庭隔离断言（A 家长看不到 B 家孩子数据）
- 批3：DevTools preview 真机，家长切换孩子、管理员跨家庭查看
- 批4：AI 问「daniel 今天有什么课」按新档案答对

## 明确不做（YAGNI）

- 邀请码/多家长共管一个家庭（二期）
- 孩子端登录（永远不做，PRD 已定档案制）
- 旧接口兼容层（无存量客户）
- 软删除/审计日志
