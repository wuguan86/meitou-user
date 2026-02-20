import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Wand2, Copy, RefreshCw, ChevronDown, Check, Sparkles, Image as ImageIcon, Video, MonitorPlay, Film, Gem, Type, Layers, PlaySquare, Mic2, User, Camera, Hash, Sun, ZoomIn, SlidersHorizontal, FolderOpen, Upload as UploadIcon } from 'lucide-react';
import { message, Button, Input, Popover, Spin, Card, Tag, Tooltip, Upload } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { getPromptHelperConfig, PromptHelperConfig } from '../api/promptHelper';
import { optimizePrompt } from '../api/generation';
import { uploadImage } from '../api/upload';
import AssetPickerModal from './Modals/AssetPickerModal';
import { AssetNode } from '../types';

const { TextArea } = Input;

type TaskType = 'txt2img' | 'img2img' | 'txt2video' | 'img2video';
type EnhancementType = 'subject' | 'scene' | 'composition' | 'light' | 'detail';

const TASK_TYPES: { key: TaskType; label: string; icon: React.ReactNode }[] = [
  { key: 'txt2img', label: '文生图', icon: <Type size={18} /> },
  { key: 'img2img', label: '图生图', icon: <Layers size={18} /> },
  { key: 'txt2video', label: '文生视频', icon: <Video size={18} /> },
  { key: 'img2video', label: '图生视频', icon: <PlaySquare size={18} /> },
];

const TYPE_CONFIG: Record<EnhancementType, { label: string; description: string; color: string; configKey: keyof PromptHelperConfig; icon: React.ReactNode }> = {
  subject: { label: '主体强化', description: '人物形象 / 多人关系', color: 'cyan', configKey: 'subjectEnhancement', icon: <User size={16} /> },
  scene: { label: '场景强化', description: '场景、背景、沟通空间等', color: 'purple', configKey: 'sceneEnhancement', icon: <Camera size={16} /> },
  composition: { label: '机位与构图强化', description: '俯视、仰视、透视关系等', color: 'orange', configKey: 'cameraComposition', icon: <Hash size={16} /> },
  light: { label: '光线与画质强化', description: '真实、写实、专业', color: 'gold', configKey: 'lightQuality', icon: <Sun size={16} /> },
  detail: { label: '细节与修饰强化', description: '纹理、质感、细节', color: 'magenta', configKey: 'detailEnhancement', icon: <ZoomIn size={16} /> },
};

const PromptHelper: React.FC<{
  availablePoints?: number;
  onDeductPoints?: (points: number) => void;
  onOpenRecharge?: () => void;
}> = ({ availablePoints, onDeductPoints, onOpenRecharge }) => {
  const [config, setConfig] = useState<PromptHelperConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  
  const [taskType, setTaskType] = useState<TaskType>('txt2img');
  const [mainPrompt, setMainPrompt] = useState('');
  const [optimizedPrompt, setOptimizedPrompt] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  // Update images state when task type changes if needed, but keeping them might be fine
  useEffect(() => {
    if (taskType === 'txt2img' || taskType === 'txt2video') {
      setImages([]);
    }
  }, [taskType]);

  const handleAssetSelect = (asset: AssetNode) => {
    if (images.length >= 3) {
      message.warning('最多上传3张参考图');
      return;
    }
    if (asset.type !== 'folder' && asset.url) {
      setImages(prev => [...prev, asset.url!]);
      setShowAssetPicker(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (images.length >= 3) {
      message.warning('最多上传3张参考图');
      return Upload.LIST_IGNORE;
    }
    
    setUploading(true);
    try {
      // Assuming uploadImage returns the URL string
      const url = await uploadImage(file);
      setImages(prev => [...prev, url]);
      message.success('上传成功');
    } catch (error) {
      console.error('Upload failed:', error);
      message.error('上传失败');
    } finally {
      setUploading(false);
    }
    return Upload.LIST_IGNORE; // Prevent default upload behavior
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const loadConfig = async () => {
    setLoadingConfig(true);
    try {
      const data = await getPromptHelperConfig();
      setConfig(data);
    } catch (error) {
      console.error('加载配置失败:', error);
      message.error('加载配置失败');
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSelectEffect = (type: EnhancementType) => {
    // Insert placeholder tag into main prompt
    const tag = `{${TYPE_CONFIG[type].label}}`;
    
    setMainPrompt(prev => {
      // Check if tag exists to toggle
      if (prev.includes(tag)) {
        // Remove tag
        // Try to remove " {Tag}" first (leading space), then "{Tag}"
        if (prev.includes(` ${tag}`)) {
          return prev.replace(` ${tag}`, '');
        } else if (prev.includes(`${tag} `)) {
          return prev.replace(`${tag} `, '');
        } else {
          return prev.replace(tag, '');
        }
      } else {
        // Add tag
        return prev ? `${prev} ${tag}` : tag;
      }
    });

    // Move cursor to the end after state update
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const length = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(length, length);
        // Sync scroll
        if (backdropRef.current) {
            backdropRef.current.scrollTop = textareaRef.current.scrollTop;
        }
      }
    }, 0);
  };

  const handleOptimize = async () => {
    if (!mainPrompt.trim()) {
      message.warning('请输入核心创意');
      return;
    }
    
    const cost = config?.computeConsumption ?? 20;

    if (cost > 0 && availablePoints !== undefined && availablePoints < cost) {
      if (onOpenRecharge) {
        onOpenRecharge();
      } else {
        message.warning('余额不足，请充值');
      }
      return;
    }
    
    setIsOptimizing(true);
    setOptimizedPrompt('');

    // Optimistic deduction
    if (onDeductPoints && cost > 0) {
      onDeductPoints(cost);
    }

    let hasReceivedData = false;

    // Construct system prompt based on config and task type
    // We will ask the AI to recognize the {Tags} and expand them based on knowledge
    // Since we don't have the specific config text for each tag here (it's in `config`),
    // we can construct a knowledge base string.
    
    let knowledgeBase = '';
    if (config) {
      knowledgeBase = Object.entries(TYPE_CONFIG).map(([key, value]) => {
        const configText = config[value.configKey];
        return configText ? `${value.label}参考模板/词库:\n${configText}\n` : '';
      }).join('\n');
    }

    const systemPrompt = `你是一个专业的AI绘画提示词专家 (Prompt Master)。
你的任务是将用户的核心创意转化为高质量、结构化、细节丰富的中文提示词。

任务类型: ${TASK_TYPES.find(t => t.key === taskType)?.label}

参考知识库:
${knowledgeBase}

处理规则:
1. 用户输入可能包含 {主体强化}、{场景强化} 等标签。遇到这些标签时，请根据"参考知识库"中的对应内容，结合上下文进行富有创造性的扩充和细节描写。
2. 如果没有标签，也请进行通用的画质、光影、构图优化。
3. 输出结果必须是纯中文提示词。
4. 使用逗号分隔关键词。
5. 保持画面风格统一。
6. 直接输出最终提示词文本，严禁输出JSON格式，严禁Markdown代码块，严禁包含 "prompt" 或 "size" 等字段。不要包含任何解释或前缀。只返回优化后的提示词内容本身。`;

    let fullResponse = '';

    await optimizePrompt(
      mainPrompt,
      (msg) => {
        hasReceivedData = true;
        fullResponse += msg;
        
        // Check if the response starts looking like JSON or Markdown block
        // If it does, suppress streaming until complete to parse it properly
        const trimmedStart = fullResponse.trimStart();
        if (!trimmedStart.startsWith('{') && !trimmedStart.startsWith('```')) {
            setOptimizedPrompt(prev => prev + msg);
        }
      },
      (err) => {
        console.error('Optimization error:', err);
        // Refund if no data received (matching backend logic)
        if (!hasReceivedData && onDeductPoints && cost > 0) {
          onDeductPoints(-cost);
        }
        message.error('优化失败');
        setIsOptimizing(false);
      },
      () => {
        // Post-process the full response to handle JSON or Markdown if present
        const trimmed = fullResponse.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('```')) {
            try {
                // Try to remove markdown
                let jsonStr = trimmed.replace(/```json\s*|\s*```/g, '').trim();
                // If it's markdown but not json block, try to remove generic code block
                jsonStr = jsonStr.replace(/```\s*|\s*```/g, '').trim();
                
                if (jsonStr.startsWith('{')) {
                    const json = JSON.parse(jsonStr);
                    // Extract content from common fields
                    const content = json.prompt || json.text || json.content || json.optimized_prompt || jsonStr;
                    setOptimizedPrompt(typeof content === 'string' ? content : JSON.stringify(content));
                } else {
                    // Not JSON after cleanup, use cleaned text
                    setOptimizedPrompt(jsonStr);
                }
            } catch (e) {
                console.warn('Failed to parse optimization result JSON, falling back to raw text', e);
                // Try regex extraction for "prompt" field as a last resort (handles invalid JSON with newlines)
                const match = trimmed.match(/"prompt"\s*:\s*"([\s\S]*?)"(?=\s*[,}])/);
                if (match && match[1]) {
                    // Unescape standard JSON escapes
                    let content = match[1];
                    try {
                        content = JSON.parse(`"${content}"`);
                    } catch (err) {
                        content = content.replace(/\\n/g, '\n').replace(/\\"/g, '"');
                    }
                    setOptimizedPrompt(content);
                } else {
                    setOptimizedPrompt(trimmed);
                }
            }
        }
        
        setIsOptimizing(false);
      },
      {
        // model: 'gpt-4o-mini', // Removed hardcoded model to use backend default
        systemPrompt: systemPrompt,
        images: images // Pass uploaded images
      }
    );
  };

  const copyToClipboard = () => {
    if (!optimizedPrompt) return;
    
    // Fallback for older browsers or non-secure contexts
    if (!navigator.clipboard) {
      const textArea = document.createElement("textarea");
      textArea.value = optimizedPrompt;
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          message.success('已复制到剪贴板');
        } else {
          message.error('复制失败');
        }
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
        message.error('复制失败');
      }
      document.body.removeChild(textArea);
      return;
    }

    navigator.clipboard.writeText(optimizedPrompt)
      .then(() => {
        message.success('已复制到剪贴板');
      })
      .catch((err) => {
        console.error('Copy failed', err);
        message.error('复制失败');
      });
  };

  const handleScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const renderHighlightedText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\{[^{}]+\})/g);
    return parts.map((part, index) => {
      if (part.startsWith('{') && part.endsWith('}')) {
        return <span key={index} className="text-cyan-400">{part}</span>;
      }
      return <span key={index} className="text-slate-200">{part}</span>;
    });
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tighter mb-2">提示词助手 <span className="brand-text-gradient pr-2">AI Prompt Master</span></h2>
          <p className="text-gray-500">描述你的初级创意，AI 为你补充高质量、细节丰富、结构化的提示词。</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Input & Config */}
        <div className="lg:col-span-5 space-y-8">
          
          <div className="bg-[#0d1121] border border-white/5 rounded-[2rem] p-8 shadow-xl space-y-6">
            {/* Task Type Selector */}
            <div className="space-y-3">
              <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">选择任务类型</label>
              <div className="grid grid-cols-2 gap-4">
                {TASK_TYPES.map(type => (
                  <button
                    key={type.key}
                    onClick={() => setTaskType(type.key)}
                    className={`flex items-center gap-3 px-4 py-4 rounded-xl border transition-all duration-200 ${
                      taskType === type.key 
                        ? 'bg-[#1e293b] border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                        : 'bg-[#060813] border-white/5 text-slate-400 hover:bg-[#1e293b] hover:border-white/10'
                    }`}
                  >
                    {type.icon}
                    <span className="font-medium text-sm">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Image Upload Section for Image-to-Image/Video */}
            {(taskType === 'img2img' || taskType === 'img2video') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">上传参考图片</label>
                  <button 
                    onClick={() => setShowAssetPicker(true)} 
                    className="text-[12px] text-[#ff2e8c] flex items-center space-x-1 hover:text-[#ff2e8c]/80 transition-colors"
                  >
                     <FolderOpen className="w-3.5 h-3.5" />
                     <span>从资产选择</span>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[0, 1, 2].map((idx) => {
                    const img = images[idx];
                    return (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/20 group">
                        {img ? (
                          <>
                            <img src={img} alt={`ref-${idx}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button 
                                onClick={() => handleRemoveImage(idx)}
                                className="p-1.5 text-white hover:text-red-400 transition-colors bg-white/10 rounded-lg hover:bg-white/20 backdrop-blur-sm"
                              >
                                <DeleteOutlined style={{ fontSize: '14px' }} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <Upload
                            showUploadList={false}
                            beforeUpload={handleUpload as any}
                            accept="image/*"
                            disabled={uploading}
                            className="absolute inset-0 w-full h-full block [&>.ant-upload]:w-full [&>.ant-upload]:h-full [&>.ant-upload]:block"
                            openFileDialogOnClick={!uploading}
                          >
                             <div className="w-full h-full flex flex-col items-center justify-center cursor-pointer text-slate-500 hover:text-cyan-400 hover:bg-white/5 transition-all">
                                {uploading && images.length === idx ? (
                                   <Spin size="small" />
                                ) : (
                                   <>
                                     <UploadIcon className="w-5 h-5 mb-2 opacity-50" />
                                     <span className="text-xs font-medium">图{idx + 1}</span>
                                   </>
                                )}
                             </div>
                          </Upload>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Core Creativity Input */}
            <div className="space-y-3">
              <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">输入你的核心创意</label>
              <div className="relative group h-64 bg-[#060813] border border-white/5 rounded-xl transition-all duration-200 focus-within:border-cyan-500/50 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.1)] overflow-hidden">
                {/* Backdrop for highlighting */}
                <div 
                  ref={backdropRef}
                  className="absolute inset-0 p-6 text-sm leading-relaxed whitespace-pre-wrap break-words overflow-y-auto pointer-events-none font-sans no-scrollbar-visual"
                  aria-hidden="true"
                >
                  {renderHighlightedText(mainPrompt)}
                  {/* Handle trailing newline */}
                  {mainPrompt.endsWith('\n') && <br />}
                </div>

                {/* Transparent Textarea */}
                <textarea
                  ref={textareaRef}
                  value={mainPrompt}
                  onChange={e => setMainPrompt(e.target.value)}
                  onScroll={handleScroll}
                  placeholder="例如：一个在赛博朋克城市屋顶上喝咖啡的猫..."
                  className="absolute inset-0 w-full h-full bg-transparent border-none outline-none text-transparent caret-white p-6 text-sm leading-relaxed resize-none placeholder:text-slate-600 custom-scrollbar font-sans"
                  spellCheck={false}
                />
                
                {/* Select Effect Button */}
                <div className="absolute bottom-4 right-4 z-10">
                  <Popover
                    placement="topLeft"
                    trigger="click"
                    overlayClassName="prompt-effect-popover"
                    overlayInnerStyle={{ padding: 0, backgroundColor: 'transparent', boxShadow: 'none', color: 'inherit' }}
                    arrow={false}
                    content={
                      <div className="bg-[#1e293b] border border-white/10 rounded-xl p-1.5 w-52 shadow-2xl">
                        {Object.entries(TYPE_CONFIG)
                          .filter(([_, conf]) => !config || (config && config[conf.configKey]))
                          .map(([key, configItem]) => {
                            const isSelected = mainPrompt.includes(`{${configItem.label}}`);
                            return (
                              <div
                                key={key}
                                className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                                  isSelected 
                                    ? 'bg-white/5' 
                                    : ''
                                }`}
                                onClick={() => handleSelectEffect(key as EnhancementType)}
                              >
                                <div className={`${isSelected ? 'text-cyan-400' : 'text-slate-400'} transition-colors`}>
                                  {configItem.icon}
                                </div>
                                <div className="flex flex-col flex-1">
                                  <span className={`text-xs font-black ${isSelected ? 'text-cyan-400' : 'text-slate-200'} transition-colors`}>
                                    {configItem.label}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-medium scale-90 origin-left">
                                    {configItem.description}
                                  </span>
                                </div>
                                {isSelected && (
                                  <div className="text-cyan-400">
                                    <Check size={14} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        {config && Object.values(TYPE_CONFIG).every(conf => !config[conf.configKey]) && (
                          <div className="px-3 py-2 text-xs text-slate-500 text-center">
                            暂无可用效果
                          </div>
                        )}
                      </div>
                    }
                  >
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#0d1121] hover:bg-[#1e293b] text-slate-300 rounded-xl text-xs font-bold transition-all border border-white/10 shadow-lg hover:border-white/20">
                      <SlidersHorizontal size={14} className="text-slate-400" />
                      选择效果
                    </button>
                  </Popover>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 px-2">
                <span className="text-xs text-gray-500 font-bold">预计消耗算力</span>
                <div className="flex items-center space-x-1">
                    <div className="w-4 h-4 brand-gradient rounded-full flex items-center justify-center">
                        <Gem className="w-2.5 h-2.5 text-white" />
                    </div>
                    <span className="text-lg font-black text-white">{config?.computeConsumption ?? 20}</span>
                    <span className="text-xs text-gray-500 font-bold">PTS</span>
                </div>
            </div>
          </div>

          <button
            onClick={handleOptimize}
            disabled={isOptimizing || !mainPrompt}
            className={`
              w-full py-5 rounded-[1.5rem] font-black text-xl shadow-2xl transition-all duration-300
              flex items-center justify-center space-x-3 tracking-[0.2em]
              ${isOptimizing 
                ? 'bg-slate-700 cursor-not-allowed opacity-70' 
                : 'brand-gradient glow-cyan hover:scale-[1.02] active:scale-[0.98]'
              }
            `}
          >
            {isOptimizing ? (
              <>
                <Spin size="small" /> <span className="text-white">正在深度优化...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-6 h-6 text-white" /> <span className="text-white">AI 深度优化</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Output */}
        <div className="lg:col-span-7">
          <div className="h-full min-h-[600px] bg-[#0d1121] border border-white/5 rounded-[2rem] relative overflow-hidden group shadow-xl flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-white/5">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">OPTIMIZED OUTPUT</label>
              {optimizedPrompt && (
                <button 
                  onClick={copyToClipboard}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                >
                  <Copy size={12} /> 复制
                </button>
              )}
            </div>
            
            <div className="flex-1 relative">
              {optimizedPrompt ? (
                <div className="absolute inset-0 p-8 overflow-y-auto custom-scrollbar">
                  <p className="text-slate-300 text-lg leading-relaxed font-light whitespace-pre-wrap font-mono">
                    {optimizedPrompt}
                  </p>
                  <div className="h-20"></div> {/* Bottom spacer */}
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 gap-4">
                  <div className="w-24 h-24 brand-gradient rounded-3xl opacity-5 mx-auto flex items-center justify-center rotate-12 border border-white/5">
                    <Wand2 size={40} className="text-white opacity-50" />
                  </div>
                  <h4 className="text-lg font-black text-gray-500 mb-2">准备就绪</h4>
                  <p className="text-sm text-gray-600 font-medium">在左侧输入您的创意描述，点击优化后，AI将为您生成专业提示词。</p>
                </div>
              )}
              
              {/* Decorative corner accents removed */}
            </div>
          </div>
        </div>
      </div>
      
      <AssetPickerModal
        isOpen={showAssetPicker}
        onClose={() => setShowAssetPicker(false)}
        onSelect={handleAssetSelect}
        filterType="image"
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .no-scrollbar-visual::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .no-scrollbar-visual::-webkit-scrollbar-track {
          background: transparent;
        }
        .no-scrollbar-visual::-webkit-scrollbar-thumb {
          background: transparent;
        }
      `}</style>
    </div>
  );
};

export default PromptHelper;
