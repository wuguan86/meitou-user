
import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { Video, Sparkles, ChevronDown, Zap, ChevronUp } from 'lucide-react';
import { AssetNode, VideoGenerationConfig } from '../../types';
// fix: Corrected import path casing from 'Modals' to 'modals'.
import AssetPickerModal from '../Modals/AssetPickerModal';
import * as generationAPI from '../../api/generation';

interface TextToVideoProps {
  onSelectAsset: (asset: AssetNode) => void;
}

// 模型选项接口
interface ModelOption {
  id: string; // 模型ID
  name: string; // 模型显示名称
}

const TextToVideo: React.FC<TextToVideoProps> = ({ onSelectAsset }) => {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [videos, setVideos] = useState<AssetNode[]>([]);
  const [model, setModel] = useState('');
  const [duration, setDuration] = useState<string|number>('Auto');
  const [resolution, setResolution] = useState('Auto');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [ratiosOpen, setRatiosOpen] = useState(false);
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]); // 模型列表
  const [loadingModels, setLoadingModels] = useState(true); // 加载模型列表状态

  // 从后端加载模型列表
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoadingModels(true);
        // 获取所有平台的模型列表
        const platformModels = await generationAPI.getTextToVideoModels();
        
        // 合并所有平台的模型到一个列表
        const allModels: ModelOption[] = [];
        platformModels.forEach(platform => {
          platform.models.forEach(modelInfo => {
            allModels.push({
              id: modelInfo.id,
              name: modelInfo.name
            });
          });
        });
        
        setModels(allModels);
        // 如果有模型，设置第一个为默认值
        if (allModels.length > 0) {
          setModel(allModels[0].id);
        }
        
        // 检查是否有"一键制作同款"的配置参数
        try {
          const makeSimilarConfigStr = localStorage.getItem('makeSimilarConfig');
          if (makeSimilarConfigStr) {
            const makeSimilarConfig = JSON.parse(makeSimilarConfigStr);
            if (makeSimilarConfig.generationType === 'txt2video' && makeSimilarConfig.config) {
              const config = makeSimilarConfig.config as VideoGenerationConfig;
              // 填充表单
              if (config.prompt) setPrompt(config.prompt);
              if (config.model) setModel(config.model);
              if (config.resolution) setResolution(config.resolution);
              if (config.aspectRatio) setAspectRatio(config.aspectRatio);
              if (config.duration) setDuration(config.duration);
              // 清除localStorage中的配置
              localStorage.removeItem('makeSimilarConfig');
            }
          }
        } catch (e) {
          console.error('读取一键制作同款配置失败:', e);
        }
      } catch (error: any) {
        console.error('加载模型列表失败:', error);
        // 如果加载失败，使用默认模型
        setModels([{ id: 'meji-video-turbo', name: 'Meji Video Turbo (高速)' }]);
        setModel('meji-video-turbo');
      } finally {
        setLoadingModels(false);
      }
    };
    loadModels();
  }, []);

  const durations: (string|number)[] = ['Auto', 8, 10, 15, 20, 25];
  const resolutions = ['Auto', '270p', '720p', '1080p'];
  const ratios = [{ label: '16:9' }, { label: '9:16' }, { label: '3:2' }, { label: '2:3' }, { label: '1:1' }];

  const handleGenerate = async () => {
    // 验证提示词
    if (!prompt.trim()) {
      message.warning('请输入提示词');
      return;
    }
    
    setGenerating(true);
    try {
      // 准备请求参数
      const request: generationAPI.TextToVideoRequest = {
        prompt: prompt,
        model: model,
        aspectRatio: aspectRatio === 'Auto' ? undefined : aspectRatio,
        resolution: resolution === 'Auto' ? undefined : resolution,
        duration: typeof duration === 'number' ? duration : undefined,
      };
      
      // 调用文生视频API
      const response = await generationAPI.textToVideo(request);
      
      // 构建生成配置参数
      const generationConfig: VideoGenerationConfig = {
        prompt: prompt,
        model: model,
        resolution: resolution === 'Auto' ? undefined : resolution,
        aspectRatio: aspectRatio === 'Auto' ? undefined : aspectRatio,
        duration: typeof duration === 'number' ? duration : undefined,
      };

      // 将响应转换为AssetNode格式
      const newVideo: AssetNode = {
        id: `gen-${Date.now()}`,
        name: prompt.substring(0, 30) || 'Untitled Video',
        type: 'video',
        createdAt: Date.now(),
        url: response.videoUrl,
        prompt: prompt,
        generationType: 'txt2video',
        generationConfig: generationConfig,
      };
      
      setVideos([newVideo]);
      onSelectAsset(newVideo);
    } catch (error: any) {
      console.error('生成失败:', error);
      message.error('生成失败：' + (error.message || '未知错误'));
    } finally {
      setGenerating(false);
    }
  };

  const RatioIcon = ({ label }: { label: string }) => {
    const isPortrait = label.startsWith('9:') || label.startsWith('2:3');
    const isSquare = label === '1:1';
    const isWide = !isPortrait && !isSquare;
    return (
      <div className={`border-2 border-current rounded-sm ${
        isWide ? 'w-5 h-3' : isPortrait ? 'w-3 h-5' : 'w-4 h-4'
      }`} />
    );
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tighter mb-2">文生视频 <span className="brand-text-gradient">Engine v2.2</span></h2>
          <p className="text-gray-500 max-w-lg">只需一段文字，美迹AI 即可为您生成流畅、高清的 5-25 秒短视频。</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-[#0d1121] border border-white/5 rounded-[2rem] p-8 space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">AI 视频模型</label>
              <div className="relative">
                <select 
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={loadingModels}
                  className="w-full bg-[#060813] border border-white/5 rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:border-[#2cc2f5] transition-all font-bold disabled:opacity-50"
                >
                  {loadingModels ? (
                    <option>加载中...</option>
                  ) : models.length === 0 ? (
                    <option>暂无可用模型</option>
                  ) : (
                    models.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))
                  )}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                  <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">分辨率</label>
                  <div className="relative">
                      <button onClick={() => setResolutionOpen(!resolutionOpen)} className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold bg-[#060813] border border-white/5 rounded-xl hover:bg-white/5 transition-colors">
                          <span>{resolution}</span>
                          <ChevronDown className="w-4 h-4 text-gray-600" />
                      </button>
                      {resolutionOpen && (
                          <div className="absolute top-full left-0 mt-2 w-full bg-[#1c2132] border border-white/10 rounded-xl p-2 z-20 shadow-2xl">
                              {resolutions.map(r => (
                                  <button key={r} onClick={() => { setResolution(r); setResolutionOpen(false); }} className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${resolution === r ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/10'}`}>
                                      {r}
                                  </button>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
              <div className="space-y-3">
                  <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">尺寸</label>
                  <div className="relative">
                      <button onClick={() => setRatiosOpen(!ratiosOpen)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-[#060813] border border-white/5 hover:bg-white/5 transition-colors">
                          <div className="flex items-center space-x-3">
                          <RatioIcon label={aspectRatio}/>
                          <span className="text-sm font-bold text-white">{aspectRatio}</span>
                          </div>
                          {ratiosOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                      </button>
                      {ratiosOpen && (
                          <div className="absolute top-full left-0 mt-2 w-full bg-[#1c2132] border border-white/10 rounded-xl p-2 z-20 shadow-2xl">
                          {ratios.map(r => (
                              <button key={r.label} onClick={() => { setAspectRatio(r.label); setRatiosOpen(false); }} className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium ${aspectRatio === r.label ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/10'}`}>
                              <div className="flex items-center space-x-3"><RatioIcon label={r.label}/><span>{r.label}</span></div>
                              </button>
                          ))}
                          </div>
                      )}
                  </div>
              </div>
            </div>

            <div className="space-y-4">
               <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">视频时长</label>
               <div className="relative bg-[#060813] border border-white/5 rounded-2xl p-2 flex items-center justify-between">
                 <div 
                   className="absolute top-2 bottom-2 bg-white/10 rounded-xl transition-all duration-300"
                   style={{
                     width: `calc(100% / ${durations.length})`,
                     left: `calc(${durations.indexOf(duration)} * (100% / ${durations.length}))`
                   }}
                 />
                 {durations.map(d => (
                   <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`relative flex-1 text-center py-2 text-sm font-bold rounded-xl transition-colors ${duration === d ? 'text-white' : 'text-gray-500 hover:bg-white/5'}`}
                   >
                     {typeof d === 'number' ? `${d}s` : d}
                   </button>
                 ))}
               </div>
            </div>
            
            <div className="bg-[#060813] p-6 rounded-2xl border border-white/5">
              <p className="text-[10px] text-gray-600 font-bold uppercase mb-2 tracking-widest">提示词输入</p>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述视频场景..."
                className="w-full h-32 bg-transparent outline-none text-sm resize-none font-medium leading-relaxed"
              />
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={!prompt.trim() || generating}
            className="w-full brand-gradient py-5 rounded-[1.5rem] font-black text-xl shadow-2xl glow-cyan hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-3 tracking-[0.2em] disabled:opacity-30"
          >
            <Sparkles className="w-5 h-5" />
            <span>{generating ? '生成中...' : '开始制作'}</span>
          </button>
        </div>

        <div className="lg:col-span-8 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] text-gray-700 bg-white/[0.01] min-h-[500px]">
          {videos.length > 0 ? (
            <div className="w-full h-full flex items-center justify-center">
              <video src={videos[0].url} controls className="max-w-full max-h-full" />
            </div>
          ) : (
            <>
              <Video className="w-24 h-24 text-[#6b48ff]/20 mb-6" />
              <p className="text-sm font-black text-gray-600 uppercase tracking-widest px-20 text-center leading-relaxed">
                {generating ? '正在生成视频，请稍候...' : '生成的视频将显示在这里'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextToVideo;
