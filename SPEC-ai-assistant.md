# SPEC: classmgr AI 助手（Agent 架构，一步到位）

## 需求定稿（用户拍板 2026-09-20）
1. **AI 助手 tab 一步到位**：function calling Agent 架构，课表图片识别是首批工具之一，不是专用功能
2. **tab 改造**：新增「AI」tab **替换「历史任务」**；原历史任务功能不删——在「今日任务」页角落加一个"历史"入口按钮（icon 或文字按钮均可，视觉低调），点击跳转原 history 页面
3. **数据操作范围**：查询/新增/更改/删除全支持，但**更改和删除必须经过用户确认按钮**才能执行
4. **模型无关**：现在用智谱 GLM，稍后可能切 DeepSeek——LLM 调用层必须通用抽象，不得写死任何厂商

## 架构

```
前端 ai.vue（会话式界面）                后端
┌─────────────────────┐
│ 消息列表（气泡）      │   POST /api/classmgr/ai/chat
│ 图片上传按钮         │ →  { messages, image? } (multipart 或 base64)
│ 输入框 + 发送        │ →  ① 组装 system prompt + 工具列表 + 消息历史
│ 选项按钮排（AI生成）  │ →  ② 调 LLM（llm.ts 通用适配层）
└─────────────────────┘ →  ③ 若返回 tool_calls：执行工具 → 结果回喂 LLM → 循环
                          →  ④ 最终 assistant 回复（text+options 结构）返回前端
```

### 循环上限：单次请求最多 5 轮工具调用，防失控

## 关键设计

### L1. 通用 LLM 适配层（server/src/services/llm.ts）
```ts
// 统一接口，厂商差异锁在这个文件里
interface LLMProvider {
  chat(params: {
    messages: ChatMessage[]           // 含 role/content/tool_calls/tool_call_id
    tools?: ToolDef[]                 // OpenAI function calling 格式（业界通用，GLM/DeepSeek 都兼容）
    responseFormat?: 'json_object'    // 最终回复轮才用
    imageBase64?: string              // 有图时走视觉
  }): Promise<ChatMessage>
}
```
- 实现两个 provider：`zhipu.ts`（https://open.bigmodel.cn/api/paas/v4/chat/completions）、`deepseek.ts`（https://api.deepseek.com/chat/completions，暂存但注意 DeepSeek 无视觉模型——图片请求路由到 visionProvider 配置项）
- env 驱动切换：`AI_PROVIDER=zhipu|deepseek`、`AI_API_KEY`、`AI_VISION_PROVIDER`（可缺省，默认同 AI_PROVIDER）、`AI_MODEL`、`AI_VISION_MODEL`
- **全部走 OpenAI 兼容 wire format**（messages/tools/tool_calls），GLM 与 DeepSeek 原生兼容此格式，适配层只处理端点/鉴权头/模型名差异
- 无 SDK 依赖，直接 fetch

### L2. 工具注册表（server/src/services/aiTools.ts）
白名单注册制，每个工具 = { name, description, parameters(JSON Schema), needsConfirm, execute(userId, args) }

首批工具（全部强制 `userId = ctx.state.user.id`，不得信任 AI 传参）：
| 工具 | 操作 | needsConfirm |
|---|---|---|
| list_schedules | 查课表 | 否 |
| create_schedules | 批量建课表（课表图片识别落点） | **是** |
| update_schedule | 改课表 | **是** |
| delete_schedule | 删课表 | **是** |
| list_tasks / complete_task | 查任务/完成任务 | 查否/改**是** |
| list_point_records / get_points | 查积分 | 否 |
| add_points | 加减积分（管理员） | **是** |
| list_cards | 查卡牌 | 否 |

- **needsConfirm=true 的工具不直接执行**：execute 拆成两步——第一轮 AI 调用时后端返回"待确认操作"（存内存 pending map，key=confirmId，5分钟过期），回复带确认按钮；用户点确认后前端再发 `POST /ai/confirm {confirmId}` 才真正执行
- 图片识别路径：用户传图 → 后端把图片 base64 作为 user message 发给视觉模型（不需要独立工具，直接走对话）→ 视觉模型输出结构化课表 → 若需落库走 create_schedules 确认流

### L3. 回复结构协议（最终轮）
最终 assistant 消息用 json_object 模式：`{"text": "...", "options": ["按钮1", ...]}`
- 解析失败降级：把原始文本当 text，options 空
- system prompt 中写明 option 使用规范（确认类操作必须给「确认执行/取消」）

### L4. 前端 ai.vue
- 消息列表 + 图片上传（uni.chooseMedia，压缩后 base64）+ 输入框
- options 渲染成按钮排，点击 = 以该文本发送
- 确认类按钮特殊样式（绿色确认/灰色取消），点击「确认执行」→ 调 /ai/confirm
- 会话历史保存在页面 state（不持久化，切 tab 丢失可接受）；调 /ai/chat 时带上最近 20 条消息

### L5. tab 改造
- pages.json：tabBar 第2项「历史任务」→「AI」(icon: 用现有 static 里合适的图，或留占位注明)；history 页面保留注册（不在 tabBar）
- today.vue：右上角加「历史」入口按钮 → uni.navigateTo history 页

## 禁改清单
- 现有 10 个路由的业务逻辑（工具 execute 内部是**调用**现有 prisma 查询模式，不是重构它们）
- prisma schema
- 登录/鉴权流程
- lottery/card 业务逻辑（只读工具）

## 验收标准（Hermes 主 agent 逐项执行）
1. `npm run build:mp-weixin` 通过
2. `cd server && npx tsx src/index.ts` 起服 + /health 探活
3. AI 冒烟（H5 环境即可）：
   - 文本对话：发「我周三有游泳课下午3点到4点」→ 返回 text+options，含确认按钮
   - 点确认 → schedule 表落库（curl 查 /schedules 验证）
   - 「我有哪些课」→ list_schedules 被调用，回复含课表内容
   - 「删掉游泳课」→ 返回确认请求；确认前 DB 无变化；确认后删除
4. env 不配 AI_API_KEY 时，/ai/chat 返回友好错误（不 500 崩）
5. grep 验证：llm.ts 外无任何厂商 URL/key 硬编码

## 交付
- git diff --stat + 关键设计点说明
- 不 commit
