/**
 * 会员套餐相关 API 接口
 */

import { get } from './index';

// 套餐权益
export interface PlanFeature {
  text: string;
  included: boolean;
}

// 会员套餐
export interface MembershipPackage {
  id: number;
  name: string;
  levelCode: string; // free, standard, pro, flagship, enterprise
  sortOrder: number;
  isActive: boolean;
  isRecommended: boolean;
  badgeText?: string;
  monthlyPrice?: number;
  monthlyDiscountPrice?: number;
  yearlyPrice?: number;
  yearlyDiscountPrice?: number;
  pointsReward?: number;
  buttonText: string;
  buttonType: string; // buy, contact
  primaryColor?: string;
  featuresJson: string; // JSON string of PlanFeature[]
  
  // 辅助字段，前端转换后使用
  features?: PlanFeature[];
}

/**
 * 获取会员套餐列表
 */
export const getMembershipPackages = async (): Promise<MembershipPackage[]> => {
  return get<MembershipPackage[]>('/app/membership-packages');
};
