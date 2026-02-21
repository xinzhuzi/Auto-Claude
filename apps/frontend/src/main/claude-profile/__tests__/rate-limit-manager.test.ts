/**
 * Rate Limit Manager 单元测试
 *
 * 测试覆盖：
 * - recordRateLimitEvent: 记录限流事件
 * - isProfileRateLimited: 检查是否被限流
 * - clearRateLimitEvents: 清除限流事件
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  recordRateLimitEvent,
  isProfileRateLimited,
  clearRateLimitEvents,
} from '../rate-limit-manager';
import type { ClaudeProfile } from '../../../shared/types';

// Mock usage-parser
vi.mock('../usage-parser', () => ({
  parseResetTime: vi.fn((resetTimeStr: string) => {
    // Simple mock: parse common formats
    const now = new Date();

    // Format: "Dec 17 at 6am" -> date with month
    const dateMatch = resetTimeStr.match(/([A-Za-z]+)\s+(\d+)/);
    if (dateMatch) {
      const monthMap: Record<string, number> = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
      };
      const monthNum = monthMap[dateMatch[1].toLowerCase()] ?? now.getMonth();
      return new Date(now.getFullYear(), monthNum, parseInt(dateMatch[2], 10), 6, 0);
    }

    // Format: "11:59pm" -> future time
    if (resetTimeStr.includes(':')) {
      const future = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      return future;
    }

    // Default: 5 hours from now
    return new Date(now.getTime() + 5 * 60 * 60 * 1000);
  }),
  classifyRateLimitType: vi.fn((resetTimeStr: string) => {
    const hasDate = /[A-Za-z]{3}\s+\d+/i.test(resetTimeStr);
    const hasWeeklyIndicator = resetTimeStr.toLowerCase().includes('week');
    return (hasDate || hasWeeklyIndicator) ? 'weekly' : 'session';
  }),
}));

import { parseResetTime, classifyRateLimitType } from '../usage-parser';

const mockedParseResetTime = vi.mocked(parseResetTime);
const mockedClassifyRateLimitType = vi.mocked(classifyRateLimitType);

describe('rate-limit-manager', () => {
  let mockProfile: ClaudeProfile;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));

    mockProfile = {
      id: 'test-profile',
      name: 'Test Profile',
      createdAt: new Date(),
      rateLimitEvents: [],
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('recordRateLimitEvent', () => {
    it('should create a rate limit event with correct properties', () => {
      mockedParseResetTime.mockReturnValue(new Date('2024-06-15T17:00:00Z'));
      mockedClassifyRateLimitType.mockReturnValue('session');

      const result = recordRateLimitEvent(mockProfile, '5:00pm');

      expect(result.type).toBe('session');
      expect(result.hitAt).toBeInstanceOf(Date);
      expect(result.resetAt).toEqual(new Date('2024-06-15T17:00:00Z'));
      expect(result.resetTimeString).toBe('5:00pm');
    });

    it('should add event to profile rateLimitEvents', () => {
      mockedParseResetTime.mockReturnValue(new Date('2024-06-15T17:00:00Z'));
      mockedClassifyRateLimitType.mockReturnValue('session');

      recordRateLimitEvent(mockProfile, '5:00pm');

      expect(mockProfile.rateLimitEvents).toHaveLength(1);
      expect(mockProfile.rateLimitEvents?.[0].resetTimeString).toBe('5:00pm');
    });

    it('should keep only last 10 events', () => {
      mockedParseResetTime.mockReturnValue(new Date('2024-06-15T17:00:00Z'));
      mockedClassifyRateLimitType.mockReturnValue('session');

      // Add 15 events
      for (let i = 0; i < 15; i++) {
        recordRateLimitEvent(mockProfile, `event-${i}`);
      }

      expect(mockProfile.rateLimitEvents).toHaveLength(10);
      // Most recent should be first
      expect(mockProfile.rateLimitEvents?.[0].resetTimeString).toBe('event-14');
      // Oldest kept should be event-5
      expect(mockProfile.rateLimitEvents?.[9].resetTimeString).toBe('event-5');
    });

    it('should add new event at the beginning of the array', () => {
      mockedParseResetTime.mockReturnValue(new Date('2024-06-15T17:00:00Z'));
      mockedClassifyRateLimitType.mockReturnValue('session');

      recordRateLimitEvent(mockProfile, 'first');
      recordRateLimitEvent(mockProfile, 'second');
      recordRateLimitEvent(mockProfile, 'third');

      expect(mockProfile.rateLimitEvents?.[0].resetTimeString).toBe('third');
      expect(mockProfile.rateLimitEvents?.[1].resetTimeString).toBe('second');
      expect(mockProfile.rateLimitEvents?.[2].resetTimeString).toBe('first');
    });

    it('should preserve existing events when adding new ones', () => {
      mockedParseResetTime.mockReturnValue(new Date('2024-06-15T17:00:00Z'));
      mockedClassifyRateLimitType.mockReturnValue('session');

      // Pre-populate with some events
      mockProfile.rateLimitEvents = [
        { type: 'session', hitAt: new Date(), resetAt: new Date(), resetTimeString: 'existing-1' },
        { type: 'weekly', hitAt: new Date(), resetAt: new Date(), resetTimeString: 'existing-2' },
      ];

      recordRateLimitEvent(mockProfile, 'new-event');

      expect(mockProfile.rateLimitEvents).toHaveLength(3);
      expect(mockProfile.rateLimitEvents?.[0].resetTimeString).toBe('new-event');
    });

    it('should classify rate limit type correctly', () => {
      mockedClassifyRateLimitType.mockReturnValue('weekly');
      mockedParseResetTime.mockReturnValue(new Date('2024-06-22T00:00:00Z'));

      const result = recordRateLimitEvent(mockProfile, 'Jun 22 at 12am');

      expect(mockedClassifyRateLimitType).toHaveBeenCalledWith('Jun 22 at 12am');
      expect(result.type).toBe('weekly');
    });
  });

  describe('isProfileRateLimited', () => {
    it('should return limited: false for profile without events', () => {
      const result = isProfileRateLimited(mockProfile);

      expect(result.limited).toBe(false);
      expect(result.type).toBeUndefined();
      expect(result.resetAt).toBeUndefined();
    });

    it('should return limited: false for null profile', () => {
      const result = isProfileRateLimited(null as unknown as ClaudeProfile);

      expect(result.limited).toBe(false);
    });

    it('should return limited: false for undefined profile', () => {
      const result = isProfileRateLimited(undefined as unknown as ClaudeProfile);

      expect(result.limited).toBe(false);
    });

    it('should return limited: true when reset time is in the future', () => {
      // Current time: 2024-06-15T12:00:00Z
      // Reset time: 2024-06-15T17:00:00Z (5 hours in future)
      mockProfile.rateLimitEvents = [
        {
          type: 'session',
          hitAt: new Date('2024-06-15T11:00:00Z'),
          resetAt: new Date('2024-06-15T17:00:00Z'),
          resetTimeString: '5:00pm',
        },
      ];

      const result = isProfileRateLimited(mockProfile);

      expect(result.limited).toBe(true);
      expect(result.type).toBe('session');
      expect(result.resetAt).toEqual(new Date('2024-06-15T17:00:00Z'));
    });

    it('should return limited: false when reset time has passed', () => {
      // Current time: 2024-06-15T12:00:00Z
      // Reset time: 2024-06-15T10:00:00Z (2 hours ago)
      mockProfile.rateLimitEvents = [
        {
          type: 'session',
          hitAt: new Date('2024-06-15T09:00:00Z'),
          resetAt: new Date('2024-06-15T10:00:00Z'),
          resetTimeString: '10:00am',
        },
      ];

      const result = isProfileRateLimited(mockProfile);

      expect(result.limited).toBe(false);
    });

    it('should check only the most recent event', () => {
      // Current time: 2024-06-15T12:00:00Z
      // Latest event: resets at 10:00am (past)
      // Second event: resets at 5:00pm (future)
      mockProfile.rateLimitEvents = [
        {
          type: 'session',
          hitAt: new Date('2024-06-15T09:00:00Z'),
          resetAt: new Date('2024-06-15T10:00:00Z'), // Past
          resetTimeString: '10:00am',
        },
        {
          type: 'weekly',
          hitAt: new Date('2024-06-14T12:00:00Z'),
          resetAt: new Date('2024-06-15T17:00:00Z'), // Future
          resetTimeString: 'Jun 15 at 5pm',
        },
      ];

      const result = isProfileRateLimited(mockProfile);

      // Should only check first (most recent) event, which has passed
      expect(result.limited).toBe(false);
    });

    it('should return weekly type for weekly limits', () => {
      mockProfile.rateLimitEvents = [
        {
          type: 'weekly',
          hitAt: new Date('2024-06-15T11:00:00Z'),
          resetAt: new Date('2024-06-22T00:00:00Z'), // 7 days in future
          resetTimeString: 'Jun 22',
        },
      ];

      const result = isProfileRateLimited(mockProfile);

      expect(result.limited).toBe(true);
      expect(result.type).toBe('weekly');
    });

    it('should handle reset time exactly at current time', () => {
      // Reset time exactly equal to now
      mockProfile.rateLimitEvents = [
        {
          type: 'session',
          hitAt: new Date('2024-06-15T11:00:00Z'),
          resetAt: new Date('2024-06-15T12:00:00Z'), // Exactly now
          resetTimeString: '12:00pm',
        },
      ];

      const result = isProfileRateLimited(mockProfile);

      // resetAt > now, so not limited when equal
      expect(result.limited).toBe(false);
    });
  });

  describe('clearRateLimitEvents', () => {
    it('should clear all rate limit events', () => {
      mockProfile.rateLimitEvents = [
        { type: 'session', hitAt: new Date(), resetAt: new Date(), resetTimeString: 'event1' },
        { type: 'weekly', hitAt: new Date(), resetAt: new Date(), resetTimeString: 'event2' },
      ];

      clearRateLimitEvents(mockProfile);

      expect(mockProfile.rateLimitEvents).toEqual([]);
    });

    it('should handle empty events array', () => {
      mockProfile.rateLimitEvents = [];

      clearRateLimitEvents(mockProfile);

      expect(mockProfile.rateLimitEvents).toEqual([]);
    });

    it('should handle undefined rateLimitEvents', () => {
      mockProfile.rateLimitEvents = undefined as unknown as [];

      clearRateLimitEvents(mockProfile);

      expect(mockProfile.rateLimitEvents).toEqual([]);
    });
  });

  describe('integration: record + check + clear', () => {
    it('should work together for a typical rate limit flow', () => {
      mockedParseResetTime.mockReturnValue(new Date('2024-06-15T17:00:00Z'));
      mockedClassifyRateLimitType.mockReturnValue('session');

      // 1. Record a rate limit event
      recordRateLimitEvent(mockProfile, '5:00pm');

      // 2. Check if limited (should be yes)
      let status = isProfileRateLimited(mockProfile);
      expect(status.limited).toBe(true);

      // 3. Move time forward past reset time
      vi.setSystemTime(new Date('2024-06-15T18:00:00Z'));

      // 4. Check again (should be no)
      status = isProfileRateLimited(mockProfile);
      expect(status.limited).toBe(false);

      // 5. Clear events
      clearRateLimitEvents(mockProfile);

      // 6. Verify cleared
      expect(mockProfile.rateLimitEvents).toEqual([]);
    });
  });
});
