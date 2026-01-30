/**
 * 颜色选择器组件
 *
 * 使用 Radix UI Select 的可复用颜色选择器，带颜色预览。
 * 用于 SubAgent 和 SubAgentFlow 节点。
 */

import * as Select from '@radix-ui/react-select';
import type React from 'react';
import { useTranslation } from 'react-i18next';

/** 子代理颜色定义 */
export const SUB_AGENT_COLORS = {
  blue: '#4a9eff',
  green: '#4caf50',
  orange: '#ff9800',
  purple: '#9c27b0',
  red: '#f44336',
  teal: '#009688',
  pink: '#e91e63',
  indigo: '#3f51b5',
} as const;

export type SubAgentColor = keyof typeof SUB_AGENT_COLORS;

export interface ColorPickerProps {
  value: SubAgentColor | undefined;
  onChange: (color: SubAgentColor | undefined) => void;
  disabled?: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, disabled = false }) => {
  const { t } = useTranslation('ccwfstudio');

  return (
    <div>
      <label
        htmlFor="color-select"
        style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--foreground)',
          marginBottom: '6px',
        }}
      >
        {t('properties.subAgent.color', '颜色')}
      </label>
      <Select.Root
        value={value || 'none'}
        onValueChange={(val) => onChange(val === 'none' ? undefined : (val as SubAgentColor))}
        disabled={disabled}
      >
        <Select.Trigger
          className="nodrag"
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: 'var(--input-background)',
            color: 'var(--input-foreground)',
            border: '1px solid var(--input-border)',
            borderRadius: '2px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <Select.Value placeholder={t('properties.subAgent.colorPlaceholder', '选择颜色')}>
            {value && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    backgroundColor: SUB_AGENT_COLORS[value],
                    borderRadius: '2px',
                  }}
                />
                <span style={{ textTransform: 'capitalize' }}>{value}</span>
              </div>
            )}
          </Select.Value>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position="popper"
            sideOffset={4}
            style={{
              backgroundColor: 'var(--dropdown-background)',
              border: '1px solid var(--dropdown-border)',
              borderRadius: '2px',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
              zIndex: 9999,
              minWidth: '200px',
            }}
          >
            <Select.Viewport style={{ padding: '4px' }}>
              <Select.Item
                value="none"
                style={{
                  padding: '6px 8px',
                  fontSize: '13px',
                  color: 'var(--foreground)',
                  cursor: 'pointer',
                  outline: 'none',
                  borderRadius: '2px',
                }}
              >
                <Select.ItemText>{t('properties.subAgent.colorNone', '无')}</Select.ItemText>
              </Select.Item>
              {(Object.keys(SUB_AGENT_COLORS) as SubAgentColor[]).map((colorKey) => (
                <Select.Item
                  key={colorKey}
                  value={colorKey}
                  style={{
                    padding: '6px 8px',
                    fontSize: '13px',
                    color: 'var(--foreground)',
                    cursor: 'pointer',
                    outline: 'none',
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      backgroundColor: SUB_AGENT_COLORS[colorKey],
                      borderRadius: '2px',
                    }}
                  />
                  <Select.ItemText>
                    <span style={{ textTransform: 'capitalize' }}>{colorKey}</span>
                  </Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      <div
        style={{
          fontSize: '11px',
          color: 'var(--description-foreground)',
          marginTop: '4px',
        }}
      >
        {t('properties.subAgent.colorHelp', '选择一个颜色来区分此子代理')}
      </div>
    </div>
  );
};
