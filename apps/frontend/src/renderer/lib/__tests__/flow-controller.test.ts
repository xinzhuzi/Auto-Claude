/**
 * Flow Controller 单元测试
 *
 * 测试覆盖：
 * - write: 写入数据和背压控制
 * - isBlocked: 检查阻塞状态
 * - getPendingCallbacks: 获取待处理回调数
 * - getStats: 获取统计信息
 * - resetStats: 重置统计
 * - forceUnblock: 强制解除阻塞
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FlowController } from '../flow-controller';
import type { Terminal } from '@xterm/xterm';

// Mock Terminal
function createMockTerminal(): Terminal {
  return {
    write: vi.fn((data: string, callback?: () => void) => {
      // Simulate async callback execution
      if (callback) {
        setTimeout(callback, 0);
      }
    }),
  } as unknown as Terminal;
}

describe('FlowController', () => {
  let controller: FlowController;
  let mockTerminal: Terminal;

  beforeEach(() => {
    controller = new FlowController();
    mockTerminal = createMockTerminal();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should start unblocked', () => {
      expect(controller.isBlocked()).toBe(false);
    });

    it('should start with zero pending callbacks', () => {
      expect(controller.getPendingCallbacks()).toBe(0);
    });

    it('should start with zero stats', () => {
      const stats = controller.getStats();
      expect(stats.totalWrites).toBe(0);
      expect(stats.totalBytes).toBe(0);
      expect(stats.blockedCount).toBe(0);
      expect(stats.maxPendingCallbacks).toBe(0);
    });
  });

  describe('write - small chunks (fast path)', () => {
    it('should write small chunks without callback overhead', async () => {
      const data = 'small chunk';

      await controller.write(mockTerminal, data);

      expect(mockTerminal.write).toHaveBeenCalledWith(data);
      expect(mockTerminal.write).not.toHaveBeenCalledWith(data, expect.any(Function));
    });

    it('should accumulate bytes across multiple small writes', async () => {
      await controller.write(mockTerminal, 'a'.repeat(50000));
      await controller.write(mockTerminal, 'a'.repeat(50000));

      // After 100KB accumulated (50K + 50K), the second write triggers callback mode
      // because bytesWritten >= 100KB after the first write
      // Let me verify: bytesWritten after first = 50000, then second = 100000
      // Second write has bytesWritten >= 100KB BEFORE write, so uses callback

      // Actually, let me check the logic again:
      // First write: bytesWritten = 0, add 50000, now 50000 < 100KB, fast path
      // Second write: bytesWritten = 50000, add 50000, now 100000 >= 100KB, callback

      // So the second write should have used callback
      expect(mockTerminal.write).toHaveBeenCalledWith(
        'a'.repeat(50000),
        expect.any(Function)
      );
    });

    it('should track total bytes written', async () => {
      await controller.write(mockTerminal, 'hello');
      await controller.write(mockTerminal, 'world');

      const stats = controller.getStats();
      expect(stats.totalBytes).toBe(10);
    });

    it('should track total write count', async () => {
      await controller.write(mockTerminal, 'a');
      await controller.write(mockTerminal, 'b');
      await controller.write(mockTerminal, 'c');

      const stats = controller.getStats();
      expect(stats.totalWrites).toBe(3);
    });
  });

  describe('write - large chunks (callback tracking)', () => {
    it('should use callbacks after BYTE_THRESHOLD exceeded', async () => {
      // Write 100KB to trigger callback mode
      await controller.write(mockTerminal, 'a'.repeat(100_000));
      await controller.write(mockTerminal, 'next chunk');

      // The second write should use callback because bytesWritten >= 100KB after first write
      // Wait, let me check the logic...
      // bytesWritten accumulates, then after >= 100KB, uses callback
      // So the first 100KB write triggers callback mode
      expect(mockTerminal.write).toHaveBeenCalledWith(
        'a'.repeat(100_000),
        expect.any(Function)
      );
    });

    it('should increment pending callbacks when using callbacks', async () => {
      await controller.write(mockTerminal, 'a'.repeat(100_000));

      // Pending callbacks should be 1 before callback fires
      expect(controller.getPendingCallbacks()).toBe(1);
    });

    it('should decrement pending callbacks when callback fires', async () => {
      await controller.write(mockTerminal, 'a'.repeat(100_000));

      // Flush the callback
      await vi.runAllTimersAsync();

      expect(controller.getPendingCallbacks()).toBe(0);
    });

    it('should reset bytesWritten after using callback', async () => {
      await controller.write(mockTerminal, 'a'.repeat(100_000));

      // Write another chunk
      await controller.write(mockTerminal, 'small');

      // bytesWritten should be reset and start fresh
      const stats = controller.getStats();
      expect(stats.totalBytes).toBe(100_000 + 5);
    });
  });

  describe('backpressure - blocking', () => {
    it('should block when pending callbacks exceed HIGH_WATERMARK', async () => {
      // Write 6 large chunks to exceed HIGH_WATERMARK (5)
      for (let i = 0; i < 6; i++) {
        await controller.write(mockTerminal, 'a'.repeat(100_000));
      }

      expect(controller.isBlocked()).toBe(true);
    });

    it('should increment blockedCount when blocking', async () => {
      for (let i = 0; i < 6; i++) {
        await controller.write(mockTerminal, 'a'.repeat(100_000));
      }

      const stats = controller.getStats();
      expect(stats.blockedCount).toBe(1);
    });

    it('should track maxPendingCallbacks', async () => {
      for (let i = 0; i < 6; i++) {
        await controller.write(mockTerminal, 'a'.repeat(100_000));
      }

      const stats = controller.getStats();
      expect(stats.maxPendingCallbacks).toBe(6);
    });
  });

  describe('backpressure - unblocking', () => {
    it('should unblock when pending callbacks drop below LOW_WATERMARK', async () => {
      // Get to blocked state
      for (let i = 0; i < 6; i++) {
        await controller.write(mockTerminal, 'a'.repeat(100_000));
      }
      expect(controller.isBlocked()).toBe(true);

      // Flush 5 callbacks to get below LOW_WATERMARK (2)
      await vi.runAllTimersAsync();

      expect(controller.isBlocked()).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return all stats including current state', () => {
      const stats = controller.getStats();

      expect(stats).toHaveProperty('totalWrites');
      expect(stats).toHaveProperty('totalBytes');
      expect(stats).toHaveProperty('blockedCount');
      expect(stats).toHaveProperty('maxPendingCallbacks');
      expect(stats).toHaveProperty('currentPending');
      expect(stats).toHaveProperty('isBlocked');
    });

    it('should reflect current state', async () => {
      await controller.write(mockTerminal, 'test data');

      const stats = controller.getStats();
      expect(stats.totalWrites).toBe(1);
      expect(stats.totalBytes).toBe(9);
      expect(stats.currentPending).toBe(0);
      expect(stats.isBlocked).toBe(false);
    });
  });

  describe('resetStats', () => {
    it('should reset all statistics', async () => {
      await controller.write(mockTerminal, 'test');
      await controller.write(mockTerminal, 'a'.repeat(100_000));
      await controller.write(mockTerminal, 'a'.repeat(100_000));
      await controller.write(mockTerminal, 'a'.repeat(100_000));
      await controller.write(mockTerminal, 'a'.repeat(100_000));
      await controller.write(mockTerminal, 'a'.repeat(100_000));
      await controller.write(mockTerminal, 'a'.repeat(100_000));

      controller.resetStats();

      const stats = controller.getStats();
      expect(stats.totalWrites).toBe(0);
      expect(stats.totalBytes).toBe(0);
      expect(stats.blockedCount).toBe(0);
      expect(stats.maxPendingCallbacks).toBe(0);
    });

    it('should not reset current state (pending/blocked)', async () => {
      // Get to blocked state
      for (let i = 0; i < 6; i++) {
        await controller.write(mockTerminal, 'a'.repeat(100_000));
      }

      controller.resetStats();

      // State should persist
      expect(controller.isBlocked()).toBe(true);
      expect(controller.getPendingCallbacks()).toBeGreaterThan(0);
    });
  });

  describe('forceUnblock', () => {
    it('should unblock when blocked', async () => {
      for (let i = 0; i < 6; i++) {
        await controller.write(mockTerminal, 'a'.repeat(100_000));
      }
      expect(controller.isBlocked()).toBe(true);

      controller.forceUnblock();

      expect(controller.isBlocked()).toBe(false);
    });

    it('should reset pending callbacks', async () => {
      for (let i = 0; i < 6; i++) {
        await controller.write(mockTerminal, 'a'.repeat(100_000));
      }

      controller.forceUnblock();

      expect(controller.getPendingCallbacks()).toBe(0);
    });

    it('should reset bytesWritten', async () => {
      await controller.write(mockTerminal, 'a'.repeat(100_000));

      controller.forceUnblock();

      // Write a small chunk - should not trigger callback mode
      await controller.write(mockTerminal, 'small');

      // Should use fast path (no callback)
      expect(mockTerminal.write).toHaveBeenLastCalledWith('small');
    });

    it('should not affect unblocked controller', () => {
      expect(controller.isBlocked()).toBe(false);

      controller.forceUnblock();

      expect(controller.isBlocked()).toBe(false);
    });

    it('should resolve pending write promise', async () => {
      // Get to blocked state
      for (let i = 0; i < 6; i++) {
        await controller.write(mockTerminal, 'a'.repeat(100_000));
      }

      // Start a write that will wait due to blocking
      const writePromise = controller.write(mockTerminal, 'waiting data');

      // Force unblock
      controller.forceUnblock();

      // The write should complete
      await vi.runAllTimersAsync();
      await expect(writePromise).resolves.toBeUndefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle continuous streaming without blocking under normal load', async () => {
      // Simulate normal streaming: many small chunks
      for (let i = 0; i < 100; i++) {
        await controller.write(mockTerminal, 'a'.repeat(500)); // 500 bytes each
      }

      // Should not block with small chunks
      expect(controller.isBlocked()).toBe(false);
      expect(controller.getStats().totalBytes).toBe(50000);
    });

    it('should handle burst of large writes', async () => {
      // Burst of large writes
      for (let i = 0; i < 6; i++) {
        await controller.write(mockTerminal, 'a'.repeat(100_000));
      }

      // Should block
      expect(controller.isBlocked()).toBe(true);

      // Flush callbacks - this will unblock
      await vi.runAllTimersAsync();

      // Should unblock after draining
      expect(controller.isBlocked()).toBe(false);
    });

    it('should recover from blocked state naturally', async () => {
      // Get blocked
      for (let i = 0; i < 6; i++) {
        await controller.write(mockTerminal, 'a'.repeat(100_000));
      }
      expect(controller.isBlocked()).toBe(true);

      // Let all callbacks complete
      await vi.runAllTimersAsync();

      // Should be unblocked
      expect(controller.isBlocked()).toBe(false);
      expect(controller.getPendingCallbacks()).toBe(0);
    });
  });
});
