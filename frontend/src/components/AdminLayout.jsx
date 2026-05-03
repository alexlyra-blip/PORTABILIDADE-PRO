import React from 'react';
import Link from 'next/link';

const AdminLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Admin Panel
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <Link href="/admin" className="block p-2.5 rounded-lg hover:bg-slate-700 transition-colors">
            Painel Geral
          </Link>
          <Link href="/admin/banks" className="block p-2.5 rounded-lg hover:bg-slate-700 transition-colors">
            Bancos
          </Link>
          <Link href="/admin/rules" className="block p-2.5 rounded-lg hover:bg-slate-700 transition-colors">
            Regras
          </Link>
          <Link href="/admin/tables" className="block p-2.5 rounded-lg hover:bg-slate-700 transition-colors">
            Tabelas
          </Link>
          <Link href="/admin/coefficients" className="block p-2.5 rounded-lg hover:bg-slate-700 transition-colors">
            Coeficientes
          </Link>
          <Link href="/admin/users" className="block p-2.5 rounded-lg hover:bg-slate-700 transition-colors">
            Usuários
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-700">
          <Link href="/simulador" className="block p-2.5 text-center rounded-lg bg-blue-600 hover:bg-blue-500 transition-all font-semibold">
            Ir para Simulador
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-8">
          <div className="text-slate-400">Manage your simulation system configuration</div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Administrador</span>
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold">A</div>
          </div>
        </header>
        <div className="p-8 flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
