/**
 * 用户资产相关 API
 */
import { request, get } from './index';
import { getApiBaseUrl } from './config';

// 资产类型
export type AssetType = 'image' | 'video' | 'audio';

// 资产接口
export interface UserAsset {
  id: number;
  title: string;
  type: AssetType;
  category: string;
  folder?: string;
  url: string;
  thumbnail?: string;
  userId: number;
  userName: string;
  status: string;
  isPinned: boolean;
  likeCount: number;
  uploadDate: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 上传资产
 * @param file 文件对象
 * @param title 标题（可选）
 * @param type 类型（可选，会自动判断）
 * @param category 分类（可选，默认life）
 * @param folder 文件夹路径（可选）
 * @param userId 用户ID
 * @returns 上传后的资产信息
 */
export const uploadAsset = async (
  file: File,
  userId: number,
  title?: string,
  type?: AssetType,
  category: string = 'life',
  folder?: string
): Promise<UserAsset> => {
  const formData = new FormData();
  formData.append('file', file);
  
  if (title) {
    formData.append('title', title);
  }
  if (type) {
    formData.append('type', type);
  }
  if (category) {
    formData.append('category', category);
  }
  if (folder) {
    formData.append('folder', folder);
  }

  const API_BASE_URL = getApiBaseUrl();
  const token = localStorage.getItem('app_token');
  
  const headers: HeadersInit = {
    'X-User-Id': userId.toString(),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/app/assets/upload`, {
    method: 'POST',
    headers: headers,
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || '上传失败');
  }

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
 * 获取用户资产列表
 * @param userId 用户ID
 * @param folder 文件夹路径（可选）
 * @param type 类型筛选（可选：image、video、audio、all）
 * @returns 资产列表
 */
export const getAssets = async (
  userId: number,
  folder?: string,
  type: 'image' | 'video' | 'audio' | 'all' = 'all'
): Promise<UserAsset[]> => {
  const params = new URLSearchParams();
  params.append('type', type);
  if (folder) {
    params.append('folder', folder);
  }

  const API_BASE_URL = getApiBaseUrl();
  const token = localStorage.getItem('app_token');
  
  const headers: HeadersInit = {
    'X-User-Id': userId.toString(),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/app/assets?${params.toString()}`, {
    method: 'GET',
    headers: headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || '获取资产列表失败');
  }

  if (data.code !== undefined) {
    if (data.code === 200) {
      return data.data;
    } else {
      throw new Error(data.message || '获取资产列表失败');
    }
  }

  return data;
};

/**
 * 文件夹接口
 */
export interface AssetFolder {
  id: number;
  name: string;
  folderPath: string;
  parentPath?: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 获取用户的文件夹列表（新API，返回完整的文件夹对象）
 * @param userId 用户ID
 * @param parentPath 父文件夹路径（可选）
 * @param all 是否获取所有文件夹（用于下拉选择，可选）
 * @returns 文件夹列表
 */
export const getFolders = async (userId: number, parentPath?: string, all?: boolean): Promise<AssetFolder[]> => {
  const params = new URLSearchParams();
  if (parentPath) {
    params.append('parentPath', parentPath);
  }
  if (all) {
    params.append('all', 'true');
  }

  const API_BASE_URL = getApiBaseUrl();
  const token = localStorage.getItem('app_token');
  
  const headers: HeadersInit = {
    'X-User-Id': userId.toString(),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/app/folders?${params.toString()}`, {
    method: 'GET',
    headers: headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || '获取文件夹列表失败');
  }

  if (data.code !== undefined) {
    if (data.code === 200) {
      return data.data || [];
    } else {
      throw new Error(data.message || '获取文件夹列表失败');
    }
  }

  return data || [];
};

/**
 * 创建文件夹
 * @param userId 用户ID
 * @param name 文件夹名称
 * @param parentPath 父文件夹路径（可选）
 * @returns 创建的文件夹
 */
export const createFolder = async (
  userId: number,
  name: string,
  parentPath?: string
): Promise<AssetFolder> => {
  const API_BASE_URL = getApiBaseUrl();
  const token = localStorage.getItem('app_token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-User-Id': userId.toString(),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const body: any = { name };
  if (parentPath) {
    body.parentPath = parentPath;
  }

  const response = await fetch(`${API_BASE_URL}/app/folders`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || '创建文件夹失败');
  }

  if (data.code !== undefined) {
    if (data.code === 200) {
      return data.data;
    } else {
      throw new Error(data.message || '创建文件夹失败');
    }
  }

  return data;
};

/**
 * 更新文件夹名称
 * @param userId 用户ID
 * @param folderId 文件夹ID
 * @param name 新名称
 * @returns 更新后的文件夹
 */
export const updateFolder = async (
  userId: number,
  folderId: number,
  name: string
): Promise<AssetFolder> => {
  const API_BASE_URL = getApiBaseUrl();
  const token = localStorage.getItem('app_token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-User-Id': userId.toString(),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/app/folders/${folderId}`, {
    method: 'PUT',
    headers: headers,
    body: JSON.stringify({ name }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || '更新文件夹失败');
  }

  if (data.code !== undefined) {
    if (data.code === 200) {
      return data.data;
    } else {
      throw new Error(data.message || '更新文件夹失败');
    }
  }

  return data;
};

/**
 * 删除文件夹
 * @param userId 用户ID
 * @param folderId 文件夹ID
 */
export const deleteFolder = async (userId: number, folderId: number): Promise<void> => {
  const API_BASE_URL = getApiBaseUrl();
  const token = localStorage.getItem('app_token');
  
  const headers: HeadersInit = {
    'X-User-Id': userId.toString(),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/app/folders/${folderId}`, {
    method: 'DELETE',
    headers: headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || '删除文件夹失败');
  }

  if (data.code !== undefined && data.code !== 200) {
    throw new Error(data.message || '删除文件夹失败');
  }
};

/**
 * 获取用户的文件夹路径列表（旧API，兼容性保留）
 * @param userId 用户ID
 * @returns 文件夹路径列表
 * @deprecated 请使用 getFolders() 方法
 */
export const getFolderPaths = async (userId: number): Promise<string[]> => {
  const API_BASE_URL = getApiBaseUrl();
  const token = localStorage.getItem('app_token');
  
  const headers: HeadersInit = {
    'X-User-Id': userId.toString(),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/app/assets/folders`, {
    method: 'GET',
    headers: headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || '获取文件夹列表失败');
  }

  if (data.code !== undefined) {
    if (data.code === 200) {
      return data.data || [];
    } else {
      throw new Error(data.message || '获取文件夹列表失败');
    }
  }

  return data || [];
};

/**
 * 更新资产信息（重命名、移动文件夹等）
 * @param userId 用户ID
 * @param assetId 资产ID
 * @param title 新标题（可选）
 * @param folder 新文件夹路径（可选）
 * @returns 更新后的资产
 */
export const updateAsset = async (
  userId: number,
  assetId: number,
  title?: string,
  folder?: string
): Promise<UserAsset> => {
  const API_BASE_URL = getApiBaseUrl();
  const token = localStorage.getItem('app_token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-User-Id': userId.toString(),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const body: any = {};
  if (title !== undefined) {
    body.title = title;
  }
  if (folder !== undefined) {
    body.folder = folder;
  }

  const response = await fetch(`${API_BASE_URL}/app/assets/${assetId}`, {
    method: 'PUT',
    headers: headers,
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || '更新资产失败');
  }

  if (data.code !== undefined) {
    if (data.code === 200) {
      return data.data;
    } else {
      throw new Error(data.message || '更新资产失败');
    }
  }

  return data;
};

/**
 * 删除资产
 * @param userId 用户ID
 * @param assetId 资产ID
 */
export const deleteAsset = async (userId: number, assetId: number): Promise<void> => {
  const API_BASE_URL = getApiBaseUrl();
  const token = localStorage.getItem('app_token');
  
  const headers: HeadersInit = {
    'X-User-Id': userId.toString(),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/app/assets/${assetId}`, {
    method: 'DELETE',
    headers: headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || '删除资产失败');
  }

  if (data.code !== undefined && data.code !== 200) {
    throw new Error(data.message || '删除资产失败');
  }
};

/**
 * 批量删除资产
 * @param userId 用户ID
 * @param assetIds 资产ID列表
 */
export const deleteAssets = async (userId: number, assetIds: number[]): Promise<void> => {
  const API_BASE_URL = getApiBaseUrl();
  const token = localStorage.getItem('app_token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-User-Id': userId.toString(),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/app/assets/batch`, {
    method: 'DELETE',
    headers: headers,
    body: JSON.stringify({ assetIds }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || '批量删除资产失败');
  }

  if (data.code !== undefined && data.code !== 200) {
    throw new Error(data.message || '批量删除资产失败');
  }
};
