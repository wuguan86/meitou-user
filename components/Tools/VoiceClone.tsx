
import React, { useState } from 'react';
import { Mic2, Upload, FileText, ChevronDown, Play, Repeat, Zap } from 'lucide-react';
import * as voiceAPI from '../../api/voice';

const VoiceClone: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<string | null>(null); // base64数据
  const [fileName, setFileName] = useState('');
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('zh-CN');
  const [cloning, setCloning] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setFileName(uploadedFile.name);
      
      // 读取文件为base64
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFileData(ev.target?.result as string);
      };
      reader.readAsDataURL(uploadedFile);
    }
  };
  
  const handleClone = async () => {
    // 验证输入
    if (!fileData) {
      alert('请上传参考音频');
      return;
    }
    
    if (!text.trim()) {
      alert('请输入要合成的文本');
      return;
    }
    
    setCloning(true);
    try {
      // 调用声音克隆API
      const response = await voiceAPI.cloneVoice({
        audio: fileData,
        text: text,
        language: language
      });
      
      setAudioUrl(response.audioUrl);
    } catch (error: any) {
      alert('克隆失败：' + (error.message || '未知错误'));
    } finally {
      setCloning(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tighter mb-2">声音克隆 <span className="brand-text-gradient">Engine v1.0</span></h2>
          <p className="text-gray-500">上传一段参考音频，输入文本，即可生成克隆声音。</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-[#0d1121] border border-white/5 rounded-[2rem] p-8 space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">1. 上传参考音频</label>
              <label className="block aspect-video border-2 border-dashed border-[#22283d] bg-[#151929] rounded-2xl cursor-pointer hover:border-[#2cc2f5]/30 transition-all overflow-hidden relative group">
                <div className="h-full flex flex-col items-center justify-center space-y-2">
                  <Upload className="w-5 h-5 text-gray-500" />
                  <p className="text-xs font-bold text-gray-400">{fileName || '点击或拖拽文件'}</p>
                  <p className="text-[10px] text-gray-700">支持 MP3, WAV, M4A</p>
                </div>
                <input type="file" className="hidden" onChange={handleUpload} accept="audio/*" />
              </label>
            </div>
            
            <div className="space-y-3">
              <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">2. 输入参考文案</label>
              <div className="bg-[#060813] p-4 rounded-2xl border border-white/5">
                <textarea 
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="输入需要合成的文本..."
                  className="w-full h-24 bg-transparent outline-none text-sm resize-none font-medium leading-relaxed placeholder:text-gray-600"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">3. 选择语言</label>
              <div className="relative">
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-[#060813] border border-white/5 rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:border-[#2cc2f5] transition-all font-bold"
                >
                  <option value="zh-CN">中文 (简体)</option>
                  <option value="en-US">English (US)</option>
                  <option value="ja-JP">日本語</option>
                  <option value="ko-KR">한국어</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleClone}
            disabled={!fileData || !text.trim() || cloning}
            className="w-full brand-gradient py-5 rounded-[1.5rem] font-black text-xl shadow-2xl glow-pink hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-3 tracking-[0.2em] disabled:opacity-30"
          >
            <Zap className="w-5 h-5 fill-current" />
            <span>{cloning ? '克隆中...' : '开始制作'}</span>
          </button>
        </div>
        
        <div className="lg:col-span-8 flex flex-col">
           <p className="text-xs font-bold text-gray-500 uppercase mb-4 px-2">克隆结果</p>
           <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] text-gray-700 bg-white/[0.01] p-10 min-h-[400px]">
             {audioUrl ? (
               <div className="w-full flex flex-col items-center space-y-4">
                 <audio src={audioUrl} controls className="w-full max-w-md" />
                 <button 
                   onClick={() => {
                     const a = document.createElement('a');
                     a.href = audioUrl;
                     a.download = 'cloned-voice.mp3';
                     a.click();
                   }}
                   className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold transition-colors"
                 >
                   下载音频
                 </button>
               </div>
             ) : (
               <>
                 <Mic2 className="w-24 h-24 text-rose-400/20 mb-6" />
                 <p className="text-sm font-black text-gray-600 uppercase tracking-widest text-center">
                   {cloning ? '正在克隆声音，请稍候...' : '克隆结果将在此处生成'}
                 </p>
               </>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VoiceClone;
