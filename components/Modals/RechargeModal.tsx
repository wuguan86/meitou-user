
import React, { useState, useEffect } from 'react';
import { X, Gem, Check, CreditCard, Wallet, Landmark, ChevronRight, Zap } from 'lucide-react';
import { User } from '../../types';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdatePoints: (p: number) => void;
}

const RechargeModal: React.FC<RechargeModalProps> = ({ isOpen, onClose, user, onUpdatePoints }) => {
  const [selectedOption, setSelectedOption] = useState(300);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'wechat' | 'alipay' | 'bank'>('wechat');

  useEffect(() => {
    if (isOpen) {
      setSelectedOption(300);
      setCustomAmount('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const options = [
    { points: 300, price: 30 },
    { points: 500, price: 50 },
    { points: 1000, price: 100 },
    { points: 5000, price: 500 },
    { points: 10000, price: 1000 },
    { points: 0, price: 0, label: '自定义金额' }
  ];

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value === '' || parseInt(value) >= 0) {
      setCustomAmount(value);
    }
  };
  
  const handleCustomBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value < 5) {
      setCustomAmount('5');
    }
  };

  const customPoints = customAmount ? parseInt(customAmount) * 10 : 0;
  const currentPoints = selectedOption === 0 ? customPoints : selectedOption;
  const currentPrice = selectedOption === 0 ? parseInt(customAmount) || 0 : options.find(o => o.points === selectedOption)?.price || 0;

  const handlePay = () => {
    if (selectedOption === 0) {
      const amount = parseInt(customAmount);
      if (isNaN(amount) || amount < 5) {
        alert('自定义金额最低5元起充，且必须为整数。');
        return;
      }
    }
    onUpdatePoints(currentPoints);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-in fade-in zoom-in duration-300">
      <div className="bg-[#151929] border border-white/10 w-full max-w-lg rounded-[3rem] overflow-hidden flex flex-col shadow-2xl relative">
        <div className="p-10 border-b border-white/5 flex items-center justify-between bg-gradient-to-br from-white/[0.02] to-transparent">
          <div className="flex items-center space-x-4">
             <div className="w-12 h-12 bg-[#ff2e8c]/20 rounded-2xl flex items-center justify-center border border-[#ff2e8c]/20 shadow-inner">
                <div className="w-7 h-7 brand-gradient rounded-full flex items-center justify-center">
                   <Gem className="w-4 h-4 text-white" />
                </div>
             </div>
             <div>
               <h3 className="text-2xl font-black text-white tracking-tight">算力充值</h3>
               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Power up your AI creation engine</p>
             </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-all">
            <X className="w-7 h-7" />
          </button>
        </div>

        <div className="p-10 space-y-8 overflow-y-auto max-h-[65vh] custom-scrollbar">
           <div className="flex items-center justify-between px-2">
             <div className="flex items-center space-x-2">
               <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md border border-white/5">兑换比例</span>
               <span className="text-xs font-bold text-gray-400">1 元 = 10 算力</span>
             </div>
             <div className="text-xs font-black">
               <span className="text-gray-500 mr-2">当前余额:</span>
               <span className="text-[#2cc2f5] font-mono tracking-tighter">{user.points.toLocaleString()} 算力</span>
             </div>
           </div>

           <div className="grid grid-cols-3 gap-4">
             {options.map((opt, i) => (
               <div key={i} className="flex flex-col">
                 <button 
                  onClick={() => setSelectedOption(opt.points)}
                  className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all duration-300 relative group overflow-hidden h-full ${
                    selectedOption === opt.points 
                      ? 'border-[#2cc2f5] bg-[#2cc2f5]/10 shadow-[0_0_25px_-5px_rgba(44,194,245,0.3)]' 
                      : 'border-white/5 bg-[#0d1121] hover:border-white/20 hover:bg-white/[0.02]'
                  }`}
                 >
                   {selectedOption === opt.points && (
                     <div className="absolute top-0 right-0 w-8 h-8 bg-[#2cc2f5] flex items-center justify-center rounded-bl-2xl">
                       <Check className="w-4 h-4 text-white font-black" />
                     </div>
                   )}
                   {opt.points > 0 ? (
                      <>
                        <div className="flex items-center space-x-1 mb-1.5">
                          <span className="text-xl font-black text-white">{opt.points}</span>
                          <span className="text-[9px] text-gray-600 font-black uppercase tracking-tighter">PTS</span>
                        </div>
                        <span className={`text-sm font-black transition-colors ${selectedOption === opt.points ? 'text-[#2cc2f5]' : 'text-gray-500'}`}>¥ {opt.price}</span>
                      </>
                   ) : (
                      selectedOption === 0 ? (
                        <input 
                          type="text" 
                          value={customAmount}
                          onChange={handleCustomAmountChange}
                          onBlur={handleCustomBlur}
                          placeholder="¥"
                          className="w-full bg-transparent text-center text-xl font-black text-white outline-none"
                          autoFocus
                        />
                      ) : (
                        <span className="text-xs font-black text-gray-500 uppercase tracking-widest">{opt.label}</span>
                      )
                   )}
                   <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                 </button>
                 {opt.points === 0 && (
                    <p className={`text-center text-[10px] font-bold mt-2 transition-opacity ${selectedOption === 0 ? 'text-gray-500 opacity-100' : 'opacity-0'}`}>最低充值5元</p>
                  )}
               </div>
             ))}
           </div>

           <div className="bg-[#0d1121] border border-white/5 p-6 rounded-[2rem] flex items-center justify-between shadow-inner">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">预计获得算力</span>
                <span className="text-xs font-bold text-gray-400">立即到账，全球可用</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-3xl font-black brand-text-gradient tracking-tighter">{currentPoints.toLocaleString()}</span>
                <div className="w-6 h-6 brand-gradient rounded-full flex items-center justify-center">
                   <Gem className="w-3 h-3 text-white" />
                </div>
              </div>
           </div>

           <div className="space-y-4">
              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-2">选择支付渠道</h4>
              <div className="space-y-3">
                 <button 
                  onClick={() => setPaymentType('wechat')}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all group ${
                    paymentType === 'wechat' ? 'border-[#2cc2f5] bg-[#2cc2f5]/5' : 'border-white/5 bg-[#0d1121] hover:bg-white/[0.02]'
                  }`}
                 >
                   <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${paymentType === 'wechat' ? 'bg-green-500 shadow-lg glow-pink' : 'bg-gray-800 opacity-60'}`}>
                         <Wallet className="w-5 h-5 text-white" />
                      </div>
                      <span className={`text-sm font-black ${paymentType === 'wechat' ? 'text-white' : 'text-gray-500'}`}>微信支付</span>
                   </div>
                   <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${paymentType === 'wechat' ? 'border-[#2cc2f5] bg-[#2cc2f5]/20' : 'border-white/10'}`}>
                      {paymentType === 'wechat' && <div className="w-3 h-3 bg-[#2cc2f5] rounded-full shadow-lg" />}
                   </div>
                 </button>

                 <button 
                  onClick={() => setPaymentType('alipay')}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all group ${
                    paymentType === 'alipay' ? 'border-[#2cc2f5] bg-[#2cc2f5]/5' : 'border-white/5 bg-[#0d1121] hover:bg-white/[0.02]'
                  }`}
                 >
                   <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${paymentType === 'alipay' ? 'bg-blue-500 shadow-lg glow-cyan' : 'bg-gray-800 opacity-60'}`}>
                         <CreditCard className="w-5 h-5 text-white" />
                      </div>
                      <span className={`text-sm font-black ${paymentType === 'alipay' ? 'text-white' : 'text-gray-500'}`}>支付宝</span>
                   </div>
                   <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${paymentType === 'alipay' ? 'border-[#2cc2f5] bg-[#2cc2f5]/20' : 'border-white/10'}`}>
                      {paymentType === 'alipay' && <div className="w-3 h-3 bg-[#2cc2f5] rounded-full shadow-lg" />}
                   </div>
                 </button>
              </div>
           </div>
        </div>

        <div className="p-10 bg-[#0d1121] border-t border-white/5 flex flex-col items-center">
           <button 
            onClick={handlePay}
            className="w-full brand-gradient py-5 rounded-[2rem] font-black text-white shadow-2xl glow-cyan hover:scale-[1.02] active:scale-[0.98] transition-all tracking-[0.3em] text-lg"
           >
             立即支付 ¥ {currentPrice}
           </button>
           <p className="mt-5 text-[9px] text-gray-700 font-black uppercase tracking-[0.2em]">
             Payment secured by <span className="text-gray-500">MEJI SECURE PAY</span>
           </p>
        </div>
      </div>
    </div>
  );
};

export default RechargeModal;
