/**
 * API 基础配置
 * 提供统一的 HTTP 请求封装
 */

import { getApiBaseUrl } from './config';
import { Modal, message } from 'antd';

const API_BASE_URL = getApiBaseUrl();

export class ApiError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

export const promptRechargeForInsufficientBalance = () => {
  Modal.warning({
    title: '算力不足',
    content: '算力不足，请先充值后再试。',
    okText: '知道了',
  });
};

// 请求拦截器：添加 Token
const getHeaders = (isFormData?: boolean): HeadersInit => {
  const headers: HeadersInit = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  
  // 从 localStorage 获取 Token
  const token = localStorage.getItem('app_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// 统一请求处理
export const request = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        ...getHeaders(isFormData),
        ...options.headers,
      },
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      message.error('请求超时，请稍后重试');
      throw new Error('请求被取消或超时，请稍后重试');
    }
    if (error instanceof TypeError) {
      message.error('网络连接失败，请检查网络');
      throw new Error('无法连接到服务器，请检查后端服务是否运行');
    }
    throw error;
  }

  // 检查响应状态
  if (!response.ok) {
    if (response.status === 401) {
      const token = localStorage.getItem('app_token');
      if (token) {
        localStorage.removeItem('app_token');
        localStorage.removeItem('app_user_id');
      }

      const isAuthProbe = url.startsWith('/app/auth/me');
      const msg = token ? '登录已过期，请重新登录' : '请先登录';
      if (!isAuthProbe) {
        message.warning(msg);
      }
      throw new ApiError(msg, 401);
    }

    // 500 系统错误
    if (response.status >= 500) {
      message.error('系统繁忙，请稍后再试');
      throw new Error(`系统错误: ${response.status}`);
    }

    // 尝试解析错误响应
    let errorMessage = '请求失败';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
      
      // 友好提示：如果错误信息包含敏感技术词汇或过长，替换为通用提示
      if (errorMessage.length > 50 && (
          errorMessage.includes('Exception') || 
          errorMessage.includes('com.') || 
          errorMessage.includes('java.') ||
          errorMessage.includes('RSA') ||
          errorMessage.includes('sign')
      )) {
          console.warn('Masking technical error:', errorMessage);
          errorMessage = '系统暂时繁忙，请稍后重试';
      }
    } catch (e) {
      // 如果响应不是 JSON，使用状态文本
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    
    message.error(errorMessage);
    throw new Error(errorMessage);
  }

  // 解析成功响应
  const data = await response.json();

  // 如果响应格式是 Result<T>
  if (data.code !== undefined) {
    if (data.code === 200) {
      return data.data;
    } else {
      // 业务错误
      // 对于特定的业务错误码，不显示全局提示（由页面自行处理）
      // 1001: 密码错误
      // 1002: 账号不存在
      // 1004: 验证码错误
      // 1005: 邀请码无效
      const silentCodes = [1001, 1002, 1004, 1005];
      if (data.code === 4009) {
        promptRechargeForInsufficientBalance();
      } else if (!silentCodes.includes(data.code) && url !== '/app/character/save') {
        message.error(data.message || '请求失败');
      }
      throw new ApiError(data.message || '请求失败', data.code);
    }
  }

  return data;
};

// GET 请求
export const get = <T>(url: string, options?: RequestInit): Promise<T> => {
  return request<T>(url, { method: 'GET', ...options });
};

// POST 请求
export const post = <T>(url: string, body?: any, options?: RequestInit): Promise<T> => {
  return request<T>(url, {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  });
};

export const postForm = <T>(url: string, body: FormData, options?: RequestInit): Promise<T> => {
  return request<T>(url, {
    method: 'POST',
    body,
    ...options,
  });
};

// PUT 请求
export const put = <T>(url: string, body?: any, options?: RequestInit): Promise<T> => {
  return request<T>(url, {
    method: 'PUT',
    body: JSON.stringify(body),
    ...options,
  });
};

// DELETE 请求
export const del = <T>(url: string, options?: RequestInit): Promise<T> => {
  return request<T>(url, { method: 'DELETE', ...options });
};

export default { get, post, postForm, put, delete: del };
