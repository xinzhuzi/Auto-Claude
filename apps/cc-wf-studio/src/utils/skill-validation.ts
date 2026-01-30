/**
 * Skill 验证工具
 *
 * 用于在提交前验证 CreateSkillPayload
 */

export interface SkillValidationErrors {
  name?: string;
  description?: string;
  instructions?: string;
  scope?: string;
}

/**
 * 验证 Skill 名称格式
 *
 * 规则:
 * - 模式: ^[a-z0-9-]+$ (仅小写字母、数字、连字符)
 * - 长度: 1-64 字符
 *
 * @param name - 要验证的 Skill 名称
 * @returns 错误消息或 null（有效时）
 */
export function validateSkillName(name: string): string | null {
  // 空值检查
  if (!name || name.trim().length === 0) {
    return 'skill.validation.nameRequired';
  }

  // 长度检查
  if (name.length > 64) {
    return 'skill.validation.nameTooLong';
  }

  // 模式检查（仅小写、数字、连字符）
  const pattern = /^[a-z0-9-]+$/;
  if (!pattern.test(name)) {
    return 'skill.validation.nameInvalidFormat';
  }

  return null;
}

/**
 * 验证 Skill 描述
 *
 * 规则:
 * - 长度: 1-1024 字符
 *
 * @param description - 要验证的 Skill 描述
 * @returns 错误消息或 null（有效时）
 */
export function validateSkillDescription(description: string): string | null {
  // 空值检查
  if (!description || description.trim().length === 0) {
    return 'skill.validation.descriptionRequired';
  }

  // 长度检查
  if (description.length > 1024) {
    return 'skill.validation.descriptionTooLong';
  }

  return null;
}

/**
 * 验证 Skill 指令
 *
 * 规则:
 * - 长度: ≥1 字符
 *
 * @param instructions - 要验证的 Skill 指令（markdown）
 * @returns 错误消息或 null（有效时）
 */
export function validateSkillInstructions(instructions: string): string | null {
  // 空值检查
  if (!instructions || instructions.trim().length === 0) {
    return 'skill.validation.instructionsRequired';
  }

  return null;
}

/**
 * 验证 Skill 作用域选择
 *
 * 规则:
 * - 必须是 'user' 或 'project'（用于新 skill 创建）
 *
 * @param scope - 要验证的 Skill 作用域
 * @returns 错误消息或 null（有效时）
 */
export function validateSkillScope(scope: 'user' | 'project' | ''): string | null {
  if (!scope || (scope !== 'user' && scope !== 'project')) {
    return 'skill.validation.scopeRequired';
  }

  return null;
}

/**
 * 验证所有 CreateSkillPayload 字段
 *
 * @param payload - Skill 创建载荷
 * @returns 包含验证错误的对象（全部有效时为空）
 */
export function validateCreateSkillPayload(payload: {
  name: string;
  description: string;
  instructions: string;
  scope: 'user' | 'project' | '';
}): SkillValidationErrors {
  const errors: SkillValidationErrors = {};

  const nameError = validateSkillName(payload.name);
  if (nameError) {
    errors.name = nameError;
  }

  const descriptionError = validateSkillDescription(payload.description);
  if (descriptionError) {
    errors.description = descriptionError;
  }

  const instructionsError = validateSkillInstructions(payload.instructions);
  if (instructionsError) {
    errors.instructions = instructionsError;
  }

  const scopeError = validateSkillScope(payload.scope);
  if (scopeError) {
    errors.scope = scopeError;
  }

  return errors;
}
