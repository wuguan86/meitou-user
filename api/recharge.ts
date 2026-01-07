/**
 * 充值相关 API 接口
 */

import { get, post } from './index';

// 充值配置响应
export interface RechargeConfigResponse {
  exchangeRate: number; // 兑换比例（1元 = X算力）
  minAmount: number; // 最低充值金额（元）
  options: RechargeOption[]; // 充值选项列表
  allowCustom: boolean; // 是否启用自定义金额
  enabledPaymentMethods?: string[]; // 启用的支付方式列表
  bankInfo?: BankInfo; // 对公转账信息
}

// 银行信息接口
export interface BankInfo {
  bankName: string; // 开户银行
  accountName: string; // 账户名称
  bankAccount: string; // 银行账号
}

// 充值选项
export interface RechargeOption {
  points: number; // 算力点数
  price: number; // 价格（元）
}

// 创建订单请求
export interface RechargeOrderRequest {
  amount: number; // 充值金额（元）
  paymentType: 'wechat' | 'alipay' | 'bank_transfer'; // 支付方式
}

// 创建订单响应
export interface RechargeOrderResponse {
  orderNo: string; // 订单号
  amount: number; // 充值金额（元）
  points: number; // 充值算力（积分）
  paymentType: string; // 支付方式
  status: string; // 订单状态
  paymentParams: string; // 支付参数（JSON字符串）
  createdAt: string; // 创建时间
}

// 订单查询响应
export interface OrderQueryResponse {
  orderNo: string; // 订单号
  amount: number; // 充值金额（元）
  points: number; // 充值算力（积分）
  paymentType: string; // 支付方式
  status: string; // 订单状态
  createdAt: string; // 创建时间
  paidAt?: string; // 支付时间
  completedAt?: string; // 完成时间
}

// 订单列表响应
export interface OrderListResponse {
  records: OrderQueryResponse[];
  total: number;
  current: number;
  size: number;
}

/**
 * 获取充值配置
 */
export const getRechargeConfig = async (siteCategory?: string): Promise<RechargeConfigResponse> => {
  const url = siteCategory ? `/app/recharge/config?siteCategory=${siteCategory}` : '/app/recharge/config';
  return get<RechargeConfigResponse>(url);
};

/**
 * 创建充值订单
 */
export const createRechargeOrder = async (request: RechargeOrderRequest): Promise<RechargeOrderResponse> => {
  return post<RechargeOrderResponse>('/app/recharge/create', request);
};

/**
 * 查询订单详情
 */
export const queryOrder = async (orderNo: string): Promise<OrderQueryResponse> => {
  return get<OrderQueryResponse>(`/app/recharge/order/${orderNo}`);
};

/**
 * 获取用户订单列表
 */
export const getUserOrders = async (page: number = 1, size: number = 10): Promise<OrderListResponse> => {
  return get<OrderListResponse>(`/app/recharge/orders?page=${page}&size=${size}`);
};

/**
 * 取消订单
 */
export const cancelOrder = async (orderNo: string): Promise<void> => {
  return post<void>(`/app/recharge/cancel/${orderNo}`, {});
};

