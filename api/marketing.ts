/**
 * 营销广告相关 API
 */
import { get } from './index';

// 广告接口
export interface MarketingAd {
  id: string | number; // 广告ID（后端返回的是Long，前端转换为string或number）
  title: string; // 广告标题
  imageUrl: string; // 广告图片URL
  startDate: string; // 开始时间
  endDate: string; // 结束时间
  linkType: 'external' | 'internal_rich'; // 跳转类型
  linkUrl?: string; // 跳转链接
  richContent?: string; // 富文本内容
  summary?: string; // 摘要描述
  tags?: string[] | string; // 关联标签（可能是JSON字符串或数组）
  isActive: boolean; // 是否激活
  siteCategory: 'medical' | 'ecommerce' | 'life'; // 站点分类
  position: number; // 广告位顺序（数字越小排序越靠前）
  isFullScreen?: boolean; // 是否全屏
}

/**
 * 获取有效的广告列表（用户端）
 * 只返回当前时间在有效期内、已激活、全屏的广告，并按position排序
 * @param siteCategory 站点分类（可选，medical-医美类，ecommerce-电商类，life-生活服务类）
 * @returns 有效的广告列表
 */
export const getActiveAds = async (siteCategory?: string): Promise<MarketingAd[]> => {
  const params = new URLSearchParams();
  if (siteCategory) {
    params.append('siteCategory', siteCategory);
  }
  return await get<MarketingAd[]>(`/app/marketing/ads?${params.toString()}`);
};

