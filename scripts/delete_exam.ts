#!/usr/bin/env ts-node
/**
 * Remove um exame e todas as questões associadas em questions_bank.
 * Uso: ts-node scripts/delete_exam.ts <examId> [examId...]
 */

import process from 'node:process';
import admin from 'firebase-admin';

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

async function deleteExam(examId: string) {
  initFirebaseAdmin();
  const db = admin.firestore();
  const examRef = db.collection('exams').doc(examId);
  const snapshot = await examRef.get();

  if (!snapshot.exists) {
    console.warn(`⚠️  Exame ${examId} não encontrado, pulando.`);
    return;
  }

  const data = snapshot.data() as { questions?: string[]; name?: string } | undefined;
  const questionIds = data?.questions ?? [];

  console.log(`🗑️  Removendo exame ${examId} (${data?.name ?? 'sem nome'}) com ${questionIds.length} questões.`);

  const chunkSize = 400;
  for (let i = 0; i < questionIds.length; i += chunkSize) {
    const chunk = questionIds.slice(i, i + chunkSize);
    const batch = db.batch();
    chunk.forEach((qid) => {
      batch.delete(db.collection('questions_bank').doc(qid));
    });
    await batch.commit();
    console.log(`   - Questões deletadas: ${Math.min(i + chunkSize, questionIds.length)}/${questionIds.length}`);
  }

  await examRef.delete();
  console.log(`✅ Exame ${examId} removido.`);
}

async function main() {
  const examIds = process.argv.slice(2);
  if (examIds.length === 0) {
    console.error('Uso: ts-node scripts/delete_exam.ts <examId> [examId...]');
    process.exit(1);
  }

  for (const examId of examIds) {
    await deleteExam(examId);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Erro ao remover exames:', err);
  process.exit(1);
});
