/**
 * Workflow Studio Tour Steps
 * ===========================
 *
 * Defines interactive tour steps for first-time users using Driver.js
 */

import type { DriveStep } from 'driver.js';

/**
 * Tour steps configuration
 * Guides users through creating their first workflow
 */
export const getTourSteps = (): DriveStep[] => [
  // Welcome
  {
    popover: {
      title: 'Welcome to Workflow Studio',
      description: 'Let\'s take a quick tour to help you get started with creating AI-powered workflows.',
      side: 'bottom',
      align: 'center',
    },
  },

  // Node Palette
  {
    element: '[data-tour="node-palette"]',
    popover: {
      title: 'Node Palette',
      description: 'This is the Node Palette. Drag nodes from here onto the canvas to build your workflow.',
      side: 'right',
      align: 'start',
    },
  },

  // Basic Nodes
  {
    element: '[data-tour="basic-nodes"]',
    popover: {
      title: 'Basic Nodes',
      description: 'Start and End nodes define the entry and exit points of your workflow. Prompt nodes let you add AI instructions.',
      side: 'right',
      align: 'start',
    },
  },

  // Execution Nodes
  {
    element: '[data-tour="execution-nodes"]',
    popover: {
      title: 'Execution Nodes',
      description: 'Use Skill nodes to call Claude Skills, MCP nodes to invoke tools, and SubAgent nodes to delegate tasks.',
      side: 'right',
      align: 'start',
    },
  },

  // Control Flow Nodes
  {
    element: '[data-tour="control-nodes"]',
    popover: {
      title: 'Control Flow',
      description: 'Add conditional logic with If/Else and Switch nodes, or ask users for input with AskUserQuestion.',
      side: 'right',
      align: 'start',
    },
  },

  // Canvas
  {
    element: '[data-tour="workflow-canvas"]',
    popover: {
      title: 'Workflow Canvas',
      description: 'This is your workflow canvas. Drag nodes here and connect them to create your workflow logic.',
      side: 'top',
      align: 'center',
    },
  },

  // Property Panel
  {
    element: '[data-tour="property-panel"]',
    popover: {
      title: 'Property Panel',
      description: 'Click on any node to edit its properties here. Configure prompts, parameters, and settings.',
      side: 'left',
      align: 'start',
    },
  },

  // Toolbar
  {
    element: '[data-tour="toolbar"]',
    popover: {
      title: 'Toolbar',
      description: 'Use the toolbar to name your workflow, save it, export as a slash command, or run it immediately.',
      side: 'bottom',
      align: 'center',
    },
  },

  // AI Features
  {
    element: '[data-tour="ai-generate"]',
    popover: {
      title: 'AI Generation',
      description: 'Click the sparkle icon to generate a workflow name with AI, or use AI to optimize your workflow.',
      side: 'bottom',
      align: 'end',
    },
  },

  // Execution Panel
  {
    element: '[data-tour="execution-panel"]',
    popover: {
      title: 'Execution Monitor',
      description: 'Monitor your workflow execution here. See real-time logs, progress, and control execution.',
      side: 'top',
      align: 'center',
    },
  },

  // Completion
  {
    popover: {
      title: 'You\'re Ready!',
      description: 'That\'s it! You\'re now ready to create powerful AI workflows. Start by dragging a Prompt node onto the canvas.',
      side: 'bottom',
      align: 'center',
    },
  },
];

/**
 * Driver.js configuration
 */
export const getDriverConfig = () => ({
  showProgress: true,
  progressText: '{{current}} of {{total}}',
  nextBtnText: 'Next',
  prevBtnText: 'Previous',
  doneBtnText: 'Done',
  showButtons: ['next', 'previous', 'close'],
  allowClose: true,
  overlayClickNext: false,
  smoothScroll: true,
  animate: true,
  overlayOpacity: 0.7,
  stagePadding: 10,
  stageRadius: 8,
});
