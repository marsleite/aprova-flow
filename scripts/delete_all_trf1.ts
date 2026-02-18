#!/usr/bin/env ts-node
/**
 * Remove TODOS os exames TRF1 do Firestore
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

async function deleteAllTRF1() {
  initFirebaseAdmin();
  const db = admin.firestore();

  console.log('📋 Buscando todos os exames TRF1...');
  const snapshot = await db.collection('exams').where('name', '>=', 'TRF1').where('name', '<=', 'TRF1\uf8ff').get();
  
  if (snapshot.empty) {
    console.log('✅ Nenhum exame TRF1 encontrado');
    return;
  }

  console.log(`🗑️  Encontrados ${snapshot.size} exames TRF1`);

  for (const doc of snapshot.docs) {
    const data = doc.data();
    console.log(`\n   Removendo: ${data.name} (${doc.id})`);
    
    // Remove questões associadas
    if (data.questions && data.questions.length > 0) {
      console.log(`   Removendo ${data.questions.length} questões associadas`);
      const batch = db.batch();
      for (const qId of data.questions) {
        batch.delete(db.collection('questions_bank').doc(qId));
      }
      await batch.commit();
    }
    
    // Remove o exame
    await db.collection('exams').doc(doc.id).delete();
  }

  console.log('\n✅ Todos os exames TRF1 foram removidos!');
}

(async () => {
  try {
    await deleteAllTRF1();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
})();
