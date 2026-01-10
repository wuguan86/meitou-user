
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { message } from 'antd';
import { Type, Layers, Video, PlaySquare, Mic2, Sparkles, ArrowRight, Zap, Heart, Eye } from 'lucide-react';
import { PageType, Inspiration, AssetNode } from '../types';
import { getActiveAds, MarketingAd } from '../api/marketing';
import * as publishAPI from '../api/publish';
import RichTextModal from './Modals/RichTextModal';

interface HomeProps {
  onNavigate: (page: PageType) => void;
  onSelectWork: (work: Inspiration) => void;
  userId?: number; // 用户ID
}

const Home: React.FC<HomeProps> = ({ onNavigate, onSelectWork, userId }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [ads, setAds] = useState<MarketingAd[]>([]); // 广告数据
  const [loadingAds, setLoadingAds] = useState(true); // 加载状态
  // activeTab removed, default to 'all'
  const [inspirations, setInspirations] = useState<Inspiration[]>([]); // 灵感广场数据
  const [loadingInspirations, setLoadingInspirations] = useState(true); // 加载灵感广场状态
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [richTextModal, setRichTextModal] = useState<{
    isOpen: boolean;
    content: string;
    title: string;
  }>({
    isOpen: false,
    content: '',
    title: ''
  });
  
  const [columnCount, setColumnCount] = useState(1);

  useEffect(() => {
    const updateColumns = () => {
      if (window.innerWidth >= 1024) {
        setColumnCount(4);
      } else if (window.innerWidth >= 640) {
        setColumnCount(2);
      } else {
        setColumnCount(1);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  const masonryColumns = useMemo(() => {
    const cols: Inspiration[][] = Array.from({ length: columnCount }, () => []);
    inspirations.forEach((item, index) => {
      cols[index % columnCount].push(item);
    });
    return cols;
  }, [inspirations, columnCount]);

  // 从后台获取广告数据
  useEffect(() => {
    const loadAds = async () => {
      try {
        setLoadingAds(true);
        // 不传siteCategory参数，获取所有站点的有效广告（后端会根据时间和激活状态过滤）
        const adsData = await getActiveAds();
        setAds(adsData);
      } catch (error) {
        console.error('加载广告失败:', error);
        // 如果加载失败，使用空数组（不显示广告）
        setAds([]);
      } finally {
        setLoadingAds(false);
      }
    };
    
    loadAds();
  }, []);

  // 将广告数据转换为slides格式（如果没有广告，使用默认slides）
  const defaultSlides = [
    { title: "创意驱动，无限可能", desc: "Meji AI 研究院深度定制模型，为您提供全栈式 AI 创作解决方案。", img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80", tags: ["Engine Upgrade v3.1.1"] },
    { title: "文生图 2.2 震撼发布", desc: "更细腻的细节表现，更精准的语义理解，开启视觉艺术新篇章。", img: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=1600&q=80", tags: ["New Model"] },
    { title: "视频生成加速 50%", desc: "图生视频引擎全新升级，更快的渲染速度，更流畅的动态效果。", img: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1600&q=80", tags: ["Efficiency"] },
    { title: "AI 研究院招募中", desc: "加入我们的创作者激励计划，共享 AI 时代的红利与技术前沿。", img: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1600&q=80", tags: ["Community"] }
  ];
  
  // 将广告转换为slides格式（后端已按position排序）
  const slides = ads.length > 0 
    ? ads.map(ad => {
        // 处理tags字段（后端返回的是JSON字符串，需要解析）
        let tagArray: string[] = [];
        if (ad.tags) {
          if (typeof ad.tags === 'string') {
            try {
              tagArray = JSON.parse(ad.tags);
            } catch (e) {
              // 如果解析失败，尝试按逗号分割
              tagArray = ad.tags.split(',').map(t => t.trim()).filter(t => t);
            }
          } else if (Array.isArray(ad.tags)) {
            tagArray = ad.tags;
          }
        }
        
        return {
          id: String(ad.id), // 确保id是字符串
          title: ad.title,
          desc: ad.summary || ad.title,
          img: ad.imageUrl,
          tags: tagArray.length > 0 ? tagArray : ["Featured"],
          linkType: ad.linkType,
          linkUrl: ad.linkUrl,
          richContent: ad.richContent
        };
      })
    : defaultSlides;

  useEffect(() => {
    if (slides.length > 0) {
      const timer = setInterval(() => {
        setActiveSlide(s => (s + 1) % slides.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [slides.length]);

  // 点赞/取消点赞
  const toggleLike = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    
    if (!userId) {
      message.warning('请先登录');
      return;
    }
    
    try {
      // 调用点赞API
      const result = await publishAPI.toggleLike(userId, id);
      
      // 更新本地状态
      const next = new Set(likedIds);
      if (result.isLiked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      setLikedIds(next);
      
      // 更新灵感列表中的点赞数
      setInspirations(prev => prev.map(item => 
        item.id === id ? { ...item, likes: result.likeCount, isLiked: result.isLiked } : item
      ));
    } catch (error: any) {
      console.error('操作失败：', error);
    }
  };

  const hotTools = [
    { id: 'image-analysis', name: '图视分析', desc: '深度解析图像与视频细节', icon: Eye, color: 'from-[#2cc2f5]/20 to-[#6b48ff]/20', borderColor: 'hover:border-[#2cc2f5]/50' },
    { id: 'text-to-image', name: '文生图', desc: '由意而发，瞬间定格', icon: Type, color: 'from-[#6b48ff]/20 to-[#ff2e8c]/20', borderColor: 'hover:border-[#6b48ff]/50' },
    { id: 'image-to-image', name: '图生图', desc: '赋予原图无限可能', icon: Layers, color: 'from-[#ff2e8c]/20 to-[#ff2e8c]/10', borderColor: 'hover:border-[#ff2e8c]/50' },
    { id: 'image-to-video', name: '图生视频', desc: '开启画面灵动时刻', icon: PlaySquare, color: 'from-[#2cc2f5]/10 to-[#ff2e8c]/20', borderColor: 'hover:border-white/20' },
  ];

  // 从API加载灵感广场内容
  const loadInspirations = async (currentPage: number, isLoadMore: boolean = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoadingInspirations(true);
      }
      
      // 获取发布内容列表
      const result = await publishAPI.getPublishedContents('all', currentPage, 20, userId);
      const contents = result.records;
      
      // 转换为Inspiration格式
      const inspirationList: Inspiration[] = contents.map((content) => {
        // 解析生成配置获取prompt和完整配置
        let prompt = '';
        let originalImageUrl: string | undefined = undefined;
        let generationConfig: any = undefined;
        
        if (content.generationConfig) {
          try {
            const config = JSON.parse(content.generationConfig);
            prompt = config.prompt || '';
            generationConfig = config; // 保存完整的配置对象
            
            // 对于图生图/图生视频，获取参考图片
            const img2imgRef = config.referenceImages?.[0] || config.urls?.[0];
            const img2videoRef = config.referenceImage || config.image;
            
            if (content.generationType === 'img2img' || (content.type === 'image' && img2imgRef)) {
              originalImageUrl = img2imgRef;
            } else if (content.generationType === 'img2video' || (content.type === 'video' && img2videoRef)) {
              originalImageUrl = img2videoRef;
            }
          } catch (e) {
            console.error('解析生成配置失败:', e);
          }
        }
        
        // 瀑布流布局，不设置固定高度
        const height = '';
        
        return {
          id: content.id,
          title: content.title,
          user: content.userName,
          avatar: content.userAvatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${content.userId}`,
          likes: content.likeCount || 0,
          img: content.thumbnail || content.contentUrl,
          height: height,
          desc: content.description,
          prompt: prompt,
          originalImageUrl: originalImageUrl,
          type: content.type,
          generationType: content.generationType as any,
          generationConfig: generationConfig, // 保存完整的生成配置
          publishedAt: content.publishedAt,
          userId: content.userId,
          contentUrl: content.contentUrl,
          isLiked: content.isLiked || false, // 直接使用后端返回的状态
        };
      });
      
      if (isLoadMore) {
        setInspirations(prev => [...prev, ...inspirationList]);
      } else {
        setInspirations(inspirationList);
      }
      
      // 更新likedIds集合
      const newLikedIds = new Set(isLoadMore ? likedIds : []);
      inspirationList.forEach(item => {
        if (item.isLiked) {
          newLikedIds.add(item.id);
        }
      });
      setLikedIds(newLikedIds);
      
      // 检查是否还有更多数据
      setHasMore(currentPage < result.pages);
      
    } catch (error) {
      console.error('加载灵感广场失败:', error);
      if (!isLoadMore) {
        setInspirations([]);
      }
    } finally {
      setLoadingInspirations(false);
      setLoadingMore(false);
    }
  };

  // 初始加载
  useEffect(() => {
    setPage(1);
    loadInspirations(1, false);
  }, [userId]);

  // 加载更多
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadInspirations(nextPage, true);
    }
  }, [loadingMore, hasMore, page, loadInspirations]);

  // 滚动加载监听
  const observerTarget = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
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

  // 处理广告点击
  const handleAdClick = (slide: typeof slides[0]) => {
    if ('linkType' in slide) {
      // 如果是广告数据，处理跳转
      if (slide.linkType === 'external' && slide.linkUrl) {
        // 外部链接，打开新窗口
        window.open(slide.linkUrl, '_blank');
      } else if (slide.linkType === 'internal_rich' && slide.richContent) {
        setRichTextModal({
          isOpen: true,
          content: slide.richContent,
          title: slide.title
        });
      }
    }
    // 如果是默认slides，不处理（保持原有行为）
  };

  return (
    <div className="space-y-14 pb-20">
      {/* Auto Carousel Banner */}
      <section className="relative h-[16rem] sm:h-[20rem] lg:h-[22rem] rounded-2xl sm:rounded-[2.5rem] overflow-hidden group shadow-2xl">
        {slides.length > 0 && !loadingAds ? (
          slides.map((slide, idx) => (
            <div 
              key={'id' in slide ? slide.id : idx}
              className={`absolute inset-0 transition-opacity duration-1000 ${idx === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'} ${'linkType' in slide ? 'cursor-pointer' : ''}`}
              onClick={() => 'linkType' in slide && handleAdClick(slide)}
            >
              <img src={slide.img} className="w-full h-full object-cover" alt={slide.title} />
              <div className="absolute inset-0 bg-gradient-to-r from-[#060813] via-[#060813]/60 to-transparent flex flex-col justify-center px-4 sm:px-8 lg:px-16">
                <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
                  {slide.tags.map((tag, i) => (
                    <div key={i} className="flex items-center space-x-2 text-[#2cc2f5] bg-[#2cc2f5]/10 w-fit px-2 sm:px-3 py-1 rounded-full border border-[#2cc2f5]/20">
                      <Zap className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">{tag}</span>
                    </div>
                  ))}
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-2 sm:mb-3 tracking-tighter text-white">{slide.title}</h2>
                <p className="text-gray-300 text-sm sm:text-base lg:text-lg mb-4 sm:mb-6 lg:mb-8 max-w-xl leading-relaxed">{slide.desc}</p>
                <button 
                  className="w-fit flex items-center space-x-2 sm:space-x-3 brand-gradient px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 lg:py-3 rounded-xl sm:rounded-2xl font-black hover:scale-105 transition-all shadow-xl glow-pink text-sm sm:text-base"
                  onClick={(e) => {
                    e.stopPropagation();
                    if ('linkType' in slide) {
                      handleAdClick(slide);
                    }
                  }}
                >
                  <span className="text-white">立即体验</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </button>
              </div>
            </div>
          ))
        ) : (
          // 加载中的占位符（可以显示默认的slides或加载动画）
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-500">加载中...</div>
          </div>
        )}
        {/* Indicators */}
        {slides.length > 0 && !loadingAds && (
          <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-8 lg:right-12 z-20 flex space-x-2 sm:space-x-3">
            {slides.map((_, idx) => (
              <button 
                key={idx} 
                onClick={() => setActiveSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeSlide ? 'w-8 brand-gradient' : 'w-2 bg-white/20'}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* Hot Creation Center */}
      <section>
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-1 sm:w-1.5 h-6 sm:h-8 brand-gradient rounded-full"></div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">热门创作</h3>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {hotTools.map((tool) => (
            <button 
              key={tool.id}
              onClick={() => onNavigate(tool.id as PageType)}
              className={`p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-[2.5rem] border border-white/5 bg-gradient-to-br ${tool.color} ${tool.borderColor} text-left group transition-all duration-500 hover:-translate-y-2 relative overflow-hidden shadow-lg`}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                <tool.icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <h4 className="text-lg sm:text-xl font-black mb-2 text-white">{tool.name}</h4>
              <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 font-medium">{tool.desc}</p>
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
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-1 sm:w-1.5 h-6 sm:h-8 brand-gradient rounded-full"></div>
            <h3 className="text-2xl font-black tracking-tight">灵感广场</h3>
          </div>
        </div>
        
        {/* Tab切换 */}
        
        {loadingInspirations ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            加载中...
          </div>
        ) : inspirations.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            暂无内容
          </div>
        ) : (
          <div className="flex flex-col space-y-8">
            <div className="flex gap-[3px] items-start">
              {masonryColumns.map((column, colIndex) => (
                <div key={colIndex} className="flex-1 flex flex-col gap-[3px]">
                  {column.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => onSelectWork(item)}
                      className="relative group rounded-3xl overflow-hidden bg-[#0d1121] border border-white/5 shadow-xl transition-all hover:border-[#2cc2f5]/30 cursor-pointer"
                    >
                      {item.type === 'video' ? (
                        <div className="relative w-full">
                          {item.img && item.img !== item.contentUrl ? (
                            <img 
                              src={item.img} 
                              className={`w-full object-cover transition-transform duration-700 group-hover:scale-110 ${item.height}`}
                              alt={item.title} 
                            />
                          ) : (
                            <video 
                              src={item.contentUrl} 
                              className={`w-full object-cover transition-transform duration-700 group-hover:scale-110 ${item.height}`}
                              muted
                              loop
                              playsInline
                              preload="metadata"
                            />
                          )}
                          <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 flex items-center justify-center pointer-events-none">
                            <PlaySquare className="w-4 h-4 text-white/90" />
                          </div>
                        </div>
                      ) : (
                        <img src={item.img} className={`w-full object-cover transition-transform duration-700 group-hover:scale-110 ${item.height}`} alt={item.title} />
                      )}
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
                            <Heart className={`w-3 h-3 ${likedIds.has(item.id) || item.isLiked ? 'text-[#ff2e8c] fill-[#ff2e8c]' : 'text-gray-400'}`} />
                            <span className="text-[10px] text-white font-black">{item.likes}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            
            {hasMore && (
              <div ref={observerTarget} className="flex justify-center pt-8 pb-4">
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

      {/* Rich Text Modal */}
      {richTextModal.isOpen && (
        <RichTextModal 
          content={richTextModal.content} 
          title={richTextModal.title}
          onClose={() => setRichTextModal({...richTextModal, isOpen: false})} 
        />
      )}
    </div>
  );
};

export default Home;
