# 侧边栏折叠功能 - 实施计划

## 📋 需求概述

为 Auto-Claude 项目的侧边栏添加折叠/展开功能：

- **展开状态**: 256px 宽度（显示完整导航项）
- **折叠状态**: 60px 宽度（仅显示图标）
- **状态持久化**: 使用 localStorage 保存用户偏好
- **平滑动画**: 300ms 过渡动画
- **可访问性**: 折叠时显示 Tooltip 提示

---

## 🎯 核心文件

### 需要创建的文件
1. `apps/frontend/src/renderer/stores/sidebar-store.ts`
   - 侧边栏状态管理（Zustand）

### 需要修改的文件
2. `apps/frontend/src/renderer/components/Sidebar.tsx`
   - 主要修改文件：折叠逻辑、条件渲染、样式调整

---

## 📝 详细步骤

### 步骤 1: 创建侧边栏 Store

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

---

### 步骤 2: 修改 Sidebar.tsx 组件

#### 2.1 导入新依赖

在文件顶部添加：

```typescript
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSidebarStore } from '../stores/sidebar-store';
```

#### 2.2 在组件中使用状态

```typescript
export function Sidebar({ onSettingsClick, onNewTaskClick, activeView, onViewChange }: SidebarProps) {
  const { t } = useTranslation(['navigation', 'dialogs', 'common']);
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);
  const toggleSidebar = useSidebarStore((state) => state.toggle);
  // ... 现有代码
```

#### 2.3 修改根容器宽度（约第 300 行）

找到：
```tsx
<div className="flex h-full w-64 flex-col bg-sidebar border-r border-border">
```

替换为：
```tsx
<div className={cn(
  "flex h-full flex-col bg-sidebar border-r border-border transition-all duration-300 ease-in-out",
  isCollapsed ? "w-[60px]" : "w-64"
)}>
```

#### 2.4 修改 Header 区域（约第 300-327 行）

找到：
```tsx
<div className="electron-drag flex h-14 items-center px-4 pt-6">
  <span className="electron-no-drag text-lg font-bold text-primary">
    Auto Claude
  </span>
</div>
```

替换为：
```tsx
<div className={cn(
  "electron-drag flex h-14 items-center",
  isCollapsed ? "justify-center px-2 pt-6" : "px-4 pt-6"
)}>
  {!isCollapsed ? (
    <span className="electron-no-drag text-lg font-bold text-primary">
      Auto Claude
    </span>
  ) : (
    <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
      <span className="text-primary font-bold text-sm">AC</span>
    </div>
  )}
</div>
```

#### 2.5 修改 renderNavItem 函数（约第 272-298 行）

完全替换 `renderNavItem` 函数：

```tsx
const renderNavItem = (item: NavItem) => {
  const isActive = activeView === item.id;
  const Icon = item.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          key={item.id}
          onClick={() => handleNavClick(item.id)}
          disabled={!selectedProjectId}
          aria-keyshortcuts={item.shortcut}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
            'hover:bg-accent hover:text-accent-foreground',
            'disabled:pointer-events-none disabled:opacity-50',
            isActive && 'bg-accent text-accent-foreground',
            isCollapsed && 'justify-center px-2'
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />

          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">{t(item.labelKey)}</span>
              {item.shortcut && (
                <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded-md border border-border bg-secondary px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
                  {item.shortcut}
                </kbd>
              )}
            </>
          )}
        </button>
      </TooltipTrigger>

      {isCollapsed && (
        <TooltipContent side="right">
          <div className="flex items-center gap-2">
            <span>{t(item.labelKey)}</span>
            {item.shortcut && (
              <kbd className="ml-2 rounded border border-border px-1 font-mono text-xs">
                {item.shortcut}
              </kbd>
            )}
          </div>
        </TooltipContent>
      )}
    </Tooltip>
  );
};
```

#### 2.6 添加折叠按钮（在 Settings 按钮上方）

在底部的按钮区域（约第 340-360 行），在 Settings 和 Help 按钮之前添加：

```tsx
{/* 折叠按钮 */}
<Tooltip>
  <TooltipTrigger asChild>
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start"
      onClick={toggleSidebar}
      aria-label={isCollapsed ? t('actions.expandSidebar') : t('actions.collapseSidebar')}
    >
      {isCollapsed ? (
        <ChevronRight className="h-4 w-4" />
      ) : (
        <>
          <ChevronLeft className="h-4 w-4" />
          <span className="ml-2">{t('actions.collapseSidebar')}</span>
        </>
      )}
    </Button>
  </TooltipTrigger>
  <TooltipContent side="top">
    {isCollapsed ? t('tooltips.expandSidebar') : t('tooltips.collapseSidebar')}
  </TooltipContent>
</Tooltip>

<Separator />

{/* Settings and Help 按钮保持不变，但需要添加 Tooltip */}
```

#### 2.7 修改 Settings 和 Help 按钮（约第 340-360 行）

找到 Settings 和 Help 按钮的代码，添加 Tooltip 和条件样式：

```tsx
<div className={cn(
  "flex items-center gap-2",
  isCollapsed && "flex-col gap-1"
)}>
  {/* Settings */}
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size={isCollapsed ? "icon" : "sm"}
        className={cn(
          "gap-2",
          isCollapsed ? "w-full" : "flex-1 justify-start"
        )}
        onClick={onSettingsClick}
      >
        <Settings className="h-4 w-4" />
        {!isCollapsed && t('actions.settings')}
      </Button>
    </TooltipTrigger>
    {isCollapsed && (
      <TooltipContent side="right">{t('tooltips.settings')}</TooltipContent>
    )}
  </Tooltip>

  {/* Help */}
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size={isCollapsed ? "icon" : "sm"}
        className={cn(
          "gap-2",
          isCollapsed ? "w-full" : "flex-1 justify-start"
        )}
        onClick={onHelpClick}
      >
        <HelpCircle className="h-4 w-4" />
        {!isCollapsed && t('actions.help')}
      </Button>
    </TooltipTrigger>
    {isCollapsed && (
      <TooltipContent side="right">{t('tooltips.help')}</TooltipContent>
    )}
  </Tooltip>
</div>
```

#### 2.8 修改 New Task 按钮（约第 360-380 行）

找到 New Task 按钮，调整样式：

```tsx
<Button
  className={cn(
    "w-full",
    isCollapsed && "justify-center px-2"
  )}
  onClick={onNewTaskClick}
  disabled={!selectedProjectId || !selectedProject?.autoBuildPath}
>
  <Plus className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
  {!isCollapsed && t('actions.newTask')}
</Button>
```

#### 2.9 添加键盘快捷键（可选）

在现有的键盘快捷键 useEffect 之后添加：

```tsx
useEffect(() => {
  const handleSidebarToggle = (e: KeyboardEvent) => {
    // Cmd/Ctrl + B 切换侧边栏
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      toggleSidebar();
    }
  };

  window.addEventListener('keydown', handleSidebarToggle);
  return () => window.removeEventListener('keydown', handleSidebarToggle);
}, [toggleSidebar]);
```

---

### 步骤 3: 添加国际化翻译（可选）

在国际化文件中添加新的翻译键：

**文件**: `locales/en/navigation.json`（或相应位置）

```json
{
  "actions": {
    "collapseSidebar": "Collapse Sidebar",
    "expandSidebar": "Expand Sidebar"
  },
  "tooltips": {
    "collapseSidebar": "Collapse sidebar (⌘B)",
    "expandSidebar": "Expand sidebar (⌘B)"
  }
}
```

**文件**: `locales/zh/navigation.json`

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

---

## ✅ 验证测试

### 功能测试
- [ ] 点击折叠按钮，侧边栏收缩到 60px
- [ ] 点击展开按钮，侧边栏恢复到 256px
- [ ] 折叠状态下，所有文本和快捷键标签隐藏
- [ ] 折叠状态下，鼠标悬停显示 Tooltip
- [ ] 动画流畅，无卡顿

### 持久化测试
- [ ] 折叠侧边栏后刷新页面，状态保持折叠
- [ ] 展开侧边栏后刷新页面，状态保持展开

### 可访问性测试
- [ ] 折叠状态下，所有按钮可通过 Tooltip 识别
- [ ] 键盘导航正常（Tab 键）
- [ ] 屏幕阅读器能正确读取 aria-label

### 快捷键测试（如果实现）
- [ ] 按 Cmd/Ctrl + B 可以切换侧边栏状态

---

## 🎨 设计亮点

1. **平滑动画**: 使用 `transition-all duration-300 ease-in-out` 实现流畅的宽度变化
2. **智能布局**: 折叠时自动调整按钮布局（横向 → 纵向）
3. **完整提示**: 折叠时通过 Tooltip 显示完整的导航项标签
4. **状态持久化**: 刷新页面后保持用户的折叠偏好
5. **可访问性**: 完整的 aria-label 和键盘支持

---

## 📊 关键代码位置

| 操作 | 文件 | 行号范围 | 说明 |
|------|------|---------|------|
| 创建 Store | `sidebar-store.ts` | 全文 | 新建文件 |
| 修改容器宽度 | `Sidebar.tsx` | ~300 | 根容器 div |
| 修改 Header | `Sidebar.tsx` | ~300-327 | Header 区域 |
| 修改导航项 | `Sidebar.tsx` | ~272-298 | renderNavItem 函数 |
| 添加折叠按钮 | `Sidebar.tsx` | ~340-360 | 底部按钮区域 |
| 修改底部按钮 | `Sidebar.tsx` | ~340-380 | Settings/Help/NewTask |

---

## 🚀 实施顺序

1. **创建 sidebar-store.ts**（5 分钟）
2. **修改 Sidebar.tsx**（20 分钟）
   - 导入依赖
   - 添加状态使用
   - 修改容器宽度
   - 修改 Header
   - 修改导航项渲染
   - 添加折叠按钮
   - 修改底部按钮
3. **测试功能**（10 分钟）
4. **添加翻译（可选）**（5 分钟）

**总计**: 约 40 分钟

---

## ⚠️ 注意事项

1. **避免破坏现有功能**: 只修改样式和条件渲染，不改变业务逻辑
2. **保持 Tooltip 提供者**: 确保 `TooltipProvider` 包裹整个组件
3. **测试不同屏幕尺寸**: 在小屏幕和大屏幕上测试折叠效果
4. **检查快捷键冲突**: 确保 Cmd/Ctrl + B 不与其他功能冲突
5. **样式一致性**: 使用现有的 Tailwind 类名，保持设计系统一致性

---

## 🎯 成功标准

✅ 侧边栏可以在展开（256px）和折叠（60px）状态间平滑切换
✅ 折叠状态下只显示图标，展开时显示完整内容
✅ 状态在页面刷新后保持
✅ 所有交互都有适当的 Tooltip 提示
✅ 动画流畅，无卡顿或视觉闪烁
