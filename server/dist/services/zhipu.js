"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createZhipuProvider = createZhipuProvider;
/**
 * 智谱（GLM）provider —— OpenAI 兼容 wire format
 * 厂商端点/默认模型只允许出现在本文件与 deepseek.ts / llm.ts 中
 */
const llm_1 = require("./llm");
const ZHIPU_ENDPOINT = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const ZHIPU_DEFAULT_CHAT_MODEL = 'glm-4-flash';
const ZHIPU_DEFAULT_VISION_MODEL = 'glm-4v-flash';
function createZhipuProvider(apiKey, model, kind = 'chat') {
    const resolvedModel = model || (kind === 'vision' ? ZHIPU_DEFAULT_VISION_MODEL : ZHIPU_DEFAULT_CHAT_MODEL);
    return {
        name: 'zhipu',
        async chat(params) {
            return (0, llm_1.openAICompatibleChat)({ endpoint: ZHIPU_ENDPOINT, apiKey, model: resolvedModel }, params);
        }
    };
}
//# sourceMappingURL=zhipu.js.map