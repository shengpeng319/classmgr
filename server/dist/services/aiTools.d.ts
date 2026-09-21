import { ToolDef } from './llm';
export interface AIContext {
    userId: string;
    username: string;
    role: string;
}
export interface AITool {
    name: string;
    description: string;
    parameters: Record<string, any>;
    needsConfirm: boolean;
    /** 生成给用户看的操作摘要（确认按钮场景） */
    summarize(args: any): string;
    execute(ctx: AIContext, args: any): Promise<any>;
}
/**
 * 解析查询目标用户：admin 可用 childName 指定孩子（模糊匹配用户名/姓名），缺省查自己；
 * 普通用户一律查自己（不信任模型传参）。
 * ponytail: childName 需唯一匹配，歧义时报错列出候选；孩子多了再考虑精确 id 传参。
 */
export declare function resolveTargetUser(ctx: AIContext, args: any): Promise<{
    userId: string;
    userName: string;
    childId?: string;
}>;
export declare function getAITool(name: string): AITool | undefined;
/** 导出给 LLM 的工具定义；管理员工具（add_points）只对 admin 暴露 */
export declare function aiToolDefs(role: string): ToolDef[];
interface PendingConfirm {
    id: string;
    userId: string;
    toolName: string;
    args: any;
    summary: string;
    expiresAt: number;
}
export declare function createPendingConfirm(userId: string, toolName: string, args: any): {
    confirmId: string;
    summary: string;
};
/** 取出（一次性）待确认操作；不存在 / 过期 / 非本人均返回 null */
export declare function takePendingConfirm(confirmId: string, userId: string): PendingConfirm | null;
export {};
//# sourceMappingURL=aiTools.d.ts.map