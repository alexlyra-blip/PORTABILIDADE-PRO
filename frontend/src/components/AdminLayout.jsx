import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import { Icons } from "@/components/Icons";


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
        </div>        {/* Navigation - Premium Buttons */}
        <nav className="flex-1 p-4 space-y-3 overflow-y-auto scrollbar-hide">
          {/* Botões de Destaque (Versão Premium) */}
          <Link href="/simulador" prefetch={false} className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 group mb-2 relative overflow-hidden shadow-xl border border-slate-100 dark:border-white/10 bg-white dark:bg-slate-900`} style={{
            backgroundImage: `linear-gradient(45deg, #3b82f6 0%, #172554 100%)`,
            boxShadow: `0 8px 12px -4px rgba(59,130,246,0.4)`
          }}>
            <span className="group-hover:scale-125 transition-transform"><Icons.Calculator size={20} /></span>
            <span className="font-black text-[10px] text-slate-800 dark:text-white uppercase tracking-[0.1em]">Simulador</span>
          </Link>

          <Link href="/admin" prefetch={false} className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 group mb-2 relative overflow-hidden shadow-xl border border-slate-100 dark:border-white/10 bg-white dark:bg-slate-900`} style={{
            backgroundImage: `linear-gradient(45deg, #2563eb 0%, #1e3a8a 100%)`,
            boxShadow: `0 8px 12px -4px rgba(37,99,235,0.4)`
          }}>
            <span className="group-hover:scale-125 transition-transform"><Icons.LayoutDashboard size={20} /></span>
            <span className="font-black text-[10px] text-slate-800 dark:text-white uppercase tracking-[0.1em]">Dashboard</span>
          </Link>

          <p className="px-3 text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-2 italic">Configurações</p>

          <Link href="/admin/banks" prefetch={false} className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 group mb-2 relative overflow-hidden shadow-xl border border-slate-100 dark:border-white/10 bg-white dark:bg-slate-900`} style={{
            backgroundImage: `linear-gradient(45deg, #10b981 0%, #064e3b 100%)`
          }}>
            <span className="group-hover:scale-125 transition-transform"><Icons.Landmark size={20} /></span>
            <span className="font-bold text-[9px] tracking-tight uppercase text-slate-800 dark:text-white">BANCOS</span>
          </Link>

          <Link href="/admin/rules" prefetch={false} className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 group mb-2 relative overflow-hidden shadow-xl border border-slate-100 dark:border-white/10 bg-white dark:bg-slate-900`} style={{
            backgroundImage: `linear-gradient(45deg, #22d3ee 0%, #0c4a6e 100%)`
          }}>
            <span className="group-hover:scale-125 transition-transform"><Icons.Scale size={20} /></span>
            <span className="font-bold text-[9px] tracking-tight uppercase text-slate-800 dark:text-white">REGRAS</span>
          </Link>

          <Link href="/admin/tables" prefetch={false} className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 group mb-2 relative overflow-hidden shadow-xl border border-slate-100 dark:border-white/10 bg-white dark:bg-slate-900`} style={{
            backgroundImage: `linear-gradient(45deg, #8b5cf6 0%, #4c1d95 100%)`
          }}>
            <span className="group-hover:scale-125 transition-transform"><Icons.ClipboardList size={20} /></span>
            <span className="font-bold text-[9px] tracking-tight uppercase text-slate-800 dark:text-white">TABELAS</span>
          </Link>

          <Link href="/admin/coefficients" prefetch={false} className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 group mb-2 relative overflow-hidden shadow-xl border border-slate-100 dark:border-white/10 bg-white dark:bg-slate-900`} style={{
            backgroundImage: `linear-gradient(45deg, #f59e0b 0%, #7c2d12 100%)`
          }}>
            <span className="group-hover:scale-125 transition-transform"><Icons.Percent size={20} /></span>
            <span className="font-bold text-[9px] tracking-tight uppercase text-slate-800 dark:text-white">COEFICIENTES</span>
          </Link>

          <Link href="/admin/users" prefetch={false} className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 group mb-2 relative overflow-hidden shadow-xl border border-slate-100 dark:border-white/10 bg-white dark:bg-slate-900`} style={{
            backgroundImage: `linear-gradient(45deg, #f43f5e 0%, #7f1d1d 100%)`
          }}>
            <span className="group-hover:scale-125 transition-transform"><Icons.Users size={20} /></span>
            <span className="font-bold text-[9px] tracking-tight uppercase text-slate-800 dark:text-white">USUÁRIOS</span>
          </Link>
        </nav>

        {/* Footer: Botão Sair Idêntico à Imagem 1 */}
        <div className="p-4 border-t border-white/5 bg-black/30 relative z-20 text-center">
          <Link href="/login" prefetch={false} className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-600/10 hover:bg-red-600 text-white/60 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/20">
            <span><Icons.LogOut /></span>
            <span>Encerrar Sessão</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">

        <header className="h-16 bg-white dark:bg-slate-900 bg-opacity-70 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Icons.LayoutDashboard size={24} className="text-slate-800 dark:text-white" />
            <h1 className="text-xl font-black text-slate-900 dark:text-white">Painel Administrativo</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-800 dark:text-white">{user.name}</span>
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden border border-white/30 shadow-lg">
              {profileImageUrl ? (
                <img src={profileImageUrl} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <span className="text-lg font-black text-slate-800 dark:text-white">{user.name?.charAt(0).toUpperCase()}</span>
              )}
            </div>
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
