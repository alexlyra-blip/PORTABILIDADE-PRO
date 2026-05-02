"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';

export default function Header() {
  const [user, setUser] = useState({ name: 'Usuário', role: 'corretor', avatar_url: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [apiData, setApiData] = useState(null);
  const router = useRouter();
  const fileInputRef = useRef(null);
  const settingsRef = useRef(null);

  useEffect(() => {
    const loadUser = () => {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
      // Buscar dados para a meta
      api.get('/admin/dashboard-stats?days=1').then(res => setApiData(res)).catch(() => {});
    };
    
    loadUser();
    window.addEventListener('user-updated', loadUser);
    
    const handleClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener('user-updated', loadUser);
    };
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Imagem muito grande! Limite de 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      try {
        if (!user.id) return;
        await api.patch(`/admin/users/${user.id}`, { avatar_url: base64String });
        const updatedUser = { ...user, avatar_url: base64String };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } catch (err) {
        console.error("Erro ao atualizar avatar:", err);
        alert("Erro ao salvar avatar.");
      }
    };
    reader.readAsDataURL(file);
  };

  const getStaticUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    if (path.startsWith('data:image')) return path; // Base64
    return `http://localhost:8000${path.startsWith('/') ? '' : '/'}${path}`;
  };

  return (
    <header className="h-20 bg-white dark:bg-[#0f172a]/95 border-b border-slate-200 dark:border-white/10 flex items-center justify-between px-8 sticky top-0 z-40 shadow-sm transition-colors duration-200">
      <div className="flex items-center">
        <h2 className="text-lg font-medium text-slate-800 dark:text-white">
          Bem-vindo de volta, <span className="font-black" style={{ color: user.brand_color || '#2563eb'}}>{user.name}</span>
        </h2>
      </div>

      <div className="flex items-center space-x-6 relative">
        <div className="hidden md:flex items-center bg-slate-50 dark:bg-white/5 rounded-full px-4 py-2 border border-slate-200 dark:border-white/10 shadow-sm">
          <span className="text-[10px] uppercase font-black text-slate-400 mr-2 tracking-widest">Meta Diária:</span>
          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
            {(() => {
               const todayStr = new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});
               const todayData = apiData?.historical?.find(d => d.name === todayStr);
               const valor = Number(todayData?.valor_propostas || 0);
               return `R$ ${valor.toLocaleString('pt-BR', {minimumFractionDigits: 0})}`;
            })()} / 100k
          </span>
        </div>
        


        <div className="relative" ref={settingsRef}>
          <div 
            className="flex items-center space-x-3 pl-4 border-l border-slate-200 dark:border-white/10 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowSettings(!showSettings)}
          >
            <div className="w-11 h-11 rounded-xl p-0.5 shadow-xl border border-slate-200 dark:border-white/20" style={{ backgroundColor: user.brand_color || '#3b82f6' }}>
              <div className="w-full h-full rounded-lg bg-white dark:bg-[#1e293b] flex items-center justify-center overflow-hidden">
                {user.avatar_url || user.logo_url ? (
                  <img src={getStaticUrl(user.avatar_url || user.logo_url)} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-black text-slate-700 dark:text-white">{getInitials(user.name)}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-start hidden sm:flex">
              <span className="text-sm font-black text-slate-800 dark:text-white leading-tight drop-shadow-sm">{user.name}</span>
              <span 
                className="text-[9px] font-black uppercase tracking-widest leading-tight opacity-70"
                style={{ color: user.brand_color || '#2563eb' }}
              >
                {user.role?.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Menu Dropdown de Configurações */}
          {showSettings && (
            <div className="absolute right-0 mt-4 w-60 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in slide-in-from-top-2">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 text-center">
                 <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-blue-500 to-emerald-400 p-0.5 mb-2 shadow-md cursor-pointer relative group" onClick={() => fileInputRef.current?.click()}>
                   <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                   <div className="w-full h-full rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                     {user.avatar_url ? (
                       <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                     ) : (
                       <span className="text-xl font-bold text-slate-400 dark:text-slate-500">{getInitials(user.name)}</span>
                     )}
                   </div>
                   <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-white font-semibold">Mudar Foto</span>
                   </div>
                 </div>
                 <p className="text-sm font-bold text-slate-800 dark:text-white">{user.name}</p>
                 <p className="text-xs text-slate-500 dark:text-slate-400">{user.email || 'Perfil Autenticado'}</p>
              </div>
              <div className="p-2">
                <button 
                  onClick={() => { router.push('/admin/users'); setShowSettings(false); }}
                  className="w-full text-left px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  ⚙️ Configurações
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                 <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 0 01-3-3V7a3 0 013-3h4a3 0 013 3v1" />
                  </svg>
                  Sair do Sistema
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
