import { request } from './index';

export interface StorageApi {
  getFileUrl(key: string): Promise<string>;
}

export const storageApi: StorageApi = {
  getFileUrl: async (key: string) => {
    const response = await request<{ code: number; msg: string; data: string }>(
      `/app/storage/url?key=${encodeURIComponent(key)}`,
      {
        method: 'GET',
      }
    );
    return response.data;
  },
};
