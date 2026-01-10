
import React, { useState, useEffect, useRef } from 'react';
import { message, Progress } from 'antd';
import { Video, Sparkles, ChevronDown, Zap, ChevronUp, Wand2, Gem } from 'lucide-react';
import { AssetNode, VideoGenerationConfig } from '../../types';
// fix: Corrected import path casing from 'Modals' to 'modals'.
import AssetPickerModal from '../Modals/AssetPickerModal';
import * as generationAPI from '../../api/generation';

interface TextToVideoProps {
  onSelectAsset: (asset: AssetNode) => void;
  onDeductPoints?: (points: number) => void;
}

// 模型选项接口
interface ModelOption {
  id: string; // 模型ID
  name: string; // 模型显示名称
  resolutions?: string[];
  ratios?: string[];
  durations?: number[];
  defaultCost?: number;
}

const TextToVideo: React.FC<TextToVideoProps> = ({ onSelectAsset, onDeductPoints }) => {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [videos, setVideos] = useState<AssetNode[]>([]);
  const [model, setModel] = useState('');
  const [duration, setDuration] = useState<string|number>(5);
  const [resolution, setResolution] = useState('Auto');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [ratiosOpen, setRatiosOpen] = useState(false);
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]); // 模型列表
  const [loadingModels, setLoadingModels] = useState(true); // 加载模型列表状态
  const [optimizing, setOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<any>(null);

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // 当前选中的模型对象
  const currentModel = models.find(m => m.id === model);

  // 根据当前模型获取支持的分辨率、比例和时长
  const availableResolutions = currentModel?.resolutions && currentModel.resolutions.length > 0 
    ? currentModel.resolutions 
    : ['Auto', '270p', '720p', '1080p'];
    
  const availableRatios = currentModel?.ratios && currentModel.ratios.length > 0
    ? currentModel.ratios.map(r => ({ label: r }))
    : [{ label: '16:9' }, { label: '9:16' }, { label: '3:2' }, { label: '2:3' }, { label: '1:1' }];

  const availableDurations: (string|number)[] = currentModel?.durations && currentModel.durations.length > 0
    ? currentModel.durations
    : [5, 10];

  const handleOptimizePrompt = () => {
    if (!prompt.trim()) {
      message.warning('请输入提示词');
      return;
    }
    const originalPrompt = prompt;
    setOptimizing(true);
    setPrompt('');
    
    let fullResponse = '';

    generationAPI.optimizePrompt(
      originalPrompt,
      (text) => {
        fullResponse += text;
        if (!fullResponse.trim().startsWith('{') && !fullResponse.trim().startsWith('```')) {
             setPrompt(prev => prev + text);
        }
      },
      (err) => {
        console.error(err);
        message.error('优化提示词失败');
        setPrompt(originalPrompt);
        setOptimizing(false);
      },
      () => {
        const trimmed = fullResponse.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('```')) {
            try {
                let jsonStr = trimmed.replace(/```json\s*|\s*```/g, '').trim();
                jsonStr = jsonStr.replace(/```\s*|\s*```/g, '').trim();
                
                if (jsonStr.startsWith('{')) {
                    const json = JSON.parse(jsonStr);
                    const content = json.prompt || json.text || json.content || json.optimized_prompt || jsonStr;
                    setPrompt(typeof content === 'string' ? content : JSON.stringify(content));
                } else {
                    setPrompt(jsonStr);
                }
            } catch (e) {
                console.warn('解析优化结果JSON失败，显示原始文本', e);
                setPrompt(trimmed);
            }
        }
        setOptimizing(false);
      }
    );
  };

  // 计算算力消耗
  const calculateCost = () => {
    // 基础消耗
    const baseCost = currentModel?.defaultCost || 20;
    
    // 如果选择了特定时长，可能会有额外消耗（这里简化处理，如果后端有规则可以在ModelOption中扩展）
    // 目前只使用默认消耗
    return baseCost;
  };

  // 当模型改变时，检查当前参数是否有效，如果无效则重置
  useEffect(() => {
    if (currentModel) {
      if (currentModel.resolutions && currentModel.resolutions.length > 0 && !currentModel.resolutions.includes(resolution)) {
        setResolution(currentModel.resolutions[0]);
      }
      if (currentModel.ratios && currentModel.ratios.length > 0 && !currentModel.ratios.includes(aspectRatio)) {
        setAspectRatio(currentModel.ratios[0]);
      }
      // duration 检查
      if (currentModel.durations && currentModel.durations.length > 0) {
        if (typeof duration === 'number' && !currentModel.durations.includes(duration)) {
           setDuration(currentModel.durations[0]);
        }
      }
    }
  }, [model, currentModel]); // eslint-disable-line react-hooks/exhaustive-deps

  // 从后端加载模型列表
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoadingModels(true);
        // 获取所有平台的模型列表
        const platformModels = await generationAPI.getTextToVideoModels();
        
        // 合并所有平台的模型到一个列表（去重）
        const allModels: ModelOption[] = [];
        const seenModelIds = new Set<string>();
        
        platformModels.forEach(platform => {
          platform.models.forEach(modelInfo => {
            if (!seenModelIds.has(modelInfo.id)) {
              seenModelIds.add(modelInfo.id);
              allModels.push({
                id: modelInfo.id,
                name: modelInfo.name,
                resolutions: modelInfo.resolutions,
                ratios: modelInfo.ratios,
                durations: modelInfo.durations,
                defaultCost: modelInfo.defaultCost
              });
            }
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
              if (config.resolution) setResolution(config.resolution || 'Auto');
              if (config.aspectRatio) setAspectRatio(config.aspectRatio || '16:9');
              if (config.duration) setDuration(config.duration || 5);
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
        setModels([{ id: 'meji-video-turbo', name: 'Meji Video Turbo (高速)', defaultCost: 20 }]);
        setModel('meji-video-turbo');
      } finally {
        setLoadingModels(false);
      }
    };
    loadModels();
  }, []);

  const handleGenerate = async () => {
    // 验证提示词
    if (!prompt.trim()) {
      message.warning('请输入提示词');
      return;
    }
    
    setGenerating(true);
    setProgress(0); // 重置进度
    const cost = calculateCost();
    // 立即扣减算力（乐观更新）
    if (onDeductPoints) {
      onDeductPoints(cost);
    }

    // 清除之前的定时器
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // 启动“演戏”进度条：从0%匀速跑到90%
    const startFakeProgress = () => {
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev; // 到了90%就停住
          return prev + 1; // 每次加1%
        });
      }, 1000); // 1000ms * 90 = 90秒 (1分半)
    };

    startFakeProgress();

    try {
      // 准备请求参数
      const request: generationAPI.TextToVideoRequest = {
        prompt: prompt,
        model: model,
        aspectRatio: aspectRatio === 'Auto' ? undefined : aspectRatio,
        resolution: resolution === 'Auto' ? undefined : resolution,
        duration: typeof duration === 'number' ? duration : undefined,
        webHook: '-1',
        shutProgress: false,
      };
      
      // 调用文生视频API
      let response = await generationAPI.textToVideo(request);

      // 如果返回了任务ID且状态为处理中，开始轮询
      if (response.taskId && (response.status === 'processing' || response.status === 'running')) {
         const taskId = response.taskId;
         let retries = 0;
         while (true) {
             // 前端每隔 2-3 秒问一次后端结果
             await new Promise(resolve => setTimeout(resolve, 2500));
             
             const statusRes = await generationAPI.getTaskStatus<generationAPI.VideoGenerationResponse>(taskId); // VideoGenerationResponse compatible? Yes
             
             // 一旦后端轮询结果返回 status: succeeded 或者 progress: 100
             // Note: VideoGenerationResponse usually has status. Progress might not be there but status 'success' is key.
             if (statusRes.status === 'success' || statusRes.status === 'succeeded' || statusRes.status === 'completed' || statusRes.progress === 100) {
                 // 瞬间拉满：立即终止“演戏”动画，直接把进度条瞬移到 100%
                 if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                 response = statusRes;
                 setProgress(100);
                 break;
             }
             
             if (statusRes.status === 'failed') {
                 if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                 throw new Error(statusRes.errorMessage || '生成失败');
             }
             
             retries++;
             if (retries > 432) { // 2.5s * 432 = 1080s (18分钟超时)
                 if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                 throw new Error('生成超时');
             }
         }
      } else if (response.status === 'failed') {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
          throw new Error(response.errorMessage || '生成失败');
      } else if (response.status === 'success') {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
          setProgress(100);
      }
      
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
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

      // 失败时退回算力
      if (onDeductPoints) {
        onDeductPoints(-cost);
      }

      console.error('生成失败:', error);
      // message.error已在request拦截器中处理，此处不再重复提示
    } finally {
      setGenerating(false);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
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
                          <div className="absolute top-full left-0 mt-2 w-full bg-[#1c2132] border border-white/10 rounded-xl p-2 z-20 shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
                              {availableResolutions.map(r => (
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
                          <div className="absolute top-full left-0 mt-2 w-full bg-[#1c2132] border border-white/10 rounded-xl p-2 z-20 shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
                          {availableRatios.map(r => (
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
               <div className="relative bg-[#060813] border border-white/5 rounded-2xl p-2 flex items-center justify-between overflow-x-auto custom-scrollbar">
                 <div 
                   className="absolute top-2 bottom-2 bg-white/10 rounded-xl transition-all duration-300"
                   style={{
                     width: `calc(100% / ${availableDurations.length})`,
                     left: `calc(${availableDurations.indexOf(duration)} * (100% / ${availableDurations.length}))`
                   }}
                 />
                 {availableDurations.map(d => (
                   <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`relative flex-1 text-center py-2 text-sm font-bold rounded-xl transition-colors min-w-[60px] ${duration === d ? 'text-white' : 'text-gray-500 hover:bg-white/5'}`}
                   >
                     {`${d}s`}
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
            <div className="flex justify-end mt-2">
                <button 
                  onClick={handleOptimizePrompt}
                  disabled={optimizing}
                  className={`flex items-center space-x-2 text-[10px] ${optimizing ? 'text-gray-500 cursor-wait' : 'text-cyan-400 hover:text-cyan-300'} font-black uppercase tracking-widest group`}
                >
                  <Wand2 className={`w-3 h-3 ${optimizing ? 'animate-pulse' : 'group-hover:rotate-45'} transition-transform`} />
                  <span>{optimizing ? '优化中...' : 'AI帮助优化提示词'}</span>
                </button>
            </div>
            
            <div className="flex items-center justify-between pt-2 px-2">
                <span className="text-xs text-gray-500 font-bold">预计消耗算力</span>
                <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 brand-gradient rounded-full flex items-center justify-center">
                        <Gem className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span className="text-lg font-black text-white">{calculateCost()}</span>
                    <span className="text-xs text-gray-500 font-bold">PTS</span>
                </div>
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
          {!generating && videos.length > 0 ? (
            <div className="w-full h-full flex items-center justify-center">
              <video src={videos[0].url} controls className="max-w-full max-h-full" />
            </div>
          ) : (
            <>
              {generating ? (
                <div className="text-center">
                  <div className="relative w-24 h-24 mx-auto mb-8">
                    <div className="absolute inset-0 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-4 border-4 border-pink-500/10 border-b-pink-500 rounded-full animate-reverse-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                       <Zap className="w-6 h-6 text-white animate-pulse" />
                    </div>
                  </div>
                  <p className="font-black text-gray-500 uppercase tracking-widest text-sm mb-4">美迹AI 正在渲染画面数据...</p>
                  {progress > 0 && (
                    <Progress percent={progress} status="active" strokeColor={{ from: '#108ee9', to: '#87d068' }} />
                  )}
                  <p className="text-gray-500 text-xs mt-4">您要的内容正在生产中，你可以稍后在个人中心的生成记录里查看。</p>
                </div>
              ) : (
                <>
                  <Video className="w-24 h-24 text-[#6b48ff]/20 mb-6" />
                  <p className="text-sm font-black text-gray-600 uppercase tracking-widest px-20 text-center leading-relaxed">
                    生成的视频将显示在这里
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextToVideo;
