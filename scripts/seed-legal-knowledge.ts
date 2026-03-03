/**
 * Seed de Conhecimento Jurídico para RAG
 *
 * Popula o Firestore com artigos de lei, súmulas e doutrina,
 * já com embeddings pré-computados via Gemini text-embedding-004.
 *
 * Uso: npx tsx scripts/seed-legal-knowledge.ts
 *
 * Requer: GEMINI_API_KEY e as variáveis Firebase no .env.local
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig, 'seed-app');
const db = getFirestore(app);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const COLLECTION = 'legal_knowledge';
const BATCH_SIZE = 20; // Firestore batch limit minus margin

interface LegalChunk {
    title: string;
    content: string;
    source: string;
    materia: string;
    subtemas: string[];
}

// ── Embedding via Gemini ──

async function generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'models/gemini-embedding-001',
                content: { parts: [{ text }] },
            }),
        }
    );

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Embedding API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return data.embedding.values;
}

// ── Corpus Jurídico ──

const CORPUS: LegalChunk[] = [
    // ═══════════════════════════════════════════
    // CÓDIGO CIVIL — PARTE GERAL (Atualizado Lei 13.146/2015)
    // ═══════════════════════════════════════════
    {
        title: 'Art. 1º - Código Civil',
        content: 'Toda pessoa é capaz de direitos e deveres na ordem civil.',
        source: 'CC/2002',
        materia: 'Direito Civil',
        subtemas: ['Pessoas Naturais', 'Capacidade Civil'],
    },
    {
        title: 'Art. 2º - Código Civil',
        content: 'A personalidade civil da pessoa começa do nascimento com vida; mas a lei põe a salvo, desde a concepção, os direitos do nascituro.',
        source: 'CC/2002',
        materia: 'Direito Civil',
        subtemas: ['Pessoas Naturais', 'Personalidade Civil', 'Nascituro'],
    },
    {
        title: 'Art. 3º - Código Civil (Alterado pela Lei 13.146/2015)',
        content: 'São absolutamente incapazes de exercer pessoalmente os atos da vida civil os menores de 16 (dezesseis) anos.',
        source: 'CC/2002',
        materia: 'Direito Civil',
        subtemas: ['Pessoas Naturais', 'Capacidade Civil', 'Incapacidade'],
    },
    {
        title: 'Art. 4º - Código Civil (Alterado pela Lei 13.146/2015)',
        content: 'São incapazes, relativamente a certos atos ou à maneira de os exercer: I - os maiores de dezesseis e menores de dezoito anos; II - os ébrios habituais e os viciados em tóxico; III - aqueles que, por causa transitória ou permanente, não puderem exprimir sua vontade; IV - os pródigos. Parágrafo único. A capacidade dos indígenas será regulada por legislação especial.',
        source: 'CC/2002',
        materia: 'Direito Civil',
        subtemas: ['Pessoas Naturais', 'Capacidade Civil', 'Incapacidade Relativa'],
    },
    {
        title: 'Art. 5º - Código Civil',
        content: 'A menoridade cessa aos dezoito anos completos, quando a pessoa fica habilitada à prática de todos os atos da vida civil. Parágrafo único. Cessará, para os menores, a incapacidade: I - pela concessão dos pais, ou de um deles na falta do outro, mediante instrumento público, independentemente de homologação judicial, ou por sentença do juiz, ouvido o tutor, se o menor tiver dezesseis anos completos; II - pelo casamento; III - pelo exercício de emprego público efetivo; IV - pela colação de grau em curso de ensino superior; V - pelo estabelecimento civil ou comercial, ou pela existência de relação de emprego, desde que, em função deles, o menor com dezesseis anos completos tenha economia própria.',
        source: 'CC/2002',
        materia: 'Direito Civil',
        subtemas: ['Pessoas Naturais', 'Emancipação', 'Maioridade'],
    },
    {
        title: 'Art. 6º - Código Civil',
        content: 'A existência da pessoa natural termina com a morte; presume-se esta, quanto aos ausentes, nos casos em que a lei autoriza a abertura de sucessão definitiva.',
        source: 'CC/2002',
        materia: 'Direito Civil',
        subtemas: ['Pessoas Naturais', 'Morte', 'Ausência'],
    },
    {
        title: 'Art. 11 a 21 - Código Civil (Direitos da Personalidade)',
        content: 'Art. 11. Com exceção dos casos previstos em lei, os direitos da personalidade são intransmissíveis e irrenunciáveis, não podendo o seu exercício sofrer limitação voluntária. Art. 12. Pode-se exigir que cesse a ameaça, ou a lesão, a direito da personalidade, e reclamar perdas e danos, sem prejuízo de outras sanções previstas em lei. Art. 21. A vida privada da pessoa natural é inviolável, e o juiz, a requerimento do interessado, adotará as providências necessárias para impedir ou fazer cessar ato contrário a esta norma.',
        source: 'CC/2002',
        materia: 'Direito Civil',
        subtemas: ['Pessoas Naturais', 'Direitos da Personalidade'],
    },

    // ═══════════════════════════════════════════
    // CÓDIGO CIVIL — OBRIGAÇÕES E RESPONSABILIDADE CIVIL
    // ═══════════════════════════════════════════
    {
        title: 'Art. 186 - Código Civil',
        content: 'Aquele que, por ação ou omissão voluntária, negligência ou imprudência, violar direito e causar dano a outrem, ainda que exclusivamente moral, comete ato ilícito.',
        source: 'CC/2002',
        materia: 'Direito Civil',
        subtemas: ['Responsabilidade Civil', 'Ato Ilícito'],
    },
    {
        title: 'Art. 187 - Código Civil',
        content: 'Também comete ato ilícito o titular de um direito que, ao exercê-lo, excede manifestamente os limites impostos pelo seu fim econômico ou social, pela boa-fé ou pelos bons costumes.',
        source: 'CC/2002',
        materia: 'Direito Civil',
        subtemas: ['Responsabilidade Civil', 'Abuso de Direito'],
    },
    {
        title: 'Art. 927 - Código Civil',
        content: 'Aquele que, por ato ilícito (arts. 186 e 187), causar dano a outrem, fica obrigado a repará-lo. Parágrafo único. Haverá obrigação de reparar o dano, independentemente de culpa, nos casos especificados em lei, ou quando a atividade normalmente desenvolvida pelo autor do dano implicar, por sua natureza, risco para os direitos de outrem.',
        source: 'CC/2002',
        materia: 'Direito Civil',
        subtemas: ['Responsabilidade Civil', 'Responsabilidade Objetiva', 'Teoria do Risco'],
    },

    // ═══════════════════════════════════════════
    // CÓDIGO CIVIL — PRESCRIÇÃO E DECADÊNCIA
    // ═══════════════════════════════════════════
    {
        title: 'Art. 189 - Código Civil',
        content: 'Violado o direito, nasce para o titular a pretensão, a qual se extingue, pela prescrição, nos prazos a que aludem os arts. 205 e 206.',
        source: 'CC/2002',
        materia: 'Direito Civil',
        subtemas: ['Prescrição e Decadência', 'Pretensão'],
    },
    {
        title: 'Art. 205 - Código Civil',
        content: 'A prescrição ocorre em dez anos, quando a lei não lhe haja fixado prazo menor.',
        source: 'CC/2002',
        materia: 'Direito Civil',
        subtemas: ['Prescrição e Decadência', 'Prazo Geral'],
    },
    {
        title: 'Art. 206 - Código Civil',
        content: 'Prescreve: § 1º Em um ano: I - a pretensão dos hospedeiros ou fornecedores de víveres destinados a consumo no próprio estabelecimento, para o pagamento da hospedagem ou dos alimentos; II - a pretensão do segurado contra o segurador, ou a deste contra aquele. § 2º Em dois anos, a pretensão para haver prestações alimentares, a partir da data em que se vencerem. § 3º Em três anos: I - a pretensão relativa a aluguéis de prédios urbanos ou rústicos; (...) IV - a pretensão de ressarcimento de enriquecimento sem causa; V - a pretensão de reparação civil. § 4º Em quatro anos, a pretensão relativa à tutela, a contar da data da aprovação das contas. § 5º Em cinco anos: I - a pretensão de cobrança de dívidas líquidas constantes de instrumento público ou particular; II - a pretensão dos profissionais liberais em geral, procuradores judiciais, curadores e professores pelos seus honorários.',
        source: 'CC/2002',
        materia: 'Direito Civil',
        subtemas: ['Prescrição e Decadência', 'Prazos Especiais'],
    },
    {
        title: 'Art. 191 - Código Civil',
        content: 'A renúncia da prescrição pode ser expressa ou tácita, e só valerá, sendo feita, sem prejuízo de terceiro, depois que a prescrição se consumar; tácita é a renúncia quando se presume de fatos do interessado, incompatíveis com a prescrição.',
        source: 'CC/2002',
        materia: 'Direito Civil',
        subtemas: ['Prescrição e Decadência', 'Renúncia da Prescrição'],
    },

    // ═══════════════════════════════════════════
    // CÓDIGO CIVIL — CONTRATOS
    // ═══════════════════════════════════════════
    {
        title: 'Art. 421 - Código Civil (Alterado Lei 13.874/2019)',
        content: 'A liberdade contratual será exercida nos limites da função social do contrato. Parágrafo único. Nas relações contratuais privadas, prevalecerão o princípio da intervenção mínima e a excepcionalidade da revisão contratual.',
        source: 'CC/2002',
        materia: 'Direito Civil',
        subtemas: ['Contratos', 'Função Social do Contrato', 'Intervenção Mínima'],
    },
    {
        title: 'Art. 422 - Código Civil',
        content: 'Os contratantes são obrigados a guardar, assim na conclusão do contrato, como em sua execução, os princípios de probidade e boa-fé.',
        source: 'CC/2002',
        materia: 'Direito Civil',
        subtemas: ['Contratos', 'Boa-Fé Objetiva'],
    },

    // ═══════════════════════════════════════════
    // CONSTITUIÇÃO FEDERAL DE 1988
    // ═══════════════════════════════════════════
    {
        title: 'Art. 5º, caput - CF/88',
        content: 'Todos são iguais perante a lei, sem distinção de qualquer natureza, garantindo-se aos brasileiros e aos estrangeiros residentes no País a inviolabilidade do direito à vida, à liberdade, à igualdade, à segurança e à propriedade.',
        source: 'CF/1988',
        materia: 'Direito Constitucional',
        subtemas: ['Direitos e Garantias Fundamentais', 'Princípio da Igualdade'],
    },
    {
        title: 'Art. 5º, V e X - CF/88',
        content: 'V - é assegurado o direito de resposta, proporcional ao agravo, além da indenização por dano material, moral ou à imagem; X - são invioláveis a intimidade, a vida privada, a honra e a imagem das pessoas, assegurado o direito a indenização pelo dano material ou moral decorrente de sua violação;',
        source: 'CF/1988',
        materia: 'Direito Constitucional',
        subtemas: ['Direitos e Garantias Fundamentais', 'Dano Moral', 'Privacidade'],
    },
    {
        title: 'Art. 5º, XXXV, LIV e LV - CF/88',
        content: 'XXXV - a lei não excluirá da apreciação do Poder Judiciário lesão ou ameaça a direito; LIV - ninguém será privado da liberdade ou de seus bens sem o devido processo legal; LV - aos litigantes, em processo judicial ou administrativo, e aos acusados em geral são assegurados o contraditório e ampla defesa, com os meios e recursos a ela inerentes;',
        source: 'CF/1988',
        materia: 'Direito Constitucional',
        subtemas: ['Direitos e Garantias Fundamentais', 'Acesso à Justiça', 'Devido Processo Legal', 'Contraditório e Ampla Defesa'],
    },

    // ═══════════════════════════════════════════
    // CÓDIGO DE PROCESSO CIVIL (CPC/2015)
    // ═══════════════════════════════════════════
    {
        title: 'Art. 1º a 6º - CPC/2015',
        content: 'Art. 1º O processo civil será ordenado, disciplinado e interpretado conforme os valores e as normas fundamentais estabelecidas na Constituição da República Federativa do Brasil, observando-se as disposições deste Código. Art. 4º As partes têm o direito de obter em prazo razoável a solução integral do mérito, incluída a atividade satisfativa. Art. 6º Todos os sujeitos do processo devem cooperar entre si para que se obtenha, em tempo razoável, decisão de mérito justa e efetiva.',
        source: 'CPC/2015',
        materia: 'Direito Processual Civil',
        subtemas: ['Normas Fundamentais', 'Duração Razoável do Processo', 'Princípio da Cooperação'],
    },

    // ═══════════════════════════════════════════
    // CÓDIGO PENAL (DECRETO-LEI 2.848/1940)
    // ═══════════════════════════════════════════
    {
        title: 'Art. 1º e 2º - Código Penal',
        content: 'Art. 1º - Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal. Art. 2º - Ninguém pode ser punido por fato que lei posterior deixa de considerar crime, cessando em virtude dela a execução e os efeitos penais da sentença condenatória.',
        source: 'CP/1940',
        materia: 'Direito Penal',
        subtemas: ['Princípio da Legalidade', 'Novatio Legis in Mellius', 'Retroatividade Profana'],
    },
    {
        title: 'Art. 13 - Código Penal (Relação de Causalidade)',
        content: 'O resultado, de que depende a existência do crime, somente é imputável a quem lhe deu causa. Considera-se causa a ação ou omissão sem a qual o resultado não teria ocorrido. § 1º - A superveniência de causa relativamente independente exclui a imputação quando, por si só, produziu o resultado; os fatos anteriores, entretanto, imputam-se a quem os praticou.',
        source: 'CP/1940',
        materia: 'Direito Penal',
        subtemas: ['Relação de Causalidade', 'Nexo Causal', 'Concausas'],
    },
    {
        title: 'Art. 14 - Código Penal (Crime Consumado e Tentado)',
        content: 'Diz-se o crime: I - consumado, quando nela se reúnem todos os elementos de sua definição legal; II - tentado, quando, iniciada a execução, não se consuma por circunstâncias alheias à vontade do agente. Parágrafo único - Salvo disposição em contrário, pune-se a tentativa com a pena correspondente ao crime consumado, diminuída de um a dois terços.',
        source: 'CP/1940',
        materia: 'Direito Penal',
        subtemas: ['Consumação e Tentativa', 'Iter Criminis'],
    },
    {
        title: 'Art. 18 - Código Penal (Dolo e Culpa)',
        content: 'Diz-se o crime: I - doloso, quando o agente quis o resultado ou assumiu o risco de produzi-lo; II - culposo, quando o agente deu causa ao resultado por imprudência, negligência ou imperícia.',
        source: 'CP/1940',
        materia: 'Direito Penal',
        subtemas: ['Dolo', 'Culpa', 'Tipo Subjetivo'],
    },
    {
        title: 'Art. 312 - Código Penal (Peculato)',
        content: 'Apropriar-se o funcionário público de dinheiro, valor ou qualquer outro bem móvel, público ou particular, de que tem a posse em razão do cargo, ou desviá-lo, em proveito próprio ou alheio: Pena - reclusão, de dois a doze anos, e multa. § 1º - Aplica-se a mesma pena, se o funcionário público, embora não tendo a posse do dinheiro, valor ou bem, o subtrai, ou concorre para que seja subtraído, em proveito próprio ou alheio, valendo-se de facilidade que lhe proporciona a qualidade de funcionário.',
        source: 'CP/1940',
        materia: 'Direito Penal',
        subtemas: ['Crimes Contra a Administração Pública', 'Peculato'],
    },

    // ═══════════════════════════════════════════
    // CÓDIGO DE PROCESSO PENAL (DECRETO-LEI 3.689/1941)
    // ═══════════════════════════════════════════
    {
        title: 'Art. 4º - CPP (Inquérito Policial)',
        content: 'A polícia judiciária será exercida pelas autoridades policiais no território de suas respectivas circunscrições e terá por fim a apuração das infrações penais e da sua autoria.',
        source: 'CPP/1941',
        materia: 'Direito Processual Penal',
        subtemas: ['Inquérito Policial', 'Polícia Judiciária'],
    },
    {
        title: 'Art. 24 - CPP (Ação Penal)',
        content: 'Nos crimes de ação pública, esta será promovida por denúncia do Ministério Público, mas dependerá, quando a lei o exigir, de requisição do Ministro da Justiça, ou de representação do ofendido ou de quem tiver qualidade para representá-lo.',
        source: 'CPP/1941',
        materia: 'Direito Processual Penal',
        subtemas: ['Ação Penal', 'Ação Penal Pública'],
    },
    {
        title: 'Art. 302 - CPP (Prisão em Flagrante)',
        content: 'Considera-se em flagrante delito quem: I - está cometendo a infração penal; II - acaba de cometê-la; III - é perseguido, logo após, pela autoridade, pelo ofendido ou por qualquer pessoa, em situação que faça presumir ser autor da infração; IV - é encontrado, logo depois, com instrumentos, armas, objetos ou papéis que façam presumir ser ele autor da infração.',
        source: 'CPP/1941',
        materia: 'Direito Processual Penal',
        subtemas: ['Prisão e Liberdade Provisória', 'Prisão em Flagrante'],
    },

    // ═══════════════════════════════════════════
    // CÓDIGO DE DEFESA DO CONSUMIDOR (LEI 8.078/1990)
    // ═══════════════════════════════════════════
    {
        title: 'Art. 2º e 3º - CDC (Consumidor e Fornecedor)',
        content: 'Art. 2º Consumidor é toda pessoa física ou jurídica que adquire ou utiliza produto ou serviço como destinatário final. Parágrafo único. Equipara-se a consumidor a coletividade de pessoas, ainda que indetermináveis, que haja intervindo nas relações de consumo. Art. 3º Fornecedor é toda pessoa física ou jurídica, pública ou privada, nacional ou estrangeira, bem como os entes despersonalizados, que desenvolvem atividade de produção, montagem, criação, construção, transformação, importação, exportação, distribuição ou comercialização de produtos ou prestação de serviços.',
        source: 'Lei 8.078/1990',
        materia: 'Direito do Consumidor',
        subtemas: ['Relação de Consumo', 'Consumidor', 'Fornecedor'],
    },
    {
        title: 'Art. 6º - CDC (Direitos Básicos do Consumidor)',
        content: 'São direitos básicos do consumidor: (...) VI - a efetiva prevenção e reparação de danos patrimoniais e morais, individuais, coletivos e difusos; (...) VIII - a facilitação da defesa de seus direitos, inclusive com a inversão do ônus da prova, a seu favor, no processo civil, quando, a critério do juiz, for verossímil a alegação ou quando for ele hipossuficiente, segundo as regras ordinárias de experiências;',
        source: 'Lei 8.078/1990',
        materia: 'Direito do Consumidor',
        subtemas: ['Direitos Básicos', 'Inversão do Ônus da Prova', 'Reparação de Danos'],
    },
    {
        title: 'Art. 12 - CDC (Responsabilidade pelo Fato do Produto)',
        content: 'O fabricante, o produtor, o construtor, nacional ou estrangeiro, e o importador respondem, independentemente da existência de culpa, pela reparação dos danos causados aos consumidores por defeitos decorrentes de projeto, fabricação, construção, montagem, fórmulas, manipulação, apresentação ou acondicionamento de seus produtos, bem como por informações insuficientes ou inadequadas sobre sua utilização e riscos.',
        source: 'Lei 8.078/1990',
        materia: 'Direito do Consumidor',
        subtemas: ['Responsabilidade Civil', 'Fato do Produto', 'Responsabilidade Objetiva'],
    },

    // ═══════════════════════════════════════════
    // SÚMULAS VINCULANTES E STJ
    // ═══════════════════════════════════════════
    {
        title: 'Súmula 37 - STJ',
        content: 'São cumuláveis as indenizações por dano material e dano moral oriundos do mesmo fato.',
        source: 'STJ',
        materia: 'Direito Civil',
        subtemas: ['Responsabilidade Civil', 'Cumulação de Danos'],
    },
    {
        title: 'Súmula 54 - STJ',
        content: 'Os juros moratórios fluem a partir do evento danoso, em caso de responsabilidade extracontratual.',
        source: 'STJ',
        materia: 'Direito Civil',
        subtemas: ['Responsabilidade Civil', 'Juros de Mora'],
    },
    {
        title: 'Súmula 227 - STJ',
        content: 'A pessoa jurídica pode sofrer dano moral.',
        source: 'STJ',
        materia: 'Direito Civil',
        subtemas: ['Responsabilidade Civil', 'Dano Moral', 'Pessoa Jurídica'],
    },
    {
        title: 'Súmula 362 - STJ',
        content: 'A correção monetária do valor da indenização do dano moral incide desde a data do arbitramento.',
        source: 'STJ',
        materia: 'Direito Civil',
        subtemas: ['Responsabilidade Civil', 'Dano Moral', 'Correção Monetária'],
    },
    {
        title: 'Súmula 387 - STJ',
        content: 'É lícita a cumulação das indenizações de dano estético e dano moral.',
        source: 'STJ',
        materia: 'Direito Civil',
        subtemas: ['Responsabilidade Civil', 'Dano Moral', 'Dano Estético'],
    }
];

// ── Main ──

async function main() {
    if (!GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY não encontrada no .env.local');
        process.exit(1);
    }

    console.log(`🚀 Iniciando seed de ${CORPUS.length} documentos jurídicos...`);
    console.log(`📊 Gerando embeddings via Gemini gemini-embedding-001...\n`);

    const docsWithEmbeddings: Array<LegalChunk & { embedding: number[] }> = [];

    for (let i = 0; i < CORPUS.length; i++) {
        const chunk = CORPUS[i];
        const embeddingText = `${chunk.title}: ${chunk.content}`;

        try {
            const embedding = await generateEmbedding(embeddingText);
            docsWithEmbeddings.push({ ...chunk, embedding });
            process.stdout.write(`  ✅ [${i + 1}/${CORPUS.length}] ${chunk.title}\n`);
        } catch (err) {
            console.error(`  ❌ [${i + 1}/${CORPUS.length}] ${chunk.title}: ${err}`);
        }

        // Rate limiting: 60 requests per minute for free tier
        if (i > 0 && i % 15 === 0) {
            console.log('  ⏳ Aguardando rate limit...');
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    console.log(`\n📝 Escrevendo ${docsWithEmbeddings.length} documentos no Firestore...`);

    const now = new Date().toISOString();

    for (let i = 0; i < docsWithEmbeddings.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = docsWithEmbeddings.slice(i, i + BATCH_SIZE);

        for (const docData of chunk) {
            const ref = doc(collection(db, COLLECTION));
            batch.set(ref, {
                ...docData,
                createdAt: now,
            });
        }

        await batch.commit();
        console.log(`  📦 Batch ${Math.floor(i / BATCH_SIZE) + 1} escrito (${chunk.length} docs)`);
    }

    console.log(`\n🎉 Seed completo! ${docsWithEmbeddings.length} documentos com embeddings no Firestore.`);
    console.log('📌 Collection: legal_knowledge');
    console.log('📌 Materias: Direito Civil, Direito Constitucional, Direito Processual Civil');
}

main().catch(err => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
});
