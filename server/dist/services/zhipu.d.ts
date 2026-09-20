/**
 * 智谱（GLM）provider —— OpenAI 兼容 wire format
 * 厂商端点/默认模型只允许出现在本文件与 deepseek.ts / llm.ts 中
 */
import { LLMProvider } from './llm';
export declare function createZhipuProvider(apiKey: string, model: string | undefined, kind?: 'chat' | 'vision'): LLMProvider;
//# sourceMappingURL=zhipu.d.ts.map