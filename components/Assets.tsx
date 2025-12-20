
import React, { useState } from 'react';
import { FolderPlus, Upload, Folder, Image, Music, MoreVertical, ChevronRight, Home, Trash2, Edit3, X, Check, CheckSquare, Square, FileText, Video } from 'lucide-react';
import { AssetNode } from '../types';

interface AssetsProps {
  onSelectAsset: (asset: AssetNode) => void;
}

const Assets: React.FC<AssetsProps> = ({ onSelectAsset }) => {
  const [nodes, setNodes] = useState<AssetNode[]>([
    { id: '1', name: '风景素材', type: 'folder', createdAt: Date.now(), children: [
        { id: '1-1', name: '自然风光', type: 'folder', createdAt: Date.now(), children: [] }
    ]},
    { id: '2', name: '人物肖像', type: 'folder', createdAt: Date.now(), children: [] },
    { id: '3', name: '示例背景.png', type: 'image', createdAt: Date.now(), url: 'https://picsum.photos/seed/a1/400/300', prompt: 'A beautiful landscape.' },
    { id: '4', name: '主题曲.mp3', type: 'audio', createdAt: Date.now(), url: '#' },
    { id: '5', name: '宣传片.mp4', type: 'video', createdAt: Date.now(), url: '#' },
  ]);

  const [path, setPath] = useState<AssetNode[]>([]);
  const [activeAssetType, setActiveAssetType] = useState<'all' | 'image' | 'audio' | 'video'>('all');
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const currentNodes = path.length > 0 ? path[path.length - 1].children || [] : nodes;

  const filteredNodes = currentNodes.filter(node => {
    if (activeAssetType === 'all') return true;
    if (node.type === 'folder') return true;
    return node.type === activeAssetType;
  });

  const findAndReplace = (rootNodes: AssetNode[], id: string, newProps: Partial<AssetNode>): AssetNode[] => {
    return rootNodes.map(node => {
      if (node.id === id) return { ...node, ...newProps };
      if (node.children) return { ...node, children: findAndReplace(node.children, id, newProps) };
      return node;
    });
  };

  const deleteFromTree = (rootNodes: AssetNode[], idsToDelete: Set<string>): AssetNode[] => {
    return rootNodes.filter(node => !idsToDelete.has(node.id)).map(node => {
      if (node.children) return { ...node, children: deleteFromTree(node.children, idsToDelete) };
      return node;
    });
  };

  const moveNode = (rootNodes: AssetNode[], nodeId: string, targetFolderId: string | null): AssetNode[] => {
    if (nodeId === targetFolderId) return rootNodes;

    let nodeToMove: AssetNode | null = null;
    const findNode = (nodes: AssetNode[]) => {
      for (const n of nodes) {
        if (n.id === nodeId) { nodeToMove = n; return; }
        if (n.children) findNode(n.children);
      }
    };
    findNode(rootNodes);
    if (!nodeToMove) return rootNodes;

    const cleanedTree = deleteFromTree(rootNodes, new Set([nodeId]));

    if (targetFolderId === null) {
      return [...cleanedTree, nodeToMove];
    }

    const addToTarget = (nodes: AssetNode[]): AssetNode[] => {
      return nodes.map(n => {
        if (n.id === targetFolderId) return { ...n, children: [...(n.children || []), nodeToMove!] };
        if (n.children) return { ...n, children: addToTarget(n.children) };
        return n;
      });
    };
    return addToTarget(cleanedTree);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newNode: AssetNode = {
      id: Math.random().toString(36).substr(2, 9),
      name: newFolderName,
      type: 'folder',
      createdAt: Date.now(),
      children: []
    };
    if (path.length === 0) setNodes([...nodes, newNode]);
    else setNodes(findAndReplace(nodes, path[path.length - 1].id, { children: [...currentNodes, newNode] }));
    setNewFolderName('');
    setIsAddingFolder(false);
  };

  const handleDelete = (id: string) => {
    setNodes(deleteFromTree(nodes, new Set([id])));
    setSelectedIds(prev => { prev.delete(id); return new Set(prev); });
  };

  const handleBulkDelete = () => {
    if (confirm(`确认删除选中的 ${selectedIds.size} 项资产吗？`)) {
      setNodes(deleteFromTree(nodes, selectedIds));
      setSelectedIds(new Set());
    }
  };

  const startRename = (node: AssetNode) => {
    setEditingId(node.id);
    setEditName(node.name);
  };
  
  const saveRename = () => {
    if (!editName.trim() || !editingId) {
      setEditingId(null);
      return;
    }
    
    const updateNodeInTree = (nodes: AssetNode[]): AssetNode[] => {
      return nodes.map(node => {
        if (node.id === editingId) {
          return { ...node, name: editName };
        }
        if (node.children) {
          return { ...node, children: updateNodeInTree(node.children) };
        }
        return node;
      });
    };
    
    setNodes(updateNodeInTree(nodes));
    setPath(path.map(p => p.id === editingId ? { ...p, name: editName } : p));
    setEditingId(null);
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredNodes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNodes.map(n => n.id)));
    }
  };


  const onDragStart = (id: string) => setDraggedNodeId(id);
  const onDragOver = (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    if (draggedNodeId !== targetId) setDropTargetId(targetId);
  };
  const onDragLeave = () => setDropTargetId(null);
  const onDrop = (targetId: string | null) => {
    if (draggedNodeId && draggedNodeId !== targetId) {
      setNodes(moveNode(nodes, draggedNodeId, targetId));
    }
    setDraggedNodeId(null);
    setDropTargetId(null);
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black mb-3">我的资产库</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500 font-bold">
            <button 
              onClick={() => setPath([])} 
              onDragOver={(e) => onDragOver(e, null)}
              onDragLeave={onDragLeave}
              onDrop={() => onDrop(null)}
              className={`flex items-center transition-all px-2 py-1 rounded-lg ${dropTargetId === null && draggedNodeId ? 'bg-cyan-500/20 text-cyan-400' : 'hover:text-cyan-400'}`}
            >
              <Home className="w-3.5 h-3.5 mr-1.5" />
              根目录
            </button>
            {path.map((p, i) => (
              <React.Fragment key={p.id}>
                <ChevronRight className="w-3.5 h-3.5 opacity-30" />
                <button 
                  onClick={() => setPath(path.slice(0, i + 1))}
                  onDragOver={(e) => onDragOver(e, p.id)}
                  onDragLeave={onDragLeave}
                  onDrop={() => onDrop(p.id)}
                  className={`px-2 py-1 rounded-lg transition-all ${dropTargetId === p.id ? 'bg-cyan-500/20 text-cyan-400' : 'hover:text-cyan-400'}`}
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
            onClick={() => setIsAddingFolder(true)}
            className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-xl text-xs font-black transition-all border border-white/5 uppercase tracking-widest"
          >
            <FolderPlus className="w-4 h-4" />
            <span>新建文件夹</span>
          </button>
          <label className="flex items-center space-x-2 brand-gradient px-5 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all hover:scale-105 shadow-lg glow-cyan uppercase tracking-[0.1em]">
            <Upload className="w-4 h-4" />
            <span>上传资产</span>
            <input type="file" className="hidden" accept="image/*,audio/*,video/*" multiple />
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

      {isAddingFolder && (
        <div className="flex items-center space-x-4 bg-[#0d1121] p-8 rounded-[2.5rem] border border-cyan-500/30 animate-in slide-in-from-top-4 duration-300 shadow-2xl">
          <Folder className="w-8 h-8 text-cyan-400 opacity-50" />
          <input 
            autoFocus type="text" placeholder="为新文件夹命名..." value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            className="flex-1 bg-transparent border-none outline-none text-white font-black text-lg placeholder:text-gray-700"
          />
          <div className="flex items-center space-x-3">
            <button onClick={() => setIsAddingFolder(false)} className="text-gray-500 font-bold hover:text-white transition-colors uppercase text-[10px] tracking-widest">取消</button>
            <button onClick={handleCreateFolder} className="brand-gradient px-10 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg">创建目录</button>
          </div>
        </div>
      )}

      {filteredNodes.length > 0 && (
         <div className="flex items-center px-4 py-2 border-b border-white/5 mb-4">
          <button onClick={toggleSelectAll} className="p-2 mr-2">
            {selectedIds.size === filteredNodes.length ? <CheckSquare className="w-4 h-4 text-cyan-400" /> : <Square className="w-4 h-4 text-gray-600" />}
          </button>
          <span className="text-xs font-bold text-gray-500 uppercase">{selectedIds.size > 0 ? `${selectedIds.size}项已选择` : '名称'}</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
        {filteredNodes.map((node) => (
          <div 
            key={node.id} draggable onDragStart={() => onDragStart(node.id)}
            onDragOver={(e) => node.type === 'folder' && onDragOver(e, node.id)}
            onDragLeave={onDragLeave} onDrop={() => node.type === 'folder' && onDrop(node.id)}
            className={`group relative bg-[#0d1121] border transition-all duration-300 cursor-pointer shadow-xl rounded-[2.5rem] p-5 ${
              selectedIds.has(node.id) ? 'border-cyan-500 bg-cyan-500/5' : 
              dropTargetId === node.id ? 'border-cyan-400 bg-cyan-400/10 scale-105' : 'border-white/5 hover:border-white/20'
            }`}
            onClick={() => node.type === 'folder' ? setPath([...path, node]) : onSelectAsset(node)}
          >
            <button onClick={(e) => toggleSelect(node.id, e)} className={`absolute top-5 left-5 z-10 p-1.5 transition-all rounded-lg ${selectedIds.has(node.id) ? 'bg-cyan-500 text-white opacity-100' : 'bg-black/40 text-white/40 opacity-0 group-hover:opacity-100 hover:bg-black/60'}`}>
              {selectedIds.has(node.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            </button>

            <div className="aspect-square rounded-[2rem] bg-[#060813] flex items-center justify-center mb-5 overflow-hidden group-hover:scale-[1.02] transition-transform relative">
              {node.type === 'folder' ? <Folder className={`w-16 h-16 transition-all ${dropTargetId === node.id ? 'text-cyan-400 scale-110' : 'text-gray-800 group-hover:text-cyan-500/40'}`} /> : 
               node.type === 'image' ? <img src={node.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={node.name} /> : 
               node.type === 'video' ? <Video className="w-16 h-16 text-rose-500/20 group-hover:text-rose-500/40" /> :
               <Music className="w-16 h-16 text-pink-500/20 group-hover:text-pink-500/40" />
              }
              {draggedNodeId === node.id && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center"><span className="text-[10px] font-black uppercase text-cyan-400 tracking-widest">DRAGGING</span></div>}
            </div>

            <div className="flex flex-col px-1 space-y-2">
              {editingId === node.id ? (
                <div onClick={e => e.stopPropagation()}>
                  <input 
                    autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {if (e.key === 'Enter') saveRename()}} onBlur={saveRename}
                    className="w-full bg-white/10 border border-cyan-500/50 rounded-lg px-3 py-1.5 text-xs outline-none font-bold"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                   <span className="text-sm font-black truncate flex-1 mr-2 text-gray-300 group-hover:text-white transition-colors">{node.name}</span>
                   <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <button onClick={() => startRename(node)} className="p-1.5 hover:text-cyan-400 transition-colors" title="重命名"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(node.id)} className="p-1.5 hover:text-red-500 transition-colors" title="删除"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              )}
              <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">
                {node.type === 'folder' ? `${node.children?.length || 0} ITEMS` : 'ASSET FILE'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredNodes.length === 0 && !isAddingFolder && (
        <div className="flex flex-col items-center justify-center py-40 bg-white/[0.01] border-2 border-dashed border-white/5 rounded-[4rem]">
          <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mb-8">
            <Folder className="w-16 h-16 text-gray-800" />
          </div>
          <p className="font-black text-2xl uppercase tracking-[0.2em] text-gray-800">此目录为空</p>
          <button onClick={() => setIsAddingFolder(true)} className="mt-6 text-cyan-500/60 font-black text-xs hover:text-cyan-400 uppercase tracking-widest">立即创建首个文件夹</button>
        </div>
      )}
    </div>
  );
};

export default Assets;
