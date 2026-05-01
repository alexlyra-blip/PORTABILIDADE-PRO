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
    <div className="admin-card p-8 border-l-4 border-l-blue-600 bg-white shadow-sm rounded-2xl">
      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
        <span className="text-xl">📢</span> Enviar Comunicado Global
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Título (Opcional)</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Atualização de Tabelas"
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
          />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mensagem <span className="text-red-500">*</span></label>
          <textarea 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite a mensagem que aparecerá para os usuários ao entrarem no sistema..."
            rows={3}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none font-medium text-slate-700"
            required
          ></textarea>
        </div>
        
        <button 
          type="submit"
          disabled={loading || !message}
          className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
            success 
              ? "bg-green-500 text-white" 
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40"
          } disabled:opacity-50`}
        >
          {loading ? "Enviando..." : success ? "✓ Comunicado Enviado!" : "Publicar Comunicado"}
        </button>
      </form>
    </div>
  );
}
