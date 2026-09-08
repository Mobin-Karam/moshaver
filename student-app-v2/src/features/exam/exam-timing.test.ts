import { describe, expect, it } from 'vitest';
import { timerWarning } from './components/ExamRunner';

describe('exam timer warnings', () => {
  it('uses calm duration-aware 15, 5 and 1 minute thresholds', () => {
    expect(timerWarning(901, 3600)).toBeNull();
    expect(timerWarning(900, 3600)).toBe('fifteen');
    expect(timerWarning(300, 3600)).toBe('five');
    expect(timerWarning(60, 3600)).toBe('one');
    expect(timerWarning(900, 1200)).toBeNull();
  });
});
