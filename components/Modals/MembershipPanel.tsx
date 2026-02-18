import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { message, QRCode, Modal, Input, Button } from 'antd';
import { Check, Loader2, Gem, CreditCard, Wallet, Landmark, X, ShieldCheck, Minus, Plus, Ticket } from 'lucide-react';
import { User } from '../../types';
import { getMembershipPackages, MembershipPackage } from '../../api/membershipPackage';
import { createMembershipOrder, getMembershipStatus, MembershipStatusResponse } from '../../api/membership';
import { getRechargeConfig, queryOrder, RechargeConfigResponse, RechargeOrderResponse } from '../../api/recharge';
import { getCurrentUser } from '../../api/auth';
import { redeemCode } from '@/api/redemption';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  packageId: number;
  levelCode: string;
  name: string;
  price: number | string;
  period: string;
  discountBadge?: string;
  features: PlanFeature[];
  isPopular?: boolean;
  buttonText: string;
  nextMonthPrice?: number | string;
  primaryColor?: string;
}

interface MembershipPanelProps {
  user: User;
  onUpdatePoints: (p: number) => void;
  onUpdateUserBalance?: (balance: number) => void;
  onClose: () => void;
  onRefreshMembership?: (status?: MembershipStatusResponse) => void;
}

const MembershipPanel: React.FC<MembershipPanelProps> = ({ user, onUpdatePoints, onUpdateUserBalance, onClose, onRefreshMembership }) => {
  const [billingCycle, setBillingCycle] = useState<'yearly' | 'monthly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<MembershipPackage[]>([]);
  const [config, setConfig] = useState<RechargeConfigResponse | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatusResponse | null>(null);
  const [quantity, setQuantity] = useState<number | string>(3);

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentType, setPaymentType] = useState<'wechat' | 'alipay' | 'bank_transfer'>('wechat');
  const [isPaying, setIsPaying] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<RechargeOrderResponse | null>(null);
  const [paymentQrCode, setPaymentQrCode] = useState<string | null>(null);
  const [showBankInfo, setShowBankInfo] = useState(false);

  // 兑换码相关
  const [redeemModalVisible, setRedeemModalVisible] = useState(false);
  const [redeemCodeInput, setRedeemCodeInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  // 错误提示弹窗
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoading(true);
        const data = await getMembershipPackages();
        setPackages(data);
      } catch (error) {
        console.error('Failed to fetch membership packages:', error);
        message.error('获取会员套餐失败');
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);

  useEffect(() => {
    if (!config && !loadingConfig) {
      loadConfig();
    }
    loadMembershipStatus();
  }, []);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const loadConfig = async () => {
    try {
      setLoadingConfig(true);
      let siteCategory = user.category;
      if (!siteCategory) {
        const userInfo = await getCurrentUser();
        siteCategory = userInfo.category || 'life';
      }
      const configData = await getRechargeConfig(siteCategory);
      setConfig(configData);
      if (configData.enabledPaymentMethods && configData.enabledPaymentMethods.length > 0) {
        if (!configData.enabledPaymentMethods.includes(paymentType)) {
          if (configData.enabledPaymentMethods.includes('wechat')) setPaymentType('wechat');
          else if (configData.enabledPaymentMethods.includes('alipay')) setPaymentType('alipay');
          else if (configData.enabledPaymentMethods.includes('bank_transfer')) setPaymentType('bank_transfer');
        }
      }
    } catch (e) {
      console.error('加载支付配置失败:', e);
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadMembershipStatus = async () => {
    try {
      const status = await getMembershipStatus();
      setMembershipStatus(status);
      
      // 如果当前是包年/包月，且用户有更高级的订阅，可能需要调整默认选中
      // 这里简单处理，保持用户选择
      return status;
    } catch (e) {
      console.error('Failed to load membership status:', e);
      setMembershipStatus(null);
      return null;
    }
  };

  const handleRedeem = async () => {
    if (!redeemCodeInput.trim()) {
      message.error('请输入兑换码');
      return;
    }
    setRedeeming(true);
    try {
      const msg = await redeemCode(redeemCodeInput);
      message.success(msg || '兑换成功');
      setRedeemModalVisible(false);
      setRedeemCodeInput('');
      // 刷新数据
      const status = await loadMembershipStatus();
      if (onRefreshMembership && status) {
        onRefreshMembership(status);
      }
      if (onUpdateUserBalance) {
        // 简单刷新一下用户信息以获取最新积分余额
        getCurrentUser().then(u => {
            if (u) {
                onUpdateUserBalance(u.balance);
                onUpdatePoints(0); 
            }
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || '兑换失败');
      setErrorModalVisible(true);
    } finally {
      setRedeeming(false);
    }
  };

  const isOldUser = membershipStatus?.oldUser ?? false;

  const getDisplayPrice = (pkg: MembershipPackage) => {
    if (pkg.levelCode === 'free') return 0;
    
    if (billingCycle === 'yearly') {
      const yearlyTotal = (isOldUser ? pkg.yearlyPrice : (pkg.yearlyDiscountPrice || pkg.yearlyPrice)) || 0;
      return Number((yearlyTotal / 12).toFixed(1)); // 保留一位小数
    } else {
      return (isOldUser ? pkg.monthlyPrice : (pkg.monthlyDiscountPrice || pkg.monthlyPrice)) || 0;
    }
  };

  const getNextMonthPrice = (pkg: MembershipPackage) => {
    if (pkg.levelCode === 'free') return undefined;
    
    if (isOldUser) return undefined;
    if (billingCycle === 'monthly' && pkg.monthlyDiscountPrice && pkg.monthlyPrice && pkg.monthlyDiscountPrice < pkg.monthlyPrice) {
      return pkg.monthlyPrice;
    }
    // 如果是年付且有优惠价，则下一年（换算成月）价格为原价/12
    if (billingCycle === 'yearly' && pkg.yearlyDiscountPrice && pkg.yearlyPrice && pkg.yearlyDiscountPrice < pkg.yearlyPrice) {
      return Number((pkg.yearlyPrice / 12).toFixed(1));
    }
    return undefined;
  };

  const plans: Plan[] = packages.map(pkg => {
    let featuresData: string[] = [];
    try {
      const parsed = JSON.parse(pkg.featuresJson || '[]');
      if (Array.isArray(parsed)) {
         featuresData = parsed.map((item: any) => 
             typeof item === 'string' ? item : (item.text || JSON.stringify(item))
         );
      }
    } catch (e) {
      console.error('Failed to parse features JSON', e);
    }

    const features: PlanFeature[] = featuresData.map(text => ({
      text,
      included: true
    }));

    return {
      id: pkg.levelCode,
      packageId: pkg.id,
      levelCode: pkg.levelCode,
      name: pkg.name,
      price: getDisplayPrice(pkg),
      nextMonthPrice: getNextMonthPrice(pkg),
      discountBadge: pkg.badgeText,
      period: '/ 月',
      primaryColor: pkg.primaryColor,
      buttonText: pkg.buttonText,
      features: features,
      isPopular: pkg.isRecommended
    };
  });

  const selectedPackage = useMemo(() => {
    if (!selectedPlan) return null;
    return packages.find(p => p.id === selectedPlan.packageId) || null;
  }, [selectedPlan, packages]);

  const currentAmount = useMemo(() => {
    if (!selectedPackage) return 0;
    let price = 0;
    if (billingCycle === 'yearly') {
      price = Number((isOldUser ? selectedPackage.yearlyPrice : (selectedPackage.yearlyDiscountPrice || selectedPackage.yearlyPrice)) || 0);
    } else {
      price = Number((isOldUser ? selectedPackage.monthlyPrice : (selectedPackage.monthlyDiscountPrice || selectedPackage.monthlyPrice)) || 0);
    }
    const qty = typeof quantity === 'number' ? quantity : (Number(quantity) || 0);
    return Number((price * qty).toFixed(2));
  }, [selectedPackage, billingCycle, isOldUser, quantity]);

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

  const startPolling = (orderNo: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const order = await queryOrder(orderNo);
        if (order.status === 'paid') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }

          try {
            const userInfo = await getCurrentUser();
            if (onUpdateUserBalance) {
              onUpdateUserBalance(userInfo.balance);
            } else {
              const delta = userInfo.balance - user.points;
              if (delta !== 0) {
                onUpdatePoints(delta);
              }
            }
          } catch (e) {
            console.error('刷新用户余额失败:', e);
          }

          const status = await loadMembershipStatus();

          if (onRefreshMembership && status) {
            onRefreshMembership(status);
          }

          message.success('支付成功！会员已开通/续费');
          handleClose();
        } else if (order.status === 'failed' || order.status === 'cancelled') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          message.error(`订单${order.status === 'failed' ? '支付失败' : '已取消'}`);
          setIsPaying(false);
          setCurrentOrder(null);
          setPaymentQrCode(null);
        }
      } catch (e) {
        console.error('查询订单状态失败:', e);
      }
    }, 2000);
  };

  const handlePay = async () => {
    if (!selectedPlan || !selectedPackage) {
      message.warning('请选择会员套餐');
      return;
    }
    if (currentAmount <= 0) {
      message.warning('套餐价格异常');
      return;
    }

    if (paymentType === 'bank_transfer') {
      setShowBankInfo(true);
      return;
    }

    try {
      setIsPaying(true);
      const orderResponse = await createMembershipOrder({
        packageId: selectedPlan.packageId,
        billingCycle,
        quantity: typeof quantity === 'number' ? quantity : (Number(quantity) || 1),
        paymentType
      });
      setCurrentOrder(orderResponse);

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
          window.open(paymentParams.paymentUrl, '_blank');
        }
      } catch (e) {
        console.error('解析支付参数失败:', e);
      }

      startPolling(orderResponse.orderNo);
    } catch (e) {
      console.error('创建会员订单失败:', e);
      setIsPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#2cc2f5] mb-4" />
        <p className="text-gray-400 text-sm">正在加载套餐配置...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative text-white">
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
        <>
          <div className="flex items-center justify-between mb-6 shrink-0">
            <button 
              className="group flex items-center space-x-2 bg-[#151923] border border-[#2cc2f5]/20 rounded-full px-4 py-1.5 hover:border-[#2cc2f5]/40 transition-all"
              onClick={() => setRedeemModalVisible(true)}
            >
              <Gem className="w-3.5 h-3.5 text-[#2cc2f5]" />
              <span className="text-xs text-gray-400 font-medium group-hover:text-gray-300 transition-colors">
                使用邀请码/兑换码，获得额外权益。 <span className="text-white font-bold underline decoration-1 underline-offset-2">立即填写 &gt;</span>
              </span>
            </button>

            <div className="bg-[#0d1121] p-1 rounded-full flex space-x-1 border border-white/5">
              <button
                onClick={() => {
                  setBillingCycle('monthly');
                  setQuantity(3);
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-gradient-to-r from-[#2cc2f5] to-[#d946ef] text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                月付
              </button>
              <button
                onClick={() => {
                  setBillingCycle('yearly');
                  setQuantity(3);
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  billingCycle === 'yearly'
                    ? 'bg-gradient-to-r from-[#2cc2f5] to-[#d946ef] text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                年付
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 px-4 pt-6 pb-6 items-stretch">
              {plans.map((plan) => {
                const isActiveOtherType = !!membershipStatus?.activeLevelCode && !membershipStatus.canSwitchType && membershipStatus.activeLevelCode !== plan.levelCode;
                const isActiveSameType = !!membershipStatus?.activeLevelCode && !membershipStatus.canSwitchType && membershipStatus.activeLevelCode === plan.levelCode;
                
                let buttonLabel = isActiveSameType ? '续费' : plan.buttonText;
                let isButtonDisabled = isActiveOtherType;

                // 免费版按钮逻辑特殊处理
                if (plan.id === 'free') {
                  const currentLevel = membershipStatus?.activeLevelCode || 'free';
                  if (currentLevel === 'free') {
                    buttonLabel = '当前套餐';
                    isButtonDisabled = true;
                  } else {
                    buttonLabel = '当前不可用';
                    isButtonDisabled = true;
                  }
                }

                return (
                  <div
                    key={plan.packageId}
                    onClick={() => !isButtonDisabled && setSelectedPlan(plan)}
                    className={`flex flex-col p-5 rounded-2xl border transition-all duration-300 relative group ${
                      !isButtonDisabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                    } ${
                      plan.isPopular
                        ? 'border-[#a855f7] bg-[#13161f] shadow-[0_0_20px_-5px_rgba(168,85,247,0.3)] z-10 scale-[1.02]'
                        : 'border-white/5 bg-[#13161f] hover:border-white/10 hover:bg-[#1a1e29]'
                    } ${selectedPlan?.packageId === plan.packageId ? 'ring-1 ring-[#2cc2f5]/40' : ''}`}
                  >
            {/* 旗舰版特殊标记 */}
            {plan.isPopular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-[#a855f7] text-[10px] font-black px-3 py-0.5 rounded-full tracking-wider shadow-lg z-20 whitespace-nowrap">
                超值之选
              </div>
            )}

            {/* 头部信息 */}
            <div className="text-center mb-4 mt-2">
              <h3 className="text-base font-bold text-white mb-2">{plan.name}</h3>
              <div className="h-6 flex items-center justify-center">
                {plan.discountBadge && (
                  <div className="bg-white/10 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center">
                    {plan.discountBadge}
                  </div>
                )}
              </div>
            </div>

            {/* 价格信息 */}
            <div className="text-center mb-6">
              <div className="flex items-end justify-center leading-none mb-2">
                <span className="text-xl font-bold text-gray-400 mr-1 mb-1">￥</span>
                <span className={`text-4xl font-black tracking-tight ${
                  plan.id === 'free' || plan.price == 0
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#2cc2f5] to-[#d946ef]'
                    : 'text-transparent bg-clip-text bg-gradient-to-r from-[#2cc2f5] to-[#d946ef]'
                }`}>
                  {plan.price}
                </span>
                <span className="text-xs text-gray-500 ml-1 mb-1">
                  {plan.period}
                </span>
              </div>
              <div className="h-4 flex items-center justify-center">
                {plan.nextMonthPrice && (
                  <p className="text-[10px] text-gray-500 font-medium">
                    下个月续费金额: ￥{plan.nextMonthPrice}
                  </p>
                )}
              </div>
            </div>

            {/* 按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPlan(plan);
              }}
              disabled={isButtonDisabled}
              style={
                !isButtonDisabled && plan.primaryColor
                  ? { backgroundColor: plan.primaryColor, color: 'white', opacity: 0.8 }
                  : {}
              }
              className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all mb-6 ${
                !isButtonDisabled && plan.primaryColor
                  ? 'hover:opacity-100 hover:shadow-lg'
                  : plan.isPopular
                  ? `bg-gradient-to-r from-[#a855f7] to-[#d946ef] text-white hover:shadow-lg hover:shadow-purple-500/25 ${!isButtonDisabled ? 'opacity-80 hover:opacity-100' : ''}`
                  : 'bg-[#2a3040] text-gray-300 hover:bg-[#353b4d] hover:text-white'
              } ${isButtonDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {plan.id !== 'free' && isButtonDisabled ? '到期后可购' : buttonLabel}
            </button>

            {/* 权益列表 */}
            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[250px]">
              {plan.features.map((feature, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <div className="mt-0.5 w-3 h-3 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-emerald-400" strokeWidth={3} />
                  </div>
                  <span className="text-[11px] font-medium leading-tight text-gray-400 text-left">
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
                );
              })}
            </div>
          </div>

          {!loadingConfig && config && (
            <div className="mt-4 pt-6 border-t border-white/5 shrink-0">
              <div className="flex items-end justify-between">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">支付方式</h4>
                  <div className="flex items-center space-x-3">
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

                <div className="space-y-4 ml-12 mr-auto">
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">订阅时长</h4>
                  <div className="flex items-center bg-[#0d1121] border border-white/10 rounded-xl p-1 w-fit shadow-inner">
                    <button
                      onClick={() => {
                        const val = typeof quantity === 'number' ? quantity : (Number(quantity) || 1);
                        setQuantity(Math.max(1, val - 1));
                      }}
                      disabled={Number(quantity) <= 1}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                        Number(quantity) <= 1 
                          ? 'text-gray-700 cursor-not-allowed' 
                          : 'text-gray-400 hover:text-white hover:bg-white/10 active:scale-95'
                      }`}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    
                    <div className="flex items-center justify-center px-3 min-w-[70px]">
                      <input
                        type="text"
                        value={quantity}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setQuantity('');
                            return;
                          }
                          // Only allow positive integers
                          if (!/^\d+$/.test(val)) return;
                          
                          const numVal = parseInt(val);
                          if (numVal > 20) {
                            setQuantity(20);
                          } else {
                            setQuantity(numVal);
                          }
                        }}
                        onBlur={() => {
                          let val = typeof quantity === 'number' ? quantity : parseInt(quantity);
                          if (isNaN(val) || val < 1) {
                            val = 1;
                          } else if (val > 20) {
                            val = 20;
                          }
                          setQuantity(val);
                        }}
                        className="w-12 bg-transparent text-center font-black text-lg text-white outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <span className="text-xs font-bold text-gray-500 ml-1 mt-1">
                        {billingCycle === 'yearly' ? '年' : '个月'}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        const val = typeof quantity === 'number' ? quantity : (Number(quantity) || 1);
                        setQuantity(Math.min(20, val + 1));
                      }}
                      disabled={Number(quantity) >= 20}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                        Number(quantity) >= 20 
                          ? 'text-gray-700 cursor-not-allowed' 
                          : 'text-gray-400 hover:text-white hover:bg-white/10 active:scale-95'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
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
                      className="h-14 px-10 rounded-2xl font-black text-sm tracking-widest bg-gradient-to-r from-[#eab308] to-[#ca8a04] text-white shadow-lg shadow-yellow-500/20 hover:scale-105 active:scale-95 transition-all opacity-90 hover:opacity-100"
                    >
                      查看账户
                    </button>
                  ) : (
                    <button
                      onClick={handlePay}
                      disabled={currentAmount <= 0 || !selectedPlan}
                      className={`h-14 px-10 rounded-2xl font-black text-sm tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95 ${
                        currentAmount <= 0 || !selectedPlan
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-[#2cc2f5] to-[#f472b6] text-white shadow-[#2cc2f5]/20 hover:shadow-[#2cc2f5]/40 opacity-90 hover:opacity-100'
                      }`}
                    >
                      立即购买
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
        </>
      )}

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

              <button
                onClick={() => setShowBankInfo(false)}
                className="w-full h-14 rounded-2xl font-black text-sm tracking-widest bg-white/5 hover:bg-white/10 text-white transition-all"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 兑换码弹窗 */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-800">
            <Ticket className="w-5 h-5 text-purple-600" />
            <span>兑换权益</span>
          </div>
        }
        open={redeemModalVisible}
        onCancel={() => setRedeemModalVisible(false)}
        footer={null}
        centered
        width={400}
        styles={{ mask: { backdropFilter: 'blur(4px)' } }}
      >
        <div className="pt-4 pb-2">
          <div className="mb-4">
            <p className="text-slate-500 text-sm mb-2">请输入您的邀请码或兑换码：</p>
            <Input
              placeholder="请输入代码"
              value={redeemCodeInput}
              onChange={e => setRedeemCodeInput(e.target.value)}
              size="large"
              onPressEnter={handleRedeem}
              className="font-mono"
            />
          </div>
          <Button 
            type="primary" 
            block 
            size="large" 
            loading={redeeming}
            onClick={handleRedeem}
            className="bg-gradient-to-r from-blue-600 to-purple-600 border-none hover:opacity-90 h-10 font-bold"
          >
            立即兑换
          </Button>
        </div>
      </Modal>

      {/* 错误提示弹窗 */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-red-600">
            <X className="w-5 h-5" />
            <span className="font-bold">兑换失败</span>
          </div>
        }
        open={errorModalVisible}
        onCancel={() => setErrorModalVisible(false)}
        footer={null}
        centered
        width={360}
        styles={{ mask: { backdropFilter: 'blur(4px)' } }}
      >
        <div className="pt-6 pb-2 px-2 text-center">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-slate-600 text-base mb-8 font-medium leading-relaxed">
            {errorMessage}
          </p>
          <Button 
            block 
            size="large" 
            onClick={() => setErrorModalVisible(false)}
            className="h-11 font-bold bg-slate-100 hover:bg-slate-200 border-none text-slate-600 rounded-xl"
          >
            我知道了
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default MembershipPanel;
