
import React, { useState } from 'react';
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
  MessageSquare
} from 'lucide-react';
import { PageType, User } from '../types';

interface SidebarProps {
  currentPage: PageType;
  onNavigate: (page: PageType) => void;
  user: User;
  onLogout: () => void;
  onOpenProfile: () => void;
  onOpenRecharge: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentPage, onNavigate, user, onLogout, onOpenProfile, onOpenRecharge 
}) => {
  const [toolsOpen, setToolsOpen] = useState(true);
  const [isCsHovered, setIsCsHovered] = useState(false);

  const menuItems = [
    { id: 'home', name: '首页', icon: Home },
    { id: 'assets', name: '资产', icon: FileBox },
    { id: 'manual', name: '使用手册', icon: BookOpen, external: true, url: 'https://ai.feishu.cn/wiki/JFJQwEzhQi26lZk5JMXcoKVYndc?from=from_copylink' },
  ];

  const toolItems = [
    { id: 'image-analysis', name: '图视分析', icon: Eye },
    { id: 'text-to-image', name: '文生图', icon: Type },
    { id: 'image-to-image', name: '图生图', icon: Layers },
    { id: 'text-to-video', name: '文生视频', icon: Video },
    { id: 'image-to-video', name: '图生视频', icon: PlaySquare },
    { id: 'voice-clone', name: '声音克隆', icon: Mic2 },
  ];
  
  const handleNavClick = (item: (typeof menuItems)[0]) => {
    if (item.external && item.url) {
      window.open(item.url, '_blank');
    } else {
      onNavigate(item.id as PageType);
    }
  };

  return (
    <div className="w-[260px] bg-[#0d1121] flex flex-col h-full shrink-0 border-r border-white/5">
      {/* Brand Header */}
      <div className="p-6 flex items-center space-x-2">
        <div className="w-9 h-9 rounded-xl brand-gradient flex items-center justify-center shadow-lg relative overflow-hidden group">
          <span className="text-white text-[11px] font-black italic relative z-10">Meji</span>
          <div className="absolute -bottom-1 -right-1 opacity-40 group-hover:opacity-100 transition-opacity">
            <Heart className="w-4 h-4 text-white fill-current" />
          </div>
        </div>
        <span className="text-xl font-bold text-white tracking-tight">美迹AI</span>
        <span className="text-[10px] text-gray-500 border border-white/10 px-2 rounded-full py-0.5 font-mono ml-auto">v3.1.4</span>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto mt-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item)}
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
                  onClick={() => onNavigate(item.id as PageType)}
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
          className="bg-[#151929] border border-white/5 rounded-2xl p-4 shadow-xl mb-4 cursor-pointer hover:bg-[#1f2333] transition-colors"
          onClick={onOpenProfile}
        >
          <div className="flex items-center space-x-3 mb-4">
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
              className="w-10 h-10 rounded-full border border-white/10" 
              alt="Avatar" 
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-gray-500 font-mono">ID: {user.id}</p>
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
         <div className="relative" onMouseEnter={() => setIsCsHovered(true)} onMouseLeave={() => setIsCsHovered(false)}>
            <button className="w-full flex items-center space-x-3 px-4 py-2 text-gray-500 hover:text-white transition-colors">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-bold">专属客服</span>
            </button>
            {isCsHovered && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-4 bg-[#1f2333] border border-white/10 rounded-2xl shadow-2xl flex flex-col items-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
                <img src="https://placehold.co/128x128/0d1121/ffffff.png?text=QR" alt="QR Code" className="w-32 h-32 rounded-lg" />
                <p className="text-[10px] text-gray-400 font-bold text-center">添加您的专属客服经理</p>
            </div>
            )}
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center space-x-3 px-4 py-2 text-gray-500 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-bold">退出登录</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
