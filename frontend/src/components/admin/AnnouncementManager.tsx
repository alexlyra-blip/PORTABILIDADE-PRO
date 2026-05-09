"use client";

import { useState } from "react";
import { api } from "@/utils/api";

export default function AnnouncementManager() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return;
    
    setLoading(true);
    setSuccess(false);
    try {
      await api.post('/admin/announcements', {
        title: title || "Comunicado Oficial",
        message: message,
        active: true
      });
      setSuccess(true);
      setTitle("");
      setMessage("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Erro ao enviar comunicado:", err);
      alert("Erro ao enviar comunicado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/10 shadow-xl flex flex-col group hover:shadow-2xl transition-all duration-500">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-8 flex items-center gap-2">
        <span className="w-4 h-1 bg-blue-600 rounded-full"></span>
        Comunicado Global
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Título do Alerta</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Atualização Crítica de Tabelas"
            className="w-full px-5 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl text-xs focus:ring-4 focus:ring-blue-500/20 outline-none transition-all font-bold dark:text-white"
          />
        </div>
        
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Mensagem do Comunicado <span className="text-red-500">*</span></label>
          <textarea 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite aqui o texto que será exibido para todos os usuários..."
            rows={4}
            className="w-full px-5 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl text-xs focus:ring-4 focus:ring-blue-500/20 outline-none transition-all resize-none font-bold text-slate-700 dark:text-slate-200"
            required
          ></textarea>
        </div>
        
        <button 
          type="submit"
          disabled={loading || !message}
          className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-500 shadow-2xl ${
            success 
              ? "bg-emerald-500 text-white shadow-emerald-500/40" 
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/40 hover:-translate-y-1"
          } disabled:opacity-50 active:scale-95`}
        >
          {loading ? "Processando..." : success ? "✓ Publicado com Sucesso!" : "Publicar Alerta Agora"}
        </button>
      </form>
    </div>
  );
}
