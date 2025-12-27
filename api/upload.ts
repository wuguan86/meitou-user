/**
 * 文件上传相关 API
 */
import { post } from './index';
import { getApiBaseUrl } from './config';

/**
 * 上传图片
 * @param file 图片文件
 * @returns 图片的访问URL
 */
export const uploadImage = async (file: File): Promise<string> => {
  // 创建FormData
  const formData = new FormData();
  formData.append('file', file);
  
  // 调用上传接口
  const API_BASE_URL = getApiBaseUrl();
  const token = localStorage.getItem('app_token');
  
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}/admin/upload/image`, {
    method: 'POST',
    headers: headers,
    body: formData,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || '上传失败');
  }
  
  // 如果响应格式是 Result<T>
  if (data.code !== undefined) {
    if (data.code === 200) {
      return data.data;
    } else {
      throw new Error(data.message || '上传失败');
    }
  }
  
  return data;
};

/**
 * 将base64转换为File对象
 * @param base64 base64字符串（包含data:image/...前缀）
 * @param filename 文件名
 * @returns File对象
 */
export const base64ToFile = (base64: string, filename: string = 'image.png'): File => {
  // 分离base64数据和MIME类型
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
};
