import { request } from './index';
import { Site } from '../types';

/**
 * 获取当前站点信息
 */
export const getCurrentSite = async (): Promise<Site> => {
  return request<Site>('/app/site/current');
};
