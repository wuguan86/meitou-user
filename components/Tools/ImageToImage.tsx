
import React, { useState, useEffect, useRef } from 'react';
import { message, Progress } from 'antd';
import { 
  Layers, 
  Upload, 
  RefreshCcw, 
  Send, 
  ImageIcon, 
  Zap, 
  ChevronDown, 
  Check, 
  Sparkles, 
  Settings2,
  Maximize2,
  FolderOpen,
  Cpu,
  ChevronUp,
  FilePlus2,
  Film,
  Download,
  Wand2,
  Gem,
  X
} from 'lucide-react';
import { AssetNode, ImageGenerationConfig } from '../../types';
// fix: Corrected import path casing from 'Modals' to 'modals'.
import AssetPickerModal from '../Modals/AssetPickerModal';
import { SecureImage } from '../SecureImage';
import * as generationAPI from '../../api/generation';
import * as uploadAPI from '../../api/upload';
import { promptRechargeForInsufficientBalance } from '../../api/index';
import { storageApi } from '../../api/storage';

interface ImageToImageProps {
  onSelectAsset: (asset: AssetNode) => void;
  onDeductPoints?: (points: number) => void;
  availablePoints?: number;
  onOpenRecharge?: () => void;
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

const ImageToImage: React.FC<ImageToImageProps> = ({ onSelectAsset, onDeductPoints, availablePoints, onOpenRecharge }) => {
  const [activeTab, setActiveTab] = useState<'single' | 'multi'>('single');
  const [model, setModel] = useState('');
  const [resolution, setResolution] = useState('1K');
  const [aspectRatio, setAspectRatio] = useState('Auto');
  const [quantity, setQuantity] = useState('1');
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<(string | null)[]>([null, null, null]);
  const [ratiosOpen, setRatiosOpen] = useState(false);
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [pickerTargetIndex, setPickerTargetIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<AssetNode[]>([]);
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
    const baseCost = currentModel?.defaultCost || 15;
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
        const platformModels = await generationAPI.getImageToImageModels();
        
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
        // 如果有模型，设置第一个为默认值
        if (allModels.length > 0) {
          setModel(allModels[0].id);
        }
        
        // 检查是否有"一键制作同款"的配置参数
        try {
          const makeSimilarConfigStr = localStorage.getItem('makeSimilarConfig');
          if (makeSimilarConfigStr) {
            const makeSimilarConfig = JSON.parse(makeSimilarConfigStr);
            if (makeSimilarConfig.generationType === 'img2img' && makeSimilarConfig.config) {
              const config = makeSimilarConfig.config as ImageGenerationConfig;
              // 填充表单
              if (config.prompt) setPrompt(config.prompt);
              if (config.model) setModel(config.model);
              if (config.resolution) setResolution(config.resolution);
              if (config.aspectRatio) setAspectRatio(config.aspectRatio);
              if (config.quantity) setQuantity(config.quantity.toString());
              // 加载参考图片
              if (config.referenceImages && config.referenceImages.length > 0) {
                const refreshReferenceImageUrl = async (input: string) => {
                  const raw = (input || '').trim();
                  const lower = raw.toLowerCase();
                  if (!raw) return raw;
                  if (lower.startsWith('data:') || lower.startsWith('blob:')) return raw;
                  try {
                    return await storageApi.getFileUrl(raw);
                  } catch {
                    return raw;
                  }
                };

                const refreshed = await Promise.all(
                  config.referenceImages.slice(0, 3).map(refreshReferenceImageUrl)
                );
                const newFiles: (string | null)[] = [null, null, null];
                refreshed.forEach((url, index) => {
                  newFiles[index] = url;
                });
                setFiles(newFiles);
                // 根据参考图片数量设置tab
                setActiveTab(config.referenceImages.length > 1 ? 'multi' : 'single');
              }
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
        setModels([{ id: 'flux-1.0', name: 'Flux 1.0 (推荐)', defaultCost: 15 }]);
        setModel('flux-1.0');
      } finally {
        setLoadingModels(false);
      }
    };
    loadModels();
  }, []);

  const ratios = [
    { label: 'Auto' }, { label: '16:9' }, { label: '9:16' }, { label: '3:2' }, { label: '2:3' }, { label: '4:3' }, { label: '3:4' }, { label: '1:1' }, { label: '21:9' }
  ];
  
  const handleFileSelect = (asset: AssetNode) => {
    if (asset.url) {
      const newFiles = [...files];
      newFiles[pickerTargetIndex] = asset.url;
      setFiles(newFiles);
    }
    setIsAssetPickerOpen(false);
  };
  
  const openAssetPicker = (index: number) => {
    setPickerTargetIndex(index);
    setIsAssetPickerOpen(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const f = e.target.files?.[0];
    if (f) {
      try {
        // 上传图片到服务器，获取URL
        const imageUrl = await uploadAPI.uploadImage(f);
        const newFiles = [...files];
        newFiles[index] = imageUrl;
        setFiles(newFiles);
        message.success('图片上传成功');
      } catch (error) {
        console.error('上传失败:', error);
        message.error('图片上传失败，请检查网络或图片格式');
      } finally {
        // 清除input的值，以便可以重新选择同一张图片
        e.target.value = '';
      }
    }
  };

  const handleGenerate = async () => {
    // 验证提示词和图片
    if (!prompt.trim()) {
      message.warning('请输入提示词');
      return;
    }
    
    // 检查是否有参考图片
    const hasImage = activeTab === 'single' ? !!files[0] : files.some(f => f !== null);
    
    if (!hasImage) {
      message.warning('请上传参考图片');
      return;
    }

    const cost = calculateCost();
    if (cost > 0 && availablePoints !== undefined && availablePoints < cost) {
      promptRechargeForInsufficientBalance();
      return;
    }

    setGenerating(true);
    setProgress(0); // 重置进度
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
      // 收集有效的参考图片
      let validFiles: string[] = [];
      if (activeTab === 'single') {
        if (files[0]) validFiles.push(files[0]);
      } else {
        validFiles = files.filter(f => f !== null) as string[];
      }

      // 准备请求参数
      const request: generationAPI.ImageToImageRequest = {
        prompt: prompt,
        urls: validFiles,
        model: model,
        aspectRatio: aspectRatio === 'Auto' ? undefined : aspectRatio,
        resolution: resolution === 'Auto' ? undefined : resolution,
        quantity: parseInt(quantity),
        webHook: '-1',
        shutProgress: false,
      };
      
      // 调用图生图API
      let response = await generationAPI.imageToImage(request);
      
      // 如果返回了记录ID且状态为处理中，开始轮询
      if (response.generationRecordId && (response.status === 'processing' || response.status === 'running')) {
         const recordId = response.generationRecordId;
         let retries = 0;
         while (true) {
             // 前端每隔 2-3 秒问一次后端结果
             await new Promise(resolve => setTimeout(resolve, 2500));
             
             const statusRes = await generationAPI.getTaskStatus(recordId);
             
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
        resolution: resolution === 'Auto' ? undefined : resolution,
        aspectRatio: aspectRatio === 'Auto' ? undefined : aspectRatio,
        quantity: parseInt(quantity),
        referenceImages: validFiles,
      };

      const normalizeUrl = (input?: string) => {
        if (!input) return input;
        try {
          const parsed = new URL(input);
          return `${parsed.origin}${parsed.pathname}`;
        } catch {
          const idx = input.indexOf('?');
          return idx >= 0 ? input.slice(0, idx) : input;
        }
      };

      const buildRecordIdByUrl = async () => {
        const urlSet = new Set((response.imageUrls || []).map(normalizeUrl).filter(Boolean) as string[]);
        const idByUrl = new Map<string, number>();
        for (let attempt = 0; attempt < 3; attempt++) {
          const page = await generationAPI.getGenerationRecords(1, 50, 'image');
          for (const record of page.records) {
            const key = normalizeUrl(record.contentUrl);
            if (key) {
              idByUrl.set(key, record.id);
            }
          }
          const resolvedCount = Array.from(urlSet).filter((u) => idByUrl.has(u)).length;
          if (resolvedCount === urlSet.size) {
            return idByUrl;
          }
          await new Promise((r) => setTimeout(r, 400));
        }
        return idByUrl;
      };

      let recordIdByUrl = new Map<string, number>();
      try {
        recordIdByUrl = await buildRecordIdByUrl();
      } catch {
        recordIdByUrl = new Map<string, number>();
      }

      // 将响应转换为AssetNode格式
      const newImages: AssetNode[] = response.imageUrls.map((url, i) => ({
        id: `gen-${Date.now()}-${i}`,
        name: prompt.substring(0, 30) || 'Untitled Image',
        type: 'image',
        createdAt: Date.now(),
        url: url,
        prompt: prompt,
        originalImageUrl: files[0] || undefined,
        generationType: 'img2img',
        generationConfig: generationConfig,
        generationRecordId: recordIdByUrl.get(normalizeUrl(url) || '') || (i === 0 ? response.generationRecordId : undefined),
      }));
      
      setImages(newImages);
      onSelectAsset(newImages[0]);
    } catch (error: any) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

      // 失败时退回算力
      if (onDeductPoints) {
        onDeductPoints(-cost);
      }

      // 错误处理
      const errorMsg = error.message || '未知错误';
      if (!errorMsg.includes('算力不足')) {
        message.error('生成失败: ' + errorMsg);
      }
      console.error('图生图失败:', error);
    } finally {
      setGenerating(false);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
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
  
  const handleRemove = (index: number) => {
    const newFiles = [...files];
    newFiles[index] = null;
    setFiles(newFiles);
  };

  const UploadBox = ({ index, label }: { index: number, label: string }) => (
    <div className="relative group block aspect-square">
      <label className="block w-full h-full border-2 border-dashed border-[#22283d] bg-[#151929] rounded-2xl cursor-pointer hover:border-[#ff2e8c]/30 transition-all overflow-hidden relative">
        {files[index] ? (
          <img src={files[index]!} className="w-full h-full object-contain" alt="Preview" />
        ) : (
          <div className="h-full flex flex-col items-center justify-center space-y-2">
            <Upload className="w-5 h-5 text-gray-500" />
            <p className="text-xs font-bold text-gray-400">{label}</p>
          </div>
        )}
        <input type="file" className="hidden" onChange={(e) => handleUpload(e, index)} accept="image/*" />
      </label>
      {files[index] && (
        <button 
          className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all z-10"
          onClick={(e) => {
            e.stopPropagation();
            handleRemove(index);
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );


  return (
    <>
    <div className="space-y-10">
        <div>
          <h2 className="text-4xl font-black tracking-tighter mb-2">图生图 <span className="brand-text-gradient pr-2">Engine</span></h2>
          <p className="text-gray-500">用图片参考，生成一个您想要的高质量图片</p>
        </div>
        <div className="flex h-full gap-8">
          {/* Editing Panel */}
          <div className="w-[480px] flex flex-col h-full space-y-6 bg-[#0d1121] p-6 overflow-y-auto custom-scrollbar border-r border-white/5 rounded-[2rem]">
            {/* Upload Reference */}
            <div className="space-y-3">
              {/* Mode Tabs */}
              <div className="flex bg-[#151929] p-1 rounded-xl mb-2">
                <button
                  onClick={() => setActiveTab('single')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'single' ? 'bg-gradient-to-r from-[#2d62ff] to-[#ff2e8c] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  单图参考
                </button>
                <button
                  onClick={() => setActiveTab('multi')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    activeTab === 'multi' ? 'bg-gradient-to-r from-[#2d62ff] to-[#ff2e8c] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  多图参考
                </button>
              </div>

              <div className="flex items-center justify-end px-1">
                <button 
                  onClick={() => {
                    let targetIndex = 0;
                    if (activeTab === 'multi') {
                      const emptyIndex = files.findIndex((f, i) => f === null && i < 3);
                      if (emptyIndex !== -1) targetIndex = emptyIndex;
                    }
                    openAssetPicker(targetIndex);
                  }}
                  className="text-[12px] text-[#ff2e8c] flex items-center space-x-1 hover:text-[#ff2e8c]/80 transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>从资产选择</span>
                </button>
              </div>

              <div className={`grid gap-2 ${activeTab === 'single' ? 'grid-cols-1' : 'grid-cols-3'}`}>
                <UploadBox index={0} label={activeTab === 'single' ? "参考图" : "图 1"} />
                {activeTab === 'multi' && (
                  <>
                    <UploadBox index={1} label="图 2" />
                    <UploadBox index={2} label="图 3" />
                  </>
                )}
              </div>
            </div>

            {/* Prompt Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-bold text-white">
                  提示词 (Prompt)
                </span>
              </div>
              <div className="bg-[#151929] rounded-2xl border border-white/5 overflow-hidden focus-within:border-[#2cc2f5]/30 transition-all">
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="您可以描述您想要优化的图片内容，比如将图片的人物眼睛换成双眼皮，保留皮肤的真实感的同时，把皮肤的痘印淡化。"
                  className="w-full h-36 bg-transparent p-5 text-sm font-medium outline-none resize-none placeholder:text-gray-700 leading-relaxed"
                />
              </div>
              <div className="flex justify-end mt-2 px-1">
                <button 
                  onClick={handleOptimizePrompt}
                  disabled={optimizing}
                  className={`flex items-center space-x-2 text-[10px] ${optimizing ? 'text-gray-500 cursor-not-allowed' : 'text-cyan-400 hover:text-cyan-300'} font-black uppercase tracking-widest group`}
                >
                  <Wand2 className={`w-3 h-3 ${optimizing ? 'animate-spin' : 'group-hover:rotate-45'} transition-transform`} />
                  <span>{optimizing ? '正在优化...' : 'AI帮助优化提示词'}</span>
                </button>
              </div>
            </div>

            {/* Advanced Section */}
            <div className="space-y-6 pt-2">
              <div className="flex items-center space-x-2 text-white/80 pb-2 border-b border-white/5">
                <Settings2 className="w-4 h-4 text-[#2cc2f5]" />
                <h3 className="text-sm font-black uppercase tracking-tight">高级设置</h3>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-500">AI 模型</label>
                <div className="relative">
                  <Cpu className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <select 
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    disabled={loadingModels}
                    className="w-full bg-[#151929] border border-white/5 rounded-xl py-3.5 pl-11 pr-10 text-sm font-bold appearance-none outline-none focus:border-[#2cc2f5]/50 transition-all text-white disabled:opacity-50"
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
                    <label className="text-xs font-bold text-gray-500">分辨率</label>
                    <div className="relative">
                      <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="w-full bg-[#151929] border border-white/5 rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:border-cyan-500 transition-all font-bold">
                        {availableResolutions.map(res => (
                          <option key={res} value={res}>{res}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500">数量</label>
                    <div className="relative">
                      <select value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full bg-[#151929] border border-white/5 rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:border-cyan-500 transition-all font-bold">
                        {availableQuantities.map(q => (
                          <option key={q} value={q}>{q}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                    </div>
                  </div>
                </div>

              <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500">图片尺寸比例</label>
                  <div className="bg-[#151929] border border-white/5 rounded-xl p-1 relative">
                    <button onClick={() => setRatiosOpen(!ratiosOpen)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
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
                
                <div className="flex items-center justify-between pt-2 px-1">
                    <span className="text-xs text-gray-500 font-bold">预计消耗算力</span>
                    <div className="flex items-center space-x-1">
                        <div className="w-3.5 h-3.5 brand-gradient rounded-full flex items-center justify-center">
                            <Gem className="w-2 h-2 text-white" />
                        </div>
                        <span className="text-base font-black text-white">{calculateCost()}</span>
                        <span className="text-[10px] text-gray-500 font-bold">PTS</span>
                    </div>
                </div>
            </div>

            {/* Generate Button Area */}
            <div className="pt-4">
              <button 
                onClick={handleGenerate}
                disabled={generating || !prompt.trim() || !files[0]}
                className="w-full brand-gradient py-5 rounded-2xl font-black text-lg text-white shadow-2xl glow-pink hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-3"
              >
                {generating ? (
                  <>
                    <RefreshCcw className="w-5 h-5 fill-current animate-spin" />
                    <span>正在渲染...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 fill-current" />
                    <span>开始创作</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview Container */}
          <div className="flex-1 p-8 flex flex-col items-center justify-center bg-white/[0.01]">
            {!generating && images.length > 0 ? (
              <div className={`grid gap-6 w-full ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {images.map((imgNode, i) => (
                  <div 
                    key={i} 
                    onClick={() => onSelectAsset(imgNode)}
                    className="group relative aspect-square rounded-[2rem] overflow-hidden bg-[#0d1121] border border-white/5 shadow-2xl transition-all hover:border-cyan-500/30 cursor-pointer"
                  >
                    <SecureImage src={imgNode.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Generated" />
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl backdrop-blur-md border border-white/20 transition-all hover:scale-110">
                        <Download className="w-8 h-8 text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="max-w-2xl w-full aspect-square border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center text-gray-800">
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
                    <Layers className="w-20 h-20 mb-6 opacity-5" />
                    <p className="font-black text-xl uppercase tracking-widest opacity-10">Meji AI Rendering Engine</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
    </div>
    <AssetPickerModal 
      isOpen={isAssetPickerOpen} 
      onClose={() => setIsAssetPickerOpen(false)}
      onSelect={handleFileSelect}
      filterType="image"
    />
    </>
  );
};

export default ImageToImage;
