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
    <div className="min-h-screen lg:h-screen w-full bg-slate-50 dark:bg-[#0b1120] relative flex items-center justify-center p-4 lg:p-0 overflow-x-hidden lg:overflow-hidden font-sans transition-colors duration-300">
      
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
        
        .login-bg-curve {
          position: absolute;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(37, 99, 235, 0.05) 0%, rgba(37, 99, 235, 0) 70%);
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

              {/* Logo / Avatar Circle (Fixed to cover completely with object-cover and no borders/padding) */}
              <div className="flex justify-center mb-5">
                <div 
                  className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-900 border-2 flex items-center justify-center shadow-inner relative overflow-hidden transition-all duration-300"
                  style={{ borderColor: `${branding.brandColor}30` }}
                >
                  {branding.logoUrl ? (
                    <img 
                      src={getStaticUrl(branding.logoUrl)} 
                      alt="Logo Promotora" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center font-black text-xl transition-all duration-300 text-white"
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
                      value={email}
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
                      checked={rememberMe}
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
            
            {/* Small secure tag below card */}
            <div className="hidden lg:flex w-full max-w-[430px] justify-start mt-3 pl-4">
              <div className="flex items-center gap-3 bg-white/40 dark:bg-[#0f172a]/40 backdrop-blur-md border border-slate-100 dark:border-white/5 rounded-2xl p-3 max-w-[270px]">
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
          <div className="hidden lg:col-span-7 lg:flex flex-col justify-center px-8 xl:px-12 text-left w-full h-full select-none">
            
            {/* Top Logo Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20 transform rotate-6">
                <Icons.Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-800 dark:text-white leading-none tracking-tight">
                  PORTABILIDADE <span className="text-blue-600">PRO</span>
                </h1>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Inteligência e tecnologia em crédito consignado</p>
              </div>
            </div>

            {/* Slogan + Couple Section (Laid out next to each other to save huge vertical space) */}
            <div className="flex items-center justify-between gap-6 mb-5">
              {/* Slogan details */}
              <div className="flex-1 max-w-[340px]">
                <h2 className="text-3xl xl:text-4xl font-black text-slate-800 dark:text-white tracking-tight leading-none mb-3">
                  Mais inteligência.<br />
                  <span className="text-blue-600">Mais resultado.</span>
                </h2>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                  A plataforma completa para portabilidade de crédito consignado com tecnologia, segurança e precisão.
                </p>
              </div>

              {/* Corporate Couple Photo backdrop from user request (replaces h-52 block) */}
              <div className="flex-1 relative h-[240px] xl:h-[280px] flex items-end justify-center overflow-visible">
                {/* Decorative background shapes */}
                <div className="absolute inset-0 bg-blue-50/40 dark:bg-slate-900/40 rounded-[2.5rem] border border-slate-100/50 dark:border-white/5 -z-10 overflow-hidden shadow-inner">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-xl"></div>
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl"></div>
                </div>

                <img 
                  src="/login_corporate_couple.png" 
                  alt="Parceiros Portabilidade PRO" 
                  className="h-full w-auto object-contain relative z-10 select-none pointer-events-none drop-shadow-2xl" 
                />

                {/* Floating metrics card 1 */}
                <div className="absolute top-4 -left-10 float-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-100 dark:border-white/10 rounded-2xl p-2.5 shadow-xl flex items-center gap-2 z-20">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs shrink-0">
                    <Icons.Target size={12} className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-[7px] font-black text-slate-800 dark:text-white uppercase leading-none">Taxa reduzida</h4>
                    <p className="text-xs font-black text-blue-600 dark:text-blue-400 leading-none mt-1">-37%</p>
                  </div>
                </div>

                {/* Floating metrics card 2 */}
                <div className="absolute bottom-6 -right-4 float-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-100 dark:border-white/10 rounded-2xl p-2.5 shadow-xl flex items-center gap-2 z-20">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs shrink-0">
                    <Icons.Check size={12} className="text-emerald-600" />
                  </div>
                  <div>
                    <h4 className="text-[7px] font-black text-slate-800 dark:text-white uppercase leading-none">Contratos ativos</h4>
                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 leading-none mt-1">+12.842</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 3 highlights row */}
            <div className="grid grid-cols-3 gap-4 w-full max-w-xl">
              {/* IA */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-100 dark:border-white/5 rounded-[1.75rem] p-4 shadow-sm flex flex-col justify-between">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center mb-2.5 shadow-inner shrink-0">
                  <Icons.Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h4 className="text-[9px] font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">Inteligência Artificial</h4>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider leading-normal">
                    Análise inteligente de dados para encontrar as melhores oportunidades de portabilidade.
                  </p>
                </div>
              </div>

              {/* Segurança */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-100 dark:border-white/5 rounded-[1.75rem] p-4 shadow-sm flex flex-col justify-between">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-2.5 shadow-inner shrink-0">
                  <Icons.ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-[9px] font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">Segurança LGPD</h4>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider leading-normal">
                    Total conformidade com a LGPD e criptografia avançada para proteger seus dados.
                  </p>
                </div>
              </div>

              {/* Cálculos */}
              <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-100 dark:border-white/5 rounded-[1.75rem] p-4 shadow-sm flex flex-col justify-between">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-2.5 shadow-inner shrink-0">
                  <Icons.BarChart className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-[9px] font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1">Cálculos Financeiros</h4>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider leading-normal">
                    Cálculos precisos e simulações avançadas para máxima assertividade nos resultados.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Features Links */}
        <div className="w-full border-t border-slate-200/50 dark:border-white/5 pt-3.5 flex flex-wrap justify-center lg:justify-between items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest relative z-10">
          <div className="flex gap-2 items-center">
            <Icons.Layers size={12} className="text-blue-500" />
            Tecnologia de ponta
          </div>
          <div className="flex gap-2 items-center">
            <Icons.ShieldCheck size={12} className="text-emerald-500" />
            Conformidade regulatória
          </div>
          <div className="flex gap-2 items-center">
            <Icons.Headphones size={12} className="text-indigo-500" />
            Suporte especializado
          </div>
          <div className="flex gap-2 items-center">
            <Icons.RefreshCw size={12} className="text-orange-500" />
            Atualizações contínuas
          </div>
        </div>
      </div>
    </div>
  );
}
