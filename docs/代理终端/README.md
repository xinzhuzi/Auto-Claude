# 代理终端标签页布局 - 上游同步恢复指南

> **功能描述**: 代理终端从网格布局改造为浏览器标签页式布局
> **实施日期**: 2026-01-16
> **最后更新**: 2025-01-27
> **目的**: 记录当前实现，供上游同步后恢复功能使用

---

## 功能规格

| 属性 | 值 |
|------|-----|
| **布局方式** | 标签页式（替代原来的3x4网格） |
| **标签页宽度** | 120px-200px（自适应） |
| **标签页高度** | 40px (`h-10`) |
| **动画时长** | 150-300ms |
| **拖拽库** | @dnd-kit/core, @dnd-kit/sortable |
| **状态存储** | terminal-store.ts |

---

## 改造前后对比

| 维度 | 改造前 | 改造后 |
|-----|-------|-------|
| **布局方式** | 网格布局（3x4，最多12个） | 标签页布局（无限） |
| **终端显示** | 同时显示多个（分屏） | 单个占满内容区域 |
| **切换方式** | 点击终端 | 标签页 + 快捷键 |
| **重命名** | 不支持 | 双击编辑 |
| **拖拽** | 网格内拖拽 | 标签页拖拽排序 |

---

## 当前实现结构

### 1. 组件文件结构

```
apps/frontend/src/renderer/components/
├── TerminalGrid.tsx           (重构 - 主容器)
└── terminal/
    ├── TerminalTab.tsx        (新增 - 单个标签页)
    ├── SortableTerminalTab.tsx (新增 - 可拖拽标签页)
    └── TerminalTabBar.tsx     (新增 - 标签页导航栏)
```

### 2. 组件关系图

```
TerminalGrid (主容器)
├── Toolbar (h-10)
│   ├── TerminalTabBar (标签页栏)
│   │   ├── ScrollArea (横向滚动)
│   │   │   └── SortableContext
│   │   │       └── SortableTerminalTab x N
│   │   │           └── TerminalTab (实际标签页)
│   │   └── Button (+ 新建终端)
│   └── Action Buttons (右侧按钮组)
│       ├── Terminal count indicator
│       ├── History dropdown
│       ├── Invoke Claude All
│       └── Files toggle
└── Content Area
    ├── Terminal x N (只渲染激活的)
    └── FileExplorerPanel (可选)
```

---

## 核心代码实现

### 1. TerminalTab.tsx

**文件**: `apps/frontend/src/renderer/components/terminal/TerminalTab.tsx`

```typescript
import { useState, useEffect, memo } from 'react';
import { Sparkles, GitBranch, X } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import type { Terminal } from '../../stores/terminal-store';

interface TerminalTabProps {
  terminal: Terminal;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  onRename: (newName: string) => void;
  dragHandleProps?: any;
  isDragging?: boolean;
}

export const TerminalTab = memo(function TerminalTab({
  terminal,
  isActive,
  onSelect,
  onClose,
  onRename,
  dragHandleProps,
  isDragging = false,
}: TerminalTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(terminal.title);

  // 同步外部更新
  useEffect(() => {
    if (!isEditing) {
      setEditName(terminal.title);
    }
  }, [terminal.title, isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editName.trim() && editName !== terminal.title) {
      onRename(editName.trim());
    } else {
      setEditName(terminal.title);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditing(false);
      setEditName(terminal.title);
    }
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2 border-r border-border cursor-pointer",
        "hover:bg-accent/50 transition-all duration-200 ease-in-out min-w-[120px] max-w-[200px]",
        "relative",
        isActive && "bg-background border-b-2 border-b-primary shadow-sm",
        isDragging && "opacity-50 scale-95"
      )}
      onClick={onSelect}
      {...dragHandleProps}
    >
      {/* 激活指示线 */}
      {isActive && (
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-primary animate-in fade-in slide-in-from-bottom-1 duration-200" />
      )}

      {/* 状态指示器 */}
      <div className="flex items-center gap-1 shrink-0">
        {terminal.isClaudeMode && (
          <Sparkles className="h-3 w-3 text-primary animate-pulse" />
        )}
        {terminal.worktreeConfig && (
          <GitBranch className="h-3 w-3 text-info" />
        )}
      </div>

      {/* 终端名称 - 可编辑 */}
      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="flex-1 text-sm bg-transparent border-none outline-none focus:ring-1 focus:ring-primary rounded px-1 animate-in fade-in duration-150"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className="flex-1 text-sm truncate transition-colors duration-150"
          onDoubleClick={handleDoubleClick}
          title={terminal.title}
        >
          {terminal.title}
        </span>
      )}

      {/* 关闭按钮 */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-4 w-4 p-0 shrink-0 hover:bg-destructive/20 transition-all duration-150",
          "opacity-0 group-hover:opacity-100",
          isActive && "opacity-60 group-hover:opacity-100"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
});
```

> **关键特性**:
> - 使用 `React.memo` 优化性能
> - 双击进入编辑模式
> - Enter 保存，Escape 取消
> - Claude 模式显示 Sparkles 图标（脉冲动画）
> - Worktree 显示 GitBranch 图标

---

### 2. SortableTerminalTab.tsx

**文件**: `apps/frontend/src/renderer/components/terminal/SortableTerminalTab.tsx`

```typescript
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TerminalTab } from './TerminalTab';
import type { Terminal } from '../../stores/terminal-store';

interface SortableTerminalTabProps {
  terminal: Terminal;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  onRename: (newName: string) => void;
}

export function SortableTerminalTab({
  terminal,
  isActive,
  onSelect,
  onClose,
  onRename,
}: SortableTerminalTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: terminal.id,
    data: {
      type: 'terminal-tab',
      terminalId: terminal.id,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TerminalTab
        terminal={terminal}
        isActive={isActive}
        onSelect={onSelect}
        onClose={onClose}
        onRename={onRename}
        dragHandleProps={listeners}
        isDragging={isDragging}
      />
    </div>
  );
}
```

---

### 3. TerminalTabBar.tsx

**文件**: `apps/frontend/src/renderer/components/terminal/TerminalTabBar.tsx`

```typescript
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { SortableTerminalTab } from './SortableTerminalTab';
import type { Terminal } from '../../stores/terminal-store';

interface TerminalTabBarProps {
  terminals: Terminal[];
  activeTerminalId: string | null;
  onTabChange: (id: string) => void;
  onTabClose: (id: string) => void;
  onTabRename: (id: string, newName: string) => void;
  onNewTerminal: () => void;
  canAddTerminal: boolean;
}

export function TerminalTabBar({
  terminals,
  activeTerminalId,
  onTabChange,
  onTabClose,
  onTabRename,
  onNewTerminal,
  canAddTerminal,
}: TerminalTabBarProps) {
  const terminalIds = terminals.map(t => t.id);

  return (
    <div className="flex items-center border-b border-border bg-card/30 h-10 backdrop-blur-sm">
      {/* 横向滚动的标签页 */}
      <ScrollArea className="flex-1">
        <div className="flex items-center h-10">
          <SortableContext items={terminalIds} strategy={horizontalListSortingStrategy}>
            {terminals.map(terminal => (
              <SortableTerminalTab
                key={terminal.id}
                terminal={terminal}
                isActive={terminal.id === activeTerminalId}
                onSelect={() => onTabChange(terminal.id)}
                onClose={() => onTabClose(terminal.id)}
                onRename={(newName) => onTabRename(terminal.id, newName)}
              />
            ))}
          </SortableContext>
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>

      {/* 新建终端按钮 */}
      <div className="shrink-0 border-l border-border px-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-primary/10 transition-colors duration-150"
          onClick={onNewTerminal}
          disabled={!canAddTerminal}
          title="New Terminal (Ctrl+T)"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

---

### 4. TerminalGrid.tsx 修改要点

**文件**: `apps/frontend/src/renderer/components/TerminalGrid.tsx`

#### 4.1 新增导入

```typescript
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Sparkles, Grid2X2, FolderTree, File, Folder, History, ChevronDown, Loader2, TerminalSquare, Plus } from 'lucide-react';
import { Terminal } from './Terminal';
import { TerminalTabBar } from './terminal/TerminalTabBar';
```

#### 4.2 移除内容

- **移除**: `react-resizable-panels` 相关导入和代码
- **移除**: 网格布局计算逻辑 (`gridLayout`, `terminalRows`)
- **移除**: "X / 12 terminals" 提示文本

#### 4.3 新增状态

```typescript
// 拖拽状态
const [activeDragData, setActiveDragData] = React.useState<{
  path: string;
  name: string;
  isDirectory: boolean;
} | null>(null);

const [draggingTerminalId, setDraggingTerminalId] = React.useState<string | null>(null);
const draggingTerminal = terminals.find(t => t.id === draggingTerminalId);
```

#### 4.4 快捷键实现

```typescript
useEffect(() => {
  if (!isActive) return;

  const handleKeyDown = (e: KeyboardEvent) => {
    const isMod = e.ctrlKey || e.metaKey;

    // Ctrl+T or Cmd+T for new terminal
    if (isMod && e.key === 't') {
      e.preventDefault();
      if (canAddTerminal(projectPath)) {
        addTerminal(projectPath, projectPath);
      }
      return;
    }

    // Ctrl+W or Cmd+W to close active terminal
    if (isMod && e.key === 'w' && activeTerminalId) {
      e.preventDefault();
      handleCloseTerminal(activeTerminalId);
      return;
    }

    // Ctrl/Cmd + Tab: 切换到下一个终端
    if (isMod && e.key === 'Tab' && !e.shiftKey && terminals.length > 1) {
      e.preventDefault();
      const currentIndex = terminals.findIndex(t => t.id === activeTerminalId);
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % terminals.length;
      setActiveTerminal(terminals[nextIndex].id);
      return;
    }

    // Ctrl/Cmd + Shift + Tab: 切换到上一个终端
    if (isMod && e.key === 'Tab' && e.shiftKey && terminals.length > 1) {
      e.preventDefault();
      const currentIndex = terminals.findIndex(t => t.id === activeTerminalId);
      const prevIndex = currentIndex === -1 ? terminals.length - 1 : (currentIndex - 1 + terminals.length) % terminals.length;
      setActiveTerminal(terminals[prevIndex].id);
      return;
    }

    // Ctrl/Cmd + 1-9: 切换到指定终端
    if (isMod && /^[1-9]$/.test(e.key)) {
      e.preventDefault();
      const index = parseInt(e.key) - 1;
      if (index < terminals.length) {
        setActiveTerminal(terminals[index].id);
      }
      return;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [isActive, addTerminal, canAddTerminal, projectPath, activeTerminalId, handleCloseTerminal, terminals, setActiveTerminal]);
```

#### 4.5 拖拽处理

```typescript
// 拖拽传感器配置
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // 8px movement required before drag starts
    },
  }),
  useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  })
);

// 拖拽开始
const handleDragStart = useCallback((event: DragStartEvent) => {
  const data = event.active.data.current as {
    type: string;
    path?: string;
    name?: string;
    isDirectory?: boolean;
    terminalId?: string;
  } | undefined;

  if (data?.type === 'file' && data.path && data.name !== undefined) {
    setActiveDragData({
      path: data.path,
      name: data.name,
      isDirectory: data.isDirectory ?? false
    });
  } else if (data?.type === 'terminal-tab') {
    setDraggingTerminalId(event.active.id.toString());
  }
}, []);

// 拖拽结束
const handleDragEnd = useCallback((event: DragEndEvent) => {
  const { active, over } = event;
  const activeData = active.data.current as { type?: string; path?: string } | undefined;

  // Clear drag states
  setActiveDragData(null);
  setDraggingTerminalId(null);

  if (!over) return;

  // Handle terminal tab reordering
  if (activeData?.type === 'terminal-tab') {
    const activeId = active.id.toString();
    const overId = over.id.toString();

    if (activeId !== overId && terminals.some(t => t.id === overId)) {
      reorderTerminals(activeId, overId);
    }
    return;
  }

  // Handle file drop on terminal
  const overId = over.id.toString();
  let terminalId: string | null = null;

  if (overId.startsWith('terminal-')) {
    terminalId = overId.replace('terminal-', '');
  } else if (terminals.some(t => t.id === overId)) {
    terminalId = overId;
  }

  if (terminalId && activeData?.path) {
    const quotedPath = activeData.path.includes(' ') ? `"${activeData.path}"` : activeData.path;
    window.electronAPI.sendTerminalInput(terminalId, quotedPath + ' ');
  }
}, [reorderTerminals, terminals]);
```

#### 4.6 重命名处理

```typescript
const handleRenameTerminal = useCallback((id: string, newName: string) => {
  const updateTerminal = useTerminalStore.getState().updateTerminal;
  updateTerminal(id, { title: newName });
}, []);
```

#### 4.7 渲染结构

```tsx
return (
  <DndContext
    sensors={sensors}
    collisionDetection={closestCenter}
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
  >
    <div className="flex h-full flex-col">
      {/* Toolbar with tab bar */}
      <div className="flex h-10 items-center border-b border-border bg-card/30">
        {/* Left: Terminal tabs */}
        <div className="flex-1 min-w-0">
          <TerminalTabBar
            terminals={terminals}
            activeTerminalId={activeTerminalId}
            onTabChange={setActiveTerminal}
            onTabClose={handleCloseTerminal}
            onTabRename={handleRenameTerminal}
            onNewTerminal={handleAddTerminal}
            canAddTerminal={canAddTerminal(projectPath)}
          />
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2 px-3 shrink-0">
          {/* Terminal count indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground">
            <TerminalSquare className="h-3 w-3" />
            <span className="font-medium">{terminals.length}</span>
            {terminals.length > 1 && (
              <span className="text-[10px] opacity-70">
                (⌘{activeTerminalId ? terminals.findIndex(t => t.id === activeTerminalId) + 1 : 1})
              </span>
            )}
          </div>

          {/* History dropdown, Invoke Claude All, Files buttons... */}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Single terminal display area */}
        <div className={cn(
          "flex-1 overflow-hidden transition-all duration-300 ease-in-out",
          fileExplorerOpen && "pr-0"
        )}>
          {terminals.map(terminal => (
            <div
              key={terminal.id}
              className={cn(
                "h-full transition-opacity duration-200 ease-in-out",
                terminal.id === activeTerminalId ? "opacity-100 animate-in fade-in duration-200" : "hidden opacity-0"
              )}
            >
              <Terminal
                id={terminal.id}
                cwd={terminal.cwd || projectPath}
                projectPath={projectPath}
                isActive={terminal.id === activeTerminalId}
                onClose={() => handleCloseTerminal(terminal.id)}
                onActivate={() => setActiveTerminal(terminal.id)}
                tasks={tasks}
                onNewTaskClick={onNewTaskClick}
                terminalCount={terminals.length}
              />
            </div>
          ))}
        </div>

        {/* File explorer panel */}
        {projectPath && <FileExplorerPanel projectPath={projectPath} />}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeDragData && (
          <div className="flex items-center gap-2 bg-card border border-border rounded-md px-3 py-2 shadow-lg">
            {activeDragData.isDirectory ? (
              <Folder className="h-4 w-4 text-warning" />
            ) : (
              <File className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm">{activeDragData.name}</span>
          </div>
        )}
        {draggingTerminal && (
          <div className="flex items-center gap-2 bg-card border border-primary rounded-md px-3 py-2 shadow-lg">
            <TerminalSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">{draggingTerminal.title || 'Terminal'}</span>
          </div>
        )}
      </DragOverlay>
    </div>
  </DndContext>
);
```

#### 4.8 空状态

```tsx
if (terminals.length === 0) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="rounded-full bg-card p-4">
          <Grid2X2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Agent Terminals</h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-md">
            Spawn multiple terminals to run Claude agents in parallel.
            Use <kbd className="px-1.5 py-0.5 text-xs bg-card border border-border rounded">Ctrl+T</kbd> to create a new terminal.
          </p>
        </div>
      </div>
      <Button onClick={handleAddTerminal} className="gap-2">
        <Plus className="h-4 w-4" />
        New Terminal
      </Button>
    </div>
  );
}
```

---

## 快捷键列表

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + T` | 新建终端 |
| `Ctrl/Cmd + W` | 关闭当前终端 |
| `Ctrl/Cmd + Tab` | 切换到下一个终端 |
| `Ctrl/Cmd + Shift + Tab` | 切换到上一个终端 |
| `Ctrl/Cmd + 1-9` | 切换到指定终端 |

---

## 上游同步后恢复步骤

### 第一步：创建新组件文件

上游仓库中不存在这些文件，需完全重建：

```bash
# 创建目录
mkdir -p apps/frontend/src/renderer/components/terminal
```

然后按照上文的完整代码创建三个文件：
1. `TerminalTab.tsx`
2. `SortableTerminalTab.tsx`
3. `TerminalTabBar.tsx`

### 第二步：修改 TerminalGrid.tsx

按照上文 "4. TerminalGrid.tsx 修改要点" 进行修改。

### 第三步：验证功能

- [ ] 标签页正确显示
- [ ] 点击标签页切换终端
- [ ] 双击标签页重命名
- [ ] 拖拽标签页排序
- [ ] 所有快捷键正常工作
- [ ] 文件拖放到终端正常

---

## 样式规格

### 标签页容器 (Toolbar)

| 属性 | 值 |
|------|-----|
| 高度 | `h-10` (40px) |
| 背景 | `bg-card/30` |
| 边框 | 底部 `border-b border-border` |

### 标签页

| 状态 | 类名 |
|------|------|
| 默认 | `min-w-[120px] max-w-[200px]` |
| Hover | `hover:bg-accent/50` |
| 激活 | `bg-background border-b-2 border-b-primary shadow-sm` |
| 拖拽中 | `opacity-50 scale-95` |

### 动画时长

| 效果 | 时长 |
|------|------|
| 过渡 | `duration-200` (200ms) |
| 指示线 | `duration-200` (200ms) |
| 切换 | `duration-300` (300ms) |

---

## 关键文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `terminal/TerminalTab.tsx` | 新建 | 单个标签页组件，包含编辑功能 |
| `terminal/SortableTerminalTab.tsx` | 新建 | 可拖拽标签页包装器 |
| `terminal/TerminalTabBar.tsx` | 新建 | 标签页导航栏，包含滚动和新建按钮 |
| `TerminalGrid.tsx` | 修改 | 主容器，移除网格布局，集成标签页 |

---

## 已知边界情况处理

| 情况 | 处理方式 |
|------|----------|
| 0个终端 | 显示空状态页面 |
| 1个终端 | 快捷键跳过（length > 1 检查） |
| activeTerminalId 不存在 | `currentIndex === -1` 时设为 0 或 length-1 |
| 长名称 | `truncate` 截断 + title 提示 |
| 空名称 | 不保存，恢复原名称 |
| 拖拽距离 < 8px | 不触发拖拽（activationConstraint） |

---

## 拖拽系统设计

### 拖拽类型区分

| 类型 | data.type | 处理方式 |
|------|-----------|----------|
| 文件拖放 | `file` | 插入路径到终端 |
| 标签页排序 | `terminal-tab` | 调用 reorderTerminals |

### 拖拽数据结构

```typescript
// 文件拖放
{
  type: 'file',
  path: string,
  name: string,
  isDirectory: boolean
}

// 标签页拖拽
{
  type: 'terminal-tab',
  terminalId: string
}
```

---

**文档维护**: 如功能实现有变更，请及时更新本文档。
