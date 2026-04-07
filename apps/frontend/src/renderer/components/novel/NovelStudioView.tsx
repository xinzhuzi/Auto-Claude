import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../../hooks/use-toast';
import { useNovelStore, loadNovel, saveNovel, generateNovel, stopNovel, setupNovelListeners } from '../../stores/novel-store';
import type {
  NovelChapter,
  NovelGenerateRequest,
  NovelProject,
  NovelPromptTemplate,
  NovelPromptsFile,
  NovelWorkflow,
  NovelCharacter,
  NovelDocumentConfig,
  NovelModuleId
} from '../../../shared/types';
import { NovelWorkflowMarket } from './NovelWorkflowMarket';
import { NovelWorkflowRunner } from './NovelWorkflowRunner';

interface NovelStudioViewProps {
  projectId?: string;
  className?: string;
}

type NovelSection = 'overview' | 'creative' | 'outline' | 'characters' | 'world' | 'content' | 'output' | 'prompts' | 'workflow' | 'config';

type CreativeToolId =
  | 'brainstorm'
  | 'title'
  | 'synopsis'
  | 'outline'
  | 'detail-outline'
  | 'opening'
  | 'cheat'
  | 'name'
  | 'character'
  | 'world'
  | 'glossary'
  | 'cover';

type CreativeTool = {
  id: CreativeToolId;
  title: string;
  description: string;
  action: 'creative' | 'outline' | 'character' | 'world';
};

type NovelStringField = {
  [K in keyof NovelProject]: NovelProject[K] extends string ? K : never
}[keyof NovelProject];

type ChapterStringField = {
  [K in keyof NovelChapter]: NovelChapter[K] extends string ? K : never
}[keyof NovelChapter];

const NOVEL_MODULE_LABELS: { id: NovelModuleId; label: string }[] = [
  { id: 'overview', label: '概览' },
  { id: 'characters', label: '人物角色' },
  { id: 'creative', label: '创意' },
  { id: 'workflow', label: '工作流' },
  { id: 'outline', label: '大纲' },
  { id: 'world', label: '世界观' },
  { id: 'content', label: '正文' },
  { id: 'output', label: '生成结果' },
  { id: 'prompts', label: '提示词' }
];


function getCharacterSummary(character: Record<string, unknown>): string {
  if (typeof character.description === 'string' && character.description.trim()) return character.description;
  if (typeof character.personality === 'string' && character.personality.trim()) return character.personality;
  if (typeof character.background === 'string' && character.background.trim()) return character.background;
  if (typeof character.appearance === 'string' && character.appearance.trim()) return character.appearance;
  return '';
}

function getWorldSummary(setting: Record<string, unknown>): string {
  if (typeof setting.description === 'string' && setting.description.trim()) return setting.description;
  if (typeof setting.overview === 'string' && setting.overview.trim()) return setting.overview;
  return '';
}

function countText(text: string): number {
  if (!text) return 0;
  return text.replace(/\s+/g, '').length;
}

function parseOutlineToChapters(outline: string): NovelChapter[] {
  if (!outline) return [];
  const regex = /###\s*(.+?)\n([\s\S]*?)(?=###|$)/g;
  const chapters: NovelChapter[] = [];
  let match: RegExpExecArray | null;
  let index = 1;

  while ((match = regex.exec(outline)) !== null) {
    chapters.push({
      id: `chapter-${index++}`,
      title: match[1].trim(),
      outline: (match[2] || '').trim(),
      content: '',
      generatedText: '',
      status: 'draft'
    });
  }

  return chapters;
}

type CharacterSectionKey =
  | 'name'
  | 'base'
  | 'background'
  | 'emotions'
  | 'analysis'
  | 'relations'
  | 'experiences';

const CHARACTER_SECTION_DEFINITIONS: { key: CharacterSectionKey; title: string }[] = [
  { key: 'name', title: '名字' },
  { key: 'base', title: '基础信息' },
  { key: 'background', title: '背景故事' },
  { key: 'emotions', title: '个人感情、执念、遗憾、愧疚、期望' },
  { key: 'analysis', title: '深度分析与评语' },
  { key: 'relations', title: '人际关系' },
  { key: 'experiences', title: '重要经历' }
];

function stripSectionNumberPrefix(title: string): string {
  return title.replace(/^\s*(?:第)?(?:\d+|[一二三四五六七八九十百千]+)[.、)）]?\s*/g, '');
}

function normalizeSectionTitle(title: string): string {
  const withoutParens = title.replace(/\([^)]*\)/g, '').replace(/（[^）]*）/g, '');
  const withoutPrefix = stripSectionNumberPrefix(withoutParens);
  return withoutPrefix
    .replace(/[0-9]/g, '')
    .replace(/[a-zA-Z]/g, '')
    .replace(/[\s:：,，.。;；、\-—_]/g, '')
    .toLowerCase();
}

const CHARACTER_SECTION_ALIAS_MAP: Record<string, CharacterSectionKey> = Object.fromEntries(
  [
    ['名字', 'name'],
    ['姓名', 'name'],
    ['角色名', 'name'],
    ['基础信息', 'base'],
    ['基本信息', 'base'],
    ['背景故事', 'background'],
    ['背景', 'background'],
    ['个人感情、执念、遗憾、愧疚、期望', 'emotions'],
    ['感情、执念、遗憾、愧疚、期望', 'emotions'],
    ['个人感情', 'emotions'],
    ['深度分析与评语', 'analysis'],
    ['分析与评语', 'analysis'],
    ['人际关系', 'relations'],
    ['关系', 'relations'],
    ['重要经历', 'experiences'],
    ['主要经历', 'experiences']
  ].map(([title, key]) => [normalizeSectionTitle(title), key])
) as Record<string, CharacterSectionKey>;

function getCharacterFileName(sourcePath?: string): string {
  if (!sourcePath) return '';
  const parts = sourcePath.split('/');
  return parts[parts.length - 1] || '';
}

function stripMarkdownExtension(fileName: string): string {
  return fileName.replace(/\.md$/i, '');
}

function getCharacterNameHints(characterName?: string, fileName?: string): string[] {
  const hints = new Set<string>();
  if (characterName) hints.add(characterName);
  if (fileName) {
    const baseName = stripMarkdownExtension(fileName);
    hints.add(baseName);
    const splitPrimary = baseName.split(/[_\-—]/)[0];
    if (splitPrimary) hints.add(splitPrimary);
    const withoutPrefix = stripSectionNumberPrefix(baseName);
    if (withoutPrefix) hints.add(withoutPrefix);
  }
  return Array.from(hints).filter(Boolean);
}

function getCharacterSortKey(character: NovelCharacter): string {
  const fileName = getCharacterFileName(character.sourcePath);
  const baseName = stripMarkdownExtension(fileName);
  return (baseName || character.name || '').toString();
}

function buildCharacterBasicInfo(character?: NovelCharacter | null): string {
  if (!character) return '';
  const lines: string[] = [];
  if (typeof character.description === 'string' && character.description.trim()) {
    lines.push(`简介：${character.description.trim()}`);
  }
  if (typeof character.personality === 'string' && character.personality.trim()) {
    lines.push(`性格：${character.personality.trim()}`);
  }
  if (typeof character.appearance === 'string' && character.appearance.trim()) {
    lines.push(`外貌：${character.appearance.trim()}`);
  }
  if (Array.isArray(character.traits) && character.traits.length > 0) {
    const traitsText = character.traits.map((item) => item.trim()).filter(Boolean).join('、');
    if (traitsText) {
      lines.push(`特质：${traitsText}`);
    }
  }
  return lines.join('\n');
}

function parseCharacterContentSections(
  content?: string,
  nameHints: string[] = []
): Partial<Record<CharacterSectionKey, string>> {
  if (!content) return {};
  const lines = content.split(/\r?\n/);
  const sections: Partial<Record<CharacterSectionKey, string>> = {};
  let currentKey: CharacterSectionKey | null = null;
  let buffer: string[] = [];
  const normalizedNameHints = nameHints.map((hint) => normalizeSectionTitle(hint)).filter(Boolean);

  const flush = () => {
    if (!currentKey) return;
    const text = buffer.join('\n').trim();
    if (text) {
      sections[currentKey] = text;
    }
    buffer = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^\s*#+\s*(.+?)\s*$/);
    const numberedMatch = line.match(/^\s*\d+[.、)）]\s*(.+?)\s*$/);
    const title = headingMatch?.[1] || numberedMatch?.[1];
    if (title) {
      const normalizedTitle = normalizeSectionTitle(title);
      let key = CHARACTER_SECTION_ALIAS_MAP[normalizedTitle];
      if (!key && normalizedNameHints.length > 0) {
        const nameMatch = normalizedNameHints.some((hint) => hint === normalizedTitle);
        if (nameMatch) {
          key = 'name';
        }
      }
      if (key) {
        flush();
        currentKey = key;
        continue;
      }
    }
    if (currentKey) {
      buffer.push(line);
    }
  }

  flush();

  return sections;
}

const CREATIVE_TOOLS: CreativeTool[] = [
  { id: 'brainstorm', title: '脑洞生成器', description: '突破想象，脑洞大开', action: 'creative' },
  { id: 'title', title: '书名生成器', description: '爆款书名，超级吸量', action: 'creative' },
  { id: 'synopsis', title: '简介生成器', description: '期待拉满，万言可期', action: 'creative' },
  { id: 'outline', title: '大纲生成器', description: '创作蓝图，尽在掌握', action: 'outline' },
  { id: 'detail-outline', title: '细纲生成器', description: '条理分明，轻松创作', action: 'creative' },
  { id: 'opening', title: '黄金开篇生成器', description: '故事起航，点燃期待', action: 'creative' },
  { id: 'cheat', title: '金手指生成器', description: '情节神转，尽在指间', action: 'creative' },
  { id: 'name', title: '名字生成器', description: '人物物品地名势力名', action: 'creative' },
  { id: 'character', title: '人设生成器', description: '妙笔人设，轻松生成', action: 'character' },
  { id: 'world', title: '世界观生成器', description: '虚构天地，成就奇想', action: 'world' },
  { id: 'glossary', title: '词条生成器', description: '道具、技能、功法、法宝', action: 'creative' },
  { id: 'cover', title: '封面生成器', description: '封面生成，功能强劲', action: 'creative' }
];

function buildNovelContext(novel: NovelProject): string {
  const lines: string[] = [];
  if (novel.title) lines.push(`小说标题：${novel.title}`);
  if (novel.genre) lines.push(`题材/类型：${novel.genre}`);
  if (novel.theme) lines.push(`主题：${novel.theme}`);
  if (novel.keywords) lines.push(`关键词：${novel.keywords}`);
  if (novel.intro) lines.push(`简介：${novel.intro}`);

  if (novel.characters?.length) {
    const characterBriefs = novel.characters.slice(0, 3).map((character, idx) => {
      const summary = getCharacterSummary(character as Record<string, unknown>);
      return `${character.name || `人物${idx + 1}`}：${summary || '暂无描述'}`;
    });
    lines.push(`人物角色：\n- ${characterBriefs.join('\n- ')}`);
  }

  if (novel.worldSettings?.length) {
    const worldBriefs = novel.worldSettings.slice(0, 3).map((setting, idx) => {
      const summary = getWorldSummary(setting as Record<string, unknown>);
      return `${setting.title || `设定${idx + 1}`}：${summary || '暂无描述'}`;
    });
    lines.push(`世界观设定：\n- ${worldBriefs.join('\n- ')}`);
  }

  if (novel.outline) {
    lines.push(`已有大纲：\n${novel.outline}`);
  }

  return lines.join('\n');
}

function buildCreativePrompt(toolId: CreativeToolId, novel: NovelProject): string | null {
  const context = buildNovelContext(novel);
  const base = context ? `以下为小说设定：\n${context}\n\n` : '';

  switch (toolId) {
    case 'brainstorm':
      return `${base}请围绕以上设定，给出10个高概念脑洞，每个包含一句话卖点、冲突点、爽点。请用编号列表输出。`;
    case 'title':
      return `${base}请生成20个吸引人的小说书名，并标注风格标签（如玄幻/都市/言情/科幻等）。请用编号列表输出。`;
    case 'synopsis':
      return `${base}请生成3版不同风格的小说简介/文案（每版120-200字），突出冲突与期待感。`;
    case 'detail-outline':
      return `${base}请生成细纲：\n1. 章节不少于12章\n2. 每章用 ### 标题 开头\n3. 每章写3-5句要点，体现节奏与冲突\n4. 标注关键转折与高潮\n请直接输出细纲内容。`;
    case 'opening':
      return `${base}请写一个黄金开篇，字数800-1200字，要求开场即冲突，快速抛出悬念，埋下主线。`;
    case 'cheat':
      return `${base}请生成5个“金手指”设定，每个包含：名称、核心能力、限制/代价、成长路径、爽点。用编号列表输出。`;
    case 'name':
      return `${base}请生成一组命名清单：\n- 人物名10个\n- 势力名6个\n- 地名6个\n- 功法/技能名8个\n请按分类输出。`;
    case 'glossary':
      return `${base}请生成小说词条库，包含道具、技能、功法、法宝、组织、禁地等分类，每类给出5-8条词条及一句话说明。`;
    case 'cover':
      return `${base}请输出小说封面创意：\n1. 主视觉构图描述\n2. 色彩与风格关键词\n3. 标题字体风格建议\n4. 一句封面文案`;
    default:
      return null;
  }
}

export function NovelStudioView({ projectId }: NovelStudioViewProps) {
  const { toast } = useToast();
  const novel = useNovelStore((state) => state.novel);
  const generationStatus = useNovelStore((state) => state.generationStatus);
  const setNovel = useNovelStore((state) => state.setNovel);

  const [activeSection, setActiveSection] = useState<NovelSection>('overview');
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedCharacterCategory, setSelectedCharacterCategory] = useState<string | null>(null);
  const [isCharacterDetailOpen, setIsCharacterDetailOpen] = useState(false);
  const [worldType, setWorldType] = useState('');
  const [promptTemplates, setPromptTemplates] = useState<NovelPromptTemplate[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [promptTitle, setPromptTitle] = useState('');
  const [promptCategory, setPromptCategory] = useState('');
  const [promptDescription, setPromptDescription] = useState('');
  const [promptContent, setPromptContent] = useState('');
  const [novelConfig, setNovelConfig] = useState<NovelDocumentConfig | null>(null);
  const [overviewPrefaceContent, setOverviewPrefaceContent] = useState('');
  const [overviewPrefaceError, setOverviewPrefaceError] = useState('');

  // 工作流状态
  const [selectedWorkflow, setSelectedWorkflow] = useState<NovelWorkflow | null>(null);

  const selectedChapter = useMemo(() => {
    if (!novel || !selectedChapterId) return null;
    return novel.chapters.find((chapter) => chapter.id === selectedChapterId) || null;
  }, [novel, selectedChapterId]);

  const selectedCharacter = useMemo(() => {
    if (!novel || !selectedCharacterId) return null;
    return novel.characters.find((character) => character.id === selectedCharacterId) || null;
  }, [novel, selectedCharacterId]);

  const characterGroups = useMemo(() => {
    if (!novel?.characters?.length) return [];
    const groups = new Map<string, NovelCharacter[]>();
    novel.characters.forEach((character) => {
      const category = typeof character.category === 'string' && character.category.trim()
        ? character.category.trim()
        : '未分类';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)?.push(character);
    });
    return Array.from(groups.entries())
      .map(([category, items]) => ({
        category,
        items: [...items].sort((a, b) =>
          getCharacterSortKey(a).localeCompare(getCharacterSortKey(b), undefined, {
            sensitivity: 'base',
            numeric: true
          })
        )
      }))
      .sort((a, b) => a.category.localeCompare(b.category, undefined, { sensitivity: 'base', numeric: true }));
  }, [novel]);

  const visibleCharacters = useMemo(() => {
    if (!selectedCharacterCategory) return [];
    const group = characterGroups.find((item) => item.category === selectedCharacterCategory);
    return group ? group.items : [];
  }, [characterGroups, selectedCharacterCategory]);

  const selectedPrompt = useMemo(() => {
    if (!promptTemplates.length || !selectedPromptId) return null;
    return promptTemplates.find((prompt) => prompt.id === selectedPromptId) || null;
  }, [promptTemplates, selectedPromptId]);

  const stats = useMemo(() => {
    if (!novel) return { contentCount: 0, chapterCount: 0, chapterContentCount: 0 };
    const contentCount = countText(novel.content || '');
    const chapterContentCount = (novel.chapters || []).reduce((total, chapter) => {
      const content = chapter.content || chapter.generatedText || '';
      return total + countText(content);
    }, 0);
    return {
      contentCount,
      chapterCount: novel.chapters?.length || 0,
      chapterContentCount
    };
  }, [novel]);

  useEffect(() => {
    if (!selectedPromptId) {
      setPromptTitle('');
      setPromptCategory('');
      setPromptDescription('');
      setPromptContent('');
      return;
    }
    const prompt = promptTemplates.find((item) => item.id === selectedPromptId);
    if (!prompt) return;
    setPromptTitle(prompt.title || '');
    setPromptCategory(prompt.category || '');
    setPromptDescription(prompt.description || '');
    setPromptContent(prompt.content || '');
  }, [promptTemplates, selectedPromptId]);

  useEffect(() => {
    if (!projectId) return;
    const cleanup = setupNovelListeners();
    loadNovel(projectId);
    window.electronAPI.getNovelPrompts(projectId).then((result) => {
      if (result.success && result.data) {
        const promptsFile = result.data as NovelPromptsFile;
        setPromptTemplates(promptsFile.prompts || []);
      }
    });
    window.electronAPI.getNovelConfig(projectId).then((result) => {
      if (result.success && result.data) {
        setNovelConfig(result.data as NovelDocumentConfig);
      }
    });
    return cleanup;
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !novelConfig?.modulePaths?.overview) return;
    let active = true;
    setOverviewPrefaceError('');
    window.electronAPI.getNovelOverviewPreface(projectId).then((result) => {
      if (!active) return;
      if (result.success && result.data) {
        setOverviewPrefaceContent(result.data.content || '');
      } else {
        setOverviewPrefaceContent('');
        setOverviewPrefaceError(result.error || '无法加载序文内容');
      }
    });
    return () => {
      active = false;
    };
  }, [projectId, novelConfig?.modulePaths?.overview]);

  useEffect(() => {
    if (novel?.chapters?.length && !selectedChapterId) {
      setSelectedChapterId(novel.chapters[0]?.id || null);
    }
  }, [novel, selectedChapterId]);

  useEffect(() => {
    if (novel?.characters?.length && !selectedCharacterId) {
      setSelectedCharacterId(novel.characters[0]?.id || null);
    }
  }, [novel, selectedCharacterId]);

  useEffect(() => {
    if (!selectedCharacterCategory) return;
    if (selectedCharacterCategory === '未分类') {
      setSelectedCharacterCategory(null);
      return;
    }
    const exists = characterGroups.some((group) => group.category === selectedCharacterCategory);
    if (!exists) {
      setSelectedCharacterCategory(null);
    }
  }, [characterGroups, selectedCharacterCategory]);

  useEffect(() => {
    if (!selectedCharacterCategory) return;
    const group = characterGroups.find((item) => item.category === selectedCharacterCategory);
    if (!group) return;
    const isSelectedInGroup = group.items.some((item) => item.id === selectedCharacterId);
    if (!isSelectedInGroup) {
      setSelectedCharacterId(group.items[0]?.id || null);
    }
  }, [characterGroups, selectedCharacterCategory, selectedCharacterId]);

  const updateNovelField = (field: NovelStringField, value: string) => {
    if (!novel) return;
    setNovel({ ...novel, [field as string]: value });
  };

  const updateChapterField = (chapterId: string, field: ChapterStringField, value: string) => {
    if (!novel) return;
    const updatedChapters = novel.chapters.map((chapter) =>
      chapter.id === chapterId ? { ...chapter, [field as string]: value } : chapter
    );
    setNovel({ ...novel, chapters: updatedChapters });
  };

  const updateChapterStatus = (chapterId: string, status: 'draft' | 'completed') => {
    if (!novel) return;
    const updatedChapters = novel.chapters.map((chapter) =>
      chapter.id === chapterId ? { ...chapter, status } : chapter
    );
    setNovel({ ...novel, chapters: updatedChapters });
  };

  const updateCharacter = (characterId: string, updates: Partial<NovelCharacter>) => {
    if (!novel) return;
    const updatedCharacters = novel.characters.map((character) =>
      character.id === characterId ? { ...character, ...updates } : character
    );
    setNovel({ ...novel, characters: updatedCharacters });
  };

  const handleDeleteCharacter = (characterId: string) => {
    if (!novel) return;
    const updatedCharacters = novel.characters.filter((character) => character.id !== characterId);
    const updated = { ...novel, characters: updatedCharacters };
    setNovel(updated);
    if (selectedCharacterId === characterId) {
      setSelectedCharacterId(updatedCharacters[0]?.id || null);
    }
  };

  const updateConfigPath = (moduleId: NovelModuleId, value: string) => {
    if (!novelConfig) return;
    setNovelConfig({
      ...novelConfig,
      modulePaths: {
        ...novelConfig.modulePaths,
        [moduleId]: value
      }
    });
  };

  const handleSelectConfigPath = async (moduleId: NovelModuleId) => {
    if (!novelConfig) return;
    try {
      const selectedPath = await window.electronAPI.selectDirectory();
      if (selectedPath) {
        updateConfigPath(moduleId, selectedPath);
      }
    } catch (error) {
      toast({ title: '选择失败', description: error instanceof Error ? error.message : '无法选择文件夹' });
    }
  };

  const handleSaveConfig = async () => {
    if (!projectId || !novelConfig) return;
    const result = await window.electronAPI.saveNovelConfig(projectId, novelConfig);
    if (result.success) {
      toast({ title: '配置已保存', description: '文档路径配置已写入项目' });
    } else {
      toast({ title: '保存失败', description: result.error || '无法保存配置' });
    }
  };

  const handleRefreshCharactersFromDocs = async () => {
    if (!projectId || !novel) return;
    const result = await window.electronAPI.loadNovelCharactersFromDocs(projectId);
    if (result.success) {
      const characters = result.data || [];
      const updated = { ...novel, characters };
      setNovel(updated);
      const nextSelected = characters.find((item) => item.id === selectedCharacterId)?.id
        || characters[0]?.id
        || null;
      setSelectedCharacterId(nextSelected);
      if (selectedCharacterCategory) {
        const categoryExists = characters.some((item) =>
          typeof item.category === 'string' && item.category === selectedCharacterCategory
        );
        if (!categoryExists) {
          setSelectedCharacterCategory(null);
        }
      }
      await saveNovel(projectId, updated);
      toast({ title: '已更新', description: `已从文档加载 ${characters.length} 个角色` });
    } else if (result.error && result.error !== 'Cancelled') {
      toast({ title: '更新失败', description: result.error });
    }
  };

  const handleCreateCharacterDoc = async () => {
    if (!projectId || !novel) return;
    const result = await window.electronAPI.createNovelCharacterDoc(projectId);
    if (result.success && result.data) {
      const updated = { ...novel, characters: [result.data, ...novel.characters] };
      setNovel(updated);
      setSelectedCharacterId(result.data.id);
      await saveNovel(projectId, updated);
      toast({ title: '已添加', description: '人物角色文档已创建' });
    } else if (result.error && result.error !== 'Cancelled') {
      toast({ title: '添加失败', description: result.error });
    }
  };

  const handleOpenCharacterDetail = (characterId?: string) => {
    if (characterId) {
      setSelectedCharacterId(characterId);
    } else {
      setSelectedCharacterId(null);
    }
    setActiveSection('characters');
    setIsCharacterDetailOpen(true);
  };

  const handleCloseCharacterDetail = () => {
    setIsCharacterDetailOpen(false);
  };

  const selectedCharacterFileName = useMemo(
    () => getCharacterFileName(selectedCharacter?.sourcePath),
    [selectedCharacter?.sourcePath]
  );
  const selectedCharacterNameHints = useMemo(
    () => getCharacterNameHints(selectedCharacter?.name, selectedCharacterFileName),
    [selectedCharacter?.name, selectedCharacterFileName]
  );
  const parsedCharacterSections = useMemo(
    () => parseCharacterContentSections(selectedCharacter?.content, selectedCharacterNameHints),
    [selectedCharacter?.content, selectedCharacterNameHints]
  );
  const hasStructuredCharacterSections = useMemo(
    () => Object.keys(parsedCharacterSections).length > 0,
    [parsedCharacterSections]
  );
  const characterSectionContent = useMemo(() => {
    const nameText = (parsedCharacterSections.name || selectedCharacter?.name || selectedCharacterFileName || '').trim();
    const basicInfoText = parsedCharacterSections.base || buildCharacterBasicInfo(selectedCharacter);
    return {
      name: nameText,
      base: basicInfoText,
      background: parsedCharacterSections.background || (selectedCharacter?.background as string) || '',
      emotions: parsedCharacterSections.emotions || '',
      analysis: parsedCharacterSections.analysis || '',
      relations: parsedCharacterSections.relations || '',
      experiences: parsedCharacterSections.experiences || ''
    } as Record<CharacterSectionKey, string>;
  }, [parsedCharacterSections, selectedCharacter, selectedCharacterFileName]);
  const characterFullContent = useMemo(() => {
    const contentText = typeof selectedCharacter?.content === 'string' ? selectedCharacter.content.trim() : '';
    if (contentText) return contentText;
    if (typeof selectedCharacter?.description === 'string' && selectedCharacter.description.trim()) {
      return selectedCharacter.description.trim();
    }
    return '';
  }, [selectedCharacter]);

  const uncategorizedGroup = useMemo(
    () => characterGroups.find((group) => group.category === '未分类'),
    [characterGroups]
  );
  const hasFolderGroups = useMemo(
    () => characterGroups.some((group) => group.category !== '未分类'),
    [characterGroups]
  );

  const handleSave = async () => {
    if (!projectId || !novel) return;
    await saveNovel(projectId, novel);
    toast({ title: '已保存', description: '小说数据已保存到本地' });
  };

  const handleGenerate = (request: NovelGenerateRequest) => {
    if (!projectId) return;
    generateNovel(projectId, request);
  };

  const handleGenerateOutline = () => {
    if (!novel) return;
    if (!novel.theme && !novel.title) {
      toast({ title: '请填写主题', description: '至少填写主题或标题后再生成大纲' });
      return;
    }
    handleGenerate({
      action: 'outline',
      payload: {
        theme: novel.theme || novel.title,
        keywords: novel.keywords,
        template: selectedPrompt || undefined
      }
    });
  };

  const handleParseOutline = () => {
    if (!novel) return;
    const chapters = parseOutlineToChapters(novel.outline);
    const updated = { ...novel, chapters };
    setNovel(updated);
    if (projectId) {
      saveNovel(projectId, updated).catch((error) => {
        console.error('[NovelStudio] Failed to persist chapters:', error);
      });
    }
  };

  const handleGenerateChapter = () => {
    if (!novel) return;
    if (!selectedChapter) {
      toast({ title: '请选择章节', description: '先从章节列表中选择一个章节' });
      return;
    }

    handleGenerate({
      action: 'chapter',
      payload: {
        chapterId: selectedChapter.id,
        chapterTitle: selectedChapter.title,
        chapterOutline: selectedChapter.outline,
        previousContent: novel.content,
        characters: novel.characters,
        worldSettings: novel.worldSettings,
        novelInfo: {
          title: novel.title,
          genre: novel.genre,
          intro: novel.intro,
          theme: novel.theme
        },
        template: selectedPrompt || undefined
      }
    });
  };

  const handleContinue = () => {
    if (!novel || !novel.content) {
      toast({ title: '请先输入正文', description: '续写需要已有正文内容' });
      return;
    }
    handleGenerate({
      action: 'continue',
      payload: {
        text: novel.content
      }
    });
  };


  const handleGenerateCharacter = () => {
    if (!novel) return;
    const theme = (novel.theme || novel.title || '').trim();
    if (!theme) {
      toast({ title: '请填写主题', description: '生成人物角色需要小说主题或标题' });
      return;
    }
    handleGenerate({ action: 'character', payload: { theme } });
  };

  const handleGenerateWorld = () => {
    if (!novel) return;
    const theme = (novel.theme || novel.title || '').trim();
    if (!theme) {
      toast({ title: '请填写主题', description: '生成世界观需要小说主题或标题' });
      return;
    }
    const payload: Record<string, unknown> = { theme };
    if (worldType.trim()) payload.settingType = worldType.trim();
    handleGenerate({ action: 'world', payload });
  };

  const handleSummary = () => {
    if (!novel || !novel.content) {
      toast({ title: '请先输入正文', description: '摘要需要已有正文内容' });
      return;
    }
    handleGenerate({
      action: 'summary',
      payload: {
        content: novel.content,
        length: 'medium',
        summaryType: 'plot'
      }
    });
  };

  const handleAdvice = () => {
    if (!novel || !novel.content) {
      toast({ title: '请先输入正文', description: '写作建议需要已有正文内容' });
      return;
    }
    handleGenerate({
      action: 'advice',
      payload: {
        content: novel.content
      }
    });
  };

  const handlePolish = () => {
    if (!novel || !novel.content) {
      toast({ title: '请先输入正文', description: '润色需要已有正文内容' });
      return;
    }
    handleGenerate({
      action: 'polish',
      payload: {
        text: novel.content,
        polishType: '综合'
      }
    });
  };

  const handleAppendToContent = () => {
    if (!novel || !novel.generatedContent) return;
    const appended = novel.content
      ? `${novel.content}\n\n${novel.generatedContent}`
      : novel.generatedContent;
    setNovel({ ...novel, content: appended });
  };

  const handleAppendToChapter = () => {
    if (!novel || !selectedChapter || !novel.generatedContent) return;
    updateChapterField(selectedChapter.id, 'content',
      selectedChapter.content
        ? `${selectedChapter.content}\n\n${novel.generatedContent}`
        : novel.generatedContent
    );
  };

  const handleStop = async () => {
    if (!projectId) return;
    await stopNovel(projectId);
  };

  const createPromptId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `prompt-${Date.now()}`;
  };

  const handleNewPrompt = () => {
    setSelectedPromptId('');
    setPromptTitle('');
    setPromptCategory('');
    setPromptDescription('');
    setPromptContent('');
  };

  const handleSavePrompt = () => {
    const title = promptTitle.trim();
    if (!title) {
      toast({ title: '请填写模板标题', description: '标题不能为空' });
      return;
    }
    const content = promptContent.trim();
    if (!content) {
      toast({ title: '请填写模板内容', description: '模板内容不能为空' });
      return;
    }
    const id = selectedPromptId || createPromptId();
    const updatedPrompt: NovelPromptTemplate = {
      id,
      title,
      category: promptCategory.trim() || 'general',
      description: promptDescription.trim() || undefined,
      content,
      tags: selectedPrompt?.tags || [],
      usageCount: selectedPrompt?.usageCount || 0
    };

    setPromptTemplates((prev) => {
      const idx = prev.findIndex((item) => item.id === id);
      if (idx === -1) return [...prev, updatedPrompt];
      return prev.map((item) => (item.id === id ? updatedPrompt : item));
    });
    setSelectedPromptId(id);
    toast({ title: '模板已保存', description: '已更新到模板列表' });
  };

  const handleDeletePrompt = () => {
    if (!selectedPromptId) {
      toast({ title: '请选择模板', description: '请选择要删除的模板' });
      return;
    }
    setPromptTemplates((prev) => prev.filter((item) => item.id !== selectedPromptId));
    setSelectedPromptId('');
    setPromptTitle('');
    setPromptCategory('');
    setPromptDescription('');
    setPromptContent('');
  };

  const handleExportMarkdown = async () => {
    if (!projectId) return;
    const result = await window.electronAPI.exportNovelMarkdown(projectId);
    if (result.success && result.data) {
      toast({ title: '已导出', description: `Markdown 已保存到 ${result.data.path}` });
    } else {
      toast({ title: '导出失败', description: result.error || '无法导出 Markdown' });
    }
  };

  const handleCreativeTool = (toolId: CreativeToolId) => {
    if (!novel) return;

    if (toolId === 'outline') {
      setActiveSection('outline');
      handleGenerateOutline();
      return;
    }
    if (toolId === 'character') {
      setActiveSection('characters');
      handleGenerateCharacter();
      return;
    }
    if (toolId === 'world') {
      setActiveSection('world');
      handleGenerateWorld();
      return;
    }

    const prompt = buildCreativePrompt(toolId, novel);
    if (!prompt) {
      toast({ title: '暂不可用', description: '该工具尚未配置可用的提示词' });
      return;
    }
    if (
      !novel.title &&
      !novel.theme &&
      !novel.genre &&
      !novel.keywords &&
      !novel.outline &&
      !novel.intro &&
      novel.characters.length === 0 &&
      novel.worldSettings.length === 0
    ) {
      toast({ title: '请补充设定', description: '请先填写标题/主题/类型/关键词或大纲' });
      return;
    }

    handleGenerate({
      action: 'creative',
      payload: {
        toolId,
        prompt
      }
    });
    setActiveSection('output');
  };

  const handlePersistPrompts = async () => {
    if (!projectId) return;
    const promptsFile: NovelPromptsFile = {
      prompts: promptTemplates,
      exportTime: new Date().toISOString(),
      type: 'prompts'
    };
    const result = await window.electronAPI.saveNovelPrompts(projectId, promptsFile);
    if (result.success) {
      toast({ title: '模板已保存', description: '提示词模板已写入本地' });
    } else {
      toast({ title: '保存失败', description: result.error || '无法保存提示词模板' });
    }
  };

  const handleImportPrompts = async () => {
    if (!projectId) return;
    const result = await window.electronAPI.importNovelPrompts(projectId);
    if (result.success && result.data) {
      const promptsFile = result.data as NovelPromptsFile;
      const prompts = promptsFile.prompts || [];
      setPromptTemplates(prompts);
      setSelectedPromptId(prompts[0]?.id || '');
      toast({ title: '导入成功', description: '提示词模板已更新' });
    } else if (result.error) {
      toast({ title: '导入失败', description: result.error });
    }
  };

  const handleExportPrompts = async () => {
    if (!projectId) return;
    if (promptTemplates.length === 0) {
      toast({ title: '没有可导出的模板', description: '请先添加提示词模板' });
      return;
    }
    const payload: NovelPromptsFile = {
      prompts: promptTemplates,
      exportTime: new Date().toISOString(),
      type: 'prompts'
    };
    const result = await window.electronAPI.exportNovelPrompts(projectId, payload);
    if (result.success && result.data) {
      toast({ title: '已导出', description: `提示词 JSON 已保存到 ${result.data.filePath}` });
    } else {
      toast({ title: '导出失败', description: result.error || '无法导出提示词' });
    }
  };

  const characterPanel = (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => handleOpenCharacterDetail()}>新建角色</Button>
          <Button variant="secondary" size="sm" onClick={handleRefreshCharactersFromDocs}>更新</Button>
        </div>
        {selectedCharacterCategory && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedCharacterCategory(null)}
          >
            返回
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-2">
        {selectedCharacterCategory && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>分类：{selectedCharacterCategory}</span>
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-1">
          {!selectedCharacterCategory ? (
            <div className="space-y-3">
              {!hasFolderGroups && !(uncategorizedGroup?.items?.length) && (
                <button
                  type="button"
                  className="text-left"
                  onClick={() => handleOpenCharacterDetail()}
                >
                  <Card className="h-full min-h-[220px] border p-4 text-xs text-muted-foreground transition hover:border-primary/40 hover:bg-muted/30">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>文件夹</span>
                    </div>
                    <div className="mt-2 text-xs">暂无人物角色，点击打开管理</div>
                  </Card>
                </button>
              )}
              {hasFolderGroups && (
                <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                  {characterGroups
                    .filter((group) => group.category !== '未分类')
                    .map((group) => (
                      <button
                        key={group.category}
                        type="button"
                        className="text-left"
                        onClick={() => setSelectedCharacterCategory(group.category)}
                      >
                        <Card className="h-full min-h-[220px] border p-4 transition hover:border-primary/40 hover:bg-muted/30">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>文件夹</span>
                            <span>{group.items.length} 个文件</span>
                          </div>
                          <div className="mt-2 text-sm font-medium">{group.category}</div>
                          <div className="mt-2 text-xs text-muted-foreground line-clamp-2">点击进入查看文档</div>
                        </Card>
                      </button>
                    ))}
                </div>
              )}
              {uncategorizedGroup?.items?.length ? (
                <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                  {uncategorizedGroup.items.map((character, index) => {
                    const isActive = selectedCharacterId === character.id;
                    const description = typeof character.description === 'string' ? character.description : '';
                    const contentText = typeof character.content === 'string' ? character.content.trim() : '';
                    const snippetSource = description || contentText;
                    const fileName = character.sourcePath ? character.sourcePath.split('/').pop() : '';
                    const displayTitle = fileName || character.name || `人物 ${index + 1}`;
                    const showName = fileName && character.name && character.name !== fileName;
                    const contentSnippet = snippetSource
                      ? snippetSource.replace(/\s+/g, ' ').trim()
                      : '暂无内容';
                    return (
                      <button
                        key={character.id || index}
                        type="button"
                        className="text-left"
                        onClick={() => handleOpenCharacterDetail(character.id)}
                      >
                        <Card
                          className={`h-full min-h-[320px] border p-4 transition ${
                            isActive
                              ? 'border-primary/60 bg-primary/10'
                              : 'border-border/60 hover:border-primary/40 hover:bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>文档</span>
                          </div>
                          <div className="mt-2 text-sm font-medium">{displayTitle}</div>
                          {showName && (
                            <div className="mt-1 text-xs text-muted-foreground">{character.name}</div>
                          )}
                          <div className="mt-2 max-h-[220px] overflow-y-auto text-xs text-muted-foreground whitespace-pre-wrap">
                            {contentSnippet}
                          </div>
                        </Card>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {visibleCharacters.length === 0 && (
                <Card className="p-4 text-xs text-muted-foreground">该分类暂无角色</Card>
              )}
              {visibleCharacters.map((character, index) => {
                const isActive = selectedCharacterId === character.id;
                const description = typeof character.description === 'string' ? character.description : '';
                const contentText = typeof character.content === 'string' ? character.content.trim() : '';
                const snippetSource = description || contentText;
                const fileName = character.sourcePath ? character.sourcePath.split('/').pop() : '';
                const displayTitle = fileName || character.name || `人物 ${index + 1}`;
                const showName = fileName && character.name && character.name !== fileName;
                const contentSnippet = snippetSource
                  ? snippetSource.replace(/\s+/g, ' ').trim()
                  : '暂无内容';
                return (
                  <button
                    key={character.id || index}
                    type="button"
                    className="text-left"
                    onClick={() => handleOpenCharacterDetail(character.id)}
                  >
                    <Card
                      className={`h-full min-h-[320px] border p-4 transition ${
                        isActive
                          ? 'border-primary/60 bg-primary/10'
                          : 'border-border/60 hover:border-primary/40 hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>文档</span>
                      </div>
                      <div className="mt-2 text-sm font-medium">{displayTitle}</div>
                      {showName && (
                        <div className="mt-1 text-xs text-muted-foreground">{character.name}</div>
                      )}
                      <div className="mt-2 max-h-[220px] overflow-y-auto text-xs text-muted-foreground whitespace-pre-wrap">
                        {contentSnippet}
                      </div>
                    </Card>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const contentAreaClassName =
    activeSection === 'characters'
      ? 'flex-1 overflow-hidden p-3'
      : 'flex-1 overflow-auto p-3';


  if (!novel) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">未加载小说数据</div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-full w-full overflow-hidden border border-border/40">
        <div className="w-28 shrink-0 border-r border-border/60 bg-muted/30 px-2 py-3">
          <div className="grid gap-1">
            {[
              { id: 'overview', label: '概览' },
              { id: 'characters', label: '人物角色' },
              { id: 'creative', label: '创意' },
              { id: 'workflow', label: '工作流' },
              { id: 'outline', label: '大纲' },
              { id: 'world', label: '世界观' },
              { id: 'content', label: '正文' },
              { id: 'output', label: '生成结果' },
              { id: 'prompts', label: '提示词' },
              { id: 'config', label: '配置' }
            ].map((item) => (
              <button
                key={item.id}
                className={`w-full px-2 py-2 text-left text-xs transition ${
                  activeSection === item.id
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/60'
                }`}
                onClick={() => setActiveSection(item.id as NovelSection)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className={contentAreaClassName}>
          {activeSection === 'characters' && isCharacterDetailOpen ? (
            <div className="flex h-full flex-col gap-4 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-base font-semibold">人物角色详情</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedCharacterFileName || selectedCharacter?.name || '未选择角色'}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={handleRefreshCharactersFromDocs}>更新</Button>
                  <Button variant="secondary" size="sm" onClick={handleCreateCharacterDoc}>添加文档</Button>
                  <Button size="sm" onClick={handleGenerateCharacter}>生成人物角色</Button>
                  <Button variant="secondary" size="sm" onClick={handleCloseCharacterDetail}>返回</Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1">
                {selectedCharacter ? (
                  <div className="space-y-3">
                    {hasStructuredCharacterSections ? (
                      CHARACTER_SECTION_DEFINITIONS.map((section, index) => {
                        const content = (characterSectionContent[section.key] || '').trim();
                        return (
                          <Card key={section.key} className="rounded-lg border border-border/60 p-4">
                            <div className="text-sm font-semibold">{index + 1}. {section.title}</div>
                            <div className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                              {content || '暂无内容'}
                            </div>
                          </Card>
                        );
                      })
                    ) : (
                      <Card className="rounded-lg border border-border/60 p-4">
                        <div className="text-sm font-semibold">完整内容</div>
                        <div className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                          {characterFullContent || '暂无内容'}
                        </div>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">请选择一个角色以查看详情</div>
                )}
              </div>
            </div>
          ) : null}

          {activeSection === 'overview' && (
            <div className="h-full overflow-y-auto">
              <Card className="rounded-lg border border-border/60 p-4">
                <div className="text-sm font-semibold">序</div>
                <div className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                  {overviewPrefaceContent || '暂无内容'}
                </div>
              </Card>
              {overviewPrefaceError ? (
                <div className="mt-2 text-xs text-destructive">{overviewPrefaceError}</div>
              ) : null}
            </div>
          )}

          {activeSection === 'creative' && (
            <div className="space-y-4">
              <div>
                <div className="text-base font-semibold">创意中心</div>
                <div className="text-xs text-muted-foreground">
                  选择工具快速生成灵感、书名、简介、细纲等内容
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {CREATIVE_TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    className="text-left"
                    onClick={() => handleCreativeTool(tool.id)}
                  >
                    <Card className="h-full border-dashed border-border/70 p-4 transition hover:border-primary/50 hover:bg-muted/40">
                      <div className="space-y-2">
                        <div className="text-sm font-semibold">{tool.title}</div>
                        <div className="text-xs text-muted-foreground">{tool.description}</div>
                      </div>
                    </Card>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'outline' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                <Card className="p-4 space-y-3">
                  <div className="font-medium">提示词模板</div>
                  <Select
                    value={selectedPromptId || '__none__'}
                    onValueChange={(value) => setSelectedPromptId(value === '__none__' ? '' : value)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="选择模板（可选）" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">不使用模板</SelectItem>
                      {promptTemplates.map((prompt) => (
                        <SelectItem key={prompt.id} value={prompt.id}>
                          {prompt.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPrompt && (
                    <div className="text-xs text-muted-foreground">
                      {selectedPrompt.description || selectedPrompt.category}
                    </div>
                  )}
                </Card>

                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">小说大纲</div>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={handleParseOutline}>解析章节</Button>
                      <Button size="sm" onClick={handleGenerateOutline}>生成大纲</Button>
                    </div>
                  </div>
                  <Textarea value={novel.outline} onChange={(e) => updateNovelField('outline', e.target.value)} rows={8} />
                </Card>

                <Card className="p-4 space-y-3">
                  <div className="font-medium">章节列表</div>
                  <div className="space-y-2">
                    {novel.chapters.length === 0 && (
                      <div className="text-xs text-muted-foreground">暂无章节，请先生成或解析大纲</div>
                    )}
                    {novel.chapters.map((chapter) => (
                      <button
                        key={chapter.id}
                        className={`w-full text-left px-3 py-2 rounded border ${selectedChapterId === chapter.id ? 'border-primary bg-primary/10' : 'border-border'}`}
                        onClick={() => setSelectedChapterId(chapter.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">{chapter.title}</div>
                          <span className="text-[10px] uppercase text-muted-foreground">
                            {chapter.status === 'completed' ? '完成' : '草稿'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{chapter.outline}</div>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">章节详情</div>
                    <div className="flex items-center gap-2">
                      {selectedChapter && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => updateChapterStatus(
                            selectedChapter.id,
                            selectedChapter.status === 'completed' ? 'draft' : 'completed'
                          )}
                        >
                          {selectedChapter.status === 'completed' ? '标记为草稿' : '标记为完成'}
                        </Button>
                      )}
                      <Button size="sm" onClick={handleGenerateChapter} disabled={!selectedChapter}>生成章节</Button>
                    </div>
                  </div>
                  {selectedChapter ? (
                    <>
                      <div>
                        <label className="text-xs text-muted-foreground">章节标题</label>
                        <Input value={selectedChapter.title} onChange={(e) => updateChapterField(selectedChapter.id, 'title', e.target.value)} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">章节大纲</label>
                        <Textarea value={selectedChapter.outline} onChange={(e) => updateChapterField(selectedChapter.id, 'outline', e.target.value)} rows={4} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">章节正文</label>
                        <Textarea value={selectedChapter.content} onChange={(e) => updateChapterField(selectedChapter.id, 'content', e.target.value)} rows={6} />
                      </div>
                      <Button variant="secondary" size="sm" onClick={handleAppendToChapter} disabled={!novel.generatedContent}>追加生成内容到章节</Button>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">请选择章节以编辑</div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {activeSection === 'characters' && !isCharacterDetailOpen && characterPanel}

          {activeSection === 'world' && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">世界观设定</div>
                <Button size="sm" onClick={handleGenerateWorld}>生成世界观</Button>
              </div>
              <Input
                placeholder="设定类型（可选）"
                value={worldType}
                onChange={(e) => setWorldType(e.target.value)}
              />
              <div className="space-y-2">
                {novel.worldSettings.length === 0 && (
                  <div className="text-xs text-muted-foreground">暂无世界观设定</div>
                )}
                {novel.worldSettings.map((setting, index) => {
                  const summary = getWorldSummary(setting as Record<string, unknown>);
                  return (
                    <div key={setting.id || index} className="rounded border border-border p-2">
                      <div className="text-sm font-medium">{setting.title || `设定 ${index + 1}`}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{summary || '暂无描述'}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {activeSection === 'content' && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">正文编辑</div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={handleContinue}>续写</Button>
                  <Button variant="secondary" size="sm" onClick={handlePolish}>润色</Button>
                </div>
              </div>
              <Textarea value={novel.content} onChange={(e) => updateNovelField('content', e.target.value)} rows={12} />
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={handleSummary}>生成摘要</Button>
                <Button variant="secondary" size="sm" onClick={handleAdvice}>写作建议</Button>
              </div>
            </Card>
          )}

          {activeSection === 'output' && (
            <Card className="p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium">生成结果</div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={handleExportMarkdown}>导出 Markdown</Button>
                  <Button variant="secondary" size="sm" onClick={handleAppendToContent} disabled={!novel.generatedContent}>追加到正文</Button>
                </div>
              </div>
              <Textarea value={novel.generatedContent} readOnly rows={12} />
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={handleAppendToChapter} disabled={!selectedChapter || !novel.generatedContent}>追加到当前章节</Button>
              </div>
            </Card>
          )}

          {activeSection === 'prompts' && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">提示词库</div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={handleNewPrompt}>新建</Button>
                  <Button variant="secondary" size="sm" onClick={handleSavePrompt}>保存模板</Button>
                  <Button variant="secondary" size="sm" onClick={handleDeletePrompt} disabled={!selectedPromptId}>删除</Button>
                  <Button size="sm" onClick={handlePersistPrompts}>保存到本地</Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={handleImportPrompts}>导入 JSON</Button>
                <Button variant="secondary" size="sm" onClick={handleExportPrompts}>导出 JSON</Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">标题</label>
                  <Input value={promptTitle} onChange={(e) => setPromptTitle(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">分类</label>
                  <Input value={promptCategory} onChange={(e) => setPromptCategory(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">描述</label>
                <Input value={promptDescription} onChange={(e) => setPromptDescription(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">模板内容</label>
                <Textarea value={promptContent} onChange={(e) => setPromptContent(e.target.value)} rows={10} />
              </div>
            </Card>
          )}

          {activeSection === 'config' && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">文档路径配置</div>
                <Button size="sm" onClick={handleSaveConfig} disabled={!novelConfig}>保存配置</Button>
              </div>
              {novelConfig ? (
                <div className="grid gap-3">
                  {NOVEL_MODULE_LABELS.map((item) => (
                    <div key={item.id} className="grid gap-1">
                      <label className="text-xs text-muted-foreground">{item.label}</label>
                      <div className="flex gap-2">
                        <Input
                          className="flex-1"
                          value={novelConfig.modulePaths[item.id] || ''}
                          onChange={(e) => updateConfigPath(item.id, e.target.value)}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSelectConfigPath(item.id)}
                        >
                          选择
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">未加载配置</div>
              )}
              <div className="text-xs text-muted-foreground">
                配置文件位于 <span className="font-mono">.auto-claude/novel/novel.config.json</span>
              </div>
            </Card>
          )}

          {activeSection === 'workflow' && (
            <div className="h-[calc(100vh-280px)] -m-4">
              {selectedWorkflow ? (
                <NovelWorkflowRunner
                  workflow={selectedWorkflow}
                  projectId={projectId}
                  currentProject={novel}
                  allProjects={[novel]}
                  onComplete={() => {
                    // 执行完成后的处理
                  }}
                  onBack={() => setSelectedWorkflow(null)}
                />
              ) : (
                <NovelWorkflowMarket
                  onSelectWorkflow={setSelectedWorkflow}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
