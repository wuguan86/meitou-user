/**
 * 图片生成相关 API
 */
import { post, get, del } from './index';
import { getApiBaseUrl } from './config';

// 文生图请求接口
export interface TextToImageRequest {
  prompt: string; // 提示词
  model?: string; // 模型名称
  aspectRatio?: string; // 宽高比（如：16:9, 9:16, 1:1）
  resolution?: string; // 分辨率（如：1K, 2K, 4K）
  quantity?: number; // 生成数量（1-4）
  webHook?: string; // 回调地址
  shutProgress?: boolean; // 是否关闭进度回复
}

// 图生图请求接口
export interface ImageToImageRequest {
  prompt: string; // 提示词
  urls: string[]; // 参考图片URL列表
  model?: string; // 模型名称
  aspectRatio?: string; // 宽高比
  resolution?: string; // 分辨率
  quantity?: number; // 生成数量
  webHook?: string; // 回调地址
  shutProgress?: boolean; // 是否关闭进度回复
}

// 图片生成响应接口
export interface ImageGenerationResponse {
  imageUrls: string[]; // 生成的图片URL列表
  taskId?: string; // 任务ID（如果API是异步的）
  status: string; // 状态：success-成功，processing-处理中，failed-失败
  errorMessage?: string; // 错误消息
  progress?: number; // 进度（0-100）
}

/**
 * 查询任务状态
 * @param taskId 任务ID
 * @returns 任务状态响应
 */
export const getTaskStatus = async <T = ImageGenerationResponse>(taskId: string): Promise<T> => {
  return await get<T>(`/app/generation/task/${taskId}`);
};

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
  resolutions?: string[]; // 支持的分辨率列表
  ratios?: string[]; // 支持的宽高比列表
  durations?: number[]; // 支持的时长列表
  quantities?: number[]; // 支持的数量列表
  defaultCost?: number; // 默认消耗积分
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
  webHook?: string; // 回调地址
  shutProgress?: boolean; // 是否关闭进度回复
}

// 图生视频请求接口
export interface ImageToVideoRequest {
  prompt: string; // 提示词
  image: string; // 参考图片URL或base64
  model?: string; // 模型名称
  aspectRatio?: string; // 宽高比
  duration?: number; // 视频时长（秒）
  resolution?: string; // 分辨率
  quantity?: number; // 生成数量
  
  // 新增字段
  firstFrameUrl?: string; // 首帧图片URL
  lastFrameUrl?: string; // 尾帧图片URL
  urls?: string[]; // 参考图片URL列表
  webHook?: string; // 回调地址
  shutProgress?: boolean; // 关闭进度回复
}

// 视频生成响应接口
export interface VideoGenerationResponse {
  videoUrl: string; // 生成的视频URL
  taskId?: string; // 任务ID（如果API是异步的）
  status: string; // 状态：success-成功，processing-处理中，failed-失败
  errorMessage?: string; // 错误消息
  progress?: number; // 进度（0-100）
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

// 生成记录接口
export interface GenerationRecord {
  id: number;
  userId: number;
  username: string;
  type: string; // txt2img, img2img, txt2video, img2video
  model: string;
  prompt: string;
  status: string;
  contentUrl: string;
  thumbnailUrl?: string;
  fileType: string; // image, video
  generationParams: string; // JSON string
  cost: number;
  createdAt: string;
  isPublish?: string; // 0-未发布，1-已发布
}

export interface Page<T> {
    records: T[];
    total: number;
    size: number;
    current: number;
    pages: number;
}

/**
 * 获取用户生成记录
 * @param page 页码
 * @param size 每页数量
 * @param type 类型筛选 (image, video)
 * @returns 记录分页
 */
export const getGenerationRecords = async (page: number, size: number, type?: string): Promise<Page<GenerationRecord>> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('size', size.toString());
    if (type) {
        params.append('type', type);
    }
    return await get<Page<GenerationRecord>>(`/app/generation/records?${params.toString()}`);
};

/**
 * 删除生成记录
 * @param id 记录ID
 */
export const deleteGenerationRecord = async (id: number): Promise<void> => {
    return await del<void>(`/app/generation/${id}`);
};

/**
 * 发布生成记录
 * @param id 记录ID
 */
export const publishGenerationRecord = async (id: number): Promise<void> => {
    return await post<void>(`/app/generation/${id}/publish`);
};

/**
 * 提示词优化 (流式)
 * @param prompt 原始提示词
 * @param onData 接收数据回调
 * @param onError 错误回调
 * @param onComplete 完成回调
 */
export const optimizePrompt = async (
  prompt: string,
  onData: (text: string) => void,
  onError: (err: any) => void,
  onComplete: () => void
) => {
  try {
    const token = localStorage.getItem('app_token');
    
    if (!token) {
        throw new Error('请先登录');
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const baseUrl = getApiBaseUrl();
    
    const response = await fetch(`${baseUrl}/app/generation/prompt-optimize`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        stream: true,
        messages: [
          { 
            role: 'system', 
            content: '你是一位精通AI绘画的提示词工程师。请将用户的提示词优化为一段高质量的中文提示词，加入更多关于光影、风格、构图和氛围的细节描述。\n\n重要规则：\n1. 直接返回优化后的纯文本内容。\n2. 严禁输出JSON格式。\n3. 严禁包含Markdown代码块。\n4. 不要包含任何解释性文字。' 
          },
          { 
            role: 'user', 
            content: prompt 
          }
        ]
      })
    });

    if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
    }
    
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) {
        onComplete();
        return;
    }

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      const lines = buffer.split('\n');
      // Keep the last line in the buffer as it might be incomplete
      buffer = lines.pop() || '';
      
      for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (trimmedLine.startsWith('data:')) {
              const data = trimmedLine.slice(5).trim();
              if (!data || data === '[DONE]') continue;
              try {
                  const json = JSON.parse(data);
                  const content = json.choices?.[0]?.delta?.content || '';
                  if (content) onData(content);
              } catch (e) {
                  console.error('Error parsing SSE data', e);
              }
          }
      }
    }
    onComplete();
  } catch (err) {
    onError(err);
  }
};