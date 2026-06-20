"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, getStaticUrl } from "@/utils/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Dynamic branding state loaded dynamically from email input
  const [branding, setBranding] = useState({
    name: "Portabilidade PRO",
    logoUrl: null,
    brandColor: "#2563eb",
    sidebarColor: "#0f172a"
  });

  // Fetch branding based on email input
  useEffect(() => {
    const fetchBranding = async () => {
      const emailTrimmed = email.trim();
      // Only query if the input matches a basic email format
      if (/.+@.+\..+/.test(emailTrimmed)) {
        try {
          const res = await api.get(`/auth/branding?email=${encodeURIComponent(emailTrimmed)}`);
          if (res) {
            setBranding({
              name: res.name || "Portabilidade PRO",
              logoUrl: res.logo_url || null,
              brandColor: res.brand_color || "#2563eb",
              sidebarColor: res.sidebar_color || "#0f172a"
            });
          }
        } catch (err) {
          // Ignore error, keep default
        }
      } else {
        // Reset to default if cleared
        setBranding({
          name: "Portabilidade PRO",
          logoUrl: null,
          brandColor: "#2563eb",
          sidebarColor: "#0f172a"
        });
      }
    };

    const timer = setTimeout(fetchBranding, 400); // debounce API requests
    return () => clearTimeout(timer);
  }, [email]);

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
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0b1120] relative flex items-center justify-center p-4 lg:p-0 overflow-x-hidden font-sans transition-colors duration-300">
      
      {/* Estilos CSS Inline para Animações e Efeitos Premium */}
      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes floatMedium {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        .float-1 { animation: floatSlow 6s ease-in-out infinite; }
        .float-2 { animation: floatMedium 5s ease-in-out infinite; }
        .float-3 { animation: floatSlow 7s ease-in-out infinite; }
        
        .login-bg-curve {
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.08) 0%, rgba(37, 99, 235, 0) 70%);
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }
      `}</style>

      {/* Background blobs */}
      <div className="login-bg-curve top-0 left-0"></div>
      <div className="login-bg-curve bottom-0 right-0"></div>

      {/* Main Grid Wrapper */}
      <div className="w-full max-w-[1440px] mx-auto min-h-screen flex flex-col justify-between relative z-10 p-6 lg:p-12">
        
        {/* Middle Content */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full my-auto">
          
          {/* COLUNA ESQUERDA: Login Form Card */}
          <div className="lg:col-span-5 flex flex-col items-center lg:items-end justify-center w-full">
            <div className="bg-white dark:bg-[#0f172a] rounded-[2.5rem] p-8 lg:p-10 shadow-2xl border border-slate-100 dark:border-white/5 w-full max-w-[460px] relative overflow-hidden transition-all duration-300">
              
              {/* Top Accent Gradient Border */}
              <div 
                className="absolute top-0 left-0 w-full h-1.5 transition-all duration-300"
                style={{ backgroundColor: branding.brandColor }}
              ></div>

              {/* Logo / Avatar Circle */}
              <div className="flex justify-center mb-6">
                <div 
                  className="w-24 h-24 rounded-full bg-slate-50 dark:bg-slate-900 border-2 flex items-center justify-center p-1 shadow-inner relative group transition-all duration-300"
                  style={{ borderColor: `${branding.brandColor}30` }}
                >
                  <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                    {branding.logoUrl ? (
                      <img src={getStaticUrl(branding.logoUrl)} alt="Logo Promotora" className="w-full h-full object-contain" />
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
              </div>

              {/* Welcome text */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none mb-2">
                  Bem-vindo(a), <span className="transition-all duration-300" style={{ color: branding.brandColor }}>{branding.name}</span>
                </h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Acesse sua conta para continuar</p>
              </div>

              {error && (
                <div className="mb-6 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 p-4 rounded-2xl text-xs font-black uppercase tracking-wider text-center">
                  ⚠️ {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">E-mail Profissional</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    </span>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.nome@promotora.com"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Senha de Acesso</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite sua senha"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl pl-11 pr-11 py-3.5 text-xs text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember and Forgot password */}
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider select-none">
                  <label className="flex items-center gap-2 text-slate-500 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 dark:border-white/10 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
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
                  className="w-full text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl shadow-xl transition-all flex justify-center items-center gap-2 disabled:opacity-70 active:scale-98"
                  style={{ 
                    backgroundColor: branding.brandColor,
                    boxShadow: `0 10px 20px -5px ${branding.brandColor}40`
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
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>

                <div className="relative flex items-center justify-center my-6">
                  <div className="w-full border-t border-slate-100 dark:border-white/5"></div>
                  <span className="absolute bg-white dark:bg-[#0f172a] px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">ou</span>
                </div>

                <button 
                  type="button" 
                  className="w-full bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-white/5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-98"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Entrar com SSO
                </button>
              </form>

              {/* Secure bottom badge */}
              <div className="mt-8 flex justify-center items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Ambiente seguro e criptografado
              </div>
            </div>
            
            {/* Small secure tag below card */}
            <div className="hidden lg:flex w-full max-w-[460px] justify-start mt-6 pl-4">
              <div className="flex items-center gap-3 bg-white/40 dark:bg-[#0f172a]/40 backdrop-blur-md border border-slate-100 dark:border-white/5 rounded-2xl p-4 max-w-[280px]">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h4 className="text-[9px] font-black text-slate-800 dark:text-white uppercase leading-none">Ambiente 100% Seguro</h4>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1 leading-tight">Dados protegidos com criptografia de ponta.</p>
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: Branding e Info (Apenas visível em desktops) */}
          <div className="hidden lg:col-span-7 lg:flex flex-col justify-center px-12 text-left w-full h-full select-none">
            
            {/* Top Logo Header */}
            <div className="flex items-center gap-3 mb-10">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20 transform rotate-6">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-white leading-none tracking-tight">
                  PORTABILIDADE <span className="text-blue-600">PRO</span>
                </h1>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Inteligência e tecnologia em crédito consignado</p>
              </div>
            </div>

            {/* Central Slogan */}
            <div className="mb-8">
              <h2 className="text-4xl lg:text-5xl font-black text-slate-800 dark:text-white tracking-tight leading-none mb-4">
                Mais inteligência.<br />
                <span className="text-blue-600">Mais resultado.</span>
              </h2>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed">
                A plataforma completa para portabilidade de crédito consignado com tecnologia, segurança e precisão.
              </p>
            </div>

            {/* Isometric SVG Dashboard Vector Illustration with Dynamic Floating Cards */}
            <div className="relative w-full max-w-xl h-60 bg-gradient-to-tr from-blue-50/50 to-indigo-50/20 dark:from-slate-900/50 dark:to-slate-850/10 rounded-[3rem] border border-slate-100 dark:border-white/5 flex items-center justify-center p-8 overflow-hidden shadow-inner mb-8">
              <svg viewBox="0 0 400 200" className="w-full h-full max-h-[180px]">
                {/* Grid Background Lines */}
                <path d="M 0 100 L 400 100 M 200 0 L 200 200" stroke="rgba(37, 99, 235, 0.05)" strokeWidth="1.5" />
                <circle cx="200" cy="100" r="80" fill="none" stroke="rgba(37, 99, 235, 0.04)" strokeWidth="2" />
                <circle cx="200" cy="100" r="140" fill="none" stroke="rgba(37, 99, 235, 0.03)" strokeWidth="1" />

                {/* Dashboard mock lines */}
                <path d="M 80,140 Q 140,80 200,120 T 320,60" fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
                <path d="M 80,140 Q 140,80 200,120 T 320,60 L 320,180 L 80,180 Z" fill="url(#chartFill)" opacity="0.1" />

                {/* Vector graphics of businesspeople (Abstract Illustration) */}
                {/* Person 1 (Woman) */}
                <g transform="translate(140, 50)" opacity="0.9">
                  <circle cx="30" cy="30" r="12" fill="#3b82f6" />
                  <path d="M 15,65 Q 15,45 30,45 Q 45,45 45,65 Z" fill="#1e40af" />
                </g>
                {/* Person 2 (Man) */}
                <g transform="translate(200, 45)" opacity="0.9">
                  <circle cx="30" cy="25" r="12" fill="#10b981" />
                  <path d="M 15,60 Q 15,40 30,40 Q 45,40 45,60 Z" fill="#065f46" />
                </g>
                
                {/* Tablet device mock */}
                <rect x="175" y="85" width="50" height="35" rx="4" fill="#0f172a" stroke="#475569" strokeWidth="2.5" transform="rotate(-5 200 100)" />
                <rect x="180" y="89" width="40" height="27" rx="1.5" fill="#3b82f6" opacity="0.9" transform="rotate(-5 200 100)" />

                <defs>
                  <linearGradient id="chartFill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Floating metrics card 1 */}
              <div className="absolute top-8 left-8 float-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-4 shadow-xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  📈
                </div>
                <div>
                  <h4 className="text-[9px] font-black text-slate-800 dark:text-white uppercase leading-none">Taxa reduzida</h4>
                  <p className="text-xs font-black text-blue-600 dark:text-blue-400 leading-none mt-1.5">-37%</p>
                  <span className="text-[7px] text-slate-400 uppercase font-black tracking-wider block mt-1">Economia média</span>
                </div>
              </div>

              {/* Floating metrics card 2 */}
              <div className="absolute bottom-10 left-12 float-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-4 shadow-xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  💼
                </div>
                <div>
                  <h4 className="text-[9px] font-black text-slate-800 dark:text-white uppercase leading-none">Contratos ativos</h4>
                  <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 leading-none mt-1.5">+12.842</p>
                  <span className="text-[7px] text-slate-400 uppercase font-black tracking-wider block mt-1">Este mês</span>
                </div>
              </div>

              {/* Floating metrics card 3 */}
              <div className="absolute top-16 right-8 float-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl p-4 shadow-xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  💰
                </div>
                <div>
                  <h4 className="text-[9px] font-black text-slate-800 dark:text-white uppercase leading-none">Valor processado</h4>
                  <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 leading-none mt-1.5">R$ 284M</p>
                  <span className="text-[7px] text-slate-400 uppercase font-black tracking-wider block mt-1">Este mês</span>
                </div>
              </div>
            </div>

            {/* Bottom 3 highlights row */}
            <div className="grid grid-cols-3 gap-4 w-full">
              {/* IA */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-100 dark:border-white/5 rounded-[2rem] p-6 shadow-md">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg mb-4 shadow-inner">
                  🧠
                </div>
                <h4 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider mb-2">Inteligência Artificial</h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                  Análise inteligente de dados para encontrar as melhores oportunidades de portabilidade.
                </p>
              </div>

              {/* Segurança */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-100 dark:border-white/5 rounded-[2rem] p-6 shadow-md">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg mb-4 shadow-inner">
                  🛡️
                </div>
                <h4 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider mb-2">Segurança LGPD</h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                  Total conformidade com a LGPD e criptografia avançada para proteger seus dados.
                </p>
              </div>

              {/* Cálculos */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-100 dark:border-white/5 rounded-[2rem] p-6 shadow-md">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg mb-4 shadow-inner">
                  📊
                </div>
                <h4 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-wider mb-2">Cálculos Financeiros</h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                  Cálculos precisos e simulações avançadas para máxima assertividade nos resultados.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Features Links */}
        <div className="w-full border-t border-slate-200/50 dark:border-white/5 pt-6 flex flex-wrap justify-center lg:justify-between items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest relative z-10">
          <div className="flex gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Tecnologia de ponta
          </div>
          <div className="flex gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Conformidade regulatória
          </div>
          <div className="flex gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            Suporte especializado
          </div>
          <div className="flex gap-1 items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
            Atualizações contínuas
          </div>
        </div>
      </div>
    </div>
  );
}
