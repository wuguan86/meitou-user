import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { UserAsset } from '../api/asset';
import { getGenerationRecords, GenerationRecord } from '../api/generation';
import { Edit, Gem, Trash2, Download, Send, Music, Video, Image as ImageIcon } from 'lucide-react';
import { message, Modal } from 'antd';

interface ProfileProps {
  user: User;
  onUpdateUser: (user: Partial<User>) => void;
  onSelectAsset: (asset: any) => void;
  onPublish: (asset: UserAsset) => void;
  onEditProfile: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser, onSelectAsset, onPublish, onEditProfile }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video'>('all'); // Removed 'audio' as it's not in generation records yet
  const [records, setRecords] = useState<GenerationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRecords();
  }, [activeTab]);

  const loadRecords = async () => {
    if (!user.id) return;
    setLoading(true);
    try {
      const typeParam = activeTab === 'all' ? undefined : activeTab;
      const data = await getGenerationRecords(1, 100, typeParam); // TODO: Implement pagination
      setRecords(data.records);
    } catch (error) {
      console.error('Failed to load records', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, recordId: number) => {
    e.stopPropagation();
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个作品吗？',
      onOk: async () => {
        // TODO: Implement delete API for generation records
        console.log('Delete record', recordId);
        message.success('删除成功');
      }
    });
  };

  const handleDownload = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    window.open(url, '_blank');
  };

  const handlePublish = (e: React.MouseEvent, record: GenerationRecord) => {
    e.stopPropagation();
    // Adapt GenerationRecord to UserAsset for onPublish if needed, or update onPublish signature
    // For now, construct a minimal UserAsset-like object
    const asset: any = {
        id: record.id,
        url: record.contentUrl,
        type: record.fileType as any,
        title: record.prompt,
        thumbnail: record.thumbnailUrl,
        generationRecordId: record.id
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

  return (
    <div className="w-full h-full flex flex-col space-y-8">
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
              <img 
                src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                alt="Avatar" 
                className="w-full h-full rounded-full bg-[#0b0d17]"
              />
            </div>
            
            <div className="flex flex-col items-center md:items-start space-y-2">
              <h2 className="text-2xl font-bold text-white">{user.name}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>ID: {user.id}</span>
                <span className="w-px h-3 bg-gray-700" />
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
                <Gem className="w-6 h-6 text-[#2cc2f5]" />
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
                ? 'bg-[#2cc2f5] text-white shadow-lg' 
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
          <span className="text-gray-500 text-sm">{records.length} 项记录</span>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {records.map((record) => (
              <div 
                key={record.id}
                className="group relative aspect-square bg-[#151929] rounded-xl overflow-hidden border border-white/5 hover:border-[#2cc2f5]/50 transition-all cursor-pointer"
                onClick={() => onSelectAsset({
                    id: record.id,
                    url: record.contentUrl,
                    type: record.fileType,
                    title: record.prompt,
                    thumbnail: record.thumbnailUrl,
                    generationParams: record.generationParams
                })}
              >
                {/* Thumbnail / Content */}
                {record.thumbnailUrl || record.contentUrl ? (
                  record.fileType === 'video' ? (
                     // If we have a thumbnail, show it, otherwise try to show video (though video in grid might be heavy)
                     // Using thumbnail if available is better.
                     record.thumbnailUrl ? (
                        <img src={record.thumbnailUrl} alt={record.prompt} className="w-full h-full object-cover" />
                     ) : (
                        <video src={record.contentUrl} className="w-full h-full object-cover" muted />
                     )
                  ) : (
                    <img src={record.thumbnailUrl || record.contentUrl} alt={record.prompt} className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {getAssetIcon(record.fileType)}
                  </div>
                )}

                {/* Status Badge */}
                {record.isPublish === '1' && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-medium rounded-full">
                    已发布
                  </div>
                )}
                {record.status === 'failed' && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded border border-red-500/20">
                    失败
                  </div>
                )}

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end pb-2 pr-2 gap-2">
                  <button 
                    onClick={(e) => handleDownload(e, record.contentUrl)}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    title="下载"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(e, record.id)}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {record.isPublish !== '1' && (
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
        )}
      </div>
    </div>
  );
};

export default Profile;
