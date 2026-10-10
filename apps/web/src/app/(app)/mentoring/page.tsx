'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Send,
  User,
  Sparkles,
  MessageCircle,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Calendar,
  RotateCw,
} from 'lucide-react';
import { auth } from '@/lib/firebase/config';
import { useAuthContext } from '@/contexts/AuthContext';
import Link from 'next/link';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  channel?: 'whatsapp' | 'web';
  timestamp?: string;
}

const QUICK_PROMPTS = [
  'O que é excludente de ilicitude e quais são as espécies?',
  'Quais são as principais pegadinhas da banca FGV em Direito Constitucional?',
  'Com base no meu edital ativo, o que devo priorizar nos estudos hoje?',
  'Gere um simulado rápido de 2 questões estilo Certo/Errado com gabarito fundamentado.',
];

export default function MentoringPage() {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;

      const res = await fetch('/api/chat/history', {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages);
          return;
        }
      }

      // Saudação padrão inicial se histórico vazio
      const userName = user?.displayName?.split(' ')[0] || 'Estudante';
      setMessages([
        {
          role: 'assistant',
          content: `Olá, ${userName}! Sou seu Mentor IA no AprovaMind. 🎯\n\nTodas as dúvidas que você me enviar aqui ou no WhatsApp (+55 71 98135-6297) ficam unificadas neste painel. À meia-noite, também consolido seu "Fechamento do Dia" com flashcards e alertas de banca.\n\nEm que matéria ou conceito jurídico posso te apoiar agora?`,
          channel: 'web',
        },
      ]);
    } catch (err) {
      console.error('Falha ao buscar histórico de mentoria:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(textToSend?: string) {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      channel: 'web',
      timestamp: new Date().toISOString(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Sessão expirada');

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          messages: newHistory.slice(-10),
        }),
      });

      if (!res.ok) {
        throw new Error('Falha na resposta do mentor');
      }

      const data = await res.json();
      const reply = data.reply || 'Recebi sua mensagem. Em instantes concluo a análise.';

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: reply,
          channel: 'web',
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error('Erro ao enviar mensagem ao mentor:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Desculpe, tive uma instabilidade momentânea na conexão. Por favor, tente novamente.',
          channel: 'web',
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-5rem)] max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6">
      {/* Top Header Card */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 text-orange-500 border border-orange-500/30">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground sm:text-xl">Mentor IA & WhatsApp</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Omnicanal Ativo
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Tire dúvidas por aqui ou pelo WhatsApp (<span className="font-mono text-foreground font-semibold">+55 71 98135-6297</span>). O histórico é 100% espelhado.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/resumos"
            className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/60 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            <Sparkles className="h-4 w-4 text-orange-500" />
            <span>Ver Fechamento do Dia</span>
          </Link>

          <a
            href="https://wa.me/5571981356297"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Abrir no WhatsApp</span>
            <ExternalLink className="h-3 w-3 opacity-70" />
          </a>
        </div>
      </div>

      {/* Main Chat Box */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loadingHistory ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
              <p className="text-xs text-muted-foreground">Sincronizando histórico omnicanal do Supabase...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                      msg.role === 'assistant'
                        ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}
                  >
                    {msg.role === 'assistant' ? <Brain className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%] ${
                      msg.role === 'user'
                        ? 'rounded-tr-sm bg-orange-500 text-white shadow-sm'
                        : 'rounded-tl-sm border border-border bg-muted/40 text-foreground'
                    }`}
                  >
                    {/* Badge de Canal */}
                    {msg.channel === 'whatsapp' && (
                      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span>Enviado via WhatsApp</span>
                      </div>
                    )}
                    {msg.channel === 'web' && (
                      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-sky-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                        <span>Enviado via Web Cockpit</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
                    <Brain className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border bg-muted/40 px-4 py-3">
                    <div className="h-2 w-2 rounded-full bg-orange-500 animate-bounce" />
                    <div className="h-2 w-2 rounded-full bg-orange-500 animate-bounce [animation-delay:0.2s]" />
                    <div className="h-2 w-2 rounded-full bg-orange-500 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Quick Prompts Bar (when not loading) */}
        {!loading && messages.length <= 3 && (
          <div className="border-t border-border/60 bg-muted/20 px-4 py-2.5">
            <p className="mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Sugestões Rápidas:
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt)}
                  className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition hover:border-orange-500/40 hover:text-foreground hover:bg-muted"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="border-t border-border bg-card p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua dúvida de edital ou lei seca..."
              disabled={loading}
              className="flex-1 rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow transition hover:bg-orange-600 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
