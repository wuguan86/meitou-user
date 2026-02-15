import React, { useState, useEffect } from 'react';
import { X, Gem } from 'lucide-react';
import { User } from '../../types';
import PointsRechargePanel from './PointsRechargePanel';
import MembershipPanel from './MembershipPanel';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdatePoints: (p: number) => void; // 新增积分（用于支付成功后）
  onUpdateUserBalance?: (balance: number) => void; // 更新总余额（用于刷新余额）
}

const RechargeModal: React.FC<RechargeModalProps> = ({ isOpen, onClose, user, onUpdatePoints, onUpdateUserBalance }) => {
  const [activeTab, setActiveTab] = useState<'points' | 'membership'>('membership'); // Default to membership as per request emphasis

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      // You can set a default tab here if needed, e.g., 'membership' or 'points'
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, isOpen]);
  
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in zoom-in duration-300"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className={`bg-[#151929] border border-white/10 w-full rounded-[3rem] overflow-hidden flex flex-col shadow-2xl relative transition-all duration-300 max-w-[1200px] h-[85vh]`}
      >
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-br from-white/[0.02] to-transparent shrink-0 relative">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-[#6b48ff]/20 rounded-2xl flex items-center justify-center border border-[#6b48ff]/20 shadow-inner">
              <div className="w-7 h-7 brand-gradient rounded-full flex items-center justify-center">
                <Gem className="w-4 h-4 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">美迹AI 充值中心</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Global Acceleration & Intelligent Computation</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Tab Switcher */}
            <div className="bg-[#0d1121] p-1 rounded-full flex space-x-1 border border-white/5">
              <button
                onClick={() => setActiveTab('membership')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                  activeTab === 'membership' 
                    ? 'bg-gradient-to-r from-[#2cc2f5] to-[#d946ef] text-white shadow-[0_0_15px_rgba(44,194,245,0.3)]' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                会员计划
              </button>
              <button
                onClick={() => setActiveTab('points')}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                  activeTab === 'points' 
                    ? 'bg-gradient-to-r from-[#2cc2f5] to-[#d946ef] text-white shadow-[0_0_15px_rgba(44,194,245,0.3)]' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                算力值充值
              </button>
            </div>

            <button 
              onClick={onClose} 
              className="p-3 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-all"
              type="button"
            >
              <X className="w-7 h-7" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-0 relative">
          {activeTab === 'points' ? (
            <div className="h-full p-8 overflow-y-auto custom-scrollbar">
              <PointsRechargePanel 
                user={user} 
                onUpdatePoints={onUpdatePoints} 
                onUpdateUserBalance={onUpdateUserBalance}
                onClose={onClose}
              />
            </div>
          ) : (
            <div className="h-full p-8 overflow-y-auto custom-scrollbar">
              <MembershipPanel 
                user={user}
                onUpdatePoints={onUpdatePoints}
                onUpdateUserBalance={onUpdateUserBalance}
                onClose={onClose}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RechargeModal;
