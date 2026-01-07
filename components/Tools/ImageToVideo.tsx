import React, { useState, useEffect, useRef } from 'react';
import { message, Progress } from 'antd';
import { PlaySquare, Upload, ChevronDown, Sparkles, Film, Image as ImageIcon, FolderOpen, ChevronUp, X, Zap, Wand2, Gem, User, Video as VideoIcon } from 'lucide-react';
import { AssetNode, VideoGenerationConfig } from '../../types';
// fix: Corrected import path casing from 'Modals' to 'modals'.
import AssetPickerModal from '../Modals/AssetPickerModal';
import * as generationAPI from '../../api/generation';
import { uploadImage, uploadVideo } from '../../api/upload';

interface ImageToVideoProps {
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
  quantities?: number[];
  defaultCost?: number;
}

// 自定义错误类，用于区分前端逻辑抛出的错误和API拦截器处理过的错误
class GenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GenerationError';
  }
}

const ImageToVideo: React.FC<ImageToVideoProps> = ({ onSelectAsset, onDeductPoints }) => {
  // Mode states
  const [mainMode, setMainMode] = useState<'novice' | 'professional'>('novice');
  // Novice sub-modes: frames (首尾帧), multi_image (多图)
  const [noviceSubMode, setNoviceSubMode] = useState<'frames' | 'multi_image'>('frames');
  const [professionalMode, setProfessionalMode] = useState<'creation' | 'continuation'>('creation');

  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videos, setVideos] = useState<AssetNode[]>([]);
  const [model, setModel] = useState('');
  const [duration, setDuration] = useState<string|number>('Auto');
  const [resolution, setResolution] = useState('720P');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [quantity, setQuantity] = useState(1);
  const [file, setFile] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video'>('image');
  const [lastFrameFile, setLastFrameFile] = useState<string | null>(null);
  const [referenceFiles, setReferenceFiles] = useState<string[]>([]);
  
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
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
    : ['720P', '1080P'];
    
  const availableRatios = currentModel?.ratios && currentModel.ratios.length > 0
    ? currentModel.ratios.map(r => ({ label: r }))
    : [{ label: '16:9' }, { label: '9:16' }];

  const availableDurations: (string|number)[] = currentModel?.durations && currentModel.durations.length > 0
    ? ['Auto', ...currentModel.durations]
    : ['Auto', 5, 10, 15];

  const availableQuantities = currentModel?.quantities && currentModel.quantities.length > 0
    ? currentModel.quantities
    : [1];

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
    return baseCost * quantity;
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
      // duration 检查比较复杂，因为有 'Auto'
      if (currentModel.durations && currentModel.durations.length > 0) {
        if (duration !== 'Auto' && typeof duration === 'number' && !currentModel.durations.includes(duration)) {
           setDuration('Auto');
        }
      }
      // quantity 检查
      if (currentModel.quantities && currentModel.quantities.length > 0 && !currentModel.quantities.includes(quantity)) {
        setQuantity(currentModel.quantities[0]);
      }
    }
  }, [model, currentModel]); // eslint-disable-line react-hooks/exhaustive-deps

  // 当切换到新手模式时，自动选择 veo 模型
  useEffect(() => {
    if (mainMode === 'novice' && models.length > 0) {
      const veoModel = models.find(m => m.id.toLowerCase().includes('veo'));
      if (veoModel) {
        setModel(veoModel.id);
      }
    }
  }, [mainMode, models]);

  // 从后端加载模型列表
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoadingModels(true);
        // 获取所有平台的模型列表
        const platformModels = await generationAPI.getImageToVideoModels();
        
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
                quantities: modelInfo.quantities,
                defaultCost: modelInfo.defaultCost
              });
            }
          });
        });
        
        setModels(allModels);
        // 如果有模型，设置第一个为默认值
        if (allModels.length > 0) {
           // 优先选择 veo 模型 (如果存在)
           const veoModel = allModels.find(m => m.id.toLowerCase().includes('veo'));
           setModel(veoModel ? veoModel.id : allModels[0].id);
        }
        
        // 检查是否有"一键制作同款"的配置参数
        try {
          const makeSimilarConfigStr = localStorage.getItem('makeSimilarConfig');
          if (makeSimilarConfigStr) {
            const makeSimilarConfig = JSON.parse(makeSimilarConfigStr);
            if (makeSimilarConfig.generationType === 'img2video' && makeSimilarConfig.config) {
              const config = makeSimilarConfig.config as VideoGenerationConfig;
              // 填充表单
              if (config.prompt) setPrompt(config.prompt);
              if (config.model) setModel(config.model);
              if (config.resolution) setResolution(config.resolution || '720P');
              if (config.aspectRatio) setAspectRatio(config.aspectRatio || '16:9');
              if (config.duration) setDuration(config.duration || 'Auto');
              // 加载参考图片
              if (config.referenceImage) {
                setFile(config.referenceImage);
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
        setModels([{ id: 'meji-vid-gen-v1', name: 'Meji Animation v1.0', defaultCost: 20 }]);
        setModel('meji-vid-gen-v1');
      } finally {
        setLoadingModels(false);
      }
    };
    loadModels();
  }, []);

  const [activePicker, setActivePicker] = useState<'first' | 'last' | 'reference' | null>(null);

  const handleGenericUpload = (setter: (val: string | null) => void) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      // 预览
      const reader = new FileReader();
      reader.onload = (ev) => {
        setter(ev.target?.result as string);
        setFileType('image');
      };
      reader.readAsDataURL(f);
      
      // 上传
      try {
        setUploading(true);
        const url = await uploadImage(f);
        setter(url);
        message.success('图片上传成功');
      } catch (error) {
        console.error('上传失败:', error);
        message.error('图片上传失败');
        setter(null);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleVideoUpload = (setter: (val: string | null) => void) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (!f.type.startsWith('video/')) {
        message.warning('仅支持视频格式的文件');
        return;
      }

      // 预览
      const url = URL.createObjectURL(f);
      setter(url);
      setFileType('video');
      
      // 上传
      try {
        setUploading(true);
        const serverUrl = await uploadVideo(f);
        setter(serverUrl);
        message.success('视频上传成功');
      } catch (error) {
        console.error('上传失败:', error);
        message.error('视频上传失败');
        setter(null);
        setFileType('image');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
        if (referenceFiles.length >= 5) { // Limit updated to 5
            message.warning('最多只能上传5张参考图片');
            return;
        }
        
        try {
            setUploading(true);
            const url = await uploadImage(f);
            setReferenceFiles([...referenceFiles, url]);
            message.success('图片上传成功');
        } catch (error) {
            console.error('上传失败:', error);
            message.error('图片上传失败');
        } finally {
            setUploading(false);
        }
    }
  }

  const handleFileSelect = (asset: AssetNode) => {
    if (asset.url) {
      if (activePicker === 'first') {
        setFile(asset.url);
        setFileType(asset.type === 'video' ? 'video' : 'image');
      }
      else if (activePicker === 'last') setLastFrameFile(asset.url);
      else if (activePicker === 'reference') {
        if (referenceFiles.length >= 5) {
            message.warning('最多只能上传5张参考图片');
        } else {
            setReferenceFiles([...referenceFiles, asset.url]);
        }
      }
    }
    setIsAssetPickerOpen(false);
    setActivePicker(null);
  };
  
  const handleGenerate = async () => {
    // 检查上传状态
    if (uploading) {
      message.warning('图片正在上传中，请稍候...');
      return;
    }

    // 验证提示词和图片
    if (!prompt.trim()) {
      message.warning('请输入提示词');
      return;
    }
    
    if (mainMode === 'novice') {
        if (noviceSubMode === 'frames') {
            if (!file) {
                message.warning('请上传首帧图片');
                return;
            }
        } else if (noviceSubMode === 'multi_image') {
            if (referenceFiles.length < 2) {
                message.warning('请至少上传2张图片以生成多图视频');
                return;
            }
        }
    } else {
        // Professional Mode Checks
        if (professionalMode === 'continuation') {
            message.warning('视频续写功能开发中');
            return;
        }
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
      let imageToSend = undefined;
      let firstFrameUrlToSend = undefined;
      let lastFrameUrlToSend = undefined;
      let urlsToSend = undefined;

      if (mainMode === 'novice') {
          if (noviceSubMode === 'frames') {
              imageToSend = file!;
              firstFrameUrlToSend = file!;
              lastFrameUrlToSend = lastFrameFile || undefined;
          } else {
              imageToSend = referenceFiles[0];
              urlsToSend = referenceFiles;
          }
      } else {
          // Professional mode
          if (professionalMode === 'creation') {
               if (file) {
                   imageToSend = file;
                   firstFrameUrlToSend = file;
               }
          }
      }

      const request: generationAPI.ImageToVideoRequest = {
        prompt: prompt,
        image: imageToSend || '', // 兼容必填字段
        model: model,
        aspectRatio: aspectRatio === 'Auto' ? undefined : aspectRatio,
        resolution: resolution === 'Auto' ? undefined : resolution,
        duration: typeof duration === 'number' ? duration : undefined,
        quantity: quantity,
        
        firstFrameUrl: firstFrameUrlToSend,
        lastFrameUrl: lastFrameUrlToSend,
        urls: urlsToSend,
        webHook: '-1',
        shutProgress: false,
      };
      
      // 调用图生视频API
      let response = await generationAPI.imageToVideo(request);
      
      // 如果返回了任务ID且状态为处理中，开始轮询
      if (response.taskId && (response.status === 'processing' || response.status === 'running')) {
         const taskId = response.taskId;
         let retries = 0;
         while (true) {
             // 前端每隔 2-3 秒问一次后端结果
             await new Promise(resolve => setTimeout(resolve, 2500));
             
             const statusRes = await generationAPI.getTaskStatus<generationAPI.VideoGenerationResponse>(taskId);
             
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
                 throw new GenerationError(statusRes.errorMessage || '生成失败');
             }
             
             retries++;
             if (retries > 432) { // 2.5s * 432 = 1080s (18分钟超时)
                 if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                 throw new GenerationError('生成超时');
             }
         }
      } else if (response.status === 'failed') {
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
          throw new GenerationError(response.errorMessage || '生成失败');
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
        referenceImage: imageToSend,
      };

      // 将响应转换为AssetNode格式
      const newVideo: AssetNode = {
        id: `gen-${Date.now()}`,
        name: prompt.substring(0, 30) || 'Untitled Video',
        type: 'video',
        createdAt: Date.now(),
        url: response.videoUrl,
        prompt: prompt,
        originalImageUrl: file || undefined,
        generationType: 'img2video',
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
      
      // 只有当我们自己抛出的 GenerationError 才显示错误提示
      // 其他错误（如 APIError）已经被全局拦截器显示过了，不需要重复显示
      if (error instanceof GenerationError) {
        const errorMsg = error.message || '未知错误';
        // 清理错误信息，避免重复前缀
        let displayMsg = errorMsg;
        if (displayMsg.startsWith('生成失败：')) displayMsg = displayMsg.substring(5);
        if (displayMsg.startsWith('图生视频失败：')) displayMsg = displayMsg.substring(7);
        // 再次检查以防嵌套
        if (displayMsg.startsWith('生成失败：')) displayMsg = displayMsg.substring(5);
        
        message.error(displayMsg);
      }
    } finally {
      setGenerating(false);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
  };
  
  const ImageUploader = ({ 
    file, 
    onUpload, 
    onClear, 
    label, 
    placeholder = "点击或拖拽图片",
    onPickAsset
  }: { 
    file?: string | null, 
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void, 
    onClear: () => void,
    label?: string,
    placeholder?: string,
    onPickAsset: () => void
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        {label && <span className="text-sm font-bold text-white">{label}</span>}
        <button onClick={onPickAsset} className="text-[12px] text-[#ff2e8c] flex items-center space-x-1 hover:text-[#ff2e8c]/80 transition-colors">
            <FolderOpen className="w-3.5 h-3.5" />
            <span>从资产选择</span>
        </button>
      </div>
      <label className="block aspect-video border-2 border-dashed border-[#22283d] bg-[#151929] rounded-2xl cursor-pointer hover:border-[#ff2e8c]/30 transition-all overflow-hidden relative group">
        {file ? (
          <>
            <img src={file} className="w-full h-full object-cover" alt="Preview" />
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClear(); }}
              className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center space-y-2">
            <Upload className="w-5 h-5 text-gray-500" />
            <p className="text-xs font-bold text-gray-400">{placeholder}</p>
          </div>
        )}
        <input type="file" className="hidden" onChange={onUpload} accept="image/*" />
      </label>
    </div>
  );

  const visibleModels = mainMode === 'novice' 
    ? models.filter(m => m.id.toLowerCase().includes('veo'))
    : models;

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tighter mb-2">图生视频 <span className="brand-text-gradient">Engine v3.3.9</span></h2>
          <p className="text-gray-500">上传一张图，让它动起来。</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-6">
          {/* Main Mode Tabs */}
          <div className="flex w-full p-1 bg-[#0d1121] rounded-xl border border-white/10">
            <button 
                onClick={() => setMainMode('novice')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mainMode === 'novice' ? 'brand-gradient text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
                新手模式
            </button>
            <button 
                onClick={() => setMainMode('professional')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mainMode === 'professional' ? 'brand-gradient text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
                专业模式
            </button>
          </div>

          <div className="bg-[#0d1121] border border-white/5 rounded-[2rem] p-6 space-y-6">
            
            {/* Sub Tabs based on Main Mode */}
            {mainMode === 'novice' ? (
                <div className="flex p-1 bg-[#060813] rounded-xl border border-white/5 mb-4">
                    <button 
                        onClick={() => setNoviceSubMode('frames')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${noviceSubMode === 'frames' ? 'bg-[#1c2132] text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                    >
                        首尾帧
                    </button>
                    <button 
                        onClick={() => setNoviceSubMode('multi_image')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${noviceSubMode === 'multi_image' ? 'bg-[#1c2132] text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                    >
                        多图参考
                    </button>
                </div>
            ) : (
                <div className="flex p-1 bg-[#060813] rounded-xl border border-white/5 mb-4">
                    <button 
                        onClick={() => setProfessionalMode('creation')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${professionalMode === 'creation' ? 'bg-[#1c2132] text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                    >
                        视频创作
                    </button>
                    <button 
                        onClick={() => setProfessionalMode('continuation')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${professionalMode === 'continuation' ? 'bg-[#1c2132] text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
                    >
                        视频续写
                    </button>
                </div>
            )}

            <div className="space-y-6">
              {mainMode === 'novice' && noviceSubMode === 'frames' && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-sm font-bold text-white">上传参考图片</span>
                        <button 
                            onClick={() => { setIsAssetPickerOpen(true); setActivePicker('first'); }} 
                            className="text-[12px] text-[#ff2e8c] flex items-center space-x-1 hover:text-[#ff2e8c]/80 transition-colors"
                        >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>从资产选择</span>
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="relative group">
                            <label className="block aspect-video border-2 border-dashed border-[#22283d] bg-[#151929] rounded-2xl cursor-pointer hover:border-[#ff2e8c]/30 transition-all overflow-hidden relative">
                                {file ? (
                                    <>
                                        <img src={file} className="w-full h-full object-cover" alt="First Frame" />
                                        <button 
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFile(null); }}
                                            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors z-10"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center space-y-2">
                                        <Upload className="w-5 h-5 text-gray-500" />
                                        <p className="text-xs font-bold text-gray-400">首帧</p>
                                    </div>
                                )}
                                <input type="file" className="hidden" onChange={handleGenericUpload(setFile)} accept="image/*" />
                            </label>
                         </div>
                         
                         <div className="relative group">
                            <label className="block aspect-video border-2 border-dashed border-[#22283d] bg-[#151929] rounded-2xl cursor-pointer hover:border-[#ff2e8c]/30 transition-all overflow-hidden relative">
                                {lastFrameFile ? (
                                    <>
                                        <img src={lastFrameFile} className="w-full h-full object-cover" alt="Last Frame" />
                                        <button 
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLastFrameFile(null); }}
                                            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors z-10"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center space-y-2">
                                        <Upload className="w-5 h-5 text-gray-500" />
                                        <p className="text-xs font-bold text-gray-400">尾帧</p>
                                    </div>
                                )}
                                <input type="file" className="hidden" onChange={handleGenericUpload(setLastFrameFile)} accept="image/*" />
                            </label>
                         </div>
                    </div>
                </div>
              )}

              {mainMode === 'novice' && noviceSubMode === 'multi_image' && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-sm font-bold text-white">上传参考图片</span>
                        <button onClick={() => { setIsAssetPickerOpen(true); setActivePicker('reference'); }} className="text-[12px] text-[#ff2e8c] flex items-center space-x-1 hover:text-[#ff2e8c]/80 transition-colors">
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>从资产选择</span>
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {referenceFiles.map((url, index) => (
                            <div key={index} className="relative aspect-[3/4] rounded-2xl overflow-hidden border-2 border-[#22283d] bg-[#151929] group">
                                <img src={url} className="w-full h-full object-cover" />
                                <button 
                                    onClick={() => {
                                        const newFiles = [...referenceFiles];
                                        newFiles.splice(index, 1);
                                        setReferenceFiles(newFiles);
                                    }}
                                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                                <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-gray-400 font-bold">图{index + 1}</div>
                            </div>
                        ))}
                        
                        {referenceFiles.length < 5 && (
                             <label className="aspect-[3/4] border-2 border-dashed border-[#22283d] bg-[#151929] rounded-2xl cursor-pointer hover:border-[#ff2e8c]/30 transition-all flex flex-col items-center justify-center space-y-2 group">
                                <div className="w-8 h-8 rounded-full bg-[#22283d] flex items-center justify-center group-hover:bg-[#ff2e8c] transition-colors">
                                    <Upload className="w-4 h-4 text-gray-400 group-hover:text-white" />
                                </div>
                                <span className="text-xs font-bold text-gray-400 group-hover:text-white">图{referenceFiles.length + 1}</span>
                                <input type="file" className="hidden" onChange={handleReferenceUpload} accept="image/*" />
                            </label>
                        )}
                        
                        {/* Fill remaining slots to visually show 3 if fewer than 3 are uploaded/active (optional, but matches 'empty state' of screenshot better) */}
                        {referenceFiles.length === 0 && (
                            <>
                                <div className="aspect-[3/4] border-2 border-dashed border-[#22283d]/50 bg-[#151929]/50 rounded-2xl flex flex-col items-center justify-center space-y-2 opacity-50">
                                     <div className="w-8 h-8 rounded-full bg-[#22283d] flex items-center justify-center">
                                        <Upload className="w-4 h-4 text-gray-500" />
                                    </div>
                                    <span className="text-xs font-bold text-gray-500">图2</span>
                                </div>
                                <div className="aspect-[3/4] border-2 border-dashed border-[#22283d]/50 bg-[#151929]/50 rounded-2xl flex flex-col items-center justify-center space-y-2 opacity-50">
                                     <div className="w-8 h-8 rounded-full bg-[#22283d] flex items-center justify-center">
                                        <Upload className="w-4 h-4 text-gray-500" />
                                    </div>
                                    <span className="text-xs font-bold text-gray-500">图3</span>
                                </div>
                            </>
                        )}
                         {referenceFiles.length === 1 && (
                            <div className="aspect-[3/4] border-2 border-dashed border-[#22283d]/50 bg-[#151929]/50 rounded-2xl flex flex-col items-center justify-center space-y-2 opacity-50">
                                 <div className="w-8 h-8 rounded-full bg-[#22283d] flex items-center justify-center">
                                    <Upload className="w-4 h-4 text-gray-500" />
                                </div>
                                <span className="text-xs font-bold text-gray-500">图3</span>
                            </div>
                        )}
                    </div>
                </div>
              )}

              {mainMode === 'professional' && professionalMode === 'creation' && (
                  <>
                  <div className="grid grid-cols-2 gap-4 h-48">
                      <label className="relative bg-[#151929] border border-white/5 rounded-2xl flex flex-col items-center justify-center space-y-4 hover:border-[#ff2e8c]/50 transition-all group cursor-pointer overflow-hidden">
                          {file ? (
                               <>
                                {fileType === 'video' ? (
                                    <video src={file} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" muted loop autoPlay />
                                ) : (
                                    <img src={file} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" alt="Preview" />
                                )}
                                <div className="z-10 flex flex-col items-center space-y-4">
                                    <div className="w-12 h-12 rounded-full bg-[#22283d] flex items-center justify-center group-hover:bg-[#ff2e8c] transition-colors shadow-lg">
                                      <User className="w-6 h-6 text-white" />
                                    </div>
                                    <span className="text-xs font-bold text-white drop-shadow-md">创建角色1</span>
                                </div>
                                <button 
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFile(null); }}
                                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors z-20"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                               </>
                          ) : (
                              <>
                                  <div className="w-12 h-12 rounded-full bg-[#22283d] flex items-center justify-center group-hover:bg-[#ff2e8c] transition-colors">
                                      <User className="w-6 h-6 text-white" />
                                  </div>
                                  <span className="text-xs font-bold text-gray-400 group-hover:text-white">创建角色1</span>
                              </>
                          )}
                          <input type="file" className="hidden" onChange={handleVideoUpload(setFile)} accept="video/*" />
                      </label>

                      <button className="bg-[#151929] border border-white/5 rounded-2xl flex flex-col items-center justify-center space-y-4 hover:border-[#ff2e8c]/50 transition-all group">
                          <div className="w-12 h-12 rounded-full bg-[#22283d] flex items-center justify-center group-hover:bg-[#ff2e8c] transition-colors">
                              <User className="w-6 h-6 text-white" />
                          </div>
                          <span className="text-xs font-bold text-gray-400 group-hover:text-white text-center px-2">创建角色2</span>
                      </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">上传1~3秒真人正面的视频</p>
                  </>
              )}

              {mainMode === 'professional' && professionalMode === 'continuation' && (
                  <div className="aspect-video border-2 border-dashed border-[#22283d] bg-[#151929] rounded-2xl flex flex-col items-center justify-center space-y-4 hover:border-[#ff2e8c]/30 transition-all">
                      <Upload className="w-8 h-8 text-gray-500" />
                      <span className="text-sm font-bold text-gray-400">上传需要续写的视频</span>
                  </div>
              )}

            </div>
            
            <div className="bg-[#060813] p-6 rounded-2xl border border-white/5">
              <p className="text-[10px] text-gray-600 font-bold uppercase mb-2 tracking-widest">PROMPT</p>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="输入视频描述..."
                className="w-full h-24 bg-transparent outline-none text-sm resize-none font-medium leading-relaxed"
              />
              <div className="flex justify-end mt-2 px-1">
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
            
            {mainMode === 'novice' && (
                <div className="space-y-2">
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
                             ) : visibleModels.length === 0 ? (
                                <option>暂无可用模型</option>
                             ) : (
                                visibleModels.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))
                             )}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">视频尺寸</label>
                    <div className="flex space-x-2 bg-[#060813] p-1 rounded-lg border border-white/5">
                         {availableRatios.map(ratioObj => {
                             const ratio = ratioObj.label;
                             return (
                             <button
                                key={ratio}
                                onClick={() => setAspectRatio(ratio)}
                                className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center space-x-1 ${aspectRatio === ratio ? 'bg-[#1c2132] text-white' : 'text-gray-500 hover:text-white'}`}
                             >
                                 {ratio === '16:9' ? <div className="w-3 h-2 border border-current rounded-[1px]"/> : 
                                  ratio === '9:16' ? <div className="w-2 h-3 border border-current rounded-[1px]"/> :
                                  <div className="w-2.5 h-2.5 border border-current rounded-[1px]"/>}
                                 <span>{ratio}</span>
                             </button>
                             );
                         })}
                    </div>
                </div>
                 <div className="space-y-2">
                    <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">视频时长(秒)</label>
                    <div className="flex space-x-2 bg-[#060813] p-1 rounded-lg border border-white/5">
                        {availableDurations.map(d => (
                            <button
                                key={d}
                                onClick={() => setDuration(d)}
                                className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center ${duration === d ? 'bg-[#1c2132] text-white' : 'text-gray-500 hover:text-white'}`}
                            >
                                {d}{d === 'Auto' ? '' : 's'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">视频清晰度</label>
                    <div className="flex space-x-2 bg-[#060813] p-1 rounded-lg border border-white/5">
                        {availableResolutions.map(res => (
                            <button
                                key={res}
                                onClick={() => setResolution(res)}
                                className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center ${resolution === res ? 'bg-[#1c2132] text-white' : 'text-gray-500 hover:text-white'}`}
                            >
                                {res}
                            </button>
                        ))}
                    </div>
                </div>
                 <div className="space-y-2">
                    <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">视频数量</label>
                    <div className="relative">
                        <button className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold bg-[#060813] border border-white/5 rounded-lg hover:bg-white/5 transition-colors">
                          <span>{quantity}</span>
                          <ChevronDown className="w-3 h-3 text-gray-600" />
                        </button>
                        <select 
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        >
                            {availableQuantities.map(q => (
                                <option key={q} value={q}>{q}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between px-2 pt-2">
                <span className="text-xs text-gray-500 font-bold">预计消耗算力</span>
                <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 brand-gradient rounded-full flex items-center justify-center">
                        <Gem className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span className="text-lg font-black text-white">{calculateCost()}</span>
                    <span className="text-xs text-gray-500 font-bold">PTS</span>
                </div>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={generating || uploading}
              className="w-full brand-gradient py-5 rounded-[1.5rem] font-black text-xl shadow-2xl glow-cyan hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-3 tracking-[0.2em] disabled:opacity-30"
            >
              <Sparkles className="w-5 h-5" />
              <span>{generating ? '生成中...' : '开始制作'}</span>
            </button>
            
          </div>
        </div>

        {/* Right Preview Area */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] text-gray-700 bg-white/[0.01] min-h-[500px]">
          {!generating && videos.length > 0 && videos[0].url ? (
            <div className="w-full h-full flex items-center justify-center">
              <video 
                src={videos[0].url} 
                controls 
                className="max-w-full max-h-full rounded-xl shadow-2xl" 
                autoPlay
                loop
              />
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
                  <VideoIcon className="w-24 h-24 text-[#6b48ff]/20 mb-6" />
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
    
    <AssetPickerModal 
      isOpen={isAssetPickerOpen}
      onClose={() => setIsAssetPickerOpen(false)}
      onSelect={handleFileSelect}
      filterType="image"
    />
    </>
  );
};

export default ImageToVideo;
