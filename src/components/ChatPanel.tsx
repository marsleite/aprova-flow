/**
 * Painel de Chat com o Coach IA
 *
 * - Saudação inteligente ao abrir (baseada nos dados reais)
 * - Histórico limitado a 10 mensagens enviadas à API
 * - Sugestões rápidas contextuais
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Brain,
  User,
  Trash2,
} from 'lucide-react';
import { StudyConsistency, SubjectHours, PlanVsActual, StudySession, DailyHours } from '@/types';
import { formatDuration } from '@/lib/utils';
import { auth } from '@/lib/firebase/config';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  consistency: StudyConsistency | null;
  subjectHours: SubjectHours[];
  planVsActual: PlanVsActual[];
  todaySessions: StudySession[];
  totalTodaySeconds: number;
  weeklyData: DailyHours[];
  recentSessions: StudySession[];
}

const MAX_HISTORY = 10; // Últimas mensagens enviadas à API

export default function ChatPanel({
  isOpen,
  onClose,
  userName,
  consistency,
  subjectHours,
  planVsActual,
  todaySessions,
  totalTodaySeconds,
  weeklyData,
  recentSessions,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll ao receber nova mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Foca no input ao abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Monta contexto para a API
  const buildContext = useCallback(() => {
    const todaySubjectMap = new Map<string, number>();
    for (const s of todaySessions) {
      todaySubjectMap.set(s.subject, (todaySubjectMap.get(s.subject) || 0) + s.duration);
    }
    const dominantEntry = [...todaySubjectMap.entries()].sort((a, b) => b[1] - a[1])[0];

    return {
      userName: userName || 'Estudante',
      currentStreak: consistency?.currentStreak ?? 0,
      bestStreak: consistency?.bestStreak ?? 0,
      weeklyGoalHours: consistency?.weeklyGoalHours ?? 10,
      weeklyTotalHours: (consistency?.weeklyTotalSeconds ?? 0) / 3600,
      weeklyProgressPercent: consistency?.weeklyProgressPercent ?? 0,
      daysStudiedThisWeek: consistency?.daysStudiedThisWeek ?? 0,
      subjectHours,
      planVsActual: planVsActual.map((p) => ({
        subject: p.subject,
        plannedPercent: p.plannedPercent,
        actualPercent: p.actualPercent,
        status: p.status,
      })),
      todayTotalMinutes: Math.round(totalTodaySeconds / 60),
      todayDominantSubject: dominantEntry ? dominantEntry[0] : null,
      weeklyBreakdown: weeklyData.map((d) => ({
        day: d.day,
        hours: d.hours,
        isToday: d.isToday,
      })),
      recentSessions: recentSessions.slice(0, 5).map((s) => ({
        subject: s.subject,
        duration: s.duration,
        date: s.date,
        startTime: s.startTime,
      })),
    };
  }, [userName, consistency, subjectHours, planVsActual, todaySessions, totalTodaySeconds, weeklyData, recentSessions]);

  // ================================================
  // Saudação inteligente ao abrir o chat
  // ================================================
  useEffect(() => {
    if (!isOpen || greeted || messages.length > 0) return;

    const greeting = buildGreeting();
    if (greeting) {
      setMessages([{ role: 'assistant', content: greeting }]);
      setGreeted(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function buildGreeting(): string {
    const name = userName || 'Estudante';
    const todayMins = Math.round(totalTodaySeconds / 60);
    const streak = consistency?.currentStreak ?? 0;
    const weekPct = consistency?.weeklyProgressPercent ?? 0;

    // Monta matéria dominante de hoje
    const todaySubjectMap = new Map<string, number>();
    for (const s of todaySessions) {
      todaySubjectMap.set(s.subject, (todaySubjectMap.get(s.subject) || 0) + s.duration);
    }
    const dominant = [...todaySubjectMap.entries()].sort((a, b) => b[1] - a[1])[0];

    // Matéria mais negligenciada
    const neglected = planVsActual
      .filter((p) => p.status === 'neglected')
      .sort((a, b) => a.deviation - b.deviation)[0];

    let greeting = `Fala, ${name}! `;

    if (todayMins > 0 && dominant) {
      greeting += `Vi que hoje você já estudou ${formatDuration(totalTodaySeconds)} de ${dominant[0]}. `;
      if (neglected) {
        greeting += `Que tal focar em ${neglected.subject} agora? Está ficando para trás no plano.`;
      } else {
        greeting += `Quer que eu sugira o próximo passo?`;
      }
    } else if (streak > 0) {
      greeting += `Seu streak está em ${streak} dias — não deixe quebrar! `;
      if (weekPct < 100) {
        greeting += `Você está em ${weekPct}% da meta semanal. Em que posso te ajudar?`;
      } else {
        greeting += `E já bateu a meta da semana! Como posso te ajudar hoje?`;
      }
    } else {
      greeting += `Pronto para mais um dia de estudos? Me conta como posso te ajudar.`;
    }

    return greeting;
  }

  // ================================================
  // Sugestões contextuais (variam com os dados)
  // ================================================
  function getSuggestions(): string[] {
    const suggestions: string[] = [];

    const neglected = planVsActual.find((p) => p.status === 'neglected');
    if (neglected) {
      suggestions.push(`Como melhorar em ${neglected.subject}?`);
    }

    suggestions.push('Monte um plano de estudo para hoje');

    if ((consistency?.weeklyProgressPercent ?? 0) < 50) {
      suggestions.push('Como bater minha meta semanal?');
    }

    suggestions.push('Estou desmotivado, me ajuda');
    suggestions.push('Quanto tempo devo estudar por dia?');

    return suggestions.slice(0, 5);
  }

  // ================================================
  // Enviar mensagem (limita histórico a MAX_HISTORY)
  // ================================================
  async function sendMessage(content: string) {
    if (!content.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: content.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      // Envia apenas as últimas MAX_HISTORY mensagens à API
      const trimmed = newMessages.slice(-MAX_HISTORY);
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error('Sessão expirada');
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          messages: trimmed,
          context: buildContext(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro na IA');
      }

      const { reply } = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Desculpe, não consegui responder agora. Tente novamente.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function clearChat() {
    setMessages([]);
    setGreeted(false);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />

          {/* Painel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col border-l border-white/10 bg-gray-950"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-violet-500/30 to-blue-500/20 p-2">
                  <Brain className="h-5 w-5 text-violet-300" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Coach IA</h3>
                  <p className="text-[11px] text-gray-500">Powered by Gemini</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-900 hover:text-gray-300"
                    title="Limpar conversa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-900 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        msg.role === 'assistant'
                          ? 'bg-violet-500/20'
                          : 'bg-gray-800'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <Brain className="h-3.5 w-3.5 text-violet-400" />
                      ) : (
                        <User className="h-3.5 w-3.5 text-gray-400" />
                      )}
                    </div>

                    {/* Balão */}
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed sm:max-w-[80%] ${
                        msg.role === 'user'
                          ? 'rounded-tr-sm bg-violet-600 text-white'
                          : 'rounded-tl-sm border border-white/5 bg-gray-900 text-gray-300'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}

                {/* Typing indicator */}
                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-2.5"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20">
                      <Brain className="h-3.5 w-3.5 text-violet-400" />
                    </div>
                    <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border border-white/5 bg-gray-900 px-4 py-3">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-violet-400"
                          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Sugestões rápidas (abaixo das mensagens quando tem só a saudação) */}
              {messages.length <= 1 && !loading && (
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {getSuggestions().map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400 transition hover:border-violet-500/30 hover:text-violet-300"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-white/10 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte ao seu coach..."
                  disabled={loading}
                  className="flex-1 rounded-xl border border-white/10 bg-gray-900 px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition focus:border-violet-500 disabled:opacity-50"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500 disabled:opacity-30"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1.5 text-center text-[10px] text-gray-700">
                Respostas baseadas nos seus dados reais de estudo
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
