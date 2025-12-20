
import React, { useState } from 'react';
import { X, Send, CheckSquare, Square, Image as ImageIcon, FileText } from 'lucide-react';
import { AssetNode } from '../../types';

interface PublishModalProps {
  asset: AssetNode;
  onClose: () => void;
}

const PublishModal: React.FC<PublishModalProps> = ({ asset, onClose }) => {
  const [title, setTitle] = useState(asset.name);
  const [description, setDescription] = useState('');
  const [sharePrompt, setSharePrompt] = useState(true);
  const [shareOriginal, setShareOriginal] = useState(true);

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in" onClick={onClose}>
      <div className="bg-[#0d1121] w-full max-w-4xl rounded-[3rem] shadow-2xl flex overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
        <div className="w-1/2 bg-black relative">
          {asset.type === 'image' && <img src={asset.url} alt={asset.name} className="w-full h-full object-contain" />}
          {asset.type === 'video' && <video src={asset.url} controls className="w-full h-full object-contain" />}
        </div>
        <div className="w-1/2 flex flex-col p-10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black text-white">发布到灵感广场</h3>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 space-y-6">
            <div>
              <label className="text-xs font-bold text-gray-400 mb-2 block">标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-cyan-500 text-white font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 mb-2 block">描述</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="分享你的创作心得..."
                className="w-full h-40 bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-cyan-500 text-white font-medium resize-none placeholder:text-gray-600"
              />
            </div>
            <div className="space-y-4">
              <button onClick={() => setSharePrompt(!sharePrompt)} className="flex items-center space-x-3 text-gray-300 hover:text-white">
                {sharePrompt ? <CheckSquare className="w-5 h-5 text-cyan-400" /> : <Square className="w-5 h-5 text-gray-600" />}
                <div className="flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-bold">同步分享提示词</span>
                </div>
              </button>
              <button onClick={() => setShareOriginal(!shareOriginal)} className="flex items-center space-x-3 text-gray-300 hover:text-white">
                {shareOriginal ? <CheckSquare className="w-5 h-5 text-cyan-400" /> : <Square className="w-5 h-5 text-gray-600" />}
                <div className="flex items-center space-x-1.5">
                  <ImageIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-bold">同步分享原图</span>
                </div>
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5">
            <button 
              onClick={onClose}
              className="w-full brand-gradient py-4 rounded-2xl font-black text-lg text-white shadow-xl glow-pink hover:scale-[1.02] transition-all flex items-center justify-center space-x-3">
              <Send className="w-5 h-5" />
              <span>确认发布</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublishModal;
