"use client";

import { useEffect, useState } from "react";

export default function Header() {
  const [user, setUser] = useState({ name: "Administrador", role: "admin", avatar_url: "", logo_url: "", brand_color: "" });

  useEffect(() => {
    const loadUser = () => {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    };
    loadUser();
    window.addEventListener('user-updated', loadUser);
    return () => window.removeEventListener('user-updated', loadUser);
  }, []);

  const getStaticUrl = (path: string | null) => {
    if (!path || path === "null" || path === "undefined") return null;
    if (path.startsWith('http')) return path;
    if (path.startsWith('data:image')) return path;
    if (path.startsWith('/uploads')) return path;
    return `/uploads${path.startsWith('/') ? '' : '/'}${path}`;
  };

  return (
    <header className="h-20 bg-white border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 z-40 shadow-sm backdrop-blur-md bg-white/80">
      <div className="flex flex-col items-start gap-1">
        <h2 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] italic">Segurança & Governança</h2>
        <p className="text-slate-800 text-lg font-black tracking-tight leading-none">Painel Adm<span className="text-blue-600">inistrativo</span></p>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex flex-col items-end leading-none pr-4 border-r border-slate-100">
          <p className="text-sm font-black text-slate-800 tracking-tight">{user.name}</p>
          <p className="text-[9px] font-black uppercase tracking-tighter mt-1" style={{ color: user.brand_color || '#2563eb' }}>
             Sessão: {user.role === 'admin' ? 'ADMIN MASTER' : user.role.toUpperCase()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Avatar Container with rounded corners to match Sidebar */}
          <div className="w-11 h-11 rounded-xl bg-slate-50 border-2 border-slate-200 flex items-center justify-center overflow-hidden shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer group">
            {user.avatar_url || user.logo_url ? (
              <img 
                src={getStaticUrl(user.avatar_url || user.logo_url) || ''} 
                alt="Admin" 
                className="w-full h-full object-cover transition-transform group-hover:scale-110" 
              />
            ) : (
              <span className="text-sm font-black text-slate-400">{user.name?.[0]?.toUpperCase() || 'A'}</span>
            )}
          </div>
          
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-black border border-blue-100 shadow-sm hover:bg-blue-600 hover:text-white transition-colors cursor-help" title="Modo Administrativo Ativo">
            🛡️
          </div>
        </div>
      </div>
    </header>
  );
}
