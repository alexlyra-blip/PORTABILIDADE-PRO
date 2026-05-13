"use client";

import { useEffect, useState } from "react";
import { api, getStaticUrl } from "@/utils/api";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, PieChart, Pie, Cell 
} from "recharts";
import { useRouter } from "next/navigation";

// Ícones Premium SVGs
const Icons = {
  Bank: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"></path><path d="M5 21v-8"></path><path d="M19 21v-8"></path><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"></path><path d="M12 4 3 9h18Z"></path></svg>
  ),
  History: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></svg>
  ),
  Table: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><line x1="3" x2="21" y1="9" y2="9" /><line x1="3" x2="21" y1="15" y2="15" /><line x1="9" x2="9" y1="9" y2="21" /><line x1="15" x2="15" y1="9" y2="21" /></svg>
  ),
  Percent: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" x2="5" y1="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg>
  )
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [filterDays, setFilterDays] = useState(30);
  const [role, setRole] = useState("vendedor");

  // Estado padrão imutável para evitar crashes (Fail-Safe)
  const [data, setData] = useState({
    stats: {
      top_bank: "Sem dados",
      top_bank_logo: null,
      top_origin_bank: "Sem dados",
      top_origin_logo: null,
      top_table: "Sem dados",
      avg_rate: "0.00%",
      top_banks: [],
      top_users: []
    },
    agreements: [],
    recent_simulations: [],
    historical: []
  });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const userObj = JSON.parse(userStr);
        setRole(userObj.role || "vendedor");
      } catch (e) {}
    }
    loadDashboardStats();
  }, [filterDays]);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/dashboard-stats?days=${filterDays}`);
      const d = res.data || res;
      
      if (d) {
        setData({
          stats: {
            top_bank: d.stats?.top_bank || "Nenhum Banco",
            top_bank_logo: d.stats?.top_bank_logo || null,
            top_origin_bank: d.stats?.top_origin_bank || "Nenhuma Origem",
            top_origin_logo: d.stats?.top_origin_logo || null,
            top_table: d.stats?.top_table || "Nenhuma Tabela",
            avg_rate: d.stats?.avg_rate || "0.00%",
            top_banks: Array.isArray(d.stats?.top_banks) ? d.stats.top_banks : [],
            top_users: Array.isArray(d.stats?.top_users) ? d.stats.top_users : []
          },
          agreements: Array.isArray(d.agreements) ? d.agreements : [],
          recent_simulations: Array.isArray(d.recent_simulations) ? d.recent_simulations : [],
          historical: Array.isArray(d.historical) ? d.historical : []
        });
      }
    } catch (err) {
      console.error("Dashboard Sync Failed:", err);
      // Mantém o estado padrão de segurança (não trava a tela)
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["#2563eb", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899"];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest animate-pulse">
          Montando Painel de Simulações...
        </p>
      </div>
    );
  }

  const statCards = [
    { title: "Top Banco", desc: "Mais indicado", value: data.stats.top_bank, img: data.stats.top_bank_logo, icon: <Icons.Bank />, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    { title: "Mais Portado", desc: "Origem frequente", value: data.stats.top_origin_bank, img: data.stats.top_origin_logo, icon: <Icons.History />, color: "bg-pink-500/10 text-pink-600 border-pink-500/20" },
    { title: "Melhor Tabela", desc: "Mais agressiva", value: data.stats.top_table, icon: <Icons.Table />, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    { title: "Taxa Média", desc: "Geral", value: data.stats.avg_rate, icon: <Icons.Percent />, color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-700">
      
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black text-white tracking-tight uppercase">
            Dashboard <span className="text-blue-400">Simulações</span>
          </h1>
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mt-1">
            Análise de Performance Comercial
          </p>
        </div>
        
        <div className="relative z-10 flex gap-3">
          <select 
            value={filterDays} 
            onChange={(e) => setFilterDays(Number(e.target.value))}
            className="py-3 px-6 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/10 text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer transition-all backdrop-blur-md"
          >
            <option value={1} className="text-slate-800">Hoje</option>
            <option value={7} className="text-slate-800">7 Dias</option>
            <option value={30} className="text-slate-800">30 Dias</option>
            <option value={90} className="text-slate-800">90 Dias</option>
          </select>
        </div>
      </div>

      {/* Stats Cards (Fail-Safe Render) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all group relative overflow-hidden">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 ${card.img ? 'bg-transparent p-0' : card.color} border shadow-inner`}>
              {card.img ? (
                 <img src={getStaticUrl(card.img)} className="w-full h-full object-contain p-2" alt={card.title} />
              ) : (
                 card.icon
              )}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.desc}</p>
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight mt-1 truncate" title={card.value}>
                {card.value || "—"}
              </h3>
            </div>
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
               {card.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Evolução (Histórico) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl">
          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Evolução de Simulações</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Volume diário de propostas</p>
          </div>
          <div className="h-72 w-full">
            {data.historical.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.historical}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 900 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 900 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '12px' }}
                  />
                  <Line type="monotone" dataKey="simulations" name="Propostas" stroke="#2563eb" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-100 dark:border-white/5 rounded-3xl">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sem dados no período</p>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico de Convênios (Pie) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl">
          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Convênios</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Distribuição por perfil</p>
          </div>
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
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-100 dark:border-white/5 rounded-3xl">
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhuma fatia</p>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Simulacoes Recentes (Fail-Safe List) */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-white/5">
           <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Últimas Simulações</h3>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monitoramento em Tempo Real</p>
        </div>
        <div className="p-2">
          {data.recent_simulations.length > 0 ? (
            <div className="divide-y divide-slate-50 dark:divide-white/5">
              {data.recent_simulations.slice(0, 10).map((sim, i) => (
                <div key={i} className="flex flex-col md:flex-row items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center font-black">
                      {sim.client_name ? sim.client_name.charAt(0) : "C"}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase truncate max-w-[200px]">{sim.client_name || "CLIENTE NÃO IDENTIFICADO"}</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{sim.agreement || "INSS"} • {sim.created_at || "Hoje"}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-4 md:mt-0 w-full md:w-auto justify-between md:justify-end">
                     <div className="text-center md:text-right px-4 border-r border-slate-100 dark:border-white/10">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bancos</p>
                        <p className="text-sm font-black text-slate-700 dark:text-slate-300">{(sim.results || []).length}</p>
                     </div>
                     <div className="text-center md:text-right px-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Maior Liberação</p>
                        <p className="text-sm font-black text-emerald-600">
                          R$ {Math.max(0, ...(sim.results || []).map(r => r.release_amount || 0)).toLocaleString()}
                        </p>
                     </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 flex items-center justify-center">
               <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhuma simulação no radar</p>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
