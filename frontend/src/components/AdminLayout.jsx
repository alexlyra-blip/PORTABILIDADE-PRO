import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

// Ícones SVG nativos para evitar dependências externas (Zero Dependency)
const Icons = {
  Calculator: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><line x1="16" x2="16" y1="14" y2="18" /><path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" /><path d="M12 14h.01" /><path d="M8 14h.01" /><path d="M12 18h.01" /><path d="M8 18h.01" /></svg>
  ),
  LayoutDashboard: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
  ),
  Landmark: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="22" y2="22" /><line x1="6" x2="6" y1="18" y2="11" /><line x1="10" x2="10" y1="18" y2="11" /><line x1="14" x2="14" y1="18" y2="11" /><line x1="18" x2="18" y1="18" y2="11" /><polygon points="12 2 20 7 4 7 12 2" /></svg>
  ),
  Scale: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="M7 21h10" /><path d="M12 3v18" /><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" /></svg>
  ),
  ClipboardList: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></svg>
  ),
  Percent: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" x2="5" y1="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg>
  ),
  Users: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="19" cy="11" r="3" /></svg>
  ),
  LogOut: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
  )
};

const AdminLayout = ({ children }) => {
  const [user, setUser] = useState({ name: 'Administrador', logo_url: '', avatar_url: '' });

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const getStaticUrl = (path) => {
    if (!path || path === "null") return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `http://localhost:8000${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const profileImageUrl = getStaticUrl(user.logo_url || user.avatar_url);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-72 border-r border-white/5 flex flex-col relative z-20 shadow-2xl overflow-hidden"
        style={{ 
          background: user.sidebar_color_secondary
            ? `linear-gradient(135deg, ${user.sidebar_color || '#0f172a'}, ${user.sidebar_color_secondary})`
            : (user.sidebar_color || '#0f172a')
        }}
      >
        {/* Header: Centered Avatar (Padronizado com Simulador) */}
        <div className="p-8 pb-6 border-b border-white/5 flex flex-col items-center">
          <motion.div 
            className="mb-5 relative"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-white/30 shadow-[0_0_40px_rgba(0,0,0,0.5)] bg-slate-800 relative z-10 transition-transform hover:scale-105">
              {profileImageUrl ? (
                <img src={profileImageUrl} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-6xl text-white shadow-inner" style={{ backgroundColor: user.brand_color || '#3b82f6' }}>
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {/* Pulsing Glow */}
            <div className="absolute inset-0 rounded-xl blur-3xl opacity-30 animate-pulse scale-150 pointer-events-none" style={{ backgroundColor: user.brand_color || '#3b82f6' }}></div>
          </motion.div>

          <div className="mb-4 text-center flex flex-col items-center w-full">
            <p className="text-[11px] font-black uppercase text-blue-400 tracking-wider opacity-80 mb-0.5">Acesso Master</p>
            <h2 className="text-base font-black text-white truncate max-w-[180px] drop-shadow-md uppercase">{user.name}</h2>
          </div>

          {/* Branding Row */}
          <div className="flex items-center justify-center gap-1.5 mt-2 text-center relative z-20">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-base text-white shadow-lg border border-white/30" style={{ backgroundColor: user.brand_color || '#3b82f6' }}>P</div>
            <span className="text-xl font-black tracking-tighter drop-shadow-lg text-white">
              Portabilidade<span style={{ color: user.brand_color || '#3b82f6' }}>PRO</span>
            </span>
          </div>
          <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black mt-2 italic text-center uppercase">Painel Administrativo</p>
        </div>

        {/* Navigation - Padrão de Botões ULTRA REDUZIDOS */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          
          {/* Botões de Destaque (Versão Compacta) */}
          <Link href="/simulador" className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 group mb-2 relative overflow-hidden shadow-2xl border-2 border-white/30"
            style={{
              backgroundColor: '#2563eb',
              backgroundImage: `linear-gradient(45deg, #3b82f6 0%, #172554 100%)`,
              boxShadow: `0 4px 8px -2px rgba(37, 99, 235, 0.3)`
            }}
          >
            <span className="group-hover:scale-125 transition-transform"><Icons.Calculator /></span>
            <span className="font-black text-[9px] text-white uppercase tracking-[0.1em]">Simulador</span>
          </Link>

          <Link href="/admin" className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 group mb-3 relative overflow-hidden shadow-2xl border-2 border-white/10"
            style={{
              backgroundColor: '#2563eb',
              backgroundImage: `linear-gradient(45deg, #2563eb 0%, #1e3a8a 100%)`,
              boxShadow: `0 4px 8px -2px rgba(37, 99, 235, 0.2)`
            }}
          >
            <span className="group-hover:scale-125 transition-transform"><Icons.LayoutDashboard /></span>
            <span className="font-black text-[9px] text-white uppercase tracking-[0.1em]">Dashboard</span>
          </Link>

          <p className="px-3 text-[7px] font-black text-white/20 uppercase tracking-[0.2em] mb-1 italic mt-2">Configurações</p>
          
          <Link href="/admin/banks" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all group">
            <span className="opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-transform"><Icons.Landmark /></span>
            <span className="font-bold text-[9px] tracking-tight uppercase mt-0.5">BANCOS</span>
          </Link>
          
          <Link href="/admin/rules" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all group">
            <span className="opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-transform"><Icons.Scale /></span>
            <span className="font-bold text-[9px] tracking-tight uppercase mt-0.5">REGRAS</span>
          </Link>
          
          <Link href="/admin/tables" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all group">
            <span className="opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-transform"><Icons.ClipboardList /></span>
            <span className="font-bold text-[9px] tracking-tight uppercase mt-0.5">TABELAS</span>
          </Link>
          
          <Link href="/admin/coefficients" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all group">
            <span className="opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-transform"><Icons.Percent /></span>
            <span className="font-bold text-[9px] tracking-tight uppercase mt-0.5">COEFICIENTES</span>
          </Link>
          
          <Link href="/admin/users" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all group">
            <span className="opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-transform"><Icons.Users /></span>
            <span className="font-bold text-[9px] tracking-tight uppercase mt-0.5">USUÁRIOS</span>
          </Link>
        </nav>

        {/* Footer: Botão Sair Idêntico à Imagem 1 */}
        <div className="p-4 border-t border-white/5 bg-black/30 relative z-20 text-center">
          <Link href="/login" className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-600/10 hover:bg-red-600 text-white/60 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/20">
            <span><Icons.LogOut /></span>
            <span>Encerrar Sessão</span>
          </Link>
        </div>
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
        <div className="p-6 flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
