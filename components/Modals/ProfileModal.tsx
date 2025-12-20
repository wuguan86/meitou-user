
import React from 'react';
import { X, User, Phone, Mail, Building, Lock, ShieldCheck, UserCircle, Camera } from 'lucide-react';
import { User as UserType } from '../../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  onUpdate: (info: Partial<UserType>) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onUpdate }) => {
  if (!isOpen) return null;
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        console.log("New avatar would be uploaded:", ev.target?.result);
        // In a real app, you would upload and get a URL, then:
        // onUpdate({ avatarUrl: newUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in">
      <div className="bg-[#0d1121] border border-white/10 w-full max-w-xl rounded-[3rem] overflow-hidden flex flex-col shadow-2xl relative">
        <button onClick={onClose} className="absolute top-8 right-8 p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>

        <div className="p-12">
          <div className="flex items-center space-x-6 mb-12">
            <div className="relative group">
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                className="w-24 h-24 rounded-[2rem] border-4 border-cyan-500/20" 
                alt="Avatar" 
              />
               <label className="absolute inset-0 bg-black/50 rounded-[1.75rem] flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="w-8 h-8" />
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
              </label>
            </div>
            <div>
              <h2 className="text-3xl font-black">{user.name}</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
             <div className="space-y-2">
               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">账号昵称</label>
               <div className="relative group">
                 <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-cyan-400" />
                 <input 
                  type="text" 
                  value={user.name}
                  onChange={(e) => onUpdate({ name: e.target.value })}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-cyan-500 transition-all text-sm font-bold"
                 />
               </div>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">用户名</label>
                <div className="relative opacity-60">
                  <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input type="text" value={user.id} readOnly className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold cursor-not-allowed" />
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
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">注册邮箱</label>
                  <div className="relative opacity-60">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input type="text" value={user.email} readOnly className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold cursor-not-allowed" />
                  </div>
                </div>
             </div>

             <div className="space-y-2">
               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">所属组织 / 公司</label>
               <div className="relative group">
                 <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-cyan-400" />
                 <input 
                  type="text" 
                  value={user.company}
                  onChange={(e) => onUpdate({ company: e.target.value })}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-cyan-500 transition-all text-sm font-bold"
                 />
               </div>
             </div>

             <div className="space-y-2">
               <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">访问密码</label>
               <div className="relative group">
                 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-cyan-400" />
                 <input 
                  type="password" 
                  defaultValue={user.password}
                  onChange={(e) => onUpdate({ password: e.target.value })}
                  className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-cyan-500 transition-all text-sm font-bold"
                 />
               </div>
             </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between">
             <div className="flex items-center space-x-2 text-[10px] text-gray-600 font-black uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4 text-cyan-500" />
                <span>数据已加密处理，手机及邮箱不支持自助修改</span>
             </div>
             <button onClick={onClose} className="brand-gradient px-10 py-3 rounded-xl font-black text-sm hover:scale-105 transition-transform shadow-lg glow-pink">确认保存</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
