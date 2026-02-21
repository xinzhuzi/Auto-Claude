/**
 * NovelWorkflowMarket - 工作流市场
 *
 * 工作流卡片列表展示，支持分类筛选和搜索
 * 参考星月写作的工作流列表设计
 */

import React, { useState, useEffect, useMemo } from 'react';
import type { NovelWorkflow, WorkflowCategory } from '../../../shared/types/novel';
import { useNovelWorkflowStore } from '../../stores/novel-workflow-store';

interface NovelWorkflowMarketProps {
  onSelectWorkflow: (workflow: NovelWorkflow) => void;
}

const CATEGORY_LABELS: Record<WorkflowCategory | 'all', string> = {
  'all': '全部',
  'short-story': '短篇',
  'long-story': '长篇',
  'continuation': '续写',
  'outline': '大纲',
  'polish': '润色',
  'character': '人物',
  'world': '世界观'
};

// 渲染评分星星
const renderStars = (rating: number, idPrefix: string) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const stars = [];

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      );
    } else if (i === fullStars && hasHalf) {
      const gradientId = `${idPrefix}-half-${i}`;
      stars.push(
        <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
          <defs>
            <linearGradient id={gradientId}>
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path fill={`url(#${gradientId})`} d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      );
    } else {
      stars.push(
        <svg key={i} className="w-4 h-4 text-gray-300 fill-current" viewBox="0 0 20 20">
          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
        </svg>
      );
    }
  }

  return stars;
};

export const NovelWorkflowMarket: React.FC<NovelWorkflowMarketProps> = ({
  onSelectWorkflow
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'hot' | 'new' | 'featured' | 'mine' | 'favorites'>('all');

  const {
    workflows,
    favorites,
    myWorkflows,
    searchQuery,
    categoryFilter,
    isLoading,
    loadWorkflows,
    setSearchQuery,
    setCategoryFilter,
    toggleFavorite,
    getFilteredWorkflows
  } = useNovelWorkflowStore();

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const filteredWorkflows = getFilteredWorkflows();

  // 使用 useMemo 优化性能
  const displayWorkflows = useMemo(() => {
    switch (activeTab) {
      case 'hot':
        return [...filteredWorkflows].sort((a, b) => b.usageCount - a.usageCount);
      case 'new':
        return [...filteredWorkflows].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'mine':
        return myWorkflows;
      case 'favorites':
        return filteredWorkflows.filter(w => favorites.includes(w.id));
      default:
        return filteredWorkflows;
    }
  }, [activeTab, filteredWorkflows, myWorkflows, favorites]);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 头部 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-2xl">🔄</span>
              工作流
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              探索和创建智能工作流
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-300
                         hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              历史记录
            </button>
            <button
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white
                         hover:bg-blue-700 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              创建工作流
            </button>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索工作流..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300
                       rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            搜索
          </button>
        </div>
      </div>

      {/* 分类标签 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {/* Tab 切换 */}
          <div
            onClick={() => setActiveTab('hot')}
            className={`px-3 py-1.5 text-sm rounded-full cursor-pointer whitespace-nowrap ${
              activeTab === 'hot'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            最热
          </div>
          <div
            onClick={() => setActiveTab('new')}
            className={`px-3 py-1.5 text-sm rounded-full cursor-pointer whitespace-nowrap ${
              activeTab === 'new'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            最新
          </div>
          <div
            onClick={() => setActiveTab('featured')}
            className={`px-3 py-1.5 text-sm rounded-full cursor-pointer whitespace-nowrap ${
              activeTab === 'featured'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            精选
          </div>
          <div
            onClick={() => setActiveTab('mine')}
            className={`px-3 py-1.5 text-sm rounded-full cursor-pointer whitespace-nowrap ${
              activeTab === 'mine'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            我的工作流
          </div>
          <div
            onClick={() => setActiveTab('favorites')}
            className={`px-3 py-1.5 text-sm rounded-full cursor-pointer whitespace-nowrap ${
              activeTab === 'favorites'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            我的收藏
          </div>

          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-2" />

          {/* 分类筛选 */}
          {(Object.keys(CATEGORY_LABELS) as Array<WorkflowCategory | 'all'>).map((cat) => (
            <div
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-sm rounded-full cursor-pointer whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </div>
          ))}
        </div>
      </div>

      {/* 工作流卡片列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 dark:text-gray-400">加载中...</div>
          </div>
        ) : displayWorkflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>暂无工作流</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayWorkflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                isFavorite={favorites.includes(workflow.id)}
                onToggleFavorite={() => toggleFavorite(workflow.id)}
                onRun={() => onSelectWorkflow(workflow)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// 工作流卡片组件
interface WorkflowCardProps {
  workflow: NovelWorkflow;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onRun: () => void;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  isFavorite,
  onToggleFavorite,
  onRun
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700
                    hover:shadow-lg transition-shadow overflow-hidden">
      {/* 顶部：评分和使用次数 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-1">
          {renderStars(workflow.rating, `workflow-${workflow.id}`)}
          <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
            {workflow.rating.toFixed(1)}
          </span>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {workflow.usageCount.toLocaleString()}次使用
        </span>
      </div>

      {/* 中间：标题和描述 */}
      <div className="p-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
          {workflow.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {workflow.description}
        </p>
      </div>

      {/* 底部：作者和操作按钮 */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500
                          flex items-center justify-center text-white text-xs font-bold">
            {workflow.author.charAt(0)}
          </div>
          <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
            {workflow.author}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className={`p-2 rounded-lg transition-colors ${
              isFavorite
                ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                : 'text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <svg className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
          <button
            onClick={onRun}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700
                       text-white text-sm rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            运行
          </button>
        </div>
      </div>
    </div>
  );
};

export default NovelWorkflowMarket;
