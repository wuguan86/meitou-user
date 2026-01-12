
import React, { useEffect, useMemo, useState } from 'react';
import { X, User, Phone, Mail, Building, Lock, ShieldCheck, Camera } from 'lucide-react';
import { User as UserType } from '../../types';
import { changePassword, updateProfile, uploadAvatar, sendCode } from '../../api/auth';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  onUpdate: (info: Partial<UserType>) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onUpdate }) => {
  if (!isOpen) return null;
  
  const [nickname, setNickname] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [company, setCompany] = useState(user.company || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<'password' | 'sms'>('password');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNickname(user.name || '');
    // 如果邮箱包含手机号且包含 meitou，认为是默认生成的，不显示
    const isDefaultEmail = user.email && user.phone && user.email.includes(user.phone) && user.email.includes('meitou');
    setEmail(isDefaultEmail ? '' : (user.email || ''));
    setCompany(user.company || '');
    setAvatarFile(null);
    setIsChangingPassword(false);
    setVerificationMethod('password');
    setCode('');
    setCountdown(0);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setLoading(false);
  }, [isOpen, user.id]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    if (countdown > 0) return;
    try {
      await sendCode({ phone: user.phone });
      setCountdown(60);
      setError('');
    } catch (e: any) {
      setError(e?.message || '发送验证码失败');
    }
  };

  const avatarPreviewUrl = useMemo(() => {
    if (!avatarFile) return null;
    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('仅支持图片格式');
      return;
    }
    setError('');
    setAvatarFile(file);
  };

  const handleSave = async () => {
    setError('');

    if (!nickname.trim()) {
      setError('请输入账号昵称');
      return;
    }
    // 邮箱不再是必填项
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('邮箱格式不正确');
      return;
    }
    if (isChangingPassword && (newPassword || confirmPassword || oldPassword || code)) {
      if (!newPassword.trim()) {
        setError('请输入新密码');
        return;
      }
      if (newPassword.length < 6) {
        setError('密码长度至少为6位');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('两次输入的新密码不一致');
        return;
      }
      if (verificationMethod === 'password' && !oldPassword.trim()) {
        // 如果是旧密码验证，且未输入旧密码（注意：如果用户没有设置过密码，后端会判断，但前端这里可以先放行，或者根据是否有密码来判断。
        // 不过目前的逻辑是：如果输入了新密码，就必须输入旧密码（除非是第一次设置，但这里是修改）。
        // 实际上后端 logic: if user has password, oldPassword is required.
        // 前端简单处理：如果选了旧密码验证，尽量填。
      }
      if (verificationMethod === 'sms' && !code.trim()) {
        setError('请输入验证码');
        return;
      }
    }

    setLoading(true);
    try {
      let nextAvatarUrl: string | undefined = user.avatarUrl;
      if (avatarFile) {
        nextAvatarUrl = await uploadAvatar(avatarFile);
      }

      const profileResponse = await updateProfile({
        username: nickname.trim(),
        email: email.trim(),
        company: company.trim(),
      });

      if (isChangingPassword && newPassword.trim()) {
        await changePassword({
          oldPassword: verificationMethod === 'password' ? (oldPassword.trim() || undefined) : undefined,
          newPassword: newPassword.trim(),
          code: verificationMethod === 'sms' ? code.trim() : undefined,
        });
      }

      onUpdate({
        name: profileResponse.username || nickname.trim(),
        email: profileResponse.email ?? email.trim(),
        company: profileResponse.company ?? company,
        avatarUrl: profileResponse.avatarUrl ?? nextAvatarUrl,
      });

      onClose();
    } catch (e: any) {
      setError(e?.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in">
      <div className="bg-[#0d1121] border border-white/10 w-full max-w-xl rounded-[3rem] overflow-hidden flex flex-col shadow-2xl relative max-h-[90vh]">
        <button onClick={onClose} className="absolute top-8 right-8 z-10 p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>

        <div className="p-8 md:p-12 overflow-y-auto flex-1 w-full custom-scrollbar">
          <div className="flex items-center space-x-6 mb-8 md:mb-12">
            <div className="relative group">
              <img 
                src={avatarPreviewUrl || user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                className="w-24 h-24 rounded-[2rem] border-4 border-cyan-500/20" 
                alt="Avatar" 
                referrerPolicy="no-referrer"
              />
               <label className="absolute inset-0 bg-black/50 rounded-[1.75rem] flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-8 h-8" />
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
              </label>
            </div>
            <div>
              <h2 className="text-3xl font-black">{nickname || user.name}</h2>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-2xl p-4 text-red-400 text-sm font-bold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6">
             <div className="space-y-2">
               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">账号昵称</label>
               <div className="relative group">
                 <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-cyan-400" />
                 <input 
                  type="text" 
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-cyan-500 transition-all text-sm font-bold"
                 />
               </div>
             </div>

             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">注册手机</label>
                  <div className="relative opacity-60">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input type="text" value={user.phone} readOnly className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold cursor-not-allowed" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">
                    注册邮箱
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-cyan-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-cyan-500 transition-all text-sm font-bold"
                    />
                  </div>
                </div>
             </div>

             <div className="space-y-2">
               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">所属组织 / 公司</label>
               <div className="relative group">
                 <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-cyan-400" />
                 <input 
                  type="text" 
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-cyan-500 transition-all text-sm font-bold"
                 />
               </div>
             </div>

             <div className="mt-2 grid grid-cols-1 gap-4">
               <button
                 type="button"
                 onClick={() => {
                   if (isChangingPassword) {
                     setIsChangingPassword(false);
                     setOldPassword('');
                     setNewPassword('');
                     setConfirmPassword('');
                     return;
                   }
                   setIsChangingPassword(true);
                 }}
                 className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 outline-none hover:border-cyan-500 transition-all text-sm font-black flex items-center justify-center gap-2"
               >
                 <Lock className="w-4 h-4 text-cyan-400" />
                 {isChangingPassword ? '取消修改密码' : '修改密码'}
               </button>
               {isChangingPassword && (
                 <>
                   {/* 验证方式切换 Tab */}
                   <div className="flex bg-black/20 rounded-xl p-1 mb-2">
                       <button
                         type="button"
                         onClick={() => setVerificationMethod('password')}
                         className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                           verificationMethod === 'password' 
                             ? 'bg-cyan-500/20 text-cyan-400 shadow-lg' 
                             : 'text-gray-500 hover:text-gray-300'
                         }`}
                       >
                         旧密码验证
                       </button>
                       <button
                         type="button"
                         onClick={() => setVerificationMethod('sms')}
                         className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                           verificationMethod === 'sms' 
                             ? 'bg-cyan-500/20 text-cyan-400 shadow-lg' 
                             : 'text-gray-500 hover:text-gray-300'
                         }`}
                       >
                         短信验证
                       </button>
                   </div>

                   {verificationMethod === 'password' ? (
                     <div className="relative group">
                       <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-cyan-400" />
                       <input
                         type="password"
                         placeholder="旧密码（未设置可留空）"
                         value={oldPassword}
                         onChange={(e) => setOldPassword(e.target.value)}
                         className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-cyan-500 transition-all text-sm font-bold placeholder:text-gray-600"
                       />
                     </div>
                   ) : (
                      <div className="relative group flex gap-2">
                         <div className="relative flex-1">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-cyan-400" />
                            <input
                              type="text"
                              placeholder="验证码"
                              value={code}
                              onChange={(e) => setCode(e.target.value)}
                              className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-cyan-500 transition-all text-sm font-bold placeholder:text-gray-600"
                            />
                         </div>
                         <button
                           type="button"
                           onClick={handleSendCode}
                           disabled={countdown > 0}
                           className="bg-white/5 border border-white/5 rounded-2xl px-6 text-xs font-bold text-cyan-400 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]"
                         >
                           {countdown > 0 ? `${countdown}s` : '发送验证码'}
                         </button>
                      </div>
                   )}

                   <div className="relative group">
                     <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-cyan-400" />
                     <input
                       type="password"
                       placeholder="新密码（至少6位）"
                       value={newPassword}
                       onChange={(e) => setNewPassword(e.target.value)}
                       className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-cyan-500 transition-all text-sm font-bold placeholder:text-gray-600"
                     />
                   </div>
                   <div className="relative group">
                     <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-cyan-400" />
                     <input
                       type="password"
                       placeholder="确认新密码"
                       value={confirmPassword}
                       onChange={(e) => setConfirmPassword(e.target.value)}
                       className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-cyan-500 transition-all text-sm font-bold placeholder:text-gray-600"
                     />
                   </div>
                 </>
               )}
             </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between">
             <div className="flex items-center space-x-2 text-[10px] text-gray-600 font-black uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4 text-cyan-500" />
                <span>数据已加密处理，手机不支持自助修改</span>
             </div>
             <button
               onClick={handleSave}
               disabled={loading}
               className="brand-gradient px-10 py-3 rounded-xl font-black text-sm hover:scale-105 transition-transform shadow-lg glow-pink disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {loading ? '保存中...' : '确认保存'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
