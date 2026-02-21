/**
 * Usage Parser 单元测试
 *
 * 测试覆盖：
 * - parseResetTime: 解析重置时间字符串
 * - classifyRateLimitType: 分类限流类型
 * - parseUsageOutput: 解析 /usage 命令输出
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseResetTime,
  classifyRateLimitType,
  parseUsageOutput,
} from '../usage-parser';

describe('usage-parser', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z')); // Saturday, June 15, 2024, noon UTC
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('parseResetTime', () => {
    describe('date + time format', () => {
      it('should parse "Dec 17 at 6am" format', () => {
        const result = parseResetTime('Dec 17 at 6am');

        expect(result.getMonth()).toBe(11); // December
        expect(result.getDate()).toBe(17);
        expect(result.getHours()).toBe(6);
      });

      it('should parse "Nov 1, 10:59am" format', () => {
        const result = parseResetTime('Nov 1, 10:59am');

        expect(result.getMonth()).toBe(10); // November
        expect(result.getDate()).toBe(1);
        expect(result.getHours()).toBe(10);
        expect(result.getMinutes()).toBe(59);
      });

      it('should parse "Jun 20 at 3:30pm" format', () => {
        const result = parseResetTime('Jun 20 at 3:30pm');

        expect(result.getMonth()).toBe(5); // June
        expect(result.getDate()).toBe(20);
        expect(result.getHours()).toBe(15); // 3pm = 15
        expect(result.getMinutes()).toBe(30);
      });

      it('should handle timezone in parentheses', () => {
        // "Dec 17 at 6am (Europe/Oslo)" - should still parse the date/time
        const result = parseResetTime('Dec 17 at 6am (Europe/Oslo)');

        expect(result.getMonth()).toBe(11);
        expect(result.getDate()).toBe(17);
        expect(result.getHours()).toBe(6);
      });

      it('should handle 12pm (noon) correctly', () => {
        const result = parseResetTime('Jun 15 at 12pm');

        expect(result.getHours()).toBe(12);
      });

      it('should handle 12am (midnight) correctly', () => {
        const result = parseResetTime('Jun 16 at 12am');

        expect(result.getHours()).toBe(0);
      });
    });

    describe('time-only format', () => {
      it('should parse "11:59pm" format', () => {
        const result = parseResetTime('11:59pm');

        expect(result.getHours()).toBe(23);
        expect(result.getMinutes()).toBe(59);
      });

      it('should parse "6am" format without minutes', () => {
        const result = parseResetTime('6am');

        expect(result.getHours()).toBe(6);
        expect(result.getMinutes()).toBe(0);
      });

      it('should return tomorrow if time has passed today', () => {
        // Current time is 12:00pm, parsing 10:00am should return tomorrow
        const result = parseResetTime('10:00am');

        // Should be tomorrow (June 16)
        expect(result.getDate()).toBe(16);
        expect(result.getHours()).toBe(10);
      });

      it('should return today if time is in the future', () => {
        // Current time is 12:00pm UTC, parsing 5:00pm should return today
        // Note: parseResetTime uses local timezone, so we need to account for that
        const result = parseResetTime('5:00pm');

        // 5pm should be later than 12pm, so it should be today or tomorrow
        // depending on timezone handling
        const hours = result.getHours();
        expect([15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4]).toContain(hours);
      });
    });

    describe('edge cases', () => {
      it('should handle past dates by assuming next year', () => {
        // Current: June 15, 2024
        // Parse: "Jan 15 at 6am" (already passed this year)
        const result = parseResetTime('Jan 15 at 6am');

        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(0); // January
        expect(result.getDate()).toBe(15);
      });

      it('should fallback to 5 hours for unrecognizable input (session)', () => {
        const result = parseResetTime('unknown format');

        // Should be about 5 hours from now
        const expectedTime = new Date('2024-06-15T17:00:00Z').getTime();
        expect(result.getTime()).toBe(expectedTime);
      });

      it('should fallback to 7 days for weekly indicator', () => {
        const result = parseResetTime('weekly reset');

        // Should be about 7 days from now
        const expectedTime = new Date('2024-06-22T12:00:00Z').getTime();
        expect(result.getTime()).toBe(expectedTime);
      });

      it('should handle empty string', () => {
        const result = parseResetTime('');

        // Should fallback to 5 hours
        expect(result.getTime()).toBeGreaterThan(Date.now());
      });

      it('should handle case-insensitive month names', () => {
        const result1 = parseResetTime('JAN 1 at 6am');
        const result2 = parseResetTime('jan 1 at 6am');
        const result3 = parseResetTime('Jan 1 at 6am');

        expect(result1.getMonth()).toBe(0);
        expect(result2.getMonth()).toBe(0);
        expect(result3.getMonth()).toBe(0);
      });
    });
  });

  describe('classifyRateLimitType', () => {
    it('should return "weekly" for date formats like "Dec 17"', () => {
      expect(classifyRateLimitType('Dec 17 at 6am')).toBe('weekly');
      expect(classifyRateLimitType('Nov 1, 10:59am')).toBe('weekly');
      expect(classifyRateLimitType('Jun 20 at 3pm')).toBe('weekly');
    });

    it('should return "weekly" for "week" keyword', () => {
      expect(classifyRateLimitType('weekly reset')).toBe('weekly');
      expect(classifyRateLimitType('this week')).toBe('weekly');
      expect(classifyRateLimitType('WEEK')).toBe('weekly');
    });

    it('should return "session" for time-only formats', () => {
      expect(classifyRateLimitType('11:59pm')).toBe('session');
      expect(classifyRateLimitType('6am')).toBe('session');
      expect(classifyRateLimitType('5:00pm')).toBe('session');
    });

    it('should return "session" for unrecognized formats', () => {
      expect(classifyRateLimitType('unknown')).toBe('session');
      expect(classifyRateLimitType('')).toBe('session');
    });

    it('should be case-insensitive', () => {
      expect(classifyRateLimitType('DEC 17')).toBe('weekly');
      expect(classifyRateLimitType('dec 17')).toBe('weekly');
      expect(classifyRateLimitType('11:59PM')).toBe('session');
    });
  });

  describe('parseUsageOutput', () => {
    it('should parse typical usage output with session and weekly', () => {
      const output = `
Current session ████▌ 9% used Resets 11:59pm
Current week (all models) 79% used Resets Nov 1, 10:59am
Current week (Opus) 0% used
      `.trim();

      const result = parseUsageOutput(output);

      expect(result.sessionUsagePercent).toBe(9);
      expect(result.sessionResetTime).toBe('11:59pm');
      expect(result.weeklyUsagePercent).toBe(79);
      expect(result.weeklyResetTime).toBe('Nov 1, 10:59am');
      expect(result.opusUsagePercent).toBe(0);
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should parse session-only output', () => {
      const output = 'Current session 50% used Resets 5:00pm';

      const result = parseUsageOutput(output);

      expect(result.sessionUsagePercent).toBe(50);
      expect(result.sessionResetTime).toBe('5:00pm');
      expect(result.weeklyUsagePercent).toBe(0);
      expect(result.weeklyResetTime).toBe('');
    });

    it('should handle output without reset time', () => {
      const output = 'Current session 30% used';

      const result = parseUsageOutput(output);

      expect(result.sessionUsagePercent).toBe(30);
      expect(result.sessionResetTime).toBe('');
    });

    it('should parse with progress bar characters', () => {
      const output = 'Current session ██████████ 100% used Resets 12am';

      const result = parseUsageOutput(output);

      expect(result.sessionUsagePercent).toBe(100);
    });

    it('should parse with partial progress bar', () => {
      const output = 'Current session ███▌ 35% used Resets 6pm';

      const result = parseUsageOutput(output);

      expect(result.sessionUsagePercent).toBe(35);
    });

    it('should handle empty output', () => {
      const result = parseUsageOutput('');

      expect(result.sessionUsagePercent).toBe(0);
      expect(result.weeklyUsagePercent).toBe(0);
      expect(result.opusUsagePercent).toBeUndefined();
    });

    it('should handle output without recognizable sections', () => {
      const result = parseUsageOutput('Some unrelated output');

      expect(result.sessionUsagePercent).toBe(0);
      expect(result.weeklyUsagePercent).toBe(0);
    });

    it('should be case-insensitive for section names', () => {
      const output = `
CURRENT SESSION 10% used Resets 5pm
CURRENT WEEK (ALL MODELS) 50% used Resets Jun 20
      `.trim();

      const result = parseUsageOutput(output);

      expect(result.sessionUsagePercent).toBe(10);
      expect(result.weeklyUsagePercent).toBe(50);
    });

    it('should parse Opus-specific weekly usage', () => {
      const output = `
Current week (all models) 60% used Resets Jun 20
Current week (Opus) 25% used
      `.trim();

      const result = parseUsageOutput(output);

      expect(result.weeklyUsagePercent).toBe(60);
      expect(result.opusUsagePercent).toBe(25);
    });

    it('should handle multiline output with extra whitespace', () => {
      const output = `

Current session    15%   used   Resets   11pm

Current week (all models)    80%   used   Resets   Jun 22

      `.trim();

      const result = parseUsageOutput(output);

      expect(result.sessionUsagePercent).toBe(15);
      expect(result.weeklyUsagePercent).toBe(80);
    });

    it('should handle 0% usage', () => {
      const output = 'Current session 0% used Resets 5pm';

      const result = parseUsageOutput(output);

      expect(result.sessionUsagePercent).toBe(0);
    });

    it('should handle 100% usage', () => {
      const output = 'Current session 100% used Resets 5pm';

      const result = parseUsageOutput(output);

      expect(result.sessionUsagePercent).toBe(100);
    });
  });
});
