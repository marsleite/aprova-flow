'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, ChevronRight, Loader2, AlertCircle, Lock, Mail } from 'lucide-react';

interface PreviewSubject {
  subject: string;
  weight: number;
}

interface PreviewResult {
  planName: string;
  examDate: string | null;
  subjects: PreviewSubject[];
  suggestedWeeklyGoalHours: number;
  totalSubjectsFound: number;
  isPreviewTruncated: boolean;
  hiddenSubjectsCount: number;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function EditalParseSection() {
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailAlreadyUsed, setEmailAlreadyUsed] = useState(false);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(selected: File | null) {
    if (!selected) return;
    if (selected.type !== 'application/pdf') {
      setError('Por favor, selecione um arquivo PDF.');
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('O arquivo deve ter no máximo 10MB.');
      return;
    }
    setError(null);
    setResult(null);
    setEmailAlreadyUsed(false);
    setFile(selected);
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !email) return;
    setLoading(true);
    setError(null);
    setEmailAlreadyUsed(false);

    try {
      const pdfBase64 = await fileToBase64(file);
      const res = await fetch('/api/public/parse-edital-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64, email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'email_already_used') {
          setEmailAlreadyUsed(true);
          return;
        }
        setError(data.error || 'Erro ao processar o edital.');
        return;
      }

      setResult(data as PreviewResult);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files[0] ?? null);
  }

  function reset() {
    setResult(null);
    setFile(null);
    setEmail('');
    setError(null);
    setEmailAlreadyUsed(false);
  }

  if (emailAlreadyUsed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto border border-border bg-card rounded-sm p-8 text-center"
      >
        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          Você já usou seu parse gratuito
        </h3>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Crie sua conta gratuitamente para analisar quantos editais quiser e salvar seus planos de estudo.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-widest hover:opacity-90 transition-opacity"
        >
          Criar conta grátis
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
        <button onClick={reset} className="block mx-auto mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors">
          Tentar com outro email
        </button>
      </motion.div>
    );
  }

  if (result) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto flex flex-col gap-6"
      >
        <div className="border border-border bg-card rounded-sm overflow-hidden">
          <div className="p-6 border-b border-border bg-muted/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-primary mb-1">
                  Edital Analisado
                </p>
                <h3 className="text-xl font-medium text-foreground tracking-tight">
                  {result.planName}
                </h3>
                {result.examDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Prova:{' '}
                    {new Date(result.examDate + 'T12:00:00').toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Meta semanal</p>
                <p className="text-2xl font-medium text-primary">{result.suggestedWeeklyGoalHours}h</p>
              </div>
            </div>
          </div>

          <div className="p-6 flex flex-col gap-3">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
              Matérias ({result.totalSubjectsFound} encontradas)
            </p>
            {result.subjects.map((s) => (
              <div key={s.subject}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground">{s.subject}</span>
                  <span className="text-xs font-medium text-primary ml-2">{s.weight}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${s.weight}%` }} />
                </div>
              </div>
            ))}

            {result.isPreviewTruncated && (
              <div className="mt-4 flex items-center gap-3 border border-border p-4 bg-muted/10">
                <Lock className="w-4 h-4 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">+{result.hiddenSubjectsCount} matérias</span>{' '}
                  ocultas. Crie sua conta para ver o plano completo e começar a estudar.
                </p>
              </div>
            )}
          </div>
        </div>

        <Link
          href="/login"
          className="w-full px-8 py-5 text-primary-foreground text-xs font-semibold uppercase tracking-widest bg-primary hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
        >
          Criar conta e salvar este plano
          <ChevronRight className="w-4 h-4" />
        </Link>

        <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center">
          Analisar outro edital
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={(e) => void handleAnalyze(e)} className="max-w-2xl mx-auto flex flex-col gap-4">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-sm p-10 text-center cursor-pointer transition-all ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/10'
        }`}
        onClick={() => !file && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full border border-border bg-muted flex items-center justify-center">
            {file ? <FileText className="w-5 h-5 text-primary" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
          </div>
          {file ? (
            <div>
              <p className="text-sm font-medium text-foreground">{file.name}</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
              >
                Trocar arquivo
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Arraste o PDF do edital aqui ou{' '}
                <span className="text-primary font-medium">clique para selecionar</span>
              </p>
              <p className="text-xs text-muted-foreground/60">PDF até 10MB</p>
            </>
          )}
        </div>
      </div>

      {/* Email gate — aparece após selecionar o PDF */}
      <AnimatePresence>
        {file && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 border border-border bg-card rounded-sm px-4 py-3.5">
              <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="email"
                placeholder="seu@email.com — para receber o resultado"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="flex items-start gap-3 border border-destructive/40 bg-destructive/5 p-4 rounded-sm">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!file || !email || loading}
        className="w-full px-8 py-5 text-primary-foreground text-xs font-semibold uppercase tracking-widest bg-primary hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analisando edital com IA...
          </>
        ) : (
          <>
            Analisar edital grátis
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </button>

      <p className="text-center text-xs text-muted-foreground/60">
        1 análise gratuita por email · Processado com Gemini · Sem spam
      </p>
    </form>
  );
}
