'use client';

import { useMemo, useState } from 'react';
import { Copy, Check, GitBranch, Code } from 'lucide-react';

interface MindMapNode {
  id: string;
  label: string;
  children: MindMapNode[];
}

interface MindMapTreeProps {
  mermaidCode?: string;
  title?: string;
}

export default function MindMapTree({ mermaidCode, title }: MindMapTreeProps) {
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

  // Parser leve e robusto para sintaxe graph TD / mindmap do Mermaid
  const rootNodes = useMemo<MindMapNode[]>(() => {
    if (!mermaidCode) return [];

    const lines = mermaidCode.split('\n');
    const labelMap = new Map<string, string>();
    const parentToChildren = new Map<string, string[]>();
    const hasParent = new Set<string>();
    const allNodeIds = new Set<string>();

    const cleanLabel = (text: string) => {
      return text
        .replace(/^["'(\[{]+/, '')
        .replace(/["')\]}]+$/, '')
        .trim();
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('graph') || line.startsWith('flowchart') || line.startsWith('mindmap') || line.startsWith('%%')) {
        continue;
      }

      // Procura por conexões: A["Label"] --> B["Label"] ou A --> B["Label"]
      const arrowMatch = line.match(/(.*?)\s*-->\s*(.*)/);
      if (arrowMatch) {
        const leftPart = arrowMatch[1].trim();
        const rightPart = arrowMatch[2].trim();

        // Extrai ID e Label da esquerda
        const leftMatch = leftPart.match(/^([a-zA-Z0-9_-]+)(?:\[(.*?)\]|\((.*?)\)|\{(.*?)\})?$/);
        const fromId = leftMatch ? leftMatch[1] : leftPart.replace(/[^a-zA-Z0-9_-]/g, '');
        const fromLabel = leftMatch && (leftMatch[2] || leftMatch[3] || leftMatch[4]) 
          ? cleanLabel(leftMatch[2] || leftMatch[3] || leftMatch[4]) 
          : fromId;

        // Extrai ID e Label da direita
        const rightMatch = rightPart.match(/^([a-zA-Z0-9_-]+)(?:\[(.*?)\]|\((.*?)\)|\{(.*?)\})?$/);
        const toId = rightMatch ? rightMatch[1] : rightPart.replace(/[^a-zA-Z0-9_-]/g, '');
        const toLabel = rightMatch && (rightMatch[2] || rightMatch[3] || rightMatch[4]) 
          ? cleanLabel(rightMatch[2] || rightMatch[3] || rightMatch[4]) 
          : toId;

        if (fromId && toId) {
          allNodeIds.add(fromId);
          allNodeIds.add(toId);
          hasParent.add(toId);

          if (!labelMap.has(fromId) || labelMap.get(fromId) === fromId) {
            labelMap.set(fromId, fromLabel || fromId);
          }
          if (!labelMap.has(toId) || labelMap.get(toId) === toId) {
            labelMap.set(toId, toLabel || toId);
          }

          const children = parentToChildren.get(fromId) || [];
          if (!children.includes(toId)) {
            children.push(toId);
          }
          parentToChildren.set(fromId, children);
        }
      }
    }

    // Se não encontrou raízes explícitas com setas, cria nó raiz padrão com o título
    let roots = Array.from(allNodeIds).filter((id) => !hasParent.has(id));
    if (roots.length === 0 && allNodeIds.size > 0) {
      roots = [Array.from(allNodeIds)[0]];
    }

    const buildTree = (nodeId: string, visited = new Set<string>()): MindMapNode => {
      visited.add(nodeId);
      const childIds = parentToChildren.get(nodeId) || [];
      const children: MindMapNode[] = [];

      for (const cId of childIds) {
        if (!visited.has(cId)) {
          children.push(buildTree(cId, new Set(visited)));
        }
      }

      return {
        id: nodeId,
        label: labelMap.get(nodeId) || nodeId,
        children,
      };
    };

    return roots.map((rId) => buildTree(rId));
  }, [mermaidCode]);

  const handleCopy = () => {
    if (!mermaidCode) return;
    navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDepthStyle = (depth: number) => {
    switch (depth) {
      case 0:
        return 'border-orange-500/40 bg-orange-500/10 text-orange-200 font-bold shadow-md shadow-orange-500/10 text-sm sm:text-base';
      case 1:
        return 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200 font-semibold text-xs sm:text-sm';
      case 2:
        return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 font-medium text-xs';
      default:
        return 'border-purple-500/40 bg-purple-500/10 text-purple-200 font-normal text-xs';
    }
  };

  const renderNode = (node: MindMapNode, depth: number = 0) => {
    return (
      <div key={node.id} className="relative flex flex-col space-y-2">
        <div className="flex items-center">
          <div
            className={`inline-flex max-w-xl items-center rounded-xl border px-3 py-1.5 transition-all hover:scale-[1.01] ${getDepthStyle(
              depth
            )}`}
          >
            {depth === 0 && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-orange-400 animate-pulse" />}
            {depth === 1 && <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-cyan-400" />}
            {depth === 2 && <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />}
            <span>{node.label}</span>
          </div>
        </div>

        {node.children.length > 0 && (
          <div className="relative ml-4 space-y-3 border-l-2 border-border/80 pl-4 pt-1 sm:ml-6 sm:pl-6">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!mermaidCode && rootNodes.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 sm:p-6 space-y-4">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <GitBranch className="h-4 w-4 text-orange-500" />
          <span>Mapa Mental Interativo de Conceitos</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCode(!showCode)}
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition"
            title="Alternar entre visualização gráfica e sintaxe Mermaid"
          >
            <Code className="h-3.5 w-3.5" />
            <span>{showCode ? 'Ver Nós' : 'Sintaxe Mermaid'}</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition"
            title="Copiar código Mermaid para Obsidian ou Notion"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
        </div>
      </div>

      {/* Visual Content or Raw Code */}
      {showCode ? (
        <pre className="overflow-x-auto rounded-xl bg-zinc-950 p-4 font-mono text-xs text-zinc-300 leading-relaxed border border-border">
          {mermaidCode}
        </pre>
      ) : (
        <div className="overflow-x-auto py-2">
          <div className="min-w-[280px] space-y-4">
            {rootNodes.length > 0 ? (
              rootNodes.map((root) => renderNode(root, 0))
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-xs text-orange-200">
                <span className="h-2 w-2 rounded-full bg-orange-400" />
                <span className="font-semibold">{title || 'Conceitos Chave do Dia'}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
