
import React, { useState, useEffect } from 'react';
import { 
  Home, 
  FileBox, 
  BookOpen, 
  Type, 
  Video, 
  Layers, 
  PlaySquare, 
  Mic2, 
  LogOut,
  ChevronDown,
  ChevronUp,
  Gem,
  Plus,
  Heart,
  Eye,
  MessageSquare,
  X
} from 'lucide-react';
import { PageType, User } from '../types';
import { getVisibleMenus, MenuConfig } from '../api/menu';
import * as customerServiceAPI from '../api/customerService';
import { getCurrentSite } from '../api/site';
import { SecureImage } from './SecureImage';

interface SidebarProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  user: User;
  onLogout: () => void;
  onOpenProfile: () => void;
  onOpenRecharge: () => void;
  isMobileOpen?: boolean; // 移动端是否打开
  onMobileClose?: () => void; // 移动端关闭回调
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentPage, onNavigate, user, onLogout, onOpenProfile, onOpenRecharge,
  isMobileOpen = false, onMobileClose
}) => {
  const [toolsOpen, setToolsOpen] = useState(true);
  const [isCsHovered, setIsCsHovered] = useState(false);
  const [menuConfigs, setMenuConfigs] = useState<MenuConfig[]>([]);
  const [csConfig, setCsConfig] = useState<customerServiceAPI.CustomerServiceConfig | null>(null);
  const [manualUrl, setManualUrl] = useState('');
  const [copyright, setCopyright] = useState('');
  const [logo, setLogo] = useState('');
  const [websiteName, setWebsiteName] = useState('');

  // 菜单代码到前端ID的映射
  const codeToIdMap: Record<string, PageType> = {
    'vision_analysis': 'image-analysis',
    'txt2img': 'text-to-image',
    'img2img': 'image-to-image',
    'txt2video': 'text-to-video',
    'img2video': 'image-to-video',
    'voice_clone': 'voice-clone',
  };

  // 菜单代码到图标的映射
  const codeToIconMap: Record<string, typeof Eye> = {
    'vision_analysis': Eye,
    'txt2img': Type,
    'img2img': Layers,
    'txt2video': Video,
    'img2video': PlaySquare,
    'voice_clone': Mic2,
  };

  // 从后端获取菜单配置和客服配置
  useEffect(() => {
    const loadData = async () => {
      console.log('Sidebar: 开始加载数据...');
      let currentSiteId = 1; // 默认为1

      try {
        // 加载站点信息
        try {
          const site = await getCurrentSite();
          if (site) {
            if (site.id) {
              currentSiteId = site.id;
            }
            if (site.manual) {
              setManualUrl(site.manual);
            }
            if (site.copyright) {
              setCopyright(site.copyright);
            }
            if (site.logo) {
              setLogo(site.logo);
            }
            if (site.websiteName) {
              setWebsiteName(site.websiteName);
            }
          }
        } catch (err) {
          console.error('Sidebar: 获取站点信息失败:', err);
        }

        // TODO: 根据用户信息获取站点分类，目前使用默认值 'medical' (siteId=1)
        const siteCategory = 'medical';
        const menus = await getVisibleMenus(siteCategory);
        setMenuConfigs(menus);

        // 加载客服配置
        const config = await customerServiceAPI.getConfig(currentSiteId);
        if (config) {
          setCsConfig(config);
        }
      } catch (error) {
        console.error('加载配置失败:', error);
        // 如果加载失败，使用默认菜单
        if (menuConfigs.length === 0) setMenuConfigs([]);
      }
    };
    loadData();
  }, []);

  const menuItems = [
    { id: 'home', name: '首页', icon: Home },
    { id: 'assets', name: '资产', icon: FileBox },
    ...(manualUrl ? [{ id: 'manual', name: '使用手册', icon: BookOpen, external: true, url: manualUrl }] : []),
  ];

  // 将后端菜单配置转换为前端菜单项
  const toolItems = menuConfigs
    .filter(menu => codeToIdMap[menu.code]) // 只包含已知的菜单代码
    .map(menu => ({
      id: codeToIdMap[menu.code] as PageType,
      name: menu.label,
      icon: codeToIconMap[menu.code] || Eye,
    }));
  
  const handleNavClick = (item: (typeof menuItems)[0]) => {
    if (item.external && item.url) {
      let url = item.url;
      // 如果链接没有协议头，自动添加 https://
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      window.open(url, '_blank');
    } else {
      onNavigate(item.id as PageType);
    }
  };

  // 处理导航点击，移动端点击后关闭侧边栏
  const handleNav = (page: PageType) => {
    onNavigate(page);
    if (onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <>
      {/* 移动端遮罩层 */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}
      {/* 侧边栏 */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-[260px] bg-[#0d1121] flex flex-col h-full shrink-0 border-r border-white/5
        transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* 移动端关闭按钮 */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center space-x-2">
            {logo ? (
                <SecureImage src={logo} alt="Logo" className="w-9 h-9 object-contain rounded-xl" />
            ) : (
                <div className="w-9 h-9 rounded-xl brand-gradient flex items-center justify-center shadow-lg relative overflow-hidden group">
                  <span className="text-white text-[11px] font-black italic relative z-10">Meji</span>
                  <div className="absolute -bottom-1 -right-1 opacity-40 group-hover:opacity-100 transition-opacity">
                    <Heart className="w-4 h-4 text-white fill-current" />
                  </div>
                </div>
            )}
            <span className="text-xl font-bold text-white tracking-tight">{websiteName || '美迹AI'}</span>
          </div>
          <button
            onClick={onMobileClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Brand Header - 桌面端显示 */}
        <div className="hidden lg:flex p-6 items-center space-x-2">
        {logo ? (
            <SecureImage src={logo} alt="Logo" className="w-9 h-9 object-contain rounded-xl" />
        ) : (
            <div className="w-9 h-9 rounded-xl brand-gradient flex items-center justify-center shadow-lg relative overflow-hidden group">
              <span className="text-white text-[11px] font-black italic relative z-10">Meji</span>
              <div className="absolute -bottom-1 -right-1 opacity-40 group-hover:opacity-100 transition-opacity">
                <Heart className="w-4 h-4 text-white fill-current" />
              </div>
            </div>
        )}
        <span className="text-xl font-bold text-white tracking-tight">{websiteName || '美迹AI'}</span>
        {copyright && (
          <span className="text-[10px] text-gray-500 border border-white/10 px-2 rounded-full py-0.5 font-mono ml-auto">
            {copyright}
          </span>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto mt-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              handleNavClick(item);
              if (onMobileClose && !item.external) {
                onMobileClose();
              }
            }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              currentPage === item.id 
                ? 'bg-white/5 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <item.icon className={`w-5 h-5 ${currentPage === item.id ? 'text-[#2cc2f5]' : 'text-gray-500'}`} />
            <span className="font-medium text-[15px]">{item.name}</span>
          </button>
        ))}

        <div className="pt-4">
          <button 
            onClick={() => setToolsOpen(!toolsOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-gray-500"
          >
            <div className="flex items-center space-x-3">
              <Plus className="w-4 h-4" />
              <span>AI 工具</span>
            </div>
            {toolsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          
          {toolsOpen && (
            <div className="mt-1 space-y-1">
              {toolItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    handleNav(item.id as PageType);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                    currentPage === item.id 
                      ? 'brand-gradient text-white shadow-lg glow-pink' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${currentPage === item.id ? 'text-white' : 'text-gray-500'}`} />
                  <span className="font-medium text-[15px]">{item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Profile Card */}
      <div className="p-4 bg-[#0d1121]">
        <div 
          className={`bg-[#151929] border border-white/5 rounded-2xl p-4 shadow-xl mb-4 cursor-pointer hover:bg-[#1f2333] transition-colors ${currentPage === 'profile' ? 'ring-1 ring-[#2cc2f5] bg-[#1f2333]' : ''}`}
          onClick={onOpenProfile}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden">
              <SecureImage 
                src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                className="w-full h-full object-cover" 
                alt="Avatar" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user.name}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
               <div className="w-5 h-5 brand-gradient rounded-full flex items-center justify-center"><Gem className="w-3 h-3 text-white"/></div>
              <span className="text-sm font-bold text-white">{user.points.toLocaleString()}</span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onOpenRecharge(); }}
              className="brand-gradient text-[12px] font-bold px-4 py-1.5 rounded-lg flex items-center space-x-1 hover:scale-105 transition-all shadow-lg glow-pink"
            >
              <Plus className="w-3 h-3 text-white" />
              <span className="text-white">充值</span>
            </button>
          </div>
        </div>
        
        {/* 客服部分 - 仅当有配置时显示 */}
        {csConfig?.qrCodeUrl && (
          <div className="relative" onMouseEnter={() => setIsCsHovered(true)} onMouseLeave={() => setIsCsHovered(false)}>
              <button className="w-full flex items-center space-x-3 px-4 py-2 text-gray-500 hover:text-white transition-colors">
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm font-bold">专属客服</span>
              </button>
              {isCsHovered && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-4 bg-[#1f2333] border border-white/10 rounded-2xl shadow-2xl flex flex-col items-center space-y-3 animate-in fade-in zoom-in-95 duration-200 z-50">
                  <SecureImage src={csConfig.qrCodeUrl} alt="QR Code" className="w-32 h-32 rounded-lg object-contain bg-white" />
                  {csConfig.contactText && <p className="text-[10px] text-gray-400 font-bold text-center whitespace-pre-wrap">{csConfig.contactText}</p>}
                  {!csConfig.contactText && <p className="text-[10px] text-gray-400 font-bold text-center">添加您的专属客服经理</p>}
              </div>
              )}
          </div>
        )}

        <button 
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-4 py-2 text-gray-500 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-bold">退出登录</span>
        </button>
      </div>
    </div>
    </>
  );
};

export default Sidebar;
