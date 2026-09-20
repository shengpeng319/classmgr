export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}
export type MessageContent = string | Array<Record<string, any>>;
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: MessageContent | null;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
}
export interface ToolDef {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, any>;
    };
}
export interface LLMChatParams {
    messages: ChatMessage[];
    tools?: ToolDef[];
    /** 最终回复轮才用，强制 JSON 输出 */
    responseFormat?: 'json_object';
    /** 有图时走视觉模型，图片注入到最后一条 user message */
    imageBase64?: string;
}
export interface LLMProvider {
    name: string;
    chat(params: LLMChatParams): Promise<ChatMessage>;
}
/** 配置类错误（缺 key / 不支持的视觉模型等），上层应返回友好提示而非 500 */
export declare class AIConfigError extends Error {
}
export declare function openAICompatibleChat(config: {
    endpoint: string;
    apiKey: string;
    model: string;
}, params: LLMChatParams): Promise<ChatMessage>;
export declare function contentToString(content: MessageContent | null | undefined): string;
/** 文本对话 provider（AI_PROVIDER / AI_API_KEY / AI_MODEL） */
export declare function getChatProvider(): LLMProvider;
/**
 * 视觉 provider（AI_VISION_PROVIDER / AI_VISION_MODEL）。
 * 默认与 AI_PROVIDER 相同；DeepSeek 无视觉模型，必须显式配置 AI_VISION_MODEL，
 * 否则在有图片请求时抛 AIConfigError。
 */
export declare function getVisionProvider(): LLMProvider;
//# sourceMappingURL=llm.d.ts.map