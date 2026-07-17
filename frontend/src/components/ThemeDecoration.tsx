"use client";

import { useEffect, useState } from "react";
import { api } from "@/utils/api";

export default function ThemeDecoration() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("active_theme") || "default";
    }
    return "default";
  });

  const fetchTheme = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setTheme("default");
      return;
    }
    try {
      const res = await api.get("/admin/active-theme");
      if (res && res.theme) {
        setTheme(res.theme);
        localStorage.setItem("active_theme", res.theme);
      }
    } catch (err) {
      console.error("Erro ao buscar tema ativo:", err);
    }
  };

  useEffect(() => {
    fetchTheme();

    const handleUpdate = () => {
      fetchTheme();
    };

    window.addEventListener("storage", handleUpdate);
    window.addEventListener("theme-updated", handleUpdate);
    window.addEventListener("user-updated", handleUpdate);

    return () => {
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("theme-updated", handleUpdate);
      window.removeEventListener("user-updated", handleUpdate);
    };
  }, []);

  if (theme === "default") return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[99] select-none">
      {theme === "sao_joao" && (
        <>
          {/* Estilos e Animações Juninas Premium */}
          <style>{`
            @keyframes sway {
              0% { transform: rotate(-5deg); }
              100% { transform: rotate(5deg); }
            }
            .junina-rope-flag {
              transform-origin: top center;
              animation: sway 2s ease-in-out infinite alternate;
            }
            @keyframes floatJunina {
              0% {
                transform: translateY(110vh) translateX(0) rotate(0deg) scale(0.7);
                opacity: 0;
              }
              15% { opacity: 0.35; }
              85% { opacity: 0.35; }
              100% {
                transform: translateY(-20vh) translateX(120px) rotate(360deg) scale(1.1);
                opacity: 0;
              }
            }
            .junina-particle {
              position: absolute;
              animation: floatJunina 16s linear infinite;
            }
            @keyframes bonfireGlow {
              0%, 100% { 
                transform: scale(1) rotate(-1deg); 
                filter: drop-shadow(0 0 12px rgba(249, 115, 22, 0.5)) drop-shadow(0 0 30px rgba(239, 68, 68, 0.3)); 
              }
              50% { 
                transform: scale(1.04) rotate(1deg); 
                filter: drop-shadow(0 0 22px rgba(249, 115, 22, 0.8)) drop-shadow(0 0 45px rgba(239, 68, 68, 0.5)); 
              }
            }
            .bonfire-premium {
              animation: bonfireGlow 2.5s ease-in-out infinite;
            }
            @keyframes balloonFloat {
              0% { transform: translateY(0) rotate(-1deg); }
              50% { transform: translateY(-5px) rotate(1deg); }
              100% { transform: translateY(0) rotate(-1deg); }
            }
            .balloon-premium {
              animation: balloonFloat 4s ease-in-out infinite;
            }
          `}</style>

          {/* Cordão Superior de Bandeirinhas SVG Realistas */}
          <div className="absolute top-0 left-0 right-0 h-14 w-full opacity-90 drop-shadow-md">
            <svg viewBox="0 0 1440 60" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="ropeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#b45309" />
                  <stop offset="50%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
              </defs>
              {/* Cordas duplas cruzadas */}
              <path d="M0,8 Q180,30 360,12 Q540,30 720,12 Q900,30 1080,12 Q1260,30 1440,8" fill="none" stroke="url(#ropeGrad)" strokeWidth="2" />
              <path d="M0,15 Q240,40 480,18 Q720,40 960,18 Q1200,40 1440,15" fill="none" stroke="url(#ropeGrad)" strokeWidth="1.2" opacity="0.4" />
            </svg>

            {/* Bandeirinhas SVG distribuídas fisicamente pelo topo */}
            <div className="absolute top-0 left-0 right-0 px-4 flex justify-between">
              {Array.from({ length: 28 }).map((_, i) => {
                const colors = [
                  "#ef4444", // Vermelho
                  "#eab308", // Amarelo
                  "#3b82f6", // Azul
                  "#10b981", // Verde
                  "#f97316", // Laranja
                  "#ec4899", // Rosa
                  "#8b5cf6"  // Roxo
                ];
                const color = colors[i % colors.length];
                // Formato alternado (triangular ou duas pontas)
                const isTriangular = i % 2 === 0;

                return (
                  <div 
                    key={i} 
                    className="junina-rope-flag shrink-0"
                    style={{
                      animationDelay: `${i * 0.15}s`,
                      marginTop: `${(i % 3) * 2}px`
                    }}
                  >
                    <svg width="22" height="32" viewBox="0 0 22 32" className="drop-shadow-sm">
                      {isTriangular ? (
                        <polygon points="0,0 22,0 11,32" fill={color} />
                      ) : (
                        <polygon points="0,0 22,0 22,32 11,24 0,32" fill={color} />
                      )}
                      {/* Vinco de dobra superior */}
                      <rect x="0" y="0" width="22" height="3" fill="#ffffff" opacity="0.25" />
                    </svg>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Partículas Juninas Premium Flutuando */}
          {Array.from({ length: 8 }).map((_, i) => {
            const lefts = ["8%", "22%", "38%", "52%", "68%", "80%", "90%", "95%"];
            const delays = [0, 4, 8, 12, 2, 6, 10, 14];
            const durations = [15, 18, 16, 20, 17, 19, 15, 17];
            const isBalloon = i % 3 === 0;
            const isCorn = i % 3 === 1;

            return (
              <div 
                key={i} 
                className="junina-particle"
                style={{
                  left: lefts[i],
                  animationDelay: `${delays[i]}s`,
                  animationDuration: `${durations[i]}s`
                }}
              >
                {isBalloon ? (
                  /* Mini Balão Junino SVG */
                  <svg width="28" height="36" viewBox="0 0 28 36" className="drop-shadow-md">
                    <path d="M14,2 C5,2 3,15 9,24 C11,27 12,30 13,32 L15,32 C16,30 17,27 19,24 C25,15 23,2 14,2 Z" fill="#ef4444" />
                    <path d="M14,2 C9,2 8,15 12,24 C13,26 13.5,29 14,32 C14.5,29 15,26 16,24 C20,15 19,2 14,2 Z" fill="#eab308" />
                    <path d="M14,2 C12,2 11.5,15 13,24 C13.3,25 13.7,29 14,32 C14.3,29 14.7,25 15,24 C16.5,15 16,2 14,2 Z" fill="#3b82f6" />
                    <rect x="12" y="32" width="4" height="2" fill="#d97706" />
                  </svg>
                ) : isCorn ? (
                  /* Pipoca/Fagulha Brilhante */
                  <svg width="16" height="16" viewBox="0 0 16 16">
                    <circle cx="8" cy="8" r="6" fill="#fde047" opacity="0.8" />
                    <circle cx="8" cy="8" r="3" fill="#ffffff" />
                  </svg>
                ) : (
                  /* Estrela com Brilho */
                  <svg width="20" height="20" viewBox="0 0 24 24" className="fill-orange-400">
                    <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192z" />
                  </svg>
                )}
              </div>
            );
          })}

          {/* Fogueira Junina Ultra-Premium e Balão no Canto Inferior Direito */}
          <div className="absolute bottom-6 right-6 w-32 h-36 flex flex-col items-center justify-end z-10">
            {/* Balão flutuando levemente acima da fogueira */}
            <div className="balloon-premium mb-2">
              <svg width="40" height="52" viewBox="0 0 100 120" className="drop-shadow-lg">
                <defs>
                  <radialGradient id="balloonGradient" cx="50%" cy="40%" r="50%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="60%" stopColor="#1d4ed8" />
                    <stop offset="100%" stopColor="#1e3a8a" />
                  </radialGradient>
                </defs>
                <path d="M50,10 C20,10 15,45 35,70 C42,80 45,90 47,95 L53,95 C55,90 58,80 65,70 C85,45 80,10 50,10 Z" fill="url(#balloonGradient)" />
                <path d="M50,10 C35,10 32,45 45,70 C48,76 49,85 50,95 C51,85 52,76 55,70 C68,45 65,10 50,10 Z" fill="#eab308" />
                <path d="M50,10 C43,10 41,45 47,70 C49,74 49.5,85 50,95 C50.5,85 51,74 53,70 C59,45 57,10 50,10 Z" fill="#ef4444" />
                <line x1="48" y1="95" x2="47" y2="105" stroke="#ffffff" strokeWidth="1.5" />
                <line x1="52" y1="95" x2="53" y2="105" stroke="#ffffff" strokeWidth="1.5" />
                <rect x="45" y="105" width="10" height="8" rx="2" fill="#d97706" />
              </svg>
            </div>

            {/* Fogueira Realista */}
            <div className="bonfire-premium flex flex-col items-center">
              <svg width="72" height="72" viewBox="0 0 120 120">
                <defs>
                  <linearGradient id="flameRed" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0.2" />
                  </linearGradient>
                  <linearGradient id="flameOrange" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#eab308" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
                {/* Troncos de Madeira */}
                <path d="M25,85 L95,85 C98,85 100,87 100,90 C100,93 98,95 95,95 L25,95 C22,95 20,93 20,90 C20,87 22,85 25,85 Z" fill="#78350f" />
                <path d="M30,75 L90,95 C92,96 93,98 92,100 C91,102 89,103 87,102 L27,82 C25,81 24,79 25,77 C26,75 28,74 30,75 Z" fill="#92400e" />
                <path d="M90,75 L30,95 C28,96 26,95 25,93 C24,91 25,89 27,88 L87,68 C89,67 91,68 92,70 C93,72 92,74 90,75 Z" fill="#451a03" />
                
                {/* Chamas em Camadas */}
                <path d="M60,15 C85,50 80,85 60,85 C40,85 35,50 60,15 Z" fill="url(#flameRed)" />
                <path d="M60,35 C75,55 72,85 60,85 C48,85 45,55 60,35 Z" fill="url(#flameOrange)" />
                <path d="M60,52 C68,64 66,85 60,85 C54,85 52,64 60,52 Z" fill="#fde047" />
              </svg>

              <span className="text-[7.5px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-[0.25em] bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-950/60 px-3 py-1 rounded-full mt-2 shadow-lg backdrop-blur-md">
                🔥 São João
              </span>
            </div>
          </div>
        </>
      )}

      {theme === "copa_mundo" && (
        <>
          {/* Estilos e Animações da Copa do Mundo Premium */}
          <style>{`
            @keyframes floatSoccer {
              0% {
                transform: translateY(110vh) translateX(0) rotate(0deg) scale(0.6);
                opacity: 0;
              }
              15% { opacity: 0.35; }
              85% { opacity: 0.35; }
              100% {
                transform: translateY(-20vh) translateX(-100px) rotate(540deg) scale(1.1);
                opacity: 0;
              }
            }
            .soccer-particle {
              position: absolute;
              animation: floatSoccer 15s linear infinite;
            }
            @keyframes trophyGlow {
              0%, 100% { 
                transform: scale(1); 
                filter: drop-shadow(0 0 12px rgba(234, 179, 8, 0.5)) drop-shadow(0 0 30px rgba(16, 185, 129, 0.3)); 
              }
              50% { 
                transform: scale(1.05); 
                filter: drop-shadow(0 0 25px rgba(234, 179, 8, 0.8)) drop-shadow(0 0 45px rgba(16, 185, 129, 0.5)); 
              }
            }
            .trophy-premium {
              animation: trophyGlow 3s ease-in-out infinite;
            }
          `}</style>

          {/* Faixa Superior com Visual de Fita de Campeão */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-600 via-yellow-400 to-emerald-600 opacity-95 shadow-md flex justify-center">
            <div className="bg-gradient-to-r from-yellow-400 to-amber-400 text-[8px] font-black text-emerald-950 uppercase px-4 py-1 rounded-b-xl shadow-lg border-x border-b border-emerald-600/30 tracking-widest flex items-center gap-1.5 backdrop-blur-md">
              <svg width="10" height="10" viewBox="0 0 24 24" className="fill-current">
                <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192z" />
              </svg>
              Brasil Rumo à Copa 2026
            </div>
          </div>

          {/* Partículas de Futebol e Confetes de Estrelas */}
          {Array.from({ length: 8 }).map((_, i) => {
            const lefts = ["10%", "24%", "38%", "52%", "66%", "78%", "88%", "96%"];
            const delays = [1, 5, 9, 2, 6, 10, 0, 13];
            const durations = [14, 16, 15, 17, 13, 16, 12, 15];
            const isBall = i % 2 === 0;

            return (
              <div 
                key={i} 
                className="soccer-particle"
                style={{
                  left: lefts[i],
                  animationDelay: `${delays[i]}s`,
                  animationDuration: `${durations[i]}s`
                }}
              >
                {isBall ? (
                  /* Bola de Futebol SVG Premium */
                  <svg width="22" height="22" viewBox="0 0 100 100" className="drop-shadow-sm">
                    <circle cx="50" cy="50" r="45" fill="#ffffff" stroke="#1e293b" strokeWidth="5" />
                    <polygon points="50,30 62,39 57,54 43,54 38,39" fill="#10b981" />
                    <polygon points="50,8 38,0 20,10 24,28 38,39" fill="#eab308" opacity="0.3" />
                    <line x1="50" y1="5" x2="50" y2="30" stroke="#1e293b" strokeWidth="4" />
                    <line x1="93" y1="36" x2="62" y2="39" stroke="#1e293b" strokeWidth="4" />
                    <line x1="77" y1="84" x2="57" y2="54" stroke="#1e293b" strokeWidth="4" />
                    <line x1="23" y1="84" x2="43" y2="54" stroke="#1e293b" strokeWidth="4" />
                    <line x1="7" y1="36" x2="38" y2="39" stroke="#1e293b" strokeWidth="4" />
                  </svg>
                ) : (
                  /* Estrela Verde/Amarela */
                  <svg width="18" height="18" viewBox="0 0 24 24" className={i % 3 === 0 ? "fill-yellow-400" : "fill-emerald-500"}>
                    <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192z" />
                  </svg>
                )}
              </div>
            );
          })}

          {/* Taça da Copa do Mundo de Ouro no Canto Inferior Direito */}
          <div className="absolute bottom-6 right-6 w-28 h-32 trophy-premium flex flex-col items-center justify-end z-10">
            <svg width="76" height="76" viewBox="0 0 120 120" className="drop-shadow-2xl">
              <defs>
                <linearGradient id="goldTrophy" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fde047" />
                  <stop offset="30%" stopColor="#fbbf24" />
                  <stop offset="70%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#92400e" />
                </linearGradient>
                <linearGradient id="emeraldRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>
              </defs>
              
              {/* Base do Troféu */}
              <path d="M30,95 L90,95 L82,108 L38,108 Z" fill="#1e293b" />
              <rect x="42" y="82" width="36" height="13" fill="#334155" rx="2" />
              <rect x="46" y="85" width="28" height="2" fill="#e2e8f0" opacity="0.5" />
              
              {/* Haste e Globos */}
              <path d="M48,50 L72,50 L66,82 L54,82 Z" fill="url(#goldTrophy)" />
              {/* Asas e Alças Laterais */}
              <path d="M32,22 C14,22 12,46 31,50" fill="none" stroke="url(#goldTrophy)" strokeWidth="6" strokeLinecap="round" />
              <path d="M88,22 C106,22 108,46 89,50" fill="none" stroke="url(#goldTrophy)" strokeWidth="6" strokeLinecap="round" />
              
              {/* Copo/Corpo principal */}
              <path d="M32,18 L88,18 C88,18 94,54 60,64 C26,54 32,18 32,18 Z" fill="url(#goldTrophy)" />
              
              {/* Bola e Detalhe da Pátria */}
              <circle cx="60" cy="36" r="14" fill="url(#emeraldRibbon)" />
              <path d="M48,36 Q60,42 72,36" fill="none" stroke="#fde047" strokeWidth="2.5" />
              <circle cx="60" cy="36" r="3" fill="#ffffff" />
            </svg>

            <span className="text-[7.5px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.25em] bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-950/60 px-3 py-1 rounded-full mt-2 shadow-lg backdrop-blur-md">
              ⚽ Brasil
            </span>
          </div>
        </>
      )}
    </div>
  );
}
