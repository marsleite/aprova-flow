import { collection, doc, setDoc, getDoc, updateDoc, deleteDoc, serverTimestamp, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from './config';

export interface CalendarEvent {
  id: string;
  userId: string;
  planId?: string;
  title: string;
  description?: string;
  subject: string;
  startTime: Date;
  endTime: Date;
  duration: number; // em minutos
  type: 'study' | 'review' | 'test' | 'break';
  status: 'scheduled' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  reminderMinutes?: number; // minutos antes do evento para notificar
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduledSession {
  eventId: string;
  date: string; // YYYY-MM-DD
  subject: string;
  plannedMinutes: number;
  actualMinutes?: number;
  completed: boolean;
}

// Coleção de eventos do calendário
const CALENDAR_EVENTS_COLLECTION = 'calendar_events';

/**
 * Criar novo evento no calendário
 */
export async function createCalendarEvent(eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const eventRef = doc(collection(db, CALENDAR_EVENTS_COLLECTION));
    const event: CalendarEvent = {
      ...eventData,
      id: eventRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(eventRef, event);
    return event.id;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

/**
 * Atualizar evento existente
 */
export async function updateCalendarEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<void> {
  try {
    const eventRef = doc(db, CALENDAR_EVENTS_COLLECTION, eventId);
    await updateDoc(eventRef, {
      ...updates,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
}

/**
 * Excluir evento
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  try {
    const eventRef = doc(db, CALENDAR_EVENTS_COLLECTION, eventId);
    await deleteDoc(eventRef);
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
}

/**
 * Buscar eventos do usuário em um período
 */
export async function getCalendarEvents(
  userId: string,
  startDate: Date,
  endDate: Date,
  planId?: string
): Promise<CalendarEvent[]> {
  try {
    const q = query(
      collection(db, CALENDAR_EVENTS_COLLECTION),
      where('userId', '==', userId),
      where('startTime', '>=', startDate),
      where('startTime', '<=', endDate),
      orderBy('startTime', 'asc')
    );

    // Se tiver planId, filtrar no client-side para evitar índice composto
    if (planId) {
      const querySnapshot = await getDocs(q);
      const events: CalendarEvent[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.planId === planId) {
          events.push({
            ...data,
            id: doc.id,
            startTime: data.startTime.toDate(),
            endTime: data.endTime.toDate(),
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
          } as CalendarEvent);
        }
      });

      return events;
    } else {
      const querySnapshot = await getDocs(q);
      const events: CalendarEvent[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        events.push({
          ...data,
          id: doc.id,
          startTime: data.startTime.toDate(),
          endTime: data.endTime.toDate(),
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as CalendarEvent);
      });

      return events;
    }
  } catch (error) {
    console.error('Error getting calendar events:', error);
    return [];
  }
}

/**
 * Buscar eventos de um dia específico
 */
export async function getDayEvents(userId: string, date: Date, planId?: string): Promise<CalendarEvent[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return getCalendarEvents(userId, startOfDay, endOfDay, planId);
}

/**
 * Buscar eventos de um mês específico
 */
export async function getMonthEvents(userId: string, year: number, month: number, planId?: string): Promise<CalendarEvent[]> {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

  return getCalendarEvents(userId, startDate, endDate, planId);
}

/**
 * Marcar evento como concluído
 */
export async function completeCalendarEvent(eventId: string, actualMinutes?: number): Promise<void> {
  try {
    const updates: Partial<CalendarEvent> = {
      status: 'completed',
      updatedAt: new Date(),
    };

    if (actualMinutes !== undefined) {
      updates.duration = actualMinutes;
    }

    await updateCalendarEvent(eventId, updates);
  } catch (error) {
    console.error('Error completing calendar event:', error);
    throw error;
  }
}

/**
 * Cancelar evento
 */
export async function cancelCalendarEvent(eventId: string): Promise<void> {
  await updateCalendarEvent(eventId, { status: 'cancelled' });
}

/**
 * Buscar eventos próximos (próximos 7 dias)
 */
export async function getUpcomingEvents(userId: string, planId?: string): Promise<CalendarEvent[]> {
  const now = new Date();
  const in7Days = new Date();
  in7Days.setDate(now.getDate() + 7);

  return getCalendarEvents(userId, now, in7Days, planId);
}

/**
 * Verificar conflitos de horário
 */
export async function checkTimeConflict(
  userId: string,
  startTime: Date,
  endTime: Date,
  excludeEventId?: string
): Promise<boolean> {
  try {
    const events = await getCalendarEvents(userId, startTime, endTime);
    
    return events.some(event => {
      if (excludeEventId && event.id === excludeEventId) return false;
      if (event.status === 'cancelled') return false;
      
      return (
        (startTime >= event.startTime && startTime < event.endTime) ||
        (endTime > event.startTime && endTime <= event.endTime) ||
        (startTime <= event.startTime && endTime >= event.endTime)
      );
    });
  } catch (error) {
    console.error('Error checking time conflict:', error);
    return false;
  }
}

/**
 * Gerar sessões agendadas vs realizadas
 */
export async function getScheduledVsCompleted(
  userId: string,
  startDate: Date,
  endDate: Date,
  planId?: string
): Promise<ScheduledSession[]> {
  try {
    const events = await getCalendarEvents(userId, startDate, endDate, planId);
    const sessionsMap = new Map<string, ScheduledSession>();

    events.forEach(event => {
      const dateKey = event.startTime.toISOString().split('T')[0];
      
      if (!sessionsMap.has(dateKey)) {
        sessionsMap.set(dateKey, {
          eventId: event.id,
          date: dateKey,
          subject: event.subject,
          plannedMinutes: event.duration,
          actualMinutes: event.status === 'completed' ? event.duration : undefined,
          completed: event.status === 'completed',
        });
      } else {
        const existing = sessionsMap.get(dateKey)!;
        existing.plannedMinutes += event.duration;
        if (event.status === 'completed') {
          existing.actualMinutes = (existing.actualMinutes || 0) + event.duration;
          existing.completed = true;
        }
      }
    });

    return Array.from(sessionsMap.values());
  } catch (error) {
    console.error('Error getting scheduled vs completed:', error);
    return [];
  }
}
