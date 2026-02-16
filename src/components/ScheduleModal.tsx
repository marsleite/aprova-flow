'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, BookOpen, Target, AlertCircle } from 'lucide-react';
import { createCalendarEvent, CalendarEvent } from '@/lib/firebase/calendar';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  userId: string;
  planId?: string;
  subjects?: string[];
  onEventCreated?: (event: CalendarEvent) => void;
}

interface EventFormData {
  title: string;
  description: string;
  subject: string;
  startTime: string;
  endTime: string;
  type: 'study' | 'review' | 'test' | 'break';
  priority: 'low' | 'medium' | 'high';
  reminderMinutes: number;
}

export default function ScheduleModal({
  isOpen,
  onClose,
  selectedDate,
  userId,
  planId,
  subjects = [],
  onEventCreated
}: ScheduleModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    subject: subjects[0] || '',
    startTime: '09:00',
    endTime: '10:00',
    type: 'study',
    priority: 'medium',
    reminderMinutes: 15
  });

  // Reset form quando abre com nova data
  useEffect(() => {
    if (isOpen && selectedDate) {
      setFormData(prev => ({
        ...prev,
        subject: subjects[0] || '',
        title: `Estudo - ${subjects[0] || 'Matéria'}`
      }));
    }
  }, [isOpen, selectedDate, subjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !userId) return;

    setLoading(true);
    try {
      // Criar datas completas
      const startDate = new Date(selectedDate);
      const [startHour, startMinute] = formData.startTime.split(':');
      startDate.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

      const endDate = new Date(selectedDate);
      const [endHour, endMinute] = formData.endTime.split(':');
      endDate.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

      // Validar que o fim é depois do início
      if (endDate <= startDate) {
        alert('O horário de término deve ser posterior ao início');
        return;
      }

      // Criar evento
      const eventData = {
        userId,
        planId,
        title: formData.title,
        description: formData.description,
        subject: formData.subject,
        startTime: startDate,
        endTime: endDate,
        duration: (endDate.getTime() - startDate.getTime()) / (1000 * 60), // em minutos
        type: formData.type,
        status: 'scheduled' as const,
        priority: formData.priority,
        reminderMinutes: formData.reminderMinutes
      };

      const eventId = await createCalendarEvent(eventData);
      
      // Criar objeto completo para callback
      const createdEvent: CalendarEvent = {
        ...eventData,
        id: eventId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      onEventCreated?.(createdEvent);
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        subject: subjects[0] || '',
        startTime: '09:00',
        endTime: '10:00',
        type: 'study',
        priority: 'medium',
        reminderMinutes: 15
      });
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Erro ao criar evento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof EventFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-md max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-violet-400" />
              <h2 className="text-xl font-semibold text-white">
                Agendar Sessão
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Data selecionada */}
            <div className="p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Calendar className="h-4 w-4" />
                <span>
                  {selectedDate?.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>

            {/* Título */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Título
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500"
                placeholder="Ex: Estudo de Direito Civil"
                required
              />
            </div>

            {/* Matéria */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                <BookOpen className="inline h-4 w-4 mr-1" />
                Matéria
              </label>
              <select
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                required
              >
                {subjects.map(subject => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            {/* Horários */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Início
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Término
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                  required
                />
              </div>
            </div>

            {/* Tipo e Prioridade */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tipo
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="study">Estudo</option>
                  <option value="review">Revisão</option>
                  <option value="test">Prova</option>
                  <option value="break">Pausa</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Target className="inline h-4 w-4 mr-1" />
                  Prioridade
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </select>
              </div>
            </div>

            {/* Lembrete */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Lembrete (minutos antes)
              </label>
              <select
                value={formData.reminderMinutes}
                onChange={(e) => handleInputChange('reminderMinutes', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-violet-500"
              >
                <option value={0}>Sem lembrete</option>
                <option value={5}>5 minutos</option>
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={60}>1 hora</option>
              </select>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Descrição (opcional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 resize-none"
                rows={3}
                placeholder="Tópicos a estudar, materiais necessários, etc."
              />
            </div>

            {/* Alerta de info */}
            <div className="p-3 bg-violet-500/10 border border-violet-500/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-violet-400 mt-0.5" />
                <p className="text-xs text-violet-300">
                  A sessão será agendada e aparecerá no seu calendário. 
                  Você poderá marcá-la como concluída quando realizar o estudo.
                </p>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Agendando...' : 'Agendar'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
