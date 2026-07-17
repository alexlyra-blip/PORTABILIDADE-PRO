"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { api, getStaticUrl } from "@/utils/api";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, PieChart, Pie, Cell 
} from "recharts";
import { useRouter } from "next/navigation";

import { Icons } from "@/components/Icons";


export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [filterDays, setFilterDays] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [role, setRole] = useState("vendedor");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    loadDashboardStats(true);
    
    // Auto-refresh inteligente a cada 2 minutos (120000ms) alinhado com o cache
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadDashboardStats(false);
      }
    }, 120000);
    
    return () => clearInterval(interval);
  }, [filterDays]);

  const loadDashboardStats = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
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

  const getFullOriginBankName = (orig) => {
    if (!orig) return 'N/A';
    const map = {
       "001": "BANCO DO BRASIL", "033": "SANTANDER", "104": "CAIXA", "237": "BRADESCO",
       "341": "ITAU", "077": "INTER", "025": "ALFA", "626": "C6", "422": "SAFRA",
       "041": "BANRISUL", "707": "DAYCOVAL", "655": "VOTORANTIM", "623": "PAN",
       "069": "BPN", "212": "ORIGINAL", "047": "BANESE", "935": "FACTA", "012": "INBURSA", "000": "BVC"
    };
    const code = String(orig).trim().substring(0,3);
    if(map[code]) return `${code} - ${map[code]}`;
    return orig;
  };

  const statCards = [
    { title: "Top Banco", desc: "Mais indicado", value: data.stats.top_bank, img: data.stats.top_bank_logo, icon: <Icons.Bank />, color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    { title: "Mais Portado", desc: "Origem frequente", value: getFullOriginBankName(data.stats.top_origin_bank), img: data.stats.top_origin_logo, icon: <Icons.History />, color: "bg-pink-500/10 text-pink-600 border-pink-500/20" },
    { title: "Tabela Campeã", desc: "Tabela Mais Indicada", value: data.stats.top_table, img: data.stats.top_table_logo, icon: <Icons.Table />, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    { title: "Taxa Média", desc: "Taxa Média", value: data.stats.avg_rate, icon: <Icons.Percent />, color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  ];

  const itemsPerPage = 10;
  const totalPages = Math.ceil(data.recent_simulations.length / itemsPerPage) || 1;
  const paginatedSimulations = data.recent_simulations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="w-full max-w-[98%] mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-700">
      
      <PageHeader 
        title="Dashboard" 
        highlight="Simulações" 
        subtitle="Análise de Performance Comercial"
      >
        <select 
          value={filterDays} 
          onChange={(e) => {
            setFilterDays(Number(e.target.value));
            setCurrentPage(1);
          }}
          className="py-3 px-6 bg-white hover:bg-slate-50 text-slate-800 rounded-2xl border-none shadow-xl text-[11px] font-black uppercase tracking-widest outline-none cursor-pointer transition-all hover:-translate-y-0.5"
        >
          <option value={1} className="text-slate-800">Hoje</option>
          <option value={7} className="text-slate-800">7 Dias</option>
          <option value={30} className="text-slate-800">30 Dias</option>
          <option value={90} className="text-slate-800">90 Dias</option>
        </select>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all group relative overflow-hidden flex flex-col justify-between">
            <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center mb-5 overflow-hidden shadow-lg shrink-0 ${card.img ? 'bg-white border-2 border-slate-100' : card.color}`}>
              {card.img ? (
                 <img src={getStaticUrl(card.img)} loading="eager" fetchPriority="high" className="w-full h-full object-cover" alt={card.title} />
              ) : (
                 <div className="opacity-90">{card.icon}</div>
              )}
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.desc}</p>
              <h3 className="text-sm leading-tight font-black text-slate-800 dark:text-white uppercase tracking-tight" title={card.value}>
                {card.value || "—"}
              </h3>
            </div>
            <div className="absolute -top-4 -right-4 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none scale-150 transform rotate-12">
               {card.icon}
            </div>
            {/* Soft bottom glow */}
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 blur-3xl opacity-20 pointer-events-none ${card.color.split(' ')[0]}`}></div>
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
            {mounted && data.historical.length > 0 ? (
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
            ) : !mounted ? (
              <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-100 dark:border-white/5 rounded-3xl">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Carregando Gráficos...</p>
              </div>
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
            {mounted && data.agreements.length > 0 ? (
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
            ) : !mounted ? (
              <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-100 dark:border-white/5 rounded-3xl">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Carregando Convenios...</p>
              </div>
            ) : (
               <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-100 dark:border-white/5 rounded-3xl">
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhuma fatia</p>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Simulacoes Recentes (Mesa de Operações) */}
      <div id="operations-table" className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div>
             <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Mesa de Operações</h3>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Últimas Simulações Detalhadas</p>
           </div>
           {totalPages > 1 && (
             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-white/5 px-4 py-2 rounded-xl border border-slate-100 dark:border-white/5">
               Página {currentPage} de {totalPages} ({data.recent_simulations.length} total)
             </div>
           )}
        </div>
        <div className="p-2 overflow-x-auto">
          {paginatedSimulations.length > 0 ? (
            <div className="min-w-[1000px] divide-y divide-slate-50 dark:divide-white/5">
              {paginatedSimulations.map((sim, i) => {
                // Get the best result to show in the table (highest release amount)
                const results = sim.results || [];
                const bestResult = results.length > 0 
                  ? results.reduce((prev, current) => (prev.release_amount > current.release_amount) ? prev : current)
                  : null;

                return (
                  <div key={i} className="grid grid-cols-5 gap-4 items-center p-4 hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all">
                    {/* Coluna 1: Consultor */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-slate-800 border-2 border-white dark:border-slate-700 shadow-sm overflow-hidden flex items-center justify-center shrink-0">
                        {sim.user_avatar ? (
                          <img src={getStaticUrl(sim.user_avatar)} loading="eager" fetchPriority="high" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-black text-blue-600">{sim.user_name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Consultor</p>
                        <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase break-words whitespace-normal">{sim.user_name}</h4>
                      </div>
                    </div>

                    {/* Coluna 2: Banco Ofertado e Tabela */}
                    <div className="flex items-center gap-3 border-l border-slate-100 dark:border-white/10 pl-4">
                      {bestResult ? (
                        <>
                          <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                            {(bestResult.bank_logo || (data.bank_logos && data.bank_logos[bestResult.bank_id])) ? (
                              <img src={getStaticUrl(bestResult.bank_logo || data.bank_logos[bestResult.bank_id])} loading="eager" fetchPriority="high" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-black text-blue-600">{bestResult.bank_name.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase truncate max-w-[130px]">{bestResult.bank_name}</h4>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 max-w-[180px] break-words whitespace-normal" title={bestResult.table_name}>
                              {bestResult.table_name || "S/ Tabela"}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sem Oferta</div>
                      )}
                    </div>

                    {/* Coluna 3: Convênio e Banco Portado */}
                    <div className="border-l border-slate-100 dark:border-white/10 pl-4">
                      <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase truncate">{sim.agreement || "S/ CONVÊNIO"}</h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 max-w-[180px] break-words whitespace-normal" title={sim.current_bank}>
                        Portado: {getFullOriginBankName(sim.current_bank)}
                      </p>
                    </div>

                    {/* Coluna 4: Prazo e Parcela */}
                    <div className="border-l border-slate-100 dark:border-white/10 pl-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Prazo: {bestResult?.term || 0}x</p>
                      <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase">
                        Parc: R$ {(bestResult?.installment || 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}
                      </h4>
                    </div>

                    {/* Coluna 5: Valores */}
                    <div className="border-l border-slate-100 dark:border-white/10 pl-4 text-left flex flex-col items-start justify-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                        Contrato: R$ {(bestResult?.contract_value || 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}
                      </p>
                      <h4 className="text-sm font-black text-emerald-600 uppercase bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded inline-block">
                        Troco: R$ {(bestResult?.release_amount || 0).toLocaleString('pt-BR', {minimumFractionDigits:2})}
                      </h4>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 flex items-center justify-center">
               <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhuma operação na mesa</p>
            </div>
          )}
        </div>

        {/* Paging Footer Controls */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
            <button
              onClick={() => {
                setCurrentPage(prev => Math.max(prev - 1, 1));
                const el = document.getElementById("operations-table");
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              disabled={currentPage === 1}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest disabled:opacity-40 transition-all select-none hover:-translate-y-0.5"
            >
              ← Anterior
            </button>
            
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => {
                const isNear = Math.abs(page - currentPage) <= 2;
                const isFirstOrLast = page === 1 || page === totalPages;
                
                if (!isNear && !isFirstOrLast) {
                  if (page === 2 || page === totalPages - 1) {
                    return <span key={page} className="text-slate-300 text-xs px-1 select-none">...</span>;
                  }
                  return null;
                }
                
                return (
                  <button
                    key={page}
                    onClick={() => {
                      setCurrentPage(page);
                      const el = document.getElementById("operations-table");
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all ${
                      currentPage === page
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                        : "bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => {
                setCurrentPage(prev => Math.min(prev + 1, totalPages));
                const el = document.getElementById("operations-table");
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              disabled={currentPage === totalPages}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-widest disabled:opacity-40 transition-all select-none hover:-translate-y-0.5"
            >
              Próximo →
            </button>
          </div>
        )}
      </div>
      
    </div>
  );
}
