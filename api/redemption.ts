import { post } from './index';

// 兑换邀请码
export const redeemCode = async (code: string): Promise<string> => {
  return post<string>('/app/invitations/redeem', { code });
};