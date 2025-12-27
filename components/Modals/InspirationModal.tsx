
import React, { useState, useEffect } from 'react';
import { X, Heart, Copy, ImageIcon, Gem } from 'lucide-react';
import { Inspiration, PageType } from '../../types';
import * as publishAPI from '../../api/publish';

interface InspirationModalProps {
  work: Inspiration | null;
  onClose: () => void;
  onNavigate: (page: PageType) => void;
}

const InspirationModal: React.FC<InspirationModalProps> = ({ work, onClose, onNavigate }) => {
  const [copied, setCopied] = useState(false);
  const [workData, setWorkData] = useState<Inspiration | null>(work);

  // 如果work没有generationConfig，尝试从API获取详情
  useEffect(() => {
    const loadDetail = async () => {
      if (work && (!work.generationConfig || !work.generationType) && work.id) {
        try {
          const detail = await publishAPI.getPublishedContentDetail(work.id);
          // 解析generationConfig
          let generationConfig: any = undefined;
          if (detail.generationConfig) {
            try {
              generationConfig = JSON.parse(detail.generationConfig);
            } catch (e) {
              console.error('解析生成配置失败:', e);
            }
          }
          
          // 更新workData
          setWorkData({
            ...work,
            generationType: detail.generationType as any,
            generationConfig: generationConfig,
            type: detail.type,
            contentUrl: detail.contentUrl,
          });
        } catch (error) {
          console.error('获取发布内容详情失败:', error);
          setWorkData(work);
        }
      } else {
        setWorkData(work);
      }
    };
    
    loadDetail();
  }, [work]);

  if (!workData) return null;

  const handleCopy = () => {
    if (workData.prompt) {
      navigator.clipboard.writeText(workData.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  // 一键制作同款
  const handleMakeSimilar = () => {
    if (!workData.generationType || !workData.generationConfig) {
      alert('该作品没有生成配置信息');
      return;
    }
    
    // 将配置参数保存到localStorage，供生成工具组件使用
    try {
      localStorage.setItem('makeSimilarConfig', JSON.stringify({
        generationType: workData.generationType,
        config: workData.generationConfig,
      }));
    } catch (e) {
      console.error('保存配置参数失败:', e);
    }
    
    // 根据生成类型跳转到对应的生成工具页面
    let targetPage: PageType;
    switch (workData.generationType) {
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
        alert('未知的生成类型');
        return;
    }
    
    onClose();
    onNavigate(targetPage);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in" onClick={onClose}>
      <div className="bg-[#0d1121] w-full max-w-6xl h-[90vh] max-h-[800px] rounded-[3rem] shadow-2xl flex overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
        <div className="w-3/5 bg-black relative group">
          {workData.type === 'video' ? (
            <video src={workData.contentUrl || workData.img} controls className="w-full h-full object-contain" />
          ) : (
            <img src={workData.img} alt={workData.title} className="w-full h-full object-contain" />
          )}
        </div>
        <div className="w-2/5 flex flex-col p-10">
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-3">
                <img src={workData.avatar} className="w-12 h-12 rounded-full border-2 border-white/10" alt={workData.user} />
                <div>
                  <p className="font-bold text-white text-lg">{workData.user}</p>
                  <p className="text-xs text-gray-500 font-mono">Creator ID: {workData.id}</p>
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
                    <span className="font-bold text-lg">{workData.likes}</span>
                </div>
                <div className="w-px h-6 bg-white/10"></div>
                {workData.originalImageUrl && (
                    <div className="relative group/original">
                        <div className="w-10 h-10 rounded-md overflow-hidden border-2 border-white/10 cursor-pointer">
                            <img src={workData.originalImageUrl} alt="原图" className="w-full h-full object-cover"/>
                        </div>
                        <div className="absolute bottom-full left-0 mb-2 w-48 h-48 bg-black border border-white/10 rounded-lg p-2 opacity-0 group-hover/original:opacity-100 transition-opacity pointer-events-none z-10">
                            <img src={workData.originalImageUrl} alt="原图" className="w-full h-full object-cover rounded-md"/>
                        </div>
                    </div>
                )}
            </div>

            <div>
              <h3 className="text-2xl font-black text-white mb-2">{workData.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{workData.desc}</p>
              {workData.publishedAt && (
                <p className="text-gray-500 text-xs mt-2">
                  发布时间：{new Date(workData.publishedAt).toLocaleString('zh-CN')}
                </p>
              )}
            </div>

            <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Prompt</p>
                <p className="text-sm text-gray-300 font-mono leading-relaxed">{workData.prompt || '无'}</p>
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
