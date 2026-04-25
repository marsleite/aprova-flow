'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Upload, FileText, ChevronRight, Loader2, AlertCircle, Lock } from 'lucide-react';

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
    reader.onload = () => {
      const result = reader.result as string;
      // Remove o prefixo "data:application/pdf;base64,"
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function EditalParseSection() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(selected: File | null) {
    if (!selected) return;
    if (selected.type !== 'application/pdf') {
      setError('Por favor, selecione um arquivo PDF.');
      return;
    }
    if (selected.size > 8 * 1024 * 1024) {
      setError('O arquivo deve ter no máximo 8MB.');
      return;
    }
    setError(null);
    setResult(null);
    setFile(selected);
  }

  async function handleAnalyze() {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const pdfBase64 = await fileToBase64(file);

      const res = await fetch('/api/public/parse-edital-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64 }),
      });

      const data = await res.json();

      if (!res.ok) {
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

  return (
    <div className="max-w-2xl mx-auto">
      {!result ? (
        <div className="flex flex-col gap-6">
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-sm p-12 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/10'
            }`}
            onClick={() => inputRef.current?.click()}
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
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-full border border-border bg-muted flex items-center justify-center">
                <Upload className="w-6 h-6 text-muted-foreground" />
              </div>
              {file ? (
                <div className="flex items-center gap-2 text-foreground">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Arraste o PDF do edital aqui ou{' '}
                    <span className="text-primary font-medium">clique para selecionar</span>
                  </p>
                  <p className="text-xs text-muted-foreground/60">PDF até 8MB</p>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 border border-destructive/40 bg-destructive/5 p-4 rounded-sm">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={!file || loading}
            className="w-full px-8 py-5 text-primary-foreground text-xs font-semibold uppercase tracking-widest transition-all duration-300 shadow-lg bg-primary hover:opacity-90 shadow-primary/20 hover:shadow-primary/40 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
            Sem cadastro · Gratuito · Processado com Gemini 2.0 Flash
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Resultado */}
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
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
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
                <div key={s.subject} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground truncate">{s.subject}</span>
                      <span className="text-xs font-medium text-primary ml-2 shrink-0">{s.weight}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${s.weight}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {result.isPreviewTruncated && (
                <div className="mt-4 flex items-center gap-3 border border-border p-4 bg-muted/10">
                  <Lock className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    <span className="text-foreground font-medium">+{result.hiddenSubjectsCount} matérias</span>{' '}
                    ocultas no preview. Crie sua conta para ver o plano completo e salvar no AprovaMind.
                  </p>
                </div>
              )}
            </div>
          </div>

          <Link
            href="/login"
            className="w-full px-8 py-5 text-primary-foreground text-xs font-semibold uppercase tracking-widest transition-all duration-300 shadow-lg bg-primary hover:opacity-90 shadow-primary/20 hover:shadow-primary/40 flex items-center justify-center gap-2"
          >
            Criar conta e salvar este plano
            <ChevronRight className="w-4 h-4" />
          </Link>

          <button
            onClick={() => { setResult(null); setFile(null); }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
          >
            Analisar outro edital
          </button>
        </div>
      )}
    </div>
  );
}
