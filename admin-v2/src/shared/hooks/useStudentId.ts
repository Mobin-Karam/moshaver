import { useStudentSelection } from "./useStudentSelection";

/**
 * Hook that synchronizes student selection with URL query params.
 * Automatically reads from URL on mount and syncs changes back to URL.
 *
 * Usage:
 * ```
 * const studentId = useStudentId();
 * ```
 *
 * The hook handles:
 * - Reading initial studentId from URL params (studentId query param)
 * - Persisting studentId changes to URL
 * - Syncing URL changes back to the hook
 */
export function useStudentId() {
  return useStudentSelection().studentId;
}
