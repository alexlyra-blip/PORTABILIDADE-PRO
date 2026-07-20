"use client";

import { useState, useEffect } from "react";
import { api, getStaticUrl } from "@/utils/api";
import { useToast } from "@/components/ToastProvider";

export default function AnnouncementManager() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchAnnouncements = async () => {
    try {
      const data = await api.get('/admin/announcements');
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao buscar comunicados:", err);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 3 * 1024 * 1024) {
      toast.warning("A imagem não pode ser maior que 3MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        setImageUrl(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message && !imageUrl) {
      toast.warning("Por favor, digite uma mensagem ou anexe um card de imagem.");
      return;
    }
    
    setLoading(true);
    setSuccess(false);
    try {
      const payload = {
        title: title || (imageUrl ? "Novo Card Informativo" : "Comunicado Oficial"),
        message: message || "Veja o card anexo abaixo.",
        image_url: imageUrl || null,
        active: true
      };
      
      if (editingId) {
        const original = announcements.find(a => a.id === editingId);
        payload.active = original ? original.active : true;
        await api.patch(`/admin/announcements/${editingId}`, payload);
      } else {
        await api.post('/admin/announcements', payload);
      }
      
      setSuccess(true);
      setTitle("");
      setMessage("");
      setImageUrl("");
      setEditingId(null);
      await fetchAnnouncements();
      
      // Notifica Header/Popup que houve alterações
      window.dispatchEvent(new Event('storage'));
      toast.success("Comunicado salvo com sucesso!");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Erro ao salvar comunicado:", err);
      toast.error("Erro ao salvar comunicado.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditInit = (ann: any) => {
    setEditingId(ann.id);
    setTitle(ann.title || "");
    setMessage(ann.message || "");
    setImageUrl(ann.image_url || "");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setMessage("");
    setImageUrl("");
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja excluir este comunicado permanentemente?")) {
      return;
    }
    try {
      await api.delete(`/admin/announcements/${id}`);
      if (editingId === id) {
        handleCancelEdit();
      }
      await fetchAnnouncements();
      window.dispatchEvent(new Event('storage'));
      toast.success("Comunicado excluído!");
    } catch (err) {
      console.error("Erro ao excluir comunicado:", err);
      toast.error("Erro ao excluir comunicado.");
    }
  };

  const handleToggleActive = async (ann: any) => {
    try {
      await api.patch(`/admin/announcements/${ann.id}`, {
        active: !ann.active
      });
      await fetchAnnouncements();
      window.dispatchEvent(new Event('storage'));
      toast.success("Status do comunicado atualizado!");
    } catch (err) {
      console.error("Erro ao alterar status do comunicado:", err);
      toast.error("Erro ao alterar status.");
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/10 shadow-xl flex flex-col group hover:shadow-2xl transition-all duration-500">
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-8 flex items-center gap-2">
        <span className="w-4 h-1 bg-blue-600 rounded-full"></span>
        {editingId ? "Editar Comunicado" : "Comunicado Global / Card Popup"}
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
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Mensagem do Comunicado</label>
          <textarea 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite aqui o texto que será exibido para todos os usuários..."
            rows={3}
            className="w-full px-5 py-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-2xl text-xs focus:ring-4 focus:ring-blue-500/20 outline-none transition-all resize-none font-bold text-slate-700 dark:text-slate-200"
          ></textarea>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Card em Formato de Imagem (Popup)</label>
          <div className="flex items-center gap-4">
            <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 px-5 py-3 rounded-2xl border border-slate-200 dark:border-white/5 text-xs font-black text-slate-600 dark:text-slate-300 transition-colors uppercase tracking-widest">
              Anexar Card
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange}
                className="hidden" 
              />
            </label>
            {imageUrl && (
              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">✓ Card Anexado</span>
            )}
          </div>
          
          {imageUrl && (
            <div className="relative mt-4 rounded-2xl overflow-hidden border border-slate-150 dark:border-white/10 max-h-48 group shadow-inner">
              <img src={getStaticUrl(imageUrl)} className="w-full h-full object-contain bg-slate-50 dark:bg-slate-950" alt="Preview do Card" />
              <button 
                type="button" 
                onClick={() => setImageUrl("")} 
                className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                Remover Card
              </button>
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          {editingId && (
            <button 
              type="button"
              onClick={handleCancelEdit}
              className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border border-slate-200 dark:border-white/5 active:scale-95"
            >
              Cancelar
            </button>
          )}
          <button 
            type="submit"
            disabled={loading || (!message && !imageUrl)}
            className={`rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-500 shadow-2xl ${
              editingId ? "flex-1" : "w-full"
            } ${
              success 
                ? "bg-emerald-500 text-white shadow-emerald-500/40" 
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/40 hover:-translate-y-0.5"
            } disabled:opacity-50 active:scale-95 py-4`}
          >
            {loading ? "Processando..." : success ? "✓ Concluído!" : editingId ? "Salvar Alterações" : "Publicar Alerta Agora"}
          </button>
        </div>
      </form>

      {/* Histórico de Comunicados */}
      <div className="h-px bg-slate-100 dark:bg-white/5 my-8"></div>
      
      <div>
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
          Histórico de Comunicados
        </h4>
        
        {announcements.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-200 dark:border-white/5 rounded-2xl">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum comunicado cadastrado</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
            {announcements.map((ann) => (
              <div 
                key={ann.id} 
                className={`p-4 bg-slate-50 dark:bg-white/5 border rounded-2xl transition-all duration-300 flex items-center justify-between gap-4 ${
                  ann.active 
                    ? "border-blue-100 dark:border-blue-500/20 shadow-sm shadow-blue-500/5" 
                    : "border-slate-100 dark:border-white/5 opacity-75 hover:opacity-100"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {ann.image_url ? (
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-white/10">
                      <img src={getStaticUrl(ann.image_url)} className="w-full h-full object-cover" alt="Card Thumb" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 text-base">
                      📢
                    </div>
                  )}
                  <div className="min-w-0">
                    <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase truncate max-w-[120px]" title={ann.title}>
                      {ann.title}
                    </h5>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {ann.created_at ? new Date(ann.created_at).toLocaleDateString('pt-BR') : 'Sem data'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Status Toggle Badge */}
                  <button 
                    onClick={() => handleToggleActive(ann)}
                    className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all ${
                      ann.active 
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20" 
                        : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400 border border-slate-200 dark:border-white/10"
                    }`}
                    title="Clique para alternar o status ativo"
                  >
                    {ann.active ? "Ativo" : "Inativo"}
                  </button>

                  {/* Actions */}
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleEditInit(ann)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => handleDelete(ann.id)}
                      className="p-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                      title="Apagar"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
