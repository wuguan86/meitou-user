/**
 * 认证相关 API
 */
import { post } from './index';

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

// 登录响应
export interface UserLoginResponse {
  token: string; // Token
  userId: number; // 用户ID
  username: string; // 用户名
  phone: string; // 手机号
  email?: string; // 邮箱
  balance: number; // 积分余额
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

// 登出
export const logout = async (): Promise<void> => {
  localStorage.removeItem('app_token');
  localStorage.removeItem('app_user_id');
};

