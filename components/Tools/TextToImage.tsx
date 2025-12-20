
import React, { useState } from 'react';
import { Send, Wand2, Download, RefreshCcw, Image as ImageIcon, Zap, ChevronDown, Check, ChevronUp } from 'lucide-react';
import { AssetNode } from '../../types';
import AssetPickerModal from '../modals/AssetPickerModal';

interface TextToImageProps {
  onSelectAsset: (asset: AssetNode) => void;
}

const TextToImage: React.FC<TextToImageProps> = ({ onSelectAsset }) => {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<AssetNode[]>([]);
  const [model, setModel] = useState('meji-flux-v2');
  const [resolution, setResolution] = useState('1K');
  const [aspectRatio, setAspectRatio] = useState('Auto');
  const [quantity, setQuantity] = useState('1');
  const [ratiosOpen, setRatiosOpen] = useState(false);

  const ratios = [
    { label: 'Auto' }, { label: '16:9' }, { label: '9:16' }, { label: '3:2' }, { label: '2:3' }, { label: '4:3' }, { label: '3:4' }, { label: '1:1' }, { label: '21:9' }
  ];

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setTimeout(() => {
      const numImages = parseInt(quantity);
      const newImages: AssetNode[] = Array.from({ length: numImages }, (_, i) => ({
        id: `gen-${Date.now()}-${i}`,
        name: prompt.substring(0, 30) || 'Untitled Image',
        type: 'image',
        createdAt: Date.now(),
        url: `https://picsum.photos/seed/${Math.random()}/800/800`,
        prompt: prompt,
      }));
      setImages(newImages);
      setGenerating(false);
    }, 3000);
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
               <button onClick={() => setPrompt('')} className="text-gray-600 hover:text-white transition-colors"><RefreshCcw className="w-3 h-3" /></button>
            </div>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述您的奇思妙想..."
              className="w-full h-48 bg-[#060813] border border-white/5 rounded-2xl p-6 text-sm resize-none focus:border-cyan-500 outline-none transition-all font-medium leading-relaxed"
            />
            <button className="mt-6 flex items-center space-x-2 text-[10px] text-cyan-400 hover:text-cyan-300 font-black uppercase tracking-widest group">
              <Wand2 className="w-3 h-3 group-hover:rotate-45 transition-transform" />
              <span>Magic Prompt AI 增强</span>
            </button>
          </div>

          <div className="bg-[#0d1121] border border-white/5 rounded-[2rem] p-8 space-y-6">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">高级配置</h3>
            
            <div className="space-y-3">
              <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">AI 模型选择</label>
              <div className="relative">
                <select 
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-[#060813] border border-white/5 rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:border-cyan-500 transition-all font-bold"
                >
                  <option value="meji-flux-v2">Meji Flux v2.2 (超写实)</option>
                  <option value="meji-anime-v1">Meji Anime (二次元)</option>
                  <option value="meji-scifi-v3">Meji Sci-Fi (科幻设定)</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-3">
                <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">图片分辨率</label>
                <div className="relative">
                  <select value={resolution} onChange={(e) => setResolution(e.target.value)} className="w-full bg-[#060813] border border-white/5 rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:border-cyan-500 transition-all font-bold">
                    <option>1K</option>
                    <option>2K</option>
                    <option>4K</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">数量</label>
                 <div className="relative">
                  <select value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full bg-[#060813] border border-white/5 rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:border-cyan-500 transition-all font-bold">
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
                    <div className="mt-1 space-y-1">
                      {ratios.map(r => (
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
          {images.length > 0 ? (
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
                  <p className="font-black text-gray-500 uppercase tracking-widest text-sm">美迹AI 正在渲染画面数据...</p>
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
