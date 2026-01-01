import React, { useState, useEffect, useRef } from 'react';
import { message } from 'antd';
import { X, Gem, Check, CreditCard, Wallet, Landmark } from 'lucide-react';
import { User } from '../../types';
import { 
  getRechargeConfig, 
  createRechargeOrder, 
  queryOrder,
  RechargeConfigResponse,
  RechargeOrderResponse,
  OrderQueryResponse
} from '../../api/recharge';
import { getCurrentUser } from '../../api/auth';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdatePoints: (p: number) => void; // 新增积分（用于支付成功后）
  onUpdateUserBalance?: (balance: number) => void; // 更新总余额（用于刷新余额）
}

const RechargeModal: React.FC<RechargeModalProps> = ({ isOpen, onClose, user, onUpdatePoints, onUpdateUserBalance }) => {
  // 配置相关状态
  const [config, setConfig] = useState<RechargeConfigResponse | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  
  // 选择相关状态
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  
  // 支付相关状态
  const [paymentType, setPaymentType] = useState<'wechat' | 'alipay' | 'bank_transfer'>('wechat');
  const [isPaying, setIsPaying] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<RechargeOrderResponse | null>(null);
  const [paymentQrCode, setPaymentQrCode] = useState<string | null>(null);
  
  // 轮询相关
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 加载配置和用户信息
  useEffect(() => {
    if (isOpen) {
      // 加载充值配置
      if (!config && !loadingConfig) {
        loadConfig();
      }
      // 加载最新的用户余额
      loadUserBalance();
    }
  }, [isOpen]);
  
  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);
  
  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setSelectedOption(null);
      setCustomAmount('');
      setPaymentType('wechat');
      setIsPaying(false);
      setCurrentOrder(null);
      setPaymentQrCode(null);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    }
  }, [isOpen]);
  
  // 加载充值配置
  const loadConfig = async () => {
    try {
      setLoadingConfig(true);
      // 从用户信息中获取站点分类，如果没有则从后端获取
      let siteCategory = user.category;
      if (!siteCategory) {
        // 如果用户信息中没有category，从后端获取
        const userInfo = await getCurrentUser();
        siteCategory = userInfo.category || 'life';
      }
      console.log('用户站点分类:', siteCategory); // 调试信息
      const configData = await getRechargeConfig(siteCategory);
      console.log('加载的充值配置:', configData); // 调试信息：查看配置数据
      setConfig(configData);
      // 默认选择第一个选项
      if (configData.options && configData.options.length > 0) {
        setSelectedOption(configData.options[0].points);
      }
    } catch (error) {
      console.error('加载充值配置失败:', error);
      // message.error('加载充值配置失败，请刷新重试');
    } finally {
      setLoadingConfig(false);
    }
  };
  
  // 加载用户余额
  const loadUserBalance = async () => {
    try {
      const userInfo = await getCurrentUser();
      // 更新用户总余额
      if (onUpdateUserBalance) {
        onUpdateUserBalance(userInfo.balance);
      }
      // 如果用户信息中有category，也需要更新（通过onUpdateUserBalance回调）
      // 注意：这里只更新余额，category会在下次加载配置时使用
    } catch (error) {
      console.error('加载用户余额失败:', error);
      // 如果获取失败，不影响界面显示，使用传入的user.points
    }
  };
  
  // 处理自定义金额输入
  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value === '' || parseInt(value) >= 0) {
      setCustomAmount(value);
    }
  };
  
  const handleCustomBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // 移除自动修正，让用户看到错误提示
  };
  
  // 计算当前选择的金额和算力
  const getCurrentAmount = (): number => {
    if (selectedOption === 0) {
      return parseInt(customAmount) || 0;
    }
    if (config && selectedOption !== null) {
      const option = config.options.find(o => o.points === selectedOption);
      return option ? option.price : 0;
    }
    return 0;
  };
  
  const getCurrentPoints = (): number => {
    if (selectedOption === 0) {
      const amount = parseInt(customAmount) || 0;
      // 使用后端返回的兑换比例计算
      return amount * (config?.exchangeRate ?? 10);
    }
    return selectedOption || 0;
  };
  
  // 处理支付
  const handlePay = async () => {
    if (!config) {
      message.warning('配置未加载，请稍候重试');
      return;
    }
    
    const amount = getCurrentAmount();
    const minAmount = config.minAmount;
    
    // 验证金额
    if (selectedOption === 0) {
      if (isNaN(amount) || amount < minAmount) {
        message.warning(`自定义金额最低${minAmount}元起充，且必须为整数。`);
        return;
      }
    }
    
    if (amount <= 0) {
      message.warning('请选择充值金额');
      return;
    }
    
    try {
      setIsPaying(true);
      
      // 创建订单
      const orderResponse = await createRechargeOrder({
        amount: amount,
        paymentType: paymentType
      });
      
      setCurrentOrder(orderResponse);
      
      // 解析支付参数
      try {
        const paymentParams = JSON.parse(orderResponse.paymentParams);
        if (paymentParams.qrCodeUrl) {
          setPaymentQrCode(paymentParams.qrCodeUrl);
        } else if (paymentParams.paymentUrl) {
          // 如果是支付链接，直接跳转
          window.open(paymentParams.paymentUrl, '_blank');
        }
      } catch (e) {
        console.error('解析支付参数失败:', e);
      }
      
      // 开始轮询订单状态
      startPolling(orderResponse.orderNo);
      
    } catch (error: any) {
      console.error('创建订单失败:', error);
      // message.error('创建订单失败：' + (error.message || '未知错误'));
      setIsPaying(false);
    }
  };
  
  // 开始轮询订单状态
  const startPolling = (orderNo: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const order = await queryOrder(orderNo);
        
        if (order.status === 'paid') {
          // 支付成功
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          
          // 更新用户余额
          onUpdatePoints(order.points);
          
          // 显示成功提示
          message.success(`支付成功！已充值 ${order.points} 算力`);
          
          // 关闭弹窗
          setIsPaying(false);
          setCurrentOrder(null);
          setPaymentQrCode(null);
          onClose();
        } else if (order.status === 'failed' || order.status === 'cancelled') {
          // 支付失败或取消
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          
          message.error(`订单${order.status === 'failed' ? '支付失败' : '已取消'}`);
          setIsPaying(false);
          setCurrentOrder(null);
          setPaymentQrCode(null);
        }
      } catch (error) {
        console.error('查询订单状态失败:', error);
      }
    }, 2000); // 每2秒轮询一次
    
    // 30秒后停止轮询
    setTimeout(() => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }, 30000);
  };
  
  if (!isOpen) return null;
  
  const currentAmount = getCurrentAmount();
  const currentPoints = getCurrentPoints();
  // 使用后端返回的兑换比例，如果没有配置则使用默认值10（不应该发生）
  const exchangeRate = config?.exchangeRate ?? 10;
  const minAmount = config?.minAmount ?? 5;
  
  // 构建选项列表（包含自定义金额选项）
  const options = config ? [
    ...config.options.map(opt => ({ points: opt.points, price: opt.price })),
    ...(config.allowCustom ? [{ points: 0, price: 0, label: '自定义金额' }] : [])
  ] : [];
  
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
          <button 
            onClick={onClose} 
            className="p-3 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-all"
            disabled={isPaying}
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        <div className="p-10 space-y-8 overflow-y-auto max-h-[65vh] custom-scrollbar">
          {loadingConfig ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-gray-500">加载配置中...</div>
            </div>
          ) : !config ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-red-500">配置加载失败</div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md border border-white/5">兑换比例</span>
                  <span className="text-xs font-bold text-gray-400">1 元 = {exchangeRate} 算力</span>
                </div>
                <div className="text-xs font-black">
                  <span className="text-gray-500 mr-2">当前余额:</span>
                  <span className="text-[#2cc2f5] font-mono tracking-tighter">{user.points.toLocaleString()} 算力</span>
                </div>
              </div>

              {isPaying && paymentQrCode ? (
                <div className="flex flex-col items-center space-y-4 py-8">
                  <div className="text-lg font-black text-white mb-4">请扫码支付</div>
                  <div className="bg-white p-4 rounded-2xl">
                    <img src={paymentQrCode} alt="支付二维码" className="w-48 h-48" />
                  </div>
                  <div className="text-sm text-gray-400">订单号：{currentOrder?.orderNo}</div>
                  <div className="text-sm text-gray-400">支付金额：¥ {currentAmount}</div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    {options.map((opt, i) => (
                      <div key={i} className="flex flex-col">
                        <button 
                          onClick={() => {
                            if (opt.points === 0) {
                              setSelectedOption(0);
                            } else {
                              setSelectedOption(opt.points);
                            }
                          }}
                          disabled={isPaying}
                          className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all duration-300 relative group overflow-hidden h-full ${
                            selectedOption === opt.points 
                              ? 'border-[#2cc2f5] bg-[#2cc2f5]/10 shadow-[0_0_25px_-5px_rgba(44,194,245,0.3)]' 
                              : 'border-white/5 bg-[#0d1121] hover:border-white/20 hover:bg-white/[0.02]'
                          } ${isPaying ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                disabled={isPaying}
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
                          <p className={`text-center text-[10px] font-bold mt-2 transition-opacity ${
                            selectedOption === 0 
                              ? (customAmount !== '' && parseInt(customAmount) < minAmount 
                                  ? 'text-[#ff4d4f] opacity-100 animate-pulse' 
                                  : 'text-gray-500 opacity-100') 
                              : 'opacity-0'
                          }`}>
                            {selectedOption === 0 && customAmount !== '' && parseInt(customAmount) < minAmount 
                              ? `最低充值金额不能小于${minAmount}元` 
                              : `最低充值${minAmount}元`}
                          </p>
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
                      {/* 微信支付 */}
                      {(!config.enabledPaymentMethods || config.enabledPaymentMethods.includes('wechat')) && (
                        <button 
                          onClick={() => setPaymentType('wechat')}
                          disabled={isPaying}
                          className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all group ${
                            paymentType === 'wechat' ? 'border-[#2cc2f5] bg-[#2cc2f5]/5' : 'border-white/5 bg-[#0d1121] hover:bg-white/[0.02]'
                          } ${isPaying ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                      )}

                      {/* 支付宝 */}
                      {(!config.enabledPaymentMethods || config.enabledPaymentMethods.includes('alipay')) && (
                        <button 
                          onClick={() => setPaymentType('alipay')}
                          disabled={isPaying}
                          className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all group ${
                            paymentType === 'alipay' ? 'border-[#2cc2f5] bg-[#2cc2f5]/5' : 'border-white/5 bg-[#0d1121] hover:bg-white/[0.02]'
                          } ${isPaying ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                      )}

                      {/* 对公转账 */}
                      {(!config.enabledPaymentMethods || config.enabledPaymentMethods.includes('bank_transfer')) && (
                        <button 
                          onClick={() => setPaymentType('bank_transfer')}
                          disabled={isPaying}
                          className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all group ${
                            paymentType === 'bank_transfer' ? 'border-[#2cc2f5] bg-[#2cc2f5]/5' : 'border-white/5 bg-[#0d1121] hover:bg-white/[0.02]'
                          } ${isPaying ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${paymentType === 'bank_transfer' ? 'bg-purple-500 shadow-lg glow-purple' : 'bg-gray-800 opacity-60'}`}>
                              <Landmark className="w-5 h-5 text-white" />
                            </div>
                            <span className={`text-sm font-black ${paymentType === 'bank_transfer' ? 'text-white' : 'text-gray-500'}`}>对公转账</span>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${paymentType === 'bank_transfer' ? 'border-[#2cc2f5] bg-[#2cc2f5]/20' : 'border-white/10'}`}>
                            {paymentType === 'bank_transfer' && <div className="w-3 h-3 bg-[#2cc2f5] rounded-full shadow-lg" />}
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {!isPaying && config && (
          <div className="p-10 bg-[#0d1121] border-t border-white/5 flex flex-col items-center">
            {/* 对公转账提示 */}
            {paymentType === 'bank_transfer' && (
              <div className="w-full mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center">
                <p className="text-yellow-500 text-sm font-bold text-center">
                  充值前请联系客服处理
                </p>
              </div>
            )}
            
            {paymentType === 'bank_transfer' ? (
              <button 
                disabled
                className="w-full bg-gray-700 py-5 rounded-[2rem] font-black text-gray-400 shadow-none cursor-not-allowed tracking-[0.3em] text-lg"
              >
                请联系客服充值
              </button>
            ) : (
              <button 
                onClick={handlePay}
                disabled={selectedOption === null || currentAmount <= 0}
                className="w-full brand-gradient py-5 rounded-[2rem] font-black text-white shadow-2xl glow-cyan hover:scale-[1.02] active:scale-[0.98] transition-all tracking-[0.3em] text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                立即支付 ¥ {currentAmount}
              </button>
            )}
            <p className="mt-5 text-[9px] text-gray-700 font-black uppercase tracking-[0.2em]">
              Payment secured by <span className="text-gray-500">MEJI SECURE PAY</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RechargeModal;
