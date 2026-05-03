"use client";

import Link from "next/link";
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from "framer-motion";

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
    { name: "Nova Simulação", href: "/simulador", icon: "✨", roles: ['admin', 'promotora', 'corretor', 'vendedor'] },
    { name: "Ofertas", href: "/ofertas", icon: "🏆", roles: ['admin', 'promotora', 'corretor', 'vendedor'] },
    { name: "Painel Geral", href: "/dashboard", icon: "📊" },
    { name: "Meus Contratos", href: "/meus-contratos", icon: "📄", roles: ['admin', 'promotora', 'corretor', 'vendedor'] },
    { name: "Relatórios", href: "/relatorio", icon: "📈", roles: ['admin', 'promotora', 'corretor', 'vendedor'] },
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
      <div className="p-4 pb-3 border-b border-white/5 flex flex-col items-center">
        {/* Avatar Area */}
        <motion.div
          className="mb-3 relative"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/30 shadow-[0_0_30px_rgba(0,0,0,0.4)] bg-slate-800 relative z-10 transition-transform hover:scale-105">
            {(profileImageUrl && !imgError) ? (
              <img
                src={profileImageUrl}
                className="w-full h-full object-cover"
                alt="Profile"
                onError={() => setImgError(true)}
                fetchPriority="high"
                loading="eager"
                decoding="async"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center font-black text-3xl text-white shadow-inner"
                style={{ backgroundColor: user.brand_color || '#3b82f6' }}
              >
                {user.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {/* Pulsing Glow */}
          <div
            className="absolute inset-0 rounded-2xl blur-3xl opacity-30 animate-pulse scale-150 pointer-events-none"
            style={{ backgroundColor: user.brand_color || '#3b82f6' }}
          ></div>
        </motion.div>

        {/* Username Banner */}
        <div className="mb-2 text-center flex flex-col items-center w-full">
          <p className="text-[9px] font-black uppercase text-blue-400 tracking-wider opacity-80 mb-0.5 text-center">Bem-vindo(a)</p>
          <h2 className="text-xs font-black text-white truncate max-w-[180px] drop-shadow-md text-center mx-auto">{user.name}</h2>
        </div>

        {/* Branding Row */}
        <div className="flex items-center justify-center gap-1 mt-1 group cursor-pointer text-center relative z-20">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs text-white shadow-lg border border-white/30 pointer-events-none"
            style={{ backgroundColor: user.brand_color || '#3b82f6' }}
          >
            P
          </div>
          <span className="text-base font-black tracking-tighter drop-shadow-lg text-white">
            Portabilidade<span className="pointer-events-none" style={{ color: proColor }}>PRO</span>
          </span>
        </div>
        <p className="text-[8px] text-white/30 uppercase tracking-[0.2em] font-black mt-1 italic text-center">Simulador Inteligente</p>
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
                <span className="text-xl transition-transform group-hover:scale-125 drop-shadow-md pointer-events-none">{item.icon}</span>
                <span className="font-black text-[11px] uppercase tracking-[0.2em] pointer-events-none">{item.name}</span>
                <div className="ml-auto opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all text-sm pointer-events-none">🚀</div>
              </Link>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-1.5 rounded-xl transition-all duration-200 group cursor-pointer ${isActive ? "text-white shadow-lg" : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              style={isActive ? { backgroundColor: user.brand_color || '#2563eb' } : {}}
            >
              <span className={`text-lg transition-transform group-hover:scale-110 pointer-events-none ${isActive ? "" : "opacity-70"}`}>{item.icon}</span>
              <span className="font-bold text-xs tracking-tight pointer-events-none">{item.name}</span>
            </Link>
          );
        })}

        {(user.role === 'admin' || user.role === 'promotora') && (
          <div className="pt-6 mt-6 border-t border-white/5 space-y-1">
            <p className="px-4 text-xs font-black text-white/20 uppercase tracking-[0.3em] mb-3 italic">Área Administrativa</p>
            {user.role === 'admin' && (
              <Link href="/admin" className="flex items-center gap-4 px-4 py-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all group cursor-pointer">
                <span className="text-lg opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform pointer-events-none">📊</span>
                <span className="font-bold text-xs tracking-tight pointer-events-none">Painel Admin</span>
              </Link>
            )}
            <Link href="/admin/users" className="flex items-center gap-4 px-4 py-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all group cursor-pointer">
              <span className="text-lg opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform pointer-events-none">👥</span>
              <span className="font-bold text-xs tracking-tight pointer-events-none">{user.role === 'promotora' ? 'Usuários' : 'Gestão Usuários'}</span>
            </Link>
            {user.role === 'promotora' && (
              <Link href="/admin/promotora-rules" className="flex items-center gap-4 px-4 py-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all group cursor-pointer">
                <span className="text-lg opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform pointer-events-none">⚙️</span>
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
          <span className="text-lg pointer-events-none">🏃</span>
          <span className="pointer-events-none">Encerrar Sessão</span>
        </button>
      </div>
    </aside>
  );
}
