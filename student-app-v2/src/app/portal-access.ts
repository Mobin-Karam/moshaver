export type PortalMode = 'student' | 'guardian' | 'observer';

export interface PortalAccess {
  mode: PortalMode;
  canMutateStudentWork: boolean;
  canTakeExams: boolean;
  canReadGuardianStudents: boolean;
  canUseChat: boolean;
  navigation: Array<'today' | 'plan' | 'exams' | 'chat' | 'more'>;
}

export function portalAccess(capabilities: readonly string[]): PortalAccess | null {
  const has = (capability: string) => capabilities.includes(capability);
  const student = has('student.profile.read') && has('tasks.update') && has('learning.create');
  const guardian = has('guardian.students.read');

  if (!student && !guardian) return null;

  const mode: PortalMode = student ? 'student' : guardian ? 'guardian' : 'observer';
  return {
    mode,
    canMutateStudentWork: student && has('tasks.update'),
    canTakeExams: student && has('exams.read'),
    canReadGuardianStudents: guardian,
    canUseChat: has('chat.read'),
    navigation: ['today', 'plan', 'exams', ...(has('chat.read') ? (['chat'] as const) : []), 'more'],
  };
}
