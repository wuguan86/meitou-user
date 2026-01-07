
import React, { useState, useEffect, useMemo } from 'react';
import { message } from 'antd';
import { Upload, Search, Image as ImageIcon, Video, FileText, Zap, ChevronRight, X, RefreshCcw, Wand2, Gem } from 'lucide-react';
import * as analysisAPI from '../../api/analysis';
import * as uploadAPI from '../../api/upload';
import { PlatformModelResponse } from '../../api/generation';
import { getApiBaseUrl } from '../../api/config';

interface ImageAnalysisProps {
  onDeductPoints?: (points: number) => void;
}

const ImageAnalysis: React.FC<ImageAnalysisProps> = ({ onDeductPoints }) => {
  const [mode, setMode] = useState<'image' | 'video'>('image');
  const [file, setFile] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [direction, setDirection] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState('');
  const [model, setModel] = useState('');
  const [availableModels, setAvailableModels] = useState<PlatformModelResponse['models']>([]);

  const currentModel = useMemo(
    () => availableModels.find(m => m.id === model),
    [availableModels, model]
  );

  const calculateCost = () => {
    if (!currentModel || !currentModel.defaultCost) {
      return 0;
    }
    return currentModel.defaultCost;
  };

  useEffect(() => {
    const fetchModels = async () => {
      try {
        let platforms: PlatformModelResponse[];
        if (mode === 'image') {
          platforms = await analysisAPI.getImageAnalysisModels();
        } else {
          platforms = await analysisAPI.getVideoAnalysisModels();
        }
        
        // Aggregate models from all platforms
        const allModels = platforms.flatMap(p => p.models);
        setAvailableModels(allModels);
        
        // Set default model
        if (allModels.length > 0) {
           setModel(prev => {
             const exists = allModels.some(m => m.id === prev);
             return exists ? prev : allModels[0].id;
           });
        } else {
           setModel('');
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
        // message.error('获取模型列表失败'); // Optional: don't spam error if it fails silently
      }
    };
    
    fetchModels();
  }, [mode]);


  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRawFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setFile(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setResult('');
    
    try {
      const token = localStorage.getItem('app_token');
      if (!token) {
        throw new Error('未登录或Token无效');
      }

      // Upload file to OSS first
      let fileUrl = file;
      if (rawFile) {
        try {
          if (mode === 'image') {
            fileUrl = await uploadAPI.uploadImage(rawFile);
          } else {
            fileUrl = await uploadAPI.uploadVideo(rawFile);
          }
        } catch (error) {
          console.error('File upload failed:', error);
          throw new Error('文件上传失败，请重试');
        }
      }

      const baseUrl = getApiBaseUrl();
      
      const cost = calculateCost();
      if (cost > 0 && onDeductPoints) {
        onDeductPoints(cost);
      }

      if (mode === 'image' || mode === 'video') {
        const endpoint = mode === 'image' ? '/app/image-analysis/chat' : '/app/video-analysis/chat';
        const body = {
          [mode === 'image' ? 'image' : 'video']: fileUrl,
          direction: direction || undefined,
          model: model || undefined
        };

        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('登录已过期，请重新登录');
          }
          
          let errorMessage = '分析失败';
          try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || `分析失败 (${response.status})`;
          } catch (e) {
            errorMessage = `分析失败 (${response.status})`;
          }
          throw new Error(errorMessage);
        }

        if (!response.body) {
          throw new Error('未获取到响应流');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let resultText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          const lines = buffer.split('\n');
          // Keep the last potentially incomplete line in the buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            if (trimmedLine.startsWith('data:')) {
              const data = trimmedLine.substring(5).trimStart();
              if (data.trim() === '[DONE]') break;

              try {
                if (data.startsWith('{')) {
                  const jsonData = JSON.parse(data);
                  if (jsonData.choices && jsonData.choices[0]?.delta?.content) {
                    const content = jsonData.choices[0].delta.content;
                    resultText += content;
                    setResult(resultText);
                    // console.log('Received chunk:', content);
                  } else if (jsonData.content) {
                    resultText += jsonData.content;
                    setResult(resultText);
                  } else if (jsonData.error) {
                    throw new Error(jsonData.error.message || '分析过程中发生错误');
                  }
                } else {
                  resultText += data;
                  setResult(resultText);
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', data, e);
              }
            } else if (trimmedLine.startsWith('event: error')) {
               // Handle error event if needed, usually followed by data with error msg
            }
          }
        }
        
        // Process remaining buffer
        if (buffer.trim()) {
           const trimmedLine = buffer.trim();
           if (trimmedLine.startsWith('data:')) {
              const data = trimmedLine.substring(5).trimStart();
              if (data.trim() !== '[DONE]') {
                 try {
                    if (data.startsWith('{')) {
                       const jsonData = JSON.parse(data);
                       if (jsonData.choices && jsonData.choices[0]?.delta?.content) {
                          resultText += jsonData.choices[0].delta.content;
                          setResult(resultText);
                       }
                    }
                 } catch(e) {
                    // ignore
                 }
              }
           }
        }
      }
    } catch (error: any) {
      message.error(error.message || '分析失败');
      console.error('分析失败:', error);
      if (!result) {
        setResult('');
      }
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
            onClick={() => { setMode('image'); setFile(null); setRawFile(null); setResult(''); }}
            className={`flex items-center space-x-2 px-8 py-3 rounded-xl font-black text-sm transition-all ${mode === 'image' ? 'brand-gradient text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>图片分析</span>
          </button>
          <button 
            onClick={() => { setMode('video'); setFile(null); setRawFile(null); setResult(''); }}
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
                  <video src={file} className="w-full h-full object-contain" controls />
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
                 <button onClick={() => { setFile(null); setRawFile(null); }} className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-colors">
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
                  {availableModels.length > 0 ? (
                    availableModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>暂无可用模型</option>
                  )}
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
                placeholder={mode === 'image' 
                  ? "您可以要求AI对上传的图片进行分析，比如人像的五官美学分析、皮肤分析建议等" 
                  : "您可以要求AI对上传的视频进行脚本提取、内容结构拆解、爆款内容仿写等"}
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                className="w-full h-32 bg-[#060813] border border-white/5 rounded-2xl p-5 text-sm font-medium focus:border-cyan-500 outline-none transition-all placeholder:text-gray-700 leading-relaxed"
              />
              <div className="flex justify-end mt-2 px-2">
                <button className="flex items-center space-x-2 text-[10px] text-cyan-400 hover:text-cyan-300 font-black uppercase tracking-widest group">
                  <Wand2 className="w-3 h-3 group-hover:rotate-45 transition-transform" />
                  <span>AI帮助优化提示词</span>
                </button>
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

          <div className="flex flex-col h-full max-h-[800px]">
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
