
export type PageType = 'home' | 'assets' | 'image-analysis' | 'text-to-image' | 'text-to-video' | 'image-to-image' | 'image-to-video' | 'voice-clone' | 'profile';

export interface AssetNode {
  id: string;
  name: string;
  type: 'folder' | 'image' | 'audio' | 'video';
  children?: AssetNode[];
  url?: string;
  thumbnail?: string;
  generationRecordId?: number;
  createdAt: number;
  prompt?: string;
  originalImageUrl?: string;
  // 生成参数（JSON字符串）
  generationParams?: string;
  // 生成配置参数（用于发布）
  generationType?: 'txt2img' | 'img2img' | 'txt2video' | 'img2video';
  generationConfig?: ImageGenerationConfig | VideoGenerationConfig;
  isPublish?: boolean;
  status?: string;
}

export interface User {
  id: string;
  name: string;
  points: number;
  isLoggedIn: boolean;
  phone?: string;
  email?: string;
  company?: string;
  wechat?: string;
  password?: string;
  category?: string; // 站点分类：medical-医美类，ecommerce-电商类，life-生活服务类
  createdAt?: string;
  avatarUrl?: string;
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
  // 新增字段
  type?: 'image' | 'video';
  generationType?: 'txt2img' | 'img2img' | 'txt2video' | 'img2video';
  generationConfig?: ImageGenerationConfig | VideoGenerationConfig;
  publishedAt?: string;
  userId?: number;
  // 用于显示动态高度
  contentUrl?: string; // 内容URL（与img字段一致）
  isLiked?: boolean; // 当前用户是否已点赞
  aspectRatio?: number; // 宽高比 (width / height)
}

// 图片生成配置接口
export interface ImageGenerationConfig {
  prompt: string; // 提示词
  model: string; // 模型ID
  resolution?: string; // 分辨率（1K/2K/4K）
  aspectRatio?: string; // 尺寸比例（16:9/9:16等）
  quantity?: number; // 生成数量（图生图特有）
  referenceImages?: string[]; // 参考图片URL列表（图生图特有）
}

// 视频生成配置接口
export interface VideoGenerationConfig {
  prompt: string; // 提示词
  model: string; // 模型ID
  resolution?: string; // 分辨率（270P/720P/1080P）
  aspectRatio?: string; // 尺寸比例（16:9/9:16等）
  duration?: number; // 视频时长（秒）
  referenceImage?: string; // 参考图片URL（图生视频特有）
}

export interface Site {
  id: number;
  name: string;
  code: string;
  domain: string;
  category: number;
  manual?: string; // 使用手册链接
  userAgreement?: string; // 用户协议
  privacyPolicy?: string; // 隐私政策
  copyright?: string; // 版权信息(顶部)
  footerCopyright?: string; // 底部版权信息
  logo?: string; // Logo图片地址
  websiteName?: string; // 网站名称
  loginSubtext?: string; // 登录框小文字
  websiteTitle?: string; // 网站Title信息
  favicon?: string; // Favicon图标地址
  status: number;
  deleted: number;
  createTime: string;
  updateTime: string;
}
