import { describe, expect, it } from 'vitest';
import { portalAccess } from './portal-access';

describe('Student and Family portal access', () => {
  it('enables student mutations only from student capabilities', () => {
    const access = portalAccess(['STUDENT'], [
      'student.profile.read',
      'tasks.update',
      'learning.create',
      'learning.read',
      'plans.read',
      'learning_resources.read',
      'student.quizzes.read',
      'exams.read',
      'chat.read',
    ]);
    expect(access).toMatchObject({
      mode: 'student',
      canMutateStudentWork: true,
      canTakeExams: true,
      canReadPlans: true,
      canReadExams: true,
      canReadLearning: true,
      canReadResources: true,
      canUseQuizzes: true,
      canReadGuardianStudents: false,
    });
  });

  it('keeps Guardian mode read-only even when educational data is visible', () => {
    const access = portalAccess(['GUARDIAN'], [
      'guardian.students.read',
      'guardian.dashboard.read',
      'guardian.schedule.read',
      'guardian.progress.read',
      'guardian.exams.read',
      'learning_resources.read',
      'chat.read',
    ]);
    expect(access).toMatchObject({
      mode: 'guardian',
      canMutateStudentWork: false,
      canTakeExams: false,
      canReadPlans: true,
      canReadExams: true,
      canReadLearning: true,
      canReadResources: true,
      canUseQuizzes: false,
      canReadGuardianStudents: true,
    });
  });

  it('keeps read-only students in the portal and hides unavailable sections', () => {
    const access = portalAccess(['STUDENT'], ['student.profile.read', 'plans.read']);
    expect(access).toMatchObject({
      mode: 'student',
      canMutateStudentWork: false,
      canReadPlans: true,
      canReadExams: false,
      navigation: ['today', 'plan', 'more'],
    });
  });

  it('rejects accounts without a learner or related-family capability', () => {
    expect(portalAccess(['ADVISOR'], ['exams.create', 'students.read'])).toBeNull();
  });

  it('rejects staff accounts even when their capabilities overlap student work', () => {
    expect(portalAccess(['ADVISOR'], ['student.profile.read', 'tasks.update', 'learning.create'])).toBeNull();
  });
});
