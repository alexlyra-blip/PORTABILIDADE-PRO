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
          {/* Estilos e Animações Juninas */}
          <style>{`
            @keyframes floatFlag {
              0% {
                transform: translateY(110vh) translateX(0) rotate(0deg) scale(0.6);
                opacity: 0;
              }
              10% { opacity: 0.25; }
              90% { opacity: 0.25; }
              100% {
                transform: translateY(-20vh) translateX(80px) rotate(360deg) scale(1.1);
                opacity: 0;
              }
            }
            .junina-flag-particle {
              position: absolute;
              animation: floatFlag 16s linear infinite;
            }
            @keyframes bonfirePulse {
              0%, 100% { transform: scale(1) rotate(-2deg); filter: drop-shadow(0 0 15px rgba(249, 115, 22, 0.4)); }
              50% { transform: scale(1.05) rotate(2deg); filter: drop-shadow(0 0 25px rgba(239, 68, 68, 0.7)); }
            }
            .bonfire-element {
              animation: bonfirePulse 2s ease-in-out infinite;
            }
          `}</style>

          {/* Bandeirinhas no topo do ecrã */}
          <div className="absolute top-0 left-0 right-0 h-8 flex justify-around items-start opacity-90">
            {Array.from({ length: 24 }).map((_, i) => {
              const colors = ["bg-red-500", "bg-yellow-400", "bg-blue-500", "bg-emerald-500", "bg-orange-500", "bg-pink-500"];
              const randomColor = colors[i % colors.length];
              return (
                <div 
                  key={i} 
                  className={`w-3.5 h-5 ${randomColor} shadow-md`}
                  style={{
                    clipPath: "polygon(0% 0%, 100% 0%, 50% 100%)",
                    transform: `rotate(${(i % 3) * 6 - 6}deg) translateY(${i % 2 === 0 ? 0 : 3}px)`
                  }}
                />
              );
            })}
          </div>

          {/* Partículas Juninas Flutuando no Fundo */}
          {Array.from({ length: 6 }).map((_, i) => {
            const lefts = ["5%", "25%", "45%", "65%", "85%", "92%"];
            const delays = [0, 4, 8, 2, 6, 10];
            const durations = [14, 18, 15, 20, 16, 17];
            const icons = ["🏮", "✨", "🌽", "🎈", "✨", "🏮"];
            return (
              <span 
                key={i} 
                className="junina-flag-particle text-xl"
                style={{
                  left: lefts[i],
                  animationDelay: `${delays[i]}s`,
                  animationDuration: `${durations[i]}s`
                }}
              >
                {icons[i]}
              </span>
            );
          })}

          {/* Fogueira Junina Premium no Canto Inferior Direito */}
          <div className="absolute bottom-4 right-4 w-24 h-24 bonfire-element opacity-85 flex flex-col items-center justify-end">
            <svg viewBox="0 0 100 100" className="w-20 h-20 drop-shadow-xl">
              {/* Lenhas */}
              <rect x="25" y="72" width="50" height="12" rx="4" fill="#78350f" transform="rotate(-15 50 78)" />
              <rect x="25" y="72" width="50" height="12" rx="4" fill="#92400e" transform="rotate(15 50 78)" />
              {/* Chamas */}
              <path d="M50,15 C66,42 62,75 50,75 C38,75 34,42 50,15 Z" fill="#ef4444" opacity="0.8" />
              <path d="M50,30 C60,52 58,75 50,75 C42,75 40,52 50,30 Z" fill="#f97316" opacity="0.9" />
              <path d="M50,45 C55,60 54,75 50,75 C46,75 45,60 50,45 Z" fill="#eab308" />
            </svg>
            <span className="text-[7px] font-black text-orange-500 uppercase tracking-widest bg-orange-50 dark:bg-slate-900 border border-orange-200 dark:border-orange-900/40 px-2 py-0.5 rounded-md mt-1 shadow-sm">
              São João Pro
            </span>
          </div>
        </>
      )}

      {theme === "copa_mundo" && (
        <>
          {/* Estilos e Animações de Copa */}
          <style>{`
            @keyframes floatSoccer {
              0% {
                transform: translateY(110vh) translateX(0) rotate(0deg) scale(0.6);
                opacity: 0;
              }
              10% { opacity: 0.25; }
              90% { opacity: 0.25; }
              100% {
                transform: translateY(-20vh) translateX(-80px) rotate(720deg) scale(1.1);
                opacity: 0;
              }
            }
            .soccer-ball-particle {
              position: absolute;
              animation: floatSoccer 15s linear infinite;
            }
            @keyframes trophyPulse {
              0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(234, 179, 8, 0.4)); }
              50% { transform: scale(1.04); filter: drop-shadow(0 0 25px rgba(16, 185, 129, 0.7)); }
            }
            .trophy-element {
              animation: trophyPulse 2.5s ease-in-out infinite;
            }
          `}</style>

          {/* Faixa Superior Verde e Amarela */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-yellow-400 to-emerald-500 opacity-90 shadow-md flex justify-center">
            <div className="bg-yellow-400 text-[8px] font-black text-emerald-800 uppercase px-3 py-0.5 rounded-b-md shadow-md border-x border-b border-emerald-600/20 tracking-wider">
              Copa do Mundo 2026
            </div>
          </div>

          {/* Partículas de Futebol Flutuando */}
          {Array.from({ length: 6 }).map((_, i) => {
            const lefts = ["10%", "30%", "50%", "70%", "88%", "95%"];
            const delays = [2, 7, 0, 9, 4, 11];
            const durations = [13, 16, 12, 18, 14, 15];
            const icons = ["⚽", "⭐", "💚", "⚽", "💛", "⭐"];
            return (
              <span 
                key={i} 
                className="soccer-ball-particle text-xl"
                style={{
                  left: lefts[i],
                  animationDelay: `${delays[i]}s`,
                  animationDuration: `${durations[i]}s`
                }}
              >
                {icons[i]}
              </span>
            );
          })}

          {/* Taça/Bola de Futebol no Canto Inferior Direito */}
          <div className="absolute bottom-4 right-4 w-24 h-24 trophy-element opacity-85 flex flex-col items-center justify-end">
            <svg viewBox="0 0 100 100" className="w-20 h-20 drop-shadow-xl">
              {/* Bola com Cores do Brasil */}
              <circle cx="50" cy="50" r="42" fill="#ffffff" stroke="#10b981" strokeWidth="4" />
              <polygon points="50,30 62,39 57,54 43,54 38,39" fill="#10b981" />
              <polygon points="50,70 62,61 57,46 43,46 38,61" fill="#eab308" />
              {/* Linhas de costura da bola */}
              <line x1="50" y1="8" x2="50" y2="30" stroke="#10b981" strokeWidth="3" />
              <line x1="92" y1="50" x2="62" y2="39" stroke="#10b981" strokeWidth="3" />
              <line x1="77" y1="84" x2="57" y2="54" stroke="#10b981" strokeWidth="3" />
              <line x1="23" y1="84" x2="43" y2="54" stroke="#10b981" strokeWidth="3" />
              <line x1="8" y1="50" x2="38" y2="39" stroke="#10b981" strokeWidth="3" />
            </svg>
            <span className="text-[7px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/40 px-2 py-0.5 rounded-md mt-1 shadow-sm">
              Copa do Brasil
            </span>
          </div>
        </>
      )}
    </div>
  );
}
