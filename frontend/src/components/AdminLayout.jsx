import React from 'react';
import Link from 'next/link';

const AdminLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex">
      {/* Sidebar */}
      {/* Sidebar - Agora com o mesmo padrão visual do Simulador */}
      <aside className="w-72 bg-slate-900 border-r border-white/5 flex flex-col relative z-20 shadow-2xl overflow-hidden"
        style={{ 
          backgroundImage: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' 
        }}
      >
        {/* Header: Centered Avatar (Large as requested) */}
        <div className="p-8 pb-6 border-b border-white/5 flex flex-col items-center">
          <div className="mb-5 relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/30 shadow-[0_0_30px_rgba(0,0,0,0.4)] bg-slate-800 relative z-10">
              <div className="w-full h-full flex items-center justify-center font-black text-5xl text-white shadow-inner bg-blue-600">
                A
              </div>
            </div>
            <div className="absolute inset-0 rounded-2xl blur-3xl opacity-30 animate-pulse scale-150 pointer-events-none bg-blue-600"></div>
          </div>
          <div className="mb-4 text-center flex flex-col items-center w-full">
            <p className="text-[11px] font-black uppercase text-blue-400 tracking-wider opacity-80 mb-0.5">Módulo Gestão</p>
            <h2 className="text-base font-black text-white truncate max-w-[180px] drop-shadow-md uppercase">Painel Admin</h2>
          </div>
        </div>

        {/* Navigation - Same compact style as Simulator */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="px-4 text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-3 italic">Configurações Base</p>
          
          <Link href="/admin" className="flex items-center gap-4 px-4 py-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all group">
            <span className="text-lg opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform">📊</span>
            <span className="font-bold text-xs tracking-tight">Painel Geral</span>
          </Link>
          
          <Link href="/admin/banks" className="flex items-center gap-4 px-4 py-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all group">
            <span className="text-lg opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform">🏦</span>
            <span className="font-bold text-xs tracking-tight">Bancos</span>
          </Link>
          
          <Link href="/admin/rules" className="flex items-center gap-4 px-4 py-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all group">
            <span className="text-lg opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform">⚖️</span>
            <span className="font-bold text-xs tracking-tight">Regras</span>
          </Link>
          
          <Link href="/admin/tables" className="flex items-center gap-4 px-4 py-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all group">
            <span className="text-lg opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform">📋</span>
            <span className="font-bold text-xs tracking-tight">Tabelas</span>
          </Link>
          
          <Link href="/admin/coefficients" className="flex items-center gap-4 px-4 py-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all group">
            <span className="text-lg opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform">🔢</span>
            <span className="font-bold text-xs tracking-tight">Coeficientes</span>
          </Link>
          
          <Link href="/admin/users" className="flex items-center gap-4 px-4 py-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all group">
            <span className="text-lg opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform">👥</span>
            <span className="font-bold text-xs tracking-tight">Usuários</span>
          </Link>

          <div className="pt-6 mt-6 border-t border-white/5">
            <Link href="/simulador" className="flex items-center justify-center gap-2 w-full py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-blue-500/20 shadow-lg">
              <span>⚡</span>
              <span>Ir para Simulador</span>
            </Link>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-8">
          <div className="text-slate-400">Manage your simulation system configuration</div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-white">Administrador</span>
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white shadow-lg">A</div>
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
