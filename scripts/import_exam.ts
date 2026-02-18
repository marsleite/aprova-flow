#!/usr/bin/env ts-node
/**
 * Script de importação de provas oficiais para o Firestore.
 *
 * Uso:
 *   ts-node scripts/import_exam.ts ./data/tjba-juiz-2026.json [--dry-run]
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import admin from 'firebase-admin';

interface ImportAlternative {
  key: string;
  text: string;
}

interface ImportQuestion {
  statement: string;
  alternatives: ImportAlternative[];
  answer: string;
  explanation?: string;
  materia: string;
  subtema?: string;
  banca?: string;
  year?: number;
  difficulty?: string;
  tags?: string[];
}

interface ImportExamMeta {
  name: string;
  planId?: string;
  banca?: string;
  year?: number;
  durationMinutes?: number;
}

interface ImportPayload {
  exam: ImportExamMeta;
  questions: ImportQuestion[];
}

function initFirebaseAdmin() {
  if (admin.apps.length > 0) return;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Defina FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL e FIREBASE_ADMIN_PRIVATE_KEY.');
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

function loadPayload(filePath: string): ImportPayload {
  const absPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Arquivo não encontrado: ${absPath}`);
  }
  const raw = fs.readFileSync(absPath, 'utf-8');
  const data = JSON.parse(raw) as ImportPayload;
  if (!data.exam || !Array.isArray(data.questions) || data.questions.length === 0) {
    throw new Error('Payload inválido. Certifique-se de fornecer exam e questions.');
  }
  return data;
}

async function importExam(filePath: string, dryRun = false) {
  initFirebaseAdmin();
  const db = admin.firestore();
  const payload = loadPayload(filePath);

  console.log(`📄 Prova: ${payload.exam.name}`);
  console.log(`📝 Questões: ${payload.questions.length}`);
  if (dryRun) {
    console.log('Modo dry-run — nada será gravado.');
    return;
  }

  const questionIds: string[] = [];
  const chunkSize = 400;
  for (let i = 0; i < payload.questions.length; i += chunkSize) {
    const chunk = payload.questions.slice(i, i + chunkSize);
    const batch = db.batch();
    chunk.forEach((question) => {
      const ref = db.collection('questions_bank').doc();
      questionIds.push(ref.id);
      batch.set(ref, {
        ...question,
        sourceExamId: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
    console.log(`✓ Inseridas ${questionIds.length}/${payload.questions.length}`);
  }

  const examRef = db.collection('exams').doc();
  await examRef.set({
    ...payload.exam,
    questions: questionIds,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const updateBatch = db.batch();
  questionIds.forEach((qid) => {
    updateBatch.update(db.collection('questions_bank').doc(qid), { sourceExamId: examRef.id });
  });
  await updateBatch.commit();

  console.log(`🏁 Importação concluída. examId=${examRef.id}`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Uso: ts-node scripts/import_exam.ts <arquivo.json> [--dry-run]');
    process.exit(1);
  }
  return {
    filePath: args[0],
    dryRun: args.includes('--dry-run'),
  };
}

(async () => {
  try {
    const { filePath, dryRun } = parseArgs();
    await importExam(filePath, dryRun);
    process.exit(0);
  } catch (error) {
    console.error('Erro na importação:', error);
    process.exit(1);
  }
})();
