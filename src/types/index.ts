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

/** Modo do cronômetro */
export type TimerMode = 'freeform' | 'pomodoro-25/5' | 'pomodoro-50/10' | 'pomodoro-45/15';

/** Fase dentro de um ciclo Pomodoro */
export type PomodoroPhase = 'focus' | 'shortBreak' | 'longBreak';

/** Configuração de um protocolo Pomodoro */
export interface PomodoroConfig {
  label: string;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  cyclesBeforeLongBreak: number;
}

/** Mapa de protocolos disponíveis */
export const POMODORO_PRESETS: Record<Exclude<TimerMode, 'freeform'>, PomodoroConfig> = {
  'pomodoro-25/5': {
    label: '25/5 Clássico',
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    cyclesBeforeLongBreak: 4,
  },
  'pomodoro-50/10': {
    label: '50/10 Intenso',
    focusMinutes: 50,
    shortBreakMinutes: 10,
    longBreakMinutes: 20,
    cyclesBeforeLongBreak: 3,
  },
  'pomodoro-45/15': {
    label: '45/15 Equilibrado',
    focusMinutes: 45,
    shortBreakMinutes: 15,
    longBreakMinutes: 25,
    cyclesBeforeLongBreak: 3,
  },
};

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

/** Dados de atividade de um dia para o heatmap */
export interface DayActivity {
  date: string;       // YYYY-MM-DD
  totalSeconds: number;
  sessionCount: number;
  subjects: string[];  // matérias estudadas nesse dia
  level: 0 | 1 | 2 | 3 | 4; // intensidade (0=nada, 4=muito)
}

/** Sessão de questões registrada pelo usuário */
export interface QuestionSession {
  id?: string;
  userId: string;
  subject: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;       // percentual 0-100
  date: string;           // YYYY-MM-DD
  createdAt?: string;
}

/** Taxa de acerto agregada por matéria */
export interface SubjectAccuracy {
  subject: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;       // percentual 0-100
  sessions: number;       // quantas vezes registrou
}

/** Insight automático gerado pela análise dos dados */
export interface StudyInsight {
  type: 'neglected' | 'suggestion' | 'streak' | 'balance' | 'celebrate';
  title: string;
  message: string;
  icon: string; // nome do ícone lucide
  color: string; // tailwind color class
}
