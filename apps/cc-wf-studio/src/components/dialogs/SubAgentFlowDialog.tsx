/**
 * 子代理流对话框组件
 *
 * 用于编辑子代理流的全屏对话框
 * 提供与主工作流画布的清晰视觉区分
 */

import * as Dialog from '@radix-ui/react-dialog';
import { Check, X } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  type Connection,
  Controls,
  type DefaultEdgeOptions,
  type EdgeTypes,
  MiniMap,
  type Node,
  type NodeTypes,
  ReactFlowProvider,
} from 'reactflow';
import { useTranslation } from 'react-i18next';

import { DeletableEdge } from '../edges/DeletableEdge';
import { StyledTooltip } from '../common/StyledTooltip';

// 节点组件导入
import { AskUserQuestionNode } from '../nodes/AskUserQuestionNode';
import { BranchNode } from '../nodes/BranchNode';
import { EndNode } from '../nodes/EndNode';
import { IfElseNode } from '../nodes/IfElseNode';
import { McpNode } from '../nodes/McpNode';
import { PromptNode } from '../nodes/PromptNode';
import { SkillNode } from '../nodes/SkillNode';
import { StartNode } from '../nodes/StartNode';
import { SubAgentFlowNode } from '../nodes/SubAgentFlowNode';
import { SubAgentNode } from '../nodes/SubAgentNode';
import { SwitchNode } from '../nodes/SwitchNode';

/**
 * 节点类型注册
 */
const nodeTypes: NodeTypes = {
  subAgent: SubAgentNode,
  askUserQuestion: AskUserQuestionNode,
  branch: BranchNode,
  ifElse: IfElseNode,
  switch: SwitchNode,
  start: StartNode,
  end: EndNode,
  prompt: PromptNode,
  skill: SkillNode,
  mcp: McpNode,
  subAgentFlow: SubAgentFlowNode,
};

/**
 * 默认边选项
 */
const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: false,
  style: { stroke: 'var(--foreground)', strokeWidth: 2 },
};

/**
 * 边类型 - 带删除按钮的自定义边
 */
const edgeTypes: EdgeTypes = {
  default: DeletableEdge,
};

/** 子代理流数据 */
export interface SubAgentFlowData {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
  }>;
}

interface SubAgentFlowDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subAgentFlow: SubAgentFlowData | null;
  onSave: (data: SubAgentFlowData) => void;
}

/**
 * 内部组件，使用 ReactFlow hooks
 */
const SubAgentFlowDialogContent: React.FC<SubAgentFlowDialogProps> = ({
  isOpen,
  onClose,
  subAgentFlow,
  onSave,
}) => {
  const { t } = useTranslation('ccwfstudio');
  const dialogRef = useRef<HTMLDivElement>(null);

  // 本地状态
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Array<{ id: string; source: string; target: string }>>([]);
  const [localName, setLocalName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // 子代理流名称模式验证（仅小写，跨平台兼容）
  const SUBAGENTFLOW_NAME_PATTERN = /^[a-z0-9_-]+$/;

  // 初始化本地状态
  useEffect(() => {
    if (subAgentFlow && isOpen) {
      setNodes(subAgentFlow.nodes);
      setEdges(subAgentFlow.edges);
      setLocalName(subAgentFlow.name);
      setNameError(null);
    }
  }, [subAgentFlow, isOpen]);

  // 对话框关闭时重置状态
  useEffect(() => {
    if (!isOpen) {
      setSelectedNodeId(null);
    }
  }, [isOpen]);

  // 处理名称变化和验证
  const handleNameChange = useCallback(
    (value: string) => {
      setLocalName(value);
      if (value.length === 0) {
        setNameError(t('error.subAgentFlow.nameRequired', '名称为必填项'));
      } else if (value.length > 50) {
        setNameError(t('error.subAgentFlow.nameTooLong', '名称不能超过50个字符'));
      } else if (!SUBAGENTFLOW_NAME_PATTERN.test(value)) {
        setNameError(t('error.subAgentFlow.invalidName', '名称只能包含小写字母、数字、下划线和连字符'));
      } else {
        setNameError(null);
      }
    },
    [t]
  );

  // 处理提交
  const handleSubmit = useCallback(() => {
    if (subAgentFlow && localName && !nameError) {
      onSave({
        ...subAgentFlow,
        name: localName,
        nodes,
        edges,
      });
    }
    onClose();
  }, [subAgentFlow, localName, nameError, nodes, edges, onSave, onClose]);

  // 处理取消
  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  // 连接验证
  const isValidConnection = useCallback(
    (connection: Connection): boolean => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (targetNode?.type === 'start') return false;
      if (sourceNode?.type === 'end') return false;
      return true;
    },
    [nodes]
  );

  // 处理节点点击
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  // 处理面板点击（取消选择）
  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // 对齐网格
  const snapGrid = useMemo<[number, number]>(() => [15, 15], []);

  // 聚焦对话框
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  if (!subAgentFlow) {
    return null;
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <Dialog.Content
            ref={dialogRef}
            aria-label="子代理流编辑器"
            aria-describedby={undefined}
            onEscapeKeyDown={(e) => {
              if (document.activeElement?.tagName === 'INPUT') {
                e.preventDefault();
              }
            }}
            style={{
              position: 'relative',
              width: '95vw',
              height: '95vh',
              backgroundColor: 'var(--editor-background)',
              border: '2px solid var(--charts-purple, #8857e5)',
              borderRadius: '8px',
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
                padding: '12px 16px',
                backgroundColor: 'var(--editor-widget-background)',
                borderBottom: '2px solid var(--charts-purple, #8857e5)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--charts-purple, #8857e5)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    flexShrink: 0,
                  }}
                >
                  {t('subAgentFlow.title', '子代理流')}
                </span>
                {/* 流名称输入 */}
                <div style={{ flex: 1, maxWidth: '300px' }}>
                  <input
                    type="text"
                    value={localName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder={t('subAgentFlow.namePlaceholder', '输入子代理流名称')}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: '14px',
                      fontWeight: 500,
                      backgroundColor: 'var(--input-background)',
                      color: 'var(--input-foreground)',
                      border: `1px solid ${nameError ? 'var(--error-foreground)' : 'var(--input-border)'}`,
                      borderRadius: '4px',
                      outline: 'none',
                    }}
                  />
                  {nameError && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--error-foreground)',
                        marginTop: '4px',
                      }}
                    >
                      {nameError}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* 提交按钮 */}
                <StyledTooltip content={t('subAgentFlow.dialog.submit', '保存')}>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!!nameError}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      backgroundColor: 'var(--button-background)',
                      color: 'var(--button-foreground)',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: nameError ? 'not-allowed' : 'pointer',
                      opacity: nameError ? 0.5 : 1,
                    }}
                  >
                    <Check size={18} />
                  </button>
                </StyledTooltip>
                {/* 取消按钮 */}
                <StyledTooltip content={t('subAgentFlow.dialog.cancel', '取消')}>
                  <button
                    type="button"
                    onClick={handleCancel}
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
                </StyledTooltip>
              </div>
            </div>

            {/* 主内容: ReactFlow 画布 */}
            <div style={{ flex: 1, position: 'relative' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodeClick={handleNodeClick}
                onPaneClick={handlePaneClick}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                isValidConnection={isValidConnection}
                snapToGrid={true}
                snapGrid={snapGrid}
                fitView
                attributionPosition="bottom-left"
              >
                <Background color="rgba(136, 87, 229, 0.3)" gap={15} size={1} />
                <Controls />
                <MiniMap
                  nodeColor={(node) => {
                    switch (node.type) {
                      case 'start':
                        return '#4caf50';
                      case 'end':
                        return '#f44336';
                      case 'subAgent':
                        return '#2196f3';
                      default:
                        return '#9e9e9e';
                    }
                  }}
                  maskColor="rgba(0, 0, 0, 0.2)"
                  style={{
                    backgroundColor: 'var(--editor-background)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '4px',
                  }}
                />
              </ReactFlow>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

/**
 * 子代理流对话框组件
 *
 * 包装 ReactFlowProvider 以支持 ReactFlow hooks
 */
export const SubAgentFlowDialog: React.FC<SubAgentFlowDialogProps> = (props) => {
  return (
    <ReactFlowProvider>
      <SubAgentFlowDialogContent {...props} />
    </ReactFlowProvider>
  );
};

export default SubAgentFlowDialog;
