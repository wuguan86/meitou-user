
import React, { useState } from 'react';
import { User, ShieldCheck, Phone, Mail, Lock, Key, ChevronRight, X, Heart, Gift } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (userData: Partial<User>) => void;
}

const POLICY_TEXTS = {
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
          {content.split('\n').map((line, i) => <p key={i} className="mb-4">{line}</p>)}
        </div>
        <div className="p-6 border-t border-white/5 flex justify-center">
          <button onClick={onClose} className="brand-gradient px-12 py-3 rounded-xl font-black text-sm hover:scale-105 transition-transform shadow-lg glow-pink">我已阅读并知悉</button>
        </div>
      </div>
    </div>
  );
};

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [loginMode, setLoginMode] = useState<'code' | 'password'>('code');
  const [activeModal, setActiveModal] = useState<'service' | 'privacy' | 'notice' | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginSuccess({ name: identifier || '创作官' });
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
            <div className="inline-flex items-center justify-center w-20 h-20 brand-gradient rounded-3xl shadow-2xl glow-pink mb-6 relative group">
               <span className="text-4xl font-black text-white italic">Meji</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter mb-2">美迹AI</h1>
            <p className="brand-text-gradient font-bold tracking-widest text-[13px]">赋能美的无限可能</p>
          </div>

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
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#2cc2f5] transition-colors">
                  <Phone className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  placeholder="手机号 / 邮箱" 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 outline-none focus:border-[#2cc2f5] transition-all text-white placeholder:text-gray-600 font-bold"
                />
              </div>

              {loginMode === 'code' ? (
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#2cc2f5] transition-colors">
                    <Key className="w-5 h-5" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="输入验证码" 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-32 outline-none focus:border-[#2cc2f5] transition-all text-white placeholder:text-gray-600 font-bold"
                  />
                  <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-[#2cc2f5] font-black text-xs hover:text-white uppercase tracking-widest">获取验证码</button>
                </div>
              ) : (
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#2cc2f5] transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input 
                    type="password" 
                    placeholder="输入密码" 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 outline-none focus:border-[#2cc2f5] transition-all text-white placeholder:text-gray-600 font-bold"
                  />
                </div>
              )}

              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-400 transition-colors">
                  <Gift className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  placeholder="邀请码 (选填)" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 outline-none focus:border-pink-400/50 transition-all text-white placeholder:text-gray-600 font-bold"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full brand-gradient py-5 mt-4 rounded-2xl font-black text-white shadow-xl glow-pink hover:scale-[1.02] active:scale-[0.98] transition-all tracking-[0.2em]"
            >
              即 刻 开 始
            </button>

            <div className="text-center text-[11px] px-2 pt-2">
              <p className="text-gray-500 leading-relaxed font-bold">
                登录即代表同意 
                <span onClick={() => setActiveModal('service')} className="text-[#2cc2f5] hover:text-white cursor-pointer">《用户协议》</span> 和 
                <span onClick={() => setActiveModal('privacy')} className="text-[#2cc2f5] hover:text-white cursor-pointer">《隐私政策》</span>
              </p>
            </div>
          </form>
        </div>
      </div>

      <Modal 
        isOpen={!!activeModal} 
        title={activeModal ? (activeModal === 'service' ? '服务协议' : activeModal === 'privacy' ? '隐私政策' : '使用须知') : ''} 
        content={activeModal ? POLICY_TEXTS[activeModal] : ''} 
        onClose={() => setActiveModal(null)} 
      />
    </div>
  );
};

export default Login;
