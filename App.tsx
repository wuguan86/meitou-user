import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { getCurrentUser, logout } from './api/auth';
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
import { PageType, User, Inspiration, AssetNode } from './types';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState<Inspiration | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AssetNode | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // 移动端菜单状态
  const [refreshProfileKey, setRefreshProfileKey] = useState(0); // 个人中心刷新key

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

  // Check for existing session on mount
  useEffect(() => {
    const checkLoginStatus = async () => {
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
    
    checkLoginStatus();
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
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderContent = () => {
    switch (currentPage) {
      case 'home': return <Home onNavigate={setCurrentPage} onSelectWork={setSelectedWork} userId={user.id ? parseInt(user.id) : undefined} />;
      case 'assets': return <Assets onSelectAsset={setSelectedAsset} />;
      case 'image-analysis': return <ImageAnalysis onDeductPoints={handleDeductPoints} />;
      case 'text-to-image': return <TextToImage onSelectAsset={setSelectedAsset} onDeductPoints={handleDeductPoints} />;
      case 'text-to-video': return <TextToVideo onSelectAsset={setSelectedAsset} onDeductPoints={handleDeductPoints} />;
      case 'image-to-image': return <ImageToImage onSelectAsset={setSelectedAsset} onDeductPoints={handleDeductPoints} />;
      case 'image-to-video': return <ImageToVideo onSelectAsset={setSelectedAsset} onDeductPoints={handleDeductPoints} />;
      case 'voice-clone': return <VoiceClone />;
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
        />
      );
      default: return <Home onNavigate={setCurrentPage} onSelectWork={setSelectedWork} userId={user.id ? parseInt(user.id) : undefined} />;
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
      <main className="flex-1 overflow-y-auto bg-[#0b0d17] lg:ml-0">
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
