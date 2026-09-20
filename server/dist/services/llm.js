"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIConfigError = void 0;
exports.openAICompatibleChat = openAICompatibleChat;
exports.contentToString = contentToString;
exports.getChatProvider = getChatProvider;
exports.getVisionProvider = getVisionProvider;
/**
 * 通用 LLM 适配层（L1）
 *
 * 厂商差异（端点 / 鉴权头 / 默认模型名）全部锁定在本目录：
 *   - llm.ts     统一接口 + OpenAI 兼容 wire format 引擎 + env 驱动的 provider 解析
 *   - zhipu.ts   智谱 provider
 *   - deepseek.ts DeepSeek provider
 *
 * 约定：全部走 OpenAI 兼容格式（messages / tools / tool_calls），
 * GLM 与 DeepSeek 原生兼容该格式。无 SDK 依赖，直接 fetch。
 */
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const zhipu_1 = require("./zhipu");
const deepseek_1 = require("./deepseek");
// ---- 轻量 .env 加载（tsx 运行时未必有人加载 .env；不覆盖已有环境变量） ----
loadEnvFile();
function loadEnvFile() {
    try {
        // src/services/llm.ts -> server/.env
        const envPath = path.join(__dirname, '..', '..', '.env');
        if (!fs.existsSync(envPath))
            return;
        const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
        for (const line of lines) {
            const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
            if (!m || line.trim().startsWith('#'))
                continue;
            let value = m[2];
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            if (process.env[m[1]] === undefined) {
                process.env[m[1]] = value;
            }
        }
    }
    catch {
        // .env 加载失败不阻塞服务
    }
}
/** 配置类错误（缺 key / 不支持的视觉模型等），上层应返回友好提示而非 500 */
class AIConfigError extends Error {
}
exports.AIConfigError = AIConfigError;
// ---- OpenAI 兼容请求引擎 ----
function withImage(messages, imageBase64) {
    const dataUrl = imageBase64.startsWith('data:')
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;
    const msgs = messages.map((m) => ({ ...m }));
    for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i];
        if (m.role === 'user' && typeof m.content === 'string') {
            m.content = [
                { type: 'text', text: m.content },
                { type: 'image_url', image_url: { url: dataUrl } }
            ];
            return msgs;
        }
    }
    msgs.push({
        role: 'user',
        content: [
            { type: 'text', text: '请识别这张图片' },
            { type: 'image_url', image_url: { url: dataUrl } }
        ]
    });
    return msgs;
}
async function openAICompatibleChat(config, params) {
    let messages = params.messages;
    if (params.imageBase64) {
        messages = withImage(messages, params.imageBase64);
    }
    const body = { model: config.model, messages };
    if (params.tools && params.tools.length > 0) {
        body.tools = params.tools;
        body.tool_choice = 'auto';
    }
    if (params.responseFormat) {
        body.response_format = { type: params.responseFormat };
    }
    // ponytail: 2 次重试 + 2s 退避，覆盖智谱免费档高峰 429/500 抖动；持续恶化再考虑切付费档
    let res;
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            res = await fetch(config.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${config.apiKey}`
                },
                body: JSON.stringify(body)
            });
            if (res.ok)
                break;
            if (res.status !== 429 && res.status !== 500)
                break; // 非瞬态错误不重试
            lastErr = new Error(`LLM API 错误 ${res.status}: ${(await res.text().catch(() => '')).slice(0, 500)}`);
        }
        catch (e) {
            lastErr = new Error(`无法连接 LLM 服务: ${e.message}`);
        }
        if (attempt < 2)
            await new Promise((r) => setTimeout(r, 2000));
    }
    if (!res || !res.ok)
        throw lastErr || new Error('LLM 请求失败');
    const json = await res.json();
    const msg = json.choices && json.choices[0] && json.choices[0].message;
    if (!msg) {
        throw new Error(`LLM API 返回格式异常: ${JSON.stringify(json).slice(0, 300)}`);
    }
    const out = { role: 'assistant', content: msg.content ?? '' };
    if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
        out.tool_calls = msg.tool_calls;
    }
    return out;
}
function contentToString(content) {
    if (content == null)
        return '';
    if (typeof content === 'string')
        return content;
    return content
        .filter((p) => p && p.type === 'text' && typeof p.text === 'string')
        .map((p) => p.text)
        .join('\n');
}
// ---- env 驱动的 provider 解析 ----
function env(name) {
    const v = process.env[name];
    return v && v.trim() ? v.trim() : undefined;
}
function requireApiKey() {
    const apiKey = env('AI_API_KEY');
    if (!apiKey) {
        throw new AIConfigError('AI 助手尚未配置：请在 server/.env 中填写 AI_API_KEY（智谱 https://open.bigmodel.cn 控制台获取），然后重启服务。');
    }
    return apiKey;
}
/** 文本对话 provider（AI_PROVIDER / AI_API_KEY / AI_MODEL） */
function getChatProvider() {
    const providerName = (env('AI_PROVIDER') || 'zhipu').toLowerCase();
    const apiKey = requireApiKey();
    if (providerName === 'deepseek') {
        return (0, deepseek_1.createDeepseekProvider)(apiKey, env('AI_MODEL'), 'chat');
    }
    return (0, zhipu_1.createZhipuProvider)(apiKey, env('AI_MODEL'), 'chat');
}
/**
 * 视觉 provider（AI_VISION_PROVIDER / AI_VISION_MODEL）。
 * 默认与 AI_PROVIDER 相同；DeepSeek 无视觉模型，必须显式配置 AI_VISION_MODEL，
 * 否则在有图片请求时抛 AIConfigError。
 */
function getVisionProvider() {
    const providerName = (env('AI_VISION_PROVIDER') || env('AI_PROVIDER') || 'zhipu').toLowerCase();
    const apiKey = requireApiKey();
    if (providerName === 'deepseek') {
        return (0, deepseek_1.createDeepseekProvider)(apiKey, env('AI_VISION_MODEL'), 'vision');
    }
    return (0, zhipu_1.createZhipuProvider)(apiKey, env('AI_VISION_MODEL'), 'vision');
}
//# sourceMappingURL=llm.js.map