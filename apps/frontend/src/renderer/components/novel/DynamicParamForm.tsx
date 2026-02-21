/**
 * DynamicParamForm - 动态参数表单组件
 *
 * 根据工作流的 inputParams 定义动态渲染表单字段
 * 支持多种输入类型：文本、多行文本、下拉选择、书籍选择、章节选择等
 */

import React, { useCallback, useMemo } from 'react';
import type { WorkflowInputParam, NovelProject } from '../../../shared/types/novel';

interface DynamicParamFormProps {
  params: WorkflowInputParam[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  currentProject?: NovelProject | null;
  allProjects?: NovelProject[];
  disabled?: boolean;
}

export const DynamicParamForm: React.FC<DynamicParamFormProps> = ({
  params,
  values,
  onChange,
  currentProject,
  allProjects = [],
  disabled = false
}) => {
  // 使用 useCallback 优化性能，避免不必要的重渲染
  const handleChange = useCallback((name: string, value: unknown) => {
    onChange({ ...values, [name]: value });
  }, [values, onChange]);

  // 使用 useMemo 缓存渲染
  const renderField = useCallback((param: WorkflowInputParam) => {
    const value = values[param.name] ?? param.defaultValue ?? '';

    switch (param.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value as string}
            onChange={(e) => handleChange(param.name, e.target.value)}
            placeholder={param.placeholder}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:opacity-50 disabled:cursor-not-allowed"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value as string}
            onChange={(e) => handleChange(param.name, e.target.value)}
            placeholder={param.placeholder}
            rows={4}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:opacity-50 disabled:cursor-not-allowed resize-y"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value as number}
            onChange={(e) => {
              const nextValue = e.target.value === '' ? '' : e.target.valueAsNumber;
              handleChange(param.name, Number.isNaN(nextValue as number) ? '' : nextValue);
            }}
            placeholder={param.placeholder}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:opacity-50 disabled:cursor-not-allowed"
          />
        );

      case 'select':
        return (
          <select
            value={value as string}
            onChange={(e) => handleChange(param.name, e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">请选择...</option>
            {param.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case 'book':
        return (
          <select
            value={value as string}
            onChange={(e) => handleChange(param.name, e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">请选择书籍...</option>
            {allProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        );

      case 'chapter': {
        const selectedBookId = values['book'] as string;
        const selectedBook = allProjects.find(p => p.id === selectedBookId) || currentProject;

        if (!selectedBook) {
          return (
            <div className="text-sm text-gray-500 dark:text-gray-400 italic p-2 bg-gray-50 dark:bg-gray-800 rounded">
              请先选择书籍以启用章节关联功能
            </div>
          );
        }

        return (
          <div className="space-y-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              已选择 {Array.isArray(value) ? value.length : 0} 章
            </div>
            <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-2 space-y-1">
              {selectedBook.chapters?.map((chapter) => (
                <label
                  key={chapter.id}
                  className="flex items-center space-x-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={Array.isArray(value) && value.includes(chapter.id)}
                    onChange={(e) => {
                      const currentValues = Array.isArray(value) ? value : [];
                      const newValues = e.target.checked
                        ? [...currentValues, chapter.id]
                        : currentValues.filter((id: string) => id !== chapter.id);
                      handleChange(param.name, newValues);
                    }}
                    disabled={disabled}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {chapter.title || `第${chapter.id}章`}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      }

      case 'character': {
        const charBookId = values['book'] as string;
        const charBook = allProjects.find(p => p.id === charBookId) || currentProject;

        if (!charBook?.characters?.length) {
          return (
            <div className="text-sm text-gray-500 dark:text-gray-400 italic p-2 bg-gray-50 dark:bg-gray-800 rounded">
              请先选择书籍以启用角色选择功能
            </div>
          );
        }

        return (
          <div className="space-y-2">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              已选择 {Array.isArray(value) ? value.length : 0} 个角色
            </div>
            <div className="max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-2 space-y-1">
              {charBook.characters.map((char) => (
                <label
                  key={char.id}
                  className="flex items-center space-x-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={Array.isArray(value) && value.includes(char.id)}
                    onChange={(e) => {
                      const currentValues = Array.isArray(value) ? value : [];
                      const newValues = e.target.checked
                        ? [...currentValues, char.id]
                        : currentValues.filter((id: string) => id !== char.id);
                      handleChange(param.name, newValues);
                    }}
                    disabled={disabled}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {char.name || '未命名角色'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      }

      case 'term':
        // 词条卡 - 暂时用文本输入替代
        return (
          <textarea
            value={value as string}
            onChange={(e) => handleChange(param.name, e.target.value)}
            placeholder={param.placeholder || '请输入相关词条（多个用逗号分隔）'}
            rows={2}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:opacity-50 disabled:cursor-not-allowed resize-y"
          />
        );

      case 'memo':
        // 备忘录 - 暂时用文本输入替代
        return (
          <textarea
            value={value as string}
            onChange={(e) => handleChange(param.name, e.target.value)}
            placeholder={param.placeholder || '请输入备忘录内容...'}
            rows={3}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:opacity-50 disabled:cursor-not-allowed resize-y"
          />
        );

      default:
        return (
          <input
            type="text"
            value={value as string}
            onChange={(e) => handleChange(param.name, e.target.value)}
            placeholder={param.placeholder}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:opacity-50 disabled:cursor-not-allowed"
          />
        );
    }
  }, [values, allProjects, currentProject, disabled, handleChange]);

  return (
    <div className="space-y-4">
      {params.map((param) => (
        <div key={param.name} className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">
              {param.label}
            </code>
            {param.required && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>

          {param.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {param.description}
            </p>
          )}

          {renderField(param)}
        </div>
      ))}
    </div>
  );
};

export default DynamicParamForm;
