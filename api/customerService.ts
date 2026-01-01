import { get } from './index';

export interface CustomerServiceConfig {
  id?: number;
  siteId: number;
  qrCodeUrl: string;
  contactText: string;
}

// 获取客服配置
// siteId 目前默认为 1 (医美)，后续可以根据实际情况传入
export const getConfig = async (siteId: number = 1): Promise<CustomerServiceConfig> => {
  const params = new URLSearchParams();
  params.append('siteId', siteId.toString());
  return get<CustomerServiceConfig>(`/app/customer-service/config?${params.toString()}`);
};
