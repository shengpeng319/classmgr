/**
 * DeepSeek provider —— OpenAI 兼容 wire format
 * 注意：DeepSeek 无视觉模型，kind='vision' 时必须显式传入模型名，否则抛配置错误
 */
import { LLMProvider } from './llm';
export declare function createDeepseekProvider(apiKey: string, model: string | undefined, kind?: 'chat' | 'vision'): LLMProvider;
//# sourceMappingURL=deepseek.d.ts.map