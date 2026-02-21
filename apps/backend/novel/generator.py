from __future__ import annotations

from pathlib import Path
from typing import Any

from client import create_client
from phase_config import get_model_betas, get_thinking_kwargs_for_model, resolve_model_id

from .utils import extract_json_block




def normalize_template(template: dict | None) -> dict | None:
    if not template:
        return None
    return {
        "name": template.get("name") or template.get("title") or template.get("label"),
        "description": template.get("description") or template.get("desc"),
        "style": template.get("style") or template.get("writingStyle"),
        "writingTips": template.get("writingTips") or template.get("tips"),
        "content": template.get("content") or template.get("prompt") or template.get("text"),
    }

def build_outline_prompt(theme: str, keywords: str | None = None, template: dict | None = None) -> str:
    template = normalize_template(template)
    template_info = ''
    if template and (template.get('name') or template.get('description')):
        name = template.get('name') or ''
        desc = template.get('description') or ''
        template_info = f"\n参考模板：{name} {('- ' + desc) if desc else ''}"
    keyword_list = f"\n关键词：{keywords}" if keywords else ""
    template_content = f"\n\n模板参考：\n{template.get('content')}" if template and template.get('content') else ""

    return f"""请为以下主题生成一个详细的小说大纲：
主题：{theme}{template_info}{keyword_list}{template_content}

要求：
1. 生成5-8个章节
2. 每个章节用 ### 开头，后跟章节标题
3. 每个章节下面写2-3句话描述该章节的主要内容
4. 整体结构要完整，有开头、发展、高潮、结局
5. 符合所选模板的风格特点

请直接输出大纲内容："""


def build_chapter_prompt(
    chapter_title: str,
    chapter_outline: str,
    previous_content: str = "",
    template: dict | None = None,
    characters: list[dict] | None = None,
    world_settings: list[dict] | None = None,
    novel_info: dict | None = None,
) -> str:
    template = normalize_template(template)
    template_info = ''
    if template:
        if template.get('style') or template.get('writingTips'):
            template_info = f"\n写作风格：{template.get('style', '')}\n写作提示：{template.get('writingTips', '')}"
        elif template.get('name') or template.get('description'):
            name = template.get('name') or ''
            desc = template.get('description') or ''
            template_info = f"\n参考模板：{name} {('- ' + desc) if desc else ''}"
    template_content = f"\n模板参考：\n{template.get('content')}" if template and template.get('content') else ""
    context_info = (
        f"\n前文内容参考：{previous_content[-500:]}" if previous_content else ""
    )

    novel_info = novel_info or {}
    characters = characters or []
    world_settings = world_settings or []

    novel_basic_info = ""
    if any(
        [
            novel_info.get("title"),
            novel_info.get("genre"),
            novel_info.get("intro"),
            novel_info.get("theme"),
        ]
    ):
        novel_basic_info += "\n\n小说基本信息："
        if novel_info.get("title"):
            novel_basic_info += f"\n- 小说名称：{novel_info['title']}"
        if novel_info.get("genre"):
            novel_basic_info += f"\n- 小说类型：{novel_info['genre']}"
        if novel_info.get("theme"):
            novel_basic_info += f"\n- 小说主题：{novel_info['theme']}"
        if novel_info.get("intro"):
            novel_basic_info += f"\n- 小说简介：{novel_info['intro']}"

    characters_info = ""
    if characters:
        characters_info = "\n\n人物设定："
        for char in characters:
            characters_info += f"\n- {char.get('name', '')}：{char.get('description', '')}"
            traits = char.get("traits") or []
            if traits:
                characters_info += f" (特点：{'、'.join(traits)})"

    world_info = ""
    if world_settings:
        world_info = "\n\n世界观设定："
        for setting in world_settings:
            world_info += f"\n- {setting.get('title', '')}：{setting.get('description', '')}"

    return f"""请根据以下信息生成小说章节内容：
章节标题：{chapter_title}
章节大纲：{chapter_outline}{novel_basic_info}{template_info}{context_info}{characters_info}{world_info}

要求：
1. 字数控制在800-1200字
2. 内容要生动有趣，符合章节大纲
3. 语言流畅，描写细腻
4. 如果有前文内容，要保持连贯性
5. 符合所选模板的风格特点
6. 充分利用提供的人物设定和世界观设定
7. 确保人物行为符合其性格特点
8. 场景描写要符合世界观设定
9. 内容要符合小说的整体类型、主题和设定
10. 保持与小说简介和整体风格的一致性

请直接输出章节内容："""


def build_continue_prompt(text: str, direction: str | None = None, word_limit: int | None = None) -> str:
    direction_text = f"\n续写方向：{direction}" if direction else ""
    word_limit_text = f"\n字数要求：{word_limit}字左右" if word_limit else ""

    return f"""请在以下内容基础上进行续写：
{direction_text}{word_limit_text}

原文：
{text}

要求：
1. 保持风格一致
2. 情节自然衔接
3. 语言流畅

请直接输出续写内容："""


def build_polish_prompt(text: str, polish_type: str | None = None, extra: str | None = None) -> str:
    polish_info = f"润色类型：{polish_type}" if polish_type else "润色类型：综合"
    extra_info = f"\n额外要求：{extra}" if extra else ""

    return f"""请对以下文本进行润色：
{polish_info}{extra_info}

原文：
{text}

要求：
1. 保持原意不变
2. 语言更流畅、更有表现力
3. 结构清晰，细节更丰富

请直接输出润色后的内容："""


def build_summary_prompt(content: str, length: str = "medium", summary_type: str = "keypoints") -> str:
    length_instruction = {
        "short": "请生成50-100字的简短摘要",
        "medium": "请生成100-200字的中等长度摘要",
        "long": "请生成200-300字的详细摘要",
    }.get(length, "请生成100-200字的中等长度摘要")

    type_instruction = {
        "keypoints": "重点提取文章的关键要点和核心内容",
        "plot": "重点概括故事情节和主要事件",
        "character": "重点分析人物特点和关系",
        "theme": "重点阐述文章的主题思想和深层含义",
    }.get(summary_type, "重点提取文章的关键要点和核心内容")

    return f"""{length_instruction}，{type_instruction}。

文章内容：
{content}
"""


def build_advice_prompt(content: str) -> str:
    return f"""请对以下文章内容提供写作建议：

{content}

请从以下几个方面给出具体建议：
1. 语言表达
2. 情节结构
3. 人物塑造
4. 描写技巧
5. 整体改进方向

建议："""


def build_creative_prompt(prompt: str) -> str:
    return prompt.strip()


def build_character_prompt(theme: str, character_type: str | None = None) -> str:
    type_info = f"角色类型：{character_type}" if character_type else ""
    return f"""请根据主题"{theme}"生成一个小说人物，{type_info}

要求：
1. 提供人物的基本信息（姓名、年龄、职业等）
2. 详细的外貌描述
3. 性格特点和行为习惯
4. 背景故事和经历
5. 人物的特殊技能或能力
6. 与主题相关的特征

请以JSON格式返回：
{{
  "name": "人物姓名",
  "age": "年龄",
  "occupation": "职业",
  "appearance": "外貌描述",
  "personality": "性格特点",
  "background": "背景故事",
  "skills": ["技能1", "技能2"],
  "traits": ["特征1", "特征2", "特征3"]
}}"""


def build_world_prompt(theme: str, setting_type: str | None = None) -> str:
    type_info = f"设定类型：{setting_type}" if setting_type else ""
    return f"""请根据主题"{theme}"生成一个小说世界观设定，{type_info}

要求：
1. 设定的名称和概述
2. 详细的背景描述
3. 重要的规则或法则
4. 地理环境或空间结构
5. 历史背景或重要事件
6. 与主题相关的特色元素

请以JSON格式返回：
{{
  "title": "设定名称",
  "overview": "概述",
  "description": "详细描述",
  "rules": ["规则1", "规则2"],
  "geography": "地理环境",
  "history": "历史背景",
  "features": ["特色1", "特色2"]
}}"""


async def run_generation(
    prompt: str,
    project_dir: Path,
    output_dir: Path,
    model: str,
    thinking_level: str,
    fast_mode: bool = False,
) -> str:
    resolved_model = resolve_model_id(model)
    betas = get_model_betas(model)
    thinking_kwargs = get_thinking_kwargs_for_model(resolved_model, thinking_level)

    client = create_client(
        project_dir=project_dir,
        spec_dir=output_dir,
        model=resolved_model,
        agent_type="novel",
        betas=betas,
        fast_mode=fast_mode,
        **thinking_kwargs,
    )

    response_text = ""
    async with client:
        await client.query(prompt)
        async for msg in client.receive_response():
            if type(msg).__name__ == "AssistantMessage" and hasattr(msg, "content"):
                for block in msg.content:
                    if type(block).__name__ == "TextBlock" and hasattr(block, "text"):
                        response_text += block.text

    return response_text.strip()


async def generate_outline(payload: dict, project_dir: Path, output_dir: Path, model: str, thinking_level: str, fast_mode: bool) -> str:
    prompt = build_outline_prompt(
        theme=payload.get("theme", ""),
        keywords=payload.get("keywords"),
        template=payload.get("template"),
    )
    return await run_generation(prompt, project_dir, output_dir, model, thinking_level, fast_mode)


async def generate_chapter(payload: dict, project_dir: Path, output_dir: Path, model: str, thinking_level: str, fast_mode: bool) -> str:
    prompt = build_chapter_prompt(
        chapter_title=payload.get("chapterTitle", ""),
        chapter_outline=payload.get("chapterOutline", ""),
        previous_content=payload.get("previousContent", ""),
        template=payload.get("template"),
        characters=payload.get("characters", []),
        world_settings=payload.get("worldSettings", []),
        novel_info=payload.get("novelInfo", {}),
    )
    return await run_generation(prompt, project_dir, output_dir, model, thinking_level, fast_mode)


async def generate_continue(payload: dict, project_dir: Path, output_dir: Path, model: str, thinking_level: str, fast_mode: bool) -> str:
    prompt = build_continue_prompt(
        text=payload.get("text", ""),
        direction=payload.get("direction"),
        word_limit=payload.get("wordLimit"),
    )
    return await run_generation(prompt, project_dir, output_dir, model, thinking_level, fast_mode)


async def generate_polish(payload: dict, project_dir: Path, output_dir: Path, model: str, thinking_level: str, fast_mode: bool) -> str:
    prompt = build_polish_prompt(
        text=payload.get("text", ""),
        polish_type=payload.get("polishType"),
        extra=payload.get("extra"),
    )
    return await run_generation(prompt, project_dir, output_dir, model, thinking_level, fast_mode)


async def generate_summary(payload: dict, project_dir: Path, output_dir: Path, model: str, thinking_level: str, fast_mode: bool) -> str:
    prompt = build_summary_prompt(
        content=payload.get("content", ""),
        length=payload.get("length", "medium"),
        summary_type=payload.get("summaryType", "keypoints"),
    )
    return await run_generation(prompt, project_dir, output_dir, model, thinking_level, fast_mode)


async def generate_advice(payload: dict, project_dir: Path, output_dir: Path, model: str, thinking_level: str, fast_mode: bool) -> str:
    prompt = build_advice_prompt(payload.get("content", ""))
    return await run_generation(prompt, project_dir, output_dir, model, thinking_level, fast_mode)


async def generate_creative(payload: dict, project_dir: Path, output_dir: Path, model: str, thinking_level: str, fast_mode: bool) -> str:
    prompt = build_creative_prompt(payload.get("prompt", ""))
    if not prompt:
        return ""
    return await run_generation(prompt, project_dir, output_dir, model, thinking_level, fast_mode)


async def generate_character(payload: dict, project_dir: Path, output_dir: Path, model: str, thinking_level: str, fast_mode: bool) -> dict | None:
    prompt = build_character_prompt(
        theme=payload.get("theme", ""),
        character_type=payload.get("characterType"),
    )
    response = await run_generation(prompt, project_dir, output_dir, model, thinking_level, fast_mode)
    return extract_json_block(response)


async def generate_world(payload: dict, project_dir: Path, output_dir: Path, model: str, thinking_level: str, fast_mode: bool) -> dict | None:
    prompt = build_world_prompt(
        theme=payload.get("theme", ""),
        setting_type=payload.get("settingType"),
    )
    response = await run_generation(prompt, project_dir, output_dir, model, thinking_level, fast_mode)
    return extract_json_block(response)
