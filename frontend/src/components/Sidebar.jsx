"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from "framer-motion";
import { getStaticUrl } from "@/utils/api";

import { Icons } from "@/components/Icons";


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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);

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
    
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener('user-updated', loadUser);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };


  const menuItems = [
    { name: "Nova Simulação", href: "/simulador", icon: <Icons.Calculator />, roles: ['admin', 'promotora', 'corretor', 'vendedor'] },
    { name: "Ofertas", href: "/ofertas", icon: <Icons.Trophy />, roles: ['admin', 'promotora', 'corretor', 'vendedor'] },
    { name: "Consulta CPF", href: "/consultas/cpf", icon: <Icons.Search />, roles: ['admin', 'promotora', 'corretor', 'vendedor'] },
    { name: "Simulações", href: "/dashboard", icon: <Icons.LayoutDashboard /> },
    { name: "Meus Contratos", href: "/meus-contratos", icon: <Icons.FileText />, roles: ['admin', 'promotora', 'corretor', 'vendedor'] },
    { name: "Bancos e Regras", href: "/bancos", icon: <Icons.Landmark />, roles: ['admin', 'promotora', 'corretor', 'vendedor'] },
    { name: "Relatórios", href: "/relatorio", icon: <Icons.TrendingUp />, roles: ['admin', 'promotora', 'corretor', 'vendedor'] },
  ].filter(item => {
    if (item.roles && !item.roles.includes(user.role)) return false;
    return true;
  });

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
      className="fixed bottom-0 md:top-0 left-0 flex flex-row md:flex-col w-full md:w-72 h-16 md:h-screen text-white shadow-[0_-10px_40px_rgba(0,0,0,0.3)] md:shadow-xl z-50 transition-all md:border-r border-t md:border-t-0 border-white/10"
      style={{
        backgroundColor: user.sidebar_color || '#0f172a'
      }}
    >
      {/* Header: Centered Avatar + Branding Row */}
      <div className="hidden md:flex p-8 pb-6 border-b border-white/5 flex-col items-center">
        {/* Avatar Area */}
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
            className="absolute inset-0 rounded-xl blur-3xl opacity-30 animate-pulse scale-150 pointer-events-none"
            style={{ backgroundColor: user.brand_color || '#3b82f6' }}
          ></div>
        </motion.div>

        {/* Username Banner */}
        <div className="mb-4 text-center flex flex-col items-center w-full">
          <p className="text-[11px] font-black uppercase tracking-wider opacity-80 mb-0.5 text-center" style={{ color: user.highlight_color || user.brand_color || '#60a5fa' }}>Bem-vindo(a)</p>
          <h2 className="text-base font-black text-white break-words whitespace-normal leading-tight drop-shadow-md text-center mx-auto max-w-[200px]">{user.name}</h2>
        </div>

        {/* Branding Row */}
        <div className="flex items-center justify-center gap-1.5 mt-2 text-center relative z-20">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-base text-white shadow-lg border border-white/30"
            style={{ backgroundColor: user.brand_color || '#3b82f6' }}
          >
            P
          </div>
          <span className="text-xl font-black tracking-tighter drop-shadow-lg text-white">
            Portabilidade<span style={{ color: user.highlight_color || user.brand_color || '#3b82f6' }}>PRO</span>
          </span>
        </div>
        <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black mt-2 italic text-center uppercase">Simulador Inteligente</p>
      </div>

      {/* Mobile Navigation (Bottom Bar) */}
      <nav className="flex md:hidden flex-row w-full h-full justify-around items-center px-2 relative z-20">
        {menuItems.slice(0, 4).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-300 relative ${
                isActive ? "text-white scale-110" : "text-white/50 hover:text-white"
              }`}
            >
              {isActive && (
                <div 
                  className="absolute inset-0 rounded-xl bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                  style={{
                    backgroundColor: user.sidebar_color_secondary || user.brand_color || '#2563eb',
                    opacity: 0.9
                  }}
                />
              )}
              <span className={`relative z-10 transition-transform ${isActive ? "drop-shadow-md scale-110 mb-0.5" : "scale-100"}`}>
                {item.icon}
              </span>
              <span className={`relative z-10 text-[8px] font-black uppercase tracking-wider transition-all duration-300 ${isActive ? "opacity-100 h-auto mt-0.5" : "opacity-0 h-0 overflow-hidden"}`}>
                {item.name.split(' ')[0]}
              </span>
            </Link>
          );
        })}

        {/* Botão MAIS */}
        <div className="relative" ref={mobileMenuRef}>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-300 relative ${
              isMobileMenuOpen ? "text-white scale-110" : "text-white/50 hover:text-white"
            }`}
          >
            {isMobileMenuOpen && (
              <div className="absolute inset-0 rounded-xl bg-white/10" />
            )}
            <span className="relative z-10 transition-transform">
              <Icons.Menu />
            </span>
            <span className={`relative z-10 text-[8px] font-black uppercase tracking-wider transition-all duration-300 ${isMobileMenuOpen ? "opacity-100 h-auto mt-0.5" : "opacity-0 h-0 overflow-hidden"}`}>
              Mais
            </span>
          </button>

          {/* Popup Menu MAIS */}
          {isMobileMenuOpen && (
            <div 
              className="absolute bottom-16 right-0 mb-4 w-56 rounded-2xl shadow-2xl overflow-hidden border border-white/10 p-2 origin-bottom-right animate-in zoom-in-95 duration-200"
              style={{ backgroundColor: user.sidebar_color || '#0f172a' }}
            >
              {menuItems.slice(4).map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all text-sm font-bold"
                >
                  {item.icon}
                  {item.name}
                </Link>
              ))}
              
              {(user.role === 'admin' || user.role === 'promotora') && (
                <>
                  <div className="my-2 border-t border-white/10"></div>
                  <p className="px-2 py-1 text-[9px] font-black text-white/30 uppercase tracking-widest">Administrativo</p>
                  {[
                    { name: "Painel Admin", href: "/admin", icon: <Icons.Settings2 size={16} />, roles: ['admin'] },
                    { name: "Usuários", href: "/admin/users", icon: <Icons.Users size={16} />, roles: ['admin', 'promotora'] },
                    { name: "Regra Bancos", href: "/admin/promotora-rules", icon: <Icons.SlidersHorizontal size={16} />, roles: ['admin', 'promotora'] },
                    { name: "WhatsApp", href: "/admin/whatsapp", icon: <Icons.MessageCircle size={16} />, roles: ['admin', 'promotora'] }
                  ].filter(item => item.roles.includes(user.role)).map(item => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all text-sm font-bold"
                    >
                      {item.icon}
                      {item.name}
                    </Link>
                  ))}
                </>
              )}
              
              <div className="my-2 border-t border-white/10"></div>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all text-sm font-bold"
              >
                <Icons.LogOut size={16} />
                Encerrar Sessão
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex flex-1 px-4 py-6 space-y-4 overflow-y-auto scrollbar-hide relative z-20 flex-col">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const isSimulacao = item.href === "/simulador";

          if (isSimulacao) {
            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={false}
                className={`flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-300 group mt-4 relative overflow-hidden shadow-2xl border-2 cursor-pointer ${isActive
                    ? "border-white/40 opacity-100 scale-105"
                    : "border-transparent text-white/90 hover:scale-105 hover:bg-white/10"
                  }`}
                style={{
                  backgroundColor: user.sidebar_color_secondary || user.brand_color || '#3b82f6',
                  backgroundImage: `linear-gradient(45deg, ${user.sidebar_color_secondary || user.brand_color || '#3b82f6'} 0%, #172554 100%)`,
                  boxShadow: `0 15px 20px -5px color-mix(in srgb, ${user.sidebar_color_secondary || user.brand_color || '#3b82f6'} 30%, transparent)`
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
              prefetch={false}
              className={`flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-300 group cursor-pointer relative overflow-hidden ${isActive 
                ? "text-white shadow-[0_10px_20px_-5px_rgba(0,0,0,0.3)] scale-[1.02]" 
                : "text-white/50 hover:text-white hover:bg-white/5 hover:translate-x-1"
                }`}
              style={isActive ? { 
                backgroundColor: user.sidebar_color_secondary || user.brand_color || '#2563eb',
                backgroundImage: `linear-gradient(135deg, ${user.sidebar_color_secondary || user.brand_color || '#2563eb'} 0%, color-mix(in srgb, ${user.sidebar_color_secondary || user.brand_color || '#2563eb'} 70%, black) 100%)`
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
          <div className="pt-6 mt-6 border-t border-white/5 space-y-4">
            <p className="px-4 text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-3 italic">Área Administrativa</p>
            {[
              { name: "Painel Admin", href: "/admin", icon: <Icons.Settings2 />, roles: ['admin'] },
              { name: user.role === 'promotora' ? 'Usuários' : 'Gestão Usuários', href: "/admin/users", icon: <Icons.Users />, roles: ['admin', 'promotora'] },
              { name: "Regra Bancos", href: "/admin/promotora-rules", icon: <Icons.SlidersHorizontal />, roles: ['admin', 'promotora'] },
              { name: "WhatsApp", href: "/admin/whatsapp", icon: <Icons.MessageCircle />, roles: ['admin', 'promotora'] }
            ].filter(item => item.roles.includes(user.role)).map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={false}
                  className={`flex items-center gap-3 px-4 py-4 rounded-xl transition-all duration-300 group cursor-pointer relative overflow-hidden ${isActive 
                    ? "text-white shadow-[0_10px_20px_-5px_rgba(0,0,0,0.3)] scale-[1.02]" 
                    : "text-white/50 hover:text-white hover:bg-white/5 hover:translate-x-1"
                    }`}
                  style={isActive ? { 
                    backgroundColor: user.sidebar_color_secondary || user.brand_color || '#2563eb',
                    backgroundImage: `linear-gradient(135deg, ${user.sidebar_color_secondary || user.brand_color || '#2563eb'} 0%, color-mix(in srgb, ${user.sidebar_color_secondary || user.brand_color || '#2563eb'} 70%, black) 100%)`
                  } : {}}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="activeTabAdmin"
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
                  {isActive && <motion.div layoutId="activeIndicatorAdmin" className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_#fff] relative z-10" />}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer: Logout Only (Desktop) */}
      <div className="hidden md:block p-4 border-t border-white/5 bg-black/30 relative z-20 text-center">
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
