# 侧边栏折叠功能 - 上游同步恢复指南

> **功能描述**: 侧边栏折叠/展开功能，支持状态持久化和平滑动画
> **实施日期**: 2025-01-17
> **最后更新**: 2025-01-27
> **目的**: 记录当前实现，供上游同步后恢复功能使用

---

## 功能规格

| 属性 | 值 |
|------|-----|
| **展开宽度** | 256px (`w-64`) |
| **折叠宽度** | 64px (`w-16`) |
| **动画时长** | 300ms (`duration-300`) |
| **状态存储** | Settings Store (`sidebarCollapsed`) |
| **快捷键** | Cmd/Ctrl + B |

---

## 当前实现结构

### 1. 状态存储

**文件**: `apps/frontend/src/renderer/stores/sidebar-store.ts`

```typescript
import { create } from 'zustand';

const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';

const loadInitialState = (): boolean => {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
};

interface SidebarState {
  isCollapsed: boolean;
  toggle: () => void;
  collapse: () => void;
  expand: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: loadInitialState(),

  toggle: () => set((state) => {
    const newState = !state.isCollapsed;
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState));
    } catch (error) {
      console.error('Failed to persist sidebar state:', error);
    }
    return { isCollapsed: newState };
  }),

  collapse: () => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'true');
    } catch (error) {
      console.error('Failed to persist sidebar state:', error);
    }
    set({ isCollapsed: true });
  },

  expand: () => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'false');
    } catch (error) {
      console.error('Failed to persist sidebar state:', error);
    }
    set({ isCollapsed: false });
  },

  setCollapsed: (collapsed) => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch (error) {
      console.error('Failed to persist sidebar state:', error);
    }
    set({ isCollapsed: collapsed });
  },
}));
```

> **注意**: 此文件为新增文件，上游仓库中不存在。同步后需重新添加。

---

### 2. 类型定义

**文件**: `apps/frontend/src/shared/types/settings.ts`

在 `AppSettings` 接口中添加：

```typescript
export interface AppSettings {
  // ... 其他属性
  sidebarCollapsed?: boolean;
}
```

---

### 3. Sidebar 组件修改

**文件**: `apps/frontend/src/renderer/components/Sidebar.tsx`

#### 3.1 新增导入

```typescript
import { PanelLeft, PanelLeftClose } from 'lucide-react';
// ... 其他导入
import { cn } from '../lib/utils';
```

#### 3.2 状态读取

在组件函数体内添加：

```typescript
// 从 settings 读取折叠状态
const isCollapsed = settings.sidebarCollapsed ?? false;

const toggleSidebar = () => {
  saveSettings({ sidebarCollapsed: !isCollapsed });
};
```

#### 3.3 容器宽度动态类

找到根容器 `div`（约第 365 行）：

```tsx
<div className={cn(
  "flex h-full flex-col bg-sidebar border-r border-border transition-all duration-300",
  isCollapsed ? "w-16" : "w-64"
)}>
```

#### 3.4 Header 区域

```tsx
<div className={cn(
  "electron-drag flex h-14 items-center pt-6 transition-all duration-300",
  isCollapsed ? "justify-center px-2" : "px-4"
)}>
  {!isCollapsed && (
    <span className="electron-no-drag text-lg font-bold text-primary">Auto Claude</span>
  )}
</div>
```

#### 3.5 折叠按钮

在导航区域顶部添加（约第 395 行）：

```tsx
{/* Collapse Toggle */}
<Tooltip>
  <TooltipTrigger asChild>
    <button
      onClick={toggleSidebar}
      className={cn(
        'flex w-full items-center rounded-lg text-sm transition-all duration-200 mb-3',
        'hover:bg-accent hover:text-accent-foreground',
        isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
      )}
    >
      {isCollapsed ? (
        <PanelLeft className="h-4 w-4 shrink-0" />
      ) : (
        <PanelLeftClose className="h-4 w-4 shrink-0" />
      )}
      {!isCollapsed && (
        <span className="flex-1 text-left">{t('actions.collapseSidebar')}</span>
      )}
    </button>
  </TooltipTrigger>
  {isCollapsed && (
    <TooltipContent side="right">
      {t('actions.expandSidebar')}
    </TooltipContent>
  )}
</Tooltip>
```

#### 3.6 导航项条件渲染

修改 `renderNavItem` 函数中的按钮类名（约第 305 行）：

```tsx
className={cn(
  'flex w-full items-center rounded-lg text-sm transition-all duration-200',
  'hover:bg-accent hover:text-accent-foreground',
  'disabled:pointer-events-none disabled:opacity-50',
  isActive && 'bg-accent text-accent-foreground',
  isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
)}
```

并在函数末尾添加 Tooltip 包装逻辑（折叠状态下）：

```tsx
// Wrap in tooltip when collapsed
if (isCollapsed) {
  return (
    <Tooltip key={item.id}>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">
        <span>{t(item.labelKey)}</span>
        {item.shortcut && (
          <kbd className="ml-2 rounded border border-border bg-secondary px-1 font-mono text-[10px]">
            {item.shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

return button;
```

#### 3.7 底部按钮区域

Settings 和 Help 按钮（约第 445 行）：

```tsx
<div className={cn(
  "flex items-center",
  isCollapsed ? "flex-col gap-1" : "gap-2"
)}>
  {/* Settings */}
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size={isCollapsed ? "icon" : "sm"}
        className={isCollapsed ? "" : "flex-1 justify-start gap-2"}
        onClick={onSettingsClick}
      >
        <Settings className="h-4 w-4" />
        {!isCollapsed && t('actions.settings')}
      </Button>
    </TooltipTrigger>
    <TooltipContent side={isCollapsed ? "right" : "top"}>{t('tooltips.settings')}</TooltipContent>
  </Tooltip>

  {/* Help */}
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => window.open('https://github.com/AndyMik90/Auto-Claude/issues', '_blank')}
        aria-label={t('tooltips.help')}
      >
        <HelpCircle className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent side={isCollapsed ? "right" : "top"}>{t('tooltips.help')}</TooltipContent>
  </Tooltip>
</div>
```

New Task 按钮（约第 470 行）：

```tsx
<Button
  className="w-full"
  size={isCollapsed ? "icon" : "default"}
  onClick={onNewTaskClick}
  disabled={!selectedProjectId || !selectedProject?.autoBuildPath}
>
  <Plus className={isCollapsed ? "h-4 w-4" : "mr-2 h-4 w-4"} />
  {!isCollapsed && t('actions.newTask')}
</Button>
```

---

### 4. 翻译键

#### 英文 (`apps/frontend/src/shared/i18n/locales/en/navigation.json`)

在 `actions` 对象中添加：
```json
{
  "actions": {
    "collapseSidebar": "Collapse Sidebar",
    "expandSidebar": "Expand Sidebar",
    // ... 其他
  },
  "tooltips": {
    "collapseSidebar": "Collapse sidebar (⌘B)",
    "expandSidebar": "Expand sidebar (⌘B)",
    // ... 其他
  }
}
```

#### 简体中文 (`apps/frontend/src/shared/i18n/locales/zh-CN/navigation.json`)

```json
{
  "actions": {
    "collapseSidebar": "折叠侧边栏",
    "expandSidebar": "展开侧边栏"
  },
  "tooltips": {
    "collapseSidebar": "折叠侧边栏 (⌘B)",
    "expandSidebar": "展开侧边栏 (⌘B)"
  }
}
```

#### 法文 (`apps/frontend/src/shared/i18n/locales/fr/navigation.json`)

```json
{
  "actions": {
    "collapseSidebar": "Réduire la barre latérale",
    "expandSidebar": "Développer la barre latérale"
  }
}
```

---

## 上游同步后恢复步骤

### 第一步：恢复 sidebar-store.ts

此文件上游不存在，需完全重建：

```bash
# 创建文件
cat > apps/frontend/src/renderer/stores/sidebar-store.ts << 'EOF'
import { create } from 'zustand';

const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';

const loadInitialState = (): boolean => {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
};

interface SidebarState {
  isCollapsed: boolean;
  toggle: () => void;
  collapse: () => void;
  expand: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: loadInitialState(),

  toggle: () => set((state) => {
    const newState = !state.isCollapsed;
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState));
    } catch (error) {
      console.error('Failed to persist sidebar state:', error);
    }
    return { isCollapsed: newState };
  }),

  collapse: () => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'true');
    } catch (error) {
      console.error('Failed to persist sidebar state:', error);
    }
    set({ isCollapsed: true });
  },

  expand: () => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'false');
    } catch (error) {
      console.error('Failed to persist sidebar state:', error);
    }
    set({ isCollapsed: false });
  },

  setCollapsed: (collapsed) => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch (error) {
      console.error('Failed to persist sidebar state:', error);
    }
    set({ isCollapsed: collapsed });
  },
}));
EOF
```

### 第二步：修改 settings.ts 类型定义

在 `apps/frontend/src/shared/types/settings.ts` 的 `AppSettings` 接口中添加：

```typescript
sidebarCollapsed?: boolean;
```

### 第三步：修改 Sidebar.tsx 组件

按照上文 "3. Sidebar 组件修改" 中的代码块进行修改。

关键修改点：
1. 添加 `PanelLeft`, `PanelLeftClose` 图标导入
2. 添加 `isCollapsed` 状态读取和 `toggleSidebar` 函数
3. 修改容器宽度类名
4. 添加折叠按钮
5. 修改导航项和底部按钮的条件渲染

### 第四步：添加翻译键

在各语言的 `navigation.json` 中添加相应的翻译键。

---

## 验证清单

- [ ] 点击折叠按钮，侧边栏收缩到 64px
- [ ] 点击展开按钮，侧边栏恢复到 256px
- [ ] 折叠状态下鼠标悬停显示 Tooltip
- [ ] 动画流畅（300ms 过渡）
- [ ] 状态刷新后保持
- [ ] 键盘快捷键 Cmd/Ctrl + B 可用

---

## 关键文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `stores/sidebar-store.ts` | 新建 | 上游不存在，需重建 |
| `components/Sidebar.tsx` | 修改 | 核心组件，多处修改 |
| `types/settings.ts` | 修改 | 添加 `sidebarCollapsed` 属性 |
| `i18n/locales/en/navigation.json` | 修改 | 添加英文翻译 |
| `i18n/locales/zh-CN/navigation.json` | 修改 | 添加中文翻译 |
| `i18n/locales/fr/navigation.json` | 修改 | 添加法文翻译 |

---

**文档维护**: 如功能实现有变更，请及时更新本文档。
