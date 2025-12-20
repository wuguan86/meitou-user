import React, { useState, useEffect } from 'react';
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
// fix: Corrected import path casing to consistently use 'Modals' to resolve compilation errors.
import ProfileModal from './components/Modals/ProfileModal';
import RechargeModal from './components/Modals/RechargeModal';
import InspirationModal from './components/Modals/InspirationModal';
import AssetDetailModal from './components/Modals/AssetDetailModal';
import PublishModal from './components/Modals/PublishModal';
import { PageType, User, Inspiration, AssetNode } from './types';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [selectedWork, setSelectedWork] = useState<Inspiration | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AssetNode | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

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

  const handleLoginSuccess = (userData: Partial<User>) => {
    setUser(prev => ({ ...prev, ...userData, isLoggedIn: true }));
  };

  const handleLogout = () => {
    setUser(prev => ({ ...prev, isLoggedIn: false }));
    setCurrentPage('home');
  };

  const handleUpdateUser = (updatedInfo: Partial<User>) => {
    setUser(prev => ({ ...prev, ...updatedInfo }));
  };
  
  const openPublishModal = () => {
    if (selectedAsset) {
      setIsPublishing(true);
    }
  };

  if (!user.isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const renderContent = () => {
    switch (currentPage) {
      case 'home': return <Home onNavigate={setCurrentPage} onSelectWork={setSelectedWork} />;
      case 'assets': return <Assets onSelectAsset={setSelectedAsset} />;
      case 'image-analysis': return <ImageAnalysis />;
      case 'text-to-image': return <TextToImage onSelectAsset={setSelectedAsset} />;
      case 'text-to-video': return <TextToVideo onSelectAsset={setSelectedAsset} />;
      case 'image-to-image': return <ImageToImage onSelectAsset={setSelectedAsset} />;
      case 'image-to-video': return <ImageToVideo onSelectAsset={setSelectedAsset} />;
      case 'voice-clone': return <VoiceClone />;
      default: return <Home onNavigate={setCurrentPage} onSelectWork={setSelectedWork} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0b0d17] text-white overflow-hidden">
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={setCurrentPage} 
        user={user} 
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenRecharge={() => setIsRechargeOpen(true)}
      />
      <main className="flex-1 overflow-y-auto bg-[#0b0d17]">
        <div className="max-w-[1400px] mx-auto p-8">
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
        />
      )}

      {selectedAsset && isPublishing && (
        <PublishModal
          asset={selectedAsset}
          onClose={() => setIsPublishing(false)}
        />
      )}
    </div>
  );
};

export default App;