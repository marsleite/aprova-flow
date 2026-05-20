import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock the Firebase config
vi.mock('@/lib/firebase/config', () => ({
  db: { firestore: {} },
}));

// Mock Firebase Firestore functions
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockDoc = vi.fn((_db, collection, id) => ({
  path: `${collection}/${id}`,
  firestore: _db,
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: (db: unknown, collection: string, id: string) => mockDoc(db, collection, id),
  getDoc: (ref: unknown) => mockGetDoc(ref),
  setDoc: (ref: unknown, data: unknown) => mockSetDoc(ref, data),
}));

// Import target library
import {
  getMondayOfCurrentWeek,
  saveWeeklySmartSchedule,
  getWeeklySmartSchedule,
  type SmartScheduleItem,
} from '@/lib/firebase/smartSchedules';

describe('SmartSchedules Helper Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMondayOfCurrentWeek', () => {
    it('returns the Monday of the current calendar week for a Tuesday', () => {
      const date = new Date('2026-05-19T12:00:00.000Z'); // Tuesday
      const mondayStr = getMondayOfCurrentWeek(date);
      expect(mondayStr).toBe('2026-05-18');
    });

    it('returns the same Monday for a Sunday of that calendar week', () => {
      const date = new Date('2026-05-24T12:00:00.000Z'); // Sunday
      const mondayStr = getMondayOfCurrentWeek(date);
      expect(mondayStr).toBe('2026-05-18');
    });

    it('returns the exact same day for a Monday', () => {
      const date = new Date('2026-05-18T12:00:00.000Z'); // Monday
      const mondayStr = getMondayOfCurrentWeek(date);
      expect(mondayStr).toBe('2026-05-18');
    });

    it('handles month transitions correctly', () => {
      const date = new Date('2026-06-02T12:00:00.000Z'); // Tuesday in June
      const mondayStr = getMondayOfCurrentWeek(date);
      expect(mondayStr).toBe('2026-06-01'); // Monday was June 1st
    });

    it('handles year/month transitions correctly', () => {
      const date = new Date('2026-01-01T12:00:00.000Z'); // Thursday, Jan 1, 2026
      const mondayStr = getMondayOfCurrentWeek(date);
      expect(mondayStr).toBe('2025-12-29'); // Monday was Dec 29, 2025
    });
  });

  describe('Firestore operations', () => {
    const dummySchedule: SmartScheduleItem[] = [
      {
        day: 'Segunda',
        totalHours: 4,
        subjects: [{ name: 'Direito Constitucional', hours: 4, reason: 'Necessidade de foco' }],
      },
    ];

    describe('saveWeeklySmartSchedule', () => {
      it('throws an error if required arguments are missing', async () => {
        await expect(saveWeeklySmartSchedule('', 'plan-1', '2026-05-18', dummySchedule)).rejects.toThrow();
        await expect(saveWeeklySmartSchedule('user-1', '', '2026-05-18', dummySchedule)).rejects.toThrow();
        await expect(saveWeeklySmartSchedule('user-1', 'plan-1', '', dummySchedule)).rejects.toThrow();
      });

      it('writes a new weekly focus schedule document when it does not exist yet', async () => {
        mockGetDoc.mockResolvedValueOnce({
          exists: () => false,
        });

        await saveWeeklySmartSchedule('user-1', 'plan-1', '2026-05-18', dummySchedule);

        expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'weekly_smart_schedules', 'user-1_plan-1_2026-05-18');
        expect(mockSetDoc).toHaveBeenCalledWith(
          expect.objectContaining({ path: 'weekly_smart_schedules/user-1_plan-1_2026-05-18' }),
          expect.objectContaining({
            userId: 'user-1',
            planId: 'plan-1',
            weekStart: '2026-05-18',
            schedule: dummySchedule,
            generatedAt: expect.any(String),
            updatedAt: expect.any(String),
          })
        );
      });

      it('preserves existing generatedAt and updates updatedAt when the document exists', async () => {
        const originalGenAt = '2026-05-18T10:00:00.000Z';
        mockGetDoc.mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            userId: 'user-1',
            planId: 'plan-1',
            weekStart: '2026-05-18',
            generatedAt: originalGenAt,
            updatedAt: originalGenAt,
          }),
        });

        await saveWeeklySmartSchedule('user-1', 'plan-1', '2026-05-18', dummySchedule);

        expect(mockSetDoc).toHaveBeenCalledWith(
          expect.objectContaining({ path: 'weekly_smart_schedules/user-1_plan-1_2026-05-18' }),
          expect.objectContaining({
            userId: 'user-1',
            planId: 'plan-1',
            weekStart: '2026-05-18',
            schedule: dummySchedule,
            generatedAt: originalGenAt,
            updatedAt: expect.any(String),
          })
        );
      });
    });

    describe('getWeeklySmartSchedule', () => {
      it('returns null if any required parameter is empty', async () => {
        const schedule1 = await getWeeklySmartSchedule('', 'plan-1', '2026-05-18');
        expect(schedule1).toBeNull();
      });

      it('returns the schedule if document exists and validation matches', async () => {
        mockGetDoc.mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            userId: 'user-1',
            planId: 'plan-1',
            weekStart: '2026-05-18',
            schedule: dummySchedule,
          }),
        });

        const result = await getWeeklySmartSchedule('user-1', 'plan-1', '2026-05-18');
        expect(result).toEqual(dummySchedule);
      });

      it('returns null if document does not exist', async () => {
        mockGetDoc.mockResolvedValueOnce({
          exists: () => false,
        });

        const result = await getWeeklySmartSchedule('user-1', 'plan-1', '2026-05-18');
        expect(result).toBeNull();
      });

      it('returns null if document exists but fields do not match query', async () => {
        mockGetDoc.mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            userId: 'different-user',
            planId: 'plan-1',
            weekStart: '2026-05-18',
            schedule: dummySchedule,
          }),
        });

        const result = await getWeeklySmartSchedule('user-1', 'plan-1', '2026-05-18');
        expect(result).toBeNull();
      });
    });
  });
});
