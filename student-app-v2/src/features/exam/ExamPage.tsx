import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  reconcileAttemptAnswers,
  type AnswerSaveState,
  type AttemptAnswer,
  type ExamSummary,
  type QuizRun,
} from '@moshaver/student-core';
import { apiClient } from '../../services/api-client';
import { useStudentStore } from '../../services/student-store';
import { ExamCenter } from './components/ExamCenter';
import { ExamPreflight } from './components/ExamPreflight';
import { ExamResult, type ExamResultData } from './components/ExamResult';
import { ExamRunner } from './components/ExamRunner';
import { GuardianExamView } from './components/GuardianExamView';
import {
  attemptDraftKey,
  browserAttemptStorage,
  createAnswer,
  ExamAutosaveController,
  type AttemptDraft,
} from './exam-attempt-store';

type Screen = 'center' | 'preflight' | 'running' | 'review' | 'result';

export function ExamPage() {
  const exams = useStudentStore((state) => state.exams);
  const access = useStudentStore((state) => state.access);
  return access?.mode === 'guardian' ? <GuardianExamView exams={exams} /> : <StudentExamPage />;
}

function StudentExamPage() {
  const exams = useStudentStore((state) => state.exams);
  const user = useStudentStore((state) => state.user);
  const loadExams = useStudentStore((state) => state.loadExams);
  const [screen, setScreen] = useState<Screen>('center');
  const [exam, setExam] = useState<ExamSummary | null>(null);
  const [run, setRun] = useState<QuizRun | null>(null);
  const [answers, setAnswers] = useState<AttemptAnswer[]>([]);
  const [index, setIndex] = useState(0);
  const [saveState, setSaveState] = useState<AnswerSaveState>('local');
  const [result, setResult] = useState<ExamResultData | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [receivedAt, setReceivedAt] = useState(Date.now());
  const autosave = useRef<ExamAutosaveController | null>(null);

  const answerMap = useMemo(
    () => Object.fromEntries(answers.map((answer) => [answer.questionId, answer])),
    [answers],
  );

  const openPreflight = useCallback(async (summary: ExamSummary) => {
    setBusy(true);
    setError('');
    try {
      const attemptId = summary.delivery?.lastAttempt?.id;
      if (attemptId && ['released', 'withheld', 'calculating', 'submitted'].includes(summary.delivery?.state || '')) {
        const attemptResult = await apiClient.request<ExamResultData>(
          'GET',
          `/student/exams/attempts/${attemptId}`,
        );
        setResult(attemptResult);
        setScreen('result');
        return;
      }
      const detail = await apiClient.request<ExamSummary>('GET', `/student/exams/${summary.id}`);
      setExam({ ...summary, ...detail });
      setScreen('preflight');
    } catch (cause) {
      setError(readableError(cause));
    } finally {
      setBusy(false);
    }
  }, []);

  const attachRun = useCallback(
    (nextRun: QuizRun) => {
      if (!user) return;
      autosave.current?.dispose();
      const key = attemptDraftKey(user.id, nextRun.runId);
      const cached = browserAttemptStorage.read(key);
      const merged = reconcileAttemptAnswers(cached?.answers || [], nextRun.savedAnswers || []);
      const draft: AttemptDraft =
        cached?.run.runId === nextRun.runId
          ? { ...cached, run: nextRun, answers: merged }
          : {
              version: 2,
              accountId: user.id,
              run: nextRun,
              answers: merged,
              index: 0,
              pending: false,
              updatedAt: new Date().toISOString(),
            };
      browserAttemptStorage.write(key, draft);
      const controller = new ExamAutosaveController(
        draft,
        browserAttemptStorage,
        (pendingAnswers) =>
          apiClient.request('PATCH', `/student/exams/attempts/${nextRun.runId}`, {
            answers: pendingAnswers,
          }),
        () => navigator.onLine,
      );
      controller.subscribe(setSaveState);
      autosave.current = controller;
      setRun(nextRun);
      setReceivedAt(Date.now());
      setAnswers(merged);
      setIndex(Math.min(draft.index, Math.max(0, nextRun.quiz.questions.length - 1)));
      setScreen('running');
    },
    [user],
  );

  const begin = useCallback(async () => {
    if (!exam) return;
    setBusy(true);
    setError('');
    try {
      const nextRun = await apiClient.request<QuizRun>(
        'POST',
        `/student/exams/${exam.id}/start`,
      );
      attachRun(nextRun);
    } catch (cause) {
      setError(readableError(cause));
    } finally {
      setBusy(false);
    }
  }, [attachRun, exam]);

  const revalidate = useCallback(async () => {
    if (!exam || !run || !navigator.onLine) return;
    await autosave.current?.flush();
    try {
      const progress = await apiClient.request<QuizRun | ExamResultData | null>(
        'GET',
        `/student/exams/${exam.id}/progress`,
      );
      if (progress && !('runId' in progress)) {
        autosave.current?.clear();
        autosave.current = null;
        setResult(progress);
        setRun(null);
        setScreen('result');
        await loadExams();
        return;
      }
      if (!progress || progress.runId !== run.runId) return;
      setRun(progress);
      setReceivedAt(Date.now());
      setAnswers(
        reconcileAttemptAnswers(
          autosave.current?.getDraft().answers || [],
          progress.savedAnswers || [],
        ),
      );
    } catch {
      setSaveState('failed');
    }
  }, [exam, loadExams, run]);

  useEffect(() => {
    const resume = () => {
      if (!document.hidden) void revalidate();
    };
    const online = () => void revalidate();
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('online', online);
    return () => {
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('online', online);
    };
  }, [revalidate]);

  useEffect(() => () => autosave.current?.dispose(), []);

  const updateAnswer = useCallback(
    (questionId: string, selectedOption: AttemptAnswer['selectedOption']) => {
      const answer = createAnswer(answerMap[questionId], { questionId, selectedOption });
      autosave.current?.update(answer, index);
      setAnswers(autosave.current?.getDraft().answers || [answer]);
    },
    [answerMap, index],
  );

  const toggleMark = useCallback(
    (questionId: string) => {
      const current = answerMap[questionId];
      const answer = createAnswer(current, {
        questionId,
        selectedOption: current?.selectedOption ?? null,
        marked: !current?.marked,
        visited: true,
      });
      autosave.current?.update(answer, index);
      setAnswers(autosave.current?.getDraft().answers || [answer]);
    },
    [answerMap, index],
  );

  const submit = useCallback(async () => {
    if (!run) return;
    setBusy(true);
    setError('');
    const flushed = await autosave.current?.flush();
    if (!navigator.onLine || flushed === false) {
      setError('پاسخ‌ها روی دستگاه محفوظ‌اند؛ برای پایان آزمون اتصال اینترنت لازم است.');
      setBusy(false);
      return;
    }
    try {
      const next = await apiClient.request<ExamResultData, { answers: AttemptAnswer[] }>(
        'POST',
        `/student/exams/${run.quiz.examId}/submit`,
        { answers: autosave.current?.getDraft().answers || answers },
      );
      autosave.current?.clear();
      autosave.current = null;
      setResult(next);
      setRun(null);
      setScreen('result');
      await loadExams();
    } catch (cause) {
      setError(readableError(cause));
    } finally {
      setBusy(false);
    }
  }, [answers, loadExams, run]);

  if (screen === 'result' && result) {
    return <ExamResult result={result} onBack={() => setScreen('center')} />;
  }

  if ((screen === 'running' || screen === 'review') && run) {
    return (
      <ExamRunner
        run={run}
        answers={answerMap}
        index={index}
        saveState={saveState}
        receivedAt={receivedAt}
        reviewing={screen === 'review'}
        busy={busy}
        error={error}
        onAnswer={updateAnswer}
        onMark={toggleMark}
        onIndex={(nextIndex) => {
          const questionId = run.quiz.questions[nextIndex]?.id;
          if (questionId && !answerMap[questionId]?.visited) {
            const visited = createAnswer(answerMap[questionId], { questionId, selectedOption: null, visited: true });
            autosave.current?.update(visited, nextIndex);
            setAnswers(autosave.current?.getDraft().answers || [visited]);
          }
          autosave.current?.setIndex(nextIndex);
          setIndex(nextIndex);
        }}
        onReview={() => setScreen('review')}
        onContinue={() => setScreen('running')}
        onSubmit={() => void submit()}
      />
    );
  }

  if (screen === 'preflight' && exam) {
    return (
      <ExamPreflight
        exam={exam}
        busy={busy}
        error={error}
        onBack={() => setScreen('center')}
        onStart={() => void begin()}
      />
    );
  }

  return (
    <ExamCenter
      exams={exams}
      busy={busy}
      error={error}
      onOpen={(selected) => void openPreflight(selected)}
    />
  );
}

function readableError(error: unknown) {
  return error instanceof Error ? error.message : 'درخواست ناموفق بود.';
}
