import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const questionDocs = new Map<string, Record<string, unknown>>();
const examDocs = new Map<string, Record<string, unknown>>();

const doc = vi.fn((_: unknown, collectionName: string, id: string) => ({
  collectionName,
  id,
}));
const getDoc = vi.fn(async (ref: { collectionName: string; id: string }) => {
  const store =
    ref.collectionName === 'questions_bank'
      ? questionDocs
      : ref.collectionName === 'exams'
        ? examDocs
        : new Map<string, Record<string, unknown>>();
  const data = store.get(ref.id);

  return {
    id: ref.id,
    exists: () => data !== undefined,
    data: () => data,
  };
});

vi.mock('@/lib/firebase/config', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc,
  getDoc,
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}));

let getQuestionsByIds: typeof import('@/lib/firebase/questions').getQuestionsByIds;
let loadExamQuestions: typeof import('@/lib/firebase/questions').loadExamQuestions;

beforeAll(async () => {
  ({ getQuestionsByIds, loadExamQuestions } = await import('@/lib/firebase/questions'));
});

beforeEach(() => {
  vi.clearAllMocks();
  questionDocs.clear();
  examDocs.clear();

  questionDocs.set('q-1', {
    materia: 'Direito Constitucional',
    statement: 'Questão 1',
    answer: 'A',
  });
  questionDocs.set('q-2', {
    materia: 'Direito Administrativo',
    statement: 'Questão 2',
    answer: 'B',
  });
});

describe('question batch loading', () => {
  it('preserves the requested order while avoiding duplicate question fetches', async () => {
    const questions = await getQuestionsByIds(['q-2', 'q-1', 'q-2', 'missing']);

    expect(questions.map((question) => question.id)).toEqual(['q-2', 'q-1', 'q-2']);
    expect(getDoc).toHaveBeenCalledTimes(3);
  });

  it('loads exam questions through the shared batch helper', async () => {
    examDocs.set('exam-1', {
      questions: ['q-2', 'q-1'],
    });

    const questions = await loadExamQuestions('exam-1');

    expect(questions.map((question) => question.id)).toEqual(['q-2', 'q-1']);
    expect(getDoc).toHaveBeenCalledTimes(3);
  });
});
