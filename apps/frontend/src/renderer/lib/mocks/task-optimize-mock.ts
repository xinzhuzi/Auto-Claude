/**
 * Task Optimize Mock
 * ==================
 *
 * 浏览器模式下的任务优化 mock 实现。
 *
 * 需要手动合并到 browser-mock.ts 中：
 *
 * import { taskOptimizeMock } from './mocks/task-optimize-mock';
 *
 * const browserMockAPI: ElectronAPI = {
 *   ...taskOptimizeMock,
 *   // ... 其他 mock
 * };
 */

import type {
  OptimizeTaskRequest,
  OptimizeTaskResponse,
} from '../../../shared/types/task-optimize';

/**
 * 模拟任务优化响应
 */
export const taskOptimizeMock = {
  optimizeTaskDescription: async (
    request: OptimizeTaskRequest
  ): Promise<{ success: boolean; data?: OptimizeTaskResponse; error?: string }> => {
    console.warn('[Browser Mock] optimizeTaskDescription called');

    // 模拟 AI 优化
    const optimizedDescription = `${request.task_description}

优化建议：
1. 明确具体的修改范围
2. 列出预期的输出结果
3. 指定相关的文件路径`;

    // 简单的 worktree 推荐逻辑
    const descLower = request.task_description.toLowerCase();
    const useWorktree =
      descLower.includes('重构') ||
      descLower.includes('refactor') ||
      descLower.includes('迁移') ||
      descLower.includes('migration') ||
      descLower.includes('worktree') ||
      descLower.includes('隔离');

    return {
      success: true,
      data: {
        optimized_description: optimizedDescription,
        worktree_recommendation: {
          use_worktree: useWorktree,
          reason: useWorktree
            ? '检测到高风险修改关键词，建议使用隔离模式'
            : '简单任务，直接模式更快',
          confidence: useWorktree ? 'high' : 'medium',
        },
        improvements: [
          '添加了结构化的优化建议',
          '明确了任务范围',
        ],
      },
    };
  },
};

export default taskOptimizeMock;
