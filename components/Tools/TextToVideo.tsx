
import React, { useState } from 'react';
import { Video, Sparkles, ChevronDown, Zap, ChevronUp } from 'lucide-react';
import { AssetNode } from '../../types';
// fix: Corrected import path casing from 'Modals' to 'modals'.
import AssetPickerModal from '../modals/AssetPickerModal';

interface TextToVideoProps {
  onSelectAsset: (asset: AssetNode) => void;
}


const TextToVideo: React.FC<TextToVideoProps> = ({ onSelectAsset }) => {
  const [model, setModel] = useState('meji-video-turbo');
  const [duration, setDuration] = useState<string|number>('Auto');
  const [resolution, setResolution] = useState('Auto');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [ratiosOpen, setRatiosOpen] = useState(false);
  const [resolutionOpen, setResolutionOpen] = useState(false);

  const durations: (string|number)[] = ['Auto', 8, 10, 15, 20, 25];
  const resolutions = ['Auto', '270p', '720p', '1080p'];
  const ratios = [{ label: '16:9' }, { label: '9:16' }, { label: '3:2' }, { label: '2:3' }, { label: '1:1' }];

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
                  className="w-full bg-[#060813] border border-white/5 rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:border-[#2cc2f5] transition-all font-bold"
                >
                  <option value="meji-video-turbo">Meji Video Turbo (高速)</option>
                  <option value="meji-video-pro">Meji Video Pro (高画质)</option>
                  <option value="meji-video-cinematic">Meji Cinematic (电影感)</option>
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
                placeholder="描述视频场景..."
                className="w-full h-32 bg-transparent outline-none text-sm resize-none font-medium leading-relaxed"
              />
            </div>
          </div>

          <button className="w-full brand-gradient py-5 rounded-[1.5rem] font-black text-xl shadow-2xl glow-cyan hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-3 tracking-[0.2em]">
            <Sparkles className="w-5 h-5" />
            <span>开始制作</span>
          </button>
        </div>

        <div className="lg:col-span-8 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] text-gray-700 bg-white/[0.01]">
          <Video className="w-24 h-24 text-[#6b48ff]/20 mb-6" />
          <p className="text-sm font-black text-gray-600 uppercase tracking-widest px-20 text-center leading-relaxed">
            该功能目前处于灰度测试中，即将全面开放。
          </p>
        </div>
      </div>
    </div>
  );
};

export default TextToVideo;
