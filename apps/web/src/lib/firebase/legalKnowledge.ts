/**
 * RAG de Conhecimento Jurídico — Firestore
 *
 * Busca trechos de legislação, súmulas e jurisprudência relevantes
 * para fundamentar as explicações da IA.
 *
 * Usa embeddings gerados pelo Gemini text-embedding-004 e
 * busca por similaridade de cosseno no Firestore.
 *
 * Collection: "legal_knowledge"
 */

import {
    collection,
    getDocs,
    query,
    where,
    limit as firestoreLimit,
} from 'firebase/firestore';
import { db } from './config';

const LEGAL_KNOWLEDGE_COLLECTION = 'legal_knowledge';

export interface LegalDocument {
    id: string;
    title: string;
    content: string;
    source: string;
    materia: string;
    subtemas: string[];
    embedding: number[];
    createdAt: string;
}

export interface LegalSearchResult {
    title: string;
    content: string;
    source: string;
    materia: string;
    score: number;
}

/**
 * Gera embedding via Gemini text-embedding-004
 */
async function generateEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY não configurada');
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'models/gemini-embedding-001',
                content: {
                    parts: [{ text }],
                },
            }),
        }
    );

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Embedding API error: ${response.status} — ${err}`);
    }

    const data = await response.json();
    return data.embedding.values;
}

/**
 * Similaridade de cosseno entre dois vetores
 */
function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
}

/**
 * Busca os trechos legais mais relevantes para uma questão.
 *
 * 1. Gera embedding da questão via Gemini
 * 2. Busca documentos no Firestore filtrados por matéria
 * 3. Calcula similaridade de cosseno
 * 4. Retorna os top-N mais relevantes
 */
export async function searchRelevantLaw(
    questionText: string,
    materia: string,
    topK: number = 5
): Promise<LegalSearchResult[]> {
    // Gerar embedding da questão
    const queryEmbedding = await generateEmbedding(
        `${materia}: ${questionText}`.substring(0, 1000) // limit embedding input
    );

    // Buscar documentos da matéria no Firestore
    const q = query(
        collection(db, LEGAL_KNOWLEDGE_COLLECTION),
        where('materia', '==', materia),
        firestoreLimit(100) // max docs per materia to search
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        // Fallback: buscar sem filtro de matéria (talvez a matéria esteja diferente)
        const fallbackQ = query(
            collection(db, LEGAL_KNOWLEDGE_COLLECTION),
            firestoreLimit(50)
        );
        const fallbackSnap = await getDocs(fallbackQ);
        if (fallbackSnap.empty) return [];

        return rankByRelevance(fallbackSnap, queryEmbedding, topK);
    }

    return rankByRelevance(snapshot, queryEmbedding, topK);
}

/**
 * Ranqueia documentos por relevância usando cosine similarity
 */
function rankByRelevance(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    snapshot: any,
    queryEmbedding: number[],
    topK: number
): LegalSearchResult[] {
    const scored: LegalSearchResult[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    snapshot.forEach((docSnap: any) => {
        const data = docSnap.data();
        if (!data.embedding || !Array.isArray(data.embedding)) return;

        const score = cosineSimilarity(queryEmbedding, data.embedding);
        scored.push({
            title: data.title || '',
            content: data.content || '',
            source: data.source || '',
            materia: data.materia || '',
            score,
        });
    });

    // Ordenar por score decrescente e retornar top-K
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
}

/**
 * Exporta generateEmbedding para uso no script de seed
 */
export { generateEmbedding };
