
import React, { useState, useEffect } from 'react';
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
  Download
} from 'lucide-react';
import { AssetNode, ImageGenerationConfig } from '../../types';
// fix: Corrected import path casing from 'Modals' to 'modals'.
import AssetPickerModal from '../modals/AssetPickerModal';
import * as generationAPI from '../../api/generation';
import * as uploadAPI from '../../api/upload';

interface ImageToImageProps {
  onSelectAsset: (asset: AssetNode) => void;
}

// 模型选项接口
interface ModelOption {
  id: string; // 模型ID
  name: string; // 模型显示名称
}

const ImageToImage: React.FC<ImageToImageProps> = ({ onSelectAsset }) => {
  const [activeTab, setActiveTab] = useState<'single' | 'frames' | 'multi'>('single');
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

  // 从后端加载模型列表（只在组件挂载时执行一次）
  useEffect(() => {
    const loadModels = async () => {
      try {
        setLoadingModels(true);
        // 获取所有平台的模型列表
        const platformModels = await generationAPI.getImageToImageModels();
        
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
                const newFiles: (string | null)[] = [null, null, null];
                config.referenceImages.forEach((url, index) => {
                  if (index < 3) {
                    newFiles[index] = url;
                  }
                });
                setFiles(newFiles);
                // 根据参考图片数量设置tab
                if (config.referenceImages.length === 1) {
                  setActiveTab('single');
                } else if (config.referenceImages.length === 2) {
                  setActiveTab('frames');
                } else {
                  setActiveTab('multi');
                }
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
        setModels([{ id: 'flux-1.0', name: 'Flux 1.0 (推荐)' }]);
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
      } catch (error) {
        // 如果上传失败，使用base64作为备选方案
        const reader = new FileReader();
        reader.onload = (ev) => {
          const newFiles = [...files];
          newFiles[index] = ev.target?.result as string;
          setFiles(newFiles);
        };
        reader.readAsDataURL(f);
      }
    }
  };

  const handleGenerate = async () => {
    // 验证提示词和图片
    if (!prompt.trim()) {
      alert('请输入提示词');
      return;
    }
    
    if (!files[0]) {
      alert('请上传参考图片');
      return;
    }
    
    setGenerating(true);
    try {
      // 准备请求参数
      const request: generationAPI.ImageToImageRequest = {
        prompt: prompt,
        image: files[0], // 第一张图片（URL或base64）
        model: model,
        aspectRatio: aspectRatio === 'Auto' ? undefined : aspectRatio,
        resolution: resolution,
        quantity: parseInt(quantity),
        mode: activeTab,
      };
      
      // 根据模式添加额外的图片
      if (activeTab === 'frames' && files[1]) {
        request.image2 = files[1];
      } else if (activeTab === 'multi') {
        if (files[1]) request.image2 = files[1];
        if (files[2]) request.image3 = files[2];
      }
      
      // 调用图生图API
      const response = await generationAPI.imageToImage(request);
      
      // 构建生成配置参数
      const referenceImages: string[] = [];
      if (files[0]) referenceImages.push(files[0]);
      if (activeTab === 'frames' && files[1]) referenceImages.push(files[1]);
      if (activeTab === 'multi') {
        if (files[1]) referenceImages.push(files[1]);
        if (files[2]) referenceImages.push(files[2]);
      }

      const generationConfig: ImageGenerationConfig = {
        prompt: prompt,
        model: model,
        resolution: resolution,
        aspectRatio: aspectRatio === 'Auto' ? undefined : aspectRatio,
        quantity: parseInt(quantity),
        referenceImages: referenceImages,
      };

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
      }));
      
      setImages(newImages);
    } catch (error: any) {
      // 错误处理
      alert('生成失败: ' + (error.message || '未知错误'));
      console.error('图生图失败:', error);
    } finally {
      setGenerating(false);
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
  
  const UploadBox = ({ index, label }: { index: number, label: string }) => (
    <label className="block aspect-square border-2 border-dashed border-[#22283d] bg-[#151929] rounded-2xl cursor-pointer hover:border-[#ff2e8c]/30 transition-all overflow-hidden relative group">
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
  );


  return (
    <>
    <div className="space-y-10">
        <div>
          <h2 className="text-4xl font-black tracking-tighter mb-2">图生图 <span className="brand-text-gradient">Engine v2.2</span></h2>
          <p className="text-gray-500">用单图、多图参考，生成一个您想要的高质量图片</p>
        </div>
        <div className="flex h-full gap-8">
          {/* Editing Panel */}
          <div className="w-[480px] flex flex-col h-full space-y-6 bg-[#0d1121] p-6 overflow-y-auto custom-scrollbar border-r border-white/5 rounded-[2rem]">
            {/* Tabs */}
            <div className="flex bg-[#151929] rounded-xl p-1">
              <button 
                onClick={() => setActiveTab('single')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'single' ? 'bg-[#22283d] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                单图参考
              </button>
              <button 
                onClick={() => setActiveTab('frames')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'frames' ? 'bg-[#22283d] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                首尾帧参考
              </button>
              <button 
                onClick={() => setActiveTab('multi')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'multi' ? 'bg-[#22283d] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                多图参考
              </button>
            </div>

            {/* Upload Reference */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-bold text-white">上传参考图片</span>
                <button onClick={() => openAssetPicker(0)} className="text-[12px] text-[#ff2e8c] flex items-center space-x-1 hover:text-[#ff2e8c]/80 transition-colors">
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>从资产选择</span>
                </button>
              </div>
              {activeTab === 'single' && <UploadBox index={0} label="点击或拖拽文件" />}
              {activeTab === 'frames' && (
                <div className="grid grid-cols-2 gap-4">
                  <UploadBox index={0} label="首帧" />
                  <UploadBox index={1} label="尾帧" />
                </div>
              )}
              {activeTab === 'multi' && (
                <div className="grid grid-cols-3 gap-2">
                  <UploadBox index={0} label="图 1" />
                  <UploadBox index={1} label="图 2" />
                  <UploadBox index={2} label="图 3" />
                </div>
              )}
            </div>

            {/* Prompt Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-bold text-white">
                  提示词 (Prompt)
                </span>
                <button className="text-[12px] text-[#2cc2f5] flex items-center space-x-1.5 hover:text-white transition-colors">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>优化提示词</span>
                </button>
              </div>
              <div className="bg-[#151929] rounded-2xl border border-white/5 overflow-hidden focus-within:border-[#2cc2f5]/30 transition-all">
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="描述你想要生成的画面细节..."
                  className="w-full h-36 bg-transparent p-5 text-sm font-medium outline-none resize-none placeholder:text-gray-700 leading-relaxed"
                />
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
                        <option>1K</option>
                        <option>2K</option>
                        <option>4K</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500">数量</label>
                    <div className="relative">
                      <select value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full bg-[#151929] border border-white/5 rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:border-cyan-500 transition-all font-bold">
                        <option>1</option>
                        <option>2</option>
                        <option>3</option>
                        <option>4</option>
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
            {images.length > 0 ? (
              <div className={`grid gap-6 w-full ${images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
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
                    <p className="font-black text-gray-500 uppercase tracking-widest text-sm">美迹AI 正在渲染画面数据...</p>
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
