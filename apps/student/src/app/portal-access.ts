export type PortalMode = 'student' | 'guardian' | 'observer';

export interface PortalAccess {
  mode: PortalMode;
  canMutateStudentWork: boolean;
  canTakeExams: boolean;
  canReadPlans: boolean;
  canReadExams: boolean;
  canReadLearning: boolean;
  canReadResources: boolean;
  canUseQuizzes: boolean;
  canReadSubjects: boolean;
  canReadGuardianStudents: boolean;
  canUseChat: boolean;
  navigation: Array<'today' | 'plan' | 'exams' | 'chat' | 'more'>;
}

export function portalAccess(roles: readonly string[], capabilities: readonly string[]): PortalAccess | null {
  const has = (capability: string) => capabilities.includes(capability);
  const student = roles.includes('STUDENT') && has('student.profile.read');
  const guardian = roles.includes('GUARDIAN') && has('guardian.students.read');

  if (!student && !guardian) return null;

  const mode: PortalMode = student ? 'student' : guardian ? 'guardian' : 'observer';
  const canReadPlans = student ? has('plans.read') : has('guardian.schedule.read');
  const canReadExams = student ? has('exams.read') : has('guardian.exams.read');
  const canReadLearning = student ? has('learning.read') : has('guardian.progress.read');
  return {
    mode,
    canMutateStudentWork: student && has('tasks.update'),
    canTakeExams: student && has('exams.read'),
    canReadPlans,
    canReadExams,
    canReadLearning,
    canReadResources: has('learning_resources.read'),
    canUseQuizzes: student && has('student.quizzes.read'),
    canReadSubjects: has('studentSubjects.read'),
    canReadGuardianStudents: guardian,
    canUseChat: has('chat.read'),
    navigation: [
      'today',
      ...(canReadPlans ? (['plan'] as const) : []),
      ...(canReadExams ? (['exams'] as const) : []),
      ...(has('chat.read') ? (['chat'] as const) : []),
      'more',
    ],
  };
}
