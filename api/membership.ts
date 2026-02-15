import { get, post } from './index';
import { RechargeOrderResponse } from './recharge';

export interface MembershipStatusResponse {
  oldUser: boolean;
  activePackageId?: number;
  activeLevelCode?: string;
  activeBillingCycle?: string;
  activeEndAt?: string;
  canSwitchType: boolean;
}

export interface MembershipOrderCreateRequest {
  packageId: number;
  billingCycle: 'monthly' | 'yearly';
  paymentType: 'wechat' | 'alipay';
}

export const getMembershipStatus = async (): Promise<MembershipStatusResponse> => {
  return get<MembershipStatusResponse>('/app/membership/status');
};

export const createMembershipOrder = async (
  request: MembershipOrderCreateRequest
): Promise<RechargeOrderResponse> => {
  return post<RechargeOrderResponse>('/app/membership/order/create', request);
};

