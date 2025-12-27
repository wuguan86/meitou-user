/**
 * API 配置工具
 * 统一管理API基础URL，支持多域名访问
 */

// 允许访问的三个业务域名
const ALLOWED_DOMAINS = [
  'medical.example.com', // 医美类
  'ecommerce.example.com', // 电商类
  'life.example.com', // 生活服务类
];

/**
 * 获取API基础URL
 * 开发环境：使用相对路径，通过Vite代理转发
 * 生产环境：根据当前域名动态设置后端API地址
 */
export const getApiBaseUrl = (): string => {
  // 开发环境：使用相对路径，通过Vite代理转发
  if (import.meta.env.DEV) {
    return '/api';
  }
  
  // 生产环境：根据当前域名确定后端API地址
  const hostname = window.location.hostname;
  
  // 验证域名是否在允许列表中
  const isAllowedDomain = ALLOWED_DOMAINS.some(domain => {
    // 精确匹配
    if (hostname === domain) {
      return true;
    }
    // 支持子域名（如：www.medical.example.com）
    if (hostname.endsWith(`.${domain}`)) {
      return true;
    }
    return false;
  });
  
  // 如果域名不在允许列表中，记录警告
  if (!isAllowedDomain) {
    console.warn(`当前域名 ${hostname} 不在允许列表中，使用默认API配置`);
  }
  
  // 三个业务域名都使用相对路径（通过Nginx反向代理）
  // 如果前端和后端在同一域名下，使用相对路径可以避免跨域问题
  // 如果前端和后端在不同域名，需要配置具体的后端API地址
  const domainToApiMap: Record<string, string> = {
    'medical.example.com': '/api', // 医美类 - 使用相对路径（通过Nginx代理）
    'ecommerce.example.com': '/api', // 电商类 - 使用相对路径（通过Nginx代理）
    'life.example.com': '/api', // 生活服务类 - 使用相对路径（通过Nginx代理）
  };
  
  // 如果当前域名在映射表中，使用对应的API地址
  if (domainToApiMap[hostname]) {
    return domainToApiMap[hostname];
  }
  
  // 默认使用相对路径（如果前端和后端在同一域名下，通过Nginx反向代理）
  return '/api';
};

/**
 * 获取当前域名信息
 */
export const getCurrentDomain = (): string => {
  return window.location.hostname;
};

/**
 * 检查当前域名是否为允许的域名
 */
export const isAllowedDomain = (): boolean => {
  const hostname = window.location.hostname;
  
  // 开发环境：允许所有localhost访问
  if (import.meta.env.DEV) {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('192.168.');
  }
  
  // 生产环境：检查是否在允许列表中
  return ALLOWED_DOMAINS.some(domain => {
    if (hostname === domain) {
      return true;
    }
    if (hostname.endsWith(`.${domain}`)) {
      return true;
    }
    return false;
  });
};

