import React from 'react';
import Link from 'next/link';

const AdminLayout = ({ children }) => {
  const [user, setUser] = useState({ name: 'Administrador', logo_url: '', avatar_url: '' });

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const getStaticUrl = (path) => {
    if (!path || path === "null") return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `http://localhost:8000${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const profileImageUrl = getStaticUrl(user.logo_url || user.avatar_url);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex">
      {/* Sidebar */}
      {/* Sidebar - Agora IDENTICA ao Simulador (Imagem 1) */}
      <aside className="w-72 bg-slate-900 border-r border-white/5 flex flex-col relative z-20 shadow-2xl overflow-hidden"
        style={{ 
          background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' 
        }}
      >
        {/* Header: Centered Avatar (Grande como na Imagem 1) */}
        <div className="p-8 pb-6 border-b border-white/5 flex flex-col items-center">
          <div className="mb-5 relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/30 shadow-[0_0_30px_rgba(0,0,0,0.4)] bg-slate-800 relative z-10">
              {profileImageUrl ? (
                <img src={profileImageUrl} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-5xl text-white shadow-inner bg-blue-600">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="absolute inset-0 rounded-2xl blur-3xl opacity-30 animate-pulse scale-150 pointer-events-none bg-blue-600"></div>
          </div>
          <div className="mb-4 text-center flex flex-col items-center w-full">
            <p className="text-[11px] font-black uppercase text-blue-400 tracking-wider opacity-80 mb-0.5">Acesso AdminMaster</p>
            <h2 className="text-base font-black text-white truncate max-w-[180px] drop-shadow-md uppercase">{user.name}</h2>
          </div>

          {/* Branding Row */}
          <div className="flex items-center justify-center gap-1.5 mt-2 text-center relative z-20">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-base text-white shadow-lg border border-white/30 bg-blue-600">P</div>
            <span className="text-xl font-black tracking-tighter drop-shadow-lg text-white">
              Portabilidade<span className="text-blue-500">PRO</span>
            </span>
          </div>
          <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black mt-2 italic text-center uppercase">Painel Administrativo</p>
        </div>

        {/* Navigation - Padrão de Botões da Imagem 1 */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          
          {/* Botões de Destaque (Estilo Nova Simulação) */}
          <Link href="/simulador" className="flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 group mb-4 relative overflow-hidden shadow-2xl border-2 border-white/40"
            style={{
              backgroundColor: '#2563eb',
              backgroundImage: `linear-gradient(45deg, #3b82f6 0%, #172554 100%)`,
              boxShadow: `0 15px 20px -5px rgba(37, 99, 235, 0.3)`
            }}
          >
            <span className="text-xl group-hover:scale-125 transition-transform">🚀</span>
            <span className="font-black text-[11px] text-white uppercase tracking-[0.2em]">Acessar Simulador</span>
          </Link>

          <Link href="/admin" className="flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 group mb-6 relative overflow-hidden shadow-2xl border-2 border-white/20"
            style={{
              backgroundColor: '#2563eb',
              backgroundImage: `linear-gradient(45deg, #2563eb 0%, #1e3a8a 100%)`,
              boxShadow: `0 10px 15px -5px rgba(37, 99, 235, 0.2)`
            }}
          >
            <span className="text-xl group-hover:scale-125 transition-transform">📊</span>
            <span className="font-black text-[11px] text-white uppercase tracking-[0.2em]">Painel Geral</span>
          </Link>

          <p className="px-4 text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-3 italic mt-6">Gestão de Configurações</p>
          
          <Link href="/admin/banks" className="flex items-center gap-3 px-4 py-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all group">
            <span className="text-lg opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform">🏦</span>
            <span className="font-bold text-xs tracking-tight">BANCOS</span>
          </Link>
          
          <Link href="/admin/rules" className="flex items-center gap-3 px-4 py-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all group">
            <span className="text-lg opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform">⚖️</span>
            <span className="font-bold text-xs tracking-tight">REGRAS</span>
          </Link>
          
          <Link href="/admin/tables" className="flex items-center gap-3 px-4 py-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all group">
            <span className="text-lg opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform">📋</span>
            <span className="font-bold text-xs tracking-tight">TABELAS</span>
          </Link>
          
          <Link href="/admin/coefficients" className="flex items-center gap-3 px-4 py-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all group">
            <span className="text-lg opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform">🔢</span>
            <span className="font-bold text-xs tracking-tight">COEFICIENTES</span>
          </Link>
          
          <Link href="/admin/users" className="flex items-center gap-3 px-4 py-1.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all group">
            <span className="text-lg opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-transform">👥</span>
            <span className="font-bold text-xs tracking-tight">USUÁRIOS</span>
          </Link>
        </nav>

        {/* Footer: Botão Sair Idêntico à Imagem 1 */}
        <div className="p-4 border-t border-white/5 bg-black/30 relative z-20 text-center">
          <Link href="/login" className="flex items-center justify-center gap-2 w-full py-2 bg-red-600/10 hover:bg-red-600 text-white/60 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/20">
            <span className="text-lg">🏃</span>
            <span>Encerrar Sessão</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-8">
          <div className="text-slate-400">Manage your simulation system configuration</div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-white">Administrador</span>
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white shadow-lg">A</div>
          </div>
        </header>
        <div className="p-6 flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
