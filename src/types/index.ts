/**
 * Tipos centrais da aplicação AprovaFlow
 * Define a estrutura de dados para sessões de estudo e usuário
 */

/** Representa uma sessão de estudo salva no Firestore */
export interface StudySession {
  id?: string;
  userId: string;
  subject: string;        // Matéria (ex: "Direito Constitucional")
  subtopic?: string;      // Subtópico opcional (ex: "Direitos Fundamentais")
  startTime: string;      // ISO String do início
  endTime: string;        // ISO String do fim
  duration: number;       // Duração líquida em segundos
  date: string;           // ISO String da data (YYYY-MM-DD)
  createdAt?: string;     // Timestamp de criação
}

/** Dados do usuário autenticado */
export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

/** Estado do cronômetro */
export type TimerStatus = 'idle' | 'running' | 'paused' | 'stopped';

/** Matérias padrão para concursos */
export const DEFAULT_SUBJECTS = [
  'Direito Constitucional',
  'Direito Administrativo',
  'Direito Civil',
  'Direito Penal',
  'Direito Processual Civil',
  'Direito Processual Penal',
  'Direito do Trabalho',
  'Direito Tributário',
  'Português',
  'Raciocínio Lógico',
  'Informática',
  'Legislação Específica',
] as const;

/** Resumo de horas de estudo */
export interface StudySummary {
  totalToday: number;     // segundos
  totalWeek: number;      // segundos
  totalMonth: number;     // segundos
}

/** Dados para o gráfico de radar por matéria */
export interface SubjectHours {
  subject: string;
  hours: number;
}

/** Dados para o gráfico de barras semanal */
export interface DailyHours {
  day: string;        // "Seg", "Ter", etc.
  date: string;       // "YYYY-MM-DD"
  hours: number;
  isToday: boolean;
}

/** Configuração de meta de estudo do usuário */
export interface StudyGoal {
  weeklyGoalHours: number;
  updatedAt?: string;
}

/** Métricas de consistência e progresso da meta semanal */
export interface StudyConsistency {
  currentStreak: number;
  bestStreak: number;
  daysStudiedThisWeek: number;
  weeklyGoalHours: number;
  weeklyTotalSeconds: number;
  weeklyProgressPercent: number;
  remainingSeconds: number;
}

/** Peso de cada matéria no plano de estudo (0-100, soma = 100) */
export interface SubjectWeight {
  subject: string;
  weight: number; // percentual planejado (0-100)
}

/** Plano de estudo salvo no Firestore */
export interface StudyPlan {
  subjects: SubjectWeight[];
  updatedAt?: string;
}

/** Comparação planejado vs real por matéria */
export interface PlanVsActual {
  subject: string;
  plannedPercent: number;  // peso definido pelo usuário
  actualPercent: number;   // % real baseado nas sessões do mês
  actualHours: number;
  deviation: number;       // actual - planned (positivo = acima, negativo = abaixo)
  status: 'ok' | 'neglected' | 'over';
}

/** Filtros para busca no histórico */
export interface SessionFilters {
  subject?: string;
  dateFrom?: string;   // YYYY-MM-DD
  dateTo?: string;     // YYYY-MM-DD
  minDuration?: number; // segundos
}

/** Insight automático gerado pela análise dos dados */
export interface StudyInsight {
  type: 'neglected' | 'suggestion' | 'streak' | 'balance' | 'celebrate';
  title: string;
  message: string;
  icon: string; // nome do ícone lucide
  color: string; // tailwind color class
}
