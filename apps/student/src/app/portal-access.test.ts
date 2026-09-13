import { describe, expect, it } from 'vitest';
import { portalAccess } from './portal-access';

describe('Student and Family portal access', () => {
  it('enables student mutations only from student capabilities', () => {
    const access = portalAccess([
      'student.profile.read',
      'tasks.update',
      'learning.create',
      'exams.read',
      'chat.read',
    ]);
    expect(access).toMatchObject({
      mode: 'student',
      canMutateStudentWork: true,
      canTakeExams: true,
      canReadGuardianStudents: false,
    });
  });

  it('keeps Guardian mode read-only even when educational data is visible', () => {
    const access = portalAccess([
      'guardian.students.read',
      'guardian.dashboard.read',
      'guardian.exams.read',
      'chat.read',
    ]);
    expect(access).toMatchObject({
      mode: 'guardian',
      canMutateStudentWork: false,
      canTakeExams: false,
      canReadGuardianStudents: true,
    });
  });

  it('rejects accounts without a learner or related-family capability', () => {
    expect(portalAccess(['exams.create', 'students.read'])).toBeNull();
  });
});
