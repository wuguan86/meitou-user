/**
 * 认证相关 API
 */
import { post, get, put, postForm } from './index';

// 发送验证码请求
export interface SendCodeRequest {
  phone: string; // 手机号
}

// 验证码登录请求
export interface CodeLoginRequest {
  phone: string; // 手机号
  code: string; // 验证码
  invitationCode?: string; // 邀请码（可选）
}

export interface PasswordLoginRequest {
  phone: string;
  password: string;
}

export interface SetPasswordRequest {
  password: string;
}

// 登录响应
export interface UserLoginResponse {
  token?: string; // Token
  userId: number; // 用户ID
  username: string; // 用户名
  phone: string; // 手机号
  email?: string; // 邮箱
  balance: number; // 积分余额
  category?: string; // 站点分类：medical-医美类，ecommerce-电商类，life-生活服务类
  isNewUser?: boolean; // 是否是新用户
  createdAt?: string; // 注册时间
  avatarUrl?: string;
  company?: string;
  wechat?: string;
}

// 发送验证码
export const sendCode = async (request: SendCodeRequest): Promise<void> => {
  await post<void>('/app/auth/send-code', request);
};

// 验证码登录
export const loginByCode = async (request: CodeLoginRequest): Promise<UserLoginResponse> => {
  const response = await post<UserLoginResponse>('/app/auth/login-by-code', request);
  // 保存 Token
  if (response.token) {
    localStorage.setItem('app_token', response.token);
    localStorage.setItem('app_user_id', response.userId.toString());
  }
  return response;
};

export const loginByPassword = async (request: PasswordLoginRequest): Promise<UserLoginResponse> => {
  const response = await post<UserLoginResponse>('/app/auth/login-by-password', request);
  if (response.token) {
    localStorage.setItem('app_token', response.token);
    localStorage.setItem('app_user_id', response.userId.toString());
  }
  return response;
};

// 设置密码
export const setPassword = async (request: SetPasswordRequest): Promise<void> => {
  await post<void>('/app/auth/set-password', request);
};

// 获取当前用户信息
export const getCurrentUser = async (): Promise<UserLoginResponse> => {
  return get<UserLoginResponse>('/app/auth/me');
};

export interface UpdateProfileRequest {
  username?: string;
  email: string;
  company?: string;
}

export const updateProfile = async (request: UpdateProfileRequest): Promise<UserLoginResponse> => {
  return put<UserLoginResponse>('/app/user/profile', request);
};

export const uploadAvatar = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  return postForm<string>('/app/user/avatar', formData);
};

export interface ChangePasswordRequest {
  oldPassword?: string;
  newPassword: string;
  code?: string;
}

export const changePassword = async (request: ChangePasswordRequest): Promise<void> => {
  await post<void>('/app/auth/change-password', request);
};

// 登出
export const logout = async (): Promise<void> => {
  localStorage.removeItem('app_token');
  localStorage.removeItem('app_user_id');
};

