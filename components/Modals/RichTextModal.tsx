import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface RichTextModalProps {
  content: string;
  onClose: () => void;
  title?: string;
}

const RichTextModal: React.FC<RichTextModalProps> = ({ content, onClose, title = "详情内容" }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 禁止背景滚动
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in p-4 sm:p-6" 
      onClick={onClose}
    >
      <div 
        className="bg-[#0d1121] w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/10" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#0d1121] sticky top-0 z-10">
          <h3 className="text-lg sm:text-xl font-black text-white">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar">
          <div 
            className="prose prose-invert prose-base max-w-none text-gray-300
              prose-headings:text-white prose-a:text-cyan-400 hover:prose-a:text-cyan-300
              prose-strong:text-white prose-code:text-cyan-300
              prose-img:rounded-xl prose-img:shadow-lg
              [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-[#0d1121]/95 backdrop-blur-sm flex justify-end">
             <button 
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-all"
            >
              关闭
            </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RichTextModal;
