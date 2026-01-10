
import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { X, Folder, Image, Music, Video, ChevronRight, Home, Search } from 'lucide-react';
import { AssetNode } from '../../types';
import * as assetAPI from '../../api/asset';

interface AssetPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (asset: AssetNode) => void;
  filterType: 'image' | 'audio' | 'video';
}

const AssetPickerModal: React.FC<AssetPickerModalProps> = ({ isOpen, onClose, onSelect, filterType }) => {
  // 获取用户ID
  const userId = parseInt(localStorage.getItem('app_user_id') || '0', 10);
  
  // 当前文件夹路径（空字符串表示根目录）
  const [currentFolderPath, setCurrentFolderPath] = useState<string>('');
  
  // 路径数组（用于面包屑导航）
  const [path, setPath] = useState<Array<{ name: string; path: string }>>([]);
  
  // 资产列表
  const [assets, setAssets] = useState<assetAPI.UserAsset[]>([]);
  
  // 文件夹列表（当前目录下的）
  const [folders, setFolders] = useState<assetAPI.AssetFolder[]>([]);
  
  // 加载状态
  const [loading, setLoading] = useState(false);
  
  // 搜索关键词
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // 加载资产和文件夹数据
  const loadData = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      
      // 根据filterType确定要获取的资产类型
      const assetType = filterType === 'image' ? 'image' : filterType === 'video' ? 'video' : filterType === 'audio' ? 'audio' : 'all';
      
      // 对于资产：使用currentFolderPath作为folder参数（匹配资产的folder字段）
      // 对于文件夹：使用currentFolderPath作为parentPath参数（匹配文件夹的parentPath字段）
      const [assetsData, foldersData] = await Promise.all([
        assetAPI.getAssets(userId, currentFolderPath || undefined, assetType),
        assetAPI.getFolders(userId, currentFolderPath || undefined, false)
      ]);
      
      setAssets(assetsData);
      setFolders(foldersData);
    } catch (error: any) {
      console.error('加载资产数据失败:', error);
      message.error('加载资产数据失败：' + (error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };
  
  // 当模态框打开或文件夹路径改变时，重新加载数据
  useEffect(() => {
    if (isOpen && userId) {
      loadData();
    }
  }, [isOpen, currentFolderPath, userId, filterType]);
  
  if (!isOpen) return null;

  // 将后端数据转换为AssetNode格式
  const convertToAssetNodes = (): AssetNode[] => {
    const nodes: AssetNode[] = [];
    
    // 添加文件夹
    folders.forEach(folder => {
      nodes.push({
        id: `folder-${folder.id}`,
        name: folder.name,
        type: 'folder',
        createdAt: new Date(folder.createdAt).getTime(),
        children: [], // 子节点会在进入文件夹时加载
        thumbnail: folder.thumbnail // 添加 thumbnail
      });
    });
    
    // 添加资产
    assets.forEach(asset => {
      // 根据搜索关键词过滤
      if (searchKeyword && !asset.title.toLowerCase().includes(searchKeyword.toLowerCase())) {
        return;
      }
      
      nodes.push({
        id: `asset-${asset.id}`,
        name: asset.title,
        type: asset.type as 'image' | 'video' | 'audio',
        url: asset.url,
        createdAt: new Date(asset.createdAt).getTime()
      });
    });
    
    return nodes;
  };
  
  const currentNodes = convertToAssetNodes();
  
  // 过滤节点（根据filterType）
  const filteredNodes = currentNodes.filter(node => {
    if (node.type === 'folder') return true; // 文件夹始终显示
    return node.type === filterType;
  });
  
  const handleNodeClick = (node: AssetNode) => {
    if (node.type === 'folder') {
      // 进入文件夹：找到对应的文件夹对象
      const folderId = node.id.replace('folder-', '');
      const folder = folders.find(f => f.id.toString() === folderId);
      if (folder) {
        // 更新路径（使用folderPath作为路径标识）
        setPath([...path, { name: folder.name, path: folder.folderPath }]);
        // 更新当前文件夹路径（用于查询该文件夹下的资产和子文件夹）
        // 对于资产查询：使用folderPath作为folder参数
        // 对于文件夹查询：使用folderPath作为parentPath参数
        setCurrentFolderPath(folder.folderPath);
      }
    } else {
      // 选择资产
      onSelect(node);
    }
  };

  const breadcrumbNav = (index?: number) => {
    if (index === undefined) {
      // 返回根目录
      setPath([]);
      setCurrentFolderPath('');
    } else {
      // 返回到指定路径
      const targetPath = path[index];
      setPath(path.slice(0, index + 1));
      setCurrentFolderPath(targetPath.path);
    }
  };

  const getIcon = (type: AssetNode['type']) => {
    switch(type) {
      case 'folder': return <Folder className="w-12 h-12 text-cyan-500/30" />;
      case 'image': return <Image className="w-12 h-12 text-gray-700" />;
      case 'video': return <Video className="w-12 h-12 text-gray-700" />;
      case 'audio': return <Music className="w-12 h-12 text-gray-700" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in" onClick={onClose}>
      <div className="bg-[#151929] w-full max-w-4xl h-[80vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
          <h3 className="text-xl font-bold text-white">从资产库选择</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 flex items-center justify-between border-b border-white/5 shrink-0">
            <div className="flex items-center space-x-2 text-sm text-gray-400 font-bold">
                 <button onClick={() => breadcrumbNav()} className="flex items-center hover:text-white"><Home className="w-4 h-4 mr-2" />根目录</button>
                 {path.map((p, i) => (
                    <React.Fragment key={p.id}>
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                        <button onClick={() => breadcrumbNav(i)} className="hover:text-white">{p.name}</button>
                    </React.Fragment>
                 ))}
            </div>
             <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="搜索资产..." 
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full bg-white/5 rounded-lg py-2 pl-9 pr-3 text-sm outline-none focus:border-cyan-500 transition-all text-white" 
                />
             </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">加载中...</p>
            </div>
          ) : filteredNodes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">暂无资产</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {filteredNodes.map(node => (
                <div key={node.id} onClick={() => handleNodeClick(node)} className="group cursor-pointer">
                  <div className="aspect-square rounded-2xl bg-[#0d1121] flex items-center justify-center mb-3 overflow-hidden border border-transparent group-hover:border-cyan-400 transition-all">
                     {(node.type === 'image' && node.url) || (node.type === 'folder' && node.thumbnail) ? (
                       <img src={node.type === 'image' ? node.url : node.thumbnail} alt={node.name} className="w-full h-full object-cover" />
                     ) : (
                       getIcon(node.type)
                     )}
                  </div>
                  <p className="text-xs font-bold text-center truncate text-gray-400 group-hover:text-white">{node.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetPickerModal;
