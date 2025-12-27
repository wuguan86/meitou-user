/**
 * 图片生成相关 API
 */
import { post, get } from './index';

// 文生图请求接口
export interface TextToImageRequest {
  prompt: string; // 提示词
  model?: string; // 模型名称
  aspectRatio?: string; // 宽高比（如：16:9, 9:16, 1:1）
  resolution?: string; // 分辨率（如：1K, 2K, 4K）
  quantity?: number; // 生成数量（1-4）
}

// 图生图请求接口
export interface ImageToImageRequest {
  prompt: string; // 提示词
  image: string; // 参考图片URL或base64
  model?: string; // 模型名称
  aspectRatio?: string; // 宽高比
  resolution?: string; // 分辨率
  quantity?: number; // 生成数量
  mode?: string; // 模式：single-单图，frames-首尾帧，multi-多图
  image2?: string; // 第二张参考图片
  image3?: string; // 第三张参考图片
}

// 图片生成响应接口
export interface ImageGenerationResponse {
  imageUrls: string[]; // 生成的图片URL列表
  taskId?: string; // 任务ID（如果API是异步的）
  status: string; // 状态：success-成功，processing-处理中，failed-失败
  errorMessage?: string; // 错误消息
}

/**
 * 文生图
 * @param request 文生图请求参数
 * @returns 生成的图片URL列表
 */
export const textToImage = async (request: TextToImageRequest): Promise<ImageGenerationResponse> => {
  return await post<ImageGenerationResponse>('/app/generation/text-to-image', request);
};

/**
 * 图生图
 * @param request 图生图请求参数
 * @returns 生成的图片URL列表
 */
export const imageToImage = async (request: ImageToImageRequest): Promise<ImageGenerationResponse> => {
  return await post<ImageGenerationResponse>('/app/generation/image-to-image', request);
};

// 模型信息接口
export interface ModelInfo {
  id: string; // 模型ID/代码
  name: string; // 模型显示名称
}

// 平台模型响应接口
export interface PlatformModelResponse {
  platformId: number; // 平台ID
  platformName: string; // 平台名称
  models: ModelInfo[]; // 支持的模型列表
}

/**
 * 获取文生图平台的模型列表
 * @returns 平台模型列表
 */
export const getTextToImageModels = async (): Promise<PlatformModelResponse[]> => {
  return await get<PlatformModelResponse[]>('/app/generation/text-to-image/models');
};

/**
 * 获取图生图平台的模型列表
 * @returns 平台模型列表
 */
export const getImageToImageModels = async (): Promise<PlatformModelResponse[]> => {
  return await get<PlatformModelResponse[]>('/app/generation/image-to-image/models');
};

// 文生视频请求接口
export interface TextToVideoRequest {
  prompt: string; // 提示词
  model?: string; // 模型名称
  aspectRatio?: string; // 宽高比
  duration?: number; // 视频时长（秒）
  resolution?: string; // 分辨率
}

// 图生视频请求接口
export interface ImageToVideoRequest {
  prompt: string; // 提示词
  image: string; // 参考图片URL或base64
  model?: string; // 模型名称
  aspectRatio?: string; // 宽高比
  duration?: number; // 视频时长（秒）
  resolution?: string; // 分辨率
}

// 视频生成响应接口
export interface VideoGenerationResponse {
  videoUrl: string; // 生成的视频URL
  taskId?: string; // 任务ID（如果API是异步的）
  status: string; // 状态：success-成功，processing-处理中，failed-失败
  errorMessage?: string; // 错误消息
}

/**
 * 文生视频
 * @param request 文生视频请求参数
 * @returns 生成的视频URL
 */
export const textToVideo = async (request: TextToVideoRequest): Promise<VideoGenerationResponse> => {
  return await post<VideoGenerationResponse>('/app/generation/text-to-video', request);
};

/**
 * 图生视频
 * @param request 图生视频请求参数
 * @returns 生成的视频URL
 */
export const imageToVideo = async (request: ImageToVideoRequest): Promise<VideoGenerationResponse> => {
  return await post<VideoGenerationResponse>('/app/generation/image-to-video', request);
};

/**
 * 获取文生视频平台的模型列表
 * @returns 平台模型列表
 */
export const getTextToVideoModels = async (): Promise<PlatformModelResponse[]> => {
  return await get<PlatformModelResponse[]>('/app/generation/text-to-video/models');
};

/**
 * 获取图生视频平台的模型列表
 * @returns 平台模型列表
 */
export const getImageToVideoModels = async (): Promise<PlatformModelResponse[]> => {
  return await get<PlatformModelResponse[]>('/app/generation/image-to-video/models');
};