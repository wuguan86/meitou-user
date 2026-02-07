
import React, { useState, useEffect } from 'react';
import { User as UserIcon, ShieldCheck, Phone, Mail, Lock, Key, ChevronRight, X, Heart, Gift, Check } from 'lucide-react';
import { sendCode, loginByCode, loginByPassword, setPassword as apiSetPassword } from '../api/auth';
import { getCurrentSite } from '../api/site';
import { ApiError } from '../api';
import type { User, Site } from '../types';
import { SecureImage } from './SecureImage';

interface LoginProps {
  onLoginSuccess: (userData: Partial<User>) => void;
  siteConfig?: Site | null;
}

const DEFAULT_POLICY_TEXTS = {
  service: `用户服务协议\n\n1. 账号注册与使用\n您在注册 Meji AI 账号时，应当提供真实、准确、完整的个人资料。账号所有权归本公司所有，用户仅享有使用权...\n\n2. AI 生成内容规范\n您在使用 AI 工具生成的任何内容均需符合法律法规，不得利用本服务生成暴力、色情、侵权或其他非法信息...\n\n3. 知识产权保护\nMeji AI 尊重并致力于保护知识产权。您在平台创作的内容归属由法律及本协议具体条款界定...\n\n4. 免责声明\nAI 生成结果受算法及模型局限，本平台不保证生成内容的绝对准确性与适用性，由用户自行判断承担风险...\n\n5. 协议修改\n我们保留随时修改本协议的权利，修改后将在显著位置予以公示，继续使用即视为同意更新。`,
  privacy: `隐私政策\n\n1. 我们如何收集信息\n我们可能会收集您的手机号、邮箱、设备信息及创作日志。这些信息用于身份验证、服务优化及安全防御...\n\n2. 信息的使用与共享\n我们承诺不会向任何无关第三方披露您的个人信息，除非经法律许可或您的明确授权...\n\n3. 数据存储安全\nMeji AI 使用高级加密技术存储您的数据，并在服务器集群中实施多层防火墙机制...\n\n4. 您的权利\n您可以随时查询、更正或申请注销您的账号及关联隐私数据...\n\n5. 未成年人保护\n我们非常重视未成年人的隐私保护，若您为未成年人，请在监护人指导下使用本服务。`,
  notice: `AI功能使用须知\n\n1. 算法备案说明\nMeji AI 所有生成算法均已按国家要求完成相关备案公示，并在模型训练中采用了合规数据集...\n\n2. 标识要求\n根据相关法规，对于由 AI 深度合成生成的视频及精细图像，本平台可能会自动添加隐形水印或标识...\n\n3. 使用边界\n严禁利用本平台进行虚假新闻编造、恶意换脸、政治煽动等违规行为...\n\n4. 服务调用额度\n免费用户享有每日固定次数的生成额度，超出部分需通过积分兑换或会员订阅获取...`
};

const Modal = ({ isOpen, title, content, onClose }: { isOpen: boolean; title: string; content: string; onClose: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#151929] border border-white/10 w-full max-w-lg rounded-[2rem] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h3 className="text-xl font-black">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-8 overflow-y-auto max-h-[60vh] text-gray-400 text-sm leading-relaxed custom-scrollbar">
          {/* 支持HTML内容的显示 */}
          {content.includes('<') ? (
            <div 
              className="[&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-4 [&>h1]:text-xl [&>h1]:font-bold [&>h1]:mb-4 [&>h2]:text-lg [&>h2]:font-bold [&>h2]:mb-3 [&>h3]:font-bold [&>h3]:mb-2"
              dangerouslySetInnerHTML={{ __html: content }} 
            />
          ) : (
            content.split('\n').map((line, i) => <p key={i} className="mb-4">{line}</p>)
          )}
        </div>
        <div className="p-6 border-t border-white/5 flex justify-center">
          <button onClick={onClose} className="brand-gradient px-12 py-3 rounded-xl font-black text-sm hover:scale-105 transition-transform shadow-lg glow-pink">我已阅读并知悉</button>
        </div>
      </div>
    </div>
  );
};

const Login: React.FC<LoginProps> = ({ onLoginSuccess, siteConfig }) => {
  const [phone, setPhone] = useState(''); // 手机号
  const [code, setCode] = useState(''); // 验证码
  const [invitationCode, setInvitationCode] = useState(''); // 邀请码
  const [password, setPassword] = useState(''); // 密码（密码登录模式）
  const [loginMode, setLoginMode] = useState<'code' | 'password'>('code'); // 登录模式
  const [activeModal, setActiveModal] = useState<'service' | 'privacy' | 'notice' | null>(null); // 协议弹窗
  const [policyTexts, setPolicyTexts] = useState(DEFAULT_POLICY_TEXTS); // 协议内容
  const [countdown, setCountdown] = useState(0); // 验证码倒计时
  const [loading, setLoading] = useState(false); // 登录加载状态
  const [sendingCode, setSendingCode] = useState(false); // 发送验证码加载状态
  const [error, setError] = useState(''); // 错误提示
  
  // 加载站点配置
  useEffect(() => {
    if (siteConfig) {
      setPolicyTexts(prev => ({
        ...prev,
        service: siteConfig.userAgreement || prev.service,
        privacy: siteConfig.privacyPolicy || prev.privacy
      }));
    }
  }, [siteConfig]);

  
  // 设置密码相关状态
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempAuth, setTempAuth] = useState<{token: string, userId: string} | null>(null);

  // 倒计时效果 - 60秒后可以重新发送
  useEffect(() => {
    if (countdown > 0) {
      // 使用 setInterval 每秒钟更新倒计时
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            return 0; // 倒计时结束，可以重新发送
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer); // 清理定时器
    }
  }, [countdown]); // 当倒计时状态改变时重新设置定时器

  // 验证手机号格式
  const validatePhone = (phone: string): boolean => {
    return /^1[3-9]\d{9}$/.test(phone);
  };

  // 发送验证码
  const handleSendCode = async () => {
    // 验证手机号
    if (!phone.trim()) {
      setError('请输入手机号');
      return;
    }
    if (!validatePhone(phone)) {
      setError('手机号格式不正确');
      return;
    }

    setSendingCode(true);
    setError('');

    try {
      await sendCode({ phone: phone.trim() });
      setCountdown(60); // 设置60秒倒计时
    } catch (err: any) {
      setError(err.message || '发送验证码失败，请重试');
    } finally {
      setSendingCode(false);
    }
  };

  // 跳过设置密码
  const handleSkipPassword = () => {
    if (tempAuth && (tempAuth as any).userData) {
      const response = (tempAuth as any).userData;
      onLoginSuccess({
        id: response.userId.toString(),
        name: response.username || '创作官',
        points: response.balance || 0,
        phone: response.phone,
        email: response.email,
        category: response.category,
        isLoggedIn: true,
        createdAt: response.createdAt,
        avatarUrl: response.avatarUrl,
        company: response.company,
        wechat: response.wechat,
      });
    }
  };

  // 处理设置密码提交
  const handleSetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setError('请输入新密码');
      return;
    }
    if (newPassword.length < 6) {
      setError('密码长度至少为6位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    
    setLoading(true);
    try {
      await apiSetPassword({ password: newPassword });
      
      // 设置成功，完成登录流程
      if (tempAuth && (tempAuth as any).userData) {
          const response = (tempAuth as any).userData;
          onLoginSuccess({
            id: response.userId.toString(),
            name: response.username || '创作官',
            points: response.balance || 0,
            phone: response.phone,
            email: response.email,
            category: response.category,
            isLoggedIn: true,
            createdAt: response.createdAt,
            avatarUrl: response.avatarUrl,
            company: response.company,
            wechat: response.wechat,
          });
      }
    } catch (err: any) {
      setError(err.message || '设置密码失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 如果是验证码登录模式
    if (loginMode === 'code') {
      // 验证手机号
      if (!phone.trim()) {
        setError('请输入手机号');
        return;
      }
      if (!validatePhone(phone)) {
        setError('手机号格式不正确');
        return;
      }
      // 验证验证码
      if (!code.trim()) {
        setError('请输入验证码');
        return;
      }
      if (!/^\d{6}$/.test(code)) {
        setError('验证码格式不正确');
        return;
      }

      setLoading(true);

      try {
        const response = await loginByCode({
          phone: phone.trim(),
          code: code.trim(),
          invitationCode: invitationCode.trim() || undefined,
        });

        // 检查是否是新用户
        if (response.isNewUser) {
            setIsSettingPassword(true);
            setTempAuth({
                token: response.token,
                userId: response.userId.toString(),
                userData: response
            } as any);
            return;
        }

        // 登录成功，调用回调函数
        onLoginSuccess({
          id: response.userId.toString(),
          name: response.username || '创作官',
          points: response.balance || 0,
          phone: response.phone,
          email: response.email,
          category: response.category, // 保存站点分类
          isLoggedIn: true,
          createdAt: response.createdAt,
          avatarUrl: response.avatarUrl,
          company: response.company,
          wechat: response.wechat,
        });
      } catch (err: any) {
        setError(err.message || '登录失败，请重试');
      } finally {
        setLoading(false);
      }
    } else {
      if (!phone.trim()) {
        setError('请输入手机号');
        return;
      }
      if (!validatePhone(phone)) {
        setError('手机号格式不正确');
        return;
      }
      if (!password.trim()) {
        setError('请输入密码');
        return;
      }
      if (password.trim().length < 6) {
        setError('密码长度至少为6位');
        return;
      }

      setLoading(true);
      try {
        const response = await loginByPassword({
          phone: phone.trim(),
          password: password.trim(),
        });
        onLoginSuccess({
          id: response.userId.toString(),
          name: response.username || '创作官',
          points: response.balance || 0,
          phone: response.phone,
          email: response.email,
          category: response.category,
          isLoggedIn: true,
          createdAt: response.createdAt,
          avatarUrl: response.avatarUrl,
          company: response.company,
          wechat: response.wechat,
        });
      } catch (err: any) {
        if (err instanceof ApiError) {
          if (err.code === 1001) {
             // 密码错误，清空密码框
             setPassword('');
          }
        }
        setError(err.message || '登录失败，请重试');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#060813] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#2cc2f5]/10 blur-[180px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#ff2e8c]/10 blur-[180px] rounded-full"></div>
      </div>

      <div className="w-full max-w-[500px] relative z-10">
        <div className="bg-[#0d1121]/90 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-12 shadow-[0_20px_80px_rgba(0,0,0,0.5)]">
          <div className="text-center mb-10">
            {siteConfig?.logo && (
                <div className="flex justify-center mb-6">
                    <SecureImage src={siteConfig.logo} alt="Logo" className="h-20 w-auto object-contain" />
                </div>
            )}
            <h1 className="text-4xl font-black tracking-tighter mb-2">{siteConfig?.websiteName || '美迹AI'}</h1>
            <p className="brand-text-gradient font-bold tracking-widest text-[13px]">{siteConfig?.loginSubtext || '赋能美的无限可能'}</p>
          </div>

          {isSettingPassword ? (
            // 设置密码界面
            <form onSubmit={handleSetPasswordSubmit} className="space-y-5">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">欢迎加入</h2>
                <p className="text-gray-400 text-sm">为了您的账号安全，请设置登录密码</p>
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 text-red-400 text-sm font-bold">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#2cc2f5] transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input 
                    type="password" 
                    placeholder="设置新密码 (至少6位)" 
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setError('');
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 outline-none focus:border-[#2cc2f5] transition-all text-white placeholder:text-gray-600 font-bold"
                  />
                </div>
                
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#2cc2f5] transition-colors">
                    <Check className="w-5 h-5" />
                  </div>
                  <input 
                    type="password" 
                    placeholder="确认新密码" 
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError('');
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 outline-none focus:border-[#2cc2f5] transition-all text-white placeholder:text-gray-600 font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-2">
                <button 
                  type="button"
                  onClick={handleSkipPassword}
                  className="text-[#6366f1] text-sm font-bold hover:text-[#818cf8] transition-colors"
                >
                  稍后设置&gt;&gt;&gt;
                </button>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full brand-gradient py-5 mt-4 rounded-2xl font-black text-white shadow-xl glow-pink hover:scale-[1.02] active:scale-[0.98] transition-all tracking-[0.2em] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '保存中...' : '完 成 设 置'}
              </button>
            </form>
          ) : (
            <>
              <div className="flex bg-white/5 p-1 rounded-2xl mb-8">
                <button 
                  onClick={() => setLoginMode('code')}
                  className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${loginMode === 'code' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  验证码
                </button>
                <button 
                  onClick={() => setLoginMode('password')}
                  className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${loginMode === 'password' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  密码登录
                </button>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                {/* 错误提示 */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-3 text-red-400 text-sm font-bold">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  {/* 手机号输入 */}
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#2cc2f5] transition-colors">
                      <Phone className="w-5 h-5" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="手机号" 
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setError(''); // 清除错误提示
                      }}
                      maxLength={11}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 outline-none focus:border-[#2cc2f5] transition-all text-white placeholder:text-gray-600 font-bold"
                    />
                  </div>

                  {/* 验证码或密码输入 */}
                  {loginMode === 'code' ? (
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#2cc2f5] transition-colors">
                        <Key className="w-5 h-5" />
                      </div>
                      <input 
                        type="text" 
                        placeholder="输入验证码" 
                        value={code}
                        onChange={(e) => {
                          setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); // 只允许数字，最多6位
                          setError(''); // 清除错误提示
                        }}
                        maxLength={6}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-32 outline-none focus:border-[#2cc2f5] transition-all text-white placeholder:text-gray-600 font-bold"
                      />
                      <button 
                        type="button" 
                        onClick={handleSendCode}
                        disabled={countdown > 0 || sendingCode || !validatePhone(phone)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2cc2f5] font-black text-xs hover:text-white uppercase tracking-widest disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                      >
                        {countdown > 0 ? `${countdown}秒后可重新发送` : sendingCode ? '发送中...' : '获取验证码'}
                      </button>
                    </div>
                  ) : (
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#2cc2f5] transition-colors">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input 
                        type="password" 
                        placeholder="输入密码" 
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError(''); // 清除错误提示
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 outline-none focus:border-[#2cc2f5] transition-all text-white placeholder:text-gray-600 font-bold"
                      />
                    </div>
                  )}

                  {/* 邀请码输入 */}
                  <div className="relative group">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-400 transition-colors">
                      <Gift className="w-5 h-5" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="邀请码 (选填)" 
                      value={invitationCode}
                      onChange={(e) => setInvitationCode(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 outline-none focus:border-pink-400/50 transition-all text-white placeholder:text-gray-600 font-bold"
                    />
                  </div>
                </div>

                {/* 登录按钮 */}
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full brand-gradient py-5 mt-4 rounded-2xl font-black text-white shadow-xl glow-pink hover:scale-[1.02] active:scale-[0.98] transition-all tracking-[0.2em] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '登录中...' : '即 刻 开 始'}
                </button>

                <div className="text-center text-[11px] px-2 pt-2">
                  <p className="text-gray-500 leading-relaxed font-bold">
                    登录即代表同意 
                    <span onClick={() => setActiveModal('service')} className="text-[#2cc2f5] hover:text-white cursor-pointer">《用户协议》</span> 和 
                    <span onClick={() => setActiveModal('privacy')} className="text-[#2cc2f5] hover:text-white cursor-pointer">《隐私政策》</span>
                  </p>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      <Modal 
        isOpen={!!activeModal} 
        title={activeModal ? (activeModal === 'service' ? '服务协议' : activeModal === 'privacy' ? '隐私政策' : '使用须知') : ''} 
        content={activeModal ? policyTexts[activeModal] : ''} 
        onClose={() => setActiveModal(null)} 
      />

      {/* Copyright Footer */}
      <div className="absolute bottom-6 left-0 w-full text-center z-10">
        <p className="text-[#3b4b6c] text-[10px] font-bold tracking-[0.1em] uppercase">
          {siteConfig?.footerCopyright || 'COPYRIGHT © 2025 MEITOU TECH. RESEARCH INSTITUTE.'}
        </p>
      </div>
    </div>
  );
};

export default Login;
