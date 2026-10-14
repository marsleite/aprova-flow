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
    id: 'tribunais',
    tabLabel: 'Tribunais (TRF/TRT)',
    title: 'Analista Judiciário — TRF / TRT',
    subtitle: 'Tribunais Federais e do Trabalho — Velocidade na resolução, literalidade da lei e alta retenção.',
    badge: 'Média-Alta Complexidade (TypeSafe Jev)',
    recommendedHours: 22,
    complexity: 'Média-Alta Complexidade',
    icon: Landmark,
    subjects: [
      {
        name: 'Língua Portuguesa (FGV / FCC)',
        weight: 20,
        topics: ['Interpretação e Tipologia Textual Avançada', 'Sintaxe de Regência, Concordância e Crase', 'Reescrita de Frases e Equivalência Semântica'],
      },
      {
        name: 'Direito Constitucional',
        weight: 18,
        topics: ['Organização e Competências do Poder Judiciário', 'Funções Essenciais à Justiça', 'Direitos e Garantias Fundamentais (Art. 5º)'],
      },
      {
        name: 'Direito Administrativo',
        weight: 18,
        topics: ['Regime Jurídico Único (Lei 8.112/90)', 'Atos e Poderes Administrativos', 'Nova Lei de Licitações (Lei 14.133/21)'],
      },
      {
        name: 'Direito Processual Civil',
        weight: 16,
        topics: ['Prazos Processuais e Atos de Comunicação', 'Procedimento Comum e Tutelas de Urgência', 'Recursos e Precedentes Qualificados'],
      },
      {
        name: 'Raciocínio Lógico-Matemático',
        weight: 14,
        topics: ['Lógica Proposicional e Tabela Verdade', 'Equivalências Lógicas e Leis de De Morgan', 'Problemas Aritméticos e Análise Combinatória'],
      },
      {
        name: 'Noções de Informática & TI',
        weight: 14,
        topics: ['Segurança da Informação e Criptografia', 'Redes de Computadores e Nuvem', 'Ferramentas de Produtividade e Navegação'],
      },
    ],
  },
  {
    id: 'policial',
    tabLabel: 'Carreira Policial',
    title: 'Agente / Escrivão / Delegado (PF e PC)',
    subtitle: 'Foco em Direito Penal, Processual Penal, Informática Avançada e Língua Portuguesa.',
    badge: 'Alta Complexidade (Operações)',
    recommendedHours: 26,
    complexity: 'Alta Complexidade',
    icon: ShieldAlert,
    subjects: [
      {
        name: 'Língua Portuguesa (Cebraspe)',
        weight: 20,
        topics: ['Interpretação e Tipologia Textual Cebraspe', 'Reescrita e Coesão Textual', 'Ortografia, Crase e Pontuação'],
      },
      {
        name: 'Informática & Tecnologia da Informação',
        weight: 20,
        topics: ['Redes e Arquitetura TCP/IP', 'Segurança da Informação e Malware', 'Banco de Dados, Big Data e Python/R'],
      },
      {
        name: 'Direito Penal & Processual Penal',
        weight: 18,
        topics: ['Teoria Geral do Crime e Tipicidade', 'Prisões Cautelares e Inquérito Policial', 'Cadeia de Custódia e Meios de Obtenção de Prova'],
      },
      {
        name: 'Legislação Penal Especial',
        weight: 16,
        topics: ['Organizações Criminosas (Lei 12.850/13)', 'Lei de Drogas (Lei 11.343/06)', 'Abuso de Autoridade e Armas'],
      },
      {
        name: 'Direito Constitucional & Humanos',
        weight: 14,
        topics: ['Segurança Pública (Art. 144 CF/88)', 'Poder de Polícia e Limites da Discricionariedade', 'Inviolabilidade Domiciliar e Tratados Internacionais'],
      },
      {
        name: 'Raciocínio Lógico & Estatística',
        weight: 12,
        topics: ['Proposições, Tautologias e Negações', 'Probabilidade e Distribuição Amostral'],
      },
    ],
  },
  {
    id: 'fiscal',
    tabLabel: 'Fiscal & Controle',
    title: 'Auditor Fiscal da Receita / SEFAZ / TCU',
    subtitle: 'Domínio de legislação tributária, contabilidade analítica, TI e administração financeira.',
    badge: 'Alta Complexidade (Finanças & Controle)',
    recommendedHours: 30,
    complexity: 'Alta Complexidade',
    icon: Coins,
    subjects: [
      {
        name: 'Direito Tributário & Legislação',
        weight: 20,
        topics: ['Código Tributário Nacional (CTN)', 'Lançamento e Suspensão do Crédito Tributário', 'Impostos Estaduais (ICMS) e Federais (IR, PIS/Cofins)'],
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
        name: 'Tecnologia da Informação & Python/SQL',
        weight: 16,
        topics: ['Consultas SQL e Álgebra Relacional', 'Data Warehousing e Business Intelligence', 'Lógica de Programação e Análise de Dados'],
      },
      {
        name: 'Administração Financeira e Orçamentária (AFO)',
        weight: 14,
        topics: ['Lei de Responsabilidade Fiscal (LRF)', 'Orçamento Público e Lei 4.320/64', 'Despesas, Receitas e Restos a Pagar'],
      },
      {
        name: 'Língua Portuguesa (FGV)',
        weight: 14,
        topics: ['Interpretação Semântica e Implícitos FGV', 'Reescrita e Regência Nominal/Verbal', 'Coesão Referencial e Conectivos'],
      },
    ],
  },
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
];

export function MultiAreaEditalShowcase() {
  const [activeAreaId, setActiveAreaId] = useState<string>('tribunais');
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
