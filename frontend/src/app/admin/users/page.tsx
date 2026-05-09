"use client";

import { useEffect, useState } from "react";
import { api, getStaticUrl } from "@/utils/api";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  seller_limit: number;
  brand_color: string;
  logo_url: string;
  avatar_url: string;
  is_temporary_password: boolean;
  sidebar_color?: string;
  sidebar_color_secondary?: string;
  active?: boolean;
  phone?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loggedUser, setLoggedUser] = useState<any>({ role: 'vendedor' });

  useEffect(() => {
    try {
      const u = localStorage.getItem('user');
      if (u) setLoggedUser(JSON.parse(u));
    } catch(e) {}
  }, []);
  
  interface FormData {
    name: string;
    email: string;
    role: string;
    password?: string;
    seller_limit: number;
    brand_color: string;
    sidebar_color: string;
    sidebar_color_secondary: string;
    logo_url: string;
    avatar_url: string;
    is_temporary_password: boolean;
    active: boolean;
    phone?: string;
  }

  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    role: "corretor",
    password: "",
    seller_limit: 0,
    brand_color: "#2563eb",
    sidebar_color: "#0f172a",
    sidebar_color_secondary: "",
    logo_url: "",
    avatar_url: "",
    is_temporary_password: true,
    active: true,
    phone: ""
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.get("/admin/users");
      setUsers(data);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    } finally {
      setLoading(false);
    }
  };

  const maskPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    const trimmed = numbers.slice(0, 11);
    if (trimmed.length <= 2) return trimmed.length > 0 ? `(${trimmed}` : "";
    if (trimmed.length <= 6) return `(${trimmed.slice(0, 2)}) ${trimmed.slice(2)}`;
    if (trimmed.length <= 10) return `(${trimmed.slice(0, 2)}) ${trimmed.slice(2, 6)}-${trimmed.slice(6)}`;
    return `(${trimmed.slice(0, 2)}) ${trimmed.slice(2, 7)}-${trimmed.slice(7)}`;
  };

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password: pass, is_temporary_password: true });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024 * 2) {
        alert("A imagem deve ter no máximo 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar_url: reader.result as string, logo_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    setFormData((prev) => ({...prev, logo_url: "", avatar_url: ""}));
  };

  const handleOpenModal = (user: User | null = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        password: "",
        seller_limit: user.seller_limit || 0,
        brand_color: user.brand_color || "#2563eb",
        sidebar_color: user.sidebar_color || "#0f172a",
        sidebar_color_secondary: user.sidebar_color_secondary || "",
        logo_url: user.logo_url || "",
        avatar_url: user.avatar_url || "",
        is_temporary_password: user.is_temporary_password !== undefined ? user.is_temporary_password : true,
        active: user.active !== undefined ? user.active : true,
        phone: user.phone || ""
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: "",
        email: "",
        role: "corretor",
        password: "",
        seller_limit: 0,
        brand_color: "#2563eb",
        sidebar_color: "#0f172a",
        sidebar_color_secondary: "",
        logo_url: "",
        avatar_url: "",
        is_temporary_password: true,
        active: true,
        phone: ""
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingUser) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        await api.patch(`/admin/users/${editingUser.id}`, updateData);
        if (loggedUser && loggedUser.id === editingUser.id) {
          const newLocalUser = { ...loggedUser, ...updateData };
          localStorage.setItem('user', JSON.stringify(newLocalUser));
          setLoggedUser(newLocalUser);
          window.dispatchEvent(new Event('user-updated'));
        }
      } else {
        if (!formData.password) {
          alert("Senha é obrigatória.");
          setIsSubmitting(false);
          return;
        }
        await api.post("/admin/users", formData);
      }
      handleCloseModal();
      loadUsers();
    } catch (error) {
      console.error("Erro ao salvar usuário:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Remover usuário?")) return;
    try {
      await api.delete(`/admin/users/${id}`);
      loadUsers();
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loggedUser.role === 'vendedor' || loggedUser.role === 'corretor') {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center animate-fade-in">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center text-3xl mb-6 border border-red-100 shadow-2xl shadow-red-500/10">🚫</div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Acesso Restrito</h2>
        <p className="text-slate-400 font-medium mt-2">Você não possui permissão para gerenciar a equipe.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Gestão de Equipe</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Administre permissões, limites e identidades visuais dos usuários.</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="relative flex-1 md:w-64 group">
            <input 
              type="text" 
              placeholder="PESQUISAR NOME OU EMAIL..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full py-3.5 pl-12 pr-6 bg-white dark:bg-slate-900 rounded-2xl border-none shadow-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 ring-blue-500/20 transition-all"
            />
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">🔍</span>
          </div>

          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full md:w-48 py-3.5 px-6 bg-white dark:bg-slate-900 rounded-2xl border-none shadow-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 ring-blue-500/20 transition-all"
          >
            <option value="all">TODOS OS PAPÉIS</option>
            <option value="admin">ADMINISTRADORES</option>
            <option value="promotora">PROMOTORAS</option>
            <option value="corretor">CORRETORES</option>
            <option value="vendedor">VENDEDORES</option>
          </select>

          <button 
            onClick={() => handleOpenModal()}
            className="w-full md:w-auto relative overflow-hidden bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 px-8 rounded-2xl transition-all shadow-2xl shadow-blue-500/40 hover:-translate-y-1 active:scale-95 text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 group"
          >
            <span className="text-base group-hover:rotate-90 transition-transform duration-300">👤</span> 
            Novo Usuário
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
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
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando usuários...</p>
              </div>
           ) : filteredUsers.length === 0 ? (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 rounded-[3rem] m-4">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum colaborador encontrado para os filtros selecionados</p>
              </div>
           ) : filteredUsers.map(user => (
              <div key={user.id} className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 hover:border-blue-500/30 transition-all group relative overflow-hidden">
                 <div className="flex items-start justify-between mb-6">
                    <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden border-2 border-white dark:border-slate-800 shadow-xl shadow-slate-200 dark:shadow-none relative">
                       {(user.avatar_url || user.logo_url) ? (
                          <img src={getStaticUrl(user.avatar_url || user.logo_url)} className="w-full h-full object-cover" />
                       ) : (
                          <div className="w-full h-full flex items-center justify-center font-black text-xl text-white" style={{ backgroundColor: user.brand_color || '#3b82f6' }}>
                             {user.name.charAt(0)}
                          </div>
                       )}
                       <div className={`absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-white ${user.active !== false ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm border ${
                          user.role === 'admin' ? 'bg-purple-500 text-white border-purple-400' :
                          user.role === 'promotora' ? 'bg-blue-600 text-white border-blue-500' :
                          user.role === 'corretor' ? 'bg-amber-500 text-white border-amber-400' :
                          'bg-slate-500 text-white border-slate-400'
                       }`}>
                          {user.role}
                       </span>
                    </div>
                 </div>

                 <div className="mb-6">
                    <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight line-clamp-1">{user.name}</h4>
                    <p className="text-[10px] font-medium text-slate-400 font-mono mt-1">{user.email}</p>
                 </div>

                 <div className="flex gap-2">
                    <button onClick={() => handleOpenModal(user)} className="flex-1 py-3 bg-white dark:bg-white/5 hover:bg-blue-600 hover:text-white text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border border-slate-200 dark:border-white/5">Configurar</button>
                    <button onClick={() => handleDelete(user.id)} className="w-12 h-12 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl transition-all border border-red-500/20 flex items-center justify-center">🗑️</button>
                 </div>
              </div>
           ))}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-up border border-white/20">
            <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-800 text-base uppercase tracking-tight">{editingUser ? "Editar Perfil" : "Novo Colaborador"}</h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Definições de Acesso e Marca</p>
              </div>
              <button onClick={handleCloseModal} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-400 hover:text-red-500 transition-colors text-2xl">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Dados Principais</h4>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="input-admin !rounded-2xl !bg-slate-50 border-none shadow-inner" placeholder="NOME COMPLETO" />
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="input-admin !rounded-2xl !bg-slate-50 border-none shadow-inner" placeholder="E-MAIL CORPORATIVO" />
                  <input type="text" value={formData.phone || ""} onChange={(e) => setFormData({...formData, phone: maskPhone(e.target.value)})} className="input-admin !rounded-2xl !bg-slate-50 border-none shadow-inner font-mono" placeholder="TELEFONE/WHATSAPP" />
                  
                  <div className="pt-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Papel no Sistema</label>
                    <select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} className="input-admin !rounded-2xl !bg-slate-50 border-none shadow-inner">
                      <option value="promotora">PROMOTORA</option>
                      <option value="corretor">CORRETOR</option>
                      <option value="vendedor">VENDEDOR</option>
                      <option value="admin">ADMINISTRADOR MASTER</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Segurança</label>
                    <div className="flex gap-2">
                      <input type="text" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="input-admin flex-1 !rounded-2xl !bg-slate-50 border-none shadow-inner" placeholder={editingUser ? "NOVA SENHA (OPCIONAL)" : "DEFINIR SENHA"} />
                      <button type="button" onClick={generateRandomPassword} className="w-12 bg-slate-100 rounded-2xl flex items-center justify-center hover:bg-slate-200 transition-colors">🎲</button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Personalização</h4>
                  <div className="flex flex-col items-center p-6 bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                    <div className="w-24 h-24 rounded-[1.5rem] overflow-hidden border-4 border-white shadow-2xl mb-4 bg-slate-200 relative">
                       {(formData.avatar_url || formData.logo_url) ? (
                          <img src={getStaticUrl(formData.avatar_url || formData.logo_url) || formData.avatar_url} className="w-full h-full object-cover" />
                       ) : (
                          <div className="w-full h-full flex items-center justify-center font-black text-2xl text-white" style={{ backgroundColor: formData.brand_color }}>{formData.name?.charAt(0)}</div>
                       )}
                    </div>
                    <label className="cursor-pointer bg-blue-600 text-white px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 hover:scale-105 transition-all">
                       Alterar Foto
                       <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                    </label>
                    {(formData.avatar_url || formData.logo_url) && (
                       <button type="button" onClick={handleRemovePhoto} className="mt-2 text-[8px] font-black text-red-500 uppercase tracking-widest hover:underline">Remover Foto</button>
                    )}
                  </div>

                  <div className="pt-4 space-y-4">
                    <div>
                       <label className="text-[9px] font-black text-slate-400 uppercase mb-2 block">Cor Principal da Marca</label>
                       <div className="flex gap-3">
                          <input type="color" value={formData.brand_color} onChange={(e) => setFormData({...formData, brand_color: e.target.value})} className="w-12 h-12 rounded-2xl p-1 bg-white shadow-sm border-none cursor-pointer" />
                          <input type="text" value={formData.brand_color} onChange={(e) => setFormData({...formData, brand_color: e.target.value})} className="input-admin flex-1 !rounded-2xl !bg-slate-50 border-none shadow-inner font-mono text-xs" />
                       </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, active: !formData.active})}
                      className={`w-full py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all border flex items-center justify-center gap-3 ${
                        formData.active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                      }`}
                    >
                      {formData.active ? '🟢 USUÁRIO ATIVO' : '🚫 ACESSO BLOQUEADO'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-8">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/30">
                  {isSubmitting ? "SALVANDO..." : "CONFIRMAR ALTERAÇÕES"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
