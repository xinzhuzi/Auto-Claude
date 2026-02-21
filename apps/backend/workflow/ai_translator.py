"""
AI Translator
==============

Translates text to Chinese using Claude SDK.
"""

import logging
from pathlib import Path
from typing import List

from claude_agent_sdk import ClaudeSDKClient

from core.client import create_client
from agents.session import run_agent_session

logger = logging.getLogger(__name__)


async def translate_to_chinese(
    texts: List[str],
    project_dir: Path,
    spec_dir: Path,
    model: str = "claude-sonnet-4-5-20250929",
) -> List[str]:
    """
    Translate a list of texts to Chinese.

    Args:
        texts: List of texts to translate
        project_dir: Project root directory
        spec_dir: Spec directory for settings
        model: Model to use for translation

    Returns:
        List of translated texts in the same order
    """
    if not texts:
        return []

    try:
        # Create Claude SDK client
        client = create_client(
            project_dir=project_dir,
            spec_dir=spec_dir,
            model=model,
            agent_type="coder",
        )

        # Format translation prompt
        prompt = """将以下MCP工具描述翻译成简洁的中文，保持技术术语准确。
要求：
1. 每个翻译用 ||| 分隔
2. 保持原有顺序
3. 翻译要简洁明了，不要太长
4. 只输出翻译结果，不要有其他内容

描述列表：
""" + "\n".join([f"{i+1}. {text}" for i, text in enumerate(texts)])

        async with client:
            # Call Claude SDK
            status, response, _ = await run_agent_session(
                client=client,
                message=prompt,
                spec_dir=spec_dir,
                verbose=False,
            )

        if status == "error":
            logger.error(f"Translation failed: {response}")
            return texts

        # Parse translations
        translations = [t.strip() for t in response.split("|||")]

        # Ensure we have the right number of translations
        if len(translations) < len(texts):
            # Pad with original texts if not enough translations
            translations.extend(texts[len(translations):])

        return translations[:len(texts)]

    except Exception as e:
        logger.error(f"Translation error: {e}")
        return texts
