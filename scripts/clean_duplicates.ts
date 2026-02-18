#!/usr/bin/env ts-node
/**
 * Remove exames duplicados do Firestore mantendo apenas a primeira ocorrência
 */

import admin from 'firebase-admin';
import process from 'node:process';

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

async function cleanDuplicates() {
  initFirebaseAdmin();
  const db = admin.firestore();

  console.log('📋 Listando exames...');
  const snapshot = await db.collection('exams').get();
  
  const exams: Array<{ id: string; name: string; questions: string[] }> = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    exams.push({
      id: doc.id,
      name: data.name,
      questions: data.questions || [],
    });
  });

  console.log(`✓ Total de exames: ${exams.length}`);

  // Agrupa por nome
  const grouped = new Map<string, Array<{ id: string; questions: string[] }>>();
  for (const exam of exams) {
    if (!grouped.has(exam.name)) {
      grouped.set(exam.name, []);
    }
    grouped.get(exam.name)!.push({ id: exam.id, questions: exam.questions });
  }

  // Identifica duplicados
  const toDelete: string[] = [];
  for (const [name, instances] of grouped.entries()) {
    if (instances.length > 1) {
      console.log(`\n🔍 Duplicado encontrado: "${name}" - ${instances.length} instâncias`);
      // Mantém o primeiro, remove os demais
      const idsToRemove = instances.slice(1).map(i => i.id);
      toDelete.push(...idsToRemove);
      console.log(`   Mantendo: ${instances[0].id}`);
      console.log(`   Removendo: ${idsToRemove.join(', ')}`);
    }
  }

  if (toDelete.length === 0) {
    console.log('\n✅ Nenhum duplicado encontrado!');
    return;
  }

  console.log(`\n🗑️  Total a remover: ${toDelete.length} exames`);
  console.log('\n⚠️  Iniciando remoção...');

  // Remove exames duplicados
  for (const examId of toDelete) {
    console.log(`   Removendo exam: ${examId}`);
    
    // Remove questões associadas
    const exam = exams.find(e => e.id === examId);
    if (exam && exam.questions.length > 0) {
      console.log(`   Removendo ${exam.questions.length} questões associadas`);
      const batch = db.batch();
      for (const qId of exam.questions) {
        batch.delete(db.collection('questions_bank').doc(qId));
      }
      await batch.commit();
    }
    
    // Remove o exame
    await db.collection('exams').doc(examId).delete();
  }

  console.log('\n✅ Limpeza concluída!');
}

(async () => {
  try {
    await cleanDuplicates();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
})();
