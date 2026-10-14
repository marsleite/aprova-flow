'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale,
  Landmark,
  ShieldAlert,
  Coins,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface SubjectItem {
  name: string;
  weight: number;
  topics: string[];
}

interface EditalArea {
  id: string;
  tabLabel: string;
  title: string;
  subtitle: string;
  badge: string;
  recommendedHours: number;
  complexity: string;
  icon: typeof Scale;
  subjects: SubjectItem[];
}

const EDITAL_AREAS: EditalArea[] = [
  {
    id: 'juridico',
    tabLabel: 'Jurídico Elite',
    title: 'PGE-SP / Magistratura Estadual',
    subtitle: 'Carreira Jurídica de Estado — Foco em jurisprudência dominante e súmulas vinculantes.',
    badge: 'Alta Complexidade (TypeSafe Jev)',
    recommendedHours: 28,
    complexity: 'Alta Complexidade',
    icon: Scale,
    subjects: [
      {
        name: 'Direito Constitucional',
        weight: 20,
        topics: ['Controle Difuso e Concentrado de Constitucionalidade', 'Direitos e Garantias Fundamentais (Art. 5º)', 'Ações Constitucionais (MS, HC, ADPF)'],
      },
      {
        name: 'Direito Administrativo',
        weight: 18,
        topics: ['Nova Lei de Licitações e Contratos (Lei 14.133/21)', 'Improbidade Administrativa e Alterações da Lei 14.230', 'Responsabilidade Civil do Estado'],
      },
      {
        name: 'Direito Processual Civil',
        weight: 16,
        topics: ['Sistema de Precedentes Obrigatórios', 'Recursos nos Tribunais Superiores (STF/STJ)', 'Tutelas Provisórias de Urgência e Evidência'],
      },
      {
        name: 'Direito Tributário & Financeiro',
        weight: 14,
        topics: ['Imunidades e Princípios Constitucionais Tributários', 'Lei de Responsabilidade Fiscal (LRF)', 'Execução Fiscal e Defesas do Contribuinte'],
      },
      {
        name: 'Direito Civil & Empresarial',
        weight: 12,
        topics: ['Teoria Geral das Obrigações e Contratos', 'Responsabilidade Civil Contratual e Extracontratual', 'Direito das Coisas e Posse'],
      },
      {
        name: 'Direitos Difusos & Coletivos',
        weight: 10,
        topics: ['Ação Civil Pública e Legitimação', 'Tutela de Interesses Individuais Homogêneos'],
      },
      {
        name: 'Direito Penal & Processual Penal',
        weight: 10,
        topics: ['Crimes contra a Administração Pública', 'Cadeia de Custódia e Nulidades da Prova'],
      },
    ],
  },
  {
    id: 'tribunais',
    tabLabel: 'Tribunais (TRF/TRT)',
    title: 'Analista Judiciário — Área Judiciária',
    subtitle: 'Tribunais Regionais Federais e do Trabalho — Velocidade na resolução e literalidade da lei.',
    badge: 'Média-Alta Complexidade',
    recommendedHours: 22,
    complexity: 'Média-Alta Complexidade',
    icon: Landmark,
    subjects: [
      {
        name: 'Direito Processual Civil',
        weight: 22,
        topics: ['Prazos Processuais e Atos de Comunicação', 'Procedimento Comum e Fases Instrutórias', 'Juizados Especiais Federais (Lei 10.259)'],
      },
      {
        name: 'Direito Constitucional',
        weight: 20,
        topics: ['Organização e Competências do Poder Judiciário', 'Funções Essenciais à Justiça', 'Remédios Constitucionais'],
      },
      {
        name: 'Direito Administrativo',
        weight: 18,
        topics: ['Regime Jurídico dos Servidores Federais (Lei 8.112/90)', 'Atos Administrativos e Requisitos de Validade', 'Poderes Administrativos'],
      },
      {
        name: 'Língua Portuguesa & Discursiva',
        weight: 16,
        topics: ['Interpretação e Tipologia Textual FGV/FCC', 'Sintaxe de Regência, Concordância e Crase', 'Coesão Referencial e Sequencial'],
      },
      {
        name: 'Direito Previdenciário ou do Trabalho',
        weight: 14,
        topics: ['Benefícios em Espécie da Previdência Social', 'Contrato Individual de Trabalho e Verbas Rescisórias'],
      },
      {
        name: 'Raciocínio Lógico-Matemático',
        weight: 10,
        topics: ['Lógica Proposicional e Conectivos', 'Equivalências Lógicas e Negação de Proposições'],
      },
    ],
  },
  {
    id: 'policial',
    tabLabel: 'Carreira Policial',
    title: 'Delegado de Polícia Civil / PF',
    subtitle: 'Liderança de inquérito, medidas cautelares invasivas e tipificação penal estrita.',
    badge: 'Alta Complexidade (Operações)',
    recommendedHours: 26,
    complexity: 'Alta Complexidade',
    icon: ShieldAlert,
    subjects: [
      {
        name: 'Direito Penal',
        weight: 22,
        topics: ['Teoria Geral do Crime (Fato Típico, Ilicitude e Culpabilidade)', 'Crimes contra a Vida e contra o Patrimônio', 'Lavagem de Capitais (Lei 9.613/98)'],
      },
      {
        name: 'Direito Processual Penal',
        weight: 22,
        topics: ['Inquérito Policial e Papel da Autoridade Policial (Lei 12.830/13)', 'Prisões Cautelares (Preventiva, Temporária e em Flagrante)', 'Interceptação Telefônica e Meios Extraordinários de Obtenção de Prova'],
      },
      {
        name: 'Legislação Penal Especial',
        weight: 18,
        topics: ['Organizações Criminosas (Lei 12.850/13)', 'Lei de Drogas (Lei 11.343/06)', 'Estatuto do Desarmamento e Abuso de Autoridade (Lei 13.869/19)'],
      },
      {
        name: 'Direito Constitucional & Humanos',
        weight: 16,
        topics: ['Segurança Pública (Art. 144 da CF/88)', 'Pacto de San José da Costa Rica e Jurisprudência da Corte IDH', 'Inviolabilidade de Domicílio e Busca e Apreensão'],
      },
      {
        name: 'Direito Administrativo',
        weight: 12,
        topics: ['Poder de Polícia e Limites da Discricionariedade', 'Regime Disciplinar Policial e Responsabilidade Administrativa'],
      },
      {
        name: 'Criminologia & Medicina Legal',
        weight: 10,
        topics: ['Tanatologia e Lesonologia Forense', 'Escolas Criminológicas e Vitimologia'],
      },
    ],
  },
  {
    id: 'fiscal',
    tabLabel: 'Fiscal & Controle',
    title: 'Auditor Fiscal da Receita / SEFAZ',
    subtitle: 'Domínio de legislação tributária, contabilidade societária analítica e auditoria de dados.',
    badge: 'Alta Complexidade (Finanças)',
    recommendedHours: 30,
    complexity: 'Alta Complexidade',
    icon: Coins,
    subjects: [
      {
        name: 'Direito Tributário & Legislação',
        weight: 22,
        topics: ['Código Tributário Nacional (CTN)', 'Lançamento e Suspensão do Crédito Tributário', 'Impostos Estaduais (ICMS, IPVA, ITCMD) ou Federais (IR, PIS/Cofins)'],
      },
      {
        name: 'Contabilidade Geral & Avançada',
        weight: 20,
        topics: ['Pronunciamentos Técnicos CPCs aplicados', 'Balanço Patrimonial, DRE, DFC e DVA', 'Consolidação de Balanços e Avaliação de Investimentos'],
      },
      {
        name: 'Auditoria Fiscal & Digital',
        weight: 16,
        topics: ['Procedimentos de Auditoria e Testes Substantivos', 'Amostragem em Auditoria e Risco de Distorção Relevante', 'SPED Fiscal e Escrituração Contábil Digital (ECD/ECF)'],
      },
      {
        name: 'Tecnologia da Informação & SQL',
        weight: 16,
        topics: ['Consultas SQL e Álgebra Relacional', 'Modelagem de Dados e Data Warehousing', 'Lógica de Programação e Python para Análise de Dados'],
      },
      {
        name: 'Direito Constitucional & Administrativo',
        weight: 14,
        topics: ['Sistema Tributário Nacional e Repartição de Receitas', 'Controle da Administração Pública e Tribunal de Contas'],
      },
      {
        name: 'Raciocínio Lógico & Estatística',
        weight: 12,
        topics: ['Estatística Inferencial e Testes de Hipótese', 'Matemática Financeira e VPL/TIR'],
      },
    ],
  },
];

export function MultiAreaEditalShowcase() {
  const [activeAreaId, setActiveAreaId] = useState<string>('juridico');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const activeArea = EDITAL_AREAS.find((a) => a.id === activeAreaId) || EDITAL_AREAS[0];

  const toggleExpand = (subjectName: string) => {
    setExpandedSubject((prev) => (prev === subjectName ? null : subjectName));
  };

  return (
    <div className="w-full max-w-4xl mx-auto border border-border/80 bg-card rounded-2xl overflow-hidden shadow-2xl transition-all">
      {/* 4 Clickable Area Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-border bg-muted/30 p-1.5 gap-1.5">
        {EDITAL_AREAS.map((area) => {
          const Icon = area.icon;
          const isActive = area.id === activeAreaId;
          return (
            <button
              key={area.id}
              onClick={() => {
                setActiveAreaId(area.id);
                setExpandedSubject(null);
              }}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-background text-foreground shadow-sm border border-border/80 font-bold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className="truncate">{area.tabLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Header Info */}
      <div className="p-6 sm:p-8 border-b border-border bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {activeArea.badge}
            </span>
            <span className="text-xs text-muted-foreground font-mono">Edital Verticalizado</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-foreground">{activeArea.title}</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed">{activeArea.subtitle}</p>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-border/40">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Meta Calibrada</span>
          <div className="flex items-baseline gap-1 text-2xl font-extrabold text-primary font-mono">
            {activeArea.recommendedHours}h
            <span className="text-xs text-muted-foreground font-normal">/semana</span>
          </div>
        </div>
      </div>

      {/* Subjects & Verticalized Topics List */}
      <div className="p-6 sm:p-8 space-y-3.5 bg-card/60">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Matéria & Ponderação de Edital</span>
          <span className="hidden sm:inline text-[11px] font-mono text-primary">Clique na matéria para ver os tópicos</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeArea.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {activeArea.subjects.map((sub) => {
              const isExpanded = expandedSubject === sub.name;
              return (
                <div
                  key={sub.name}
                  className="rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpand(sub.name)}
                    className="w-full text-left p-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs font-semibold text-foreground mb-1.5">
                        <span className="truncate">{sub.name}</span>
                        <span className="text-primary font-mono ml-2">{sub.weight}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${sub.weight * 3.5}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-muted-foreground shrink-0 pl-2">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {/* Expandable Verticalized Topics Preview */}
                  {isExpanded && (
                    <div className="px-4 pb-3.5 pt-1 border-t border-border/40 bg-muted/40 text-xs space-y-2">
                      <div className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                        Tópicos prioritários do edital:
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {sub.topics.map((t, tIdx) => (
                          <div key={tIdx} className="flex items-start gap-2 text-foreground/90">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                            <span className="leading-tight">{t}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer CTA Banner */}
      <div className="px-6 py-4 bg-muted/30 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground text-center sm:text-left">
          Quer importar o seu próprio PDF ou edital sob medida?
        </span>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity"
        >
          <span>Montar Meu Plano Grátis</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
