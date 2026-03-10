import { describe, expect, it } from 'vitest';
import { computePortfolio } from '@/domain';
import {
  buildPlan,
  buildPlanEngineContext,
  buildPortfolioEngineContext,
  buildQuestionSession,
  buildStudySession,
} from './fixtures/engine.fixtures';

describe('Portfolio allocator', () => {
  it('prioritizes the more urgent and riskier plan in a multi-edital conflict', () => {
    const urgentPlan = buildPlan({
      planId: 'plan-urgent',
      name: 'PGE-SP',
      examDate: '2026-03-20',
      subjects: [{ subject: 'Direito Constitucional', weight: 20, priorityOverride: null }],
    });

    const importantPlan = buildPlan({
      planId: 'plan-important',
      name: 'Magistratura',
      examDate: null,
      userPriority: 1,
      subjects: [{ subject: 'Direito Constitucional', weight: 20, priorityOverride: null }],
    });

    const urgentContext = buildPlanEngineContext({
      plan: urgentPlan,
      sessions: [buildStudySession({ subject: 'Direito Constitucional', hours: 0.5, date: '2026-03-07' })],
      allTimeSessions: [buildStudySession({ subject: 'Direito Constitucional', hours: 0.5, date: '2026-03-07' })],
      questions: [],
      allTimeQuestions: [],
    });

    const importantContext = buildPlanEngineContext({
      plan: importantPlan,
      sessions: [
        buildStudySession({ subject: 'Direito Constitucional', hours: 2, date: '2026-03-05' }),
        buildStudySession({ subject: 'Direito Constitucional', hours: 2, date: '2026-03-07' }),
      ],
      questions: [
        buildQuestionSession({
          subject: 'Direito Constitucional',
          totalQuestions: 20,
          correctAnswers: 18,
        }),
      ],
    });

    const portfolio = computePortfolio(
      buildPortfolioEngineContext(
        [urgentPlan, importantPlan],
        new Map([
          [urgentPlan.planId, urgentContext],
          [importantPlan.planId, importantContext],
        ]),
        { globalWeeklyBudget: 25 }
      )
    );

    expect(portfolio.plans[0].planId).toBe('plan-urgent');
    expect(portfolio.plans[0].allocatedPercent).toBeGreaterThan(
      portfolio.plans[1].allocatedPercent
    );
    expect(portfolio.plans[1].allocatedPercent).toBeGreaterThanOrEqual(10);
    expect(portfolio.sharedSubjects[0]?.subject).toBe('direito constitucional');
  });
});
