/**
 * 技能浏览器对话框组件
 *
 * 浏览和选择 Claude Code 技能添加到工作流
 */

import * as Dialog from '@radix-ui/react-dialog';
import { RefreshCw, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IndeterminateProgressBar } from '../common/IndeterminateProgressBar';

/** 技能引用类型 */
export interface SkillReference {
  name: string;
  description?: string;
  scope: 'user' | 'project' | 'local';
  source?: 'claude' | 'copilot' | 'codex';
}

type TabType = 'user' | 'project' | 'local';

interface SkillBrowserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  skills?: SkillReference[];
  loading?: boolean;
  error?: string | null;
  onSelectSkill: (skill: SkillReference) => void;
  onRefresh?: () => void;
}

export function SkillBrowserDialog({
  isOpen,
  onClose,
  skills = [],
  loading = false,
  error = null,
  onSelectSkill,
  onRefresh,
}: SkillBrowserDialogProps) {
  const { t } = useTranslation('ccwfstudio');
  const [selectedSkill, setSelectedSkill] = useState<SkillReference | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('user');
  const [filterText, setFilterText] = useState('');

  // 按作用域分组技能
  const userSkills = useMemo(() => skills.filter((s) => s.scope === 'user'), [skills]);
  const projectSkills = useMemo(() => skills.filter((s) => s.scope === 'project'), [skills]);
  const localSkills = useMemo(() => skills.filter((s) => s.scope === 'local'), [skills]);

  // 获取当前标签页的技能
  const currentSkills = useMemo(() => {
    switch (activeTab) {
      case 'user':
        return userSkills;
      case 'project':
        return projectSkills;
      case 'local':
        return localSkills;
      default:
        return [];
    }
  }, [activeTab, userSkills, projectSkills, localSkills]);

  // 过滤技能
  const filteredSkills = useMemo(() => {
    if (!filterText.trim()) return currentSkills;
    const lower = filterText.toLowerCase();
    return currentSkills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(lower) ||
        skill.description?.toLowerCase().includes(lower)
    );
  }, [currentSkills, filterText]);

  // 对话框打开时重置状态
  useEffect(() => {
    if (isOpen) {
      setSelectedSkill(null);
      setFilterText('');
    }
  }, [isOpen]);

  // 处理选择技能
  const handleSelectSkill = () => {
    if (selectedSkill) {
      onSelectSkill(selectedSkill);
      onClose();
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <Dialog.Content
            style={{
              backgroundColor: 'var(--editor-background)',
              border: '1px solid var(--panel-border)',
              borderRadius: '8px',
              width: '600px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              outline: 'none',
            }}
          >
            {/* 头部 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid var(--panel-border)',
              }}
            >
              <Dialog.Title
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--foreground)',
                  margin: 0,
                }}
              >
                {t('skill.browser.title', '技能浏览器')}
              </Dialog.Title>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {onRefresh && (
                  <button
                    type="button"
                    onClick={onRefresh}
                    disabled={loading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      backgroundColor: 'transparent',
                      color: 'var(--foreground)',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.5 : 1,
                    }}
                    title={t('skill.browser.refresh', '刷新')}
                  >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    backgroundColor: 'transparent',
                    color: 'var(--foreground)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* 搜索和标签页 */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--panel-border)' }}>
              {/* 搜索框 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: 'var(--input-background)',
                  border: '1px solid var(--input-border)',
                  borderRadius: '4px',
                  marginBottom: '12px',
                }}
              >
                <Search size={16} style={{ color: 'var(--description-foreground)' }} />
                <input
                  type="text"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  placeholder={t('skill.browser.searchPlaceholder', '搜索技能...')}
                  style={{
                    flex: 1,
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--input-foreground)',
                    fontSize: '13px',
                  }}
                />
              </div>

              {/* 标签页 */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['user', 'project', 'local'] as TabType[]).map((tab) => {
                  const count =
                    tab === 'user'
                      ? userSkills.length
                      : tab === 'project'
                        ? projectSkills.length
                        : localSkills.length;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: activeTab === tab ? 600 : 400,
                        backgroundColor:
                          activeTab === tab ? 'var(--button-background)' : 'transparent',
                        color:
                          activeTab === tab ? 'var(--button-foreground)' : 'var(--foreground)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      {t(`skill.scope.${tab}`, tab)} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 技能列表 */}
            <div style={{ flex: 1, overflow: 'auto', padding: '12px 20px' }}>
              {loading ? (
                <IndeterminateProgressBar label={t('skill.browser.loading', '加载技能中...')} />
              ) : error ? (
                <div
                  style={{
                    padding: '16px',
                    color: 'var(--error-foreground)',
                    backgroundColor: 'var(--input-validation-error-background)',
                    border: '1px solid var(--input-validation-error-border)',
                    borderRadius: '4px',
                  }}
                >
                  {error}
                </div>
              ) : filteredSkills.length === 0 ? (
                <div
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: 'var(--description-foreground)',
                  }}
                >
                  {filterText
                    ? t('skill.browser.noResults', '未找到匹配的技能')
                    : t('skill.browser.empty', '暂无技能')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredSkills.map((skill) => (
                    <button
                      key={`${skill.scope}-${skill.name}`}
                      type="button"
                      onClick={() => setSelectedSkill(skill)}
                      style={{
                        padding: '12px',
                        backgroundColor:
                          selectedSkill?.name === skill.name
                            ? 'var(--list-active-selection-background)'
                            : 'var(--list-inactive-selection-background)',
                        color:
                          selectedSkill?.name === skill.name
                            ? 'var(--list-active-selection-foreground)'
                            : 'var(--foreground)',
                        border: '1px solid var(--panel-border)',
                        borderRadius: '4px',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 500, marginBottom: '4px' }}>{skill.name}</div>
                      {skill.description && (
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--description-foreground)',
                          }}
                        >
                          {skill.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 底部按钮 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                padding: '16px 20px',
                borderTop: '1px solid var(--panel-border)',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--button-secondary-background)',
                  color: 'var(--button-secondary-foreground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                {t('common.cancel', '取消')}
              </button>
              <button
                type="button"
                onClick={handleSelectSkill}
                disabled={!selectedSkill}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--button-background)',
                  color: 'var(--button-foreground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: selectedSkill ? 'pointer' : 'not-allowed',
                  opacity: selectedSkill ? 1 : 0.5,
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                {t('skill.browser.select', '选择')}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default SkillBrowserDialog;
