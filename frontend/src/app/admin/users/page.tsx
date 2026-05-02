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
    e.stopPropagation();
    setFormData((prev) => ({...prev, logo_url: "", avatar_url: ""}));
    // Esvazia o input de arquivo imediatamente
    const fileInput = document.getElementById("logo-upload") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
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

        // Propagate changes if the edited user is the logged-in user
        if (loggedUser && loggedUser.id === editingUser.id) {
          const newLocalUser = { ...loggedUser, ...updateData };
          localStorage.setItem('user', JSON.stringify(newLocalUser));
          setLoggedUser(newLocalUser);
          window.dispatchEvent(new Event('user-updated'));
        }
      } else {
        if (!formData.password) {
          alert("Senha é obrigatória para novos usuários.");
          setIsSubmitting(false);
          return;
        }
        await api.post("/admin/users", formData);
      }
      handleCloseModal();
      loadUsers();
    } catch (error) {
      console.error("Erro ao salvar usuário:", error);
      alert("Erro ao salvar usuário. Verifique se o e-mail já existe.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Certeza que deseja remover este usuário?")) return;
    try {
      await api.delete(`/admin/users/${id}`);
      loadUsers();
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      alert("Erro ao excluir usuário.");
    }
  };

  // Restrição estrita de frontend (Vendedor e Corretor não acessam essa tela)
  if (loggedUser.role === 'vendedor' || loggedUser.role === 'corretor') {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center animate-fade-in">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-2xl mb-4 border border-red-100 shadow-sm">
          🚫
        </div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">Acesso Bloqueado</h2>
        <p className="text-slate-500 text-sm">Seu perfil não possui permissão para gerenciar usuários.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestão de Usuários</h1>
          <p className="text-slate-500 text-sm mt-1">Administre acessos, limites de vendedores e personalização de marca.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="btn-premium flex items-center gap-2 !py-2.5 !px-5 !rounded-xl !bg-blue-600 hover:!bg-blue-500 text-sm"
        >
          <span className="text-lg">👤</span> Novo Usuário
        </button>
      </div>

      <div className="admin-card overflow-hidden shadow-sm border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Usuários / Permissões</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={2} className="px-6 py-12 text-center text-slate-400 italic">Carregando usuários...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={2} className="px-6 py-12 text-center text-slate-400 italic">Nenhum usuário cadastrado.</td></tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      {(user.avatar_url || user.logo_url) ? (
                        <img src={getStaticUrl(user.avatar_url || user.logo_url) || ''} alt="Avatar" className="w-10 h-10 rounded-full object-cover bg-white border border-slate-200 shadow-sm" />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs border border-blue-100 uppercase shadow-inner" 
                             style={{ backgroundColor: user.brand_color + '15', color: user.brand_color || '#4f46e5' }}>
                          {user.name.substring(0, 2)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-bold text-slate-700 line-clamp-1 mr-1">{user.name}</span>
                          
                          <span className={`px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-tight shrink-0 ${
                            user.active === false 
                              ? 'bg-red-50 text-red-600 border border-red-100 shadow-sm'
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm'
                          }`}>
                            {user.active === false ? 'Bloqueado' : 'Ativo'}
                          </span>
                          
                          <span className={`px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-tight shrink-0 ${
                            user.role === 'admin' 
                              ? 'bg-purple-50 text-purple-600 border border-purple-100' 
                              : user.role === 'promotora' 
                              ? 'bg-blue-50 text-blue-600 border border-blue-100'
                              : user.role === 'corretor'
                              ? 'bg-orange-50 text-orange-600 border border-orange-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {user.role === 'admin' ? 'Administrador' : 
                             user.role === 'promotora' ? 'Promotora' : 
                             user.role === 'corretor' ? 'Corretor' : 
                             user.role === 'vendedor' ? 'Vendedor' : user.role}
                          </span>
                          {user.role === 'promotora' && (
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter shrink-0 bg-slate-50 border border-slate-100 px-2 py-1 rounded">
                              Limite: {user.seller_limit === 0 ? '∞' : user.seller_limit} Vends.
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 flex-wrap mt-2">
                           <span className="text-[10px] text-slate-400 font-mono italic">{user.email}</span>
                           {user.phone && (
                              <span className="text-[10px] text-blue-600 font-black font-mono tracking-wide bg-blue-50 px-2 py-0.5 rounded">{user.phone}</span>
                           )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(user)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseModal}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-up border border-white/20">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingUser ? "Editar Usuário" : "Novo Usuário"}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 text-2xl font-light">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Column 1: Basic Info */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 border-b pb-2">Identificação</h4>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nome Completo *</label>
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="input-admin" placeholder="Ex: João Silva" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">E-mail *</label>
                    <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="input-admin" placeholder="joao@exemplo.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Telefone</label>
                    <input 
                      type="text" 
                      value={formData.phone || ""} 
                      onChange={(e) => setFormData({...formData, phone: maskPhone(e.target.value)})} 
                      className="input-admin font-mono" 
                      placeholder="(00) 00000-0000" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Papel / Nível *</label>
                    <select 
                      disabled={loggedUser.role !== 'admin' && loggedUser.role !== 'promotora'} 
                      value={formData.role} 
                      onChange={(e) => setFormData({...formData, role: e.target.value})} 
                      className="input-admin disabled:opacity-50"
                    >
                      {loggedUser.role === 'admin' ? (
                        <>
                          <option value="promotora">Promotora (Líder de Equipe)</option>
                          <option value="corretor">Corretor (Independente)</option>
                          <option value="vendedor">Vendedor (Suporte)</option>
                          <option value="admin">Administrador Master</option>
                        </>
                      ) : (
                        <>
                          <option value="corretor">Corretor (Equipe Promotora)</option>
                          <option value="vendedor">Vendedor (Equipe de Vendas)</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Acesso Seguro</label>
                    <div className="flex gap-2">
                       <input type="text" required={!editingUser} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="input-admin flex-1" placeholder={editingUser ? "••••••••" : "Digite ou gere"} />
                       <button type="button" onClick={generateRandomPassword} className="px-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-all" title="Gerar Senha Automática">
                         🎲
                       </button>
                    </div>
                    {!editingUser && <p className="text-[9px] text-blue-500 font-bold mt-1 uppercase italic">O usuário deverá trocar a senha no primeiro acesso.</p>}
                  </div>

                  {(loggedUser.role === 'admin' || loggedUser.role === 'promotora') && (
                    <div className="pt-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Status da Conta</label>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, active: !formData.active})}
                        className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border flex items-center justify-center gap-2 ${
                          formData.active 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 shadow-sm'
                            : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100 shadow-sm'
                        }`}
                      >
                        <span className="text-sm">{formData.active ? '🟢' : '🚫'}</span>
                        {formData.active ? 'Usuário Ativo' : 'Usuário Bloqueado'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Column 2: visual & Branding */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 border-b pb-2">Identidade Visual</h4>
                  
                  <div className="flex flex-col items-center gap-4 py-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                    <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-lg bg-slate-800 relative flex items-center justify-center">
                      {(formData.avatar_url || formData.logo_url) ? (
                        <img 
                          src={getStaticUrl(formData.avatar_url || formData.logo_url) || ''} 
                          className="w-full h-full object-cover" 
                          alt="Preview Menu" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-4xl text-white shadow-inner" style={{ backgroundColor: formData.brand_color || '#3b82f6' }}>
                          {formData.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                      )}
                    </div>
                    
                    <div className="w-full px-4">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">
                        Foto de Perfil / Menu (Max 2MB)
                      </label>
                      <div className="flex flex-col items-center gap-3">
                        <input 
                          id="logo-upload"
                          type="file" 
                          accept="image/*" 
                          onChange={handleLogoUpload} 
                          className="text-xs text-slate-500 file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer" 
                        />
                        {(formData.avatar_url || formData.logo_url) && (
                          <button 
                            type="button" 
                            onClick={handleRemovePhoto} 
                            className="px-4 py-2 flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-red-600 rounded-xl transition-all border border-red-100 font-bold text-[10px] uppercase tracking-widest shadow-sm"
                            title="Remover Imagem"
                          >
                            🗑️ Excluir Foto Permanentemente
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Management & Branding (Admin Only) */}
                  {loggedUser.role === 'admin' && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Limite de Vendedores</label>
                        <input type="number" min="0" value={formData.seller_limit} onChange={(e) => setFormData({...formData, seller_limit: parseInt(e.target.value)})} className="input-admin" />
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Cores da Marca</label>
                        <div className="space-y-3">
                          <div className="flex gap-3 items-center">
                            <div className="w-12 text-[9px] font-bold text-slate-400 uppercase">Marca</div>
                            <input type="color" value={formData.brand_color} onChange={(e) => setFormData({...formData, brand_color: e.target.value})} className="w-8 h-8 rounded-lg p-0 border-none cursor-pointer" />
                            <input type="text" value={formData.brand_color} onChange={(e) => setFormData({...formData, brand_color: e.target.value})} className="input-admin flex-1 font-mono text-xs uppercase" maxLength={7} />
                          </div>
                          <div className="flex gap-3 items-center">
                            <div className="w-12 text-[9px] font-bold text-slate-400 uppercase">Menu 1</div>
                            <input type="color" value={formData.sidebar_color} onChange={(e) => setFormData({...formData, sidebar_color: e.target.value})} className="w-8 h-8 rounded-lg p-0 border-none cursor-pointer" />
                            <input type="text" value={formData.sidebar_color} onChange={(e) => setFormData({...formData, sidebar_color: e.target.value})} className="input-admin flex-1 font-mono text-xs uppercase" maxLength={7} />
                          </div>
                          <div className="flex gap-3 items-center">
                            <div className="w-12 text-[9px] font-bold text-slate-400 uppercase">Menu 2</div>
                            <input type="color" value={formData.sidebar_color_secondary || '#ffffff'} onChange={(e) => setFormData({...formData, sidebar_color_secondary: e.target.value})} className="w-8 h-8 rounded-lg p-0 border-none cursor-pointer" />
                            <input type="text" value={formData.sidebar_color_secondary || ''} onChange={(e) => setFormData({...formData, sidebar_color_secondary: e.target.value})} placeholder="Vazio" className="input-admin flex-1 font-mono text-xs uppercase" maxLength={7} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-8 mt-6 border-t border-slate-100">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50">
                  {isSubmitting ? "Salvando..." : editingUser ? "Salvar Alterações" : "Criar Usuário"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
