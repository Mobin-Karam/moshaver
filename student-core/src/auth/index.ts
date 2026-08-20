import type { AuthProvider } from '../providers/index.js';

export interface StudentUser {
  id: string;
  role: string;
  name?: string;
  grade?: string;
  major?: string;
}

export function assertStudentUser<T extends StudentUser>(user: T | null): T {
  if (!user) {
    throw new Error('User is not authenticated.');
  }
  if (user.role !== 'student') {
    throw new Error('Authenticated user is not a student.');
  }
  return user;
}

export async function restoreStudentSession<T extends StudentUser>(
  auth: AuthProvider<T>,
): Promise<T | null> {
  const user = await auth.currentUser();
  return user ? assertStudentUser(user) : null;
}
