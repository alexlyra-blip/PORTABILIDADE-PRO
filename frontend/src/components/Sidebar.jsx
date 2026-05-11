"use client";

import Link from "next/link";
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from "framer-motion";

// Ícones SVG nativos para evitar dependências externas (Zero Dependency)
const Icons = {
  Calculator: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><line x1="16" x2="16" y1="14" y2="18" /><path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" /><path d="M12 14h.01" /><path d="M8 14h.01" /><path d="M12 18h.01" /><path d="M8 18h.01" /></svg>
  ),
  Trophy: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
  ),
  LayoutDashboard: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
  ),
  FileText: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></svg>
  ),
  TrendingUp: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
  ),
  Settings2: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-9" /><path d="M14 17H5" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" /></svg>
  ),
  Users: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="19" cy="11" r="3" /></svg>
  ),
  SlidersHorizontal: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" x2="14" y1="4" y2="4" /><line x1="10" x2="3" y1="4" y2="4" /><line x1="21" x2="12" y1="12" y2="12" /><line x1="8" x2="3" y1="12" y2="12" /><line x1="21" x2="16" y1="20" y2="20" /><line x1="12" x2="3" y1="20" y2="20" /><line x1="14" x2="14" y1="2" y2="6" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="16" x2="16" y1="18" y2="22" /></svg>
  ),
  LogOut: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
  ),
  ChevronRight: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
  )
};

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState({
    role: 'corretor',
    name: 'Usuário',
    brand_color: '',
    sidebar_color: '',
    sidebar_color_secondary: '',
    logo_url: '',
    avatar_url: ''
  });
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const loadUser = () => {
      try {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);

          if (parsed.brand_color) {
            document.documentElement.style.setProperty('--color-blue-400', `color-mix(in srgb, ${parsed.brand_color} 75%, white)`);
            document.documentElement.style.setProperty('--color-blue-500', parsed.brand_color);
            document.documentElement.style.setProperty('--color-blue-600', `color-mix(in srgb, ${parsed.brand_color} 85%, black)`);
          }
        }
      } catch (e) {
        console.error("Erro ao carregar usuário:", e);
      }
    };

    loadUser();
    window.addEventListener('user-updated', loadUser);
    return () => window.removeEventListener('user-updated', loadUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getStaticUrl = (path) => {
    if (!path || path === "null" || path === "undefined") return null;
    if (path.startsWith('http')) return path;
    if (path.startsWith('data:image')) return path;
    const base = "http://localhost:8000";
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const menuItems = [
    { name: "Nova Simulação", href: "/simulador", icon: <Icons.Calculator />, roles: ['admin', 'promotora', 'corretor', 'vendedor'] },
    { name: "Ofertas", href: "/ofertas", icon: <Icons.Trophy />, roles: ['admin', 'promotora', 'corretor', 'vendedor'] },
    { name: "Simulações", href: "/dashboard", icon: <Icons.LayoutDashboard /> },
    { name: "Meus Contratos", href: "/meus-contratos", icon: <Icons.FileText />, roles: ['admin', 'promotora', 'corretor', 'vendedor'] },
    { name: "Relatórios", href: "/relatorio", icon: <Icons.TrendingUp />, roles: ['admin', 'promotora', 'corretor', 'vendedor'] },
  ].filter(item => !item.roles || item.roles.includes(user.role));

  const profileImageUrl = getStaticUrl(user.logo_url || user.avatar_url);

  const proColor = (() => {
    const bgColor = user.sidebar_color || '#0f172a';
    let hex = bgColor.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length !== 6) return '#3b82f6'; // Azul padrão (#3b82f6)
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Distância até o azul padrão rgb(59, 130, 246)
    const dist = Math.sqrt(Math.pow(r - 59, 2) + Math.pow(g - 130, 2) + Math.pow(b - 246, 2));

    // Se for muito próximo, joga um Ciano (#22d3ee) para não sumir, do contrário o Azul domina.
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
        {/* Avatar Area */}
        <motion.div
          className="mb-5 relative"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/30 shadow-[0_0_40px_rgba(0,0,0,0.5)] bg-slate-800 relative z-10 transition-transform hover:scale-105">
            {(profileImageUrl && !imgError) ? (
              <img
                src={profileImageUrl}
                className="w-full h-full object-cover"
                alt="Profile"
                style={{ backgroundColor: user.brand_color }}
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
          {/* Pulsing Glow */}
          <div
            className="absolute inset-0 rounded-full blur-3xl opacity-30 animate-pulse scale-150 pointer-events-none"
            style={{ backgroundColor: user.brand_color || '#3b82f6' }}
          ></div>
        </motion.div>

        {/* Username Banner */}
        <div className="mb-4 text-center flex flex-col items-center w-full">
          <p className="text-[11px] font-black uppercase text-blue-400 tracking-wider opacity-80 mb-0.5 text-center">Bem-vindo(a)</p>
          <h2 className="text-base font-black text-white truncate max-w-[180px] drop-shadow-md text-center mx-auto">{user.name}</h2>
        </div>

        {/* Branding Row */}
        <div className="flex items-center justify-center gap-1.5 mt-2 group cursor-pointer text-center relative z-20">
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
        <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black mt-2 italic text-center">Simulador Inteligente</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto scrollbar-hide relative z-20">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const isSimulacao = item.href === "/simulador";

          if (isSimulacao) {
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 group mt-4 relative overflow-hidden shadow-2xl border-2 cursor-pointer ${isActive
                    ? "border-white/40 opacity-100 scale-105"
                    : "border-transparent text-white/90 hover:scale-105 hover:bg-white/10"
                  }`}
                style={{
                  backgroundColor: user.brand_color || '#3b82f6',
                  backgroundImage: `linear-gradient(45deg, ${user.brand_color || '#3b82f6'} 0%, #172554 100%)`,
                  boxShadow: `0 15px 20px -5px color-mix(in srgb, ${user.brand_color || '#3b82f6'} 30%, transparent)`
                }}
              >
                {!isActive && <div className="absolute inset-0 bg-white/10 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>}
                <span className="transition-transform group-hover:scale-125 drop-shadow-md pointer-events-none text-white">{item.icon}</span>
                <span className="font-black text-[11px] uppercase tracking-[0.2em] pointer-events-none">{item.name}</span>
                <div className="ml-auto opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all text-sm pointer-events-none text-white"><Icons.ChevronRight size={16} /></div>
              </Link>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group cursor-pointer relative overflow-hidden ${isActive 
                ? "text-white shadow-[0_10px_20px_-5px_rgba(0,0,0,0.3)] scale-[1.02]" 
                : "text-white/50 hover:text-white hover:bg-white/5 hover:translate-x-1"
                }`}
              style={isActive ? { 
                backgroundColor: user.brand_color || '#2563eb',
                backgroundImage: `linear-gradient(135deg, ${user.brand_color || '#2563eb'} 0%, color-mix(in srgb, ${user.brand_color || '#2563eb'} 70%, black) 100%)`
              } : {}}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white/10"
                  initial={false}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className={`transition-transform group-hover:scale-110 pointer-events-none relative z-10 ${isActive ? "drop-shadow-md text-white" : "opacity-70 group-hover:opacity-100"}`}>
                {item.icon}
              </span>
              <span className={`font-black text-[11px] uppercase tracking-wider pointer-events-none relative z-10 ${isActive ? "" : ""}`}>
                {item.name}
              </span>
              {isActive && <motion.div layoutId="activeIndicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_#fff] relative z-10" />}
            </Link>
          );
        })}

        {(user.role === 'admin' || user.role === 'promotora') && (
          <div className="pt-6 mt-6 border-t border-white/5 space-y-1">
            <p className="px-4 text-xs font-black text-white/20 uppercase tracking-[0.3em] mb-3 italic">Área Administrativa</p>
            {user.role === 'admin' && (
              <Link href="/admin" className="flex items-center gap-4 px-4 py-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all group cursor-pointer">
                <span className="opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform pointer-events-none"><Icons.Settings2 size={16} /></span>
                <span className="font-bold text-xs tracking-tight pointer-events-none">Painel Admin</span>
              </Link>
            )}
            <Link href="/admin/users" className="flex items-center gap-4 px-4 py-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all group cursor-pointer">
              <span className="opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform pointer-events-none"><Icons.Users size={16} /></span>
              <span className="font-bold text-xs tracking-tight pointer-events-none">{user.role === 'promotora' ? 'Usuários' : 'Gestão Usuários'}</span>
            </Link>
            {user.role === 'promotora' && (
              <Link href="/admin/promotora-rules" className="flex items-center gap-4 px-4 py-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all group cursor-pointer">
                <span className="opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform pointer-events-none"><Icons.SlidersHorizontal size={16} /></span>
                <span className="font-bold text-xs tracking-tight pointer-events-none">Regra Bancos</span>
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* Footer: Logout Only */}
      <div className="p-4 border-t border-white/5 bg-black/30 relative z-20 text-center">
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-2 bg-red-600/10 hover:bg-red-600 text-white/60 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/20 cursor-pointer"
        >
          <span className="pointer-events-none"><Icons.LogOut size={16} /></span>
          <span className="pointer-events-none">Encerrar Sessão</span>
        </button>
      </div>
    </aside>
  );
}
