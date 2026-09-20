/**
 * AI 助手路由（Agent 循环）
 *   POST /api/classmgr/ai/chat    { messages, image? }  → { text, options, confirmId? }
 *   POST /api/classmgr/ai/confirm { confirmId }          → 执行待确认操作
 *
 * 流程：组装 system prompt + 工具列表 + 消息历史 → 调 LLM →
 *       若返回 tool_calls：执行工具（写操作转待确认）→ 结果回喂 LLM → 循环（上限 5 轮）→
 *       最终 assistant 回复（json_object 优先，解析失败降级为纯文本）。
 */
import Router from 'koa-router';
export declare function aiRoutes(router: Router): void;
//# sourceMappingURL=ai.d.ts.map