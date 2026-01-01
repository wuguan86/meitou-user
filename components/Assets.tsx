
import React, { useState, useEffect } from 'react';
import { FolderPlus, Upload, Folder, Music, ChevronRight, Home, Trash2, Edit3, CheckSquare, Square, Video, X, Check } from 'lucide-react';
import { message, Modal } from 'antd';
import { AssetNode } from '../types';
import { getAssets, getFolders, createFolder, updateFolder, deleteFolder, uploadAsset, deleteAsset, deleteAssets, updateAsset, UserAsset, AssetFolder } from '../api/asset';

interface AssetsProps {
  onSelectAsset: (asset: AssetNode) => void;
}

const isValidFileType = (file: File) => {
  const filename = file.name.toLowerCase();
  const ext = filename.substring(filename.lastIndexOf('.') + 1);
  
  const validExtensions = [
    // Images
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico', 'tiff',
    // Videos
    'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm',
    // Audio
    'mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'
  ];
  
  return validExtensions.includes(ext);
};

const Assets: React.FC<AssetsProps> = ({ onSelectAsset }) => {
  // 获取用户ID
  const userId = parseInt(localStorage.getItem('app_user_id') || '0', 10);
  
  // 当前文件夹路径（空字符串表示根目录）
  const [currentFolderPath, setCurrentFolderPath] = useState<string>('');
  
  // 路径数组（用于面包屑导航）
  const [path, setPath] = useState<Array<{ name: string; path: string }>>([]);
  
  // 资产列表
  const [assets, setAssets] = useState<UserAsset[]>([]);
  
  // 文件夹列表（当前目录下的）
  const [folders, setFolders] = useState<AssetFolder[]>([]);
  
  // 所有文件夹列表（用于下拉选择）
  const [allFolders, setAllFolders] = useState<AssetFolder[]>([]);
  
  // 加载状态
  const [loading, setLoading] = useState(false);
  
  // 活动资产类型筛选
  const [activeAssetType, setActiveAssetType] = useState<'all' | 'image' | 'audio' | 'video'>('all');
  
  // 新建文件夹
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentPath, setNewFolderParentPath] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  
  // 编辑状态
  const [editingAssetId, setEditingAssetId] = useState<number | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  
  // 选中的资产ID
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  // 上传文件时选择文件夹
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>('');

  // 加载资产列表
  const loadAssets = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const type = activeAssetType === 'all' ? 'all' : activeAssetType;
      const folderPath = currentFolderPath || undefined;
      const data = await getAssets(userId, folderPath, type);
      setAssets(data);
    } catch (error: any) {
      console.error('加载资产列表失败：', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载当前目录下的文件夹列表
  const loadFolders = async () => {
    if (!userId) return;
    
    try {
      const parentPath = currentFolderPath || undefined;
      const data = await getFolders(userId, parentPath);
      setFolders(data);
    } catch (error: any) {
      console.error('加载文件夹列表失败：', error);
    }
  };

  // 加载所有文件夹（用于下拉选择）
  const loadAllFolders = async () => {
    if (!userId) return;
    
    try {
      const data = await getFolders(userId, undefined, true);
      setAllFolders(data);
    } catch (error: any) {
      console.error('加载所有文件夹失败：', error);
    }
  };

  // 拖拽状态
  const [draggedAssetId, setDraggedAssetId] = useState<number | null>(null);

  // 拖拽开始
  const handleDragStart = (e: React.DragEvent, assetId: number) => {
    e.dataTransfer.setData('text/plain', assetId.toString());
    e.dataTransfer.effectAllowed = 'move';
    setDraggedAssetId(assetId);
  };

  // 拖拽经过
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 如果是文件拖拽，显示 copy
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
    } else {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  // 统一上传逻辑
  const processUpload = async (files: File[], targetFolderPath?: string) => {
    if (!userId) return;
    setLoading(true);
    try {
      const folderPath = targetFolderPath || undefined;
      let successCount = 0;
      let failCount = 0;
      
      for (const file of files) {
        // 校验文件类型
        if (!isValidFileType(file)) {
          message.error(`文件 ${file.name} 类型不支持，仅支持图片、视频、音频`);
          failCount++;
          continue;
        }

        try {
          await uploadAsset(
            file,
            userId,
            undefined, // 使用默认标题（文件名）
            undefined, // 自动判断类型
            'life', // 默认分类
            folderPath
          );
          successCount++;
        } catch (err) {
          console.error(`上传文件 ${file.name} 失败:`, err);
          message.error(`上传文件 ${file.name} 失败`);
          failCount++;
        }
      }
      
      if (successCount > 0) {
        message.success(`成功上传 ${successCount} 个文件` + (failCount > 0 ? `，${failCount} 个失败` : ''));
        // 重新加载列表
        await loadAssets();
      }
      
      // 关闭选择器（如果是从选择器触发的）
      setShowFolderSelector(false);
      setPendingFiles([]);
      setSelectedFolderPath('');
    } catch (error: any) {
      console.error('上传过程出错：', error);
      message.error('上传出错：' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  // 拖拽放下
  const handleDrop = async (e: React.DragEvent, targetFolder: AssetFolder) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. 处理文件上传（从外部拖入文件）
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files: File[] = Array.from(e.dataTransfer.files);
      await processUpload(files, targetFolder.folderPath);
      return;
    }

    // 2. 处理应用内资产移动
    const assetIdStr = e.dataTransfer.getData('text/plain');
    if (!assetIdStr) return;

    const assetId = parseInt(assetIdStr, 10);
    if (isNaN(assetId)) return;

    // 检查是否拖拽的是文件夹（暂不支持文件夹拖拽）
    if (assetIdStr.startsWith('folder')) return;
    
    // 检查目标文件夹是否是当前所在的文件夹
    if (targetFolder.folderPath === currentFolderPath) return;

    setDraggedAssetId(null);

    try {
      await updateAsset(userId, assetId, undefined, targetFolder.folderPath);
      message.success(`已移动到 ${targetFolder.name}`);
      // 刷新列表
      loadAssets();
      loadFolders();
    } catch (error: any) {
      console.error('移动资产失败：', error);
      message.error('移动失败：' + (error.message || '未知错误'));
    }
  };

  // 容器拖拽经过（支持拖拽到空白处）
  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 只有文件才允许在容器释放（上传到当前目录）
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  // 容器拖拽放下（上传到当前目录）
  const handleContainerDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 如果是文件拖拽，上传到当前目录
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files: File[] = Array.from(e.dataTransfer.files);
      await processUpload(files, currentFolderPath || undefined);
    }
  };

  // 初始加载
  useEffect(() => {
    loadAssets();
    loadFolders();
    loadAllFolders(); // 加载所有文件夹用于选择

    // 防止浏览器默认打开文件
    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
    };
    
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);
    
    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, [userId, currentFolderPath, activeAssetType]);

  // 将UserAsset转换为AssetNode
  const assetToNode = (asset: UserAsset): AssetNode => {
    return {
      id: asset.id.toString(),
      name: asset.title,
      type: asset.type as 'image' | 'video' | 'audio',
      url: asset.url,
      createdAt: new Date(asset.uploadDate).getTime(),
      thumbnail: asset.thumbnail,
    };
  };

  // 将AssetFolder转换为AssetNode
  const folderToNode = (folder: AssetFolder): AssetNode => {
    return {
      id: `folder-${folder.id}`,
      name: folder.name,
      type: 'folder',
      createdAt: new Date(folder.createdAt).getTime(),
      thumbnail: folder.thumbnail,
    };
  };

  // 合并资产和文件夹
  const nodes: AssetNode[] = [
    ...folders.map(folderToNode),
    ...assets.map(assetToNode),
  ];

  // 筛选节点（根据类型）
  const filteredNodes = nodes.filter(node => {
    if (activeAssetType === 'all') return true;
    if (node.type === 'folder') return true;
    return node.type === activeAssetType;
  });

  // 进入文件夹
  const enterFolder = (folder: AssetFolder) => {
    setCurrentFolderPath(folder.folderPath);
    setPath([...path, { name: folder.name, path: folder.folderPath }]);
  };

  // 返回上级目录
  const goToPath = (index: number) => {
    if (index < 0) {
      // 返回根目录
      setCurrentFolderPath('');
      setPath([]);
    } else {
      // 返回到指定路径
      const newPath = path.slice(0, index + 1);
      const targetPath = newPath[newPath.length - 1].path;
      setCurrentFolderPath(targetPath);
      setPath(newPath);
    }
  };

  // 打开新建文件夹对话框
  const handleOpenAddFolder = () => {
    setNewFolderParentPath(currentFolderPath); // 默认使用当前文件夹路径
    setIsAddingFolder(true);
  };

  // 创建文件夹
  const handleCreateFolder = async () => {
    if (!userId) {
      message.warning('请先登录');
      return;
    }
    if (!newFolderName.trim()) {
      message.warning('请输入文件夹名称');
      return;
    }

    setIsCreating(true);
    try {
      const parentPath = newFolderParentPath.trim() || undefined;
      await createFolder(userId, newFolderName.trim(), parentPath);
      message.success('创建文件夹成功');
      await loadFolders();
      await loadAllFolders(); // 重新加载所有文件夹
      setNewFolderName('');
      setNewFolderParentPath('');
      setIsAddingFolder(false);
    } catch (error: any) {
      console.error('创建文件夹失败：', error);
      message.error('创建文件夹失败：' + (error.message || '未知错误'));
    } finally {
      setIsCreating(false);
    }
  };

  // 选择文件并显示文件夹选择器
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setPendingFiles(Array.from(files));
    setShowFolderSelector(true);
    setSelectedFolderPath(currentFolderPath);
  };

  // 确认上传（在选择文件夹后）
  const handleConfirmUpload = async () => {
    if (pendingFiles.length === 0) return;
    await processUpload(pendingFiles, selectedFolderPath.trim() || undefined);
  };

  // 取消上传
  const handleCancelUpload = () => {
    setShowFolderSelector(false);
    setPendingFiles([]);
    setSelectedFolderPath('');
  };

  // 删除资产
  const handleDeleteAsset = async (id: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确认删除此资产吗？',
      onOk: async () => {
        if (!userId) return;
        try {
          await deleteAsset(userId, id);
          await loadAssets();
          setSelectedIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          message.success('删除成功');
        } catch (error: any) {
          console.error('删除失败：', error);
          message.error('删除失败：' + (error.message || '未知错误'));
        }
      }
    });
  };

  // 删除文件夹
  const handleDeleteFolder = async (folderId: number) => {
    Modal.confirm({
      title: '确认删除',
      content: '确认删除此文件夹吗？（文件夹内的资产不会被删除，但需要手动移动）',
      onOk: async () => {
        if (!userId) return;
        try {
          await deleteFolder(userId, folderId);
          await loadFolders();
          await loadAllFolders(); // 重新加载所有文件夹
          message.success('删除成功');
        } catch (error: any) {
          console.error('删除文件夹失败：', error);
          message.error('删除失败：' + (error.message || '未知错误'));
        }
      }
    });
  };

  // 批量删除资产
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || !userId) return;
    
    Modal.confirm({
      title: '确认删除',
      content: `确认删除选中的 ${selectedIds.size} 项资产吗？`,
      onOk: async () => {
        try {
          await deleteAssets(userId, Array.from(selectedIds));
          await loadAssets();
          setSelectedIds(new Set());
          message.success('批量删除成功');
        } catch (error: any) {
          console.error('批量删除失败：', error);
          message.error('批量删除失败：' + (error.message || '未知错误'));
        }
      }
    });
  };

  // 开始重命名资产
  const startRenameAsset = (asset: UserAsset) => {
    setEditingAssetId(asset.id);
    setEditName(asset.title);
  };

  // 开始重命名文件夹
  const startRenameFolder = (folder: AssetFolder) => {
    setEditingFolderId(folder.id);
    setEditName(folder.name);
  };

  // 保存重命名资产
  const saveRenameAsset = async () => {
    if (!editName.trim() || editingAssetId === null || !userId) {
      setEditingAssetId(null);
      return;
    }

    try {
      await updateAsset(userId, editingAssetId, editName, undefined);
      await loadAssets();
      setEditingAssetId(null);
    } catch (error: any) {
      console.error('重命名失败：', error);
      message.error('重命名失败：' + (error.message || '未知错误'));
    }
  };

  // 保存重命名文件夹
  const saveRenameFolder = async () => {
    
    if (!editName.trim()) {
      message.warning('文件夹名称不能为空');
      return;
    }
    
    if (editingFolderId === null || !userId) {
      setEditingFolderId(null);
      return;
    }

    try {
      await updateFolder(userId, editingFolderId, editName.trim());
      await loadFolders();
      await loadAllFolders(); // 重新加载所有文件夹
      setEditingFolderId(null);
      message.success('重命名成功');
    } catch (error: any) {
      console.error('重命名文件夹失败：', error);
      message.error('重命名失败：' + (error.message || '未知错误'));
    }
  };

  // 切换选中状态
  const toggleSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    const assetIds = assets.map(a => a.id);
    if (selectedIds.size === assetIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(assetIds));
    }
  };

  if (!userId) {
    return (
      <div className="flex items-center justify-center py-40">
        <p className="text-gray-500">请先登录</p>
      </div>
    );
  }

  // 查找文件夹对象
  const findFolderById = (id: string): AssetFolder | undefined => {
    const folderId = parseInt(id.replace('folder-', ''), 10);
    return folders.find(f => f.id === folderId);
  };

  // 查找资产对象
  const findAssetById = (id: string): UserAsset | undefined => {
    const assetId = parseInt(id, 10);
    return assets.find(a => a.id === assetId);
  };

  // 获取文件夹选项（用于下拉选择，排除自己）
  const getFolderOptions = (excludePath?: string) => {
    return allFolders.filter(f => f.folderPath !== excludePath);
  };

  return (
    <div 
      className="space-y-8 pb-20 animate-in fade-in duration-500 min-h-[calc(100vh-100px)]"
      onDragOver={handleContainerDragOver}
      onDrop={handleContainerDrop}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black mb-3">我的资产库</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500 font-bold">
            <button 
              onClick={() => goToPath(-1)} 
              className="flex items-center transition-all px-2 py-1 rounded-lg hover:text-cyan-400"
            >
              <Home className="w-3.5 h-3.5 mr-1.5" />
              根目录
            </button>
            {path.map((p, i) => (
              <React.Fragment key={i}>
                <ChevronRight className="w-3.5 h-3.5 opacity-30" />
                <button 
                  onClick={() => goToPath(i)}
                  className="px-2 py-1 rounded-lg transition-all hover:text-cyan-400"
                >
                  {p.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {selectedIds.size > 0 && (
            <button 
              onClick={handleBulkDelete}
              className="flex items-center space-x-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span className="uppercase tracking-widest">批量删除 ({selectedIds.size})</span>
            </button>
          )}
          <button 
            onClick={handleOpenAddFolder}
            className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-xl text-xs font-black transition-all border border-white/5 uppercase tracking-widest"
          >
            <FolderPlus className="w-4 h-4" />
            <span>新建文件夹</span>
          </button>
          <label className="flex items-center space-x-2 brand-gradient px-5 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all hover:scale-105 shadow-lg glow-cyan uppercase tracking-[0.1em]">
            <Upload className="w-4 h-4" />
            <span>{loading ? '上传中...' : '上传资产'}</span>
            <input 
              type="file" 
              className="hidden" 
              accept="image/*,audio/*,video/*" 
              multiple 
              onChange={handleFileSelect}
              disabled={loading}
            />
          </label>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 border border-white/10 rounded-full p-1 bg-white/5 w-fit">
          <button onClick={() => setActiveAssetType('all')} className={`px-4 py-1.5 text-xs font-bold rounded-full ${activeAssetType === 'all' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>全部</button>
          <button onClick={() => setActiveAssetType('image')} className={`px-4 py-1.5 text-xs font-bold rounded-full ${activeAssetType === 'image' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>图片</button>
          <button onClick={() => setActiveAssetType('video')} className={`px-4 py-1.5 text-xs font-bold rounded-full ${activeAssetType === 'video' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>视频</button>
          <button onClick={() => setActiveAssetType('audio')} className={`px-4 py-1.5 text-xs font-bold rounded-full ${activeAssetType === 'audio' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>音频</button>
        </div>
      </div>

      {/* 文件夹选择器弹窗（上传资产时） */}
      {showFolderSelector && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#0d1121] border border-cyan-500/30 rounded-[2.5rem] p-8 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-black mb-4">选择上传文件夹</h3>
            <p className="text-sm text-gray-400 mb-4">共 {pendingFiles.length} 个文件待上传</p>
            
            <div className="mb-6">
              <label className="block text-sm font-bold mb-2">目标文件夹</label>
              <select
                value={selectedFolderPath}
                onChange={(e) => setSelectedFolderPath(e.target.value)}
                className="w-full bg-[#060813] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50"
              >
                <option value="">根目录</option>
                {allFolders.map(folder => (
                  <option key={folder.id} value={folder.folderPath}>
                    {folder.folderPath}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-4">
              <button 
                onClick={handleCancelUpload}
                className="flex-1 bg-white/5 hover:bg-white/10 px-5 py-3 rounded-xl text-xs font-black transition-all border border-white/5 uppercase tracking-widest"
              >
                取消
              </button>
              <button 
                onClick={handleConfirmUpload}
                disabled={loading}
                className="flex-1 brand-gradient px-5 py-3 rounded-xl text-xs font-black transition-all hover:scale-105 shadow-lg glow-cyan uppercase tracking-[0.1em] disabled:opacity-50"
              >
                {loading ? '上传中...' : '确认上传'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新建文件夹对话框 */}
      {isAddingFolder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#0d1121] border border-cyan-500/30 rounded-[2.5rem] p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black">新建文件夹</h3>
              <button 
                onClick={() => { setIsAddingFolder(false); setNewFolderName(''); setNewFolderParentPath(''); }}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">文件夹名称</label>
                <input 
                  autoFocus
                  type="text" 
                  placeholder="输入文件夹名称..." 
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  className="w-full bg-[#060813] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50 placeholder:text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">父文件夹（可选）</label>
                <select
                  value={newFolderParentPath}
                  onChange={(e) => setNewFolderParentPath(e.target.value)}
                  className="w-full bg-[#060813] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/50"
                >
                  <option value="">根目录</option>
                  {allFolders.map(folder => (
                    <option key={folder.id} value={folder.folderPath}>
                      {folder.folderPath}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">留空则在根目录创建，或选择已有文件夹作为父文件夹</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 mt-6">
              <button 
                onClick={() => { setIsAddingFolder(false); setNewFolderName(''); setNewFolderParentPath(''); }}
                disabled={isCreating}
                className="flex-1 bg-white/5 hover:bg-white/10 px-5 py-3 rounded-xl text-xs font-black transition-all border border-white/5 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
              >
                取消
              </button>
              <button 
                onClick={handleCreateFolder}
                disabled={isCreating}
                className={`flex-1 brand-gradient px-5 py-3 rounded-xl text-xs font-black transition-all hover:scale-105 shadow-lg glow-cyan uppercase tracking-[0.1em] ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isCreating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && filteredNodes.length === 0 && !isAddingFolder && (
        <div className="flex items-center justify-center py-40">
          <p className="text-gray-500">加载中...</p>
        </div>
      )}

      {!loading && filteredNodes.length > 0 && (
        <div className="flex items-center px-4 py-2 border-b border-white/5 mb-4">
          <button onClick={toggleSelectAll} className="p-2 mr-2">
            {selectedIds.size === assets.length && assets.length > 0 ? 
              <CheckSquare className="w-4 h-4 text-cyan-400" /> : 
              <Square className="w-4 h-4 text-gray-600" />
            }
          </button>
          <span className="text-xs font-bold text-gray-500 uppercase">
            {selectedIds.size > 0 ? `${selectedIds.size}项已选择` : '名称'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
        {filteredNodes.map((node) => {
          const isFolder = node.type === 'folder';
          const folder = isFolder ? findFolderById(node.id) : undefined;
          const asset = !isFolder ? findAssetById(node.id) : undefined;
          const nodeId = !isFolder ? parseInt(node.id, 10) : null;
          const folderId = isFolder && folder ? folder.id : null;
          const isSelected = nodeId !== null && selectedIds.has(nodeId);
          const isEditingAsset = editingAssetId === nodeId;
          const isEditingFolder = isFolder && folderId !== null && editingFolderId === folderId;
          
          return (
            <div 
              key={node.id}
              draggable={!isFolder}
              onDragStart={(e) => !isFolder && nodeId && handleDragStart(e, nodeId)}
              onDragOver={(e) => isFolder && handleDragOver(e)}
              onDrop={(e) => isFolder && folder && handleDrop(e, folder)}
              className={`group relative bg-[#0d1121] border transition-all duration-300 cursor-pointer shadow-xl rounded-[2.5rem] p-5 ${
                isSelected ? 'border-cyan-500 bg-cyan-500/5' : 
                'border-white/5 hover:border-white/20'
              } ${isFolder ? 'hover:bg-white/5' : ''}`}
              onClick={() => {
                if (isFolder && folder) {
                  enterFolder(folder);
                } else if (asset) {
                  onSelectAsset(node);
                }
              }}
            >
              {!isFolder && nodeId !== null && (
                <button 
                  onClick={(e) => toggleSelect(nodeId, e)} 
                  className={`absolute top-5 left-5 z-10 p-1.5 transition-all rounded-lg ${
                    isSelected ? 'bg-cyan-500 text-white opacity-100' : 
                    'bg-black/40 text-white/40 opacity-0 group-hover:opacity-100 hover:bg-black/60'
                  }`}
                >
                  {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>
              )}

              <div className="aspect-square rounded-[2rem] bg-[#060813] flex items-center justify-center mb-5 overflow-hidden group-hover:scale-[1.02] transition-transform relative">
                {isFolder ? (
                  node.thumbnail ? (
                    <div className="relative w-full h-full">
                        <img 
                          src={node.thumbnail} 
                          className="w-full h-full object-cover opacity-50 blur-[1px] group-hover:blur-0 group-hover:opacity-80 transition-all duration-300" 
                          alt={node.name} 
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Folder className="w-10 h-10 text-white drop-shadow-lg" />
                        </div>
                    </div>
                  ) : (
                    <Folder className="w-16 h-16 text-gray-800 group-hover:text-cyan-500/40 transition-colors" />
                  )
                ) : node.type === 'image' ? (
                  <img 
                    src={node.url} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    alt={node.name} 
                  />
                ) : node.type === 'video' ? (
                  <Video className="w-16 h-16 text-rose-500/20 group-hover:text-rose-500/40" />
                ) : (
                  <Music className="w-16 h-16 text-pink-500/20 group-hover:text-pink-500/40" />
                )}
              </div>

              <div className="flex flex-col px-1 space-y-2">
                {(isEditingAsset && !isFolder) || (isEditingFolder && isFolder) ? (
                  <div onClick={e => e.stopPropagation()} className="relative z-20 flex items-center gap-1">
                    <input 
                      autoFocus 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { 
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          if (isFolder) {
                             saveRenameFolder();
                          } else {
                             saveRenameAsset();
                          }
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingAssetId(null);
                          setEditingFolderId(null);
                        }
                      }} 
                      onClick={e => e.stopPropagation()}
                      className="flex-1 bg-white/10 border border-cyan-500/50 rounded-lg px-2 py-1.5 text-xs outline-none font-bold min-w-0"
                    />
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isFolder) {
                          saveRenameFolder();
                        } else {
                          saveRenameAsset();
                        }
                      }}
                      className="p-1.5 bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-400 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                      title="保存"
                    >
                      <Check size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black truncate flex-1 mr-2 text-gray-300 group-hover:text-white transition-colors">
                      {node.name || (folder ? folder.name : '未命名文件夹')}
                    </span>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      {isFolder && folder ? (
                        <>
                          <button onClick={() => startRenameFolder(folder)} className="p-1.5 hover:text-cyan-400 transition-colors" title="重命名">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteFolder(folder.id)} className="p-1.5 hover:text-red-500 transition-colors" title="删除">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : asset ? (
                        <>
                          <button onClick={() => startRenameAsset(asset)} className="p-1.5 hover:text-cyan-400 transition-colors" title="重命名">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteAsset(asset.id)} className="p-1.5 hover:text-red-500 transition-colors" title="删除">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                )}
                <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">
                  {isFolder ? 'FOLDER' : new Date(node.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && filteredNodes.length === 0 && !isAddingFolder && (
        <div className="flex flex-col items-center justify-center py-40 bg-white/[0.01] border-2 border-dashed border-white/5 rounded-[4rem]">
          <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mb-8">
            <Folder className="w-16 h-16 text-gray-800" />
          </div>
          <p className="font-black text-2xl uppercase tracking-[0.2em] text-gray-800">此目录为空</p>
          <button onClick={handleOpenAddFolder} className="mt-6 text-cyan-500/60 font-black text-xs hover:text-cyan-400 uppercase tracking-widest">
            立即创建首个文件夹
          </button>
        </div>
      )}
    </div>
  );
};

export default Assets;