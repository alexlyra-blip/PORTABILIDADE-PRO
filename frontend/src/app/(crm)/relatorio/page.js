"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { api } from "@/utils/api";
import PageHeader from "@/components/PageHeader";
import { Icons } from "@/components/Icons";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";

const CONVENIO_COLORS = {
  'INSS': '#2563eb',
  'SIAPE': '#10b981',
  'FGTS': '#f59e0b',
  'GOVERNO': '#8b5cf6',
  'OUTROS': '#64748b'
};

const RANDOM_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function RelatorioPage() {
  const [contracts, setContracts] = useState([]);
  const contractsRef = useRef(contracts);
  useEffect(() => {
    contractsRef.current = contracts;
  }, [contracts]);

  const [dailyData, setDailyData] = useState([]);
  const [quantityData, setQuantityData] = useState([]);
  const [convenioData, setConvenioData] = useState([]);
  const [availableConvenios, setAvailableConvenios] = useState([]);
  const [totals, setTotals] = useState({ qtd: 0, valor: 0, troco: 0, cipHojeQtd: 0, cipHojeValor: 0 });
  const [meta, setMeta] = useState({ tipo: 'mensal', valor_diario: 5000, valor_alvo: 110000, progresso: 0 });

  useEffect(() => {
    // Carrega meta do storage no topo do escopo do useEffect
    const savedMetaRaw = localStorage.getItem("meta_config");
    let currentMeta = { tipo: 'mensal', valor_diario: 5000, valor_alvo: 110000 };
    if (savedMetaRaw) {
      try {
        const parsed = JSON.parse(savedMetaRaw);
        currentMeta = {
          tipo: parsed.tipo || 'mensal',
          valor_diario: parsed.valor_diario || 5000,
          valor_alvo: parsed.valor_alvo || 110000
        };
      } catch(e) {}
    }

    const loadInitialData = () => {
      setMeta(prev => ({ ...prev, ...currentMeta }));

      // Processa contratos locais IMEDIATAMENTE
      const localDataRaw = localStorage.getItem("accepted_contracts");
      if (localDataRaw) {
        try {
          const localData = JSON.parse(localDataRaw);
          if (localData && localData.length > 0) {
            setContracts(localData);
            processChartData(localData, currentMeta);
          }
        } catch(e) {}
      }
    };

    const fetchServerData = async () => {
      try {
        const res = await api.get('/admin/simulations');
        const serverData = res.data || res;
        
        // Mapeia o formato da API para o formato esperado pelo dashboard
        const formattedContracts = serverData.map(sim => {
          const bestResult = sim.results
            ?.filter(r => r.is_approved)
            ?.sort((a, b) => (b.release_amount || 0) - (a.release_amount || 0))[0];

          return {
            id: sim.id,
            cliente: sim.client_name,
            cpf: sim.client_cpf,
            banco: bestResult?.bank_name || "N/A",
            convenio: sim.agreement,
            valor_contrato: (sim.debt_balance || 0) + (bestResult?.release_amount || 0),
            valor_troco: bestResult?.release_amount || 0,
            parcela: sim.installment_value || 0,
            status: 'PAGO', // Simplificado para o dashboard de resultados
            data_aceite: sim.created_at?.split('T')[0],
            user_id: sim.user_id
          };
        });

        setContracts(formattedContracts);
        processChartData(formattedContracts, currentMeta);
      } catch (error) {
        console.error("Erro ao carregar relatório:", error);
        
        // Fallback para localStorage se a API falhar
        const saved = localStorage.getItem("accepted_contracts");
        if (saved) {
           try {
              let parsed = JSON.parse(saved);
              setContracts(parsed);
              processChartData(parsed, currentMeta);
           } catch(e) {}
        }
      }
    };

    loadInitialData();
    fetchServerData();

    // Sincronização em tempo real com o Header
    const handleStorageChange = () => {
       const savedMetaRaw = localStorage.getItem("meta_config");
       if (savedMetaRaw) {
          try {
             const parsed = JSON.parse(savedMetaRaw);
             setMeta(prev => {
                if (prev.valor_diario === parsed.valor_diario && prev.tipo === parsed.tipo && prev.valor_alvo === parsed.valor_alvo) return prev;
                const newMeta = { ...prev, ...parsed };
                setTimeout(() => {
                   processChartData(contractsRef.current, newMeta);
                }, 0);
                return newMeta;
             });
          } catch(e) {}
       }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('meta-updated', handleStorageChange);
    return () => {
       window.removeEventListener('storage', handleStorageChange);
       window.removeEventListener('meta-updated', handleStorageChange);
    };
  }, []);

  const updateMeta = (updates) => {
    const newMeta = { ...meta, ...updates };
    
    // Só recalcula o valor alvo se a mudança for no tipo ou no valor diário
    if (updates.tipo || updates.valor_diario) {
       let calculatedAlvo = Number(newMeta.valor_diario);
       if (newMeta.tipo === 'semanal') calculatedAlvo = Number(newMeta.valor_diario) * 5;
       if (newMeta.tipo === 'mensal') calculatedAlvo = Number(newMeta.valor_diario) * 22;
       newMeta.valor_alvo = calculatedAlvo;
    }
    
    localStorage.setItem("meta_config", JSON.stringify({ 
      tipo: newMeta.tipo, 
      valor_diario: newMeta.valor_diario,
      valor_alvo: newMeta.valor_alvo
    }));
    window.dispatchEvent(new Event('meta-updated'));
    
    setMeta(newMeta);
    processChartData(contracts, newMeta);
  };

  const processChartData = (data, currentMeta) => {
    const dailyMap = {}; // Para o financeiro (Barras)
    const quantityMap = {}; // Para as quantidades por convênio (Linhas)
    const convenioMap = {};
    const allConveniosSet = new Set();
    
    let totalQtd = 0;
    let totalValor = 0;
    let totalTroco = 0;
    let expectedCipTodayCount = 0;
    let expectedCipTodayValue = 0;
    let pagoProgress = 0;
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const savedContracts = localStorage.getItem("accepted_contracts");
    let allData = data;

    if (savedContracts) {
       try {
          const parsed = JSON.parse(savedContracts);
          if (parsed && parsed.length > 0) allData = parsed;
       } catch(e) {}
    }

    allData.forEach(item => {
      const vContrato = Number(item.valor_contrato || item.parcela || 0);
      const vTroco = Number(item.valor_troco || 0);
      const conv = item.convenio || "Outros";
      allConveniosSet.add(conv);

      // Totals
      totalQtd++;
      totalValor += vContrato;
      totalTroco += vTroco;

      // CIP Hoje
      if (item.status === 'AG. RETORNO CIP' || item.data_cip === todayStr) {
         expectedCipTodayCount++;
         expectedCipTodayValue += vContrato;
      }

      // Filtro de Período (Para a Barra de Meta e todos os Gráficos)
      let isInPeriod = false;
      const itemDate = item.data_aceite ? new Date(item.data_aceite + "T12:00:00") : null;
      if (item.data_aceite) {
         if (currentMeta.tipo === 'mensal') {
            const itemMonth = item.data_aceite.substring(0, 7);
            const todayMonth = todayStr.substring(0, 7);
            if (itemMonth === todayMonth) isInPeriod = true;
         } else if (currentMeta.tipo === 'semanal' && itemDate) {
            const diff = today.getTime() - itemDate.getTime();
            // Permite 1 dia de folga no futuro para compensar UTC
            if (diff >= -86400000 && diff < 7 * 24 * 60 * 60 * 1000) isInPeriod = true;
         } else if (currentMeta.tipo === 'diaria') {
            if (item.data_aceite === todayStr) isInPeriod = true;
         }
      }

      if (isInPeriod) {
         pagoProgress += vContrato;

         // 1. Financeiro Diário (Para o BarChart)
         const date = item.data_aceite || "N/A";
         if (!dailyMap[date]) {
            dailyMap[date] = { date, digitado: 0, pago: 0, reprovado: 0 };
         }
         dailyMap[date].digitado += vContrato;
         if (item.status === 'PAGO') dailyMap[date].pago += vContrato;
         if (item.status === 'REPROVADO') dailyMap[date].reprovado += vContrato;

         // 2. Quantidade Diária por Convênio (Para o LineChart)
         if (!quantityMap[date]) {
            quantityMap[date] = { date };
         }
         if (!quantityMap[date][conv]) quantityMap[date][conv] = 0;
         quantityMap[date][conv] += 1;

         // 3. Distribuição (Pizza)
         if (!convenioMap[conv]) {
            convenioMap[conv] = { name: conv, value: 0 };
         }
         convenioMap[conv].value += 1;
      }
    });

    const totalFinanceiro = Object.values(convenioMap).reduce((acc, curr) => acc + curr.value, 0);
    const cData = Object.values(convenioMap).map(c => ({
      ...c,
      percent: totalFinanceiro > 0 ? ((c.value / totalFinanceiro) * 100).toFixed(1) : 0
    }));

    // Formata dados para os gráficos
    const dData = Object.values(dailyMap).sort((a,b) => new Date(a.date) - new Date(b.date));
    const qData = Object.values(quantityMap).sort((a,b) => new Date(a.date) - new Date(b.date));
    
    setDailyData(dData);
    setQuantityData(qData);
    setConvenioData(cData);
    setAvailableConvenios(Array.from(allConveniosSet));
    setTotals({ qtd: totalQtd, valor: totalValor, troco: totalTroco, cipHojeQtd: expectedCipTodayCount, cipHojeValor: expectedCipTodayValue });
    setMeta(prev => ({ ...prev, progresso: pagoProgress }));
  };

  const formatCurrency = (value) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  
  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

  const downloadReport = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const reportData = contracts.filter(c => c.status === 'AG. RETORNO CIP' && c.data_cip === todayStr);
    
    if (reportData.length === 0) {
       alert("Nenhum contrato com saldo retornável (" + todayStr + ") foi localizado na esteira.");
       return;
    }

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      
      const element = document.createElement('div');
      element.innerHTML = `
        <div style="padding: 40px; font-family: Arial, sans-serif; color: #1e293b;">
           <h1 style="color: #2563eb; font-size: 24px; margin-bottom: 5px; text-transform: uppercase;">Relatório Diário - Retorno de Saldos (CIP)</h1>
           <p style="color: #64748b; font-size: 14px; margin-bottom: 40px; font-weight: bold;">Data de Extração: ${new Date().toLocaleDateString('pt-BR')}</p>
           
           <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;">
             <thead>
               <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; text-transform: uppercase; font-size: 10px; color: #64748b;">
                  <th style="padding: 12px;">Cliente</th>
                  <th style="padding: 12px;">CPF</th>
                  <th style="padding: 12px;">Banco / Convênio</th>
                  <th style="padding: 12px; text-align: right;">Parcela</th>
                  <th style="padding: 12px; text-align: right;">Valor Contrato (Bruto)</th>
               </tr>
             </thead>
             <tbody>
               ${reportData.map(c => `
                 <tr style="border-bottom: 1px solid #f1f5f9;">
                   <td style="padding: 12px; font-weight: bold;">${c.cliente || 'N/A'}</td>
                   <td style="padding: 12px;">${c.cpf || 'N/A'}</td>
                   <td style="padding: 12px;">${c.banco || 'N/A'}<br/><span style="font-size: 10px; color: #94a3b8;">${c.convenio || ''}</span></td>
                   <td style="padding: 12px; text-align: right;">${formatCurrency(c.parcela)}</td>
                   <td style="padding: 12px; text-align: right; color: #10b981; font-weight: bold;">${formatCurrency(c.valor_contrato)}</td>
                 </tr>
               `).join('')}
             </tbody>
           </table>
           <div style="margin-top: 40px; text-align: right; font-size: 16px; font-weight: bold; background: #f0fdf4; padding: 20px; border-radius: 12px;">
              Volume Financeiro Previsto Hoje:<br/>
              <span style="color: #10b981; font-size: 24px;">${formatCurrency(totals.cipHojeValor)}</span>
           </div>
        </div>
      `;

      const opt = {
        margin:       [10, 10, 10, 10],
        filename:     `Relatorio_Saldos_CIP_${todayStr}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(element).save();
    } catch (e) {
      console.error(e);
      alert("Erro ao tentar gerar PDF localmente.");
    }
  };

  return (
    <div className="w-full max-w-[98%] mx-auto px-4 py-6 space-y-8 animate-fade-in">
      <PageHeader 
        title="Dashboard de" 
        highlight="Resultados" 
        subtitle="Análise de Produção Consignado"
      >
        <button onClick={downloadReport} className="px-6 py-4 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-600/30 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-sm hover:scale-105 transition-all flex items-center gap-2">
          <Icons.Download size={14} /> Baixar Relatório CIP
        </button>
        <Link href="/meus-contratos" className="px-8 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-sm hover:scale-105 transition-all flex items-center gap-2">
          <Icons.FileText size={14} className="text-slate-700 dark:text-slate-300" /> Contratos
        </Link>
        <Link href="/simulador" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-500/30 hover:scale-105 transition-all flex items-center gap-2">
          <Icons.Plus size={14} className="text-white" /> Nova Simulação
        </Link>
      </PageHeader>

      {totals.qtd === 0 ? (
          <div className="bg-white dark:bg-slate-900 p-12 rounded-[3rem] border border-slate-100 dark:border-white/10 text-center shadow-sm">
             <h3 className="text-xl font-black text-slate-500 uppercase tracking-widest">Aguardando Dados</h3>
             <p className="text-slate-400 text-sm mt-2">Você precisa aprovar ofertas no simulador para gerar relatórios.</p>
          </div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl flex flex-col justify-center">
               <div className="flex items-center justify-between mb-2">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contratos</p>
                 <span className="text-xl">📝</span>
               </div>
               <p className="text-3xl font-black text-slate-800 dark:text-white">{totals.qtd}</p>
            </div>
            
            <div className="bg-blue-600 p-6 rounded-[2rem] shadow-2xl shadow-blue-500/30 flex flex-col justify-center">
               <div className="flex items-center justify-between mb-2">
                 <p className="text-[9px] font-black text-white/70 uppercase tracking-widest">Bruto Produzido</p>
                 <span className="text-xl">💰</span>
               </div>
               <p className="text-2xl lg:text-3xl font-black text-white">{formatCurrency(totals.valor)}</p>
            </div>
            
            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-500/10 p-6 rounded-[2rem] shadow-xl flex flex-col justify-center">
               <div className="flex items-center justify-between mb-2">
                 <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Troco / Líquido</p>
                 <span className="text-xl">💸</span>
               </div>
               <p className="text-2xl lg:text-3xl font-black text-emerald-700 dark:text-emerald-500">{formatCurrency(totals.troco)}</p>
            </div>

            <div className="bg-emerald-500 p-6 rounded-[2rem] shadow-2xl shadow-emerald-500/30 flex flex-col justify-center xl:scale-105 transition-all">
               <div className="flex items-center justify-between mb-2">
                 <p className="text-[9px] font-black text-white uppercase tracking-tight">Saldos Retornados No Dia ({formatCurrency(totals.cipHojeValor)})</p>
                 <span className="text-xl">⏱</span>
               </div>
               <p className="text-3xl lg:text-4xl font-black text-white">{totals.cipHojeQtd}</p>
            </div>
          </div>

          {/* Meta Progress Block */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div className="pl-4 border-l-4 border-blue-600">
                   <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Meta de Produção (Bruto Produzido)</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acompanhe sua produtividade total no período</p>
                </div>
                 <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <select 
                       className="bg-transparent text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase outline-none cursor-pointer"
                       value={meta.tipo}
                       onChange={(e) => updateMeta({ tipo: e.target.value })}
                    >
                       <option value="diaria">Meta Diária</option>
                       <option value="semanal">Meta Semanal</option>
                       <option value="mensal">Meta Mensal</option>
                    </select>
                    <div className="h-6 w-px bg-slate-300 dark:bg-slate-600"></div>
                     <div className="flex flex-col">
                       <span className="text-[8px] font-black text-slate-400 uppercase">Valor do Alvo ({meta.tipo})</span>
                       <input 
                          type="number" 
                          className="bg-transparent w-32 text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase outline-none border-b border-blue-500/20 focus:border-blue-500"
                          placeholder="Valor Alvo"
                          value={meta.valor_alvo}
                          readOnly
                       />
                    </div>
                 </div>
             </div>

             <div className="relative pt-4">
                <div className="flex justify-between items-end mb-3">
                   <div>
                      <span className="text-4xl font-black text-blue-600">{formatCurrency(meta.progresso)}</span>
                      <span className="text-sm font-bold text-slate-400 ml-2">atingidos</span>
                   </div>
                    <div className="text-right">
                       <span className="text-sm font-black text-slate-800 dark:text-white">{((meta.progresso / (meta.valor_alvo || 1)) * 100).toFixed(1)}%</span>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">de {formatCurrency(meta.valor_alvo)}</p>
                    </div>
                </div>
                <div className="w-full h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner border border-slate-200 dark:border-slate-700 relative">
                   <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-in-out relative shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                      style={{ width: `${Math.min((meta.progresso / (meta.valor_alvo || 1)) * 100, 100)}%` }}
                   >
                     {/* Gloss effect */}
                     <div className="absolute top-0 left-0 w-full h-1/2 bg-white/20"></div>
                   </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gráfico de Linha: Produção Diária (Quantidade) */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl">
               <div className="mb-8 pl-4 border-l-4 border-blue-500">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Quantidade Diária</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Evolução de Propostas por Convênio</p>
               </div>
               <div className="h-72 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={quantityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                      {availableConvenios.map((conv, idx) => (
                         <Line 
                            key={conv}
                            type="monotone" 
                            dataKey={conv} 
                            name={conv} 
                            stroke={CONVENIO_COLORS[conv?.toUpperCase()] || RANDOM_COLORS[idx % RANDOM_COLORS.length]} 
                            strokeWidth={3}
                            dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                         />
                      ))}
                    </LineChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* Gráfico de Barras: Valor Diário (Financeiro) */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl">
               <div className="mb-8 pl-4 border-l-4 border-emerald-500">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Volume Financeiro Diário</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor Bruto do Contrato</p>
               </div>
               <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="date" 
                        tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} 
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <YAxis tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} axisLine={false} tickLine={false} tickFormatter={(val) => `R$ ${val/1000}k`} />
                      <Tooltip 
                        formatter={(value) => formatCurrency(value)} 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                      <Bar dataKey="digitado" name="Volume Digitado" fill="#2563eb" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="pago" name="Volume Pago" fill="#10b981" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="reprovado" name="Volume Reprovado" fill="#ef4444" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gráfico de Rosca: Participação por Convênio */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl flex flex-col items-center">
               <div className="w-full mb-4 pl-4 border-l-4 border-purple-500">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Distribuição por Convênio</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contratos Totais por Órgão</p>
               </div>
               <div className="h-64 w-full flex justify-center">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie data={convenioData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                        {convenioData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [formatCurrency(value) + ` (${props.payload.percent}%)`, name]}
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* Painel Extra / Espaço para Insights Futuros */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-10 rounded-[2.5rem] shadow-2xl flex flex-col justify-center text-white relative overflow-hidden group">
               <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-all duration-700"></div>
               <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-black/10 rounded-full blur-2xl"></div>
               <div className="relative z-10 space-y-4">
                  <div className="w-16 h-16 rounded-[1.2rem] bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-lg border border-white/20">🚀</div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter leading-tight">Insight<br/>Automático</h3>
                  <p className="text-sm font-bold text-blue-100 max-w-sm mt-4 leading-relaxed">O convênio com maior demanda neste período foi <span className="underline decoration-2 underline-offset-4">{[...convenioData].sort((a,b)=>b.value-a.value)[0]?.name || "N/A"}</span>. Concentre seus esforços de marketing neste público para potencializar os resultados do simulador.</p>
               </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
