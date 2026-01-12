import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types';
import { UserAsset } from '../api/asset';
import { getGenerationRecords, GenerationRecord, deleteGenerationRecord } from '../api/generation';
import { Edit, Gem, Trash2, Download, Send, Music, Video, Image as ImageIcon } from 'lucide-react';
import { message, Modal, ConfigProvider } from 'antd';
import { SecureImage } from './SecureImage';
import { SecureVideo } from './SecureVideo';
import { storageApi } from '../api/storage';
import { needsSignedUrl } from '../hooks/useSignedUrl';

interface ProfileProps {
  user: User;
  onUpdateUser: (user: Partial<User>) => void;
  onSelectAsset: (asset: any) => void;
  onPublish: (asset: UserAsset) => void;
  onEditProfile: () => void;
  refreshKey?: number;
  getScrollContainer?: () => HTMLElement | null;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser, onSelectAsset, onPublish, onEditProfile, refreshKey, getScrollContainer }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video'>('all'); // Removed 'audio' as it's not in generation records yet
  const [records, setRecords] = useState<GenerationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadRecords = useCallback(async (page: number, isLoadMore: boolean = false) => {
    if (!user.id) return;
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const typeParam = activeTab === 'all' ? undefined : activeTab;
      const data = await getGenerationRecords(page, pageSize, typeParam);
      
      if (isLoadMore) {
        setRecords(prev => [...prev, ...data.records]);
        setCurrentPage(page);
      } else {
        setRecords(data.records);
        setCurrentPage(1);
      }
      
      setTotal(data.total);
      // Determine if there are more records
      setHasMore(data.records.length === pageSize && (page * pageSize) < data.total);
    } catch (error) {
      console.error('Failed to load records', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user.id, activeTab, pageSize]);

  useEffect(() => {
    setHasMore(true);
    setRecords([]);
    loadRecords(1, false);
  }, [loadRecords, refreshKey]); // loadRecords changes when activeTab changes

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = currentPage + 1;
      loadRecords(nextPage, true);
    }
  }, [loadingMore, hasMore, currentPage, loadRecords]);

  const observerTarget = useRef(null);
  const scrollRafRef = useRef<number | null>(null);

  useEffect(() => {
    const scrollEl = getScrollContainer?.() ?? null;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          handleLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '200px', root: scrollEl }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loadingMore, handleLoadMore]);

  const maybeLoadMoreByScroll = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    const el = getScrollContainer?.();
    if (!el) return;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remaining <= 240) {
      handleLoadMore();
    }
  }, [getScrollContainer, handleLoadMore, hasMore, loading, loadingMore]);

  useEffect(() => {
    const el = getScrollContainer?.();
    if (!el) return;

    const onScroll = () => {
      if (scrollRafRef.current != null) return;
      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null;
        maybeLoadMoreByScroll();
      });
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    maybeLoadMoreByScroll();

    return () => {
      el.removeEventListener('scroll', onScroll);
      if (scrollRafRef.current != null) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [getScrollContainer, maybeLoadMoreByScroll]);

  useEffect(() => {
    maybeLoadMoreByScroll();
  }, [records.length, maybeLoadMoreByScroll]);

  const handleDelete = async (e: React.MouseEvent, recordId: number) => {
    e.stopPropagation();
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个作品吗？',
      onOk: async () => {
        try {
          await deleteGenerationRecord(recordId);
          setRecords(prev => prev.filter(r => r.id !== recordId));
          setTotal(prev => prev - 1);
          message.success('删除成功');
        } catch (error) {
          console.error('Failed to delete record', error);
          message.error('删除失败');
        }
      }
    });
  };

  const handleDownload = async (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    try {
      if (!needsSignedUrl(url)) {
        window.open(url, '_blank');
        return;
      }
      const signed = await storageApi.getFileUrl(url);
      window.open(signed, '_blank');
    } catch (error) {
      window.open(url, '_blank');
    }
  };

  const handlePublish = (e: React.MouseEvent, record: GenerationRecord) => {
    e.stopPropagation();
    
    let generationConfig;
    let originalImageUrl;
    try {
      generationConfig = record.generationParams ? JSON.parse(record.generationParams) : undefined;
      // Extract original image URL if available
      if (generationConfig) {
        // Try to detect original image from various possible fields
        const img2imgRef = generationConfig.referenceImages?.[0] || generationConfig.urls?.[0];
        const img2videoRef = generationConfig.referenceImage || generationConfig.image;
        
        if (record.type === 'img2img' || (record.type === 'image' && img2imgRef)) {
          originalImageUrl = img2imgRef;
        } else if (record.type === 'img2video' || (record.type === 'video' && img2videoRef)) {
          originalImageUrl = img2videoRef;
        }
      }
    } catch (e) {
      console.warn('Failed to parse generationParams', e);
    }

    // Adapt GenerationRecord to UserAsset for onPublish if needed, or update onPublish signature
    // For now, construct a minimal UserAsset-like object
    const asset: any = {
        id: String(record.id),
        url: record.contentUrl,
        type: record.fileType as any,
        name: record.prompt, // Fix: Add name property required by PublishModal
        title: record.prompt,
        thumbnail: record.thumbnailUrl,
        generationRecordId: record.id,
        generationType: record.type as any,
        generationConfig,
        originalImageUrl
    };
    onPublish(asset);
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-8 h-8 text-gray-500" />;
      case 'audio': return <Music className="w-8 h-8 text-gray-500" />;
      default: return <ImageIcon className="w-8 h-8 text-gray-500" />;
    }
  };

  const shouldUseThumbnail = (thumbnailUrl?: string, contentUrl?: string) => {
    if (!thumbnailUrl) return false;
    if (contentUrl && thumbnailUrl === contentUrl) return false;
    const lower = thumbnailUrl.toLowerCase();
    const isSnapshot = lower.includes('x-oss-process=video/snapshot') || lower.includes('video%2fsnapshot') || lower.includes('video/snapshot');
    if (!isSnapshot && /\.(mp4|webm|mov|m3u8)(\?|$)/i.test(thumbnailUrl)) return false;
    return true;
  };

  return (
    <div className="w-full flex flex-col space-y-8 pb-20">
      {/* Header Section */}
      <div className="w-full">
        <h1 className="text-3xl font-bold text-white mb-2">个人中心</h1>
        <p className="text-gray-400 text-sm">管理您的个人资料和生成记录</p>
      </div>

      {/* Profile Card */}
      <div className="bg-[#151929] rounded-3xl p-8 border border-white/5 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between relative z-10 gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-24 h-24 rounded-full border-2 border-white/10 p-1">
              <SecureImage 
                src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                alt="Avatar" 
                className="w-full h-full rounded-full bg-[#0b0d17]"
              />
            </div>
            
            <div className="flex flex-col items-center md:items-start space-y-2">
              <h2 className="text-2xl font-bold text-white">{user.name}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>{user.phone || '未绑定手机'}</span>
                <span className="w-px h-3 bg-gray-700" />
                <span>注册于 {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '未知'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">当前算力</span>
              <div className="flex items-center gap-2 text-2xl font-bold text-white">
                <div className="w-8 h-8 brand-gradient rounded-full flex items-center justify-center">
                  <Gem className="w-4 h-4 text-white" />
                </div>
                {user.points.toLocaleString()}
              </div>
            </div>
            <button 
              onClick={onEditProfile}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center gap-2 transition-colors"
            >
              <Edit className="w-4 h-4" />
              编辑资料
            </button>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="flex items-center gap-2 bg-[#151929] w-fit p-1 rounded-xl border border-white/5">
        {(['all', 'image', 'video'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab 
                ? 'brand-gradient text-white shadow-lg' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab === 'all' && '全部'}
            {tab === 'image' && '图片'}
            {tab === 'video' && '视频'}
          </button>
        ))}
      </div>

      {/* Assets Grid */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-500 text-sm">{total} 项记录</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            加载中...
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 border border-dashed border-white/10 rounded-2xl">
            <p>暂无内容</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {records.map((record) => (
                <div 
                  key={record.id}
                  className="group relative aspect-square bg-[#151929] rounded-xl overflow-hidden border border-white/5 hover:border-[#2cc2f5]/50 transition-all cursor-pointer"
                  onClick={() => {
                    let originalImageUrl;
                    let generationConfig;
                    try {
                      generationConfig = record.generationParams ? JSON.parse(record.generationParams) : undefined;
                      if (generationConfig) {
                        // Try to detect original image from various possible fields
                        const img2imgRef = generationConfig.referenceImages?.[0] || generationConfig.urls?.[0];
                        const img2videoRef = generationConfig.referenceImage || generationConfig.image;
                        
                        if (record.type === 'img2img' || (record.type === 'image' && img2imgRef)) {
                          originalImageUrl = img2imgRef;
                        } else if (record.type === 'img2video' || (record.type === 'video' && img2videoRef)) {
                          originalImageUrl = img2videoRef;
                        }
                      }
                    } catch (e) {
                      console.warn('Failed to parse params', e);
                    }

                    onSelectAsset({
                      id: String(record.id),
                      url: record.contentUrl,
                      type: record.fileType,
                      name: record.prompt,
                      title: record.prompt,
                      thumbnail: record.thumbnailUrl,
                      generationRecordId: record.id,
                      createdAt: new Date(record.createdAt).getTime(),
                      generationParams: record.generationParams,
                      generationType: record.type,
                      generationConfig,
                      isPublish: String(record.isPublish) === '1',
                      originalImageUrl,
                      status: record.status
                  })
                }}
                >
                  {/* Thumbnail / Content */}
                  {record.thumbnailUrl || record.contentUrl ? (
                    record.fileType === 'video' ? (
                       shouldUseThumbnail(record.thumbnailUrl, record.contentUrl) ? (
                          <SecureImage
                            src={record.thumbnailUrl}
                            alt={record.prompt}
                            className="w-full h-full object-cover"
                            fallback={
                              <div className="w-full h-full flex items-center justify-center">
                                {getAssetIcon(record.fileType)}
                              </div>
                            }
                          />
                       ) : (
                          <SecureVideo
                            src={record.contentUrl}
                            className="w-full h-full object-cover"
                            muted
                            loop
                            playsInline
                            preload="metadata"
                          />
                       )
                    ) : (
                      <SecureImage src={record.thumbnailUrl || record.contentUrl} alt={record.prompt} className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {getAssetIcon(record.fileType)}
                    </div>
                  )}

                  {/* Status Badge */}
                  {String(record.isPublish) === '1' && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-medium rounded-full">
                      已发布
                    </div>
                  )}
                  {record.status === 'failed' && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded border border-red-500/20">
                      失败
                    </div>
                  )}

                  {/* Generating Overlay */}
                  {(record.status === 'processing' || record.status === 'running') && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10 p-4">
                      <div className="bg-black/40 px-4 py-3 rounded-xl border border-white/10 backdrop-blur-md">
                        <p className="text-white/70 text-xs font-medium text-center">内容正在生成<br/>请稍后查看</p>
                      </div>
                    </div>
                  )}

                  {/* Overlay Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end pb-2 pr-2 gap-2">
                    {record.status !== 'failed' && (
                      <button 
                        onClick={(e) => handleDownload(e, record.contentUrl)}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                        title="下载"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={(e) => handleDelete(e, record.id)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {record.status !== 'failed' && String(record.isPublish) !== '1' && (
                      <button 
                          onClick={(e) => handlePublish(e, record)}
                          className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                          title="发布到广场"
                      >
                          <Send className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* Title Overlay */}
                  <div className="absolute top-0 left-0 p-3 w-full bg-gradient-to-b from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-sm font-medium truncate">{record.prompt}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Loading More Indicator */}
            {hasMore && (
              <div ref={observerTarget} className="flex justify-center pb-8">
                {loadingMore ? (
                  <div className="flex items-center space-x-2 text-gray-500 text-sm">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    <span>加载中...</span>
                  </div>
                ) : (
                  <div className="h-8 w-full"></div> 
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
