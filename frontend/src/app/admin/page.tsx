"use client";

import { useEffect, useState } from "react";
import StatsCard from "@/components/admin/StatsCard";
import { api, getStaticUrl } from "@/utils/api";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';

// Premium SVG Icons
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
  const [filterDays, setFilterDays] = useState(30);

  // Arquitetura Fail-Safe: Estado totalmente imutável e estruturado para evitar qualquer quebra.
  const [data, setData] = useState({
    totals: { banks: 0, tables: 0, simulations: 0, simulations_period: 0 },
    stats: { 
      top_bank: "Sem dados", top_bank_logo: null,
      top_origin_bank: "Sem dados", top_origin_logo: null,
      top_table: "Sem dados", top_table_logo: null,
      top_user: "Nenhum", top_user_count: 0,
      avg_rate: "0%", 
      top_banks: [], top_users: [] 
    },
    agreements: [],
    historical: []
  });

  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#94a3b8', '#8b5cf6'];

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const parsedUser = JSON.parse(userStr);
        setRole(parsedUser.role || "vendedor");
      } catch (e) {}
    }
    fetchData(true);
    
    // Auto-refresh inteligente a cada 10 segundos
    const interval = setInterval(() => {
      fetchData(false);
    }, 10000);
    
    return () => clearInterval(interval);
  }, [filterDays]);

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await api.get(`/admin/dashboard-stats?days=${filterDays}`);
      const d = res.data || res;

      if (d) {
        setData({
          totals: d.totals || { banks: 0, tables: 0, simulations: 0, simulations_period: 0 },
          stats: {
            top_bank: d.stats?.top_bank || "Sem dados",
            top_bank_logo: d.stats?.top_bank_logo || null,
            top_origin_bank: d.stats?.top_origin_bank || "Sem dados",
            top_origin_logo: d.stats?.top_origin_logo || null,
            top_table: d.stats?.top_table || "Sem dados",
            top_table_logo: d.stats?.top_table_logo || null,
            top_user: d.stats?.top_user || "Nenhum",
            top_user_count: d.stats?.top_user_count || 0,
            avg_rate: d.stats?.avg_rate || "0%",
            top_banks: Array.isArray(d.stats?.top_banks) ? d.stats.top_banks : [],
            top_users: Array.isArray(d.stats?.top_users) ? d.stats.top_users : []
          },
          agreements: Array.isArray(d.agreements) ? d.agreements : [],
          historical: Array.isArray(d.historical) ? d.historical : []
        });
      }
    } catch(e) {
      console.error("Erro Crítico no Admin Dashboard:", e);
      // Mantém os valores zeros e arrays vazios para não quebrar a UI
    } finally {
      setLoading(false);
    }
  };

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
      a.download = `relatorio_gerencial_${filterDays}d.pdf`;
      a.click();
    } catch (e) {
      alert("Falha ao exportar PDF.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest animate-pulse">
        Carregando Painel Inteligente...
      </p>
    </div>
  );

  if (role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
        <div className="w-24 h-24 bg-red-500/10 text-red-500 rounded-[2rem] flex items-center justify-center mb-6 border border-red-500/20 shadow-2xl">
          <Icons.Shield size={48} />
        </div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">Painel Restrito</h2>
        <p className="text-slate-500 font-medium max-w-md">
          Apenas o Administrador Master tem permissão para visualizar o overview global de resultados da plataforma.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700 max-w-7xl mx-auto pb-10">
      
      {/* Header Premium Glass */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-r from-blue-900 to-indigo-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-white tracking-tight uppercase mb-1">Painel <span className="text-blue-300">Inteligente</span></h1>
          <p className="text-blue-200 font-bold italic text-[10px] uppercase tracking-widest">
            Visão Global Administrativa e Métricas de Uso
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="bg-black/20 px-4 py-3 rounded-2xl border border-white/10 flex items-center gap-3 backdrop-blur-md">
             <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse"></span>
             <span className="text-[10px] font-black text-white uppercase tracking-widest">Sistema Operante</span>
          </div>

          <select 
            value={filterDays} 
            onChange={(e) => setFilterDays(Number(e.target.value))}
            className="py-3 px-6 bg-white hover:bg-slate-50 text-blue-900 rounded-2xl border-none text-[11px] font-black uppercase tracking-widest cursor-pointer shadow-lg transition-all"
          >
            <option value={1}>Métricas de Hoje</option>
            <option value={7}>Últimos 7 Dias</option>
            <option value={30}>Últimos 30 Dias</option>
            <option value={90}>Últimos 90 Dias</option>
          </select>
          
          <button 
            onClick={handleExportPDF} 
            className="py-3 px-6 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl border border-white/20 shadow-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 group"
          >
            <span className="group-hover:-translate-y-0.5 transition-transform"><Icons.Download size={14} /></span> PDF
          </button>
        </div>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
          title="Usuários Ativos" 
          value={data.stats.top_users.length} 
          icon={<Icons.Users />}
          trend="Sincronizados" 
          trendUp={true} 
        />
        <StatsCard 
          title="Simulações (Total)" 
          value={data.totals.simulations} 
          icon={<Icons.Activity />}
          trend={`${data.totals.simulations_period} no período`} 
          trendUp={true} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Evolução */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase">Tráfego de Simulações</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Evolução no período selecionado</p>
            </div>
          </div>
          
          <div className="h-72 w-full">
            {data.historical.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.historical}>
                  <defs>
                    <linearGradient id="colorSim" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 900 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 900 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontWeight: 900, fontSize: '12px', color: '#1e293b' }}
                  />
                  <Area type="monotone" dataKey="simulations" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorSim)" activeDot={{ r: 6, strokeWidth: 0, fill: '#2563eb' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sem tráfego no momento</p>
              </div>
            )}
          </div>
        </div>

        {/* Divisão por Convênio */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl">
          <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase mb-1">Convênios</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">Porcentagem das requisições</p>
          
          <div className="h-64 w-full">
            {data.agreements.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.agreements} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {data.agreements.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center rounded-2xl border-2 border-dashed border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhuma divisão</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Bancos */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl overflow-hidden">
          <div className="p-8 border-b border-slate-100 dark:border-white/5">
            <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase mb-1">Ranking de Bancos</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Instituições mais indicadas pelas regras</p>
          </div>
          <div className="p-4">
            {data.stats.top_banks.length > 0 ? (
              <div className="divide-y divide-slate-50 dark:divide-white/5">
                {data.stats.top_banks.map((bank, index) => (
                  <div key={index} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 font-black text-slate-300 flex items-center justify-center shrink-0">#{index + 1}</div>
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center p-0 overflow-hidden shrink-0">
                        {bank.logo ? (
                          <img src={getStaticUrl(bank.logo)} className="w-full h-full object-cover" alt={bank.name} />
                        ) : (
                          <span className="text-lg font-black text-blue-600">{bank.name?.charAt(0)}</span>
                        )}
                      </div>
                      <h4 className="font-black text-sm text-slate-800 dark:text-white uppercase truncate max-w-[150px]">{bank.name}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-blue-600 font-black text-lg bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-xl">{bank.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhum banco ranqueado</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Usuários */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl overflow-hidden">
          <div className="p-8 border-b border-slate-100 dark:border-white/5">
            <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase mb-1">Ranking de Corretores</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consultores que mais simularam</p>
          </div>
          <div className="p-4">
            {data.stats.top_users.length > 0 ? (
              <div className="divide-y divide-slate-50 dark:divide-white/5">
                {data.stats.top_users.map((user, index) => (
                  <div key={index} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 font-black text-slate-300 flex items-center justify-center shrink-0">#{index + 1}</div>
                      <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-xl overflow-hidden flex items-center justify-center text-white font-black text-lg shadow-lg shrink-0 border border-slate-100 dark:border-white/10">
                        {user.avatar ? (
                          <img src={getStaticUrl(user.avatar)} className="w-full h-full object-cover" alt={user.name} />
                        ) : (
                          user.name?.charAt(0) || "U"
                        )}
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-800 dark:text-white uppercase truncate max-w-[150px]">{user.name}</h4>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{user.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-indigo-600 font-black text-lg bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-xl">{user.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhum corretor ranqueado</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
    </div>
  );
}
