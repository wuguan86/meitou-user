
import React, { useState, useEffect, useRef } from 'react';
import { message, Progress } from 'antd';
import { Send, Wand2, Download, RefreshCcw, Image as ImageIcon, Zap, ChevronDown, Check, ChevronUp, Gem } from 'lucide-react';
import { AssetNode, ImageGenerationConfig } from '../../types';
import AssetPickerModal from '../Modals/AssetPickerModal';
import * as generationAPI from '../../api/generation';

interface TextToImageProps {
  onSelectAsset: (asset: AssetNode) => void;
  onDeductPoints?: (points: number) => void;
}

// 模型选项接口
interface ModelOption {
  id: string; // 模型ID
  name: string; // 模型显示名称
  resolutions?: string[];
  ratios?: string[];
  quantities?: number[];
  defaultCost?: number;
}

const TextToImage: React.FC<TextToImageProps> = ({ onSelectAsset, onDeductPoints }) => {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<AssetNode[]>([]);
  const [model, setModel] = useState('');
  const [resolution, setResolution] = useState('1K');
  const [aspectRatio, setAspectRatio] = useState('Auto');
  const [quantity, setQuantity] = useState('1');
  const [ratiosOpen, setRatiosOpen] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]); // 模型列表
  const [loadingModels, setLoadingModels] = useState(true); // 加载模型列表状态
  const [progress, setProgress] = useState(0); // 进度条状态
  const [optimizing, setOptimizing] = useState(false);
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

  // 根据当前模型获取支持的分辨率和比例
  const availableResolutions = currentModel?.resolutions && currentModel.resolutions.length > 0 
    ? currentModel.resolutions 
    : ['1K', '2K', '4K'];
    
  const availableRatios = currentModel?.ratios && currentModel.ratios.length > 0
    ? currentModel.ratios.map(r => ({ label: r }))
    : [
        { label: 'Auto' }, { label: '16:9' }, { label: '9:16' }, { label: '3:2' }, { label: '2:3' }, { label: '4:3' }, { label: '3:4' }, { label: '1:1' }, { label: '21:9' }
      ];

  const availableQuantities = currentModel?.quantities && currentModel.quantities.length > 0
    ? currentModel.quantities
    : [1, 2, 3, 4];

  // 计算算力消耗
  const calculateCost = () => {
    const baseCost = currentModel?.defaultCost || 10;
    return baseCost * parseInt(quantity);
  };

  // 当模型改变时，检查当前分辨率和比例是否有效，如果无效则重置
  useEffect(() => {
    if (currentModel) {
      if (currentModel.resolutions && currentModel.resolutions.length > 0 && !currentModel.resolutions.includes(resolution)) {
        setResolution(currentModel.resolutions[0]);
      }
      if (currentModel.ratios && currentModel.ratios.length > 0 && !currentModel.ratios.includes(aspectRatio)) {
        setAspectRatio(currentModel.ratios[0]);
      }
      if (currentModel.quantities && currentModel.quantities.length > 0 && !currentModel.quantities.includes(parseInt(quantity))) {
        setQuantity(currentModel.quantities[0].toString());
      }
    }
  }, [model, currentModel]); // eslint-disable-line react-hooks/exhaustive-deps

  // 从后端加载模型列表（只在组件挂载时执行一次）
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoadingModels(true);
        // 获取所有平台的模型列表
        const platformModels = await generationAPI.getTextToImageModels();
        
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
                quantities: modelInfo.quantities,
                defaultCost: modelInfo.defaultCost
              });
            }
          });
        });
        
        setModels(allModels);
        
        // 如果有模型且当前没有选中模型，默认选择第一个
        if (allModels.length > 0) {
          setModel(prevModel => prevModel || allModels[0].id);
        }
        
        // 检查是否有"一键制作同款"的配置参数
        try {
          const makeSimilarConfigStr = localStorage.getItem('makeSimilarConfig');
          if (makeSimilarConfigStr) {
            const makeSimilarConfig = JSON.parse(makeSimilarConfigStr);
            if (makeSimilarConfig.generationType === 'txt2img' && makeSimilarConfig.config) {
              const config = makeSimilarConfig.config as ImageGenerationConfig;
              // 填充表单
              if (config.prompt) setPrompt(config.prompt);
              if (config.model) setModel(config.model);
              if (config.resolution) setResolution(config.resolution);
              if (config.aspectRatio) setAspectRatio(config.aspectRatio);
              // 清除localStorage中的配置
              localStorage.removeItem('makeSimilarConfig');
            }
          }
        } catch (e) {
          console.error('读取一键制作同款配置失败:', e);
        }
      } catch (error: any) {
        console.error('加载模型列表失败:', error);
        // 加载失败时使用默认模型
        const defaultModels: ModelOption[] = [
          { id: 'meji-flux-v2', name: 'Meji Flux v2.2 (超写实)', defaultCost: 10 },
          { id: 'meji-anime-v1', name: 'Meji Anime (二次元)', defaultCost: 10 },
          { id: 'meji-scifi-v3', name: 'Meji Sci-Fi (科幻设定)', defaultCost: 10 }
        ];
        setModels(defaultModels);
        setModel(prevModel => prevModel || 'meji-flux-v2');
      } finally {
        setLoadingModels(false);
      }
    };
    
    loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在组件挂载时执行一次

  const handleGenerate = async () => {
    // 验证提示词
    if (!prompt.trim()) return;
    
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
      }, 200); // 200ms * 90 = 18秒左右
    };

    startFakeProgress();

    try {
      // 调用文生图API
      let response = await generationAPI.textToImage({
        prompt: prompt,
        model: model,
        aspectRatio: aspectRatio === 'Auto' ? undefined : aspectRatio,
        resolution: resolution,
        quantity: parseInt(quantity),
        webHook: '-1',
        shutProgress: false,
      });
      
      // 如果返回了任务ID且状态为处理中，开始轮询
      if (response.taskId && (response.status === 'processing' || response.status === 'running')) {
         const taskId = response.taskId;
         let retries = 0;
         while (true) {
             // 前端每隔 2-3 秒问一次后端结果
             await new Promise(resolve => setTimeout(resolve, 2500));
             
             const statusRes = await generationAPI.getTaskStatus(taskId);
             
             // 一旦后端轮询结果返回 status: succeeded 或者 progress: 100
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
             
             // 只要后端返回的 progress 是 10%、0% 甚至任务不存在，前端进度条继续按自己的节奏演（无视后端那个不准的进度）
             
             retries++;
             if (retries > 120) { // 2.5s * 120 = 300s (5分钟超时)
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
      const generationConfig: ImageGenerationConfig = {
        prompt: prompt,
        model: model,
        resolution: resolution,
        aspectRatio: aspectRatio === 'Auto' ? undefined : aspectRatio,
      };

      // 将响应转换为AssetNode格式
      const newImages: AssetNode[] = response.imageUrls.map((url, i) => ({
        id: `gen-${Date.now()}-${i}`,
        name: prompt.substring(0, 30) || 'Untitled Image',
        type: 'image',
        createdAt: Date.now(),
        url: url,
        prompt: prompt,
        generationType: 'txt2img',
        generationConfig: generationConfig,
      }));
      
      setImages(newImages);
    } catch (error: any) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      
      // 失败时退回算力
      if (onDeductPoints) {
        onDeductPoints(-cost);
      }
      
      // 错误处理 - 如果是算力不足，不显示重复的错误提示（因为全局拦截器可能已经显示了）
      const errorMsg = error.message || '未知错误';
      if (!errorMsg.includes('算力不足')) {
        message.error('生成失败: ' + errorMsg);
      }
      console.error('文生图失败:', error);
    } finally {
      setGenerating(false);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
  };

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
        // 如果不是以 { 开头，说明是纯文本，直接流式显示
        // 如果是 { 开头，说明可能是 JSON，暂时不显示，等接收完整后再解析
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
        // 完成时，如果 fullResponse 看起来像 JSON 或 Markdown 代码块，尝试解析
        const trimmed = fullResponse.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('```')) {
            try {
                // 尝试移除 markdown 标记
                let jsonStr = trimmed.replace(/```json\s*|\s*```/g, '').trim();
                // 如果是 markdown 但不是 json 代码块，可能是普通代码块，也尝试移除
                jsonStr = jsonStr.replace(/```\s*|\s*```/g, '').trim();
                
                if (jsonStr.startsWith('{')) {
                    const json = JSON.parse(jsonStr);
                    // 尝试获取常见的字段名
                    const content = json.prompt || json.text || json.content || json.optimized_prompt || jsonStr;
                    setPrompt(typeof content === 'string' ? content : JSON.stringify(content));
                } else {
                    // 移除 markdown 后不是 JSON，直接显示清洗后的文本
                    setPrompt(jsonStr);
                }
            } catch (e) {
                // 解析失败，回退到原始文本
                console.warn('解析优化结果JSON失败，显示原始文本', e);
                setPrompt(trimmed);
            }
        }
        setOptimizing(false);
      }
    );
  };

  const RatioIcon = ({ label }: { label: string }) => {
    const isPortrait = label.startsWith('9:') || label.startsWith('2:3') || label.startsWith('3:4');
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
          <h2 className="text-4xl font-black tracking-tighter mb-2">文生图 <span className="brand-text-gradient">Engine v2.2</span></h2>
          <p className="text-gray-500">只需一段文字，美迹AI 即可为您想要的高质量图片</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-[#0d1121] border border-white/5 rounded-[2rem] p-8 shadow-xl">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">创作提示词</h3>
            </div>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="您可以描述您想要的图片内容，比如摄像机面前，一个有着真实的白皙的皮肤纹理和颗粒感的亚裔女生面对镜头，双眼皮，小巧的鼻翼、微翘的双唇"
              className="w-full h-48 bg-[#060813] border border-white/5 rounded-2xl p-6 text-sm resize-none focus:border-cyan-500 outline-none transition-all font-medium leading-relaxed"
            />
            <div className="flex justify-end mt-4">
              <button 
                onClick={handleOptimizePrompt}
                disabled={optimizing}
                className={`flex items-center space-x-2 text-[10px] ${optimizing ? 'text-gray-500 cursor-wait' : 'text-cyan-400 hover:text-cyan-300'} font-black uppercase tracking-widest group`}
              >
                <Wand2 className={`w-3 h-3 ${optimizing ? 'animate-pulse' : 'group-hover:rotate-45'} transition-transform`} />
                <span>{optimizing ? '优化中...' : 'AI帮助优化提示词'}</span>
              </button>
            </div>
          </div>

          <div className="bg-[#0d1121] border border-white/5 rounded-[2rem] p-8 space-y-6">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">高级配置</h3>
            
            <div className="space-y-3">
              <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">AI 模型选择</label>
              <div className="relative">
                <select 
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={loadingModels || models.length === 0}
                  className="w-full bg-[#060813] border border-white/5 rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:border-cyan-500 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingModels ? (
                    <option>加载中...</option>
                  ) : models.length === 0 ? (
                    <option>暂无可用模型</option>
                  ) : (
                    models.map((modelOption) => (
                      <option key={modelOption.id} value={modelOption.id}>
                        {modelOption.name}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-3">
                <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">图片分辨率</label>
                <div className="relative">
                  <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="w-full bg-[#060813] border border-white/5 rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:border-cyan-500 transition-all font-bold">
                    {availableResolutions.map(res => (
                      <option key={res} value={res}>{res}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">数量</label>
                 <div className="relative">
                  <select value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full bg-[#060813] border border-white/5 rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:border-cyan-500 transition-all font-bold">
                    {availableQuantities.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">图片尺寸比例</label>
              <div className="bg-[#060813] border border-white/5 rounded-xl overflow-hidden p-1">
                 <button 
                    onClick={() => setRatiosOpen(!ratiosOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                       <div className="text-gray-400"><RatioIcon label={aspectRatio} /></div>
                       <span className="text-sm font-black tracking-tight text-white">{aspectRatio}</span>
                    </div>
                    {ratiosOpen ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
                 </button>

                 {ratiosOpen && (
                    <div className="mt-1 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                      {availableRatios.map(r => (
                        <button 
                          key={r.label}
                          onClick={() => { setAspectRatio(r.label); setRatiosOpen(false); }}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${aspectRatio === r.label ? 'bg-white/5 text-[#2cc2f5]' : 'text-gray-400 hover:bg-white/10'}`}
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`transition-colors ${aspectRatio === r.label ? 'text-[#2cc2f5]' : 'text-gray-600'}`}>
                              <RatioIcon label={r.label} />
                            </div>
                            <span className="text-sm font-black tracking-tight">{r.label}</span>
                          </div>
                          {aspectRatio === r.label && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                 )}
              </div>
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
            disabled={generating || !prompt}
            className="w-full brand-gradient py-5 rounded-[1.5rem] font-black text-xl shadow-2xl glow-cyan hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center space-x-3 tracking-[0.2em]"
          >
            {generating ? (
              <RefreshCcw className="w-6 h-6 animate-spin" />
            ) : (
              <Send className="w-6 h-6" />
            )}
            <span>{generating ? '正在渲染...' : '开始创作'}</span>
          </button>
        </div>

        <div className="lg:col-span-8">
          {!generating && images.length > 0 ? (
            <div className={`grid gap-6 ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {images.map((imgNode, i) => (
                <div 
                  key={i} 
                  onClick={() => onSelectAsset(imgNode)}
                  className="group relative aspect-square rounded-[2rem] overflow-hidden bg-[#0d1121] border border-white/5 shadow-2xl transition-all hover:border-cyan-500/30 cursor-pointer"
                >
                  <img src={imgNode.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Generated" />
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl backdrop-blur-md border border-white/20 transition-all hover:scale-110">
                      <Download className="w-8 h-8 text-white" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full min-h-[600px] border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center text-gray-700 bg-white/[0.01]">
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
                <div className="text-center px-20">
                  <div className="w-24 h-24 brand-gradient rounded-3xl opacity-5 mx-auto mb-8 flex items-center justify-center rotate-12">
                    <ImageIcon className="w-12 h-12 text-white" />
                  </div>
                  <h4 className="text-lg font-black text-gray-500 mb-2">准备就绪</h4>
                  <p className="text-sm text-gray-600 font-medium">在左侧输入您的创意描述，点击生成后，高清作品将呈现在此。</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextToImage;
