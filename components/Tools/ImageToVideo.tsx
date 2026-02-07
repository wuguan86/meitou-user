import React, { useState, useEffect, useRef } from 'react';
import { message, Progress } from 'antd';
import { PlaySquare, Upload, ChevronDown, Sparkles, Film, Image as ImageIcon, FolderOpen, ChevronUp, X, Zap, Wand2, Gem, User, Video as VideoIcon, Plus, Trash2, Settings2, Download, Send, RefreshCw, ChevronLeft, AlertCircle, Loader2 } from 'lucide-react';
import { AssetNode, VideoGenerationConfig } from '../../types';
import { SecureImage } from '../SecureImage';
import { SecureVideo } from '../SecureVideo';
// fix: Corrected import path casing from 'Modals' to 'modals'.
import AssetPickerModal from '../Modals/AssetPickerModal';
import * as generationAPI from '../../api/generation';
import { uploadImage, uploadVideo } from '../../api/upload';
import { promptRechargeForInsufficientBalance } from '../../api/index';
import { getSiteCategoryByDomain } from '../../utils/domainValidator';

interface ImageToVideoProps {
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

interface Character {
  id: string;
  name: string;
  url: string;
  coverUrl: string; // The original image used to generate the character
  characterId?: string;
}

const ImageToVideo: React.FC<ImageToVideoProps> = ({ onSelectAsset, onDeductPoints, availablePoints, onOpenRecharge }) => {
  // Character Library State
  const [characterLibrary, setCharacterLibrary] = useState<Character[]>([]);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [savingCharacter, setSavingCharacter] = useState(false);
  const [newCharacterName, setNewCharacterName] = useState('');
  const [generatedCharacterVideoUrl, setGeneratedCharacterVideoUrl] = useState<string | null>(null);
  const [currentPid, setCurrentPid] = useState<string | null>(null);
  const [characterManagerView, setCharacterManagerView] = useState<'list' | 'picker' | 'naming'>('list');
  const [characterVideoLoading, setCharacterVideoLoading] = useState(false);
  const [characterVideoPage, setCharacterVideoPage] = useState(1);
  const [characterVideoHasMore, setCharacterVideoHasMore] = useState(true);
  const [characterVideoRecords, setCharacterVideoRecords] = useState<generationAPI.GenerationRecord[]>([]);
  const [selectedCharacterVideoRecord, setSelectedCharacterVideoRecord] = useState<generationAPI.GenerationRecord | null>(null);
  const isEcommerceSite = getSiteCategoryByDomain() === 2;
  const novicePromptPlaceholder = isEcommerceSite
    ? '请描述希望图片中的产品如何运动或展示，例如：旋转展示产品外观，保持产品外形不变，或者描述您希望加入的创意动作或氛围，例如：慢动作展示，电影灯光效果'
    : '输入视频描述...';
  const [addCharacterFromVideoName, setAddCharacterFromVideoName] = useState('');
  const [isSavingCharacterLoading, setIsSavingCharacterLoading] = useState(false);
  const [isAddingCharacterLoading, setIsAddingCharacterLoading] = useState(false);

  // Load characters from backend
  useEffect(() => {
    loadCharacters();
  }, []);

  const loadCharacters = async () => {
    try {
      const chars = await generationAPI.getCharacters();
      // 转换后端数据格式到前端组件需要的格式
      setCharacterLibrary(chars.map(c => ({
          id: c.id.toString(),
          name: c.name,
          url: c.videoUrl || '',
          coverUrl: c.coverUrl || '',
          characterId: c.characterId,
      })));
    } catch (e) {
      console.error('加载角色列表失败', e);
    }
  };

  const normalizeSaveCharacterErrorMessage = (msg?: string) => {
    const messageText = (msg || '').trim();
    if (!messageText) return '保存失败';
    
    if (messageText.includes('This video does not meet') || messageText.includes('该视频不符合') || messageText.toLowerCase().includes('does not meet the criteria')) {
      return '该视频不符合创建角色的要求，建议重新生成清晰（不包含真人参考、需保证单一人物、无遮挡、光线充足）的视频后重试';
    }
    
    if (messageText.includes('生成记录不存在')) {
      return '生成记录不存在或已失效，请重新生成角色视频后再保存';
    }
    if (messageText.includes('时间戳')) {
      return '截取时间点不合法，请调整后再试';
    }
    
    return messageText;
  };

  const handleSaveCharacter = async () => {
    if (!newCharacterName.trim()) {
      message.warning('请输入角色名称');
      return;
    }
    if (newCharacterName.trim().length > 30) {
      message.warning('角色名称不能超过30个字符');
      return;
    }
    if (!generatedCharacterVideoUrl) {
      message.warning('没有可保存的角色视频');
      return;
    }
    
    // Check for duplicate names
    if (characterLibrary.some(c => c.name.trim().toLowerCase() === newCharacterName.trim().toLowerCase())) {
        message.warning('角色名称已存在');
        return;
    }

    // Call backend API to save character
    if (!currentPid) {
       message.error('无法保存：未找到外部内容ID');
       return;
    }

    try {
        setIsSavingCharacterLoading(true);
        const result = await generationAPI.saveCharacterVideo({
            pid: currentPid,
            timestamps: '0,3',
            name: newCharacterName.trim()
        });

        const newChar: Character = {
          id: result.id.toString(), // Use ID from backend
          name: newCharacterName.trim(),
          url: generatedCharacterVideoUrl,
          coverUrl: file || '', // Use current file (image) as cover
          characterId: result.character_id,
        };

        setCharacterLibrary(prev => [...prev, newChar]);
        message.success({ content: '角色保存成功', key: 'saveCharacter' });
        setSavingCharacter(false);
        setNewCharacterName('');
    } catch (e: any) {
        // 全局拦截器已处理错误提示，此处不再重复提示
        // message.error({ content: normalizeSaveCharacterErrorMessage(e?.message), key: 'saveCharacter' });
    } finally {
        setIsSavingCharacterLoading(false);
    }
  };

    const handleDeleteCharacter = async (id: string) => {
        try {
            await generationAPI.deleteCharacter(parseInt(id));
            setCharacterLibrary(prev => prev.filter(c => c.id !== id));
            message.success('角色已删除');
        } catch (e) {
            console.error('删除角色失败', e);
            message.error('删除角色失败');
        }
    };

  const getModelDisplayName = (modelId: string) => {
    const found = models.find(m => m.id === modelId);
    return found ? found.name : modelId;
  };

  const isEligibleCharacterRecord = (record: generationAPI.GenerationRecord) => {
    return (
      record.fileType === 'video' &&
      record.type === 'img2video' &&
      record.status === 'success' &&
      !!record.pid &&
      !!record.contentUrl
    );
  };

  const loadCharacterVideoRecords = async (pageToLoad: number, mode: 'reset' | 'append') => {
    if (characterVideoLoading) return;
    setCharacterVideoLoading(true);
    try {
      const res = await generationAPI.getGenerationRecords(pageToLoad, 20, 'video');
      const eligible = res.records.filter(r => 
        isEligibleCharacterRecord(r) && 
        !characterLibrary.some(c => c.url === r.contentUrl)
      );

      setCharacterVideoRecords(prev => {
        const next = mode === 'reset' ? eligible : [...prev, ...eligible];
        const uniqueById = new Map<number, generationAPI.GenerationRecord>();
        next.forEach(r => uniqueById.set(r.id, r));
        return Array.from(uniqueById.values()).sort((a, b) => {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          return bTime - aTime;
        });
      });

      setCharacterVideoPage(res.current);
      setCharacterVideoHasMore(res.current < res.pages);
    } catch (e) {
      message.error('加载可添加角色的视频失败');
    } finally {
      setCharacterVideoLoading(false);
    }
  };

  const openCharacterVideoPicker = async () => {
    setCharacterManagerView('picker');
    setCharacterVideoHasMore(true);
    setCharacterVideoPage(1);
    await loadCharacterVideoRecords(1, 'reset');
  };

  const handleConfirmAddCharacterFromVideo = async () => {
    if (!selectedCharacterVideoRecord?.pid) {
      message.error('无法添加：未找到外部内容ID');
      return;
    }

    const trimmedName = addCharacterFromVideoName.trim();
    if (!trimmedName) {
      message.warning('请输入角色名称');
      return;
    }
    if (trimmedName.length > 30) {
      message.warning('角色名称不能超过30个字符');
      return;
    }
    if (characterLibrary.some(c => c.name.trim().toLowerCase() === trimmedName.toLowerCase())) {
      message.warning('角色名称已存在');
      return;
    }

    try {
      setIsAddingCharacterLoading(true);
      const result = await generationAPI.saveCharacterVideo({
        pid: selectedCharacterVideoRecord.pid,
        timestamps: '0,3',
        name: trimmedName
      });

      const newChar: Character = {
        id: result.id.toString(),
        name: trimmedName,
        url: selectedCharacterVideoRecord.contentUrl,
        coverUrl: selectedCharacterVideoRecord.thumbnailUrl || '',
        characterId: result.character_id,
      };

      setCharacterLibrary(prev => [...prev, newChar]);
      message.success({ content: '角色保存成功', key: 'saveCharacterFromVideo' });
      setSelectedCharacterVideoRecord(null);
      setAddCharacterFromVideoName('');
      setCharacterManagerView('list');
    } catch (e: any) {
      // 全局拦截器已处理错误提示，此处不再重复提示
      // message.error({ content: normalizeSaveCharacterErrorMessage(e?.message), key: 'saveCharacterFromVideo' });
    } finally {
      setIsAddingCharacterLoading(false);
    }
  };

  const closeCharacterManager = () => {
    setIsCharacterManagerOpen(false);
    setCharacterManagerView('list');
    setSelectedCharacterVideoRecord(null);
    setAddCharacterFromVideoName('');
  };

  const formatPrompt = (text: string) => {
      if (!text) return '';
      let formatted = text;
      characterLibrary.forEach(char => {
          if (char.characterId) {
              formatted = formatted.split(`@${char.characterId}`).join(`@${char.name}`);
          }
      });
      return formatted;
  };

  const handleSelectCharacter = (char: Character) => {
      // Append @Name to prompt
      const toAdd = `@${char.name} `;
      setProfessionalStep2Prompt(prev => {
          if (prev.includes(toAdd.trim())) return prev;
          return prev + (prev.endsWith(' ') ? '' : ' ') + toAdd;
      });
      
      // Toggle selection
      setSelectedCharacterIds(prev => {
          if (prev.includes(char.id)) {
              return prev.filter(id => id !== char.id);
          } else {
              return [...prev, char.id];
          }
      });
  };

  // Mode states
  const [mainMode, setMainMode] = useState<'novice' | 'professional'>('novice');
  // Novice sub-modes: frames (首尾帧), multi_image (多图)
  const [noviceSubMode, setNoviceSubMode] = useState<'frames' | 'multi_image'>('frames');
  const [professionalMode, setProfessionalMode] = useState<'creation' | 'continuation'>('creation');
  // Professional Step
  const [profStep, setProfStep] = useState<1 | 2>(1);

  const [novicePrompt, setNovicePrompt] = useState('');
  const [step1Prompt, setStep1Prompt] = useState('');
  const [professionalStep2Prompt, setProfessionalStep2Prompt] = useState('');
  const [continuationPrompt, setContinuationPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videos, setVideos] = useState<AssetNode[]>([]);
  const [model, setModel] = useState('');
  
  // Step 2 Settings (Original)
  const [duration, setDuration] = useState<string|number>(5);
  const [resolution, setResolution] = useState('720P');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  
  // Step 1 Settings
  const [step1Duration, setStep1Duration] = useState<string|number>(5);
  const [step1Resolution, setStep1Resolution] = useState('720P');
  const [step1AspectRatio, setStep1AspectRatio] = useState('16:9');

  const [quantity, setQuantity] = useState(1);
  const [file, setFile] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video'>('image');
  const [lastFrameFile, setLastFrameFile] = useState<string | null>(null);
  const [referenceFiles, setReferenceFiles] = useState<string[]>([]);
  const maxReferenceImages = 3;
  
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [showStep1Settings, setShowStep1Settings] = useState(false);
  const [isCharacterManagerOpen, setIsCharacterManagerOpen] = useState(false);
  const [ratiosOpen, setRatiosOpen] = useState(false);
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]); // 模型列表
  const [loadingModels, setLoadingModels] = useState(true); // 加载模型列表状态
  const [optimizingStep, setOptimizingStep] = useState<'step1' | 'step2' | null>(null);
  const [progress, setProgress] = useState(0);
  const [previewVideo, setPreviewVideo] = useState<AssetNode | null>(null);
  const [isContinuationVideoPickerOpen, setIsContinuationVideoPickerOpen] = useState(false);
  const [continuationVideoLoading, setContinuationVideoLoading] = useState(false);
  const [continuationVideoPage, setContinuationVideoPage] = useState(1);
  const [continuationVideoHasMore, setContinuationVideoHasMore] = useState(true);
  const [continuationVideoRecords, setContinuationVideoRecords] = useState<generationAPI.GenerationRecord[]>([]);
  const [selectedContinuationRecord, setSelectedContinuationRecord] = useState<generationAPI.GenerationRecord | null>(null);
  
  // Novice Mode Specific State
  const [noviceFile, setNoviceFile] = useState<string | null>(null);
  const [noviceAspectRatio, setNoviceAspectRatio] = useState('16:9');
  const [noviceDuration, setNoviceDuration] = useState<string|number>(5);
  const [noviceResolution, setNoviceResolution] = useState('720P');
  const [noviceQuantity, setNoviceQuantity] = useState(1);

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
    ? currentModel.durations
    : [5, 10, 15];

  const availableQuantities = currentModel?.quantities && currentModel.quantities.length > 0
    ? currentModel.quantities
    : [1];

  const handleOptimizePrompt = (targetStep: 'step1' | 'step2' = 'step2') => {
    if (optimizingStep) return;

    const step2PromptState = mainMode === 'professional'
      ? (professionalMode === 'continuation'
        ? { value: continuationPrompt, setValue: setContinuationPrompt }
        : { value: professionalStep2Prompt, setValue: setProfessionalStep2Prompt })
      : { value: novicePrompt, setValue: setNovicePrompt };

    const currentPrompt = targetStep === 'step1' ? step1Prompt : step2PromptState.value;
    const setTargetPrompt = targetStep === 'step1' ? setStep1Prompt : step2PromptState.setValue;

    if (!currentPrompt.trim()) {
      message.warning('请输入提示词');
      return;
    }

    const optimizeScene: 'character' | 'video' | 'continuation' =
      targetStep === 'step1'
        ? 'character'
        : (mainMode === 'professional' && professionalMode === 'continuation')
          ? 'continuation'
          : 'video';

    const systemPromptByScene: Record<typeof optimizeScene, string> = {
      character:
        '你是资深的图生视频角色设定提示词工程师。你的目标：把用户输入润色成适合“生成角色/角色视频”的高质量中文提示词。\n\n要求：\n- 保留用户给定的关键信息，不要虚构与用户相冲突的设定。\n- 优先补充：人物外观（年龄感/发型/五官/肤色/表情/服饰材质与配色）、风格（写实/电影感/二次元等）、光影、构图、质感细节。\n- 不要加入明显的镜头运动或剧情发展；重点在角色本体与画面质感。\n- 输出一段连贯的中文文本即可。\n\n重要规则：\n1. 只输出优化后的中文纯文本提示词。\n2. 不要输出JSON。\n3. 不要输出Markdown或代码块。\n4. 不要输出任何解释、标题或多余前缀。',
      video:
        '你是资深的图生视频分镜与运镜提示词工程师。你的目标：把用户输入润色成适合“生成视频”的高质量中文提示词。\n\n要求：\n- 保留用户给定的关键信息与风格，不要改变主体身份与核心设定。\n- 如果输入包含以@开头的角色标记（例如@小美），必须原样保留这些标记，不要改写或删除。\n- 优先补充：动作与节奏、场景氛围、镜头语言（景别/机位/运动）、光影与色彩、画面风格（电影感/写实等）。\n- 避免引入过多新角色或与用户矛盾的情节。\n- 输出一段连贯的中文文本即可。\n\n重要规则：\n1. 只输出优化后的中文纯文本提示词。\n2. 不要输出JSON。\n3. 不要输出Markdown或代码块。\n4. 不要输出任何解释、标题或多余前缀。',
      continuation:
        '你是资深的视频续写提示词工程师。你的目标：把用户输入润色成适合“在已有视频基础上自然续写”的高质量中文提示词。\n\n要求：\n- 强调连续性：保持主体、服饰、风格、色调与场景一致，动作承接上一段，不要突然切换到全新镜头或全新人物。\n- 如果输入包含以@开头的角色标记（例如@小美），必须原样保留这些标记，不要改写或删除。\n- 优先补充：动作延续、镜头延续（承接上一镜头的机位/景别/运动）、细微变化与节奏、光影与氛围。\n- 不要引入与用户矛盾的新设定。\n- 输出一段连贯的中文文本即可。\n\n重要规则：\n1. 只输出优化后的中文纯文本提示词。\n2. 不要输出JSON。\n3. 不要输出Markdown或代码块。\n4. 不要输出任何解释、标题或多余前缀。',
    };

    const originalPrompt = currentPrompt;
    setOptimizingStep(targetStep);
    setTargetPrompt('');
    
    let fullResponse = '';

    generationAPI.optimizePrompt(
      originalPrompt,
      (text) => {
        fullResponse += text;
        if (!fullResponse.trim().startsWith('{') && !fullResponse.trim().startsWith('```')) {
             setTargetPrompt(prev => prev + text);
        }
      },
      (err) => {
        console.error(err);
        message.error('优化提示词失败');
        setTargetPrompt(originalPrompt);
        setOptimizingStep(null);
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
                    setTargetPrompt(typeof content === 'string' ? content : JSON.stringify(content));
                } else {
                    setTargetPrompt(jsonStr);
                }
            } catch (e) {
                console.warn('解析优化结果JSON失败，显示原始文本', e);
                setTargetPrompt(trimmed);
            }
        }
        setOptimizingStep(null);
      },
      {
        systemPrompt: systemPromptByScene[optimizeScene],
      }
    );
  };

  // 计算算力消耗
  const calculateCost = () => {
    // 基础消耗
    const baseCost = currentModel?.defaultCost || 20;
    const qty = mainMode === 'novice' ? noviceQuantity : quantity;
    return baseCost * qty;
  };

  // 当模型改变时，检查当前参数是否有效，如果无效则重置
  useEffect(() => {
    if (currentModel) {
      if (currentModel.resolutions && currentModel.resolutions.length > 0) {
        if (!currentModel.resolutions.includes(resolution)) setResolution(currentModel.resolutions[0]);
        if (!currentModel.resolutions.includes(step1Resolution)) setStep1Resolution(currentModel.resolutions[0]);
        if (!currentModel.resolutions.includes(noviceResolution)) setNoviceResolution(currentModel.resolutions[0]);
      }
      if (currentModel.ratios && currentModel.ratios.length > 0) {
        if (!currentModel.ratios.includes(aspectRatio)) setAspectRatio(currentModel.ratios[0]);
        if (!currentModel.ratios.includes(step1AspectRatio)) setStep1AspectRatio(currentModel.ratios[0]);
        if (!currentModel.ratios.includes(noviceAspectRatio)) setNoviceAspectRatio(currentModel.ratios[0]);
      }
      // duration 检查
      if (currentModel.durations && currentModel.durations.length > 0) {
        if (typeof duration === 'number' && !currentModel.durations.includes(duration)) {
           setDuration(currentModel.durations[0]);
        }
        if (typeof step1Duration === 'number' && !currentModel.durations.includes(step1Duration)) {
           setStep1Duration(currentModel.durations[0]);
        }
        if (typeof noviceDuration === 'number' && !currentModel.durations.includes(noviceDuration)) {
           setNoviceDuration(currentModel.durations[0]);
        }
      }
      // quantity 检查
      if (currentModel.quantities && currentModel.quantities.length > 0) {
          if (!currentModel.quantities.includes(quantity)) {
             setQuantity(currentModel.quantities[0]);
          }
          if (!currentModel.quantities.includes(noviceQuantity)) {
             setNoviceQuantity(currentModel.quantities[0]);
          }
      }
    }
  }, [model, currentModel]); // eslint-disable-line react-hooks/exhaustive-deps

  // 切换模式时自动选择对应模型
  useEffect(() => {
    if (models.length > 0) {
      if (mainMode === 'novice') {
        const veoModel = models.find(m => m.id.toLowerCase().includes('veo'));
        if (veoModel) {
          setModel(veoModel.id);
        }
      } else if (mainMode === 'professional') {
        const soraModel = models.find(m => m.id.toLowerCase().includes('sora'));
        if (soraModel) {
          setModel(soraModel.id);
        }
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
              if (config.prompt) {
                setNovicePrompt(config.prompt);
                setProfessionalStep2Prompt(config.prompt);
                setContinuationPrompt(config.prompt);
              }
              if (config.model) setModel(config.model);
              if (config.resolution) {
                setResolution(config.resolution || '720P');
                setStep1Resolution(config.resolution || '720P');
                setNoviceResolution(config.resolution || '720P');
              }
              if (config.aspectRatio) {
                setAspectRatio(config.aspectRatio || '16:9');
                setStep1AspectRatio(config.aspectRatio || '16:9');
                setNoviceAspectRatio(config.aspectRatio || '16:9');
              }
              if (config.duration) {
                setDuration(config.duration || 5);
                setStep1Duration(config.duration || 5);
                setNoviceDuration(config.duration || 5);
              }
              // 加载参考图片
              if (config.referenceImage) {
                setFile(config.referenceImage);
                setNoviceFile(config.referenceImage);
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
        setModels([]);
        setModel('');
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
        if (referenceFiles.length >= maxReferenceImages) {
            message.warning(`最多只能上传${maxReferenceImages}张参考图片`);
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

  const isEligibleContinuationRecord = (record: generationAPI.GenerationRecord) => {
    const modelValue = (record.model || '').toLowerCase();
    return (
      record.fileType === 'video' &&
      record.type === 'img2video' &&
      record.status === 'success' &&
      !!record.pid &&
      modelValue.includes('sora') &&
      !!record.contentUrl
    );
  };

  const loadContinuationVideoRecords = async (pageToLoad: number, mode: 'reset' | 'append') => {
    if (continuationVideoLoading) return;
    setContinuationVideoLoading(true);
    try {
      const res = await generationAPI.getGenerationRecords(pageToLoad, 20, 'video');
      const eligible = res.records.filter(isEligibleContinuationRecord);

      setContinuationVideoRecords(prev => {
        const next = mode === 'reset' ? eligible : [...prev, ...eligible];
        const uniqueById = new Map<number, generationAPI.GenerationRecord>();
        next.forEach(r => uniqueById.set(r.id, r));
        return Array.from(uniqueById.values()).sort((a, b) => {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          return bTime - aTime;
        });
      });

      setContinuationVideoPage(res.current);
      setContinuationVideoHasMore(res.current < res.pages);
    } catch (e) {
      message.error('加载可续写视频失败');
    } finally {
      setContinuationVideoLoading(false);
    }
  };

  const formatRecordCreatedAt = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  const openContinuationVideoPicker = async () => {
    setIsContinuationVideoPickerOpen(true);
    setContinuationVideoHasMore(true);
    setContinuationVideoPage(1);
    await loadContinuationVideoRecords(1, 'reset');
  };

  const handleFileSelect = (asset: AssetNode) => {
    if (asset.url) {
      if (activePicker === 'first') {
        if (mainMode === 'novice') {
            setNoviceFile(asset.url);
        } else {
            setFile(asset.url);
        }
        setFileType(asset.type === 'video' ? 'video' : 'image');
      }
      else if (activePicker === 'last') setLastFrameFile(asset.url);
      else if (activePicker === 'reference') {
        if (referenceFiles.length >= maxReferenceImages) {
            message.warning(`最多只能上传${maxReferenceImages}张参考图片`);
        } else {
            setReferenceFiles([...referenceFiles, asset.url]);
        }
      }
    }
    setIsAssetPickerOpen(false);
    setActivePicker(null);
  };
  
  const handleGenerate = async (stepOverride?: number) => {
    // 检查上传状态
    if (uploading) {
      message.warning('图片正在上传中，请稍候...');
      return;
    }
    
    // Determine current step for professional mode
    let currentStep = profStep;
    if (typeof stepOverride === 'number') {
        currentStep = stepOverride as 1 | 2;
    }

    const currentPrompt = mainMode === 'professional'
      ? (professionalMode === 'creation'
        ? (currentStep === 1 ? step1Prompt : professionalStep2Prompt)
        : continuationPrompt)
      : novicePrompt;

    if (mainMode === 'novice') {
        if (!currentPrompt.trim()) {
            message.warning('请输入提示词');
            return;
        }
        if (noviceSubMode === 'frames') {
            if (!noviceFile) {
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
            if (!selectedContinuationRecord) {
                message.warning('请选择要续写的视频');
                return;
            }
            if (!currentPrompt.trim()) {
                message.warning('请输入续写描述');
                return;
            }
        }
        if (professionalMode === 'creation') {
            if (currentStep === 1) {
                // Step 1: Need prompt or image
                 if (!currentPrompt.trim() && !file) {
                    message.warning('请输入描述或上传图片');
                    return;
                }
            } else if (currentStep === 2) {
                // Step 2: Need prompt
                 if (!currentPrompt.trim()) {
                    message.warning('请输入视频描述');
                    return;
                }
            }
        }
    }
    
    // Calculate cost based on mode
    let cost = calculateCost();
    if (mainMode === 'professional' && professionalMode === 'creation') {
        cost = currentModel?.defaultCost || 500; // Step 1 and Step 2 use model cost
    }

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
      }, 1000); // 1000ms * 90 = 90秒 (1分半)
    };

    startFakeProgress();

    try {
      // 准备请求参数
      let imageToSend = undefined;
      let firstFrameUrlToSend = undefined;
      let lastFrameUrlToSend = undefined;
      let urlsToSend = undefined;
      let promptToSend = currentPrompt;

      if (mainMode === 'novice') {
          if (noviceSubMode === 'frames') {
              imageToSend = noviceFile!;
              firstFrameUrlToSend = noviceFile!;
              lastFrameUrlToSend = lastFrameFile || undefined;
          } else {
              imageToSend = referenceFiles[0];
              urlsToSend = referenceFiles;
          }
      } else {
          // Professional mode
          if (professionalMode === 'creation') {
              if (currentStep === 1) {
                   if (file) {
                       imageToSend = file;
                       firstFrameUrlToSend = file;
                   }
                   // For Step 1, we might not send characters, just image + prompt
              } else if (currentStep === 2) {
                  // Step 2: Handle characters
                  
                  // Priority 2: Characters mentioned in prompt
                  characterLibrary.forEach(char => {
                      const mention = `@${char.name}`;
                      if (promptToSend.includes(mention)) {
                          if (char.characterId) {
                              // Replace @name with @characterId in the prompt sent to backend
                              promptToSend = promptToSend.split(mention).join(`@${char.characterId}`);
                          }
                      }
                  });
              }
          } else if (professionalMode === 'continuation') {
              // Continuation mode: image parameter should be empty as we use remixTargetId
              imageToSend = undefined;
          }
      }

      let selectedAspectRatio, selectedResolution, selectedDuration, selectedQuantity;

      if (mainMode === 'novice') {
          selectedAspectRatio = noviceAspectRatio;
          selectedResolution = noviceResolution;
          selectedDuration = noviceDuration;
          selectedQuantity = noviceQuantity;
      } else {
          const useStep1Settings = mainMode === 'professional' && professionalMode === 'creation' && currentStep === 1;
          selectedAspectRatio = useStep1Settings ? step1AspectRatio : aspectRatio;
          selectedResolution = useStep1Settings ? step1Resolution : resolution;
          selectedDuration = useStep1Settings ? step1Duration : duration;
          selectedQuantity = quantity;
      }

      const request: generationAPI.ImageToVideoRequest = {
        prompt: promptToSend,
        image: imageToSend || '', // 兼容必填字段
        model: model,
        aspectRatio: selectedAspectRatio === 'Auto' ? undefined : selectedAspectRatio,
        resolution: selectedResolution === 'Auto' ? undefined : selectedResolution,
        duration: Number(selectedDuration),
        quantity: selectedQuantity,
        
        firstFrameUrl: firstFrameUrlToSend,
        lastFrameUrl: lastFrameUrlToSend,
        urls: urlsToSend,
        remixTargetId: selectedContinuationRecord?.pid,
        webHook: '-1',
        shutProgress: false,
      };
      
      // 调用图生视频API
      let response = await generationAPI.imageToVideo(request);
      
      // 如果返回了记录ID且状态为处理中，开始轮询
      if (response.generationRecordId && (response.status === 'processing' || response.status === 'running')) {
         const recordId = response.generationRecordId;
         let retries = 0;
         while (true) {
             // 前端每隔 2-3 秒问一次后端结果
             await new Promise(resolve => setTimeout(resolve, 2500));
             
             const statusRes = await generationAPI.getTaskStatus<generationAPI.VideoGenerationResponse>(recordId);
             
             // 一旦后端轮询结果返回 status: succeeded 或者 progress: 100
             if (statusRes.status === 'success' || statusRes.status === 'succeeded' || statusRes.status === 'completed' || statusRes.progress === 100) {
                 // 瞬间拉满：立即终止“演戏”动画，直接把进度条瞬移到 100%
                 if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                 response = {
                   ...response,
                   status: 'success',
                   errorMessage: statusRes.errorMessage,
                   progress: statusRes.progress,
                   videoUrl: statusRes.videoUrl || response.videoUrl,
                   pid: statusRes.pid,
                 };
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
      
      const usedResolution = selectedResolution;
      const usedAspectRatio = selectedAspectRatio;
      const usedDuration = selectedDuration;

      // 构建生成配置参数
      const generationConfig: VideoGenerationConfig = {
        prompt: currentPrompt,
        model: model,
        resolution: usedResolution === 'Auto' ? undefined : usedResolution,
        aspectRatio: usedAspectRatio === 'Auto' ? undefined : usedAspectRatio,
        duration: Number(usedDuration),
        referenceImage: imageToSend,
      };

      // 将响应转换为AssetNode格式
      const newVideo: AssetNode = {
        id: `gen-${Date.now()}`,
        name: currentPrompt.substring(0, 30) || 'Untitled Video',
        type: 'video',
        createdAt: Date.now(),
        url: response.videoUrl,
        prompt: currentPrompt,
        originalImageUrl: imageToSend || undefined,
        generationType: 'img2video',
        generationConfig: generationConfig,
        generationRecordId: response.generationRecordId,
      };
      
      setVideos([newVideo]);
      onSelectAsset(newVideo);

      // If in professional mode step 1, save the result for display
      if (mainMode === 'professional' && professionalMode === 'creation' && currentStep === 1) {
          setGeneratedCharacterVideoUrl(response.videoUrl);
          if (response.pid) {
              setCurrentPid(response.pid);
          }
      }

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
    onPickAsset,
    loading = false
  }: { 
    file?: string | null, 
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void, 
    onClear: () => void,
    label?: string,
    placeholder?: string,
    onPickAsset: () => void,
    loading?: boolean
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        {label && <span className="text-sm font-bold text-white">{label}</span>}
        <button onClick={onPickAsset} className="text-[12px] text-[#ff2e8c] flex items-center space-x-1 hover:text-[#ff2e8c]/80 transition-colors">
            <FolderOpen className="w-3.5 h-3.5" />
            <span>从资产选择</span>
        </button>
      </div>
      <label className={`block aspect-video border-2 border-dashed border-[#22283d] bg-[#151929] rounded-2xl cursor-pointer hover:border-[#ff2e8c]/30 transition-all overflow-hidden relative group ${loading ? 'pointer-events-none opacity-50' : ''}`}>
        {file ? (
          <>
            <SecureImage src={file} className="w-full h-full object-cover" alt="Preview" />
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClear(); }}
              className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors z-10"
              disabled={loading}
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center space-y-2">
            {loading ? (
                <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
            ) : (
                <Upload className="w-5 h-5 text-gray-500" />
            )}
            <p className="text-xs font-bold text-gray-400">{loading ? '上传中...' : placeholder}</p>
          </div>
        )}
        <input type="file" className="hidden" onChange={onUpload} accept="image/*" disabled={loading} />
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
          <h2 className="text-4xl font-black tracking-tighter mb-2">图生视频 <span className="brand-text-gradient pr-2">Engine</span></h2>
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
                新手模式(可真人)
            </button>
            <button 
                onClick={() => setMainMode('professional')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mainMode === 'professional' ? 'brand-gradient text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
                专业模式(虚拟人)
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

            {/* Professional Mode Steps - Only show in creation mode */}
            {mainMode === 'professional' && professionalMode === 'creation' && (
                <div className="space-y-6">
                    {/* Step 1: Generate Character Video */}
                    <div className="border border-white/10 bg-[#0d1121] rounded-2xl p-4 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <span className="px-2 py-0.5 text-xs font-bold rounded bg-[#2cc2f5] text-black">Step 1</span>
                                <span className="font-bold text-white">生成角色视频</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <span className="text-xs text-yellow-500 flex items-center"><Gem className="w-3 h-3 mr-1"/> 预计消耗算力 {calculateCost()}PTS</span>
                                <button 
                                    onClick={() => setShowStep1Settings(!showStep1Settings)} 
                                    className={`p-1.5 rounded-lg transition-colors ${showStep1Settings ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                    title="视频设置"
                                >
                                    <Settings2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Step 1 Content Always Visible */}
                        <div className="space-y-4">
                                <p className="text-gray-400 text-xs">描述您想生成的角色...</p>
                                <div className="relative">
                                     <textarea 
                                        value={step1Prompt}
                                        onChange={(e) => setStep1Prompt(e.target.value)}
                                        placeholder="例如：一个穿着白色连衣裙的女孩..."
                                        className="w-full h-24 bg-[#151929] border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-[#2cc2f5] transition-all resize-none"
                                    />
                                    <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                                        <label className={`cursor-pointer p-1.5 hover:bg-white/10 rounded-lg transition-colors ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
                                            {uploading ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" /> : <ImageIcon className="w-4 h-4 text-gray-400" />}
                                            <input type="file" className="hidden" onChange={handleGenericUpload(setFile)} accept="image/*" disabled={uploading} />
                                        </label>
                                        <button 
                                            onClick={() => handleOptimizePrompt('step1')}
                                            disabled={!!optimizingStep}
                                            className={`text-xs flex items-center space-x-1 ${!!optimizingStep ? 'text-gray-500 cursor-wait' : 'text-[#2cc2f5] hover:text-[#2cc2f5]/80'}`}
                                        >
                                            <Sparkles className="w-3 h-3" />
                                            <span>{optimizingStep === 'step1' ? '优化中...' : 'AI优化'}</span>
                                        </button>
                                    </div>
                                </div>
                                {file && (
                                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10 group">
                                        <SecureImage src={file} className="w-full h-full object-cover" />
                                        <button 
                                            onClick={() => setFile(null)}
                                            className="absolute top-1 right-1 p-0.5 bg-black/50 rounded-full text-white hover:bg-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}

                                {showStep1Settings && (
                                    <div className="bg-[#151929] rounded-xl border border-white/10 p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] text-gray-500 font-bold">视频比例</label>
                                                <div className="flex bg-[#060813] p-1 rounded-lg border border-white/5">
                                                    {availableRatios.map(r => (
                                                        <button
                                                            key={r.label}
                                                            onClick={() => setStep1AspectRatio(r.label)}
                                                            className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center space-x-1 transition-all ${step1AspectRatio === r.label ? 'bg-[#1c2132] text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}
                                                        >
                                                            {r.label === '16:9' ? <div className="w-3 h-2 border border-current rounded-[1px]"/> : 
                                                             r.label === '9:16' ? <div className="w-2 h-3 border border-current rounded-[1px]"/> : null}
                                                            <span>{r.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] text-gray-500 font-bold">视频时长(秒)</label>
                                                <div className="flex bg-[#060813] p-1 rounded-lg border border-white/5">
                                                    {availableDurations.map(d => (
                                                         <button
                                                            key={d}
                                                            onClick={() => setStep1Duration(d)}
                                                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${step1Duration === d ? 'bg-[#1c2132] text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}
                                                        >
                                                            {`${d}s`}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <label className="text-[10px] text-gray-500 font-bold">视频分辨率</label>
                                            <div className="flex bg-[#060813] p-1 rounded-lg border border-white/5">
                                                {availableResolutions.map(res => (
                                                    <button
                                                        key={res}
                                                        onClick={() => setStep1Resolution(res)}
                                                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${step1Resolution === res ? 'bg-[#1c2132] text-white shadow-sm' : 'text-gray-500 hover:text-white'}`}
                                                    >
                                                        {res}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!generatedCharacterVideoUrl ? (
                                    <button 
                                        onClick={handleGenerate}
                                        disabled={generating}
                                        className="w-full py-3 bg-[#1c2132] hover:bg-[#252b42] text-white rounded-xl font-bold transition-all flex items-center justify-center space-x-2"
                                    >
                                        <Film className="w-4 h-4" />
                                        <span>{generating ? '生成中...' : '生成角色视频'}</span>
                                    </button>
                                ) : (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                        <div className="bg-[#151929] rounded-xl border border-white/10 p-3">
                                            <p className="text-xs font-bold text-white mb-2">生成结果:</p>
                                            <div className="aspect-video rounded-lg overflow-hidden bg-black relative group">
                                                <SecureVideo 
                                                    src={generatedCharacterVideoUrl} 
                                                    controls 
                                                    className="w-full h-full"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 mt-3">
                                                <button 
                                                    onClick={() => setSavingCharacter(true)}
                                                    className="py-2 bg-[#2cc2f5]/10 text-[#2cc2f5] hover:bg-[#2cc2f5]/20 rounded-lg text-xs font-bold transition-all"
                                                >
                                                    保存角色视频
                                                </button>
                                                <button 
                                                    onClick={handleGenerate}
                                                    disabled={generating}
                                                    className="py-2 bg-white/5 text-gray-300 hover:bg-white/10 rounded-lg text-xs font-bold transition-all"
                                                >
                                                    重绘 ({calculateCost()} PTS)
                                                </button>
                                            </div>
                                        </div>

                                        {savingCharacter && (
                                            <div className="bg-[#151929] rounded-xl border border-white/10 p-4 space-y-3 animate-in fade-in zoom-in duration-300">
                                                <input 
                                                    type="text" 
                                                    value={newCharacterName}
                                                    onChange={(e) => setNewCharacterName(e.target.value)}
                                                    placeholder="为新角色命名"
                                                    className="w-full bg-[#060813] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#2cc2f5]"
                                                />
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button 
                                                        onClick={handleSaveCharacter}
                                                        disabled={isSavingCharacterLoading}
                                                        className={`py-2 bg-[#2cc2f5] text-black rounded-lg text-xs font-bold hover:brightness-110 flex items-center justify-center space-x-1 ${isSavingCharacterLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        {isSavingCharacterLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                                                        <span>{isSavingCharacterLoading ? '保存中' : '确认保存'}</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => setSavingCharacter(false)}
                                                        disabled={isSavingCharacterLoading}
                                                        className={`py-2 bg-white/5 text-gray-400 rounded-lg text-xs font-bold hover:bg-white/10 ${isSavingCharacterLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        取消
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <p className="text-[10px] text-gray-600 text-center">1、不可使用写实风格照片上传进行参考。2、角色生成期间，不要离开本页面，否则角色无法正常保存。</p>
                            </div>
                    </div>

                    {/* Step 2: Generate Video */}
                    <div className="border border-white/10 bg-[#0d1121] rounded-2xl p-4 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <span className="px-2 py-0.5 text-xs font-bold rounded bg-[#2cc2f5] text-black">Step 2</span>
                                <span className="font-bold text-white">生成视频</span>
                            </div>
                            <button 
                                onClick={() => {
                                  setIsCharacterManagerOpen(true);
                                  setCharacterManagerView('list');
                                }}
                                className="text-xs text-[#2cc2f5] flex items-center space-x-1 hover:text-[#2cc2f5]/80 transition-colors"
                            >
                                <User className="w-3 h-3" />
                                <span>角色库管理</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="relative">
                                     <textarea 
                                        value={professionalStep2Prompt}
                                        onChange={(e) => setProfessionalStep2Prompt(e.target.value)}
                                        placeholder="你可以@你的角色进行相应的互动。"
                                        className="w-full h-24 bg-[#151929] border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-[#2cc2f5] transition-all resize-none"
                                    />
                                     <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                                        <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors bg-white/5">
                                            <Plus className="w-4 h-4 text-gray-400" />
                                        </button>
                                        <button 
                                            onClick={() => handleOptimizePrompt('step2')}
                                            disabled={!!optimizingStep}
                                            className={`text-xs flex items-center space-x-1 ${!!optimizingStep ? 'text-gray-500 cursor-wait' : 'text-[#2cc2f5] hover:text-[#2cc2f5]/80'}`}
                                        >
                                            <Sparkles className="w-3 h-3" />
                                            <span>{optimizingStep === 'step2' ? '优化中...' : 'AI优化'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Character Selection */}
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-gray-500">选择角色</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {characterLibrary.map(char => (
                                            <button 
                                                key={char.id}
                                                onClick={() => handleSelectCharacter(char)}
                                                className="flex flex-col items-center space-y-1 group"
                                            >
                                                <div className={`w-12 h-12 rounded-lg overflow-hidden border transition-all relative ${selectedCharacterIds.includes(char.id) ? 'border-[#2cc2f5] ring-2 ring-[#2cc2f5]/50' : 'border-white/10 group-hover:border-[#2cc2f5]'}`}>
                                                    {char.coverUrl ? (
                                                        <SecureImage src={char.coverUrl} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <SecureVideo src={char.url} className="w-full h-full object-cover" muted playsInline />
                                                    )}
                                                </div>
                                                <span className={`text-[10px] truncate w-full text-center ${selectedCharacterIds.includes(char.id) ? 'text-white font-bold' : 'text-gray-400 group-hover:text-white'}`}>{char.name}</span>
                                            </button>
                                        ))}
                                        {characterLibrary.length === 0 && (
                                            <div className="col-span-4 text-center py-4 text-xs text-gray-600">
                                                暂无角色，请先在 Step 1 生成并保存角色
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Video Settings */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">视频比例</label>
                                        <div className="flex space-x-2 bg-[#060813] p-1 rounded-lg border border-white/5">
                                            {availableRatios.map(r => (
                                                <button
                                                    key={r.label}
                                                    onClick={() => setAspectRatio(r.label)}
                                                    className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center space-x-1 ${aspectRatio === r.label ? 'bg-[#1c2132] text-white' : 'text-gray-500 hover:text-white'}`}
                                                >
                                                    {r.label === '16:9' ? <div className="w-3 h-2 border border-current rounded-[1px]"/> : 
                                                     r.label === '9:16' ? <div className="w-2 h-3 border border-current rounded-[1px]"/> : null}
                                                    <span>{r.label}</span>
                                                </button>
                                            ))}
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
                                                    {`${d}s`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">视频分辨率</label>
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
                       onClick={() => handleGenerate(2)}
                       disabled={generating || !!optimizingStep}
                       className="w-full brand-gradient py-4 rounded-[1.5rem] font-black text-lg shadow-2xl glow-cyan hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-3 tracking-[0.2em] disabled:opacity-30"
                     >
                       <Sparkles className="w-5 h-5" />
                       <span>开始制作</span>
                     </button>
                 </div>
            )}

            <div className="space-y-6">
              {mainMode === 'novice' && noviceSubMode === 'frames' && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-sm font-bold text-white">上传参考图片</span>
                        <button 
                            onClick={() => { 
                                setIsAssetPickerOpen(true); 
                                if (!noviceFile) {
                                    setActivePicker('first');
                                } else if (!lastFrameFile) {
                                    setActivePicker('last');
                                } else {
                                    setActivePicker('first');
                                }
                            }} 
                            className="text-[12px] text-[#ff2e8c] flex items-center space-x-1 hover:text-[#ff2e8c]/80 transition-colors"
                        >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>从资产选择</span>
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="relative group">
                            <label className="block aspect-video border-2 border-dashed border-[#22283d] bg-[#151929] rounded-2xl cursor-pointer hover:border-[#ff2e8c]/30 transition-all overflow-hidden relative">
                                {noviceFile ? (
                                    <>
                                        <SecureImage src={noviceFile} className="w-full h-full object-cover" alt="First Frame" />
                                        <button 
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setNoviceFile(null); }}
                                            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors z-10"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center space-y-2">
                                        {uploading ? (
                                            <Loader2 className="w-5 h-5 text-[#ff2e8c] animate-spin" />
                                        ) : (
                                            <Upload className="w-5 h-5 text-gray-500" />
                                        )}
                                        <p className="text-xs font-bold text-gray-400">{uploading ? '上传中...' : '首帧'}</p>
                                    </div>
                                )}
                                <input type="file" className="hidden" onChange={handleGenericUpload(setNoviceFile)} accept="image/*" disabled={uploading} />
                            </label>
                         </div>
                         
                         <div className="relative group">
                            <label className="block aspect-video border-2 border-dashed border-[#22283d] bg-[#151929] rounded-2xl cursor-pointer hover:border-[#ff2e8c]/30 transition-all overflow-hidden relative">
                                {lastFrameFile ? (
                                    <>
                                        <SecureImage src={lastFrameFile} className="w-full h-full object-cover" alt="Last Frame" />
                                        <button 
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLastFrameFile(null); }}
                                            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors z-10"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center space-y-2">
                                        {uploading ? (
                                            <Loader2 className="w-5 h-5 text-[#ff2e8c] animate-spin" />
                                        ) : (
                                            <Upload className="w-5 h-5 text-gray-500" />
                                        )}
                                        <p className="text-xs font-bold text-gray-400">{uploading ? '上传中...' : '尾帧'}</p>
                                    </div>
                                )}
                                <input type="file" className="hidden" onChange={handleGenericUpload(setLastFrameFile)} accept="image/*" disabled={uploading} />
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
                                <SecureImage src={url} className="w-full h-full object-cover" />
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
                        
                        {referenceFiles.length < maxReferenceImages && (
                             <label className={`aspect-[3/4] border-2 border-dashed border-[#22283d] bg-[#151929] rounded-2xl cursor-pointer hover:border-[#ff2e8c]/30 transition-all flex flex-col items-center justify-center space-y-2 group ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
                                <div className="w-8 h-8 rounded-full bg-[#22283d] flex items-center justify-center group-hover:bg-[#ff2e8c] transition-colors">
                                    {uploading ? <Loader2 className="w-4 h-4 text-[#ff2e8c] animate-spin" /> : <Upload className="w-4 h-4 text-gray-400 group-hover:text-white" />}
                                </div>
                                <span className="text-xs font-bold text-gray-400 group-hover:text-white">{uploading ? '上传中...' : `图${referenceFiles.length + 1}`}</span>
                                <input type="file" className="hidden" onChange={handleReferenceUpload} accept="image/*" disabled={uploading} />
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

              {mainMode === 'professional' && professionalMode === 'creation' && profStep === 0 && (
                  <>
                  {/* Deprecated old creation UI - keeping it hidden or removing it. 
                      Since we implemented Step 1 & 2 above, we can hide this block or reuse parts of it if needed.
                      For now, I'll just not render it by adding profStep === 0 check which is never true.
                  */}
                  <div className="grid grid-cols-2 gap-4 h-48">
                      <label className={`relative bg-[#151929] border border-white/5 rounded-2xl flex flex-col items-center justify-center space-y-4 hover:border-[#ff2e8c]/50 transition-all group cursor-pointer overflow-hidden ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
                          {file ? (
                               <>
                                {fileType === 'video' ? (
                                    <SecureVideo 
                                        src={file} 
                                        className="absolute inset-0 w-full h-full object-cover" 
                                        muted 
                                        playsInline
                                        onLoadedMetadata={(e) => {
                                            e.currentTarget.currentTime = 0.1; // Seek to 0.1s to ensure a frame is shown
                                        }}
                                    />
                                ) : (
                                    <SecureImage src={file} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
                                )}
                                <button 
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFile(null); }}
                                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors z-20"
                                    disabled={uploading}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                               </>
                          ) : (
                              <>
                                  <div className="w-12 h-12 rounded-full bg-[#22283d] flex items-center justify-center group-hover:bg-[#ff2e8c] transition-colors">
                                      {uploading ? (
                                          <Loader2 className="w-6 h-6 text-[#ff2e8c] animate-spin" />
                                      ) : (
                                          <User className="w-6 h-6 text-white" />
                                      )}
                                  </div>
                                  <span className="text-xs font-bold text-gray-400 group-hover:text-white">{uploading ? '上传中...' : '创建角色1'}</span>
                              </>
                          )}
                          <input type="file" className="hidden" onChange={handleVideoUpload(setFile)} accept="video/*" disabled={uploading} />
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
                  <div className="space-y-6">
                      <div className="space-y-2">
                          <div
                            onClick={openContinuationVideoPicker}
                            className={`aspect-video rounded-2xl cursor-pointer relative overflow-hidden group transition-all ${
                              selectedContinuationRecord 
                                ? 'border-0' 
                                : 'border-2 border-dashed border-[#22283d] bg-[#151929] flex flex-col items-center justify-center space-y-4 hover:border-[#ff2e8c]/30'
                            }`}
                          >
                              {selectedContinuationRecord ? (
                                <>
                                  <SecureVideo
                                    src={selectedContinuationRecord.contentUrl}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    muted
                                    playsInline
                                    onLoadedMetadata={(e) => {
                                      e.currentTarget.currentTime = 0.1;
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-sm font-bold text-white">点击更换续写视频</span>
                                    <span className="text-[10px] text-gray-300 max-w-[80%] truncate">{formatPrompt(selectedContinuationRecord.prompt)}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedContinuationRecord(null);
                                    }}
                                    className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-red-500 transition-colors z-20 opacity-0 group-hover:opacity-100"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-8 h-8 text-gray-500" />
                                  <span className="text-sm font-bold text-gray-400">选择需要续写的视频</span>
                                </>
                              )}
                          </div>
                          <p className="text-[10px] text-gray-500 text-center">提示：视频续写仅支持专业模式下生成的视频续写，不支持其他类型视频</p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">PROMPT</p>
                        <div className="relative">
                          <textarea 
                              value={continuationPrompt}
                              onChange={(e) => setContinuationPrompt(e.target.value)}
                              placeholder="输入续写视频的描述..."
                              className="w-full h-24 bg-[#151929] border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-[#2cc2f5] transition-all resize-none"
                          />
                          <div className="absolute bottom-2 left-2 right-2 flex justify-end items-center">
                            <button 
                                onClick={() => handleOptimizePrompt('step2')}
                                disabled={!!optimizingStep}
                                className={`text-xs flex items-center space-x-1 ${!!optimizingStep ? 'text-gray-500 cursor-wait' : 'text-[#2cc2f5] hover:text-[#2cc2f5]/80'}`}
                            >
                                <Sparkles className="w-3 h-3" />
                                <span>{optimizingStep === 'step2' ? '优化中...' : 'AI优化'}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">视频比例</label>
                            <div className="flex space-x-2 bg-[#060813] p-1 rounded-lg border border-white/5">
                                {availableRatios.map(r => (
                                    <button
                                        key={r.label}
                                        onClick={() => setAspectRatio(r.label)}
                                        className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center space-x-1 ${aspectRatio === r.label ? 'bg-[#1c2132] text-white' : 'text-gray-500 hover:text-white'}`}
                                    >
                                        {r.label === '16:9' ? <div className="w-3 h-2 border border-current rounded-[1px]"/> : 
                                         r.label === '9:16' ? <div className="w-2 h-3 border border-current rounded-[1px]"/> : null}
                                        <span>{r.label}</span>
                                    </button>
                                ))}
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
                                        {d}s
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">视频分辨率</label>
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
                       onClick={() => handleGenerate()}
                       disabled={generating || !!optimizingStep}
                       className="w-full brand-gradient py-4 rounded-[1.5rem] font-black text-lg shadow-2xl glow-cyan hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-3 tracking-[0.2em] disabled:opacity-30"
                     >
                       <Sparkles className="w-5 h-5" />
                       <span>开始制作</span>
                     </button>
                  </div>
              )}

            </div>
            
            {mainMode === 'novice' && (
                <div className="bg-[#060813] p-6 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-gray-600 font-bold uppercase mb-2 tracking-widest">PROMPT</p>
                    <textarea 
                        value={novicePrompt}
                        onChange={(e) => setNovicePrompt(e.target.value)}
                        placeholder={novicePromptPlaceholder}
                        className="w-full h-24 bg-transparent outline-none text-sm resize-none font-medium leading-relaxed"
                    />
                    <div className="flex justify-end mt-2 px-1">
                        <button 
                        onClick={() => handleOptimizePrompt('step2')}
                        disabled={!!optimizingStep}
                        className={`flex items-center space-x-2 text-[10px] ${!!optimizingStep ? 'text-gray-500 cursor-wait' : 'text-cyan-400 hover:text-cyan-300'} font-black uppercase tracking-widest group`}
                        >
                        <Wand2 className={`w-3 h-3 ${optimizingStep === 'step2' ? 'animate-pulse' : 'group-hover:rotate-45'} transition-transform`} />
                        <span>{optimizingStep === 'step2' ? '优化中...' : 'AI帮助优化提示词'}</span>
                        </button>
                    </div>
                </div>
            )}
            
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

            {mainMode === 'novice' && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                    <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">视频尺寸</label>
                    <div className="flex space-x-2 bg-[#060813] p-1 rounded-lg border border-white/5">
                         {availableRatios.map(ratioObj => {
                             const ratio = ratioObj.label;
                             return (
                             <button
                                key={ratio}
                                onClick={() => setNoviceAspectRatio(ratio)}
                                className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center space-x-1 ${noviceAspectRatio === ratio ? 'bg-[#1c2132] text-white' : 'text-gray-500 hover:text-white'}`}
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
                                onClick={() => setNoviceDuration(d)}
                                className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center ${noviceDuration === d ? 'bg-[#1c2132] text-white' : 'text-gray-500 hover:text-white'}`}
                            >
                                {d}{d === 'Auto' ? '' : 's'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            )}

            {mainMode === 'novice' && (
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] text-gray-600 font-black uppercase tracking-widest">视频清晰度</label>
                    <div className="flex space-x-2 bg-[#060813] p-1 rounded-lg border border-white/5">
                        {availableResolutions.map(res => (
                            <button
                                key={res}
                                onClick={() => setNoviceResolution(res)}
                                className={`flex-1 py-2 text-xs font-bold rounded-md flex items-center justify-center ${noviceResolution === res ? 'bg-[#1c2132] text-white' : 'text-gray-500 hover:text-white'}`}
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
                          <span>{noviceQuantity}</span>
                          <ChevronDown className="w-3 h-3 text-gray-600" />
                        </button>
                        <select 
                            value={noviceQuantity}
                            onChange={(e) => setNoviceQuantity(Number(e.target.value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        >
                            {availableQuantities.map(q => (
                                <option key={q} value={q}>{q}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            )}

            {mainMode === 'novice' && (
            <>
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
              disabled={generating || uploading || !!optimizingStep}
              className="w-full brand-gradient py-5 rounded-[1.5rem] font-black text-xl shadow-2xl glow-cyan hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-3 tracking-[0.2em] disabled:opacity-30"
            >
              <Sparkles className="w-5 h-5" />
              <span>{generating ? '生成中...' : '开始制作'}</span>
            </button>
            </>
            )}
            
          </div>
        </div>

        {/* Right Preview Area */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] text-gray-700 bg-white/[0.01] min-h-[500px]">
          {!generating && videos.length > 0 && videos[0].url ? (
            <div 
              className="w-full h-full flex items-center justify-center cursor-pointer group relative"
              onClick={() => onSelectAsset(videos[0])}
            >
              <SecureVideo 
                src={videos[0].url} 
                controls 
                className="max-w-full max-h-full rounded-xl shadow-2xl transition-transform group-hover:scale-[1.01]" 
                loop
                muted // Muted for preview panel usually, or just no autoplay
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                 <div className="bg-black/50 backdrop-blur-sm p-3 rounded-full">
                    <PlaySquare className="w-8 h-8 text-white" />
                 </div>
              </div>
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
    
    {isCharacterManagerOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-2xl bg-[#0d1121] border border-white/10 rounded-2xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 m-4">
           {/* Header */}
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-[#2cc2f5]" />
                  <h3 className="text-lg font-bold text-white">
                    {characterManagerView === 'list' && '角色库管理'}
                    {characterManagerView === 'picker' && '选择角色视频'}
                    {characterManagerView === 'naming' && '为角色命名'}
                  </h3>
              </div>
              <div className="flex items-center space-x-2">
                {characterManagerView !== 'list' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (characterManagerView === 'naming') {
                        setCharacterManagerView('picker');
                        setSelectedCharacterVideoRecord(null);
                        setAddCharacterFromVideoName('');
                      } else {
                        setCharacterManagerView('list');
                      }
                    }}
                    className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                    title="返回"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                {characterManagerView === 'picker' && (
                  <button
                    type="button"
                    onClick={() => loadCharacterVideoRecords(1, 'reset')}
                    disabled={characterVideoLoading}
                    className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                    title="刷新"
                  >
                    <RefreshCw className={`w-5 h-5 ${characterVideoLoading ? 'animate-spin' : ''}`} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeCharacterManager}
                  className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                  title="关闭"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
           </div>
           
           {/* Content */}
           {characterManagerView === 'list' && (
             <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto pr-2">
               <button
                 type="button"
                 onClick={openCharacterVideoPicker}
                 className="group relative bg-[#0d1121] rounded-xl overflow-hidden border border-dashed border-white/15 hover:border-[#2cc2f5]/60 transition-all flex flex-col items-center justify-center aspect-square min-h-[100px] z-10"
               >
                 <div className="flex flex-col items-center justify-center space-y-2">
                   <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#2cc2f5]/15 transition-colors">
                     <Plus className="w-6 h-6 text-[#2cc2f5]" />
                   </div>
                   <span className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">添加角色</span>
                 </div>
               </button>

               {characterLibrary.map(char => (
                 <div key={char.id} className="group relative bg-[#151929] rounded-xl overflow-hidden border border-white/5 hover:border-[#2cc2f5]/50 transition-all">
                   <div className="aspect-square relative">
                     {char.coverUrl ? (
                       <SecureImage src={char.coverUrl} className="w-full h-full object-cover" />
                     ) : (
                       <SecureVideo src={char.url} className="w-full h-full object-cover" muted />
                     )}

                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center space-y-2">
                       <button
                           type="button"
                           onClick={(e) => {
                            e.stopPropagation();
                            onSelectAsset({
                              id: char.id,
                              name: char.name,
                              type: 'video',
                              url: char.url,
                              thumbnail: char.coverUrl,
                              createdAt: Date.now(),
                              prompt: char.name,
                              generationType: 'img2video',
                              hideActions: true
                            });
                          }}
                           className="p-2 bg-white/10 rounded-full text-white hover:bg-[#2cc2f5] hover:text-black transition-colors"
                           title="预览视频"
                         >
                           <PlaySquare className="w-5 h-5" />
                         </button>
                       <button
                         type="button"
                         onClick={(e) => {
                           e.stopPropagation();
                           handleDeleteCharacter(char.id);
                         }}
                         className="p-2 bg-white/10 rounded-full text-white hover:bg-red-500 hover:text-white transition-colors"
                         title="删除角色"
                       >
                         <Trash2 className="w-5 h-5" />
                       </button>
                     </div>
                   </div>
                   <div className="p-3">
                     <p className="text-xs font-bold text-white truncate text-center">{char.name}</p>
                   </div>
                 </div>
               ))}

               {characterLibrary.length === 0 && (
                 <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-500 space-y-3">
                   <User className="w-12 h-12 opacity-20" />
                   <p className="text-sm">暂无保存的角色</p>
                 </div>
               )}
             </div>
           )}

           {characterManagerView === 'picker' && (
             <>
               <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-100/80 leading-relaxed">
                    请选择清晰（不包含真人参考、需保证单一人物、无遮挡、光线充足）的视频
                  </p>
               </div>
               <div className="max-h-[60vh] overflow-y-auto pr-2">
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                   {characterVideoRecords.map(record => (
                     <button
                       key={record.id}
                       type="button"
                       className="group relative bg-[#151929] rounded-xl overflow-hidden border border-white/5 hover:border-[#2cc2f5]/50 transition-all text-left"
                       onClick={() => {
                         setSelectedCharacterVideoRecord(record);
                         setAddCharacterFromVideoName('');
                         setCharacterManagerView('naming');
                       }}
                     >
                       <div className="aspect-video relative bg-black">
                         <SecureVideo
                           src={record.contentUrl}
                           className="w-full h-full object-cover"
                           muted
                           playsInline
                           preload="metadata"
                           onLoadedMetadata={(e) => {
                             e.currentTarget.currentTime = 0.1;
                           }}
                         />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <span className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur text-xs font-bold text-white">选择</span>
                         </div>
                       </div>
                       <div className="p-3 space-y-1">
                         <p className="text-xs font-bold text-white truncate">{formatPrompt(record.prompt) || '未命名视频'}</p>
                        <p className="text-[10px] text-gray-400 truncate">模型：{getModelDisplayName(record.model)}</p>
                        <p className="text-[10px] text-gray-500">生成于 {formatRecordCreatedAt(record.createdAt)}</p>
                       </div>
                     </button>
                   ))}

                   {!characterVideoLoading && characterVideoRecords.length === 0 && (
                     <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-500 space-y-3">
                       <VideoIcon className="w-12 h-12 opacity-20" />
                       <p className="text-sm">暂无符合条件的可添加角色视频</p>
                       <p className="text-[10px] text-gray-600">条件：图生视频 + pid有值 + success</p>
                     </div>
                   )}
                 </div>
               </div>

               <div className="mt-6 flex items-center justify-between">
                 <div className="text-[10px] text-gray-500">共 {characterVideoRecords.length} 条</div>
                 <div className="flex items-center space-x-3">
                   {characterVideoHasMore && (
                     <button
                       type="button"
                       onClick={() => loadCharacterVideoRecords(characterVideoPage + 1, 'append')}
                       disabled={characterVideoLoading}
                       className="px-4 py-2 bg-white/5 text-gray-200 hover:bg-white/10 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                     >
                       {characterVideoLoading ? '加载中...' : '加载更多'}
                     </button>
                   )}
                 </div>
               </div>
             </>
           )}

           {characterManagerView === 'naming' && selectedCharacterVideoRecord && (
             <div className="flex flex-col">
               <div className="aspect-video mb-6 bg-black rounded-xl overflow-hidden border border-white/10 relative group shadow-2xl">
                 <SecureVideo
                   src={selectedCharacterVideoRecord.contentUrl}
                   className="w-full h-full object-contain"
                   controls
                   playsInline
                   autoPlay
                   loop
                 />
               </div>

               <div className="bg-[#151929] border border-white/10 rounded-2xl p-6 space-y-6">
                 <div className="space-y-3">
                   <label className="text-sm font-bold text-white flex items-center">
                     角色名称 
                     <span className="text-red-500 ml-1" title="必填">*</span>
                   </label>
                   <div className="relative">
                      <input
                        value={addCharacterFromVideoName}
                        onChange={(e) => setAddCharacterFromVideoName(e.target.value)}
                        placeholder="请输入角色名称（必填）"
                        className="w-full bg-[#0d1121] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#2cc2f5] focus:ring-1 focus:ring-[#2cc2f5] transition-all placeholder:text-gray-600"
                        maxLength={30}
                        autoFocus
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">
                        {addCharacterFromVideoName.length}/30
                      </span>
                   </div>
                   <div className="flex items-start gap-1.5 mt-2 text-yellow-500/90">
                     <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                     <p className="text-xs">角色生成期间，不要离开本页面，否则角色无法正常保存。</p>
                   </div>
                 </div>

                 <div className="flex items-center justify-end space-x-3 pt-2">
                   <button
                    type="button"
                    onClick={() => {
                      setCharacterManagerView('picker');
                      setSelectedCharacterVideoRecord(null);
                      setAddCharacterFromVideoName('');
                    }}
                    disabled={isAddingCharacterLoading}
                    className={`px-6 py-2.5 bg-white/5 text-gray-300 hover:bg-white/10 rounded-xl text-xs font-bold transition-all ${isAddingCharacterLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    返回选择
                  </button>
                   <button
                     type="button"
                     onClick={handleConfirmAddCharacterFromVideo}
                     disabled={!addCharacterFromVideoName.trim() || isAddingCharacterLoading}
                     className="px-8 py-2.5 brand-gradient rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20 flex items-center justify-center space-x-1"
                   >
                     {isAddingCharacterLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                     <span>{isAddingCharacterLoading ? '保存中' : '确认添加'}</span>
                   </button>
                 </div>
               </div>
             </div>
           )}
        </div>
      </div>
    )}

    {isContinuationVideoPickerOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => setIsContinuationVideoPickerOpen(false)}
      >
        <div
          className="w-full max-w-4xl bg-[#0d1121] border border-white/10 rounded-2xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 m-4"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <VideoIcon className="w-5 h-5 text-[#2cc2f5]" />
              <h3 className="text-lg font-bold text-white">选择续写视频</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => loadContinuationVideoRecords(1, 'reset')}
                disabled={continuationVideoLoading}
                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                title="刷新"
              >
                <RefreshCw className={`w-5 h-5 ${continuationVideoLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsContinuationVideoPickerOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                title="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {continuationVideoRecords.map(record => (
                <button
                  key={record.id}
                  type="button"
                  className="group relative bg-[#151929] rounded-xl overflow-hidden border border-white/5 hover:border-[#2cc2f5]/50 transition-all text-left"
                  onClick={() => {
                    setSelectedContinuationRecord(record);
                    setIsContinuationVideoPickerOpen(false);
                  }}
                >
                  <div className="aspect-video relative bg-black">
                    <SecureVideo
                      src={record.contentUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                      onLoadedMetadata={(e) => {
                        e.currentTarget.currentTime = 0.1;
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur text-xs font-bold text-white">选择</span>
                    </div>
                  </div>
                  <div className="p-3 space-y-1">
                    <p className="text-xs font-bold text-white truncate">{formatPrompt(record.prompt) || '未命名视频'}</p>
                    <p className="text-[10px] text-gray-400 truncate">模型：{getModelDisplayName(record.model)}</p>
                    <p className="text-[10px] text-gray-500">生成于 {formatRecordCreatedAt(record.createdAt)}</p>
                  </div>
                </button>
              ))}

              {!continuationVideoLoading && continuationVideoRecords.length === 0 && (
                <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-500 space-y-3">
                  <VideoIcon className="w-12 h-12 opacity-20" />
                  <p className="text-sm">暂无符合条件的可续写视频</p>
                  <p className="text-[10px] text-gray-600">条件：图生视频 + sora模型 + pid有值 + success</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="text-[10px] text-gray-500">
              共 {continuationVideoRecords.length} 条
            </div>
            <div className="flex items-center space-x-3">
              {continuationVideoHasMore && (
                <button
                  type="button"
                  onClick={() => loadContinuationVideoRecords(continuationVideoPage + 1, 'append')}
                  disabled={continuationVideoLoading}
                  className="px-4 py-2 bg-white/5 text-gray-200 hover:bg-white/10 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                >
                  {continuationVideoLoading ? '加载中...' : '加载更多'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsContinuationVideoPickerOpen(false)}
                className="px-4 py-2 bg-[#2cc2f5] text-black rounded-lg text-xs font-bold hover:brightness-110 transition-all"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {previewVideo && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setPreviewVideo(null)}>
        <div className="w-full max-w-4xl bg-[#0d1121] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200 m-4 flex flex-col" onClick={e => e.stopPropagation()}>
           {/* Header */}
           <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#151929]">
              <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xs">
                      AI
                  </div>
                  <div>
                      <h3 className="text-sm font-bold text-white max-w-md truncate">{previewVideo.prompt || previewVideo.name}</h3>
                      <p className="text-[10px] text-gray-400">生成于 {new Date(previewVideo.createdAt).toLocaleString()}</p>
                  </div>
              </div>
              <button 
                  onClick={() => setPreviewVideo(null)}
                  className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
              >
                  <X className="w-5 h-5" />
              </button>
           </div>
           
           {/* Video Content */}
           <div className="flex-1 bg-black flex items-center justify-center p-4 min-h-[400px]">
               <SecureVideo 
                   src={previewVideo.url} 
                   className="max-w-full max-h-[60vh] rounded-lg shadow-lg" 
                   controls 
                   autoPlay 
                   loop
               />
           </div>

           {/* Footer Actions */}
           <div className="p-4 border-t border-white/5 bg-[#151929] flex justify-between items-center">
               <div className="flex items-center space-x-4">
                   <button 
                       onClick={() => {
                           setPreviewVideo(null);
                           handleGenerate(); 
                       }}
                       className="flex items-center space-x-2 text-xs text-gray-400 hover:text-white transition-colors"
                   >
                       <RefreshCw className="w-4 h-4" />
                       <span>重绘</span>
                   </button>
                   <a 
                       href={previewVideo.url} 
                       download={`generated-video-${previewVideo.id}.mp4`}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="flex items-center space-x-2 text-xs text-gray-400 hover:text-white transition-colors"
                   >
                       <Download className="w-4 h-4" />
                       <span>下载</span>
                   </a>
               </div>
               
               <button 
                   onClick={() => {
                       message.success('发布功能开发中');
                   }}
                   className="px-6 py-2 bg-gradient-to-r from-[#2cc2f5] to-[#2c3e50] text-white text-xs font-bold rounded-full hover:brightness-110 transition-all shadow-lg shadow-blue-500/20 flex items-center space-x-2"
               >
                   <Send className="w-3.5 h-3.5" />
                   <span>发布</span>
               </button>
           </div>
        </div>
      </div>
    )}

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
