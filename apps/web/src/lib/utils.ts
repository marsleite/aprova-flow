/**
 * Funções utilitárias do AprovaMind
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
  return formatDateLocalISO(new Date());
}

/**
 * Formata uma data para YYYY-MM-DD usando timezone local do usuário.
 */
export function formatDateLocalISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formata uma data ISO para exibição relativa
 * Ex: "Hoje", "Ontem", "12 Fev"
 */
export function formatRelativeDate(dateISO: string): string {
  const today = getTodayISO();
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = formatDateLocalISO(yesterday);

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
 * Exporta um array de sessões como arquivo CSV (dispara download no browser)
 */
export function exportSessionsCSV(
  sessions: { subject: string; date: string; duration: number; startTime: string; endTime: string }[]
): void {
  const header = 'Matéria,Data,Duração (min),Início,Fim';
  const rows = sessions.map((s) => {
    const mins = Math.round(s.duration / 60);
    const start = s.startTime ? new Date(s.startTime).toLocaleTimeString('pt-BR') : '';
    const end = s.endTime ? new Date(s.endTime).toLocaleTimeString('pt-BR') : '';
    // Escapar aspas duplas e envolver campos com vírgula
    const subject = `"${s.subject.replace(/"/g, '""')}"`;
    return `${subject},${s.date},${mins},${start},${end}`;
  });
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `aprovamind-sessoes-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
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
