
import React, { useState, useEffect } from 'react';
import { X, Send, CheckSquare, Square, Image as ImageIcon, FileText } from 'lucide-react';
import { AssetNode } from '../../types';
import * as publishAPI from '../../api/publish';
import { message } from 'antd';
import { publishGenerationRecord } from '../../api/generation';

interface PublishModalProps {
  asset: AssetNode;
  onClose: () => void;
  onSuccess?: () => void;
  userId?: number; // 用户ID
}

const PublishModal: React.FC<PublishModalProps> = ({ asset, onClose, onSuccess, userId }) => {
  const [title, setTitle] = useState(asset.name || '');
  const [description, setDescription] = useState('');
  const [sharePrompt, setSharePrompt] = useState(true);
  const [shareOriginal, setShareOriginal] = useState(true);
  const [publishing, setPublishing] = useState(false);

  // 确定生成类型
  const getGenerationType = (): 'txt2img' | 'img2img' | 'txt2video' | 'img2video' => {
    if (asset.generationType) {
      return asset.generationType;
    }
    // 根据类型推断
    if (asset.type === 'image') {
      return asset.originalImageUrl ? 'img2img' : 'txt2img';
    } else {
      return asset.originalImageUrl ? 'img2video' : 'txt2video';
    }
  };

  const handlePublish = async () => {
    if (!userId) {
      message.warning('请先登录');
      return;
    }

    if (!title.trim()) {
      message.warning('请输入标题');
      return;
    }

    setPublishing(true);
    try {
      const generationType = getGenerationType();
      let generationConfig: string | undefined = undefined;

      // 如果选择分享提示词，则包含生成配置
      if (sharePrompt) {
        let configObj: any = asset.generationConfig ? { ...asset.generationConfig } : undefined;
        
        // 如果没有配置对象，尝试根据属性构建
        if (!configObj) {
           configObj = {
             prompt: asset.prompt || '',
           };
           if (asset.originalImageUrl) {
             if (asset.type === 'image') {
               configObj.referenceImages = [asset.originalImageUrl];
             } else {
               configObj.referenceImage = asset.originalImageUrl;
             }
           }
        }

        // 如果不分享原图，移除参考图配置
        if (!shareOriginal && configObj) {
           if (configObj.referenceImages) delete configObj.referenceImages;
           if (configObj.referenceImage) delete configObj.referenceImage;
        }

        if (configObj) {
          generationConfig = JSON.stringify(configObj);
        }
      }

      // 确定缩略图（如果有缩略图则使用，否则：图片使用原图，视频留空让后端或前端处理默认逻辑）
      // 注意：对于视频，如果asset.thumbnail存在（如来自生成记录），则使用它；否则可能需要在Home组件中回退到contentUrl或自动截帧
      const thumbnail = asset.thumbnail || (asset.type === 'image' ? asset.url : asset.url);

      // 发布内容
      await publishAPI.publishContent(userId, {
        title: title.trim(),
        description: description.trim() || undefined,
        contentUrl: asset.url || '',
        thumbnail: thumbnail,
        type: asset.type === 'image' ? 'image' : 'video',
        generationType: generationType,
        generationConfig: generationConfig,
      });

      // 标记生成记录为已发布
      if (asset.generationRecordId) {
          try {
              await publishGenerationRecord(asset.generationRecordId);
          } catch (e) {
              console.error('标记已发布失败', e);
          }
      }

      message.success('发布成功！');
      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    } catch (error: any) {
      message.error('发布失败：' + (error.message || '未知错误'));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in" onClick={onClose}>
      <div className="bg-[#0d1121] w-full max-w-4xl rounded-[3rem] shadow-2xl flex overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
        <div className="w-1/2 bg-black relative">
          {asset.type === 'image' && <img src={asset.url} alt={asset.name} className="w-full h-full object-contain" />}
          {asset.type === 'video' && <video src={asset.url} controls className="w-full h-full object-contain" />}
        </div>
        <div className="w-1/2 flex flex-col p-10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black text-white">发布到灵感广场</h3>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 space-y-6">
            <div>
              <label className="text-xs font-bold text-gray-400 mb-2 block">标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-cyan-500 text-white font-bold"
                placeholder="请输入标题"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 mb-2 block">描述</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="分享你的创作心得..."
                className="w-full h-40 bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-cyan-500 text-white font-medium resize-none placeholder:text-gray-600"
              />
            </div>
            <div className="space-y-4">
              <button onClick={() => setSharePrompt(!sharePrompt)} className="flex items-center space-x-3 text-gray-300 hover:text-white">
                {sharePrompt ? <CheckSquare className="w-5 h-5 text-cyan-400" /> : <Square className="w-5 h-5 text-gray-600" />}
                <div className="flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-bold">同步分享提示词</span>
                </div>
              </button>
              {asset.originalImageUrl && (
                <button onClick={() => setShareOriginal(!shareOriginal)} className="flex items-center space-x-3 text-gray-300 hover:text-white">
                  {shareOriginal ? <CheckSquare className="w-5 h-5 text-cyan-400" /> : <Square className="w-5 h-5 text-gray-600" />}
                  <div className="flex items-center space-x-1.5">
                    <ImageIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-bold">同步分享原图</span>
                  </div>
                </button>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-white/5">
            <button 
              onClick={handlePublish}
              disabled={publishing || !title.trim()}
              className="w-full brand-gradient py-4 rounded-2xl font-black text-lg text-white shadow-xl glow-pink hover:scale-[1.02] transition-all flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed">
              <Send className="w-5 h-5" />
              <span>{publishing ? '发布中...' : '确认发布'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublishModal;