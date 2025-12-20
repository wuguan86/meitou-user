
import React, { useState } from 'react';
import { X, Heart, Copy, ImageIcon, Gem } from 'lucide-react';
import { Inspiration, PageType } from '../../types';

interface InspirationModalProps {
  work: Inspiration | null;
  onClose: () => void;
  onNavigate: (page: PageType) => void;
}

const InspirationModal: React.FC<InspirationModalProps> = ({ work, onClose, onNavigate }) => {
  const [copied, setCopied] = useState(false);

  if (!work) return null;

  const handleCopy = () => {
    if (work.prompt) {
      navigator.clipboard.writeText(work.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleMakeSimilar = () => {
      onClose();
      onNavigate('image-to-image');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in" onClick={onClose}>
      <div className="bg-[#0d1121] w-full max-w-6xl h-[90vh] max-h-[800px] rounded-[3rem] shadow-2xl flex overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
        <div className="w-3/5 bg-black relative group">
          <img src={work.img} alt={work.title} className="w-full h-full object-contain" />
        </div>
        <div className="w-2/5 flex flex-col p-10">
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-3">
                <img src={work.avatar} className="w-12 h-12 rounded-full border-2 border-white/10" alt={work.user} />
                <div>
                  <p className="font-bold text-white text-lg">{work.user}</p>
                  <p className="text-xs text-gray-500 font-mono">Creator ID: {work.id}</p>
                </div>
              </div>
            </div>
             <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-6">
            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                    <Heart className="w-5 h-5 text-[#ff2e8c]" />
                    <span className="font-bold text-lg">{work.likes}</span>
                </div>
                <div className="w-px h-6 bg-white/10"></div>
                {work.originalImageUrl && (
                    <div className="relative group/original">
                        <div className="w-10 h-10 rounded-md overflow-hidden border-2 border-white/10 cursor-pointer">
                            <img src={work.originalImageUrl} alt="原图" className="w-full h-full object-cover"/>
                        </div>
                        <div className="absolute bottom-full left-0 mb-2 w-48 h-48 bg-black border border-white/10 rounded-lg p-2 opacity-0 group-hover/original:opacity-100 transition-opacity pointer-events-none z-10">
                            <img src={work.originalImageUrl} alt="原图" className="w-full h-full object-cover rounded-md"/>
                        </div>
                    </div>
                )}
            </div>

            <div>
              <h3 className="text-2xl font-black text-white mb-2">{work.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{work.desc}</p>
            </div>

            <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Prompt</p>
                <p className="text-sm text-gray-300 font-mono leading-relaxed">{work.prompt}</p>
                <button onClick={handleCopy} className="mt-4 flex items-center space-x-2 text-xs font-black uppercase tracking-widest text-cyan-400 hover:text-white transition-colors">
                    <Copy className="w-3 h-3"/>
                    <span>{copied ? '已复制!' : '复制提示词'}</span>
                </button>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/5">
            <button onClick={handleMakeSimilar} className="w-full brand-gradient py-4 rounded-2xl font-black text-lg text-white shadow-xl glow-pink hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-3">
              <div className="w-5 h-5 brand-gradient rounded-full flex items-center justify-center"><Gem className="w-3 h-3 text-white"/></div>
              <span>一键制作同款</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InspirationModal;
