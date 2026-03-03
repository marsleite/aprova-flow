'use client';

import { useState, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase/config';
import { saveQuestionsToBank } from '@/lib/firebase/questions';
import {
    Upload,
    Sparkles,
    Loader2,
    Save,
    FileText,
    CheckCircle2,
    AlertTriangle,
    Trash2,
    Edit3,
    ChevronDown,
    ChevronUp,
    BookOpen,
    X,
} from 'lucide-react';

interface ExtractedQuestion {
    statement: string;
    alternatives: { key: string; text: string }[];
    answer: string;
    materia: string;
    subtema?: string;
    difficulty?: string;
    explanation?: string;
    _selected?: boolean; // UI-only: whether to include in save
}

export default function AdminQuestionsPage() {
    const { user } = useAuthContext();

    // Upload state
    const [file, setFile] = useState<File | null>(null);
    const [gabaritoFile, setGabaritoFile] = useState<File | null>(null);
    const [examName, setExamName] = useState('');
    const [banca, setBanca] = useState('');
    const [year, setYear] = useState('');
    const [planId, setPlanId] = useState('');

    // Extraction state
    const [extracting, setExtracting] = useState(false);
    const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
    const [extractionMeta, setExtractionMeta] = useState<Record<string, unknown> | null>(null);

    const [isPastingJson, setIsPastingJson] = useState(false);
    const [pastedJson, setPastedJson] = useState('');

    // Save state
    const [saving, setSaving] = useState(false);
    const [saveResult, setSaveResult] = useState<{ examId: string; totalSaved: number; duplicatesSkipped: number } | null>(null);

    // UI state
    const [error, setError] = useState<string | null>(null);
    const [expandedIdx, setExpandedIdx] = useState<Set<number>>(new Set());
    const [editingIdx, setEditingIdx] = useState<number | null>(null);

    // Handle file drop/select
    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f && f.type === 'application/pdf') {
            setFile(f);
            setError(null);
            // Auto-fill exam name from filename
            if (!examName) {
                const name = f.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
                setExamName(name);
            }
        } else {
            setError('Selecione um arquivo PDF válido.');
        }
    }, [examName]);

    const handleGabaritoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f && f.type === 'application/pdf') {
            setGabaritoFile(f);
        } else if (f) {
            setError('O gabarito deve ser um arquivo PDF.');
        }
    }, []);

    // Extract questions from PDF
    const handleExtract = async () => {
        if (!file) return;
        setExtracting(true);
        setError(null);
        setQuestions([]);
        setSaveResult(null);

        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error('Sessão expirada.');

            const formData = new FormData();
            formData.append('pdf', file);
            if (gabaritoFile) formData.append('gabarito', gabaritoFile);
            if (examName) formData.append('examName', examName);
            if (banca) formData.append('banca', banca);
            if (year) formData.append('year', year);

            const res = await fetch('/api/admin/extract-questions', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) {
                const previewMsg = data.preview ? `\n\nPreview da resposta da IA:\n${data.preview}` : '';
                throw new Error((data.error || 'Erro na extração.') + previewMsg);
            }

            const extracted = (data.questions || []).map((q: ExtractedQuestion) => ({
                ...q,
                _selected: true,
            }));
            setQuestions(extracted);
            setExtractionMeta(data.metadata || null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro desconhecido.');
        } finally {
            setExtracting(false);
        }
    };

    const handlePasteJson = () => {
        try {
            const data = JSON.parse(pastedJson);
            const list = Array.isArray(data) ? data : (data.questions || []);

            if (!Array.isArray(list)) {
                throw new Error('O JSON colado não é um array de questões válido.');
            }

            const processed = list.map((q: any) => ({
                statement: q.statement || '',
                alternatives: q.alternatives || [],
                answer: q.answer || '?',
                materia: q.materia || 'Conhecimentos Gerais',
                subtema: q.subtema || 'Importação Manual',
                difficulty: q.difficulty || 'médio',
                _selected: true,
            }));

            setQuestions(processed);
            setIsPastingJson(false);
            setPastedJson('');
            setError(null);
        } catch (err) {
            setError('Falha ao processar JSON: ' + (err instanceof Error ? err.message : 'Formato inválido'));
        }
    };

    // Save reviewed questions
    const handleSave = async () => {
        const selected = questions.filter(q => q._selected !== false);
        if (selected.length === 0) {
            setError('Selecione pelo menos uma questão para salvar.');
            return;
        }

        if (!user?.uid) {
            setError('Sessão expirada. Faça login novamente.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const result = await saveQuestionsToBank({
                examName,
                banca: banca || undefined,
                year: year ? parseInt(year) : undefined,
                planId: planId || undefined,
                questions: selected.map(({ _selected, ...rest }) => rest),
                userId: user.uid,
            });

            setSaveResult(result);
            setQuestions([]);
            setFile(null);
        } catch (err) {
            console.error('Erro ao salvar:', err);
            setError(err instanceof Error ? err.message : 'Erro desconhecido ao salvar.');
        } finally {
            setSaving(false);
        }
    };

    // Toggle question selection
    const toggleSelect = (idx: number) => {
        setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, _selected: !q._selected } : q));
    };

    // Remove question
    const removeQuestion = (idx: number) => {
        setQuestions(prev => prev.filter((_, i) => i !== idx));
    };

    // Update a question field
    const updateQuestion = (idx: number, field: keyof ExtractedQuestion, value: string) => {
        setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
    };

    // Toggle expand
    const toggleExpand = (idx: number) => {
        setExpandedIdx(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx); else next.add(idx);
            return next;
        });
    };

    if (!user) return null;

    const selectedCount = questions.filter(q => q._selected !== false).length;
    const materias = [...new Set(questions.map(q => q.materia))].sort();

    return (
        <div className="min-h-screen bg-[#080c14]">
            {/* Header */}
            <div className="border-b border-white/[0.05] bg-[#0b1120]/60 px-6 py-5 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-violet-500/15 p-2.5">
                        <BookOpen className="h-6 w-6 text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Gerenciar Questões</h1>
                        <p className="text-sm text-slate-500">Upload de PDF → Extração IA → Revisão → Salvar no Banco</p>
                    </div>
                </div>
            </div>

            <div className="px-6 py-6 space-y-6 max-w-5xl">
                {/* ── Step 1: Upload ── */}
                <div className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-6">
                    <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                        <Upload className="h-5 w-5 text-blue-400" />
                        1. Upload do PDF da Prova
                    </h2>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {/* File input */}
                        <div className="sm:col-span-2">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-violet-500/50 transition-colors bg-gray-900/30">
                                <div className="flex flex-col items-center">
                                    {file ? (
                                        <>
                                            <FileText className="h-8 w-8 text-violet-400 mb-2" />
                                            <span className="text-sm text-gray-300 font-medium">{file.name}</span>
                                            <span className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-8 w-8 text-gray-600 mb-2" />
                                            <span className="text-sm text-gray-500">Arraste ou clique para selecionar o PDF</span>
                                        </>
                                    )}
                                </div>
                                <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                            </label>
                        </div>

                        {/* Gabarito upload */}
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-400 mb-1">Gabarito (opcional)</label>
                            <label className="flex items-center justify-center w-full h-20 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-emerald-500/50 transition-colors bg-gray-900/30">
                                <div className="flex items-center gap-3">
                                    {gabaritoFile ? (
                                        <>
                                            <FileText className="h-5 w-5 text-emerald-400" />
                                            <div>
                                                <span className="text-sm text-gray-300 font-medium">{gabaritoFile.name}</span>
                                                <span className="text-xs text-gray-500 ml-2">{(gabaritoFile.size / 1024 / 1024).toFixed(1)} MB</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-5 w-5 text-gray-600" />
                                            <span className="text-sm text-gray-500">PDF do gabarito para respostas corretas</span>
                                        </>
                                    )}
                                </div>
                                <input type="file" accept=".pdf" className="hidden" onChange={handleGabaritoChange} />
                            </label>
                        </div>

                        {/* Metadata fields */}
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Nome da Prova *</label>
                            <input
                                type="text"
                                value={examName}
                                onChange={e => setExamName(e.target.value)}
                                placeholder="TJ-BA 2024 - Juiz Substituto"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-violet-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Banca</label>
                            <input
                                type="text"
                                value={banca}
                                onChange={e => setBanca(e.target.value)}
                                placeholder="CEBRASPE, FGV, FCC..."
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-violet-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Ano</label>
                            <input
                                type="number"
                                value={year}
                                onChange={e => setYear(e.target.value)}
                                placeholder="2024"
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-violet-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Plan ID (opcional)</label>
                            <input
                                type="text"
                                value={planId}
                                onChange={e => setPlanId(e.target.value)}
                                placeholder="Vincular ao edital..."
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-violet-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="mt-5 space-y-4">
                        <div className="flex flex-col gap-2 items-end">
                            <button
                                onClick={handleExtract}
                                disabled={!file || !examName || extracting}
                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-violet-500/20"
                            >
                                {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                {extracting ? 'Extraindo com IA...' : 'Extrair Questões com IA'}
                            </button>

                            {!extracting && (
                                <button
                                    onClick={() => setIsPastingJson(!isPastingJson)}
                                    className="text-[10px] text-gray-500 hover:text-violet-400 transition-colors underline underline-offset-2"
                                >
                                    {isPastingJson ? 'Cancelar colagem' : 'Ou colar JSON manualmente'}
                                </button>
                            )}
                        </div>

                        {isPastingJson && (
                            <div className="space-y-3 pt-4 border-t border-white/[0.06]">
                                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                                    Conteúdo JSON (Array de questões)
                                </label>
                                <textarea
                                    value={pastedJson}
                                    onChange={(e) => setPastedJson(e.target.value)}
                                    placeholder='[ { "statement": "...", "alternatives": [...], "answer": "A" } ]'
                                    className="w-full h-48 bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs font-mono text-gray-300 focus:border-violet-500 focus:outline-none resize-none"
                                />
                                <button
                                    onClick={handlePasteJson}
                                    className="w-full bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2 rounded-lg transition-colors border border-white/10"
                                >
                                    Processar e Revisar JSON
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-sm text-red-400">
                        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* Success */}
                {saveResult && (
                    <div className="p-5 bg-emerald-900/20 border border-emerald-500/30 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold">
                            <CheckCircle2 className="h-5 w-5" />
                            Prova salva com sucesso!
                        </div>
                        <p className="text-sm text-gray-300">
                            <strong>{saveResult.totalSaved}</strong> questões salvas no banco.
                            {saveResult.duplicatesSkipped > 0 && (
                                <span className="text-amber-400"> ({saveResult.duplicatesSkipped} duplicatas ignoradas)</span>
                            )}
                        </p>
                        <p className="text-xs text-gray-500">Exam ID: {saveResult.examId}</p>
                    </div>
                )}

                {/* Extraction metadata */}
                {extractionMeta && questions.length > 0 && (
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>✅ {questions.length} questões extraídas</span>
                        {gabaritoFile && <span>📋 Com gabarito</span>}
                        <span>⏱ {String(extractionMeta.latencyMs ?? '')}ms</span>
                        <span>🤖 {String(extractionMeta.model ?? '')}</span>
                    </div>
                )}

                {/* ── Step 2: Review ── */}
                {questions.length > 0 && (
                    <div className="rounded-xl border border-white/[0.06] bg-[#0f1825] p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <Edit3 className="h-5 w-5 text-amber-400" />
                                2. Revisar Questões ({selectedCount}/{questions.length} selecionadas)
                            </h2>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                {materias.map(m => (
                                    <span key={m} className="px-2 py-0.5 bg-gray-800 rounded text-gray-400">{m}</span>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                            {questions.map((q, idx) => {
                                const isExpanded = expandedIdx.has(idx);
                                const isEditing = editingIdx === idx;
                                return (
                                    <div
                                        key={idx}
                                        className={`rounded-lg border transition-colors ${q._selected === false
                                            ? 'border-gray-800 bg-gray-900/30 opacity-50'
                                            : 'border-white/[0.08] bg-gray-900/50'
                                            }`}
                                    >
                                        {/* Row */}
                                        <div className="flex items-start gap-3 p-3">
                                            {/* Checkbox */}
                                            <input
                                                type="checkbox"
                                                checked={q._selected !== false}
                                                onChange={() => toggleSelect(idx)}
                                                className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-800 text-violet-500 focus:ring-violet-500"
                                            />

                                            {/* Content */}
                                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(idx)}>
                                                <p className="text-sm text-gray-300 line-clamp-2">{q.statement}</p>
                                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/15 text-blue-400 rounded font-medium">{q.materia}</span>
                                                    {q.subtema && <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-500 rounded">{q.subtema}</span>}
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 rounded font-mono">Resp: {q.answer}</span>
                                                    {q.difficulty && <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded">{q.difficulty}</span>}
                                                    <span className="text-[10px] text-gray-600">{q.alternatives.length} alt.</span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <button onClick={() => setEditingIdx(isEditing ? null : idx)} className="p-1.5 text-gray-500 hover:text-amber-400 transition-colors">
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                </button>
                                                <button onClick={() => removeQuestion(idx)} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                                <button onClick={() => toggleExpand(idx)} className="p-1.5 text-gray-500">
                                                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded */}
                                        {isExpanded && (
                                            <div className="px-10 pb-3 space-y-2 border-t border-white/[0.04] pt-3">
                                                <p className="text-xs text-gray-300 whitespace-pre-wrap">{q.statement}</p>
                                                {q.alternatives.map(alt => (
                                                    <div key={alt.key} className={`text-xs px-2 py-1.5 rounded ${alt.key === q.answer
                                                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                                        : 'bg-gray-800/50 text-gray-400'
                                                        }`}>
                                                        <strong>{alt.key})</strong> {alt.text}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Edit mode */}
                                        {isEditing && (
                                            <div className="px-4 pb-4 space-y-3 border-t border-white/[0.04] pt-3">
                                                <div className="grid gap-3 sm:grid-cols-3">
                                                    <div>
                                                        <label className="block text-[10px] text-gray-500 mb-1">Matéria</label>
                                                        <input
                                                            value={q.materia}
                                                            onChange={e => updateQuestion(idx, 'materia', e.target.value)}
                                                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-violet-500 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] text-gray-500 mb-1">Gabarito</label>
                                                        <input
                                                            value={q.answer}
                                                            onChange={e => updateQuestion(idx, 'answer', e.target.value)}
                                                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-violet-500 focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] text-gray-500 mb-1">Dificuldade</label>
                                                        <select
                                                            value={q.difficulty || 'médio'}
                                                            onChange={e => updateQuestion(idx, 'difficulty', e.target.value)}
                                                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:border-violet-500 focus:outline-none"
                                                        >
                                                            <option value="fácil">Fácil</option>
                                                            <option value="médio">Médio</option>
                                                            <option value="difícil">Difícil</option>
                                                            <option value="extremo">Extremo</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <button onClick={() => setEditingIdx(null)} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
                                                    <X className="h-3 w-3" /> Fechar edição
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Save button */}
                        <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-5">
                            <p className="text-xs text-gray-500">
                                {selectedCount} questão(ões) serão salvas como "<strong className="text-white">{examName}</strong>"
                            </p>
                            <button
                                onClick={handleSave}
                                disabled={saving || selectedCount === 0}
                                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-semibold transition-all"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {saving ? 'Salvando...' : 'Salvar Prova no Banco'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
