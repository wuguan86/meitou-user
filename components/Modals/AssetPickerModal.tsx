
import React, { useState } from 'react';
import { X, Folder, Image, Music, Video, ChevronRight, Home, Search } from 'lucide-react';
import { AssetNode } from '../../types';

interface AssetPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (asset: AssetNode) => void;
  filterType: 'image' | 'audio' | 'video';
}

const mockAssets: AssetNode[] = [
  { id: 'folder-1', name: '风景', type: 'folder', createdAt: Date.now(), children: [
    { id: 'img-1-1', name: '日落海滩.png', type: 'image', url: 'https://picsum.photos/seed/sunset/400/300', createdAt: Date.now() },
    { id: 'img-1-2', name: '雪山.png', type: 'image', url: 'https://picsum.photos/seed/snow/400/300', createdAt: Date.now() },
  ]},
  { id: 'folder-2', name: '人像', type: 'folder', createdAt: Date.now(), children: [] },
  { id: 'img-1', name: '初始灵感.png', type: 'image', url: 'https://picsum.photos/seed/inspiration/400/300', createdAt: Date.now() },
  { id: 'vid-1', name: '动态背景.mp4', type: 'video', url: '#', createdAt: Date.now() },
  { id: 'aud-1', name: '背景音乐.mp3', type: 'audio', url: '#', createdAt: Date.now() },
];

const AssetPickerModal: React.FC<AssetPickerModalProps> = ({ isOpen, onClose, onSelect, filterType }) => {
  const [path, setPath] = useState<AssetNode[]>([]);
  
  if (!isOpen) return null;

  const currentNodes = path.length > 0 ? path[path.length - 1].children || [] : mockAssets;
  
  const filteredNodes = currentNodes.filter(node => node.type === 'folder' || node.type === filterType);
  
  const handleNodeClick = (node: AssetNode) => {
    if (node.type === 'folder') {
      setPath([...path, node]);
    } else {
      onSelect(node);
    }
  };

  const breadcrumbNav = (index?: number) => {
    if (index === undefined) {
      setPath([]);
    } else {
      setPath(path.slice(0, index + 1));
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
                <input type="text" placeholder="搜索资产..." className="w-full bg-white/5 rounded-lg py-2 pl-9 pr-3 text-sm outline-none focus:border-cyan-500 transition-all" />
             </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filteredNodes.map(node => (
              <div key={node.id} onClick={() => handleNodeClick(node)} className="group cursor-pointer">
                <div className="aspect-square rounded-2xl bg-[#0d1121] flex items-center justify-center mb-3 overflow-hidden border border-transparent group-hover:border-cyan-400 transition-all">
                   {node.type === 'image' && node.url ? (
                     <img src={node.url} className="w-full h-full object-cover" />
                   ) : (
                     getIcon(node.type)
                   )}
                </div>
                <p className="text-xs font-bold text-center truncate text-gray-400 group-hover:text-white">{node.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetPickerModal;
