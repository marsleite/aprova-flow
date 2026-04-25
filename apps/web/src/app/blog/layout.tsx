import Link from 'next/link';
import { Zap, ChevronRight } from 'lucide-react';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Nav */}
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-primary" />
            <span className="font-medium tracking-tight text-foreground text-base">
              Aprova<span className="text-muted-foreground">Mind</span>
            </span>
          </Link>
          <Link
            href="/login"
            className="px-5 py-2.5 text-primary-foreground text-xs font-semibold uppercase tracking-widest bg-primary hover:opacity-90 transition-opacity rounded-sm flex items-center gap-1.5"
          >
            Começar grátis
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </nav>

      {children}

      {/* Footer */}
      <footer className="border-t border-border py-10 bg-background">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <Link href="/" className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">AprovaMind</span>
          </Link>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Início</Link>
            <Link href="/#parse-edital" className="hover:text-foreground transition-colors">Analisar Edital</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
