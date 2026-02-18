import { request } from './index';

export interface PopupConfig {
  id: number;
  siteId: number;
  name: string;
  imageUrl: string;
  startDate?: string;
  endDate?: string;
  isEnabled: boolean;
  jumpType: 'external' | 'rich_text';
  jumpLink?: string;
  richTextContent?: string;
}

export const getActivePopups = () => {
  return request<PopupConfig[]>('/app/popup/active', {
    method: 'GET',
  });
};
