import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './config';
import { FirebaseError } from 'firebase/app';

export interface BenchmarkData {
  weeklyGoalHours: number;
  totalUsers: number;
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  updatedAt: Date;
}

export interface UserBenchmark {
  userId: string;
  weeklyGoalHours: number;
  weeklyHours: number;
  percentile: number;
  updatedAt: Date;
}

// Coleção de benchmarks agregados por meta semanal
const BENCHMARKS_COLLECTION = 'benchmarks';
const USER_BENCHMARKS_COLLECTION = 'user_benchmarks';

/**
 * Atualiza benchmarks agregados com base nos dados do usuário
 */
export async function updateBenchmark(weeklyGoalHours: number) {
  try {
    // Referência ao documento de benchmark para esta meta
    const benchmarkRef = doc(db, BENCHMARKS_COLLECTION, `goal_${weeklyGoalHours}`);
    
    // Busca benchmark atual
    const benchmarkDoc = await getDoc(benchmarkRef);
    let benchmarkData: BenchmarkData;

    if (benchmarkDoc.exists()) {
      benchmarkData = benchmarkDoc.data() as BenchmarkData;
      // Atualiza contagem de usuários
      benchmarkData.totalUsers += 1;
    } else {
      // Cria novo benchmark
      benchmarkData = {
        weeklyGoalHours,
        totalUsers: 1,
        percentiles: {
          p10: 0,
          p25: 0,
          p50: 0,
          p75: 0,
          p90: 0,
        },
        updatedAt: new Date(),
      };
    }

    // Salva benchmark atualizado
    await setDoc(benchmarkRef, benchmarkData);
    
    return benchmarkData;
  } catch (error) {
    const isPermissionDenied =
      error instanceof FirebaseError && error.code === 'permission-denied';

    // Em client comum não há permissão para escrever benchmarks agregados.
    // A escrita agregada deve ser feita por backend/Admin SDK.
    if (!isPermissionDenied) {
      console.warn('Error updating benchmark:', error);
    }
    return null;
  }
}

/**
 * Calcula percentis para uma meta semanal específica
 */
export async function calculatePercentiles(weeklyGoalHours: number): Promise<BenchmarkData['percentiles']> {
  try {
    // No client, usamos apenas benchmark agregado público (read-only).
    const benchmark = await getBenchmarkData(weeklyGoalHours);
    if (!benchmark) {
      return { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 };
    }
    return benchmark.percentiles;
  } catch (error) {
    const isPermissionDenied =
      error instanceof FirebaseError && error.code === 'permission-denied';
    if (!isPermissionDenied) {
      console.warn('Error calculating percentiles:', error);
    }
    return { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 };
  }
}

/**
 * Salva benchmark do usuário e calcula seu percentil
 */
export async function saveUserBenchmark(
  userId: string,
  weeklyGoalHours: number,
  weeklyHours: number
): Promise<UserBenchmark> {
  try {
    // Calcula percentis para este grupo de meta
    const percentiles = await calculatePercentiles(weeklyGoalHours);
    
    // Calcula percentil do usuário
    let percentile = 0;
    if (weeklyHours > 0) {
      const values = Object.values(percentiles);
      percentile = values.filter(p => weeklyHours >= p).length / values.length * 100;
    }

    const userBenchmark: UserBenchmark = {
      userId,
      weeklyGoalHours,
      weeklyHours,
      percentile: Math.round(percentile),
      updatedAt: new Date(),
    };

    // Salva benchmark do usuário
    await setDoc(doc(db, USER_BENCHMARKS_COLLECTION, userId), userBenchmark);

    // Atualização agregada fica para backend (Admin SDK / job server-side).
    // No client evitamos erro de permissão.

    return userBenchmark;
  } catch (error) {
    const isPermissionDenied =
      error instanceof FirebaseError && error.code === 'permission-denied';
    if (!isPermissionDenied) {
      console.warn('Error saving user benchmark:', error);
    }
    throw error;
  }
}

/**
 * Busca benchmark do usuário
 */
export async function getUserBenchmark(userId: string): Promise<UserBenchmark | null> {
  try {
    const docRef = doc(db, USER_BENCHMARKS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserBenchmark;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user benchmark:', error);
    return null;
  }
}

/**
 * Busca dados de benchmark para comparação
 */
export async function getBenchmarkData(weeklyGoalHours: number): Promise<BenchmarkData | null> {
  try {
    const docRef = doc(db, BENCHMARKS_COLLECTION, `goal_${weeklyGoalHours}`);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as BenchmarkData;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting benchmark data:', error);
    return null;
  }
}
