import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Menu } from 'lucide-react';
import { getCurrentUser, logout } from './api/auth';
import { getCurrentSite } from './api/site';
import Sidebar from './components/Sidebar';
import Home from './components/Home';
import Assets from './components/Assets';
import Login from './components/Login';
import ImageAnalysis from './components/Tools/ImageAnalysis';
import TextToImage from './components/Tools/TextToImage';
import TextToVideo from './components/Tools/TextToVideo';
import ImageToImage from './components/Tools/ImageToImage';
import ImageToVideo from './components/Tools/ImageToVideo';
import VoiceClone from './components/Tools/VoiceClone';
import Profile from './components/Profile';
// fix: Corrected import path casing to consistently use 'Modals' to resolve compilation errors.
import ProfileModal from './components/Modals/ProfileModal';
import RechargeModal from './components/Modals/RechargeModal';
import InspirationModal from './components/Modals/InspirationModal';
import AssetDetailModal from './components/Modals/AssetDetailModal';
import PublishModal from './components/Modals/PublishModal';
import { PageType, User, Inspiration, AssetNode, Site } from './types';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [siteConfig, setSiteConfig] = useState<Site | null>(null);
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState<Inspiration | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AssetNode | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // 移动端菜单状态
  const [refreshProfileKey, setRefreshProfileKey] = useState(0); // 个人中心刷新key
  const mainRef = useRef<HTMLElement | null>(null);
  const getScrollContainer = useCallback(() => mainRef.current, []);

  const [user, setUser] = useState<User>({
    id: '8829103',
    name: '创作官_8829',
    points: 1250,
    isLoggedIn: false,
    phone: '138****8888',
    email: 'meji_creator@meitou.com',
    company: '美透科技研究院',
    password: '••••••••'
  });

  const fetchUserData = async () => {
    const token = localStorage.getItem('app_token');
    if (token) {
      try {
        const userData = await getCurrentUser();
        setUser(prev => ({
          ...prev,
          id: userData.userId.toString(),
          name: userData.username || '创作官',
          points: userData.balance || 0,
          phone: userData.phone,
          email: userData.email,
          category: userData.category,
          isLoggedIn: true,
          createdAt: userData.createdAt,
          avatarUrl: userData.avatarUrl,
          company: userData.company,
          wechat: userData.wechat,
        }));
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem('app_token');
        localStorage.removeItem('app_user_id');
      }
    }
    setIsLoading(false);
  };

  // Check for existing session on mount
  useEffect(() => {
    const fetchSiteConfig = async () => {
      try {
        const config = await getCurrentSite();
        setSiteConfig(config);
        // Apply title and favicon
        if (config.websiteTitle) document.title = config.websiteTitle;
        if (config.favicon) {
           const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
           if (link) link.href = config.favicon;
           else {
               const newLink = document.createElement('link');
               newLink.rel = 'icon';
               newLink.href = config.favicon;
               document.head.appendChild(newLink);
           }
        }
      } catch (err) {
        console.error('Failed to fetch site config', err);
      }
    };
    fetchSiteConfig();
    
    fetchUserData();
  }, []);

  useEffect(() => {
    const handler = () => setIsRechargeOpen(true);
    window.addEventListener('app:open-recharge', handler);
    return () => window.removeEventListener('app:open-recharge', handler);
  }, []);

  const handleLoginSuccess = (userData: Partial<User>) => {
    setUser(prev => ({ ...prev, ...userData, isLoggedIn: true }));
  };

  const handleLogout = () => {
    logout();
    setUser(prev => ({ ...prev, isLoggedIn: false }));
    setCurrentPage('home');
  };

  const handleUpdateUser = (updatedInfo: Partial<User>) => {
    setUser(prev => ({ ...prev, ...updatedInfo }));
  };

  const handleDeductPoints = (points: number) => {
    setUser(prev => ({ ...prev, points: prev.points - points }));
  };
  
  const openPublishModal = () => {
    if (selectedAsset) {
      setIsPublishing(true);
    }
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-[#0b0d17] text-white">Loading...</div>;
  }

  if (!user.isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} siteConfig={siteConfig} />;
  }

  const renderContent = () => {
    switch (currentPage) {
      case 'home': return <Home onNavigate={setCurrentPage} onSelectWork={setSelectedWork} userId={user.id ? parseInt(user.id) : undefined} siteConfig={siteConfig} />;
      case 'assets': return <Assets onSelectAsset={setSelectedAsset} />;
      case 'image-analysis': return <ImageAnalysis onDeductPoints={handleDeductPoints} availablePoints={user.points} onOpenRecharge={() => setIsRechargeOpen(true)} onRefreshBalance={fetchUserData} />;
      case 'text-to-image': return <TextToImage onSelectAsset={setSelectedAsset} onDeductPoints={handleDeductPoints} availablePoints={user.points} onOpenRecharge={() => setIsRechargeOpen(true)} />;
      case 'text-to-video': return <TextToVideo onSelectAsset={setSelectedAsset} onDeductPoints={handleDeductPoints} availablePoints={user.points} onOpenRecharge={() => setIsRechargeOpen(true)} onNavigate={setCurrentPage} />;
      case 'image-to-image': return <ImageToImage onSelectAsset={setSelectedAsset} onDeductPoints={handleDeductPoints} availablePoints={user.points} onOpenRecharge={() => setIsRechargeOpen(true)} />;
      case 'image-to-video': return <ImageToVideo onSelectAsset={setSelectedAsset} onDeductPoints={handleDeductPoints} availablePoints={user.points} onOpenRecharge={() => setIsRechargeOpen(true)} />;
      case 'voice-clone': return <VoiceClone availablePoints={user.points} onOpenRecharge={() => setIsRechargeOpen(true)} />;
      case 'profile': return (
        <Profile 
          user={user} 
          onUpdateUser={handleUpdateUser}
          onSelectAsset={setSelectedAsset}
          onPublish={(asset) => {
            setSelectedAsset(asset);
            setIsPublishing(true);
          }}
          onEditProfile={() => setIsProfileOpen(true)}
          refreshKey={refreshProfileKey}
          getScrollContainer={getScrollContainer}
        />
      );
      default: return <Home onNavigate={setCurrentPage} onSelectWork={setSelectedWork} userId={user.id ? parseInt(user.id) : undefined} siteConfig={siteConfig} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0b0d17] text-white overflow-hidden">
      {/* 移动端顶部菜单按钮 */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-[#0d1121] border border-white/10 rounded-lg text-white hover:bg-white/5 transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>
      
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={setCurrentPage} 
        user={user} 
        onLogout={handleLogout}
        onOpenProfile={() => setCurrentPage('profile')}
        onOpenRecharge={() => setIsRechargeOpen(true)}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />
      <main ref={mainRef} className="flex-1 overflow-y-auto bg-[#0b0d17] lg:ml-0">
        <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
          {renderContent()}
        </div>
      </main>

      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        user={user} 
        onUpdate={handleUpdateUser}
      />
      
      <RechargeModal 
        isOpen={isRechargeOpen} 
        onClose={() => setIsRechargeOpen(false)} 
        user={user}
        onUpdatePoints={(newPoints) => setUser(p => ({ ...p, points: p.points + newPoints }))}
        onUpdateUserBalance={(balance) => setUser(p => ({ ...p, points: balance }))}
      />
      
      {selectedWork && (
        <InspirationModal 
          work={selectedWork} 
          onClose={() => setSelectedWork(null)} 
          onNavigate={setCurrentPage} 
        />
      )}

      {selectedAsset && !isPublishing && (
        <AssetDetailModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onPublish={openPublishModal}
          onNavigate={setCurrentPage}
          // 从资产页面选择的图片不显示发布和重绘按钮，文生图和图生图生成的图片显示
          showActions={currentPage !== 'assets'}
        />
      )}

      {selectedAsset && isPublishing && (
        <PublishModal
          asset={selectedAsset}
          onClose={() => setIsPublishing(false)}
          onSuccess={() => {
            setIsPublishing(false);
            setSelectedAsset(null);
            setRefreshProfileKey(prev => prev + 1);
          }}
          userId={user.id ? parseInt(user.id) : undefined}
        />
      )}
    </div>
  );
};

export default App;
