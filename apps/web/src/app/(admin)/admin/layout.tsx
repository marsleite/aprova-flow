import { ReactNode } from 'react';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';
import { AdminSidebar } from '@/components/admin/AdminNavigation';

export const metadata = {
  title: 'AprovaMind | Cockpit Admin & Observabilidade',
  description: 'Área executiva de métricas, finanças de IA, usuários e telemetria de produção.',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-[#07090E] flex text-zinc-100 antialiased selection:bg-cyan-500/30 selection:text-white">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {children}
        </div>
      </div>
    </AdminAuthGuard>
  );
}
