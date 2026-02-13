/**
 * Funções utilitárias do AprovaFlow
 */

/**
 * Formata segundos em "Xh Xmin"
 * Ex: 3661 → "1h 01min"
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}min`;
  }
  return `${minutes}min`;
}

/**
 * Formata segundos para o display do cronômetro "HH:MM:SS"
 */
export function formatTimerDisplay(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':');
}

/**
 * Retorna a data atual no formato YYYY-MM-DD
 */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Formata uma data ISO para exibição relativa
 * Ex: "Hoje", "Ontem", "12 Fev"
 */
export function formatRelativeDate(dateISO: string): string {
  const today = getTodayISO();
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = yesterday.toISOString().split('T')[0];

  if (dateISO === today) return 'Hoje';
  if (dateISO === yesterdayISO) return 'Ontem';

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const [, month, day] = dateISO.split('-');
  return `${parseInt(day)} ${months[parseInt(month) - 1]}`;
}

/**
 * Retorna o nome abreviado do dia da semana (pt-BR)
 */
export function getDayName(date: Date): string {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days[date.getDay()];
}

/**
 * Gera uma cor baseada no índice (para gráficos)
 */
export function getChartColor(index: number): string {
  const colors = [
    '#8B5CF6', // violet
    '#6366F1', // indigo
    '#3B82F6', // blue
    '#06B6D4', // cyan
    '#10B981', // emerald
    '#F59E0B', // amber
    '#EF4444', // red
    '#EC4899', // pink
    '#8B5CF6', // violet (repetição)
    '#14B8A6', // teal
    '#F97316', // orange
    '#84CC16', // lime
  ];
  return colors[index % colors.length];
}
