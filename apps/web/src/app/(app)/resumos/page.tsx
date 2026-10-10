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
  Printer,
  Copy,
  Check,
  GitBranch,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { auth } from '@/lib/firebase/config';
import { useAuthContext } from '@/contexts/AuthContext';
import MindMapTree from '@/components/MindMapTree';

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
  topic?: string;
  channel?: string;
  search_query: string;
  url?: string;
}

interface DoubtReview {
  question: string;
  answer: string;
  key_point: string;
  channel?: 'whatsapp' | 'web';
}

interface LawArticleRef {
  law_name: string;
  article: string;
  description: string;
}

interface DailyDigest {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  summary_markdown: string;
  study_dossier_markdown?: string;
  mind_map_mermaid?: string;
  doubt_reviews?: DoubtReview[];
  tags: string[];
  exam_traps: string[];
  law_articles: Array<string | LawArticleRef>;
  video_recommendations: VideoRecommendation[];
  is_favorite: boolean;
  flashcards: Flashcard[];
}

type DigestTab = 'dossier' | 'mindmap' | 'doubts' | 'flashcards' | 'traps' | 'videos';

export default function ResumosDiariosPage() {
  const { user } = useAuthContext();
  const [digests, setDigests] = useState<DailyDigest[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [activeTabFlashcards, setActiveTabFlashcards] = useState<Record<string, Record<string, boolean | null>>>({});
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [activeTabs, setActiveTabs] = useState<Record<string, DigestTab>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleSetTab = (digestId: string, tab: DigestTab) => {
    setActiveTabs((prev) => ({
      ...prev,
      [digestId]: tab,
    }));
  };

  const handleCopyDossier = (digest: DailyDigest) => {
    const textToCopy = digest.study_dossier_markdown || digest.summary_markdown || '';
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy);
    setCopiedId(digest.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handlePrintDossier = (digest: DailyDigest) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const fullText = (digest.study_dossier_markdown || digest.summary_markdown || '')
      .replace(/# /g, '<h1>')
      .replace(/## /g, '<h2>')
      .replace(/### /g, '<h3>')
      .replace(/\n\n/g, '<p></p>')
      .replace(/\n/g, '<br/>');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>AprovaMind - Dossiê de Revisão (${digest.date})</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #111; line-height: 1.6; max-width: 800px; margin: 0 auto; }
            h1 { color: #ea580c; border-bottom: 2px solid #ea580c; padding-bottom: 8px; font-size: 24px; }
            h2 { color: #1e3a8a; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-top: 24px; font-size: 18px; }
            .tag { display: inline-block; background: #f3f4f6; color: #4b5563; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 4px; margin-bottom: 4px; }
            .box-doubt { background: #f0fdf4; border-left: 4px solid #10b981; padding: 12px 16px; margin: 14px 0; border-radius: 4px; }
            .box-trap { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 14px 0; border-radius: 4px; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; font-size: 13px; }
            th { background: #f9fafb; font-weight: bold; }
            @media print {
              body { padding: 0; }
              @page { margin: 20mm; }
            }
          </style>
        </head>
        <body>
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid #ea580c; padding-bottom: 10px; margin-bottom: 16px;">
            <div style="font-weight:bold; font-size:18px; color:#ea580c;">AprovaMind 🎯 Dossiê de Revisão Ativa</div>
            <div style="font-size:12px; color:#6b7280;">Data: ${digest.date}</div>
          </div>
          <h1>${digest.title}</h1>
          <div style="margin: 12px 0;">
            ${(digest.tags || []).map((t) => `<span class="tag">${t}</span>`).join(' ')}
          </div>

          <div>${fullText}</div>

          ${
            digest.doubt_reviews && digest.doubt_reviews.length > 0
              ? `
            <h2>Dúvidas Revisitadas do Aluno</h2>
            ${digest.doubt_reviews
              .map(
                (d, i) => `
              <div class="box-doubt">
                <strong>[Dúvida ${i + 1}]</strong> "${d.question}"<br/>
                <div style="margin-top: 6px;"><strong>Resposta:</strong> ${d.answer}</div>
                <div style="margin-top: 6px; color: #047857;"><strong>Ponto Chave:</strong> ${d.key_point}</div>
              </div>
            `
              )
              .join('')}
          `
              : ''
          }

          ${
            digest.exam_traps && digest.exam_traps.length > 0
              ? `
            <h2>Alertas de Banca (Pegadinhas de Prova)</h2>
            ${digest.exam_traps
              .map(
                (trap) => `
              <div class="box-trap">⚠️ ${trap}</div>
            `
              )
              .join('')}
          `
              : ''
          }

          ${
            digest.flashcards && digest.flashcards.length > 0
              ? `
            <h2>Flashcards de Fixação</h2>
            ${digest.flashcards
              .map(
                (f, i) => `
              <div style="margin-bottom: 10px;">
                <strong>Item ${i + 1}:</strong> ${f.statement}<br/>
                <em>Gabarito: <strong>${f.is_correct ? 'CERTO' : 'ERRADO'}</strong> — ${f.explanation}</em>
              </div>
            `
              )
              .join('')}
          `
              : ''
          }

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredDigests = filterFavorites ? digests.filter((d) => d.is_favorite) : digests;

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
            Seu dossiê de estudos consolidado: mapas mentais, dúvidas reais, fichas de revisão, pegadinhas de prova e flashcards.
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
            Conforme você debate temas com o Mentor no WhatsApp ou no Web Cockpit, a IA consolida todas as dúvidas e gera um dossiê com mapas mentais, caderno de revisão e flashcards.
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
            const currentTab = activeTabs[digest.id] || 'dossier';

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
                        {/* Subnavigation Tabs */}
                        <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-3">
                          <button
                            onClick={() => handleSetTab(digest.id, 'dossier')}
                            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                              currentTab === 'dossier'
                                ? 'bg-orange-500 text-white shadow-sm'
                                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Caderno & Dossiê</span>
                          </button>

                          <button
                            onClick={() => handleSetTab(digest.id, 'mindmap')}
                            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                              currentTab === 'mindmap'
                                ? 'bg-orange-500 text-white shadow-sm'
                                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                          >
                            <GitBranch className="h-3.5 w-3.5" />
                            <span>Mapa Mental</span>
                          </button>

                          <button
                            onClick={() => handleSetTab(digest.id, 'doubts')}
                            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                              currentTab === 'doubts'
                                ? 'bg-orange-500 text-white shadow-sm'
                                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                          >
                            <HelpCircle className="h-3.5 w-3.5" />
                            <span>Dúvidas do Dia ({digest.doubt_reviews?.length || 0})</span>
                          </button>

                          <button
                            onClick={() => handleSetTab(digest.id, 'flashcards')}
                            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                              currentTab === 'flashcards'
                                ? 'bg-orange-500 text-white shadow-sm'
                                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Flashcards ({digest.flashcards?.length || 0})</span>
                          </button>

                          <button
                            onClick={() => handleSetTab(digest.id, 'traps')}
                            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                              currentTab === 'traps'
                                ? 'bg-orange-500 text-white shadow-sm'
                                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Lei Seca & Pegadinhas</span>
                          </button>

                          {digest.video_recommendations && digest.video_recommendations.length > 0 && (
                            <button
                              onClick={() => handleSetTab(digest.id, 'videos')}
                              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                                currentTab === 'videos'
                                  ? 'bg-orange-500 text-white shadow-sm'
                                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                              }`}
                            >
                              <Video className="h-3.5 w-3.5" />
                              <span>Vídeos ({digest.video_recommendations.length})</span>
                            </button>
                          )}
                        </div>

                        {/* TAB 1: CADERNO & DOSSIÊ */}
                        {currentTab === 'dossier' && (
                          <div className="space-y-4">
                            {/* Action Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
                              <span className="text-xs font-medium text-muted-foreground">
                                Dossiê sintetizado para fixação e revisão pré-prova
                              </span>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleCopyDossier(digest)}
                                  className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-muted"
                                >
                                  {copiedId === digest.id ? (
                                    <>
                                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                                      <span className="text-emerald-400">Copiado!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                      <span>Copiar Dossiê</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  onClick={() => handlePrintDossier(digest)}
                                  className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-orange-500"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                  <span>Imprimir / Salvar PDF</span>
                                </button>
                              </div>
                            </div>

                            {/* Dossier Content */}
                            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed whitespace-pre-wrap rounded-xl border border-border/40 bg-card/60 p-5 font-sans">
                              {digest.study_dossier_markdown || digest.summary_markdown || 'Nenhum texto de dossiê gerado ainda.'}
                            </div>
                          </div>
                        )}

                        {/* TAB 2: MAPA MENTAL */}
                        {currentTab === 'mindmap' && (
                          <div className="space-y-4">
                            <MindMapTree
                              mermaidCode={
                                digest.mind_map_mermaid ||
                                `graph TD\n  A["${digest.title || 'Tema Central'}"] --> B["Conceitos Chave"]\n  A --> C["Bases Legais"]\n  B --> B1["Alertas FGV"]\n  C --> C1["Dispositivos"]`
                              }
                              title={digest.title}
                            />
                          </div>
                        )}

                        {/* TAB 3: DÚVIDAS DO DIA REVISITADAS */}
                        {currentTab === 'doubts' && (
                          <div className="space-y-4">
                            {digest.doubt_reviews && digest.doubt_reviews.length > 0 ? (
                              <div className="grid gap-3.5">
                                {digest.doubt_reviews.map((doubt, idx) => (
                                  <div
                                    key={idx}
                                    className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/10 text-orange-400 font-bold text-xs">
                                          {idx + 1}
                                        </div>
                                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                          Dúvida do Aluno
                                        </span>
                                      </div>

                                      <span
                                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                          doubt.channel === 'whatsapp'
                                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                            : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                                        }`}
                                      >
                                        {doubt.channel === 'whatsapp' ? 'WhatsApp' : 'Web Cockpit'}
                                      </span>
                                    </div>

                                    {/* Question */}
                                    <p className="text-sm font-semibold text-foreground italic border-l-2 border-orange-500 pl-3">
                                      &ldquo;{doubt.question}&rdquo;
                                    </p>

                                    {/* Answer */}
                                    <div className="text-xs text-muted-foreground leading-relaxed pt-1">
                                      <span className="font-semibold text-foreground">Orientação do Mentor: </span>
                                      {doubt.answer}
                                    </div>

                                    {/* Key Point */}
                                    {doubt.key_point && (
                                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-xs text-emerald-300 flex items-start gap-2">
                                        <span className="font-bold text-emerald-400 shrink-0">🎯 Ponto Chave:</span>
                                        <span>{doubt.key_point}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                                <HelpCircle className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                                <p className="font-semibold text-foreground">Nenhuma dúvida categorizada individualmente</p>
                                <p className="text-xs mt-1">
                                  As dúvidas do dia foram consolidadas diretamente no Caderno de Revisão e Mapa Mental.
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* TAB 4: FLASHCARDS */}
                        {currentTab === 'flashcards' && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-muted-foreground">
                                Responda para fixar na memória de longo prazo:
                              </span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {digest.flashcards?.length || 0} questões
                              </span>
                            </div>

                            {digest.flashcards && digest.flashcards.length > 0 ? (
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
                                                <span className="text-red-400">
                                                  Você Errou! Gabarito: {fc.is_correct ? 'Certo' : 'Errado'}
                                                </span>
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
                            ) : (
                              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                                Nenhum flashcard gerado para esta data.
                              </div>
                            )}
                          </div>
                        )}

                        {/* TAB 5: LEI SECA & PEGADINHAS */}
                        {currentTab === 'traps' && (
                          <div className="space-y-4">
                            {/* Pegadinhas */}
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

                            {/* Lei Seca */}
                            {digest.law_articles && digest.law_articles.length > 0 && (
                              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-sky-400">
                                  <Scale className="h-4 w-4" />
                                  <span>Dispositivos de Lei Seca para Leitura</span>
                                </div>
                                <div className="mt-2.5 flex flex-wrap gap-2">
                                  {digest.law_articles.map((art, idx) => {
                                    const text =
                                      typeof art === 'string'
                                        ? art
                                        : `${art.law_name} - ${art.article}${art.description ? ` (${art.description})` : ''}`;
                                    return (
                                      <span
                                        key={idx}
                                        className="rounded-lg border border-sky-500/30 bg-sky-950/40 px-2.5 py-1 text-xs font-mono text-sky-300"
                                      >
                                        {text}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* TAB 6: VÍDEOS */}
                        {currentTab === 'videos' && digest.video_recommendations && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                              <Video className="h-4 w-4 text-orange-500" />
                              <span>Aulas Recomendadas no YouTube</span>
                            </div>
                            <div className="grid gap-2.5 sm:grid-cols-2">
                              {digest.video_recommendations.map((v, idx) => {
                                const youtubeUrl =
                                  v.url ||
                                  `https://www.youtube.com/results?search_query=${encodeURIComponent(
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
                                      <p className="truncate text-[11px] text-muted-foreground">{v.channel || v.topic}</p>
                                    </div>
                                    <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  </a>
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
