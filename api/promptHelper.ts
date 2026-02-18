import { get } from './index';

export interface PromptHelperConfig {
  id?: number;
  siteId?: number;
  subjectEnhancement: string;
  sceneEnhancement: string;
  cameraComposition: string;
  lightQuality: string;
  detailEnhancement: string;
  computeConsumption?: number;
}

// 获取提示词助手配置
export const getPromptHelperConfig = async (): Promise<PromptHelperConfig> => {
  return get<PromptHelperConfig>('/app/prompt-helper/config');
};
