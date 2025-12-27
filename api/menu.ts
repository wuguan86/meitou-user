/**
 * 菜单相关 API
 */
import { get } from './index';

// 菜单配置接口
export interface MenuConfig {
  id: string | number; // 菜单ID
  label: string; // 菜单标签
  code: string; // 菜单代码
  isVisible: boolean; // 是否可见
  siteCategory?: string; // 站点分类
}

/**
 * 获取有效的菜单列表（用户端）
 * 只返回可见的菜单项
 * @param siteCategory 站点分类（medical-医美类，ecommerce-电商类，life-生活服务类）
 * @returns 可见的菜单列表
 */
export const getVisibleMenus = async (siteCategory: string): Promise<MenuConfig[]> => {
  return await get<MenuConfig[]>(`/app/menus?siteCategory=${siteCategory}`);
};

