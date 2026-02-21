/**
 * NovelWorkflowRunner - 工作流执行面板
 *
 * 显示工作流详情、动态表单、执行控制和结果展示
 * 支持分步执行和一键执行两种模式
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { NovelWorkflow, WorkflowExecution, StepResult, NovelProject, NovelChapter, NovelCharacter } from '../../../shared/types/novel';
import { useNovelWorkflowStore } from '../../stores/novel-workflow-store';
import { DynamicParamForm } from './DynamicParamForm';

interface NovelWorkflowRunnerProps {
  workflow: NovelWorkflow;
  projectId?: string;
  currentProject?: NovelProject | null;
  allProjects?: NovelProject[];
  onComplete?: (result: WorkflowExecution) => void;
  onBack?: () => void;
}

export const NovelWorkflowRunner: React.FC<NovelWorkflowRunnerProps> = ({
  workflow,
  projectId,
  currentProject,
  allProjects = [],
  onComplete,
  onBack
}) => {
  const [paramValues, setParamValues] = useState<Record<string, unknown>>({});
  const [executeMode, setExecuteMode] = useState<'step' | 'auto'>('step');

  // 使用 ref 存储 onComplete 回调，避免 useEffect 重复触发
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const {
    activeExecution,
    startExecution,
    executeNextStep,
    cancelExecution,
    isLoading,
    clearActiveExecution
  } = useNovelWorkflowStore();

  const resolveChapterText = (chapter: NovelChapter): string => {
    const content = chapter.content || chapter.generatedText || chapter.outline || '';
    if (!content) return '';
    const title = chapter.title || '未命名章节';
    return `### ${title}\n${content}`;
  };

  const resolveCharacterText = (character: NovelCharacter): string => {
    const name = character.name || '未命名角色';
    const description = typeof character.description === 'string' ? character.description : '';
    const traits = Array.isArray(character.traits) && character.traits.length
      ? `特征：${character.traits.join('、')}`
      : '';
    return [name, description, traits].filter(Boolean).join('\n');
  };

  const resolveExecutionParams = useCallback(() => {
    const resolved: Record<string, unknown> = { ...paramValues };

    const getBookById = (bookId?: string) =>
      allProjects.find((project) => project.id === bookId) ||
      (currentProject && currentProject.id === bookId ? currentProject : null) ||
      currentProject ||
      null;

    workflow.inputParams.forEach((param) => {
      const rawValue = paramValues[param.name];

      if (param.type === 'book') {
        const book = getBookById(rawValue as string | undefined);
        if (book) {
          resolved[param.name] = book.title || book.id;
        }
        return;
      }

      if (param.type === 'chapter') {
        const bookId = paramValues['book'] as string | undefined;
        const book = getBookById(bookId);
        if (book && Array.isArray(rawValue)) {
          const chapters = book.chapters?.filter((chapter) => rawValue.includes(chapter.id)) || [];
          const chapterText = chapters.map(resolveChapterText).filter(Boolean).join('\n\n');
          resolved[param.name] = chapterText;
        }
        return;
      }

      if (param.type === 'character') {
        const bookId = paramValues['book'] as string | undefined;
        const book = getBookById(bookId);
        if (book && Array.isArray(rawValue)) {
          const characters = book.characters?.filter((char) => rawValue.includes(char.id)) || [];
          const characterText = characters.map(resolveCharacterText).filter(Boolean).join('\n\n');
          resolved[param.name] = characterText;
        }
        return;
      }

      if (param.type === 'term' && Array.isArray(rawValue)) {
        resolved[param.name] = rawValue.join('\n');
      }
    });

    return resolved;
  }, [paramValues, allProjects, currentProject, workflow.inputParams]);

  // 初始化默认值 - 使用 JSON.stringify 稳定依赖
  useEffect(() => {
    const defaults: Record<string, unknown> = {};
    workflow.inputParams.forEach((param) => {
      if (param.defaultValue !== undefined) {
        defaults[param.name] = param.defaultValue;
      }
    });
    setParamValues(defaults);
  }, [JSON.stringify(workflow.inputParams)]);

  // 监听执行完成 - 使用 ref 避免依赖项问题
  useEffect(() => {
    if (activeExecution?.status === 'completed') {
      onCompleteRef.current?.(activeExecution);
      clearActiveExecution();
    }
  }, [activeExecution?.status, clearActiveExecution]);

  // 自动执行模式 - 使用 useEffect 清理 timer
  useEffect(() => {
    if (executeMode === 'auto' && activeExecution?.status === 'running' && activeExecution.currentStep === 0 && activeExecution.results.length === 0) {
      const timer = setTimeout(() => executeNextStep(), 100);
      return () => clearTimeout(timer);
    }
  }, [executeMode, activeExecution?.status, activeExecution?.currentStep, activeExecution?.results.length, executeNextStep]);

  // 使用 useCallback 优化回调
  const handleStartExecution = useCallback(() => {
    // 验证必填参数
    const missingParams = workflow.inputParams
      .filter((p) => {
        const value = paramValues[p.name];
        const isEmptyArray = Array.isArray(value) && value.length === 0;
        const isEmptyString = value === '';
        const isNil = value === undefined || value === null;
        return p.required && (isNil || isEmptyString || isEmptyArray);
      })
      .map((p) => p.label);

    if (missingParams.length > 0) {
      // 使用 console 替代 alert，实际项目中应使用 toast
      console.warn(`请填写必填参数：${missingParams.join(', ')}`);
      return;
    }

    const resolvedParams = resolveExecutionParams();
    startExecution(
      workflow.id,
      projectId || '',
      resolvedParams,
      executeMode
    );
  }, [workflow, projectId, executeMode, startExecution, resolveExecutionParams, paramValues]);

  const handleNextStep = useCallback(() => {
    executeNextStep();
  }, [executeNextStep]);

  const handleCancel = useCallback(() => {
    cancelExecution();
  }, [cancelExecution]);

  const isExecuting = activeExecution?.status === 'running';
  const currentStepIndex = activeExecution?.currentStep || 0;
  // 添加数组边界检查
  const currentStepResult = activeExecution?.results?.[currentStepIndex] ?? null;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* 头部 */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {workflow.name}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
              <span>工作流ID: {workflow.id}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className="text-yellow-500">⚡</span>
                {workflow.steps.length} 个步骤
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* 左侧：工作流信息 */}
          <div className="lg:col-span-1 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
            <div className="space-y-6">
              {/* 工作流信息 */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  <span>📋</span> 工作流信息
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {workflow.description}
                </p>

                {/* 执行步骤 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      执行步骤
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {workflow.steps.map((step, index) => {
                      const isCompleted = activeExecution && activeExecution.results[index];
                      const isCurrent = activeExecution && activeExecution.currentStep === index;

                      return (
                        <div
                          key={step.id}
                          className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                            isCompleted
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                              : isCurrent
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                              : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                            isCompleted
                              ? 'bg-green-500 text-white'
                              : isCurrent
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-300 dark:bg-gray-600'
                          }`}>
                            {isCompleted ? '✓' : index + 1}
                          </span>
                          <span>{step.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 中间：输入参数 */}
          <div className="lg:col-span-1 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <span>📝</span> 输入参数
                </h3>
                <button
                  onClick={() => setParamValues({})}
                  disabled={isExecuting}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  重置
                </button>
              </div>

              <DynamicParamForm
                params={workflow.inputParams}
                values={paramValues}
                onChange={setParamValues}
                currentProject={currentProject}
                allProjects={allProjects}
                disabled={isExecuting}
              />
            </div>
          </div>

          {/* 右侧：执行模式和结果 */}
          <div className="lg:col-span-1 p-4 overflow-y-auto">
            <div className="space-y-6">
              {/* 执行模式 */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  <span>⚙️</span> 执行模式
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  支持分步执行
                </p>

                <div className="space-y-2 mb-4">
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${
                    executeMode === 'step'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>
                    <input
                      type="radio"
                      name="executeMode"
                      value="step"
                      checked={executeMode === 'step'}
                      onChange={() => setExecuteMode('step')}
                      disabled={isExecuting}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-sm font-medium">👣 分步执行（消耗字数）</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        逐步执行，可以查看每一步的结果并进行调整
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${
                    executeMode === 'auto'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>
                    <input
                      type="radio"
                      name="executeMode"
                      value="auto"
                      checked={executeMode === 'auto'}
                      onChange={() => setExecuteMode('auto')}
                      disabled={isExecuting}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-sm font-medium">🚀 一键运行</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        自动执行所有步骤，无需人工干预
                      </div>
                    </div>
                  </label>
                </div>

                {/* 执行按钮 */}
                {!isExecuting ? (
                  <button
                    onClick={handleStartExecution}
                    disabled={isLoading}
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                               flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {executeMode === 'step' ? (
                      <>
                        <span>👣</span>
                        <span>开始分步执行</span>
                      </>
                    ) : (
                      <>
                        <span>🚀</span>
                        <span>一键运行</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-2">
                    {executeMode === 'step' && !currentStepResult && (
                      <button
                        onClick={handleNextStep}
                        className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg
                                   flex items-center justify-center gap-2"
                      >
                        <span>▶</span>
                        <span>执行当前步骤</span>
                      </button>
                    )}
                    <button
                      onClick={handleCancel}
                      className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg
                                 flex items-center justify-center gap-2"
                    >
                      <span>✕</span>
                      <span>取消执行</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 执行结果 */}
              {currentStepResult && (
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    <span>📄</span> 执行结果
                    {currentStepResult.tokensUsed && (
                      <span className="text-xs text-gray-400">
                        ({currentStepResult.tokensUsed} tokens)
                      </span>
                    )}
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-96 overflow-y-auto">
                    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                      {currentStepResult.output}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NovelWorkflowRunner;
