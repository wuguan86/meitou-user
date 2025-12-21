/**
 * API 基础配置
 * 提供统一的 HTTP 请求封装
 */

const API_BASE_URL = 'http://localhost:8080/api';

// 请求拦截器：添加 Token
const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // 从 localStorage 获取 Token
  const token = localStorage.getItem('app_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// 统一请求处理
const request = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || '请求失败');
  }

  // 如果响应格式是 Result<T>
  if (data.code !== undefined) {
    if (data.code === 200) {
      return data.data;
    } else {
      throw new Error(data.message || '请求失败');
    }
  }

  return data;
};

// GET 请求
export const get = <T>(url: string): Promise<T> => {
  return request<T>(url, { method: 'GET' });
};

// POST 请求
export const post = <T>(url: string, body?: any): Promise<T> => {
  return request<T>(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

// PUT 请求
export const put = <T>(url: string, body?: any): Promise<T> => {
  return request<T>(url, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
};

// DELETE 请求
export const del = <T>(url: string): Promise<T> => {
  return request<T>(url, { method: 'DELETE' });
};

export default { get, post, put, delete: del };

