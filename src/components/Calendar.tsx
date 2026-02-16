'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle, XCircle, Plus } from 'lucide-react';
import { getMonthEvents, getDayEvents, CalendarEvent } from '@/lib/firebase/calendar';

interface CalendarProps {
  userId: string;
  planId?: string;
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  loading?: boolean;
}

export default function Calendar({ userId, planId, onEventClick, onDateClick, loading }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(true);

  // Nomes dos meses e dias da semana em português
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Buscar eventos do mês
  useEffect(() => {
    const fetchMonthEvents = async () => {
      if (!userId) return;

      setCalendarLoading(true);
      try {
        const monthEvents = await getMonthEvents(
          userId,
          currentDate.getFullYear(),
          currentDate.getMonth(),
          planId
        );
        setEvents(monthEvents);
      } catch (error) {
        console.error('Error fetching month events:', error);
      } finally {
        setCalendarLoading(false);
      }
    };

    fetchMonthEvents();
  }, [userId, currentDate, planId]);

  // Navegação do calendário
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Obter dias do mês
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Adicionar dias vazios antes do primeiro dia
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Adicionar todos os dias do mês
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  // Agrupar eventos por dia para evitar filtros repetidos
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const key = event.startTime.toISOString().split('T')[0];
      if (!map.has(key)) {
        map.set(key, [event]);
      } else {
        map.get(key)!.push(event);
      }
    });
    return map;
  }, [events]);

  const getEventsForDay = useCallback(
    (date: Date) => {
      const key = date.toISOString().split('T')[0];
      return eventsByDay.get(key) ?? [];
    },
    [eventsByDay]
  );

  // Verificar se é hoje
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Verificar se é o dia selecionado
  const isSelected = (date: Date) => {
    return selectedDate?.toDateString() === date.toDateString();
  };

  // Obter cor baseada no tipo de evento
  const getEventColor = (event: CalendarEvent) => {
    switch (event.type) {
      case 'study': return 'bg-violet-500';
      case 'review': return 'bg-blue-500';
      case 'test': return 'bg-red-500';
      case 'break': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  // Obter cor baseada no status
  const getEventStatusColor = (event: CalendarEvent) => {
    switch (event.status) {
      case 'completed': return 'opacity-100';
      case 'cancelled': return 'opacity-30';
      default: return 'opacity-80';
    }
  };

  if (loading || calendarLoading) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <div className="animate-pulse">
          <div className="mb-6 h-8 w-48 rounded bg-gray-800"></div>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-8 w-full rounded bg-gray-800"></div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-20 w-full rounded bg-gray-800"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const days = getDaysInMonth(currentDate);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-gray-800 bg-gray-900/50 p-6"
    >
      {/* Header do calendário */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-5 w-5 text-violet-400" />
          <h3 className="text-lg font-semibold text-white">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-gray-400" />
          </button>
          
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-2 text-sm rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-400"
          >
            Hoje
          </button>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Grade do calendário */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="h-20" />;
          }

          const dayEvents = getEventsForDay(date);
          const hasEvents = dayEvents.length > 0;
          const today = isToday(date);
          const selected = isSelected(date);

          return (
            <motion.div
              key={date.toISOString()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedDate(date);
                onDateClick?.(date);
              }}
              className={`
                h-20 p-1 rounded-lg border cursor-pointer transition-all
                ${today ? 'border-violet-500 bg-violet-500/10' : 'border-gray-800 bg-gray-800/50'}
                ${selected ? 'ring-2 ring-violet-400' : ''}
                ${hasEvents ? 'hover:bg-gray-700/50' : 'hover:bg-gray-800'}
              `}
            >
              <div className="flex flex-col h-full">
                {/* Número do dia */}
                <div className={`
                  text-sm font-medium mb-1
                  ${today ? 'text-violet-400' : 'text-gray-400'}
                `}>
                  {date.getDate()}
                </div>

                {/* Eventos do dia */}
                <div className="flex-1 space-y-1 overflow-hidden">
                  {dayEvents.slice(0, 3).map((event, i) => (
                    <div
                      key={i}
                      className={`
                        text-xs px-1 py-0.5 rounded truncate
                        ${getEventColor(event)} ${getEventStatusColor(event)}
                        text-white
                      `}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                    >
                      {event.startTime.getHours()}h {event.subject}
                    </div>
                  ))}
                  
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 px-1">
                      +{dayEvents.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legendas */}
      <div className="mt-6 flex flex-wrap gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-violet-500"></div>
          <span>Estudo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500"></div>
          <span>Revisão</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500"></div>
          <span>Prova</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500"></div>
          <span>Pausa</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-3 w-3 text-green-400" />
          <span>Concluído</span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle className="h-3 w-3 text-red-400" />
          <span>Cancelado</span>
        </div>
      </div>
    </motion.div>
  );
}
