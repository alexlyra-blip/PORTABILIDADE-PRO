"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState({ 
    name: 'Usuário', 
    role: 'corretor', 
    brand_color: '', 
    sidebar_color: '', 
    sidebar_color_secondary: '', 
    logo_url: '', 
    avatar_url: '' 
  });
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const loadUser = () => {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    };
    loadUser();
    window.addEventListener('user-updated', loadUser);
    return () => window.removeEventListener('user-updated', loadUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const getStaticUrl = (path: string | null) => {
    if (!path || path === "null" || path === "undefined") return null;
    if (path.startsWith('http')) return path;
    if (path.startsWith('data:image')) return path;
    if (path.startsWith('/uploads')) return path;
    return `/uploads${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const menuItems = [
    { name: "Painel Geral", href: "/admin", icon: "📊", roles: ['admin'] },
    { name: "Bancos", href: "/admin/banks", icon: "🏦", roles: ['admin'] },
    { name: "Regras", href: "/admin/rules", icon: "⚖️", roles: ['admin'] },
    { name: "Tabelas", href: "/admin/tables", icon: "📋", roles: ['admin'] },
    { name: "Coeficientes", href: "/admin/coefficients", icon: "🔢", roles: ['admin'] },
    { name: "Logos Secundários", href: "/admin/logos", icon: "🖼️", roles: ['admin'] },
    { name: "Usuários", href: "/admin/users", icon: "👥", roles: ['admin', 'promotora'] },
    { name: "Regra Bancos", href: "/admin/promotora-rules", icon: "⚙️", roles: ['promotora'] },
  ].filter(item => item.roles.includes(user.role));

  const profileImageUrl = getStaticUrl(user.logo_url || user.avatar_url);

  const proColor = (() => {
    const bgColor = user.sidebar_color || '#0f172a';
    let hex = bgColor.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length !== 6) return '#3b82f6';
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const dist = Math.sqrt(Math.pow(r - 59, 2) + Math.pow(g - 130, 2) + Math.pow(b - 246, 2));
    return dist < 120 ? '#22d3ee' : '#3b82f6';
  })();

  return (
    <aside 
      className="fixed left-0 top-0 flex h-screen w-64 flex-col text-white shadow-xl z-50 transition-all border-r border-white/5"
      style={{ 
         background: user.sidebar_color_secondary 
           ? `linear-gradient(135deg, ${user.sidebar_color || '#0f172a'}, ${user.sidebar_color_secondary})` 
           : (user.sidebar_color || '#0f172a')
      }}
    >
      {/* Header: Centered Avatar + Branding Row */}
      <div className="p-8 pb-6 border-b border-white/5 flex flex-col items-center">
        <motion.div 
          className="mb-5 relative"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-white/30 shadow-[0_0_40px_rgba(0,0,0,0.5)] bg-slate-800 relative z-10 transition-transform hover:scale-105">
            {(profileImageUrl && !imgError) ? (
              <img 
                src={profileImageUrl} 
                className="w-full h-full object-cover" 
                alt="Admin Profile" 
                onError={() => setImgError(true)}
                fetchPriority="high"
                loading="eager"
                decoding="async"
              />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center font-black text-6xl text-white shadow-inner"
                style={{ backgroundColor: user.brand_color || '#3b82f6' }}
              >
                {user.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div 
             className="absolute inset-0 rounded-xl blur-3xl opacity-30 animate-pulse scale-150 pointer-events-none"
             style={{ backgroundColor: user.brand_color || '#3b82f6' }}
          ></div>
        </motion.div>

        {/* Username Banner */}
        <div className="mb-4 text-center flex flex-col items-center w-full">
            <p className="text-[11px] font-black uppercase text-blue-400 tracking-wider opacity-80 mb-0.5 text-center">Acesso AdminMaster</p>
            <h2 className="text-base font-black text-white truncate max-w-[180px] drop-shadow-md text-center mx-auto">{user.name}</h2>
        </div>

        <div className="flex items-center gap-1.5 mt-2 group cursor-pointer text-center relative z-20">
           <div 
             className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-base text-white shadow-lg border border-white/30 pointer-events-none"
             style={{ backgroundColor: user.brand_color || '#3b82f6' }}
           >
             P
           </div>
           <span className="text-xl font-black tracking-tighter drop-shadow-lg text-white">
             Portabilidade<span className="pointer-events-none" style={{ color: proColor }}>PRO</span>
           </span>
        </div>
        <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black mt-2 italic text-center">Painel Administrativo</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto scrollbar-hide relative z-20">
        <Link
          href="/simulador"
          className="flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-300 group mb-6 relative overflow-hidden shadow-2xl border-2 cursor-pointer border-transparent text-white/90 hover:scale-105 hover:bg-white/10"
          style={{ 
              backgroundColor: user.brand_color || '#3b82f6',
              backgroundImage: `linear-gradient(45deg, ${user.brand_color || '#3b82f6'} 0%, #172554 100%)`,
              boxShadow: `0 15px 20px -5px color-mix(in srgb, ${user.brand_color || '#3b82f6'} 30%, transparent)`
          }}
        >
          <div className="absolute inset-0 bg-white/10 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <span className="text-3xl transition-transform group-hover:scale-125 drop-shadow-md pointer-events-none">🚀</span>
          <span className="font-black text-base uppercase tracking-[0.2em] pointer-events-none">Acessar Simulador</span>
          <div className="ml-auto opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all text-base pointer-events-none">✨</div>
        </Link>

        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer ${
                isActive ? "text-white shadow-lg" : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
              style={ isActive ? { backgroundColor: user.brand_color || '#2563eb' } : {} }
            >
              <span className={`text-2xl transition-transform group-hover:scale-110 pointer-events-none ${isActive ? "" : "opacity-70"}`}>{item.icon}</span>
              <span className="font-black text-xs uppercase tracking-[0.2em] pointer-events-none">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-white/5 bg-black/30 relative z-20">

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-3 bg-red-600/10 hover:bg-red-600 text-white/60 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-red-500/20 cursor-pointer"
        >
          <span className="text-xl pointer-events-none">🏃</span>
          <span className="pointer-events-none">Encerrar Sessão</span>
        </button>
      </div>
    </aside>
  );
}
