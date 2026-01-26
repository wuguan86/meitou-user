
/**
 * 字符串处理工具函数
 */

/**
 * 生成标题
 * 截取第一句话，或者最大50个字符
 * @param content 内容
 * @returns 截取后的标题
 */
export const formatTitle = (content?: string): string => {
  if (!content) return '';

  // 1. 尝试按标点符号截取第一句
  // 支持中文和英文的句号、问号、感叹号，以及换行符
  const splitPattern = /([。！？\n.!?;])/;
  const parts = content.split(splitPattern);
  
  let title = parts[0];
  
  // 如果有标点符号，加上标点符号
  if (parts.length > 1) {
    // parts[1] 是分隔符
    // title += parts[1]; 
    // 通常标题不需要末尾标点，或者保留。
    // 用户需求是 "截取第一句话然后加上省略号'....'"
    // 所以不需要原来的标点，直接加省略号?
    // "第一句话" usually implies the sentence content.
    // If I have "Hello world. This is test.", first sentence is "Hello world".
    // User says "add ellipsis". So "Hello world...."
  }

  // 2. 长度限制 50
  if (title.length > 50) {
    title = title.substring(0, 50);
  }

  // 如果原内容比截取后的长，或者原内容包含标点符号导致被截断，添加省略号
  if (title.length < content.length) {
    title += '....';
  }

  return title;
};
