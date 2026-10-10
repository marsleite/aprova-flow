'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Star,
  BookOpen,
  AlertTriangle,
  Scale,
  Video,
  CheckCircle2,
  XCircle,
  MessageCircle,
  RotateCw,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { auth } from '@/lib/firebase/config';
import { useAuthContext } from '@/contexts/AuthContext';

interface Flashcard {
  id: string;
  statement: string;
  is_correct: boolean;
  explanation: string;
  user_choice?: boolean | null;
  user_answered_at?: string | null;
}

interface VideoRecommendation {
  title: string;
  topic: string;
  search_query: string;
}

interface DailyDigest {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  summary_markdown: string;
  tags: string[];
  exam_traps: string[];
  law_articles: string[];
  video_recommendations: VideoRecommendation[];
  is_favorite: boolean;
  flashcards: Flashcard[];
}

export default function ResumosDiariosPage() {
  const { user } = useAuthContext();
  const [digests, setDigests] = useState<DailyDigest[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [activeTabFlashcards, setActiveTabFlashcards] = useState<Record<string, Record<string, boolean | null>>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const loadDigests = useCallback(async () => {
    try {
      setLoading(true);
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;

      const res = await fetch('/api/digests', {
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.digests && Array.isArray(data.digests)) {
          setDigests(data.digests);
        }
      }
    } catch (err) {
      console.error('Falha ao carregar fechamentos diários:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDigests();
  }, [loadDigests]);

  const handleGenerateToday = async () => {
    try {
      setGenerating(true);
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;

      const today = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/digests/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ date: today }),
      });

      if (res.ok) {
        await loadDigests();
      }
    } catch (err) {
      console.error('Falha ao gerar resumo do dia:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleFavorite = async (digestId: string) => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;

      setDigests((prev) =>
        prev.map((d) => (d.id === digestId ? { ...d, is_favorite: !d.is_favorite } : d))
      );

      await fetch(`/api/digests/${digestId}/favorite`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${idToken}` },
      });
    } catch (err) {
      console.error('Falha ao alternar favorito:', err);
    }
  };

  const handleAnswerFlashcard = (digestId: string, cardId: string, choice: boolean) => {
    setActiveTabFlashcards((prev) => ({
      ...prev,
      [digestId]: {
        ...(prev[digestId] || {}),
        [cardId]: choice,
      },
    }));
  };

  const toggleExpand = (digestId: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [digestId]: !prev[digestId],
    }));
  };

  const filteredDigests = filterFavorites
    ? digests.filter((d) => d.is_favorite)
    : digests;

  function formatDateHeading(dateStr: string) {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-');
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      return d.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      {/* Top Banner / Hero */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
              <Sparkles className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Fechamento do Dia
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Seu dossiê de estudos consolidado: pegadinhas de prova, artigos de lei seca, curadoria em vídeo e flashcards ativos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setFilterFavorites(!filterFavorites)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
              filterFavorites
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                : 'border-border bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            <Star className={`h-4 w-4 ${filterFavorites ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>Favoritos</span>
          </button>

          <button
            onClick={handleGenerateToday}
            disabled={generating}
            className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:opacity-50"
          >
            <RotateCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Consolidando Dia...' : 'Gerar Fechamento de Hoje'}</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Carregando seu feed de revisões...</p>
        </div>
      ) : filteredDigests.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500">
            <BookOpen className="h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-foreground">
            {filterFavorites ? 'Nenhum resumo favoritado ainda' : 'Nenhum fechamento diário encontrado'}
          </h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Conforme você debate temas com o Tutor no WhatsApp ou no Web Cockpit, a IA consolida todas as dúvidas e gera um dossiê com pegadinhas de prova e flashcards.
          </p>
          {!filterFavorites && (
            <button
              onClick={handleGenerateToday}
              disabled={generating}
              className="mt-6 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90"
            >
              <Sparkles className="h-4 w-4" />
              <span>Gerar Meu Primeiro Fechamento</span>
            </button>
          )}
        </div>
      ) : (
        /* Timeline Feed */
        <div className="relative space-y-8 before:absolute before:bottom-0 before:left-4 before:top-4 before:w-0.5 before:bg-border sm:before:left-8">
          {filteredDigests.map((digest) => {
            const isExpanded = expandedCards[digest.id] ?? true;
            return (
              <motion.div
                key={digest.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="relative pl-10 sm:pl-16"
              >
                {/* Timeline node icon */}
                <div className="absolute left-2.5 top-5 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full bg-orange-500 ring-4 ring-background sm:left-6" />

                {/* Main Card */}
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-orange-500/30 sm:p-7">
                  {/* Card Header */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-400">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDateHeading(digest.date)}</span>
                      </div>
                      <h2 className="mt-1 text-xl font-bold text-foreground">
                        {digest.title || 'Resumo de Estudos do Dia'}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <button
                        onClick={() => handleToggleFavorite(digest.id)}
                        className={`rounded-lg p-2 transition ${
                          digest.is_favorite
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                        title="Favoritar para véspera de prova"
                      >
                        <Star className={`h-5 w-5 ${digest.is_favorite ? 'fill-amber-400' : ''}`} />
                      </button>

                      <button
                        onClick={() => toggleExpand(digest.id)}
                        className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      >
                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Tags */}
                  {digest.tags && digest.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {digest.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                        >
                          #{tag.replace(/^#/, '')}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Collapsible Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 space-y-6 border-t border-border pt-6"
                      >
                        {/* 1. Síntese do Dia */}
                        {digest.summary_markdown && (
                          <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {digest.summary_markdown}
                          </div>
                        )}

                        {/* 2. Caderno de Erros & Alertas de Prova */}
                        {digest.exam_traps && digest.exam_traps.length > 0 && (
                          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-red-400">
                              <AlertTriangle className="h-4 w-4" />
                              <span>Alerta de Prova (Pegadinhas de Banca)</span>
                            </div>
                            <ul className="mt-2.5 space-y-2 text-xs text-red-200/90 leading-relaxed">
                              {digest.exam_traps.map((trap, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                                  <span>{trap}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 3. Lei Seca Citada */}
                        {digest.law_articles && digest.law_articles.length > 0 && (
                          <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-sky-400">
                              <Scale className="h-4 w-4" />
                              <span>Dispositivos de Lei Seca para Leitura</span>
                            </div>
                            <div className="mt-2.5 flex flex-wrap gap-2">
                              {digest.law_articles.map((art, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-lg border border-sky-500/30 bg-sky-950/40 px-2.5 py-1 text-xs font-mono text-sky-300"
                                >
                                  {art}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 4. Sugestões de Vídeos no YouTube */}
                        {digest.video_recommendations && digest.video_recommendations.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                              <Video className="h-4 w-4 text-orange-500" />
                              <span>Aulas Recomendadas no YouTube</span>
                            </div>
                            <div className="grid gap-2.5 sm:grid-cols-2">
                              {digest.video_recommendations.map((v, idx) => {
                                const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
                                  v.search_query || `${v.title} concurso`
                                )}`;
                                return (
                                  <a
                                    key={idx}
                                    href={youtubeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between rounded-xl border border-border bg-card/60 p-3 transition hover:border-orange-500/40 hover:bg-card"
                                  >
                                    <div className="min-w-0 pr-3">
                                      <p className="truncate text-xs font-semibold text-foreground">{v.title}</p>
                                      <p className="truncate text-[11px] text-muted-foreground">{v.topic}</p>
                                    </div>
                                    <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 5. Flashcards Ativos (True/False) */}
                        {digest.flashcards && digest.flashcards.length > 0 && (
                          <div className="space-y-3 border-t border-border pt-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <Sparkles className="h-4 w-4 text-orange-500" />
                                <span>Flashcards de Fixação Ativa</span>
                              </div>
                              <span className="text-xs text-muted-foreground font-mono">
                                {digest.flashcards.length} questões
                              </span>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              {digest.flashcards.map((fc) => {
                                const userAnswer = activeTabFlashcards[digest.id]?.[fc.id];
                                const hasAnswered = userAnswer !== undefined && userAnswer !== null;
                                const isCorrect = hasAnswered && userAnswer === fc.is_correct;

                                return (
                                  <div
                                    key={fc.id}
                                    className={`flex flex-col justify-between rounded-xl border p-4 transition ${
                                      hasAnswered
                                        ? isCorrect
                                          ? 'border-emerald-500/40 bg-emerald-500/5'
                                          : 'border-red-500/40 bg-red-500/5'
                                        : 'border-border bg-card'
                                    }`}
                                  >
                                    <p className="text-xs font-medium leading-relaxed text-foreground">
                                      {fc.statement}
                                    </p>

                                    {!hasAnswered ? (
                                      <div className="mt-4 flex items-center gap-2">
                                        <button
                                          onClick={() => handleAnswerFlashcard(digest.id, fc.id, true)}
                                          className="flex-1 rounded-lg border border-border bg-muted/60 py-1.5 text-xs font-semibold text-foreground transition hover:bg-emerald-500/20 hover:text-emerald-400"
                                        >
                                          Verdadeiro
                                        </button>
                                        <button
                                          onClick={() => handleAnswerFlashcard(digest.id, fc.id, false)}
                                          className="flex-1 rounded-lg border border-border bg-muted/60 py-1.5 text-xs font-semibold text-foreground transition hover:bg-red-500/20 hover:text-red-400"
                                        >
                                          Falso
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                                          {isCorrect ? (
                                            <>
                                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                              <span className="text-emerald-400">Você Acertou!</span>
                                            </>
                                          ) : (
                                            <>
                                              <XCircle className="h-4 w-4 text-red-400" />
                                              <span className="text-red-400">Você Errou! Gabarito: {fc.is_correct ? 'Certo' : 'Errado'}</span>
                                            </>
                                          )}
                                        </div>
                                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                                          {fc.explanation}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
