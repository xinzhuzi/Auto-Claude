/**
 * 错误消息映射工具
 *
 * 将错误代码映射到用户友好的错误消息和重试资格。
 */

type ErrorCode =
  | 'COMMAND_NOT_FOUND'
  | 'MODEL_NOT_SUPPORTED'
  | 'COPILOT_NOT_AVAILABLE'
  | 'TIMEOUT'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'PROHIBITED_NODE_TYPE'
  | 'UNKNOWN_ERROR';

interface ErrorMessageInfo {
  /** 错误消息的 i18n key */
  messageKey: string;
  /** 此错误是否可重试（显示重试按钮） */
  isRetryable: boolean;
}

/**
 * 错误代码到消息的映射
 *
 * 可重试错误: TIMEOUT, PARSE_ERROR, VALIDATION_ERROR, UNKNOWN_ERROR
 * 不可重试错误: COMMAND_NOT_FOUND
 */
const ERROR_MESSAGE_MAP: Record<ErrorCode, ErrorMessageInfo> = {
  COMMAND_NOT_FOUND: {
    messageKey: 'refinement.error.commandNotFound',
    isRetryable: false,
  },
  MODEL_NOT_SUPPORTED: {
    messageKey: 'refinement.error.modelNotSupported',
    isRetryable: false,
  },
  COPILOT_NOT_AVAILABLE: {
    messageKey: 'refinement.error.copilotNotAvailable',
    isRetryable: false,
  },
  TIMEOUT: {
    messageKey: 'refinement.error.timeout',
    isRetryable: true,
  },
  PARSE_ERROR: {
    messageKey: 'refinement.error.parseError',
    isRetryable: true,
  },
  VALIDATION_ERROR: {
    messageKey: 'refinement.error.validationError',
    isRetryable: true,
  },
  PROHIBITED_NODE_TYPE: {
    messageKey: 'refinement.error.prohibitedNodeType',
    isRetryable: false,
  },
  UNKNOWN_ERROR: {
    messageKey: 'refinement.error.unknown',
    isRetryable: true,
  },
};

/**
 * 获取给定错误代码的错误消息信息
 *
 * @param errorCode - 来自 refinement 服务的错误代码
 * @returns 错误消息信息（i18n key 和重试资格）
 */
export function getErrorMessageInfo(errorCode: ErrorCode): ErrorMessageInfo {
  return ERROR_MESSAGE_MAP[errorCode];
}

/**
 * 检查错误是否可重试
 *
 * @param errorCode - 来自 refinement 服务的错误代码
 * @returns 如果错误可重试则返回 true（显示重试按钮）
 */
export function isRetryableError(errorCode: ErrorCode): boolean {
  return ERROR_MESSAGE_MAP[errorCode].isRetryable;
}
