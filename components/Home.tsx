
import React, { useState, useEffect } from 'react';
import { Type, Layers, Video, PlaySquare, Mic2, Sparkles, ArrowRight, Zap, Heart, Eye } from 'lucide-react';
import { PageType, Inspiration, AssetNode } from '../types';

interface HomeProps {
  onNavigate: (page: PageType) => void;
  onSelectWork: (work: Inspiration) => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate, onSelectWork }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  
  const slides = [
    { title: "创意驱动，无限可能", desc: "Meji AI 研究院深度定制模型，为您提供全栈式 AI 创作解决方案。", img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80", tag: "Engine Upgrade v3.1.1" },
    { title: "文生图 2.2 震撼发布", desc: "更细腻的细节表现，更精准的语义理解，开启视觉艺术新篇章。", img: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=1600&q=80", tag: "New Model" },
    { title: "视频生成加速 50%", desc: "图生视频引擎全新升级，更快的渲染速度，更流畅的动态效果。", img: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1600&q=80", tag: "Efficiency" },
    { title: "AI 研究院招募中", desc: "加入我们的创作者激励计划，共享 AI 时代的红利与技术前沿。", img: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1600&q=80", tag: "Community" }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide(s => (s + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const toggleLike = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const next = new Set(likedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setLikedIds(next);
  };

  const hotTools = [
    { id: 'image-analysis', name: '图视分析', desc: '深度解析图像与视频细节', icon: Eye, color: 'from-[#2cc2f5]/20 to-[#6b48ff]/20', borderColor: 'hover:border-[#2cc2f5]/50' },
    { id: 'text-to-image', name: '文生图', desc: '由意而发，瞬间定格', icon: Type, color: 'from-[#6b48ff]/20 to-[#ff2e8c]/20', borderColor: 'hover:border-[#6b48ff]/50' },
    { id: 'image-to-image', name: '图生图', desc: '赋予原图无限可能', icon: Layers, color: 'from-[#ff2e8c]/20 to-[#ff2e8c]/10', borderColor: 'hover:border-[#ff2e8c]/50' },
    { id: 'image-to-video', name: '图生视频', desc: '开启画面灵动时刻', icon: PlaySquare, color: 'from-[#2cc2f5]/10 to-[#ff2e8c]/20', borderColor: 'hover:border-white/20' },
  ];

  const inspirations: Inspiration[] = [
    { id: 1, title: '流体模拟 - 彩色液态碰撞', user: 'SimGuru', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SimGuru', likes: 432, img: 'https://picsum.photos/seed/meji_1/800/1000', height: 'h-[320px]', desc: '基于物理引擎的流体模拟测试，展现了高饱和度液体在极宏观镜头下的运动轨迹。', prompt: 'Colorful liquid mixing simulation, fluid dynamics, macro shot, 8k, extremely detailed.' },
    { id: 2, title: '极地之光 概念艺术', user: '创作者_88', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=88', likes: 890, img: 'https://picsum.photos/seed/meji_2/800/800', height: 'h-[260px]', desc: '北极光下的未来实验室场景。', prompt: 'Aurora borealis, futuristic lab, ice mountain, concept art, trending on artstation.' },
    { id: 3, title: '赛博朋克 街景', user: '设计大师_X', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=X', likes: 2100, img: 'https://picsum.photos/seed/meji_3/800/1200', height: 'h-[400px]', desc: '雨后的霓虹灯街道。', prompt: 'Cyberpunk city street after rain, neon signs, reflect on puddle, cinematic lighting.', originalImageUrl: 'https://picsum.photos/seed/meji_3_orig/400/600' },
    { id: 4, title: '深海巨兽', user: '未来探索者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Explorer', likes: 450, img: 'https://picsum.photos/seed/meji_4/800/900', height: 'h-[300px]', desc: '深海中发光的未知生物。', prompt: 'Deep sea monster, bioluminescent, dark water, grand scale, photography.' },
    { id: 5, title: '森林精灵', user: 'AI影师', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lens', likes: 670, img: 'https://picsum.photos/seed/meji_5/800/1100', height: 'h-[350px]', desc: '清晨雾气中的森林精灵少女。', prompt: 'Forest elf girl, morning mist, god rays, ethereal, hyper realistic.', originalImageUrl: 'https://picsum.photos/seed/meji_5_orig/400/550' },
    { id: 6, title: '机械纪元', user: '光影魔术', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Magic', likes: 3200, img: 'https://picsum.photos/seed/meji_6/800/1300', height: 'h-[420px]', desc: '完全机械化的星球表面。', prompt: 'Mechanical planet surface, complex structures, space opera style.' },
    { id: 7, title: '夏日海滨', user: '虚幻纪元', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Era', likes: 156, img: 'https://picsum.photos/seed/meji_7/800/850', height: 'h-[280px]', desc: '唯美的动漫风格海滩。', prompt: 'Summer beach, anime style, makoto shinkai aesthetic, crystal clear water.' },
    { id: 8, title: '美透科技 未来舱', user: '美透专家', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Expert', likes: 98, img: 'https://picsum.photos/seed/meji_8/800/1050', height: 'h-[330px]', desc: '美透AI研究院最新设计的未来交互舱。', prompt: 'Futuristic interface pod, clean white aesthetic, glowing blue lines, scifi.' },
  ];

  return (
    <div className="space-y-14 pb-20">
      {/* Auto Carousel Banner */}
      <section className="relative h-[22rem] rounded-[2.5rem] overflow-hidden group shadow-2xl">
        {slides.map((slide, idx) => (
          <div 
            key={idx} 
            className={`absolute inset-0 transition-opacity duration-1000 ${idx === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
          >
            <img src={slide.img} className="w-full h-full object-cover" alt={slide.title} />
            <div className="absolute inset-0 bg-gradient-to-r from-[#060813] via-[#060813]/60 to-transparent flex flex-col justify-center px-16">
              <div className="flex items-center space-x-2 text-[#2cc2f5] mb-4 bg-[#2cc2f5]/10 w-fit px-3 py-1 rounded-full border border-[#2cc2f5]/20">
                <Zap className="w-4 h-4 fill-current" />
                <span className="text-[10px] font-black uppercase tracking-widest">{slide.tag}</span>
              </div>
              <h2 className="text-5xl font-black mb-3 tracking-tighter text-white">{slide.title}</h2>
              <p className="text-gray-300 text-lg mb-8 max-w-xl leading-relaxed">{slide.desc}</p>
              <button className="w-fit flex items-center space-x-3 brand-gradient px-8 py-3 rounded-2xl font-black hover:scale-105 transition-all shadow-xl glow-pink">
                <span className="text-white">立即体验</span>
                <ArrowRight className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        ))}
        {/* Indicators */}
        <div className="absolute bottom-6 right-12 z-20 flex space-x-3">
          {slides.map((_, idx) => (
            <button 
              key={idx} 
              onClick={() => setActiveSlide(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeSlide ? 'w-8 brand-gradient' : 'w-2 bg-white/20'}`}
            />
          ))}
        </div>
      </section>

      {/* Hot Creation Center */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-1.5 h-8 brand-gradient rounded-full"></div>
            <h3 className="text-2xl font-black tracking-tight">热门创作</h3>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {hotTools.map((tool) => (
            <button 
              key={tool.id}
              onClick={() => onNavigate(tool.id as PageType)}
              className={`p-8 rounded-[2.5rem] border border-white/5 bg-gradient-to-br ${tool.color} ${tool.borderColor} text-left group transition-all duration-500 hover:-translate-y-2 relative overflow-hidden shadow-lg`}
            >
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                <tool.icon className="w-7 h-7 text-white" />
              </div>
              <h4 className="text-xl font-black mb-2 text-white">{tool.name}</h4>
              <p className="text-sm text-gray-500 mb-6 font-medium">{tool.desc}</p>
              <div className="flex items-center text-xs font-black tracking-widest text-white/40 group-hover:brand-text-gradient transition-colors uppercase">
                <span>开始创作</span>
                <ArrowRight className="w-3 h-3 ml-2" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Creative Inspiration */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-1.5 h-8 bg-[#ff2e8c] rounded-full"></div>
            <h3 className="text-2xl font-black tracking-tight">灵感广场</h3>
          </div>
        </div>
        
        <div className="columns-1 sm:columns-2 lg:columns-4 gap-6 space-y-6">
          {inspirations.map((item) => (
            <div 
              key={item.id} 
              onClick={() => onSelectWork(item)}
              className="break-inside-avoid relative group rounded-3xl overflow-hidden bg-[#0d1121] border border-white/5 shadow-xl transition-all hover:border-[#2cc2f5]/30 cursor-pointer"
            >
              <img src={item.img} className={`w-full object-cover transition-transform duration-700 group-hover:scale-110 ${item.height}`} alt={item.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent flex flex-col justify-end p-5">
                <p className="text-sm font-black text-white mb-4 line-clamp-1">{item.title}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <img src={item.avatar} className="w-7 h-7 rounded-full border border-white/20" alt={item.user} />
                    <span className="text-[11px] font-black text-white">{item.user}</span>
                  </div>
                  <button 
                    onClick={(e) => toggleLike(e, item.id)}
                    className="flex items-center space-x-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/5 hover:bg-white/10 transition-colors"
                  >
                    <Heart className={`w-3 h-3 ${likedIds.has(item.id) ? 'text-[#ff2e8c] fill-[#ff2e8c]' : 'text-gray-400'}`} />
                    <span className="text-[10px] text-white font-black">{item.likes + (likedIds.has(item.id) ? 1 : 0)}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="pt-20 border-t border-white/5 text-center">
        <div className="inline-flex items-center space-x-2 mb-4 opacity-30 grayscale">
           <div className="w-6 h-6 brand-gradient rounded-full"></div>
           <span className="text-lg font-black tracking-tighter uppercase">Meji AI</span>
        </div>
        <p className="text-gray-600 text-[10px] font-bold tracking-widest uppercase">
          Copyright © 2025 Meitou Tech. Research Institute.
        </p>
      </footer>
    </div>
  );
};

export default Home;
