"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, getStaticUrl } from "@/utils/api";
import { Icons } from "@/components/Icons";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rememberedEmail, setRememberedEmail] = useState("");

  // Dynamic branding state loaded dynamically from email input
  const [branding, setBranding] = useState({
    name: "Portabilidade PRO",
    logoUrl: null,
    brandColor: "#2563eb",
    sidebarColor: "#0f172a",
    highlightColor: "#2563eb",
    sidebarColorSecondary: ""
  });

  // Load remembered settings on mount
  useEffect(() => {
    setMounted(true);
    
    // Load last active branding (cached regardless of remember_me) to show identity immediately
    const cachedBranding = localStorage.getItem('last_active_branding');
    if (cachedBranding) {
      try {
        setBranding(JSON.parse(cachedBranding));
      } catch (e) {}
    }

    const savedRemember = localStorage.getItem('remember_me') === 'true';
    if (savedRemember) {
      setRememberMe(true);
      const savedEmail = localStorage.getItem('remembered_email');
      const savedBranding = localStorage.getItem('remembered_branding');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberedEmail(savedEmail);
      }
      if (savedBranding) {
        try {
          setBranding(JSON.parse(savedBranding));
        } catch (e) {}
      }
    }
  }, []);

  // Fetch branding based on email input
  useEffect(() => {
    if (!mounted) return;

    const fetchBranding = async () => {
      const emailTrimmed = email.trim();
      
      // If email is empty, try to load from last active branding cache first
      if (!emailTrimmed) {
        const cachedBranding = localStorage.getItem('last_active_branding');
        if (cachedBranding) {
          try {
            setBranding(JSON.parse(cachedBranding));
            return;
          } catch (e) {}
        }
        setBranding({
          name: "Portabilidade PRO",
          logoUrl: null,
          brandColor: "#2563eb",
          sidebarColor: "#0f172a",
          highlightColor: "#2563eb",
          sidebarColorSecondary: ""
        });
        return;
      }

      // If email matches the saved email, load the saved branding first to show it immediately
      if (rememberedEmail && emailTrimmed.toLowerCase() === rememberedEmail.trim().toLowerCase()) {
        const savedBranding = localStorage.getItem('remembered_branding');
        if (savedBranding) {
          try {
            setBranding(JSON.parse(savedBranding));
          } catch (e) {}
        }
      }

      // Fetch from API for new email inputs
      if (/.+@.+\..+/.test(emailTrimmed)) {
        try {
          const res = await api.get(`/auth/branding?email=${encodeURIComponent(emailTrimmed)}`);
          if (res) {
            const newBranding = {
              name: res.name || "Portabilidade PRO",
              logoUrl: res.logo_url || null,
              brandColor: res.brand_color || "#2563eb",
              sidebarColor: res.sidebar_color || "#0f172a",
              highlightColor: res.highlight_color || res.brand_color || "#2563eb",
              sidebarColorSecondary: res.sidebar_color_secondary || ""
            };
            setBranding(newBranding);
            localStorage.setItem('last_active_branding', JSON.stringify(newBranding));
          }
        } catch (err) {
          // Ignore error, keep default
        }
      } else {
        // Reset to last active branding or defaults if cleared/invalid
        const cachedBranding = localStorage.getItem('last_active_branding');
        if (cachedBranding) {
          try {
            setBranding(JSON.parse(cachedBranding));
            return;
          } catch (e) {}
        }
        setBranding({
          name: "Portabilidade PRO",
          logoUrl: null,
          brandColor: "#2563eb",
          sidebarColor: "#0f172a",
          highlightColor: "#2563eb",
          sidebarColorSecondary: ""
        });
      }
    };

    const timer = setTimeout(fetchBranding, 400); // debounce API requests
    return () => clearTimeout(timer);
  }, [email, rememberedEmail, mounted]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await api.post('/auth/login', { 
        email: email.trim(), 
        password 
      });
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      // Update local storage branding color to sync instantly
      localStorage.setItem('active_theme_color', response.user.brand_color || '#2563eb');
      
      // Cache the logged in user's branding
      const userBranding = {
        name: response.user.name || "Portabilidade PRO",
        logoUrl: response.user.logo_url || response.user.avatar_url || null,
        brandColor: response.user.brand_color || "#2563eb",
        sidebarColor: response.user.sidebar_color || "#0f172a",
        highlightColor: response.user.highlight_color || response.user.brand_color || "#2563eb",
        sidebarColorSecondary: response.user.sidebar_color_secondary || ""
      };
      localStorage.setItem('last_active_branding', JSON.stringify(userBranding));
      
      // Save Remember Me details
      if (rememberMe) {
        localStorage.setItem('remember_me', 'true');
        localStorage.setItem('remembered_email', email.trim());
        localStorage.setItem('remembered_branding', JSON.stringify(userBranding));
      } else {
        localStorage.removeItem('remember_me');
        localStorage.removeItem('remembered_email');
        localStorage.removeItem('remembered_branding');
      }
      
      if (response.user.role === 'admin') {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Acesso negado')) {
        setError("Acesso negado. Email ou senha incorretos.");
      } else {
        setError(err.message || "Erro ao conectar com o servidor.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen lg:h-screen w-full relative flex items-center justify-center p-4 lg:p-0 overflow-x-hidden lg:overflow-hidden font-sans transition-all duration-300"
      style={{
        background: `linear-gradient(135deg, ${branding.sidebarColor} 0%, color-mix(in srgb, ${branding.sidebarColor} 15%, black) 100%)`
      }}
    >
      
      {/* Estilos CSS Inline para Animações e Efeitos Premium */}
      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes floatMedium {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .float-1 { animation: floatSlow 6s ease-in-out infinite; }
        .float-2 { animation: floatMedium 5s ease-in-out infinite; }
        
      `}</style>

      {/* Background blobs (Dynamic brand-colored glow circles matching the previous gradient style) */}
      <div 
        className="absolute top-[10%] left-[10%] w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none z-0 transition-all duration-500"
        style={{
          background: `radial-gradient(circle, ${branding.brandColor}20 0%, transparent 75%)`
        }}
      ></div>
      <div 
        className="absolute bottom-[10%] right-[10%] w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none z-0 transition-all duration-500"
        style={{
          background: `radial-gradient(circle, ${branding.brandColor}15 0%, transparent 75%)`
        }}
      ></div>

      {/* Main Grid Wrapper */}
      <div className="w-full max-w-[1400px] mx-auto min-h-screen lg:h-screen lg:min-h-0 flex flex-col justify-between relative z-10 p-4 lg:p-10">
        
        {/* Middle Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center w-full my-auto lg:h-0 lg:min-h-0">
          
          {/* COLUNA ESQUERDA: Login Form Card */}
          <div className="lg:col-span-5 flex flex-col items-center lg:items-end justify-center w-full">
            <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-7 lg:p-8 shadow-2xl border border-slate-100 dark:border-white/5 w-full max-w-[430px] relative overflow-hidden transition-all duration-300">
              
              {/* Top Accent Gradient Border */}
              <div 
                className="absolute top-0 left-0 w-full h-1.5 transition-all duration-300"
                style={{ backgroundColor: branding.brandColor }}
              ></div>

              {/* Logo / Avatar Circle (Fixed size w-28 h-28, covers fully with object-cover, custom shadow and float animation) */}
              <div className="flex justify-center mb-5">
                <div 
                  className="w-28 h-28 rounded-full bg-slate-100 dark:bg-slate-900 border-2 flex items-center justify-center shadow-2xl relative overflow-hidden transition-all duration-300 hover:scale-105 cursor-pointer float-1"
                  style={{ 
                    borderColor: `${branding.brandColor}30`,
                    boxShadow: `0 0 25px ${branding.brandColor}25`
                  }}
                >
                  {branding.logoUrl ? (
                    <img 
                      src={getStaticUrl(branding.logoUrl)} 
                      alt="Logo Promotora" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center font-black text-2xl transition-all duration-300 text-white"
                      style={{ backgroundColor: branding.brandColor }}
                    >
                      {branding.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              {/* Welcome text */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight leading-none mb-1.5">
                  Bem-vindo(a), <span className="transition-all duration-300" style={{ color: branding.brandColor }}>{branding.name}</span>
                </h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acesse sua conta para continuar</p>
              </div>

              {error && (
                <div className="mb-5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 p-3 rounded-2xl text-[10px] font-black uppercase tracking-wider text-center">
                  ⚠️ {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">E-mail Profissional</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                      <Icons.Mail className="w-4 h-4 text-slate-400" />
                    </span>
                    <input 
                      type="email" 
                      value={mounted ? email : ""}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.nome@promotora.com"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl pl-11 pr-4 py-3 text-xs text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Senha de Acesso</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                      <Icons.Lock className="w-4 h-4 text-slate-400" />
                    </span>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite sua senha"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl pl-11 pr-11 py-3 text-xs text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      {showPassword ? (
                        <Icons.EyeOff className="w-4 h-4" />
                      ) : (
                        <Icons.Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember and Forgot password */}
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider select-none">
                  <label className="flex items-center gap-1.5 text-slate-500 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={mounted ? rememberMe : false}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 dark:border-white/10 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    Lembrar de mim
                  </label>
                  <a href="#" className="hover:underline transition-all" style={{ color: branding.brandColor }}>
                    Esqueceu sua senha?
                  </a>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl shadow-xl transition-all flex justify-center items-center gap-2 disabled:opacity-70 active:scale-98 cursor-pointer"
                  style={{ 
                    backgroundColor: branding.brandColor,
                    boxShadow: `0 8px 18px -4px ${branding.brandColor}40`
                  }}
                >
                  {loading ? (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <>
                      Entrar
                      <Icons.ArrowRight className="w-3.5 h-3.5 text-white" />
                    </>
                  )}
                </button>
              </form>

              {/* Secure bottom badge */}
              <div className="mt-5 flex justify-center items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <Icons.Lock className="w-3 h-3 text-slate-400" />
                Ambiente seguro e criptografado
              </div>
            </div>
            
            {/* Small secure tag below card (Same width as login card for professional alignment) */}
            <div className="hidden lg:flex w-full max-w-[430px] mt-3">
              <div className="flex items-center gap-3 bg-white/40 dark:bg-[#0f172a]/40 backdrop-blur-md border border-slate-100 dark:border-white/5 rounded-2xl p-3 w-full shadow-lg">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Icons.ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-left">
                  <h4 className="text-[9px] font-black text-slate-800 dark:text-white uppercase leading-none">Ambiente 100% Seguro</h4>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1 leading-tight">Dados protegidos com criptografia de ponta.</p>
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: Branding e Info (Apenas visível em desktops, redimensionado para evitar rolagem) */}
          <div className="hidden lg:col-span-7 lg:flex flex-col justify-center px-8 xl:px-12 text-left w-full h-full select-none relative">
            
            {/* Light Cityscape Background Image (faded) from user request */}
            <div className="absolute inset-0 -z-20 pointer-events-none overflow-hidden rounded-[2.5rem]">
              <img 
                src="/city_skyline.png" 
                alt="Cityscape Skyline" 
                className="w-full h-full object-cover opacity-15 dark:opacity-[0.04] transition-all duration-300"
              />
            </div>

            {/* Top Logo Header (Restored 3xl size and hover rotation animations) */}
            <div className="flex items-center gap-3.5 mb-5 hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer w-fit">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl transform rotate-6 group-hover:rotate-12 transition-transform duration-300"
                style={{ 
                  backgroundColor: branding.brandColor,
                  boxShadow: `0 10px 20px -5px ${branding.brandColor}40`
                }}
              >
                <Icons.Zap className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white leading-none tracking-tight">
                  PORTABILIDADE <span style={{ color: branding.highlightColor || branding.brandColor }}>PRO</span>
                </h1>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Inteligência e tecnologia em crédito consignado</p>
              </div>
            </div>

            {/* Slogan + Couple Section (Laid out next to each other to save huge vertical space) */}
            <div className="flex items-center justify-between gap-6 mb-3">
              {/* Slogan details */}
              <div className="flex-1 max-w-[340px]">
                <h2 className="text-3xl xl:text-4xl font-black text-white tracking-tight leading-none mb-3">
                  Mais inteligência.<br />
                  <span className="transition-all duration-300" style={{ color: branding.highlightColor || branding.brandColor }}>Mais resultado.</span>
                </h2>
                <p className="text-xs font-semibold text-slate-300 leading-relaxed">
                  A plataforma completa para portabilidade de crédito consignado com tecnologia, segurança e precisão.
                </p>
              </div>

              {/* Corporate Couple Photo backdrop from user request (replaces h-52 block) */}
              <div className="flex-1 relative h-[270px] xl:h-[300px] flex items-end justify-center overflow-visible pr-8">
                
                {/* Giant blue logo shape 'P' behind the couple, matching the mockup */}
                <svg className="absolute top-[48%] left-[45%] -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] -z-10 opacity-[0.95] select-none pointer-events-none" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M60 170V45c0-8.3 6.7-15 15-15h45c33.1 0 60 26.9 60 60s-27 60-60 60H90" stroke={`url(#pGrad-${(branding.highlightColor || branding.brandColor).replace('#', '')})`} strokeWidth="28" strokeLinecap="round" strokeLinejoin="round" />
                  <defs>
                    <linearGradient id={`pGrad-${(branding.highlightColor || branding.brandColor).replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={branding.highlightColor || branding.brandColor} />
                      <stop offset="100%" stopColor={`color-mix(in srgb, ${branding.highlightColor || branding.brandColor} 65%, black)`} />
                    </linearGradient>
                  </defs>
                </svg>

                <img 
                  src="/login_corporate_couple.png" 
                  alt="Parceiros Portabilidade PRO" 
                  className="h-full w-auto object-contain relative z-10 select-none pointer-events-none drop-shadow-2xl scale-110" 
                />

                {/* Floating metrics card 1 (Top right) */}
                <div className="absolute top-[10%] -right-10 float-1 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-2 px-3 shadow-xl flex items-center gap-3.5 z-20 w-[142px]">
                  <div className="flex-1 text-left">
                    <h4 className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Taxa reduzida</h4>
                    <p className="text-sm font-black leading-none mt-1" style={{ color: branding.brandColor }}>-37%</p>
                    <span className="text-[6px] text-slate-500 uppercase font-black tracking-wider block mt-1">Economia média</span>
                  </div>
                  <div 
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${branding.brandColor}15` }}
                  >
                    <Icons.BarChartUp size={12} style={{ color: branding.brandColor }} />
                  </div>
                </div>

                {/* Floating metrics card 2 (Middle right) */}
                <div className="absolute top-[42%] -right-16 float-2 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-2 px-3 shadow-xl flex items-center gap-3.5 z-20 w-[142px]">
                  <div className="flex-1 text-left">
                    <h4 className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Contratos ativos</h4>
                    <p className="text-sm font-black leading-none mt-1" style={{ color: branding.brandColor }}>+12.842</p>
                    <span className="text-[6px] text-slate-500 uppercase font-black tracking-wider block mt-1">Este mês</span>
                  </div>
                  <div 
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${branding.brandColor}15` }}
                  >
                    <Icons.Check size={12} style={{ color: branding.brandColor }} />
                  </div>
                </div>

                {/* Floating metrics card 3 (Bottom right - Brought back per user request) */}
                <div className="absolute top-[74%] -right-10 float-1 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-2 px-3 shadow-xl flex items-center gap-3.5 z-20 w-[142px]">
                  <div className="flex-1 text-left">
                    <h4 className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Valor processado</h4>
                    <p className="text-sm font-black leading-none mt-1" style={{ color: branding.brandColor }}>R$ 284M</p>
                    <span className="text-[6px] text-slate-500 uppercase font-black tracking-wider block mt-1">Este mês</span>
                  </div>
                  <div 
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${branding.brandColor}15` }}
                  >
                    <Icons.HandCoins size={12} style={{ color: branding.brandColor }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 3 highlights row */}
            <div className="grid grid-cols-3 gap-4 w-full max-w-xl">
              {/* IA */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-[1.75rem] p-4 shadow-sm flex flex-col justify-between group cursor-default">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-lg shrink-0 transition-transform duration-300 group-hover:scale-110"
                  style={{ 
                    background: `linear-gradient(135deg, ${branding.brandColor} 0%, color-mix(in srgb, ${branding.brandColor} 70%, black) 100%)`,
                    boxShadow: `0 4px 12px -2px ${branding.brandColor}50`
                  }}
                >
                  <Icons.Bot className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1">Inteligência Artificial</h4>
                  <p className="text-[9px] text-slate-300 font-bold uppercase tracking-wider leading-relaxed">
                    Análise inteligente de dados para encontrar as melhores oportunidades de portabilidade.
                  </p>
                  <div className="w-10 h-1.5 rounded-full mt-3" style={{ backgroundColor: branding.brandColor }}></div>
                </div>
              </div>

              {/* Segurança */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-[1.75rem] p-4 shadow-sm flex flex-col justify-between group cursor-default">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-lg shrink-0 transition-transform duration-300 group-hover:scale-110"
                  style={{ 
                    background: `linear-gradient(135deg, ${branding.brandColor} 0%, color-mix(in srgb, ${branding.brandColor} 70%, black) 100%)`,
                    boxShadow: `0 4px 12px -2px ${branding.brandColor}50`
                  }}
                >
                  <Icons.ShieldLock className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1">Segurança LGPD</h4>
                  <p className="text-[9px] text-slate-300 font-bold uppercase tracking-wider leading-relaxed">
                    Total conformidade com a LGPD e criptografia avançada para proteger seus dados.
                  </p>
                  <div className="w-10 h-1.5 rounded-full mt-3" style={{ backgroundColor: branding.brandColor }}></div>
                </div>
              </div>

              {/* Cálculos */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-[1.75rem] p-4 shadow-sm flex flex-col justify-between group cursor-default">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-lg shrink-0 transition-transform duration-300 group-hover:scale-110"
                  style={{ 
                    background: `linear-gradient(135deg, ${branding.brandColor} 0%, color-mix(in srgb, ${branding.brandColor} 70%, black) 100%)`,
                    boxShadow: `0 4px 12px -2px ${branding.brandColor}50`
                  }}
                >
                  <Icons.BarChartUp className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1">Cálculos Financeiros</h4>
                  <p className="text-[9px] text-slate-300 font-bold uppercase tracking-wider leading-relaxed">
                    Cálculos precisos e simulações avançadas para máxima assertividade nos resultados.
                  </p>
                  <div className="w-10 h-1.5 rounded-full mt-3" style={{ backgroundColor: branding.brandColor }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Features Links */}
        <div className="w-full border-t border-white/5 pt-3.5 mt-3 flex flex-wrap justify-center lg:justify-between items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest relative z-10">
          <div className="flex gap-2 items-center relative group cursor-default bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20" title="Inteligência Artificial Ativa">
            <div className="relative flex items-center justify-center">
              <Icons.Bot size={18} className="text-emerald-400" />
              {/* Radar light */}
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]"></span>
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold drop-shadow-md">
              Módulo de IA Ativo
            </span>
          </div>
          <div className="flex gap-2 items-center">
            <Icons.ShieldCheck size={12} className="text-emerald-500" />
            Conformidade regulatória
          </div>
          <div className="flex gap-2 items-center">
            <Icons.Headphones size={12} style={{ color: branding.brandColor }} />
            Suporte especializado
          </div>
          <div className="flex gap-2 items-center">
            <Icons.RefreshCw size={12} style={{ color: branding.brandColor }} />
            Atualizações contínuas
          </div>
        </div>
      </div>
    </div>
  );
}
