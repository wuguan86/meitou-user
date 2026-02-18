import React, { useEffect, useState } from 'react';
import { Modal, message } from 'antd';
import { X } from 'lucide-react';
import { getActivePopups, PopupConfig } from '../../api/popup';
import RichTextModal from './RichTextModal';

const PopupModal: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [popup, setPopup] = useState<PopupConfig | null>(null);
  const [showRichText, setShowRichText] = useState(false);

  const getTodayKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDailyViewKey = (popupId: number) => {
    const userId = localStorage.getItem('app_user_id') || 'guest';
    return `popup_daily_viewed_${popupId}_${userId}_${getTodayKey()}`;
  };

  const markViewed = (popupId: number) => {
    localStorage.setItem(getDailyViewKey(popupId), 'true');
  };

  useEffect(() => {
    const fetchPopup = async () => {
      try {
        const popups = await getActivePopups();
        if (popups && popups.length > 0) {
          // 只显示第一个启用的弹窗
          const firstPopup = popups[0];
          // 检查会话中是否已关闭过
          const viewed = localStorage.getItem(getDailyViewKey(firstPopup.id));
          if (!viewed) {
            markViewed(firstPopup.id);
            setPopup(firstPopup);
            setVisible(true);
          }
        }
      } catch (error) {
        console.error('获取弹窗配置失败:', error);
      }
    };

    fetchPopup();
  }, []);

  const handleClose = () => {
    setVisible(false);
    if (popup) {
      markViewed(popup.id);
    }
  };

  const handleClick = () => {
    if (!popup) return;

    console.log('Popup clicked:', popup);

    const type = popup.jumpType?.toLowerCase();
    
    // 如果是外部链接
    if ((type === 'external' && popup.jumpLink) || (!type && popup.jumpLink)) {
      let url = popup.jumpLink;
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('//')) {
        url = 'https://' + url;
      }
      window.open(url, '_blank');
      handleClose();
    } 
    // 如果是富文本
    else if ((type === 'rich_text') || (!type && popup.richTextContent)) {
      if (!popup.richTextContent) {
        message.warning('暂无详情内容');
        return;
      }
      setShowRichText(true);
      setVisible(false);
      markViewed(popup.id);
    } else {
        // 如果没有配置跳转，或者是无效配置
        console.warn('Unknown jump type or missing link:', popup);
        // 如果没有任何配置，默认关闭弹窗？不，这会困扰用户。
        // 可以选择不做任何事情，或者提示。
    }
  };

  if (!popup) return null;

  return (
    <>
      <Modal
        open={visible}
        footer={null}
        closable={false}
        onCancel={handleClose}
        centered
        width="auto"
        maskClosable={false}
        destroyOnClose
        rootClassName="popup-modal"
        className="popup-modal"
        modalRender={() => (
          <div className="relative flex flex-col items-center justify-center p-0 bg-transparent shadow-none pointer-events-auto">
            <div className="relative group w-fit">
              <div 
                className="cursor-pointer overflow-hidden rounded-xl shadow-2xl max-w-[90vw] max-h-[70vh] transition-transform hover:scale-[1.02]"
                onClick={handleClick}
              >
                <img 
                  src={popup.imageUrl} 
                  alt={popup.name} 
                  className="w-full h-full object-contain block max-h-[70vh] min-w-[300px]"
                />
              </div>

              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="absolute -top-3 -right-3 p-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white hover:bg-black/60 transition-all shadow-lg z-[100]"
                title="关闭弹窗"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      />
      
      {showRichText && popup.richTextContent && (
        <RichTextModal
          content={popup.richTextContent}
          onClose={() => setShowRichText(false)}
          title={popup.name}
        />
      )}
    </>
  );
};

export default PopupModal;
