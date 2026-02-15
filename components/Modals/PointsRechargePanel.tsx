import React, { useState, useEffect, useRef, useCallback } from 'react';
import { message, QRCode } from 'antd';
import { Gem, Check, CreditCard, Wallet, Landmark, X, Info, ShieldCheck } from 'lucide-react';
import { User } from '../../types';
import { 
  getRechargeConfig, 
  createRechargeOrder, 
  queryOrder,
  RechargeConfigResponse,
  RechargeOrderResponse
} from '../../api/recharge';
import { getCurrentUser } from '../../api/auth';

interface PointsRechargePanelProps {
  user: User;
  onUpdatePoints: (p: number) => void;
  onUpdateUserBalance?: (balance: number) => void;
  onClose: () => void;
}

const PointsRechargePanel: React.FC<PointsRechargePanelProps> = ({ 
  user, 
  onUpdatePoints, 
  onUpdateUserBalance,
  onClose 
}) => {
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
  const [showBankInfo, setShowBankInfo] = useState(false); // 是否显示对公账户信息
  
  // 轮询相关
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 加载配置和用户信息
  useEffect(() => {
    // 加载充值配置
    if (!config && !loadingConfig) {
      loadConfig();
    }
    // 加载最新的用户余额
    loadUserBalance();
  }, []);
  
  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);
  
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
    } catch (error) {
      console.error('加载用户余额失败:', error);
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

  const handleClose = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPaying(false);
    setCurrentOrder(null);
    setPaymentQrCode(null);
    setShowBankInfo(false);
    onClose();
  }, [onClose]);
  
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
          handleClose();
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
        if (paymentParams.paymentForm) {
          const newWindow = window.open('', '_blank');
          if (newWindow) {
            newWindow.document.open();
            newWindow.document.write(paymentParams.paymentForm);
            newWindow.document.close();
          } else {
            message.warning('浏览器拦截了支付页面弹窗，请允许弹窗后重试');
          }
        } else if (paymentParams.qrCodeUrl) {
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
      setIsPaying(false);
    }
  };

  const currentAmount = getCurrentAmount();
  const currentPoints = getCurrentPoints();
  const exchangeRate = config?.exchangeRate ?? 10;
  const minAmount = config?.minAmount ?? 5;
  
  // 构建选项列表（包含自定义金额选项）
  const options = config ? [
    ...config.options.map(opt => ({ points: opt.points, price: opt.price })),
    ...(config.allowCustom ? [{ points: 0, price: 0, label: '自定义金额' }] : [])
  ] : [];

  return (
    <div className="h-full flex flex-col relative">
      {loadingConfig ? (
        <div className="flex items-center justify-center py-20 flex-1">
          <div className="text-gray-500">加载配置中...</div>
        </div>
      ) : !config ? (
        <div className="flex items-center justify-center py-20 flex-1">
          <div className="text-red-500">配置加载失败</div>
        </div>
      ) : (
        <>
          {/* Top Info Bar */}
          <div className="flex items-center justify-between px-1 mb-6 shrink-0">
            <div className="bg-white/5 px-4 py-1.5 rounded-full border border-white/5 flex items-center space-x-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">汇率说明</span>
              <span className="w-px h-3 bg-white/10"></span>
              <span className="text-xs font-bold text-gray-300">1 元 = {exchangeRate} 算力</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">当前余额</span>
              <div className="text-xl font-black text-[#2cc2f5] tracking-tight">
                {user.points.toLocaleString()} <span className="text-xs text-gray-500 ml-1">PTS</span>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
            {isPaying && paymentQrCode ? (
              <div className="flex flex-col items-center justify-center h-full space-y-6">
                <div className="bg-white p-6 rounded-3xl shadow-2xl shadow-black/50">
                  <QRCode value={paymentQrCode} size={200} />
                </div>
                <div className="text-center space-y-2">
                  <div className="text-lg font-black text-white">请使用{paymentType === 'wechat' ? '微信' : '支付宝'}扫码支付</div>
                  <div className="text-sm text-gray-400 font-mono">¥ {currentAmount}</div>
                </div>
                <button 
                  onClick={() => setIsPaying(false)}
                  className="px-6 py-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors text-xs font-bold"
                >
                  取消支付
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-5 pb-4 pt-4 px-2">
                {options.map((opt, i) => (
                  <button 
                    key={i} 
                    onClick={() => {
                      if (opt.points === 0) {
                        setSelectedOption(0);
                      } else {
                        setSelectedOption(opt.points);
                      }
                    }}
                    disabled={isPaying}
                    className={`relative flex flex-col p-6 rounded-3xl border-2 transition-all duration-300 group h-[280px] ${
                      selectedOption === opt.points 
                        ? 'border-[#2cc2f5] bg-[#0d1121] shadow-[0_0_30px_-5px_rgba(44,194,245,0.2)] z-10 scale-[1.02]' 
                        : 'border-white/5 bg-[#0d1121] hover:border-white/20 hover:bg-white/[0.02]'
                    } ${isPaying ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {/* Hot Tag for middle option or specific logic */}
                    {i === 1 && opt.points > 0 && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2cc2f5] text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg shadow-[#2cc2f5]/40 z-20">
                        热门
                      </div>
                    )}

                    {/* Selection Indicator */}
                    {selectedOption === opt.points && (
                      <div className="absolute inset-0 rounded-[22px] border-2 border-[#2cc2f5] opacity-10 pointer-events-none"></div>
                    )}

                    {opt.points > 0 ? (
                      <>
                        <div className="text-center mt-2">
                          <div className="flex items-baseline justify-center space-x-1">
                            <span className="text-3xl font-black text-white tracking-tight">{opt.points}</span>
                            <span className="text-xs font-black text-gray-500">PTS</span>
                          </div>
                        </div>

                        <div className="w-full h-px bg-white/5 my-6"></div>

                        <div className="text-center mb-6">
                          <span className={`text-4xl font-black tracking-tight ${selectedOption === opt.points ? 'brand-text-gradient' : 'text-[#f472b6]'}`}>
                            ¥{opt.price}
                          </span>
                        </div>

                        <div className="mt-auto space-y-3 text-left w-full pl-2">
                          <div className="flex items-center space-x-2">
                            <Check className="w-3.5 h-3.5 text-[#00c087]" />
                            <span className="text-[10px] font-bold text-gray-400">即时到账</span>
                          </div>
                          <div className="flex items-start space-x-2">
                            <Info className="w-3.5 h-3.5 text-[#eab308] shrink-0 mt-0.5" />
                            <span className="text-[10px] text-gray-500 leading-tight">
                              算力自充值之日起约6个月内有效，请尽快使用。
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-center mt-8 mb-4">
                          <span className="text-lg font-black text-white">自定义金额</span>
                        </div>
                        
                        <div className="flex-1 flex flex-col items-center justify-center">
                          {selectedOption === 0 ? (
                            <>
                              <div className="relative w-full">
                                <span className="absolute left-1/2 -translate-x-[60px] top-1/2 -translate-y-1/2 text-2xl font-black text-gray-500">¥</span>
                                <input 
                                  type="text" 
                                  value={customAmount}
                                  onChange={handleCustomAmountChange}
                                  onBlur={handleCustomBlur}
                                  placeholder="0"
                                  disabled={isPaying}
                                  className="w-full bg-transparent text-center text-4xl font-black text-white outline-none placeholder:text-gray-700"
                                  autoFocus
                                />
                              </div>
                              <div className={`mt-2 text-[10px] font-bold transition-all duration-300 ${
                                customAmount && parseInt(customAmount) < minAmount 
                                  ? 'text-red-500 animate-pulse' 
                                  : 'text-gray-500'
                              }`}>
                                {customAmount && parseInt(customAmount) < minAmount 
                                  ? `最低充值金额不小于${minAmount}元`
                                  : `最低充值 ${minAmount} 元`
                                }
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-gray-500 font-bold px-8 text-center leading-relaxed">
                              灵活充值<br/>按需购买
                            </div>
                          )}
                        </div>

                        <div className="mt-auto w-full text-center pb-4">
                        </div>
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer Payment Section */}
          {!isPaying && (
            <div className="mt-4 pt-6 border-t border-white/5 shrink-0">
              <div className="flex items-end justify-between">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">支付方式</h4>
                  <div className="flex items-center space-x-3">
                    {/* WeChat Pay */}
                    {(!config.enabledPaymentMethods || config.enabledPaymentMethods.includes('wechat')) && (
                      <button 
                        onClick={() => setPaymentType('wechat')}
                        className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border transition-all ${
                          paymentType === 'wechat' 
                            ? 'bg-[#00c087]/10 border-[#00c087] text-white shadow-lg shadow-[#00c087]/20' 
                            : 'bg-[#0d1121] border-white/5 text-gray-500 hover:bg-white/5 hover:text-gray-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${paymentType === 'wechat' ? 'bg-[#00c087]' : 'bg-gray-700'}`}>
                          <Wallet className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-bold">微信支付</span>
                        {paymentType === 'wechat' && <div className="w-2 h-2 rounded-full bg-[#00c087] ml-1 animate-pulse" />}
                      </button>
                    )}

                    {/* Alipay */}
                    {(!config.enabledPaymentMethods || config.enabledPaymentMethods.includes('alipay')) && (
                      <button 
                        onClick={() => setPaymentType('alipay')}
                        className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border transition-all ${
                          paymentType === 'alipay' 
                            ? 'bg-[#1677ff]/10 border-[#1677ff] text-white shadow-lg shadow-[#1677ff]/20' 
                            : 'bg-[#0d1121] border-white/5 text-gray-500 hover:bg-white/5 hover:text-gray-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${paymentType === 'alipay' ? 'bg-[#1677ff]' : 'bg-gray-700'}`}>
                          <CreditCard className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-bold">支付宝</span>
                        {paymentType === 'alipay' && <div className="w-2 h-2 rounded-full bg-[#1677ff] ml-1 animate-pulse" />}
                      </button>
                    )}

                    {/* Bank Transfer */}
                    {(!config.enabledPaymentMethods || config.enabledPaymentMethods.includes('bank_transfer')) && (
                      <button 
                        onClick={() => setPaymentType('bank_transfer')}
                        className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border transition-all ${
                          paymentType === 'bank_transfer' 
                            ? 'bg-[#eab308]/10 border-[#eab308] text-white shadow-lg shadow-[#eab308]/20' 
                            : 'bg-[#0d1121] border-white/5 text-gray-500 hover:bg-white/5 hover:text-gray-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${paymentType === 'bank_transfer' ? 'bg-[#eab308]' : 'bg-gray-700'}`}>
                          <Landmark className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-bold">对公转账</span>
                        {paymentType === 'bank_transfer' && <div className="w-2 h-2 rounded-full bg-[#eab308] ml-1 animate-pulse" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-8">
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-gray-500 mb-1">实付金额</div>
                    <div className="flex items-baseline justify-end space-x-1">
                      <span className="text-sm font-bold text-gray-400">¥</span>
                      <span className="text-4xl font-black text-white tracking-tighter">{currentAmount}</span>
                    </div>
                  </div>
                  
                  {paymentType === 'bank_transfer' ? (
                     <button
                        onClick={() => setShowBankInfo(true)}
                        className="h-14 px-10 rounded-2xl font-black text-sm tracking-widest bg-gradient-to-r from-[#eab308] to-[#ca8a04] text-white shadow-lg shadow-yellow-500/20 hover:scale-105 active:scale-95 transition-all"
                      >
                        查看账户
                      </button>
                  ) : (
                    <button
                      onClick={handlePay}
                      disabled={isPaying || currentAmount <= 0}
                      className={`h-14 px-10 rounded-2xl font-black text-sm tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95 ${
                        isPaying || currentAmount <= 0
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-[#2cc2f5] to-[#f472b6] text-white shadow-[#2cc2f5]/20 hover:shadow-[#2cc2f5]/40'
                      }`}
                    >
                      {isPaying ? '处理中...' : '立即购买'}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end space-x-2 text-[10px] font-bold text-gray-600">
                <ShieldCheck className="w-3 h-3" />
                <span>安全支付环境 | 虚拟商品不支持退款</span>
              </div>
            </div>
          )}

          {/* 对公账户信息弹窗 */}
          {showBankInfo && (
            <div className="fixed inset-0 z-[210] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
               <div className="bg-[#151929] border border-white/10 w-full max-w-md rounded-[2rem] overflow-hidden flex flex-col shadow-2xl relative">
                  <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-br from-white/[0.02] to-transparent">
                    <h3 className="text-xl font-black text-white tracking-tight">配置对公转账</h3>
                    <button 
                      onClick={() => setShowBankInfo(false)} 
                      className="p-2 hover:bg-white/10 rounded-full text-gray-500 hover:text-white transition-all"
                      type="button"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <div className="p-8 space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest">开户银行</label>
                        <div className="bg-[#0d1121] border border-white/5 rounded-2xl p-4 text-white font-bold text-lg select-all">
                          {config?.bankInfo?.bankName || '未配置'}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest">银行账号</label>
                        <div className="bg-[#0d1121] border border-white/5 rounded-2xl p-4 text-white font-bold text-lg select-all">
                          {config?.bankInfo?.bankAccount || '未配置'}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest">账户名称</label>
                        <div className="bg-[#0d1121] border border-white/5 rounded-2xl p-4 text-white font-bold text-lg select-all">
                          {config?.bankInfo?.accountName || '未配置'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <button 
                        onClick={() => setShowBankInfo(false)}
                        className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl transition-all"
                      >
                        我已了解
                      </button>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PointsRechargePanel;
