"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// Ícones SVG nativos para evitar dependências externas (Zero Dependency)
const Icons = {
  LayoutDashboard: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
  ),
  Landmark: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="22" y2="22" /><line x1="6" x2="6" y1="18" y2="11" /><line x1="10" x2="10" y1="18" y2="11" /><line x1="14" x2="14" y1="18" y2="11" /><line x1="18" x2="18" y1="18" y2="11" /><polygon points="12 2 20 7 4 7 12 2" /></svg>
  ),
  Scale: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="M7 21h10" /><path d="M12 3v18" /><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" /></svg>
  ),
  ClipboardList: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></svg>
  ),
  Percent: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" x2="5" y1="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg>
  ),
  Image: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
  ),
  Users: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="19" cy="11" r="3" /></svg>
  ),
  Settings: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.72v.18a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
  ),
  Rocket: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.5-1 1-4c1.5 0 3 .5 3 .5L12 15Z" /><path d="M15 9h5s1 .5 4 1c0 1.5-.5 3-.5 3L15 9Z" /></svg>
  ),
  LogOut: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
  ),
  Sparkles: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z" /><path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" /></svg>
  )
};

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
    { name: "Painel Geral", href: "/admin", icon: <Icons.LayoutDashboard />, roles: ['admin'] },
    { name: "Bancos", href: "/admin/banks", icon: <Icons.Landmark />, roles: ['admin'] },
    { name: "Regras", href: "/admin/rules", icon: <Icons.Scale />, roles: ['admin'] },
    { name: "Tabelas", href: "/admin/tables", icon: <Icons.ClipboardList />, roles: ['admin'] },
    { name: "Coeficientes", href: "/admin/coefficients", icon: <Icons.Percent />, roles: ['admin'] },
    { name: "Logos Secundários", href: "/admin/logos", icon: <Icons.Image />, roles: ['admin'] },
    { name: "Usuários", href: "/admin/users", icon: <Icons.Users />, roles: ['admin', 'promotora'] },
    { name: "Regra Bancos", href: "/admin/promotora-rules", icon: <Icons.Settings />, roles: ['promotora'] },
  ].filter(item => item.roles.includes(user.role));

  const profileImageUrl = getStaticUrl(user.logo_url || user.avatar_url);



  return (
    <aside 
      className="fixed left-0 top-0 flex h-screen w-64 flex-col text-white shadow-xl z-50 transition-all border-r border-white/5"
      style={{ 
         backgroundColor: user.sidebar_color || '#0f172a'
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
             Portabilidade<span className="pointer-events-none uppercase" style={{ color: user.brand_color || '#3b82f6' }}>PRO</span>
           </span>
        </div>
        <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] font-black mt-2 italic text-center">Painel Administrativo</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto scrollbar-hide relative z-20">
        <Link
          href="/simulador"
          className="flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-300 group mb-6 relative overflow-hidden shadow-2xl border-2 cursor-pointer border-transparent text-white/90 hover:scale-105 hover:bg-white/10"
          style={{ 
              backgroundColor: user.sidebar_color_secondary || user.brand_color || '#3b82f6',
              backgroundImage: `linear-gradient(45deg, ${user.sidebar_color_secondary || user.brand_color || '#3b82f6'} 0%, #172554 100%)`,
              boxShadow: `0 15px 20px -5px color-mix(in srgb, ${user.sidebar_color_secondary || user.brand_color || '#3b82f6'} 30%, transparent)`
          }}
        >
          <div className="absolute inset-0 bg-white/10 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <span className="transition-transform group-hover:scale-125 drop-shadow-md pointer-events-none"><Icons.Rocket size={32} /></span>
          <span className="font-black text-base uppercase tracking-[0.2em] pointer-events-none">Acessar Simulador</span>
          <div className="ml-auto opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all text-base pointer-events-none"><Icons.Sparkles size={20} /></div>
        </Link>

        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group cursor-pointer relative overflow-hidden ${
                isActive 
                  ? "text-white shadow-[0_10px_20px_-5px_rgba(0,0,0,0.3)] scale-[1.02]" 
                  : "text-white/50 hover:text-white hover:bg-white/5 hover:translate-x-1"
              }`}
              style={ isActive ? { 
                backgroundColor: user.sidebar_color_secondary || user.brand_color || '#2563eb',
                backgroundImage: `linear-gradient(135deg, ${user.sidebar_color_secondary || user.brand_color || '#2563eb'} 0%, color-mix(in srgb, ${user.sidebar_color_secondary || user.brand_color || '#2563eb'} 70%, black) 100%)`
              } : {} }
            >
              {isActive && (
                <motion.div 
                  layoutId="activeTabAdmin"
                  className="absolute inset-0 bg-white/10"
                  initial={false}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className={`transition-transform group-hover:scale-110 pointer-events-none relative z-10 ${isActive ? "drop-shadow-md text-white scale-110" : "opacity-70 group-hover:opacity-100"}`}>{item.icon}</span>
              <span className="font-black text-[11px] uppercase tracking-wider pointer-events-none relative z-10">
                {item.name}
              </span>
              {isActive && <motion.div layoutId="activeIndicatorAdmin" className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_#fff] relative z-10" />}
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
          <span className="pointer-events-none"><Icons.LogOut size={16} /></span>
          <span className="pointer-events-none">Encerrar Sessão</span>
        </button>
      </div>
    </aside>
  );
}
