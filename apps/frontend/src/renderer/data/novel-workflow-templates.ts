/**
 * 小说工作流预设模板
 *
 * 参考星月写作的工作流设计，提供开箱即用的小说生成模板
 */

import type { NovelWorkflow } from '../../shared/types/novel';

export const NOVEL_WORKFLOW_TEMPLATES: NovelWorkflow[] = [
  // ===== 短篇工作流 =====
  {
    id: 'short-story-one-click',
    name: '短篇一键直出',
    description: '输入导语，一键生成完整短篇正文。适合知乎风、爽文、虐文等多种风格。',
    author: '系统',
    rating: 4.5,
    usageCount: 80874,
    category: 'short-story',
    tags: ['短篇', '一键生成', '直出'],
    isPublic: true,
    steps: [
      {
        id: 'step-1',
        name: '生成正文',
        description: '根据导语生成8000-12000字短篇正文',
        promptTemplate: `你是一位资深网络小说作家，请根据以下导语创作一篇短篇小说。

## 导语
{{intro}}

## 创作要求
- 字数：8000-12000字
- 风格：{{style}}
- 付费点位置：在故事60%左右
- 每章约2000字，分5-6章
- 确保情节紧凑，有爽点或泪点

## 输出格式
直接输出正文内容，章节用【第X章】分隔。`,
        outputType: 'chapter',
        maxTokens: 15000
      }
    ],
    inputParams: [
      {
        name: 'intro',
        label: '导语',
        type: 'textarea',
        required: true,
        placeholder: '请输入故事导语（100-300字的故事梗概）',
        description: '导语是故事的核心概括，包含主角、冲突、悬念等要素'
      },
      {
        name: 'style',
        label: '风格',
        type: 'select',
        required: false,
        defaultValue: '知乎风',
        options: ['知乎风', '爽文', '虐文', '甜宠', '悬疑', '沙雕']
      }
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },

  // ===== 长篇续写工作流 =====
  {
    id: 'long-story-continue',
    name: '长篇续写十章',
    description: '关联前文，输入后续剧情走向，一键生成十章续写内容。支持无限循环续写。',
    author: '系统',
    rating: 4.6,
    usageCount: 254938,
    category: 'continuation',
    tags: ['长篇', '续写', '无限循环'],
    isPublic: true,
    steps: [
      {
        id: 'step-1',
        name: '一键2万字，十章一循环',
        description: '根据前文和剧情走向续写10章内容',
        promptTemplate: `你是一位资深网络小说作家，请根据以下信息续写小说章节。

## 前文内容
{{previousChapters}}

## 后续剧情走向
{{plotDirection}}

## 角色信息
{{characters}}

## 词条设定
{{terms}}

## 补充要求
{{additionalInfo}}

## 创作要求
- 续写10章，每章约2000字
- 保持与前文一致的文风和人物性格
- 情节要连贯，伏笔要呼应
- 确保爽点密集，节奏紧凑

## 输出格式
直接输出正文内容，章节用【第X章】分隔。`,
        outputType: 'chapter',
        maxTokens: 25000
      }
    ],
    inputParams: [
      {
        name: 'book',
        label: '选择书籍',
        type: 'book',
        required: true,
        description: '选择要续写的作品'
      },
      {
        name: 'previousChapters',
        label: '关联前文章节',
        type: 'chapter',
        required: true,
        description: '选择3-5章前文作为上下文参考'
      },
      {
        name: 'plotDirection',
        label: '后续剧情走向',
        type: 'textarea',
        required: true,
        placeholder: '请描述接下来的剧情发展方向...'
      },
      {
        name: 'characters',
        label: '角色卡',
        type: 'character',
        required: false,
        description: '选择本章涉及的角色'
      },
      {
        name: 'terms',
        label: '词条卡',
        type: 'term',
        required: false,
        description: '选择相关的设定词条'
      },
      {
        name: 'memo',
        label: '关联备忘录',
        type: 'memo',
        required: false
      },
      {
        name: 'additionalInfo',
        label: '补充信息',
        type: 'textarea',
        required: false,
        placeholder: '其他需要补充的要求...'
      }
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },

  // ===== 大纲生成工作流 =====
  {
    id: 'outline-generate',
    name: '大纲生成',
    description: '输入创意点子，生成完整的小说大纲，包含人物设定、世界观、章节规划。',
    author: '系统',
    rating: 4.3,
    usageCount: 56610,
    category: 'outline',
    tags: ['大纲', '创意', '规划'],
    isPublic: true,
    steps: [
      {
        id: 'step-1',
        name: '生成大纲',
        description: '根据创意生成完整小说大纲',
        promptTemplate: `你是一位资深网络小说编辑，请根据以下信息创作一份完整的小说大纲。

## 基本信息
- 书名：{{title}}
- 类型：{{genre}}
- 主题：{{theme}}
- 核心创意：{{idea}}

## 大纲要求
请生成包含以下内容的完整大纲：

### 1. 故事背景（500字）
- 世界观设定
- 时代背景
- 势力分布

### 2. 主要人物设定
- 男主角：姓名、性格、金手指、成长线
- 女主角：姓名、性格、与男主关系
- 主要配角：3-5人

### 3. 核心冲突
- 表面冲突
- 深层冲突
- 最终目标

### 4. 章节规划（20-50章）
每章包含：章节名、主要内容、爽点/钩子

### 5. 关键情节点
- 开篇钩子
- 金手指觉醒
- 第一个小高潮
- 中期转折
- 最终高潮
- 结局`,
        outputType: 'outline',
        maxTokens: 8000
      }
    ],
    inputParams: [
      {
        name: 'title',
        label: '书名',
        type: 'text',
        required: true,
        placeholder: '请输入书名'
      },
      {
        name: 'genre',
        label: '类型',
        type: 'select',
        required: true,
        options: ['玄幻', '都市', '言情', '悬疑', '科幻', '仙侠', '历史', '游戏']
      },
      {
        name: 'theme',
        label: '主题',
        type: 'text',
        required: true,
        placeholder: '如：复仇、成长、爱情、权谋...'
      },
      {
        name: 'idea',
        label: '核心创意',
        type: 'textarea',
        required: true,
        placeholder: '描述你的核心创意点子（100-300字）'
      }
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },

  // ===== 人物生成工作流 =====
  {
    id: 'character-generate',
    name: '人物卡生成',
    description: '输入角色基本信息，生成详细的人物设定卡片。',
    author: '系统',
    rating: 4.2,
    usageCount: 32150,
    category: 'character',
    tags: ['人物', '设定', '角色卡'],
    isPublic: true,
    steps: [
      {
        id: 'step-1',
        name: '生成人物卡',
        promptTemplate: `你是一位资深小说人设师，请根据以下信息创建一个详细的人物设定卡。

## 基本信息
- 姓名：{{characterName}}
- 性别：{{gender}}
- 年龄：{{age}}
- 身份：{{identity}}
- 性格关键词：{{personality}}

## 请生成以下内容

### 外貌描写（200字）
包含五官、身材、穿着风格、标志性特征

### 性格详解（300字）
- 表面性格
- 内在性格
- 性格成因
- 性格弱点

### 背景故事（500字）
- 出身背景
- 重要经历
- 人际关系

### 能力设定
- 主要能力
- 特殊技能
- 弱点限制

### 语言风格
- 常用口头禅
- 说话方式
- 典型对话示例

### 角色弧线
- 初始状态
- 成长变化
- 最终状态`,
        outputType: 'character',
        maxTokens: 3000
      }
    ],
    inputParams: [
      {
        name: 'characterName',
        label: '角色姓名',
        type: 'text',
        required: true,
        placeholder: '请输入角色姓名'
      },
      {
        name: 'gender',
        label: '性别',
        type: 'select',
        required: true,
        options: ['男', '女', '其他']
      },
      {
        name: 'age',
        label: '年龄',
        type: 'text',
        required: false,
        placeholder: '如：25岁、青年、不详'
      },
      {
        name: 'identity',
        label: '身份',
        type: 'text',
        required: true,
        placeholder: '如：剑客、总裁、学生...'
      },
      {
        name: 'personality',
        label: '性格关键词',
        type: 'text',
        required: false,
        placeholder: '如：冷酷、腹黑、温柔...'
      }
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },

  // ===== 润色工作流 =====
  {
    id: 'polish-text',
    name: '正文润色',
    description: '对已有正文进行润色优化，提升文笔、减少AI味、增强可读性。',
    author: '系统',
    rating: 4.4,
    usageCount: 45230,
    category: 'polish',
    tags: ['润色', '优化', '去AI味'],
    isPublic: true,
    steps: [
      {
        id: 'step-1',
        name: '润色正文',
        promptTemplate: `你是一位专业的小说编辑，请对以下正文进行润色优化。

## 原文
{{originalText}}

## 润色要求
- 风格：{{polishStyle}}
- 程度：{{polishLevel}}
- 保留原文核心情节和人物性格
- 减少AI痕迹和机械感
- 增强画面感和代入感
- 优化对话，使其更自然
- 检查并修正错别字和标点

## 注意事项
{{additionalNotes}}

## 输出要求
直接输出润色后的正文，不需要解释修改内容。`,
        outputType: 'text',
        maxTokens: 10000
      }
    ],
    inputParams: [
      {
        name: 'originalText',
        label: '原文',
        type: 'textarea',
        required: true,
        placeholder: '请粘贴需要润色的正文内容'
      },
      {
        name: 'polishStyle',
        label: '润色风格',
        type: 'select',
        required: false,
        defaultValue: '保持原风格',
        options: ['保持原风格', '更加文艺', '更加直白', '更加热血', '更加细腻']
      },
      {
        name: 'polishLevel',
        label: '润色程度',
        type: 'select',
        required: false,
        defaultValue: '适中',
        options: ['轻度（仅修正错误）', '适中（优化表达）', '深度（重写部分段落）']
      },
      {
        name: 'additionalNotes',
        label: '额外要求',
        type: 'textarea',
        required: false,
        placeholder: '其他需要特别注意的要求...'
      }
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  }
];
