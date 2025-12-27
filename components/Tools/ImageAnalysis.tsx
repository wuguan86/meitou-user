
import React, { useState } from 'react';
import { Upload, Search, Image as ImageIcon, Video, FileText, Zap, ChevronRight, X, RefreshCcw } from 'lucide-react';
import * as analysisAPI from '../../api/analysis';

const ImageAnalysis: React.FC = () => {
  const [mode, setMode] = useState<'image' | 'video'>('image');
  const [file, setFile] = useState<string | null>(null);
  const [direction, setDirection] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState('');
  const [model, setModel] = useState('meji-vision-v1');

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setFile(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    try {
      if (mode === 'image') {
        // 调用图片分析API
        const response = await analysisAPI.analyzeImage({
          image: file,
          direction: direction || undefined,
          model: model || undefined
        });
        setResult(response.result);
      } else {
        // 调用视频分析API
        const response = await analysisAPI.analyzeVideo({
          video: file,
          direction: direction || undefined,
          model: model || undefined
        });
        setResult(response.result);
      }
    } catch (error: any) {
      alert('分析失败：' + (error.message || '未知错误'));
      setResult('');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      <div className="text-center">
        <h2 className="text-4xl font-black tracking-tighter mb-3">图视分析 <span className="brand-text-gradient">Vision Engine</span></h2>
        <p className="text-gray-500">根据您的分析指令，对上传的图片、视频进行分析</p>
      </div>

      <div className="flex justify-center mb-6">
        <div className="flex bg-[#0d1121] p-1.5 rounded-2xl border border-white/5">
          <button 
            onClick={() => { setMode('image'); setFile(null); setResult(''); }}
            className={`flex items-center space-x-2 px-8 py-3 rounded-xl font-black text-sm transition-all ${mode === 'image' ? 'brand-gradient text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>图片分析</span>
          </button>
          <button 
            onClick={() => { setMode('video'); setFile(null); setResult(''); }}
            className={`flex items-center space-x-2 px-8 py-3 rounded-xl font-black text-sm transition-all ${mode === 'video' ? 'brand-gradient text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
          >
            <Video className="w-4 h-4" />
            <span>视频分析</span>
          </button>
        </div>
      </div>

      <div className="bg-[#0d1121]/50 backdrop-blur-xl border border-white/5 rounded-[3rem] p-10 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 brand-gradient opacity-5 blur-[100px] pointer-events-none"></div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
          <div className="space-y-8">
            <div className="aspect-video lg:aspect-square rounded-[2rem] border-2 border-dashed border-white/10 bg-[#060813] overflow-hidden flex items-center justify-center relative group transition-all hover:border-cyan-500/50">
              {file ? (
                mode === 'image' ? (
                  <img src={file} className="w-full h-full object-contain" alt="Preview" />
                ) : (
                  <div className="flex flex-col items-center">
                    <Video className="w-20 h-20 text-cyan-400 mb-4 animate-pulse" />
                    <span className="text-xs text-gray-400 font-bold">视频文件已就绪</span>
                  </div>
                )
              ) : (
                <label className="flex flex-col items-center cursor-pointer p-10 text-center w-full h-full justify-center">
                  <div className="w-20 h-20 brand-gradient opacity-10 rounded-3xl flex items-center justify-center mb-6 group-hover:opacity-20 transition-all">
                    {mode === 'image' ? <ImageIcon className="w-10 h-10 text-white" /> : <Video className="w-10 h-10 text-white" />}
                  </div>
                  <span className="text-sm text-gray-500 font-bold">点击或拖拽{mode === 'image' ? '图片' : '视频'}文件到这里</span>
                  <input type="file" className="hidden" onChange={handleUpload} accept={mode === 'image' ? "image/*" : "video/*"} />
                </label>
              )}
              {file && (
                 <button onClick={() => setFile(null)} className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-colors">
                   <X className="w-4 h-4" />
                 </button>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">AI 模型选择</label>
              <div className="relative">
                <select 
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-[#060813] border border-white/5 rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:border-cyan-500 transition-all font-bold"
                >
                  <option value="meji-vision-v1">Meji Vision v1 (通用)</option>
                  <option value="meji-vision-pro">Meji Vision Pro (专业)</option>
                </select>
                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-xs font-black text-gray-500 uppercase tracking-widest px-1">
                <FileText className="w-3 h-3 text-cyan-400" />
                <span>分析方向 (可选)</span>
              </div>
              <textarea 
                placeholder="例如：分析画面的构图美学、色彩心理学或人物情感特征..."
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                className="w-full h-32 bg-[#060813] border border-white/5 rounded-2xl p-5 text-sm font-medium focus:border-cyan-500 outline-none transition-all placeholder:text-gray-700 leading-relaxed"
              />
            </div>

            <button 
              onClick={handleAnalyze}
              disabled={!file || analyzing}
              className="w-full brand-gradient py-5 rounded-2xl font-black text-white flex items-center justify-center space-x-3 disabled:opacity-30 transition-all hover:scale-[1.02] shadow-xl glow-cyan"
            >
              {analyzing ? (
                <RefreshCcw className="w-5 h-5 animate-spin" />
              ) : (
                <Zap className="w-5 h-5 fill-current" />
              )}
              <span className="tracking-[0.2em]">{analyzing ? 'ANALYZING...' : '开始深度分析'}</span>
            </button>
          </div>

          <div className="flex flex-col h-full min-h-[500px]">
            <div className="flex items-center justify-between mb-6">
               <h3 className="font-black text-gray-500 uppercase text-[10px] tracking-widest flex items-center space-x-2">
                 <div className="w-1 h-3 brand-gradient rounded-full"></div>
                 <span>Analysis Output</span>
               </h3>
               {result && <button className="text-[10px] font-black text-cyan-400 uppercase">Export Report</button>}
            </div>
            <div className="flex-1 bg-[#060813] border border-white/5 rounded-[2rem] p-8 text-gray-400 leading-relaxed custom-scrollbar overflow-y-auto">
              {result ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  {result.split('\n').map((line, i) => <p key={i} className="mb-4">{line}</p>)}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20">
                  <Search className="w-16 h-16 mb-4" />
                  <p className="text-sm font-bold tracking-widest uppercase">等待执行分析任务</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ImageAnalysis;
