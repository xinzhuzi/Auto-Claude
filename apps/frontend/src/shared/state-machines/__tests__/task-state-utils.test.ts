/**
 * Task State Utils 单元测试
 *
 * 测试覆盖：
 * - TASK_STATE_NAMES: 状态名常量
 * - XSTATE_SETTLED_STATES: 已确定状态集合
 * - XSTATE_TO_PHASE: 状态到阶段的映射
 * - mapStateToLegacy: XState 状态到遗留状态的转换
 */
import { describe, it, expect } from 'vitest';
import {
  TASK_STATE_NAMES,
  XSTATE_SETTLED_STATES,
  XSTATE_TO_PHASE,
  mapStateToLegacy,
  type TaskStateName,
} from '../task-state-utils';
import type { TaskStatus, ReviewReason, ExecutionPhase } from '../../types';

describe('task-state-utils', () => {
  describe('TASK_STATE_NAMES', () => {
    it('should contain all expected state names', () => {
      expect(TASK_STATE_NAMES).toContain('backlog');
      expect(TASK_STATE_NAMES).toContain('planning');
      expect(TASK_STATE_NAMES).toContain('plan_review');
      expect(TASK_STATE_NAMES).toContain('coding');
      expect(TASK_STATE_NAMES).toContain('qa_review');
      expect(TASK_STATE_NAMES).toContain('qa_fixing');
      expect(TASK_STATE_NAMES).toContain('human_review');
      expect(TASK_STATE_NAMES).toContain('error');
      expect(TASK_STATE_NAMES).toContain('creating_pr');
      expect(TASK_STATE_NAMES).toContain('pr_created');
      expect(TASK_STATE_NAMES).toContain('done');
    });

    it('should have exactly 11 states', () => {
      expect(TASK_STATE_NAMES).toHaveLength(11);
    });

    it('should be a readonly array', () => {
      // TypeScript enforces readonly at compile time
      // At runtime, it's still an array
      expect(Array.isArray(TASK_STATE_NAMES)).toBe(true);
    });
  });

  describe('XSTATE_SETTLED_STATES', () => {
    it('should contain settled states', () => {
      expect(XSTATE_SETTLED_STATES.has('plan_review')).toBe(true);
      expect(XSTATE_SETTLED_STATES.has('human_review')).toBe(true);
      expect(XSTATE_SETTLED_STATES.has('error')).toBe(true);
      expect(XSTATE_SETTLED_STATES.has('creating_pr')).toBe(true);
      expect(XSTATE_SETTLED_STATES.has('pr_created')).toBe(true);
      expect(XSTATE_SETTLED_STATES.has('done')).toBe(true);
    });

    it('should not contain non-settled states', () => {
      expect(XSTATE_SETTLED_STATES.has('backlog')).toBe(false);
      expect(XSTATE_SETTLED_STATES.has('planning')).toBe(false);
      expect(XSTATE_SETTLED_STATES.has('coding')).toBe(false);
      expect(XSTATE_SETTLED_STATES.has('qa_review')).toBe(false);
      expect(XSTATE_SETTLED_STATES.has('qa_fixing')).toBe(false);
    });

    it('should be a Set', () => {
      expect(XSTATE_SETTLED_STATES).toBeInstanceOf(Set);
    });

    it('should have 6 settled states', () => {
      expect(XSTATE_SETTLED_STATES.size).toBe(6);
    });
  });

  describe('XSTATE_TO_PHASE', () => {
    it('should map backlog to idle', () => {
      expect(XSTATE_TO_PHASE['backlog']).toBe('idle');
    });

    it('should map planning states to planning', () => {
      expect(XSTATE_TO_PHASE['planning']).toBe('planning');
      expect(XSTATE_TO_PHASE['plan_review']).toBe('planning');
    });

    it('should map coding to coding', () => {
      expect(XSTATE_TO_PHASE['coding']).toBe('coding');
    });

    it('should map QA states correctly', () => {
      expect(XSTATE_TO_PHASE['qa_review']).toBe('qa_review');
      expect(XSTATE_TO_PHASE['qa_fixing']).toBe('qa_fixing');
    });

    it('should map completion states to complete', () => {
      expect(XSTATE_TO_PHASE['human_review']).toBe('complete');
      expect(XSTATE_TO_PHASE['creating_pr']).toBe('complete');
      expect(XSTATE_TO_PHASE['pr_created']).toBe('complete');
      expect(XSTATE_TO_PHASE['done']).toBe('complete');
    });

    it('should map error to failed', () => {
      expect(XSTATE_TO_PHASE['error']).toBe('failed');
    });

    it('should return undefined for unknown states', () => {
      expect(XSTATE_TO_PHASE['unknown_state']).toBeUndefined();
    });

    it('should cover all TASK_STATE_NAMES', () => {
      for (const state of TASK_STATE_NAMES) {
        expect(XSTATE_TO_PHASE[state]).toBeDefined();
      }
    });
  });

  describe('mapStateToLegacy', () => {
    describe('backlog', () => {
      it('should map backlog to backlog status', () => {
        const result = mapStateToLegacy('backlog');
        expect(result.status).toBe('backlog');
        expect(result.reviewReason).toBeUndefined();
      });
    });

    describe('in_progress states', () => {
      it('should map planning to in_progress', () => {
        const result = mapStateToLegacy('planning');
        expect(result.status).toBe('in_progress');
        expect(result.reviewReason).toBeUndefined();
      });

      it('should map coding to in_progress', () => {
        const result = mapStateToLegacy('coding');
        expect(result.status).toBe('in_progress');
        expect(result.reviewReason).toBeUndefined();
      });
    });

    describe('ai_review states', () => {
      it('should map qa_review to ai_review', () => {
        const result = mapStateToLegacy('qa_review');
        expect(result.status).toBe('ai_review');
        expect(result.reviewReason).toBeUndefined();
      });

      it('should map qa_fixing to ai_review', () => {
        const result = mapStateToLegacy('qa_fixing');
        expect(result.status).toBe('ai_review');
        expect(result.reviewReason).toBeUndefined();
      });
    });

    describe('human_review states', () => {
      it('should map plan_review to human_review with plan_review reason', () => {
        const result = mapStateToLegacy('plan_review');
        expect(result.status).toBe('human_review');
        expect(result.reviewReason).toBe('plan_review');
      });

      it('should map human_review with provided reason', () => {
        const result = mapStateToLegacy('human_review', 'stopped');
        expect(result.status).toBe('human_review');
        expect(result.reviewReason).toBe('stopped');
      });

      it('should map human_review with completed as default reason', () => {
        const result = mapStateToLegacy('human_review');
        expect(result.status).toBe('human_review');
        expect(result.reviewReason).toBe('completed');
      });

      it('should support all review reasons', () => {
        const reasons: ReviewReason[] = ['completed', 'stopped', 'errors', 'plan_review', 'qa_rejected'];

        for (const reason of reasons) {
          const result = mapStateToLegacy('human_review', reason);
          expect(result.reviewReason).toBe(reason);
        }
      });

      it('should map error to human_review with errors reason', () => {
        const result = mapStateToLegacy('error');
        expect(result.status).toBe('human_review');
        expect(result.reviewReason).toBe('errors');
      });

      it('should map creating_pr to human_review with completed reason', () => {
        const result = mapStateToLegacy('creating_pr');
        expect(result.status).toBe('human_review');
        expect(result.reviewReason).toBe('completed');
      });
    });

    describe('pr_created', () => {
      it('should map pr_created to pr_created status', () => {
        const result = mapStateToLegacy('pr_created');
        expect(result.status).toBe('pr_created');
        expect(result.reviewReason).toBeUndefined();
      });
    });

    describe('done', () => {
      it('should map done to done status', () => {
        const result = mapStateToLegacy('done');
        expect(result.status).toBe('done');
        expect(result.reviewReason).toBeUndefined();
      });
    });

    describe('unknown states', () => {
      it('should map unknown states to backlog', () => {
        const result = mapStateToLegacy('unknown_state');
        expect(result.status).toBe('backlog');
        expect(result.reviewReason).toBeUndefined();
      });

      it('should map empty string to backlog', () => {
        const result = mapStateToLegacy('');
        expect(result.status).toBe('backlog');
      });
    });

    describe('type coverage', () => {
      it('should return valid TaskStatus for all states', () => {
        const validStatuses: TaskStatus[] = [
          'backlog', 'in_progress', 'ai_review', 'human_review', 'pr_created', 'done'
        ];

        for (const state of TASK_STATE_NAMES) {
          const result = mapStateToLegacy(state);
          expect(validStatuses).toContain(result.status);
        }
      });
    });
  });
});
