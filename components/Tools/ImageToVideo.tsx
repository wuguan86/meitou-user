
import React, { useState } from 'react';
import { PlaySquare, Upload, ChevronDown, Sparkles, Film, Image as ImageIcon, FolderOpen, ChevronUp } from 'lucide-react';
import { AssetNode } from '../../types';
// fix: Corrected import path casing from 'Modals' to 'modals'.
import AssetPickerModal from '../modals/AssetPickerModal';


interface ImageToVideoProps {
  onSelectAsset: (asset: AssetNode) => void;
}

const ImageToVideo: React.FC<ImageToVideoProps> = ({ onSelectAsset }) => {
  const [model, setModel] = useState('meji-vid-gen-v1');
  const [duration, setDuration] = useState<string|number>('Auto');
  const [resolution, setResolution] = useState('720P');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [file, setFile] = useState<string | null>(null);
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [ratiosOpen, setRatiosOpen] = useState(false);
  const [resolutionOpen, setResolutionOpen] = useState(false);

  const durations: (string|number)[] = ['Auto', 8, 10, 15, 20, 25];
  const resolutions = ['270P', '720P', '1080P'];
  const ratios = [{ label: '16:9' }, { label: '9:16' }];

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFile(ev.target?.result as string);
      };
      reader.readAsDataURL(f);
    }
  };
  
  const handleFileSelect = (asset: AssetNode) => {
    if (asset.url) {
      setFile(asset.url);
    }
    setIsAssetPickerOpen(false);
  };
  
  const RatioIcon = ({ label }: { label: string }) => {
    const isPortrait = label.startsWith('9:');
    const isWide = !isPortrait;
    return (
      <div className={`border-2 border-current rounded-sm ${
        isWide ? 'w-5 h-3' : 'w-3 h-5'
      }`} />
    );
  };

  const UploadBox = () => (
    <label className="block aspect-video border-2 border-dashed border-[#22283d] bg-[#151929] rounded-2xl cursor-pointer hover:border-[#ff2e8c]/30 transition-all overflow-hidden relative group">
      {file ? (
        <img src={file} className="w-full h-full object-cover" alt="Preview" />
      ) : (
        <div className="h-full flex flex-col items-center justify-center space-y-2">
          <Upload className="w-5 h-5 text-gray-500" />
          <p className="text-xs font-bold text-gray-400">点击或拖拽图片</p>
        </div>
      )}
      <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
    </label>
  );

  return (
    <>
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tighter mb-2">图生视频 <span className="brand-text-gradient">Engine v2.2</span></h2>
          <p className="text-gray-500">上传一张图，让它动起来。</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-[#0d1121] border border-white/5 rounded-[2rem] p-8 space-y-8">
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-bold text-white">上传参考图片</span>
                <button onClick={() => setIsAssetPickerOpen(true)} className="text-[12px] text-[#ff2e8c] flex items-center space-x-1 hover:text-[#ff2e8c]/80 transition-colors">
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>从资产选择</span>
                </button>
              </div>
              <UploadBox />
            </div>
            
            <div className="bg-[#060813] p-6 rounded-2xl border border-white/5">
              <p className="text-[10px] text-gray-600 font-bold uppercase mb-2 tracking-widest">提示词输入</p>
              <textarea 
                placeholder="描述视频场景..."
                className="w-full h-24 bg-transparent outline-none text-sm resize-none font-medium leading-relaxed"
              />
            </div>
            
            <div className="space-y-3">
              <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">AI 动画模型</label>
              <div className="relative">
                <select 
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-[#060813] border border-white/5 rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:border-[#2cc2f5] transition-all font-bold"
                >
                  <option value="meji-vid-gen-v1">Meji Animation v1.0</option>
                  <option value="meji-morph-v2">Meji Morphing Engine</option>
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
            <div className="grid grid-cols-1">
                <div className="space-y-3">
                    <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">时长</label>
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
            </div>
          </div>

          <button className="w-full brand-gradient py-5 rounded-[1.5rem] font-black text-xl shadow-2xl glow-pink hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-3 tracking-[0.2em]">
            <Sparkles className="w-5 h-5" />
            <span>开始制作</span>
          </button>
        </div>

        <div className="lg:col-span-8 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] text-gray-700 bg-white/[0.01]">
          <PlaySquare className="w-24 h-24 text-[#ff2e8c]/20 mb-6" />
          <p className="text-sm font-black text-gray-600 uppercase tracking-widest">预览窗口已就绪</p>
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
