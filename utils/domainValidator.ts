/**
 * 域名验证工具
 * 确保只有允许的域名可以访问前端应用
 */

// 允许访问的域名列表
const ALLOWED_DOMAINS = [
  'localhost', // 开发环境
  '127.0.0.1', // 开发环境
  '192.168.1.5', // 内网开发环境
  'toutouyimei.com', // 医美类生产域名
  'b.meitouwang.cn', // 电商类生产域名
  'toutouapp.cn', // 生活服务类生产域名
];

// 域名对应的站点类型映射
const DOMAIN_SITE_CATEGORY_MAP: Record<string, number> = {
  'toutouyimei.com': 1,
  'b.meitouwang.cn': 2,
  'toutouapp.cn': 3,
};

// 允许的端口（开发环境）
const ALLOWED_PORTS = ['3000', '3001', '8085', '80', '443'];


export const getSiteCategoryByDomain = (): number => {
  if (import.meta.env.DEV) {
    return 1;
  }

  const hostname = window.location.hostname;
  for (const [domain, category] of Object.entries(DOMAIN_SITE_CATEGORY_MAP)) {
    if (hostname === domain || hostname.endsWith(`.${domain}`)) {
      return category;
    }
  }

  return 1;
};

/**
 * 验证当前域名是否在允许列表中
 * @returns 是否允许访问
 */
export const validateDomain = (): boolean => {
  // 开发环境：允许所有localhost和127.0.0.1访问
  if (import.meta.env.DEV) {
    return true;
  }
  
  // 生产环境：验证域名
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  // 检查完整主机名（包含端口）
  const fullHost = port ? `${hostname}:${port}` : hostname;
  
  // 检查域名是否在允许列表中
  const isAllowed = ALLOWED_DOMAINS.some(domain => {
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
  
  if (!isAllowed) {
    console.warn(`域名 ${hostname} 不在允许列表中`);
    // 在生产环境，可以显示错误页面或重定向
    // 这里只记录警告，不阻止访问（可以根据需求修改）
  }
  
  return isAllowed;
};

/**
 * 获取当前站点的域名信息
 * @returns 域名信息对象
 */
export const getCurrentDomainInfo = () => {
  const hostname = window.location.hostname;
  
  return {
    hostname,
    protocol: window.location.protocol,
    port: window.location.port,
    origin: window.location.origin,
    isAllowed: validateDomain(),
  };
};

/**
 * 初始化域名验证（应用启动时调用）
 */
export const initDomainValidation = (): void => {
  const isValid = validateDomain();
  
  if (!isValid && !import.meta.env.DEV) {
    // 生产环境：如果域名不在允许列表中，可以显示错误提示
    console.error('当前域名不在允许访问列表中');
    // 可以在这里添加错误处理逻辑，比如显示错误页面
  } else {
    console.log('域名验证通过:', window.location.hostname);
  }
};

