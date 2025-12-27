/**
 * 发布内容相关 API
 */
import { request, post, get, del } from './index';
import { getApiBaseUrl } from './config';

// 发布内容接口
export interface PublishedContent {
  id: number;
  userId: number;
  userName: string;
  userAvatarUrl?: string;
  title: string;
  description?: string;
  type: 'image' | 'video';
  generationType: 'txt2img' | 'img2img' | 'txt2video' | 'img2video';
  contentUrl: string;
  thumbnail?: string;
  generationConfig?: string; // JSON字符串
  status: 'published' | 'hidden';
  isPinned: boolean;
  likeCount: number;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

// 发布内容请求接口
export interface PublishContentRequest {
  title: string;
  description?: string;
  contentUrl: string;
  thumbnail?: string;
  type: 'image' | 'video';
  generationType: 'txt2img' | 'img2img' | 'txt2video' | 'img2video';
  generationConfig?: string; // JSON字符串
}

// 点赞状态响应接口
export interface LikeStatusResponse {
  isLiked: boolean;
  likeCount: number;
}

/**
 * 发布内容
 * @param userId 用户ID
 * @param request 发布请求
 * @returns 发布的内容
 */
export const publishContent = async (
  userId: number,
  request: PublishContentRequest
): Promise<PublishedContent> => {
  const API_BASE_URL = getApiBaseUrl();
  const token = localStorage.getItem('app_token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-User-Id': userId.toString(),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/app/published-contents`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(request),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || '发布失败');
  }

  if (data.code !== undefined) {
    if (data.code === 200) {
      return data.data;
    } else {
      throw new Error(data.message || '发布失败');
    }
  }

  return data;
};

/**
 * 获取发布内容列表
 * @param type 类型筛选（all/image/video）
 * @returns 发布内容列表
 */
export const getPublishedContents = async (
  type: 'all' | 'image' | 'video' = 'all'
): Promise<PublishedContent[]> => {
  const API_BASE_URL = getApiBaseUrl();
  const token = localStorage.getItem('app_token');
  
  const params = new URLSearchParams();
  params.append('type', type);

  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/app/published-contents?${params.toString()}`, {
    method: 'GET',
    headers: headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || '获取发布内容列表失败');
  }

  if (data.code !== undefined) {
    if (data.code === 200) {
      return data.data;
    } else {
      throw new Error(data.message || '获取发布内容列表失败');
    }
  }

  return data;
};

/**
 * 获取发布内容详情
 * @param id 发布内容ID
 * @returns 发布内容详情
 */
export const getPublishedContentDetail = async (id: number): Promise<PublishedContent> => {
  const API_BASE_URL = getApiBaseUrl();
  const token = localStorage.getItem('app_token');
  
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/app/published-contents/${id}`, {
    method: 'GET',
    headers: headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || '获取发布内容详情失败');
  }

  if (data.code !== undefined) {
    if (data.code === 200) {
      return data.data;
    } else {
      throw new Error(data.message || '获取发布内容详情失败');
    }
  }

  return data;
};

/**
 * 点赞/取消点赞
 * @param userId 用户ID
 * @param contentId 发布内容ID
 * @returns 点赞状态响应
 */
export const toggleLike = async (
  userId: number,
  contentId: number
): Promise<LikeStatusResponse> => {
  const API_BASE_URL = getApiBaseUrl();
  const token = localStorage.getItem('app_token');
  
  const headers: HeadersInit = {
    'X-User-Id': userId.toString(),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/app/published-contents/${contentId}/like`, {
    method: 'POST',
    headers: headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || '点赞操作失败');
  }

  if (data.code !== undefined) {
    if (data.code === 200) {
      return data.data;
    } else {
      throw new Error(data.message || '点赞操作失败');
    }
  }

  return data;
};

/**
 * 获取点赞状态
 * @param userId 用户ID（可选，未登录时传null）
 * @param contentId 发布内容ID
 * @returns 点赞状态响应
 */
export const getLikeStatus = async (
  userId: number | null,
  contentId: number
): Promise<LikeStatusResponse> => {
  const API_BASE_URL = getApiBaseUrl();
  const token = localStorage.getItem('app_token');
  
  const headers: HeadersInit = {};
  if (userId) {
    headers['X-User-Id'] = userId.toString();
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/app/published-contents/${contentId}/like-status`, {
    method: 'GET',
    headers: headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || '获取点赞状态失败');
  }

  if (data.code !== undefined) {
    if (data.code === 200) {
      return data.data;
    } else {
      throw new Error(data.message || '获取点赞状态失败');
    }
  }

  return data;
};

/**
 * 删除发布内容
 * @param userId 用户ID
 * @param contentId 发布内容ID
 */
export const deletePublishedContent = async (
  userId: number,
  contentId: number
): Promise<void> => {
  const API_BASE_URL = getApiBaseUrl();
  const token = localStorage.getItem('app_token');
  
  const headers: HeadersInit = {
    'X-User-Id': userId.toString(),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/app/published-contents/${contentId}`, {
    method: 'DELETE',
    headers: headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || '删除发布内容失败');
  }

  if (data.code !== undefined && data.code !== 200) {
    throw new Error(data.message || '删除发布内容失败');
  }
};
