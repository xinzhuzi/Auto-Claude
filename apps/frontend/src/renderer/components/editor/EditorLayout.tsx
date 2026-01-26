/**
 * 编辑器布局组件
 *
 * 提供 VSCode 编辑器的容器和布局
 */

import React from 'react';
import { VSCodeEmbed } from './VSCodeEmbed';
import type { EditorLayoutProps } from './types';

/**
 * 编辑器布局组件
 *
 * 全屏 VSCode 嵌入组件，无工具栏
 */
export const EditorLayout: React.FC<EditorLayoutProps> = ({
  projectPath,
  theme = 'vs-dark'
}) => {
  // Log the received project path for debugging
  React.useEffect(() => {
    console.log('[EditorLayout] Received projectPath:', projectPath);
  }, [projectPath]);

  const handleLoad = () => {
    console.log('[EditorLayout] VSCode loaded successfully');
  };

  const handleError = (error: Error) => {
    console.error('[EditorLayout] VSCode error:', error);
  };

  return (
    <div className="h-full w-full bg-[#1E1E1E]">
      {/* VSCode 嵌入组件 - 全屏显示 */}
      <VSCodeEmbed
        projectPath={projectPath}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};
