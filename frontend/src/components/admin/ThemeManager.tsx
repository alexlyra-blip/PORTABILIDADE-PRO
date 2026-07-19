"use client";

import { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { getActiveTheme, invalidateThemeCache, primeActiveTheme } from "@/utils/globalDataCache";

export default function ThemeManager() {
  const [activeTheme, setActiveTheme] = useState("default");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchTheme = async () => {
    try {
      const res = await getActiveTheme();
      if (res && res.theme) {
        setActiveTheme(res.theme);
      }
    } catch (err) {
      console.error("Erro ao carregar tema ativo:", err);
    }
  };

  useEffect(() => {
    fetchTheme();
  }, []);

  const handleSelectTheme = async (theme: string) => {
    setLoading(true);
    setSuccess(false);
    try {
      const res = await api.post("/admin/active-theme", { theme });
      if (res && res.theme) {
        setActiveTheme(res.theme);

        // Invalida o cache do tema, atualiza localStorage e popula o cache com o novo valor
        invalidateThemeCache();
        primeActiveTheme(res);
        localStorage.setItem("active_theme", res.theme);

        // Dispara evento para atualizar imediatamente na página atual e outras abas
        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("theme-updated"));
        
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
    } catch (err) {
      console.error("Erro ao salvar tema:", err);
      alert("Falha ao salvar configuração do tema.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/10 shadow-xl flex flex-col group hover:shadow-2xl transition-all duration-500">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-6 flex items-center gap-2">
        <span className="w-4 h-1 bg-indigo-600 rounded-full"></span>
        Tema Temático da Plataforma
      </h3>

      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
        Selecione um tema festivo para decorar o sistema de todos os usuários. As cores da marca e logotipos principais serão preservados.
      </p>

      <div className="space-y-4">
        {/* Tema Padrão */}
        <button
          onClick={() => handleSelectTheme("default")}
          disabled={loading}
          className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${
            activeTheme === "default"
              ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-500/10 dark:border-indigo-500 shadow-sm"
              : "border-slate-100 dark:border-white/5 bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10"
          }`}
        >
          <div>
            <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase">Tema Padrão</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Nenhuma decoração ativa</p>
          </div>
          <span className="text-xl shrink-0">💻</span>
        </button>

        {/* Tema São João */}
        <button
          onClick={() => handleSelectTheme("sao_joao")}
          disabled={loading}
          className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${
            activeTheme === "sao_joao"
              ? "border-orange-500 bg-orange-50/50 dark:bg-orange-500/10 dark:border-orange-500 shadow-sm"
              : "border-slate-100 dark:border-white/5 bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10"
          }`}
        >
          <div>
            <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase flex items-center gap-1.5">
              São João
              {activeTheme === "sao_joao" && (
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              )}
            </h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Bandeirinhas, fogueira e balões</p>
          </div>
          <span className="text-xl shrink-0">🔥</span>
        </button>

        {/* Tema Copa do Mundo */}
        <button
          onClick={() => handleSelectTheme("copa_mundo")}
          disabled={loading}
          className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between group ${
            activeTheme === "copa_mundo"
              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 dark:border-emerald-500 shadow-sm"
              : "border-slate-100 dark:border-white/5 bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10"
          }`}
        >
          <div>
            <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase flex items-center gap-1.5">
              Copa do Mundo
              {activeTheme === "copa_mundo" && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              )}
            </h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Faixas e bolas nas cores do Brasil</p>
          </div>
          <span className="text-xl shrink-0">⚽</span>
        </button>
      </div>

      {success && (
        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest text-center mt-4 animate-pulse">
          ✓ Configuração salva com sucesso!
        </span>
      )}
    </div>
  );
}
