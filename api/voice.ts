/**
 * 声音克隆相关 API
 */
import { post } from './index';

// 声音克隆请求接口
export interface VoiceCloneRequest {
  audio: string; // 参考音频URL或base64
  text: string; // 要合成的文本
  language?: string; // 语言代码（如：zh-CN, en-US）
  model?: string; // 模型名称
}

// 声音克隆响应接口
export interface VoiceCloneResponse {
  audioUrl: string; // 生成的音频URL
  taskId?: string; // 任务ID（如果API是异步的）
  status: string; // 状态：success-成功，processing-处理中，failed-失败
  errorMessage?: string; // 错误消息
}

/**
 * 声音克隆
 * @param request 声音克隆请求参数
 * @returns 生成的音频URL
 */
export const cloneVoice = async (request: VoiceCloneRequest): Promise<VoiceCloneResponse> => {
  return await post<VoiceCloneResponse>('/app/voice/clone', request);
};

