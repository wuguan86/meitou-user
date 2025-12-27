/**
 * 图视分析相关 API
 */
import { post } from './index';

// 图片分析请求接口
export interface ImageAnalysisRequest {
  image: string; // 图片URL或base64
  direction?: string; // 分析方向
  model?: string; // 模型名称
}

// 视频分析请求接口
export interface VideoAnalysisRequest {
  video: string; // 视频URL或base64
  direction?: string; // 分析方向
  model?: string; // 模型名称
}

// 分析响应接口
export interface AnalysisResponse {
  result: string; // 分析结果文本
  status: string; // 状态：success-成功，processing-处理中，failed-失败
  errorMessage?: string; // 错误消息
}

/**
 * 图片分析
 * @param request 图片分析请求参数
 * @returns 分析结果
 */
export const analyzeImage = async (request: ImageAnalysisRequest): Promise<AnalysisResponse> => {
  return await post<AnalysisResponse>('/app/analysis/image', request);
};

/**
 * 视频分析
 * @param request 视频分析请求参数
 * @returns 分析结果
 */
export const analyzeVideo = async (request: VideoAnalysisRequest): Promise<AnalysisResponse> => {
  return await post<AnalysisResponse>('/app/analysis/video', request);
};

