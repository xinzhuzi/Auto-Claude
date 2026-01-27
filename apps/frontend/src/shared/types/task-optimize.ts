/**
 * Task Optimize Types
 * ===================
 *
 * 任务描述优化和 worktree 推荐相关的类型定义。
 *
 * 需要手动合并到 ipc.ts 的 ElectronAPI 接口中：
 *
 * // 在 ElectronAPI 接口中添加:
 * optimizeTaskDescription: (request: OptimizeTaskRequest) => Promise<IPCResult<OptimizeTaskResponse>>;
 */

/**
 * 任务优化请求
 */
export interface OptimizeTaskRequest {
  /** 原始任务描述 */
  task_description: string;
  /** 项目路径 */
  project_path: string;
  /** 用户 @ 引用的文件/文件夹路径 */
  target_paths?: string[];
}

/**
 * Worktree 推荐结果
 */
export interface WorktreeRecommendation {
  /** 是否推荐使用 worktree */
  use_worktree: boolean;
  /** 推荐原因 */
  reason: string;
  /** 置信度 */
  confidence: 'high' | 'medium' | 'low';
}

/**
 * 任务优化响应
 */
export interface OptimizeTaskResponse {
  /** 优化后的任务描述 */
  optimized_description: string;
  /** Worktree 推荐 */
  worktree_recommendation: WorktreeRecommendation;
  /** AI 做了哪些优化 */
  improvements: string[];
}
