
export type PageType = 'home' | 'assets' | 'image-analysis' | 'text-to-image' | 'text-to-video' | 'image-to-image' | 'image-to-video' | 'voice-clone';

export interface AssetNode {
  id: string;
  name: string;
  type: 'folder' | 'image' | 'audio' | 'video';
  children?: AssetNode[];
  url?: string;
  createdAt: number;
  prompt?: string;
  originalImageUrl?: string;
}

export interface User {
  id: string;
  name: string;
  points: number;
  isLoggedIn: boolean;
  phone?: string;
  email?: string;
  company?: string;
  password?: string;
}

export interface Inspiration {
  id: number;
  title: string;
  user: string;
  avatar: string;
  likes: number;
  img: string;
  height: string;
  desc?: string;
  prompt?: string;
  originalImageUrl?: string;
}