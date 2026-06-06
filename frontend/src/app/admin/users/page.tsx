"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { api, getStaticUrl } from "@/utils/api";

interface User {
  id: number; name: string; email: string; role: string;
  seller_limit: number; brand_color: string; logo_url: string;
  avatar_url: string; is_temporary_password: boolean;
  sidebar_color?: string; sidebar_color_secondary?: string; highlight_color?: string;
  active?: boolean; phone?: string;
  subscription_expires_at?: string; users_count?: number;
  promotora_id?: number;
  simulations_count?: number;
  last_access?: string;
  broker_name?: string;
}

function getDaysLeft(expiresAt?: string): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loggedUser, setLoggedUser] = useState<any>({ role: 'vendedor' });
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    try { const u = localStorage.getItem('user'); if (u) setLoggedUser(JSON.parse(u)); } catch(e) {}
  }, []);

  const [formData, setFormData] = useState<any>({
    name: "", email: "", role: "corretor", password: "",
    seller_limit: 0, brand_color: "#2563eb", sidebar_color: "#0f172a",
    sidebar_color_secondary: "#1e293b", highlight_color: "#2563eb", logo_url: "", avatar_url: "",
    is_temporary_password: true, active: true, phone: ""
  });
  
  // Ícones Premium SVG
  const Icons = {
    Lock: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
    ),
    Unlock: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
    ),
    Trash: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
    ),
    Search: () => (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
    )
  };

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try { setLoading(true); const data = await api.get("/admin/users"); setUsers(data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const maskPhone = (v: string) => {
    const n = v.replace(/\D/g, "").slice(0, 11);
    if (n.length <= 2) return n.length > 0 ? `(${n}` : "";
    if (n.length <= 6) return `(${n.slice(0,2)}) ${n.slice(2)}`;
    if (n.length <= 10) return `(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`;
    return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`;
  };

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = ""; for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setFormData({ ...formData, password: pass, is_temporary_password: true });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024 * 2) { alert("Máximo 2MB."); return; }
    const reader = new FileReader();
    reader.onloadend = () => setFormData({ ...formData, avatar_url: reader.result as string, logo_url: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleOpenModal = (user: User | null = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({ name: user.name, email: user.email, role: user.role, password: "",
        seller_limit: user.seller_limit || 0, brand_color: user.brand_color || "#2563eb",
        sidebar_color: user.sidebar_color || "#0f172a", sidebar_color_secondary: user.sidebar_color_secondary || "#1e293b",
        highlight_color: user.highlight_color || user.brand_color || "#2563eb",
        logo_url: user.logo_url || "", avatar_url: user.avatar_url || "",
        is_temporary_password: user.is_temporary_password ?? true,
        active: user.active ?? true, phone: user.phone || "" });
    } else {
      setEditingUser(null);
      setFormData({ name: "", email: "", role: "corretor", password: "", seller_limit: 0,
        brand_color: "#2563eb", sidebar_color: "#0f172a", sidebar_color_secondary: "#1e293b", highlight_color: "#2563eb",
        logo_url: "", avatar_url: "", is_temporary_password: true, active: true, phone: "" });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      if (editingUser) {
        const updateData = { ...formData }; if (!updateData.password) delete updateData.password;
        await api.patch(`/admin/users/${editingUser.id}`, updateData);
        if (loggedUser?.id === editingUser.id) {
          const nu = { ...loggedUser, ...updateData }; localStorage.setItem('user', JSON.stringify(nu));
          setLoggedUser(nu); window.dispatchEvent(new Event('user-updated'));
        }
      } else {
        if (!formData.password) { alert("Senha é obrigatória."); setIsSubmitting(false); return; }
        await api.post("/admin/users", formData);
      }
      setModalOpen(false); setEditingUser(null); loadUsers();
    } catch (e) { console.error(e); } finally { setIsSubmitting(false); }
  };

  const handleToggleBlock = async (user: User) => {
    const newActive = !user.active;
    const msg = newActive ? `Reativar ${user.name}?` : `Bloquear ${user.name}? ${user.role === 'promotora' ? 'Todos os usuários da promotora também serão bloqueados.' : ''}`;
    if (!window.confirm(msg)) return;
    try {
      await api.patch(`/admin/users/${user.id}`, { active: newActive,
        ...(newActive && user.role === 'promotora' ? { subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() } : {})
      });
      loadUsers();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Remover usuário?")) return;
    try { await api.delete(`/admin/users/${id}`); loadUsers(); } catch (e) { console.error(e); }
  };

  const filteredUsers = users.filter(u => {
    const ms = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const mr = roleFilter === "all" || u.role === roleFilter;
    return ms && mr;
  });

  if (loggedUser.role === 'vendedor' || loggedUser.role === 'corretor') {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center text-3xl mb-6 border border-red-100">🚫</div>
        <h2 className="text-2xl font-black text-slate-800 uppercase">Acesso Restrito</h2>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <PageHeader 
        title="Gestão de" 
        highlight="Equipe" 
        subtitle="Administre permissões, limites e assinaturas dos usuários."
      />
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-full">
          <div className="relative flex-1 md:w-64 group">
            <input type="text" placeholder="PESQUISAR..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full py-3.5 pl-14 pr-6 bg-white dark:bg-slate-900 rounded-2xl border-none shadow-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 ring-blue-500/20" />
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <Icons.Search />
            </span>
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full md:w-48 py-3.5 px-6 bg-white dark:bg-slate-900 rounded-2xl border-none shadow-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 ring-blue-500/20">
            <option value="all">TODOS</option>
            <option value="admin">ADMINISTRADORES</option>
            <option value="promotora">PROMOTORAS</option>
            <option value="corretor">CORRETORES</option>
            <option value="vendedor">VENDEDORES</option>
          </select>
          <button onClick={() => handleOpenModal()}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 px-8 rounded-2xl shadow-2xl shadow-blue-500/40 hover:-translate-y-1 text-[10px] uppercase tracking-widest flex items-center gap-2">
            👤 Novo Usuário
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden border border-slate-100 dark:border-white/10 shadow-2xl">
        <div className="px-8 py-6 bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Colaboradores</h3>
          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">{filteredUsers.length} Encontrados</span>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-20 text-center">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 rounded-[3rem] m-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum colaborador encontrado</p>
            </div>
          ) : filteredUsers.map(user => {
            const daysLeft = getDaysLeft(user.subscription_expires_at);
            const isPromo = user.role === 'promotora';
            const isBlocked = user.active === false;
            const usedUsers = users.filter(u => u.promotora_id === user.id).length;
            return (
              <div key={user.id} className={`bg-slate-50 dark:bg-white/5 p-6 rounded-[2.5rem] border transition-all group relative overflow-hidden ${isBlocked ? 'border-red-200 dark:border-red-900/30 bg-red-50/30' : 'border-slate-100 dark:border-white/5 hover:border-blue-500/30'}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden border-2 border-white dark:border-slate-800 shadow-xl">
                      {(user.avatar_url || user.logo_url) ? (
                        <img src={getStaticUrl(user.avatar_url || user.logo_url)} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-xl text-white" style={{ backgroundColor: user.brand_color || '#3b82f6' }}>
                          {user.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${isBlocked ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                      user.role === 'admin' ? 'bg-purple-500 text-white border-purple-400' :
                      user.role === 'promotora' ? 'bg-blue-600 text-white border-blue-500' :
                      user.role === 'corretor' ? 'bg-amber-500 text-white border-amber-400' :
                      'bg-slate-500 text-white border-slate-400'
                    }`}>{user.role}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${isBlocked ? 'bg-red-100 text-red-600 border-red-200' : 'bg-emerald-100 text-emerald-600 border-emerald-200'}`}>
                      {isBlocked ? '🚫 Bloqueado' : '✅ Ativo'}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="mb-4 space-y-1">
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight line-clamp-1">{user.name}</h4>
                  <p className="text-[10px] font-mono text-slate-400">{user.email}</p>
                  {user.phone && (
                    <p className="text-[10px] font-mono text-slate-500 flex items-center gap-1">📱 {user.phone}</p>
                  )}
                  <div className="pt-2 flex flex-col gap-0.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Criado por: <span className="text-blue-500">{user.broker_name || 'Sistema'}</span>
                    </p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Simulações: <span className="text-blue-500">{user.simulations_count || 0}</span>
                    </p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Último Acesso: <span className="text-slate-500">{user.last_access ? new Date(user.last_access).toLocaleString('pt-BR') : 'NUNCA'}</span>
                    </p>
                  </div>
                </div>

                {/* Promotora Info */}
                {isPromo && (
                  <div className="mb-4 space-y-2">
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-white/10">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Usuários da Promotora</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800 dark:text-white">{usedUsers} <span className="text-slate-400 font-medium">/ {user.seller_limit || '∞'}</span></span>
                        {user.seller_limit > 0 && (
                          <div className="flex-1 mx-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, (usedUsers / user.seller_limit) * 100)}%` }}></div>
                          </div>
                        )}
                      </div>
                    </div>
                    {daysLeft !== null && (
                      <div className={`p-3 rounded-2xl border ${daysLeft <= 5 ? 'bg-red-50 border-red-100' : daysLeft <= 10 ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
                        <p className="text-[8px] font-black uppercase tracking-widest mb-1 ${daysLeft <= 5 ? 'text-red-400' : daysLeft <= 10 ? 'text-amber-500' : 'text-emerald-500'}">Renovação da Assinatura</p>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{daysLeft <= 5 ? '🔴' : daysLeft <= 10 ? '🟡' : '🟢'}</span>
                          <span className={`text-sm font-black ${daysLeft <= 5 ? 'text-red-600' : daysLeft <= 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {daysLeft === 0 ? 'EXPIRADO' : `${daysLeft} dias restantes`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => handleOpenModal(user)} className="flex-1 py-2.5 bg-white dark:bg-white/5 hover:bg-blue-600 hover:text-white text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border border-slate-200 dark:border-white/5">Configurar</button>
                  <button 
                    onClick={() => handleToggleBlock(user)} 
                    className={`w-10 h-10 rounded-2xl transition-all border flex items-center justify-center ${
                      isBlocked 
                        ? 'bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border-red-200' 
                        : 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border-emerald-200'
                    }`}
                    title={isBlocked ? "Desbloquear Usuário" : "Bloquear Usuário"}
                  >
                    {isBlocked ? <Icons.Lock /> : <Icons.Unlock />}
                  </button>
                  <button onClick={() => handleDelete(user.id)} className="w-10 h-10 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl transition-all border border-red-500/20 flex items-center justify-center">
                    <Icons.Trash />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setModalOpen(false); setEditingUser(null); }}></div>
          <div className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-up border border-white/20">
            <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-800 text-base uppercase tracking-tight">{editingUser ? "Editar Perfil" : "Novo Colaborador"}</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Definições de Acesso e Marca</p>
              </div>
              <button onClick={() => { setModalOpen(false); setEditingUser(null); }} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-400 hover:text-red-500 text-2xl">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Dados Principais</h4>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="input-admin !rounded-2xl !bg-slate-50 border-none shadow-inner" placeholder="NOME COMPLETO" />
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="input-admin !rounded-2xl !bg-slate-50 border-none shadow-inner" placeholder="E-MAIL" />
                  <input type="text" value={formData.phone || ""} onChange={(e) => setFormData({...formData, phone: maskPhone(e.target.value)})} className="input-admin !rounded-2xl !bg-slate-50 border-none shadow-inner font-mono" placeholder="TELEFONE/WHATSAPP" />
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Papel</label>
                    <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="input-admin !rounded-2xl !bg-slate-50 border-none shadow-inner">
                      <option value="promotora">PROMOTORA</option>
                      <option value="corretor">CORRETOR</option>
                      <option value="vendedor">VENDEDOR</option>
                      <option value="admin">ADMINISTRADOR MASTER</option>
                    </select>
                  </div>
                  {formData.role === 'promotora' && (
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Limite de Usuários</label>
                      <input type="number" value={formData.seller_limit} onChange={(e) => setFormData({...formData, seller_limit: parseInt(e.target.value)})} className="input-admin !rounded-2xl !bg-slate-50 border-none shadow-inner" placeholder="0 = ilimitado" />
                    </div>
                  )}
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Senha</label>
                    <div className="flex gap-2">
                      <input type="text" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="input-admin flex-1 !rounded-2xl !bg-slate-50 border-none shadow-inner" placeholder={editingUser ? "NOVA SENHA (OPCIONAL)" : "DEFINIR SENHA"} />
                      <button type="button" onClick={generateRandomPassword} className="w-12 bg-slate-100 rounded-2xl flex items-center justify-center hover:bg-slate-200">🎲</button>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Personalização</h4>
                  <div className="flex flex-col items-center p-6 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                    <div className="w-28 h-28 rounded-[2rem] overflow-hidden shadow-2xl mb-4 relative border-4 border-white dark:border-slate-800" style={{ backgroundColor: formData.brand_color }}>
                      {(formData.avatar_url || formData.logo_url) ? (
                        <img src={getStaticUrl(formData.avatar_url || formData.logo_url) || formData.avatar_url} className="w-full h-full object-cover" style={{ backgroundColor: formData.brand_color }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-3xl text-white">{formData.name?.charAt(0) || '?'}</div>
                      )}
                    </div>
                    <label className="cursor-pointer bg-blue-600 text-white px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all">
                      Alterar Foto <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                    </label>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">1. Cor de Fundo do Menu</label>
                    <div className="flex gap-3">
                      <input type="color" value={formData.sidebar_color} onChange={(e) => setFormData({...formData, sidebar_color: e.target.value})} className="w-12 h-12 rounded-2xl p-1 bg-white shadow-sm border-none cursor-pointer" />
                      <input type="text" value={formData.sidebar_color} onChange={(e) => setFormData({...formData, sidebar_color: e.target.value})} className="input-admin flex-1 !rounded-2xl !bg-slate-50 border-none shadow-inner font-mono text-xs" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">2. Cor Secundária do Menu (Botões/Janelas)</label>
                    <div className="flex gap-3">
                      <input type="color" value={formData.sidebar_color_secondary} onChange={(e) => setFormData({...formData, sidebar_color_secondary: e.target.value})} className="w-12 h-12 rounded-2xl p-1 bg-white shadow-sm border-none cursor-pointer" />
                      <input type="text" value={formData.sidebar_color_secondary} onChange={(e) => setFormData({...formData, sidebar_color_secondary: e.target.value})} className="input-admin flex-1 !rounded-2xl !bg-slate-50 border-none shadow-inner font-mono text-xs" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">3. Cor dos Botões do Sistema</label>
                    <div className="flex gap-3">
                      <input type="color" value={formData.brand_color} onChange={(e) => setFormData({...formData, brand_color: e.target.value})} className="w-12 h-12 rounded-2xl p-1 bg-white shadow-sm border-none cursor-pointer" />
                      <input type="text" value={formData.brand_color} onChange={(e) => setFormData({...formData, brand_color: e.target.value})} className="input-admin flex-1 !rounded-2xl !bg-slate-50 border-none shadow-inner font-mono text-xs" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">4. Cor da Fonte de Destaque</label>
                    <div className="flex gap-3">
                      <input type="color" value={formData.highlight_color} onChange={(e) => setFormData({...formData, highlight_color: e.target.value})} className="w-12 h-12 rounded-2xl p-1 bg-white shadow-sm border-none cursor-pointer" />
                      <input type="text" value={formData.highlight_color} onChange={(e) => setFormData({...formData, highlight_color: e.target.value})} className="input-admin flex-1 !rounded-2xl !bg-slate-50 border-none shadow-inner font-mono text-xs" />
                    </div>
                  </div>
                  <button type="button" onClick={() => setFormData({...formData, active: !formData.active})}
                    className={`w-full py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest border flex items-center justify-center gap-3 ${formData.active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    {formData.active ? '🟢 USUÁRIO ATIVO' : '🚫 ACESSO BLOQUEADO'}
                  </button>
                </div>
              </div>
              <div className="flex gap-4 pt-8">
                <button type="button" onClick={() => { setModalOpen(false); setEditingUser(null); }} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase text-slate-400 bg-slate-50 hover:bg-slate-100">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase text-white bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-500/30 disabled:opacity-50">
                  {isSubmitting ? "SALVANDO..." : "CONFIRMAR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
