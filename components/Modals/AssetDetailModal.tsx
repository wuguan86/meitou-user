
import React from 'react';
import { X, Download, RefreshCw, Send } from 'lucide-react';
import { AssetNode } from '../../types';

interface AssetDetailModalProps {
  asset: AssetNode;
  onClose: () => void;
  onPublish: () => void;
  // 是否显示发布和重绘按钮（从资产选择的图片不显示，生成的图片显示）
  showActions?: boolean;
}

const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ asset, onClose, onPublish, showActions = true }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in" onClick={onClose}>
      <div className="bg-[#0d1121] w-full max-w-4xl rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 bg-white/5">
          <h3 className="text-xl font-bold text-white">{asset.name}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 p-8 flex items-center justify-center bg-black">
          {asset.type === 'image' && <img src={asset.url} alt={asset.name} className="max-h-[60vh] object-contain rounded-lg" />}
          {asset.type === 'video' && <video src={asset.url} controls className="max-h-[60vh] rounded-lg" />}
        </div>
        <div className="p-6 bg-[#151929] border-t border-white/5 flex items-center justify-between">
          {showActions ? (
            <>
              <div className="flex items-center space-x-4">
                <button className="flex items-center space-x-2 text-sm font-bold text-gray-400 hover:text-white">
                  <RefreshCw className="w-4 h-4" />
                  <span>重绘</span>
                </button>
                <button className="flex items-center space-x-2 text-sm font-bold text-gray-400 hover:text-white">
                  <Download className="w-4 h-4" />
                  <span>下载</span>
                </button>
              </div>
              <button 
                onClick={onPublish}
                className="brand-gradient px-8 py-3 rounded-xl font-black text-sm text-white shadow-lg glow-pink hover:scale-105 transition-transform flex items-center space-x-2">
                <Send className="w-4 h-4" />
                <span>发布</span>
              </button>
            </>
          ) : (
            // 从资产选择的图片只显示下载按钮
            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 text-sm font-bold text-gray-400 hover:text-white">
                <Download className="w-4 h-4" />
                <span>下载</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetDetailModal;
