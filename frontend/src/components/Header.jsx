"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';

export default function Header() {
  const [user, setUser] = useState({ name: 'Usuário', role: 'corretor', avatar_url: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [apiData, setApiData] = useState(null);
  const [contracts, setContracts] = useState([]);
  const router = useRouter();
  const fileInputRef = useRef(null);
  const settingsRef = useRef(null);
  const notificationRef = useRef(null);

  const [metaConfig, setMetaConfig] = useState({ tipo: 'mensal', valor_diario: 5000, valor_alvo: 110000 });
  const [announcement, setAnnouncement] = useState(null);
  const [unread, setUnread] = useState(false);
  const [showAnnPopover, setShowAnnPopover] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isEditingMeta, setIsEditingMeta] = useState(false);

  useEffect(() => {
    const loadUser = () => {
      const savedUser = localStorage.getItem('user');
      let currentMeta = { tipo: 'mensal', valor_diario: 5000, valor_alvo: 110000 };
      if (savedUser) {
        const u = JSON.parse(savedUser);
        setUser(u);
        if (u.monthly_goal_type) {
          currentMeta = {
            tipo: u.monthly_goal_type || 'mensal',
            valor_diario: u.daily_goal || 5000,
            valor_alvo: u.monthly_goal || 110000
          };
        }
      }
      
      const savedMeta = localStorage.getItem('meta_config');
      if (savedMeta) {
         setMetaConfig(JSON.parse(savedMeta));
      } else {
         setMetaConfig(currentMeta);
      }

      Promise.allSettled([
        api.get('/admin/dashboard-stats?days=1'),
        api.get('/contracts'),
        api.get('/admin/announcements/active')
      ]).then(([statsRes, contractsRes, annRes]) => {
        if (statsRes.status === 'fulfilled') setApiData(statsRes.value);
        if (contractsRes.status === 'fulfilled') {
          let parsed = Array.isArray(contractsRes.value) ? contractsRes.value : contractsRes.value?.data;
          if (parsed && Array.isArray(parsed)) setContracts(parsed);
        }
        if (annRes.status === 'fulfilled') {
          const res = annRes.value;
          if (res && res.active) {
            setAnnouncement(res);
            const readKey = `announcement_read_${res.id}`;
            setUnread(!localStorage.getItem(readKey));
          } else {
            setAnnouncement(null);
            setUnread(false);
          }
        }
      });
    };
    
    loadUser();
    
    // Escuta mudanças na meta em outras janelas/páginas
    const handleStorageChange = (e) => {
       if (!e || e.key === 'meta_config' || e.type === 'meta-updated' || e.type === 'contracts-updated' || e.key === 'accepted_contracts') {
          const savedMeta = localStorage.getItem('meta_config');
          if (savedMeta) {
             setMetaConfig(JSON.parse(savedMeta));
          }
       }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('meta-updated', handleStorageChange);
    window.addEventListener('contracts-updated', handleStorageChange);
    window.addEventListener('user-updated', loadUser);
    
    const handleClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowAnnPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener('user-updated', loadUser);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('meta-updated', handleStorageChange);
      window.removeEventListener('contracts-updated', handleStorageChange);
    };
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const updateMetaValue = async (newVal) => {
    const val = Number(newVal);
    const tipo = metaConfig.tipo || 'mensal';
    let updated = { ...metaConfig };
    if (tipo === 'diaria') {
      updated.valor_diario = val;
      updated.valor_alvo = val * 22;
    } else if (tipo === 'semanal') {
      updated.valor_alvo = val;
      updated.valor_diario = Math.round(val / 5);
    } else { // mensal
      updated.valor_alvo = val;
      updated.valor_diario = Math.round(val / 22);
    }
    setMetaConfig(updated);
    localStorage.setItem('meta_config', JSON.stringify(updated));
    window.dispatchEvent(new Event('meta-updated'));

    try {
      await api.patch('/auth/meta', updated);
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        u.monthly_goal = updated.valor_alvo;
        u.daily_goal = updated.valor_diario;
        u.monthly_goal_type = updated.tipo;
        localStorage.setItem('user', JSON.stringify(u));
        window.dispatchEvent(new Event('user-updated'));
      }
    } catch (err) {
      console.error("Erro ao salvar meta no banco:", err);
    }
  };

  const getMetaStats = () => {
    if (typeof window === 'undefined') {
      return { progresso: 0, target: 110000, label: 'Meta Mensal' };
    }

    const tipo = metaConfig.tipo || 'mensal';
    const target = tipo === 'diaria' ? Number(metaConfig.valor_diario || 5000) : Number(metaConfig.valor_alvo || 110000);

    let progresso = 0;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    contracts.forEach(item => {
      const vContrato = Number(item.valor_contrato || item.parcela || 0);
      let isInPeriod = false;
      const itemDate = item.data_aceite ? new Date(item.data_aceite + "T12:00:00") : null;
      
      if (item.data_aceite) {
        if (tipo === 'mensal') {
          const itemMonth = item.data_aceite.substring(0, 7);
          const todayMonth = todayStr.substring(0, 7);
          if (itemMonth === todayMonth) isInPeriod = true;
        } else if (tipo === 'semanal' && itemDate) {
          const diff = today.getTime() - itemDate.getTime();
          if (diff >= -86400000 && diff < 7 * 24 * 60 * 60 * 1000) isInPeriod = true;
        } else if (tipo === 'diaria') {
          if (item.data_aceite === todayStr) isInPeriod = true;
        }
      }
      if (isInPeriod) {
        progresso += vContrato;
      }
    });

    let label = 'Meta Mensal';
    if (tipo === 'semanal') label = 'Meta Semanal';
    if (tipo === 'diaria') label = 'Meta Diária';

    return { progresso, target, label };
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
        {(() => {
          const stats = getMetaStats();
          return (
            <div className="hidden md:flex items-center bg-slate-50 dark:bg-white/5 rounded-2xl px-4 py-2 border border-slate-200 dark:border-white/10 shadow-sm gap-2">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">{stats.label}:</span>
              <div className="flex items-center gap-1 font-black text-sm">
                <span className="text-emerald-600 dark:text-emerald-400">
                  {`R$ ${stats.progresso.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                </span>
                <span className="text-slate-400">/</span>
                {isEditingMeta ? (
                  <input 
                    type="number" 
                    value={stats.target}
                    autoFocus
                    onBlur={() => setIsEditingMeta(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setIsEditingMeta(false);
                    }}
                    onChange={(e) => updateMetaValue(e.target.value)}
                    className="bg-transparent w-20 text-blue-600 outline-none border-b border-blue-500 transition-all text-center font-black"
                  />
                ) : (
                  <span 
                    onClick={() => setIsEditingMeta(true)}
                    className="text-blue-600 cursor-pointer hover:underline font-black"
                    title="Clique para editar a meta"
                  >
                    {`R$ ${stats.target.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* Sino de Notificações */}
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => setShowAnnPopover(!showAnnPopover)}
            className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors relative cursor-pointer"
            title="Comunicados e Notificações"
          >
            <svg 
              className={`w-6 h-6 transition-transform ${unread ? "animate-bounce" : "hover:rotate-12"}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unread && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-[#0f172a] flex items-center justify-center animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              </span>
            )}
          </button>
          
          {showAnnPopover && (
            <div className="absolute right-0 mt-4 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden animate-in slide-in-from-top-2 p-5 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">
                <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  🔔 Central de Avisos
                </h3>
                {unread && (
                  <span className="text-[9px] font-black bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-md uppercase tracking-widest">Novo</span>
                )}
              </div>
              
              {announcement ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">{announcement.title}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      {announcement.created_at ? new Date(announcement.created_at).toLocaleDateString('pt-BR') : ''}
                    </p>
                  </div>
                  
                  {announcement.image_url && (
                    <div className="rounded-xl overflow-hidden border border-slate-100 dark:border-white/5 shadow-sm max-h-36 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                      <img 
                        src={getStaticUrl(announcement.image_url) || ''} 
                        className="w-full h-full object-cover cursor-zoom-in hover:scale-[1.02] transition-transform" 
                        onClick={() => setIsZoomed(true)}
                        alt="Card Notificação" 
                        title="Clique para ampliar"
                      />
                    </div>
                  )}
                  
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed max-h-40 overflow-y-auto pr-1 whitespace-pre-line custom-scrollbar">
                    {announcement.message}
                  </div>
                  
                  {unread ? (
                    <button 
                      onClick={() => {
                        localStorage.setItem(`announcement_read_${announcement.id}`, 'true');
                        setUnread(false);
                        setShowAnnPopover(false);
                      }}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md shadow-blue-500/20 active:scale-95"
                    >
                      ✓ Marcar como Lido
                    </button>
                  ) : (
                    <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest text-center">✓ Você já visualizou este comunicado</p>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                  Nenhum comunicado disponível.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative" ref={settingsRef}>
          <div 
            className="flex items-center space-x-3 pl-4 border-l border-slate-200 dark:border-white/10 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowSettings(!showSettings)}
          >
            <div className="w-11 h-11 rounded-2xl p-0.5 shadow-xl border border-slate-200 dark:border-white/20" style={{ backgroundColor: user.brand_color || '#3b82f6' }}>
              <div className="w-full h-full rounded-xl bg-white dark:bg-[#1e293b] flex items-center justify-center overflow-hidden">
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
                 <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-blue-500 to-emerald-400 p-0.5 mb-2 shadow-md cursor-pointer relative group" onClick={() => fileInputRef.current?.click()}>
                   <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                   <div className="w-full h-full rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                     {user.avatar_url ? (
                       <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                     ) : (
                       <span className="text-xl font-bold text-slate-400 dark:text-slate-500">{getInitials(user.name)}</span>
                     )}
                   </div>
                   <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
      {/* Lightbox para zoom do Card no Header */}
      {isZoomed && announcement && announcement.image_url && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md cursor-zoom-out" onClick={() => setIsZoomed(false)}>
          <div className="relative max-w-[95vw] max-h-[90vh] z-10 flex flex-col items-center select-none" onClick={(e) => e.stopPropagation()}>
            <img 
              src={getStaticUrl(announcement.image_url)} 
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/10 cursor-zoom-out"
              onClick={() => setIsZoomed(false)}
              alt="Card Ampliado" 
            />
            <button 
              onClick={() => setIsZoomed(false)}
              className="mt-6 px-8 py-3 bg-white text-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95"
            >
              Fechar Visualização
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
