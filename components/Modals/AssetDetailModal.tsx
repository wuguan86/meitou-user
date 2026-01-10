
import React from 'react';
import { X, Download, RefreshCw, Send, Sparkles } from 'lucide-react';
import { message } from 'antd';
import { AssetNode, PageType } from '../../types';

interface AssetDetailModalProps {
  asset: AssetNode;
  onClose: () => void;
  onPublish: () => void;
  onNavigate?: (page: PageType) => void;
  // 是否显示发布和重绘按钮（从资产选择的图片不显示，生成的图片显示）
  showActions?: boolean;
}

const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ asset, onClose, onPublish, onNavigate, showActions = true }) => {
  const params = React.useMemo(() => {
    if (!asset.generationParams) return null;
    try {
      return JSON.parse(asset.generationParams);
    } catch (e) {
      console.error('Failed to parse generation params:', e);
      return null;
    }
  }, [asset.generationParams]);

  const handleDownload = async () => {
    try {
      const response = await fetch(asset.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // 简单判断后缀
      const ext = asset.type === 'video' ? 'mp4' : 'png';
      link.download = `${asset.name || 'download'}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('下载已开始');
    } catch (error) {
      console.error('Download failed:', error);
      // 降级处理：直接在新窗口打开，不显示错误提示，因为通常是跨域问题导致的，新窗口打开可以正常下载
      window.open(asset.url, '_blank');
    }
  };

  const handleRedraw = () => {
    if (!onNavigate) return;
    
    // 如果没有生成配置，无法重绘
    if (!asset.generationType || !asset.generationConfig) {
      // 尝试解析 generationParams
      if (asset.generationParams && asset.generationType) {
        try {
           const config = JSON.parse(asset.generationParams);
           localStorage.setItem('makeSimilarConfig', JSON.stringify({
             generationType: asset.generationType,
             config: config,
           }));
        } catch (e) {
           message.warning('该作品缺少生成配置信息，无法重绘');
           return;
        }
      } else {
        message.warning('该作品缺少生成配置信息，无法重绘');
        return;
      }
    } else {
      // 将配置参数保存到localStorage，供生成工具组件使用
      try {
        localStorage.setItem('makeSimilarConfig', JSON.stringify({
          generationType: asset.generationType,
          config: asset.generationConfig,
        }));
      } catch (e) {
        console.error('保存配置参数失败:', e);
      }
    }
    
    // 根据生成类型跳转到对应的生成工具页面
    let targetPage: PageType;
    switch (asset.generationType) {
      case 'txt2img':
        targetPage = 'text-to-image';
        break;
      case 'img2img':
        targetPage = 'image-to-image';
        break;
      case 'txt2video':
        targetPage = 'text-to-video';
        break;
      case 'img2video':
        targetPage = 'image-to-video';
        break;
      default:
        message.error('未知的生成类型');
        return;
    }
    
    onClose();
    onNavigate(targetPage);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in" onClick={onClose}>
      <div className="bg-[#0d1121] w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 bg-white/5 shrink-0">
          <h3 className="text-xl font-bold text-white">{asset.name}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 flex items-center justify-center bg-black min-h-[300px]">
            {asset.type === 'image' && <img src={asset.url} alt={asset.name} className="max-w-full max-h-[60vh] object-contain rounded-lg" />}
            {asset.type === 'video' && <video src={asset.url} controls className="max-w-full max-h-[60vh] rounded-lg" />}
          </div>

          {/* Generation Params Section */}
          {params && (
            <div className="px-8 py-6 bg-[#151929] border-t border-white/5">
              <h4 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                生成参数信息
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                {params.model && (
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                    <span className="text-gray-500 block text-xs mb-1">模型 Model</span>
                    <span className="text-white font-medium">{params.model}</span>
                  </div>
                )}
                {params.resolution && (
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                    <span className="text-gray-500 block text-xs mb-1">分辨率 Resolution</span>
                    <span className="text-white font-medium">{params.resolution}</span>
                  </div>
                )}
                {params.aspectRatio && (
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                    <span className="text-gray-500 block text-xs mb-1">比例 Ratio</span>
                    <span className="text-white font-medium">{params.aspectRatio}</span>
                  </div>
                )}
                {params.duration && (
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                    <span className="text-gray-500 block text-xs mb-1">时长 Duration</span>
                    <span className="text-white font-medium">{params.duration}s</span>
                  </div>
                )}
                 {params.quantity && (
                  <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                    <span className="text-gray-500 block text-xs mb-1">数量 Quantity</span>
                    <span className="text-white font-medium">{params.quantity}</span>
                  </div>
                )}
              </div>
              
              {params.prompt && (
                <div className="mt-4">
                  <span className="text-gray-500 block text-xs mb-2">提示词 Prompt</span>
                  <div className="text-gray-300 bg-black/20 p-4 rounded-lg border border-white/5 text-sm leading-relaxed whitespace-pre-wrap">
                    {params.prompt}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 bg-[#151929] border-t border-white/5 flex items-center justify-between shrink-0">
          {showActions ? (
            <>
              <div className="flex items-center space-x-4">
                <button 
                  onClick={handleRedraw}
                  className="flex items-center space-x-2 text-sm font-bold text-gray-400 hover:text-white">
                  <RefreshCw className="w-4 h-4" />
                  <span>重绘</span>
                </button>
                {asset.status !== 'failed' && (
                  <button 
                    onClick={handleDownload}
                    className="flex items-center space-x-2 text-sm font-bold text-gray-400 hover:text-white">
                    <Download className="w-4 h-4" />
                    <span>下载</span>
                  </button>
                )}
              </div>
              {asset.status !== 'failed' && (
                asset.isPublish ? (
                  <button 
                    disabled
                    className="bg-white/10 px-8 py-3 rounded-xl font-black text-sm text-gray-400 cursor-not-allowed flex items-center space-x-2 border border-white/5">
                    <Send className="w-4 h-4" />
                    <span>已发布</span>
                  </button>
                ) : (
                  <button 
                    onClick={onPublish}
                    className="brand-gradient px-8 py-3 rounded-xl font-black text-sm text-white shadow-lg glow-pink hover:scale-105 transition-transform flex items-center space-x-2">
                    <Send className="w-4 h-4" />
                    <span>发布</span>
                  </button>
                )
              )}
            </>
          ) : (
            // 从资产选择的图片只显示下载按钮
            <div className="flex items-center space-x-4">
              {asset.status !== 'failed' && (
                <button 
                  onClick={handleDownload}
                  className="flex items-center space-x-2 text-sm font-bold text-gray-400 hover:text-white">
                  <Download className="w-4 h-4" />
                  <span>下载</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetDetailModal;
