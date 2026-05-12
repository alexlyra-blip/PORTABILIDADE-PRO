"use client";

import { useEffect, useState } from "react";
import StatsCard from "@/components/admin/StatsCard";
import QuickActions from "@/components/admin/QuickActions";
import AnnouncementManager from "@/components/admin/AnnouncementManager";
import { api, getStaticUrl } from "@/utils/api";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';

// Ícones SVG nativos para o Dashboard Admin
const Icons = {
  Bank: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="22" y2="22" /><line x1="6" x2="6" y1="18" y2="11" /><line x1="10" x2="10" y1="18" y2="11" /><line x1="14" x2="14" y1="18" y2="11" /><line x1="18" x2="18" y1="18" y2="11" /><polygon points="12 2 20 7 4 7 12 2" /></svg>
  ),
  Table: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><line x1="3" x2="21" y1="9" y2="9" /><line x1="3" x2="21" y1="15" y2="15" /><line x1="9" x2="9" y1="9" y2="21" /><line x1="15" x2="15" y1="9" y2="21" /></svg>
  ),
  Users: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="19" cy="11" r="3" /></svg>
  ),
  Activity: ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
  ),
  Download: ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
  ),
  Shield: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
  )
};

export default function AdminPage() {
  const [role, setRole] = useState("vendedor");
  const [loading, setLoading] = useState(true);
  const [filterDays, setFilterDays] = useState(1);
  const [data, setData] = useState({
    totals: { banks: 0, tables: 0, simulations: 0, simulations_period: 0 },
    stats: { top_bank: "...", top_table: "...", top_user: "...", top_user_count: 0, avg_rate: "0%", top_3_banks: [], top_3_users: [] },
    agreements: [],
    historical: []
  });

  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#94a3b8', '#8b5cf6'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const u = localStorage.getItem('user');
        if (u) {
          const parsedUser = JSON.parse(u);
          setRole(parsedUser.role);
          
          if (parsedUser.role === 'admin') {
            const res = await api.get(`/admin/dashboard-stats?days=${filterDays}`);
            const stats = res.data || res;
            setData(prev => ({
              ...prev,
              ...stats,
              totals: stats.totals || prev.totals,
              stats: stats.stats || prev.stats,
              historical: stats.historical || prev.historical,
              agreements: stats.agreements || prev.agreements
            }));
          }
        }
      } catch(e) {
        console.error("Dashboard error:", e);
      }
      setLoading(false);
    };
    fetchData();
  }, [filterDays]);

  const handleExportPDF = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const url = `${window.location.origin}/api/admin/export-stats-pdf?days=${filterDays}`;
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error("Erro ao gerar PDF");
      const blob = await response.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = `relatorio_ranking_${filterDays}d.pdf`;
      a.click();
    } catch (e) {
      alert("Erro ao exportar PDF.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (role !== "admin") {
    return (
      <div className="p-12 text-center text-slate-500 animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-sm">
          <Icons.Shield size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Painel de Controle Restrito</h2>
        <p className="text-slate-500 text-sm max-w-md mx-auto">Apenas o Administrador Master tem permissão para visualizar o dashboard global da plataforma.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500 max-w-7xl mx-auto pb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Painel Inteligente</h1>
          <p className="text-slate-500 mt-0.5 font-bold italic text-[9px] uppercase tracking-widest">Controle Central de Regras e Desempenho</p>
        </div>
        <div className="bg-white px-3 py-1.5 rounded-xl shadow-sm border border-slate-100 flex items-center gap-2">
           <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
           <span className="text-[9px] font-black text-slate-500 uppercase">Sistema Online (V 2.5.0)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Bancos Cadastrados" 
          value={data.totals.banks} 
          icon={<Icons.Bank />}
          trend="+12%" 
          trendUp={true} 
        />
        <StatsCard 
          title="Tabelas de Regras" 
          value={data.totals.tables} 
          icon={<Icons.Table />}
          trend="Ativas" 
          trendUp={true} 
        />
        <StatsCard 
          title="Total Simulações" 
          value={data.totals.simulations} 
          icon={<Icons.Activity />}
          trend="+5.4%" 
          trendUp={true} 
        />
        <StatsCard 
          title="Usuários Ativos" 
          value={data.totals.users || 0} 
          icon={<Icons.Users />}
          trend="Monitorados" 
          trendUp={true} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/10 shadow-xl min-h-[400px] flex flex-col group hover:shadow-2xl transition-all duration-500">
           <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-blue-500"></span>
             Volumetria de Simulações
           </h3>
           <div className="flex-1 w-full min-h-[300px]">
              {data.historical.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.historical}>
                    <defs>
                      <linearGradient id="colorSim" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.3} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94A3B8', fontWeight: 'bold'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94A3B8', fontWeight: 'bold'}} />
                    <Tooltip 
                       contentStyle={{ borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)', background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', color: '#fff' }} 
                       itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="INSS" stackId="1" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSim)" strokeWidth={4} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                    <Area type="monotone" dataKey="SIAPE" stackId="1" stroke="#f59e0b" fillOpacity={1} fill="#f59e0b11" strokeWidth={4} />
                    <Area type="monotone" dataKey="FORCAS" stackId="1" stroke="#10b981" fillOpacity={1} fill="#10b98111" strokeWidth={4} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-300 italic text-sm">Sem dados suficientes para o gráfico</div>
              )}
           </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/10 shadow-xl flex flex-col group hover:shadow-2xl transition-all duration-500">
           <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
             Por Convênio
           </h3>
           <div className="flex-1 w-full min-h-[300px]">
              {data.agreements.length > 0 ? (
                 <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={data.agreements}
                        cx="50%" cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                      >
                        {data.agreements.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.3)', background: '#1e293b', color: '#fff' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em'}} />
                    </PieChart>
                 </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-300 italic text-sm">Aguardando dados...</div>
              )}
           </div>
        </div>
      </div>

      <QuickActions />

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/10 shadow-xl min-h-[350px] mb-8 mt-4 group hover:shadow-2xl transition-all duration-500">
         <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            Volume Estimado (Propostas Geradas)
         </h3>
         <div className="w-full h-[300px]">
            {data.historical && data.historical.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={data.historical}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.3} />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94A3B8', fontWeight: 'bold'}} />
                   <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94A3B8', fontWeight: 'bold'}} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                   <Tooltip 
                      formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`, 'Volume (R$)']}
                      contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)', background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)', color: '#fff' }} 
                      cursor={{fill: 'rgba(59, 130, 246, 0.05)', radius: [12, 12, 0, 0]}}
                   />
                   <Legend iconType="circle" wrapperStyle={{fontSize: '11px', fontWeight: '900', textTransform: 'uppercase'}} />
                   {data?.agreements?.map((agr, idx) => (
                      <Bar 
                        key={agr.name} 
                        dataKey={`${agr.name}_valor`} 
                        name={agr.name}
                        stackId="a" 
                        fill={COLORS[idx % COLORS.length]} 
                        radius={idx === data.agreements.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} 
                        barSize={40}
                      />
                   ))}
                 </BarChart>
               </ResponsiveContainer>
            ) : (
               <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sem valores suficientes</div>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
        <div className="bg-slate-950 p-8 rounded-[2.5rem] text-white relative overflow-hidden group shadow-2xl border border-white/5">
           <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] -mr-20 -mt-20 group-hover:scale-125 transition-transform duration-1000"></div>
           <div className="relative z-10 flex flex-col gap-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] flex items-center gap-2">
                  <span className="w-4 h-1 bg-blue-500 rounded-full"></span>
                  Ranking de Simulações
                </h4>
                
                <div className="bg-white/5 backdrop-blur-xl p-1.5 rounded-2xl flex items-center shadow-2xl border border-white/10 shrink-0">
                  {[
                    { label: 'Hoje', val: 1 }, 
                    { label: '7D', val: 7 }, 
                    { label: '15D', val: 15 }, 
                    { label: '30D', val: 30 }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => { setLoading(true); setFilterDays(opt.val); }}
                      className={`px-4 py-2 text-[9px] font-black uppercase tracking-[0.1em] rounded-xl transition-all duration-300 ${filterDays === opt.val ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <button 
                    onClick={handleExportPDF}
                    className="ml-2 px-4 py-2 text-[9px] font-black text-white uppercase tracking-widest rounded-xl transition-all bg-red-600/80 hover:bg-red-600 shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2 shrink-0"
                  >
                    <Icons.Download size={14} /> PDF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full mt-2">
                 {/* Top 10 Bancos */}
                 <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase mb-3 tracking-widest border-b border-white/10 pb-1.5">Top 10 Bancos</p>
                    <div className="space-y-3">
                       {data.stats.top_banks && data.stats.top_banks.slice(0, 10).map((b, i) => (
                         <div key={i} className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center shrink-0 border border-slate-700 shadow-md">
                             {b.logo ? <img src={getStaticUrl(b.logo)} className="w-full h-full object-cover"/> : <span className="text-slate-800 text-[10px] font-black">{b.name.charAt(0)}</span>}
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white truncate leading-tight">{b.name}</p>
                              <p className="text-[9px] text-emerald-400 font-black uppercase tracking-tight"><span className="text-slate-500 mr-1">#{i + 1}</span> R$ {b.total_volume?.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || "0,00"}</p>
                           </div>
                         </div>
                       ))}
                    </div>
                 </div>

                 {/* Top 10 Corretores */}
                 <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase mb-3 tracking-widest border-b border-white/10 pb-1.5">Top 10 Corretores</p>
                    <div className="space-y-3">
                       {data.stats.top_users && data.stats.top_users.slice(0, 10).map((u, i) => (
                         <div key={i} className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 shadow-md">
                             {u.avatar ? <img src={getStaticUrl(u.avatar)} className="w-full h-full object-cover"/> : <span className="text-white text-[10px] font-black">{u.name.charAt(0)}</span>}
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-blue-400 truncate leading-tight">{u.name}</p>
                              <p className="text-[9px] text-emerald-400 font-black uppercase tracking-tight"><span className="text-slate-500 mr-1">#{i + 1}</span> {u.count} Vendas</p>
                           </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <AnnouncementManager />
      </div>
    </div>
  );
}
