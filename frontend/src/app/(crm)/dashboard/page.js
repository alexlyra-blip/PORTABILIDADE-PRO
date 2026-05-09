"use client";

import { useEffect, useState } from "react";
import { api, getStaticUrl } from "@/utils/api";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, PieChart, Pie, Cell 
} from "recharts";
import { useRouter } from "next/navigation";

// Ícones SVG nativos para o Dashboard
const Icons = {
  Bank: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="22" y2="22" /><line x1="6" x2="6" y1="18" y2="11" /><line x1="10" x2="10" y1="18" y2="11" /><line x1="14" x2="14" y1="18" y2="11" /><line x1="18" x2="18" y1="18" y2="11" /><polygon points="12 2 20 7 4 7 12 2" /></svg>
  ),
  History: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></svg>
  ),
  Table: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><line x1="3" x2="21" y1="9" y2="9" /><line x1="3" x2="21" y1="15" y2="15" /><line x1="9" x2="9" y1="9" y2="21" /><line x1="15" x2="15" y1="9" y2="21" /></svg>
  ),
  Percent: ({ size = 24 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" x2="5" y1="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg>
  ),
  Download: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
  ),
  Rocket: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.5-1 1-4c1.5 0 3 .5 3 .5L12 15Z" /><path d="M15 9h5s1 .5 4 1c0 1.5-.5 3-.5 3L15 9Z" /></svg>
  )
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDays, setFilterDays] = useState(30);
  const [role, setRole] = useState("vendedor");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role) setRole(user.role);
    loadDashboardStats();
    loadBanks();
  }, [filterDays]);

  const loadBanks = async () => {
    try {
      const res = await api.get("/admin/banks");
      setBanks(res || []);
    } catch (err) {
      console.error("Erro bancos:", err);
    }
  };

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/dashboard-stats?days=${filterDays}`);
      setData(res);
    } catch (err) {
      console.error("Erro ao carregar dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899"];

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
    </div>
  );

  const topOriginValue = data?.stats?.top_origin_bank;
  const topOriginLogo = data?.stats?.top_origin_logo;

  const stats = [
    { title: "Top Banco", label: "O banco mais indicado", value: data?.stats?.top_bank, img: data?.stats?.top_bank_logo, icon: <Icons.Bank />, color: "blue", isBank: true },
    { title: "Banco Mais Portado", label: "Origem mais frequente", value: topOriginValue, valueImg: topOriginLogo, icon: <Icons.History />, color: "pink", isBank: true },
    { title: "Melhor Tabela", label: "A tabela mais indicada", value: data?.stats?.top_table, img: data?.stats?.top_table_logo, icon: <Icons.Table />, color: "emerald", isBank: true },
    { title: "Taxa Média", label: "A taxa mais indicada", value: data?.stats?.avg_rate, icon: <Icons.Percent />, color: "purple" },
  ];

  const handleAccept = async (sim, offer) => {
    try {
      const payload = {
        client_name: sim.client_name || "Cliente",
        banco: offer.bank_name || `Banco ${offer.bank_id}`,
        taxa_juros: offer.offered_rate,
        valor_liberado: offer.release_amount,
        parcela_nova: 0, // Need to recover this
        prazo: 0 
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/pdf/generate-proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Erro ao gerar PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposta_${sim.client_name}.pdf`;
      a.click();
    } catch (error) {
      alert("Erro ao baixar PDF");
    }
  };

  const handleGoToOffers = (sim) => {
    // Mimic the simulation result state to show the specific offers
    const mockResults = sim.results.map(r => ({
        banco: `Banco ${r.bank_id}`,
        bank_id: r.bank_id,
        tabela: r.table_name,
        taxa_juros: r.offered_rate,
        valor_liberado: r.release_amount,
        valor_total_contrato: r.release_amount + 10000, // mock increment
        convenio: sim.agreement,
        elegivel: r.is_approved
    }));
    sessionStorage.setItem("simulation_results", JSON.stringify(mockResults));
    sessionStorage.setItem("simulation_input", JSON.stringify({ nome_cliente: sim.client_name, convenio: sim.agreement }));
    router.push("/ofertas");
  };

  const handleExportPDF = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/export-stats-pdf?days=${filterDays}`;
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error("Erro ao gerar PDF");
      const blob = await response.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = `relatorio_minha_rede_${filterDays}d.pdf`;
      a.click();
    } catch (e) {
      alert("Erro ao exportar PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[98%] mx-auto px-4 py-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">Dashboard <span className="text-blue-600">Simulações</span></h1>
        <p className="text-slate-500 font-medium">Métricas reais de performance e comportamento dos simuladores.</p>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-white/10 shadow-xl hover:scale-[1.02] transition-all">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 overflow-hidden shadow-inner ${s.img ? 'p-0 border-none' : `bg-${s.color}-500/10 border border-${s.color}-500/20`}`}>
              {s.img ? (
                 <img src={getStaticUrl(s.img)} className="w-full h-full object-cover block" />
              ) : (
                 <span className={`text-${s.color}-600`}>{s.icon}</span>
              )}
            </div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.title}</h3>
            <p className="text-[10px] font-black text-slate-500 mb-2 uppercase tracking-tight">{s.label}</p>
            {s.img || s.valueImg ? (
              <div className="flex items-center gap-2">
                <div className={`rounded-xl overflow-hidden shadow-sm shrink-0 flex items-center justify-center border-none ${s.isBank ? 'w-10 h-10' : 'w-7 h-7'} bg-slate-50 dark:bg-white/5`}>
                  <img 
                    src={getStaticUrl(s.valueImg || s.img)} 
                    className="w-full h-full object-cover block"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://cdn-icons-png.flaticon.com/512/2830/2830284.png"; // Fallback bank icon
                    }}
                  />
                </div>
                <p className={`font-black text-slate-800 dark:text-white leading-tight break-words ${s.isBank ? 'text-sm' : 'text-xs'}`}>{s.value}</p>
              </div>
            ) : (
              <p className="text-sm font-black text-slate-800 dark:text-white leading-tight break-words">{s.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* Admin/Promotora Ranking Box */}
      {(role === 'admin' || role === 'promotora') && data && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 p-10 rounded-[3rem] shadow-xl relative overflow-hidden group mb-8">
           <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 dark:bg-blue-600/10 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-700"></div>
           <div className="relative z-10 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.3em]">RANKING DE SIMULAÇÕES</h4>
                
                <div className="flex items-center gap-2">
                  <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex items-center shadow-inner border border-slate-200 dark:border-white/5">
                    {[
                      { label: 'Hoje', val: 1 }, 
                      { label: '7D', val: 7 }, 
                      { label: '15D', val: 15 }, 
                      { label: '30D', val: 30 }
                    ].map(opt => (
                      <button
                        key={opt.val}
                        onClick={() => { setFilterDays(opt.val); }}
                        className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${filterDays === opt.val ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={handleExportPDF}
                    className="px-3 py-1.5 text-[9px] font-black text-white uppercase tracking-widest rounded-lg transition-all bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/30 flex items-center gap-1 shrink-0"
                  >
                    <Icons.Download size={12} /> PDF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-2">
                 {/* Top 5 Bancos */}
                 <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-4 tracking-widest border-b border-slate-200 dark:border-white/10 pb-2">Top 10 Bancos</p>
                    <div className="space-y-4">
                       {data.stats.top_3_banks && data.stats.top_3_banks.slice(0, 10).map((b, i) => (
                         <div key={i} className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full overflow-hidden bg-white flex items-center justify-center shrink-0 border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                             {b.logo ? <img src={b.logo.startsWith('http') || b.logo.startsWith('data:') ? b.logo : `http://127.0.0.1:8000${b.logo.startsWith('/') ? '' : '/'}${b.logo}`} className="w-full h-full object-cover"/> : <span className="text-slate-800 text-sm font-black">{b.name.charAt(0)}</span>}
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{b.name}</p>
                              <p className="text-[10px] text-emerald-500 dark:text-emerald-400 font-black uppercase tracking-widest"><span className="text-slate-400 dark:text-slate-500 mr-1">#{i + 1}</span> R$ {b.total_volume?.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) || "0,00"}</p>
                              <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">{b.count} Simulações</p>
                           </div>
                         </div>
                       ))}
                    </div>
                 </div>

                 {/* Top 5 Corretores */}
                 <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-4 tracking-widest border-b border-slate-200 dark:border-white/10 pb-2">Top 10 Corretores</p>
                    <div className="space-y-4">
                       {data.stats.top_3_users && data.stats.top_3_users.slice(0, 10).map((u, i) => (
                         <div key={i} className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                             {u.avatar ? <img src={u.avatar.startsWith('http') || u.avatar.startsWith('data:') ? u.avatar : `http://127.0.0.1:8000${u.avatar.startsWith('/') ? '' : '/'}${u.avatar}`} className="w-full h-full object-cover"/> : <span className="text-slate-800 dark:text-white text-sm font-black">{u.name.charAt(0)}</span>}
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{u.name}</p>
                              <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest"><span className="text-slate-400 dark:text-slate-500 mr-1">#{i + 1}</span> {u.count} Vendas</p>
                           </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Line Chart */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-white/10 shadow-xl">
          <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase mb-8">Tendência por Convênio (Simulações)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.historical}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} fontStyle="bold" />
                <YAxis axisLine={false} tickLine={false} fontSize={10} />
                <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
                {data?.agreements?.map((agr, idx) => (
                  <Line 
                    key={agr.name} 
                    type="monotone" 
                    dataKey={agr.name} 
                    stroke={COLORS[idx % COLORS.length]} 
                    strokeWidth={4} 
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 8 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row for Pie and Bar */}
        <div className="space-y-8">
           <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-white/10 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-8 h-full items-center">
                <div>
                   <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase mb-2">Distribuição</h3>
                   <p className="text-xs text-slate-500 font-bold mb-4">Volume total por convênio realizado no período</p>
                   <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={data?.agreements} 
                            innerRadius={60} 
                            outerRadius={80} 
                            paddingAngle={5} 
                            dataKey="value"
                            stroke="none"
                          >
                            {data?.agreements?.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                   </div>
                </div>

                <div className="flex flex-col justify-center gap-4">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase">Destaque Convênios</h3>
                   <div className="w-full h-12 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex shadow-inner">
                      {data?.agreements?.map((agr, idx) => {
                         const total = data.agreements.reduce((acc, curr) => acc + curr.value, 0);
                         const percent = (agr.value / total) * 100;
                         return (
                           <div 
                              key={idx} 
                              style={{ width: `${percent}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                              className="h-full hover:brightness-110 transition-all cursor-pointer relative group"
                           >
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                                {agr.name}: {agr.value}
                              </div>
                           </div>
                         )
                      })}
                   </div>
                   <div className="flex flex-wrap gap-4 mt-2">
                       {data?.agreements?.map((agr, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                             <span className="text-[10px] font-black text-slate-500 uppercase">{agr.name}</span>
                          </div>
                       ))}
                   </div>
                </div>
           </div>
        </div>
      </div>

      {/* Recent Simulations List */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-white/10 shadow-xl">
          <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase mb-8">Simulações Recentes de Usuários</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
               <thead>
                 <tr className="text-left border-b border-slate-50 dark:border-white/5">
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Usuário / Avatar</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Cliente</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Banco Indicado</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Convênio</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 text-center">Ações</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {data?.recent_simulations?.map((sim, idx) => {
                     const bestResult = [...(sim.results || [])].filter(r => r.is_approved).sort((a,b) => b.release_amount - a.release_amount)[0];
                     return (
                        <tr key={idx} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                           <td className="py-4 px-4">
                               <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-black text-white shadow-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                    {sim.user_avatar ? (
                                        <img src={sim.user_avatar.startsWith('http') || sim.user_avatar.startsWith('data:') ? sim.user_avatar : `http://127.0.0.1:8000${sim.user_avatar.startsWith('/') ? '' : '/'}${sim.user_avatar}`} className="w-full h-full object-cover"/>
                                    ) : (
                                        sim.user_name.charAt(0)
                                    )}
                                 </div>
                                 <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{sim.user_name}</span>
                              </div>
                           </td>
                           <td className="py-4 px-4 text-sm font-black text-slate-800 dark:text-white">{sim.client_name}</td>
                           <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                 {bestResult?.bank_logo ? (
                                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-100 bg-white">
                                       <img src={getStaticUrl(bestResult.bank_logo)} alt="Logo" className="w-full h-full object-cover" />
                                    </div>
                                 ) : (
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400">
                                       <Icons.Bank size={16} />
                                    </div>
                                 )}
                                 <div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{bestResult ? (bestResult.bank_name || `Banco ${bestResult.bank_id}`) : "Nenhum"}</span>
                                    <p className="text-[10px] font-black text-slate-400 italic">{bestResult?.table_name || "N/A"}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="py-4 px-4">
                              <span className="px-2 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-tighter border border-blue-100 dark:border-blue-500/20">
                                 {sim.agreement}
                              </span>
                           </td>
                           <td className="py-4 px-4">
                              <div className="flex items-center justify-center gap-2">
                                 <button 
                                    onClick={() => bestResult && handleAccept(sim, bestResult)}
                                    className="p-2 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-500 rounded-xl transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-500/20"
                                    title="Baixar PDF"
                                 >
                                    <Icons.Download size={18} />
                                 </button>
                                 <button 
                                    onClick={() => handleGoToOffers(sim)}
                                    className="p-2 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-blue-500 rounded-xl transition-all border border-transparent hover:border-blue-100 dark:hover:border-blue-500/20"
                                    title="Ver Ofertas"
                                 >
                                    <Icons.Rocket size={18} />
                                 </button>
                              </div>
                           </td>
                        </tr>
                     )
                  })}
               </tbody>
            </table>
          </div>
      </div>
    </div>
  );
}
