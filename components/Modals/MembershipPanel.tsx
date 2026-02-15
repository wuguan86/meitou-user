import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { message, QRCode } from 'antd';
import { Check, Loader2, Gem, CreditCard, Wallet, Landmark, X, ShieldCheck } from 'lucide-react';
import { User } from '../../types';
import { getMembershipPackages, MembershipPackage } from '../../api/membershipPackage';
import { createMembershipOrder, getMembershipStatus, MembershipStatusResponse } from '../../api/membership';
import { getRechargeConfig, queryOrder, RechargeConfigResponse, RechargeOrderResponse } from '../../api/recharge';
import { getCurrentUser } from '../../api/auth';

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
}

interface MembershipPanelProps {
  user: User;
  onUpdatePoints: (p: number) => void;
  onUpdateUserBalance?: (balance: number) => void;
  onClose: () => void;
}

const MembershipPanel: React.FC<MembershipPanelProps> = ({ user, onUpdatePoints, onUpdateUserBalance, onClose }) => {
  const [billingCycle, setBillingCycle] = useState<'yearly' | 'monthly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<MembershipPackage[]>([]);
  const [config, setConfig] = useState<RechargeConfigResponse | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatusResponse | null>(null);

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentType, setPaymentType] = useState<'wechat' | 'alipay' | 'bank_transfer'>('wechat');
  const [isPaying, setIsPaying] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<RechargeOrderResponse | null>(null);
  const [paymentQrCode, setPaymentQrCode] = useState<string | null>(null);
  const [showBankInfo, setShowBankInfo] = useState(false);

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
    } catch (e) {
      setMembershipStatus(null);
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
    if (billingCycle === 'yearly') {
      return Number((isOldUser ? selectedPackage.yearlyPrice : (selectedPackage.yearlyDiscountPrice || selectedPackage.yearlyPrice)) || 0);
    }
    return Number((isOldUser ? selectedPackage.monthlyPrice : (selectedPackage.monthlyDiscountPrice || selectedPackage.monthlyPrice)) || 0);
  }, [selectedPackage, billingCycle, isOldUser]);

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
            }
            const delta = userInfo.balance - user.points;
            if (delta !== 0) {
              onUpdatePoints(delta);
            }
          } catch (e) {
            console.error('刷新用户余额失败:', e);
          }

          await loadMembershipStatus();

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
            <button className="group flex items-center space-x-2 bg-[#151923] border border-[#2cc2f5]/20 rounded-full px-4 py-1.5 hover:border-[#2cc2f5]/40 transition-all">
              <Gem className="w-3.5 h-3.5 text-[#2cc2f5]" />
              <span className="text-xs text-gray-400 font-medium group-hover:text-gray-300 transition-colors">
                使用邀请码进行首次订阅，获得额外积分。 <span className="text-white font-bold underline decoration-1 underline-offset-2">立即填写 &gt;</span>
              </span>
            </button>

            <div className="bg-[#0d1121] p-1 rounded-full flex space-x-1 border border-white/5">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-gradient-to-r from-[#2cc2f5] to-[#d946ef] text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                月付
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
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
                const buttonLabel = isActiveSameType ? '续费' : plan.buttonText;
                return (
                  <div
                    key={plan.packageId}
                    onClick={() => !isActiveOtherType && setSelectedPlan(plan)}
                    className={`flex flex-col p-5 rounded-2xl border transition-all duration-300 relative group ${
                      !isActiveOtherType ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
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
              disabled={isActiveOtherType}
              className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all mb-6 ${
                plan.isPopular
                  ? 'bg-gradient-to-r from-[#a855f7] to-[#d946ef] text-white hover:shadow-lg hover:shadow-purple-500/25'
                  : 'bg-[#2a3040] text-gray-300 hover:bg-[#353b4d] hover:text-white'
              } ${isActiveOtherType ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isActiveOtherType ? '到期后可购' : buttonLabel}
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
                      disabled={currentAmount <= 0 || !selectedPlan}
                      className={`h-14 px-10 rounded-2xl font-black text-sm tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95 ${
                        currentAmount <= 0 || !selectedPlan
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-[#2cc2f5] to-[#f472b6] text-white shadow-[#2cc2f5]/20 hover:shadow-[#2cc2f5]/40'
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
    </div>
  );
};

export default MembershipPanel;
