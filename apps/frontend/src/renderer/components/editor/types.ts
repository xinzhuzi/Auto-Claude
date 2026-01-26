/**
 * 编辑器组件类型定义
 */

/**
 * VSCode 嵌入组件属性
 */
export interface VSCodeEmbedProps {
  /** 项目路径 */
  projectPath: string;
  /** code-server 端口（可选，默认动态分配） */
  port?: number;
  /** 加载完成回调 */
  onLoad?: () => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

/**
 * 编辑器布局属性
 */
export interface EditorLayoutProps {
  /** 项目路径 */
  projectPath: string;
  /** 编辑器主题 */
  theme?: 'vs-dark' | 'vs-light' | 'vs-hc';
}
