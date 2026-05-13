"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, getStaticUrl } from "@/utils/api";

export default function MeusContratosPage() {
   const [contracts, setContracts] = useState([]);
   const [searchQuery, setSearchQuery] = useState("");
   const [dbBanks, setDbBanks] = useState([]);
   const [subLogos, setSubLogos] = useState([]);
   const [currentUser, setCurrentUser] = useState(null);
   const [editingId, setEditingId] = useState(null);
   const [editData, setEditData] = useState({ cliente: "", cpf: "", numero_proposta: "" });

   useEffect(() => {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      setCurrentUser(user);

      const saved = localStorage.getItem("accepted_contracts");
      if (saved) {
         let parsed = JSON.parse(saved);
         parsed.forEach(c => {
            if (!c.status) c.status = 'PENDENTE';
         });

         // Filtrar visibilidade:
         // Admin vê tudo no localStorage (que é local à máquina)
         // Promotora vê o dela + time dela
         // Vendedor vê só o dele
         if (user && user.role !== 'admin') {
            if (user.role === 'promotora') {
               parsed = parsed.filter(c => c.user_id === user.id || c.broker_id === user.id || !c.user_id); // !c.user_id para legados se necessário
            } else {
               parsed = parsed.filter(c => c.user_id === user.id);
            }
         }

         setContracts(parsed);
      }

      Promise.all([
         api.get("/admin/banks").catch(() => []),
         api.get("/admin/sub-logos").catch(() => [])
      ]).then(([banksList, subLogosList]) => {
         setDbBanks(banksList);
         setSubLogos(subLogosList);
      });
   }, []);

   const updateStatus = (id, newStatus) => {
      const updated = contracts.map(c => {
         if (c.id === id) {
            let updatedContract = {
               ...c,
               status: newStatus,
               status_updated_at: Date.now()
            };

            if (newStatus === 'AG. RETORNO CIP' && c.status !== 'AG. RETORNO CIP') {
               const today = new Date();
               let daysAdded = 0;
               while (daysAdded < 5) {
                  today.setDate(today.getDate() + 1);
                  if (today.getDay() !== 0 && today.getDay() !== 6) {
                     daysAdded++;
                  }
               }
               updatedContract.data_cip = today.toISOString().split('T')[0];
            } else if (newStatus === 'SALDO QUITADO') {
               updatedContract.refin_status = 'AG. AVERBAÇÃO PORT';
               if (!updatedContract.port_status) {
                  updatedContract.port_status = 'AG. AVERBAÇÃO';
               }
            } else if (newStatus === 'PAGO') {
               updatedContract.data_pago = new Date().toISOString().split('T')[0];
               updatedContract.refin_status = 'AVERBADO';
            } else if (newStatus === 'REPROVADO') {
               updatedContract.data_reprovado = new Date().toISOString().split('T')[0];
            }
            return updatedContract;
         }
         return c;
      });
      setContracts(updated);
      localStorage.setItem("accepted_contracts", JSON.stringify(updated));
   };

   const deleteContract = (id) => {
      if (window.confirm("Tem certeza que deseja excluir esta proposta?")) {
         const updated = contracts.filter(c => c.id !== id);
         setContracts(updated);
         localStorage.setItem("accepted_contracts", JSON.stringify(updated));
      }
   };

   const updatePortStatus = (id, newPortStatus) => {
      const updated = contracts.map(c => {
         if (c.id === id) {
            return { ...c, port_status: newPortStatus };
         }
         return c;
      });
      setContracts(updated);
      localStorage.setItem("accepted_contracts", JSON.stringify(updated));
   };

   const startEditing = (contract) => {
      setEditingId(contract.id);
      setEditData({
         cliente: contract.cliente || "",
         cpf: contract.cpf || "",
         numero_proposta: contract.numero_proposta || ""
      });
   };

   const cancelEditing = () => {
      setEditingId(null);
      setEditData({ cliente: "", cpf: "", numero_proposta: "" });
   };

   const saveEdit = (id) => {
      const updated = contracts.map(c => {
         if (c.id === id) {
            return {
               ...c,
               cliente: editData.cliente,
               cpf: editData.cpf,
               numero_proposta: editData.numero_proposta
            };
         }
         return c;
      });
      setContracts(updated);
      localStorage.setItem("accepted_contracts", JSON.stringify(updated));
      setEditingId(null);
   };

   const formatCurrencyLocal = (value) => {
      return `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
   };

   const formatTaxa = (value) => {
      return `${Number(value || 0).toFixed(2)}%`;
   };

   const getReturningTodayCount = () => {
      return contracts.filter(c => {
         if (c.status !== 'AG. RETORNO CIP' || !c.data_cip) return false;
         const target = new Date(c.data_cip + "T23:59:59");
         const diff = target.getTime() - new Date().getTime();
         const daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
         return daysLeft === 0;
      }).length;
   };

   const formatCPF = (cpf) => {
      if (!cpf) return "";
      let val = cpf.replace(/\D/g, "");
      if (val.length > 11) val = val.slice(0, 11);
      if (val.length > 9) val = val.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
      else if (val.length > 6) val = val.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
      else if (val.length > 3) val = val.replace(/(\d{3})(\d{1,3})/, "$1.$2");
      return val;
   };

   const getFullOriginBankName = (orig) => {
      if (!orig) return 'BANCO BVC';
      const map = {
         "001": "BANCO DO BRASIL", "033": "SANTANDER", "104": "CAIXA", "237": "BRADESCO",
         "341": "ITAU", "077": "INTER", "025": "ALFA", "626": "C6", "422": "SAFRA",
         "041": "BANRISUL", "707": "DAYCOVAL", "655": "VOTORANTIM", "623": "PAN",
         "069": "BPN", "212": "ORIGINAL", "047": "BANESE", "935": "FACTA", "012": "INBURSA"
      };
      const codeMatch = orig.match(/^(\d{3})/);
      if (codeMatch && !orig.includes('-')) {
         const code = codeMatch[1];
         if (map[code]) return `${code} - ${map[code]}`;
      }
      return orig;
   };

   const getStats = () => {
      const total = contracts.length;
      const totalValue = contracts.reduce((acc, c) => acc + Number(c.valor_contrato || c.parcela || 0), 0);

      const pendentes = contracts.filter(c => (c.status || 'PENDENTE') === 'PENDENTE');
      const pendentesValue = pendentes.reduce((acc, c) => acc + Number(c.valor_contrato || c.parcela || 0), 0);

      const andamento = contracts.filter(c => ['AG. RETORNO CIP', 'SALDO QUITADO'].includes(c.status));
      const andamentoValue = andamento.reduce((acc, c) => acc + Number(c.valor_contrato || c.parcela || 0), 0);

      const pagas = contracts.filter(c => c.status === 'PAGO');
      const pagasValue = pagas.reduce((acc, c) => acc + Number(c.valor_contrato || c.parcela || 0), 0);

      const reprovadas = contracts.filter(c => c.status === 'REPROVADO');
      const reprovadasValue = reprovadas.reduce((acc, c) => acc + Number(c.valor_contrato || c.parcela || 0), 0);

      return {
         total, totalValue,
         pendentes: pendentes.length, pendentesValue,
         andamento: andamento.length, andamentoValue,
         pagas: pagas.length, pagasValue,
         reprovadas: reprovadas.length, reprovadasValue
      };
   };

   const getSortedContracts = () => {
      const statusOrder = ['AG. RETORNO CIP', 'SALDO QUITADO', 'PENDENTE', 'PAGO', 'REPROVADO'];

      return [...contracts].sort((a, b) => {
         const orderA = statusOrder.indexOf(a.status || 'PENDENTE');
         const orderB = statusOrder.indexOf(b.status || 'PENDENTE');

         if (orderA !== orderB) {
            return orderA - orderB;
         }

         return (b.status_updated_at || 0) - (a.status_updated_at || 0);
      }).filter(c => {
         if (!searchQuery) return true;
         const q = searchQuery.toLowerCase();
         return (
            (c.cliente && c.cliente.toLowerCase().includes(q)) ||
            (c.cpf && c.cpf.includes(q)) ||
            (c.banco && c.banco.toLowerCase().includes(q)) ||
            (c.instituicao_origem && c.instituicao_origem.toLowerCase().includes(q)) ||
            (c.numero_proposta && c.numero_proposta.includes(q))
         );
      });
   };

   return (
      <div className="w-full max-w-[98%] mx-auto px-4 py-6 space-y-8 animate-fade-in">
         {/* Header */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex items-center gap-6">
               <div className="w-16 h-16 rounded-3xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-500/30">
                  <span className="text-white text-3xl font-black italic">PRO</span>
               </div>
               <div>
                  <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tighter">Meus Contratos</h1>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Gestão de Propostas Aprovadas</p>
               </div>
            </div>
            <div className="flex items-center flex-wrap gap-4">
               <Link href="/ofertas" className="px-8 py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:shadow-2xl transition-all hover:scale-105 flex items-center gap-2">
                  🎯 Oportunidades
               </Link>
               <Link href="/relatorio" className="px-8 py-5 bg-white text-blue-600 border border-blue-100 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-lg hover:shadow-xl transition-all hover:scale-105">📊 Dashboard</Link>
               <Link href="/simulador" className="px-8 py-5 bg-blue-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-blue-500/20 transition-all hover:scale-105">Nova Simulação</Link>
            </div>
         </div>

         {/* Estatísticas */}
         {(() => {
            const stats = getStats();
            return (
               <div className="grid grid-cols-2 md:grid-cols-5 gap-4 px-4">
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl flex flex-col gap-1 hover:scale-105 transition-all">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Propostas</span>
                     <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{stats.total}</span>
                     <span className="text-xs font-bold text-slate-500 mt-0.5">{formatCurrencyLocal(stats.totalValue)}</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-orange-100 dark:border-orange-500/10 shadow-xl flex flex-col gap-1 border-l-4 border-l-orange-500 hover:scale-105 transition-all">
                     <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Pendentes</span>
                     <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{stats.pendentes}</span>
                     <span className="text-xs font-bold text-slate-500 mt-0.5">{formatCurrencyLocal(stats.pendentesValue)}</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-blue-100 dark:border-blue-500/10 shadow-xl flex flex-col gap-1 border-l-4 border-l-blue-600 hover:scale-105 transition-all">
                     <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Em Andamento</span>
                     <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{stats.andamento}</span>
                     <span className="text-xs font-bold text-slate-500 mt-0.5">{formatCurrencyLocal(stats.andamentoValue)}</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/10 shadow-xl flex flex-col gap-1 border-l-4 border-l-emerald-500 hover:scale-105 transition-all">
                     <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Pagas</span>
                     <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{stats.pagas}</span>
                     <span className="text-xs font-bold text-slate-500 mt-0.5">{formatCurrencyLocal(stats.pagasValue)}</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-red-100 dark:border-red-500/10 shadow-xl flex flex-col gap-1 border-l-4 border-l-red-500 hover:scale-105 transition-all">
                     <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">Reprovadas</span>
                     <span className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{stats.reprovadas}</span>
                     <span className="text-xs font-bold text-slate-500 mt-0.5">{formatCurrencyLocal(stats.reprovadasValue)}</span>
                  </div>
               </div>
            );
         })()}

         <div className="flex flex-col md:flex-row justify-between items-center px-4 gap-4">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest shrink-0">
               {contracts.length} Contrato(s) Firmado(s)
            </p>

            {/* Search Filter */}
            <div className="w-full md:w-1/3 relative">
               <input
                  type="text"
                  placeholder="🔍 Buscar por Nome, CPF ou Banco..."
                  className="w-full px-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl text-[11px] font-black uppercase text-slate-700 dark:text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
               />
            </div>

            <div className="bg-emerald-500 px-6 py-4 rounded-[1.5rem] shadow-2xl shadow-emerald-500/30 flex flex-col justify-center hover:scale-105 transition-all cursor-default border border-emerald-400">
               <div className="flex items-center justify-between mb-1 gap-4">
                  <p className="text-[9px] font-black text-white uppercase tracking-tight whitespace-nowrap">Saldos Retornados Hoje</p>
                  <span className="text-lg">⏱</span>
               </div>
               <p className="text-2xl font-black text-white">{getReturningTodayCount()}</p>
            </div>
         </div>

         <div className="space-y-6">
            {contracts.length === 0 ? (
               <div className="bg-white dark:bg-slate-900 p-12 rounded-[3rem] border border-slate-100 dark:border-white/10 text-center shadow-lg">
                  <span className="text-6xl mb-6 block opacity-20">📭</span>
                  <h3 className="text-xl font-black text-slate-500 uppercase tracking-widest">Nenhum contrato fechado ainda.</h3>
                  <p className="text-slate-400 text-sm mt-3">Faça uma simulação e clique em "Aceitar" para listar os contratos aqui.</p>
               </div>
            ) : (
               getSortedContracts().map((contract, pIdx) => {
                  // Calculate countdown for CIP counter
                  let daysLeft = 0;
                  if (contract.status === 'AG. RETORNO CIP' && contract.data_cip) {
                     const target = new Date(contract.data_cip + "T23:59:59");
                     const diff = target.getTime() - new Date().getTime();
                     daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
                  }

                  let cardBgClass = "bg-white dark:bg-slate-900";
                  if (contract.status === 'PAGO') cardBgClass = "bg-emerald-50/60 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/50 shadow-md shadow-emerald-100/50";
                  if (contract.status === 'REPROVADO') cardBgClass = "bg-red-50/60 dark:bg-red-950/10 border-red-200 dark:border-red-900/50 shadow-md shadow-red-100/50";

                  return (
                     <div key={contract.id || pIdx} className={`rounded-[3rem] border shadow-lg overflow-hidden transition-all hover:shadow-2xl flex flex-col xl:flex-row items-stretch ${cardBgClass}`}>

                        {/* Info Cliente & Status */}
                        <div className="bg-slate-50/50 dark:bg-white/5 p-4 lg:p-5 xl:w-[32%] flex flex-col justify-start gap-3 shrink-0 relative overflow-hidden">
                           <div className={`absolute top-0 left-0 w-2 h-full ${contract.status === 'AG. RETORNO CIP' ? 'bg-blue-600' :
                                 contract.status === 'SALDO QUITADO' ? 'bg-purple-600' :
                                    contract.status === 'PAGO' ? 'bg-emerald-500' :
                                       contract.status === 'REPROVADO' ? 'bg-red-500' : 'bg-orange-500'
                              }`}></div>

                           <div className="relative z-10 space-y-4">
                              {/* Row 1: 3 buttons */}
                              <div className="flex items-center gap-1.5 w-full flex-nowrap">
                                 {['PENDENTE', 'AG. RETORNO CIP', 'SALDO QUITADO'].map(st => (
                                    <button
                                       key={st}
                                       onClick={() => updateStatus(contract.id, st)}
                                       className={`px-1 py-2 text-[7.5px] font-black uppercase rounded-xl border transition-all text-center flex-1 truncate whitespace-nowrap ${(contract.status || 'PENDENTE') === st
                                             ? st === 'PENDENTE' ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                                                : st === 'AG. RETORNO CIP' ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                   : 'bg-purple-600 text-white border-purple-600 shadow-md'
                                             : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 shadow-sm'
                                          }`}
                                       title={st}
                                    >
                                       {st}
                                    </button>
                                 ))}
                              </div>

                              {/* Row 2: Remaining 2 buttons */}
                              <div className="flex items-center gap-1.5 w-[66.6%] flex-nowrap">
                                 {['PAGO', 'REPROVADO'].map(st => (
                                    <button
                                       key={st}
                                       onClick={() => updateStatus(contract.id, st)}
                                       className={`px-1 py-2 text-[7.5px] font-black uppercase rounded-xl border transition-all text-center flex-1 truncate whitespace-nowrap ${(contract.status || 'PENDENTE') === st
                                             ? st === 'PAGO' ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                                                : 'bg-red-500 text-white border-red-500 shadow-md'
                                             : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 shadow-sm'
                                          }`}
                                       title={st}
                                    >
                                       {st}
                                    </button>
                                 ))}
                              </div>

                               <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest flex items-center flex-wrap gap-2">
                                  <span>Digitado: {new Date(contract.data_aceite + "T12:00:00").toLocaleDateString('pt-BR')}</span>
                                  {contract.user_name && (
                                     <span className="ml-2 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-500 border border-slate-200 dark:border-white/10">
                                        👤 Consultor: <strong className="text-slate-700 dark:text-slate-300">{contract.user_name}</strong>
                                     </span>
                                  )}
                                 {contract.status === 'AG. RETORNO CIP' && contract.data_cip && (
                                    <div className="flex flex-col gap-1 w-full mt-2">
                                       <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 shadow-sm font-black text-xs">
                                          ⏳ Prev. CIP: {new Date(contract.data_cip + "T12:00:00").toLocaleDateString('pt-BR')}
                                       </span>
                                       <span className="inline-flex items-center bg-blue-600 text-white font-black text-[10px] px-3 py-1.5 rounded-xl shadow-md w-fit mt-1 animate-pulse">
                                          🏁 FALTAM {daysLeft} DIAS ÚTEIS PARA RETORNO
                                       </span>
                                    </div>
                                 )}
                                 {contract.status === 'PAGO' && contract.data_pago && (
                                    <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 shadow-sm">
                                       ✅ Pago em: {new Date(contract.data_pago + "T12:00:00").toLocaleDateString('pt-BR')}
                                    </span>
                                 )}
                                 {contract.status === 'REPROVADO' && contract.data_reprovado && (
                                    <span className="inline-flex items-center gap-1 text-red-700 bg-red-100 px-2.5 py-1 rounded-md border border-red-200 shadow-sm">
                                       ❌ Reprovado em: {new Date(contract.data_reprovado + "T12:00:00").toLocaleDateString('pt-BR')}
                                    </span>
                                 )}
                              </div>

                              <div className="flex items-center gap-5 mt-4">
                                 <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 text-2xl shadow-inner border border-blue-200 shrink-0">
                                    👤
                                 </div>
                                 <div className="min-w-0">
                                    {(() => {
                                       const agr = contract.convenio || "INSS";
                                       return (
                                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm mb-2 inline-block ${
                                             agr === 'INSS' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                             agr === 'SIAPE' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                             agr === 'FORCAS' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                             agr === 'CLT_PRIVADO' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                             agr === 'GOV_EST' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                             'bg-slate-50 text-slate-500 border-slate-100'
                                          }`}>
                                             CONVÊNIO {agr === 'GOV_EST' ? 'GOVERNO' : agr === 'FORCAS' ? 'FORÇAS' : agr === 'CLT_PRIVADO' ? 'CLT' : agr}
                                          </span>
                                       );
                                    })()}
                                    {editingId === contract.id ? (
                                       <div className="space-y-3 mt-2">
                                          <div className="space-y-1">
                                             <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Nome do Cliente</label>
                                             <input
                                                type="text"
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                                value={editData.cliente}
                                                onChange={(e) => setEditData({ ...editData, cliente: e.target.value })}
                                             />
                                          </div>
                                          <div className="grid grid-cols-2 gap-2">
                                             <div className="space-y-1">
                                                <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest">CPF</label>
                                                <input
                                                   type="text"
                                                   className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                                   value={editData.cpf}
                                                   onChange={(e) => setEditData({ ...editData, cpf: formatCPF(e.target.value) })}
                                                />
                                             </div>
                                             <div className="space-y-1">
                                                <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Nº Proposta</label>
                                                <input
                                                   type="text"
                                                   className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 rounded-xl text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                                   placeholder="Ex: 123456"
                                                   value={editData.numero_proposta}
                                                   onChange={(e) => setEditData({ ...editData, numero_proposta: e.target.value })}
                                                />
                                             </div>
                                          </div>
                                          <div className="flex gap-2 pt-2">
                                             <button
                                                onClick={() => saveEdit(contract.id)}
                                                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                             >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                                Salvar Alterações
                                             </button>
                                             <button
                                                onClick={cancelEditing}
                                                className="px-4 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                                             >
                                                Cancelar
                                             </button>
                                          </div>
                                       </div>
                                    ) : (
                                       <>
                                          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-tight tracking-tight break-words">{contract.cliente}</h3>
                                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest truncate">CPF: {formatCPF(contract.cpf)}</p>
                                          {contract.numero_proposta && (
                                             <p className="text-[10px] text-blue-600 font-black uppercase mt-1 tracking-widest">
                                                Nº PROPOSTA: {contract.numero_proposta}
                                             </p>
                                          )}
                                       </>
                                    )}
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Detalhes do Banco e Oferta (Split View) */}
                        <div className="flex-1 flex flex-col p-4 lg:p-6 border-t xl:border-t-0 xl:border-l border-slate-100 gap-4 relative">
                           {(currentUser?.role === 'admin' || contract.user_id === currentUser?.id) && (
                              <div className="absolute top-4 right-4 flex gap-2 z-[50]">
                                 <button
                                    onClick={() => startEditing(contract)}
                                    className="group text-slate-400 hover:text-blue-600 transition-all p-2 hover:scale-110 flex items-center justify-center w-10 h-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-full shadow-lg"
                                    title="Editar Proposta"
                                 >
                                    <svg className="w-4 h-4 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                 </button>
                                 <button
                                    onClick={() => deleteContract(contract.id)}
                                    className="group text-slate-400 hover:text-red-600 transition-all p-2 hover:scale-110 flex items-center justify-center w-10 h-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-full shadow-lg"
                                    title="Excluir Proposta"
                                 >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                 </button>
                              </div>
                           )}
                           {/* PORTABILIDADE (Linha de cima) */}
                           <div className="space-y-3 bg-slate-50/50 dark:bg-slate-800/30 p-5 rounded-3xl border border-slate-100 dark:border-white/5">
                              <div className="flex justify-between items-center">
                                 <span className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                    <span>🔄</span> Portabilidade
                                 </span>
                                 {contract.status === 'REPROVADO' && (
                                    <span className="px-3 py-1 bg-red-600 text-white text-[9px] font-black rounded-lg uppercase shadow-sm">
                                       REPROVADO
                                    </span>
                                 )}
                                 {contract.status === 'SALDO QUITADO' ? (
                                    <div className="flex items-center gap-2">
                                       {!contract.port_status || contract.port_status === 'AG. AVERBAÇÃO' ? (
                                          <button
                                             onClick={() => updatePortStatus(contract.id, 'AVERBADO')}
                                             className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black rounded-lg uppercase shadow-sm transition-all hover:scale-105"
                                          >
                                             AG. AVERBAÇÃO
                                          </button>
                                       ) : (
                                          <button
                                             onClick={() => updatePortStatus(contract.id, 'AG. AVERBAÇÃO')}
                                             className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black rounded-lg uppercase shadow-sm transition-all hover:scale-105"
                                          >
                                             AVERBADO
                                          </button>
                                       )}
                                    </div>
                                 ) : contract.status === 'PAGO' && (
                                    <span className="px-3 py-1 bg-emerald-600 text-white text-[9px] font-black rounded-lg uppercase shadow-sm">
                                       AVERBADO
                                    </span>
                                 )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mt-2">
                                 <div className="md:col-span-4 space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Inst. Origem</p>
                                    <div className="flex items-center gap-2">
                                       {(() => {
                                          const searchName = contract.instituicao_origem ? (contract.instituicao_origem.includes('-') ? contract.instituicao_origem.split('-')[1].trim().toUpperCase() : contract.instituicao_origem.toUpperCase()) : "";
                                          const matchedSub = subLogos.find(l => {
                                             const lN = l.name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]/g, '');
                                             const sN = searchName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]/g, '');
                                             return lN === sN || lN.includes(sN) || sN.includes(lN);
                                          });

                                          if (searchName.includes('BVC') || searchName.includes('BCV')) {
                                             const bcvMatch = subLogos.find(l => l.name.toUpperCase().includes('BCV') || l.name.toUpperCase().includes('BVC'));
                                             if (bcvMatch?.logo_url) {
                                                return <img src={getStaticUrl(bcvMatch.logo_url)} alt="" className="w-10 h-10 object-contain rounded-md flex-shrink-0 bg-white border border-slate-100 shadow-sm" />;
                                             }
                                             return (
                                                <span className="w-10 h-10 bg-blue-600 text-white text-[11px] font-black flex items-center justify-center rounded-md flex-shrink-0 shadow-md">BVC</span>
                                             );
                                          }

                                          return matchedSub?.logo_url ? (
                                             <img src={getStaticUrl(matchedSub.logo_url)} alt="" className="w-10 h-10 object-contain rounded-md flex-shrink-0 bg-white border border-slate-100 shadow-sm" />
                                          ) : (
                                             <span className="text-lg">🏛️</span>
                                          );
                                       })()}
                                       <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{getFullOriginBankName(contract.instituicao_origem)}</p>
                                    </div>
                                 </div>
                                 <div className="md:col-span-3 space-y-1 md:text-right md:pr-6">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Valor Parcela</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatCurrencyLocal(contract.orig_parcela || contract.parcela)}</p>
                                 </div>
                                 <div className="md:col-span-2 space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Prazo Restante</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{contract.prazo_restante ? `${contract.prazo_restante}X` : '56X'}</p>
                                 </div>
                                 <div className="md:col-span-3 space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Saldo Devedor</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{typeof contract.saldo_devedor === 'number' ? formatCurrencyLocal(contract.saldo_devedor) : (contract.saldo_devedor && contract.saldo_devedor !== 'N/A' ? contract.saldo_devedor : 'R$ 5.000,00')}</p>
                                 </div>
                              </div>
                           </div>

                           {/* REFINANCIAMENTO (Linha de baixo) */}
                           <div className="space-y-3 bg-blue-50/30 dark:bg-blue-950/10 p-5 rounded-3xl border border-blue-100/50 dark:border-blue-900/20">
                              <div className="flex justify-between items-center">
                                 <span className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                    <span>💰</span> Refinanciamento
                                 </span>
                                 {contract.status === 'REPROVADO' ? (
                                    <span className="px-3 py-1 bg-red-600 text-white text-[9px] font-black rounded-lg uppercase shadow-sm">
                                       REPROVADO
                                    </span>
                                 ) : contract.status === 'AG. RETORNO CIP' ? (
                                    <span className="px-3 py-1 bg-blue-600 text-white text-[9px] font-black rounded-lg uppercase shadow-sm">
                                       AG. PORTABILIDADE
                                    </span>
                                 ) : contract.status === 'SALDO QUITADO' ? (
                                    <span className="px-3 py-1 bg-blue-600 text-white text-[9px] font-black rounded-lg uppercase shadow-sm">
                                       AG. AVERBAÇÃO PORT
                                    </span>
                                 ) : contract.status === 'PAGO' ? (
                                    <span className="px-3 py-1 bg-emerald-600 text-white text-[9px] font-black rounded-lg uppercase shadow-sm">
                                       AVERBADO
                                    </span>
                                 ) : contract.status !== 'PENDENTE' && contract.refin_status && (
                                    <span className={`px-3 py-1 text-[9px] font-black rounded-lg uppercase shadow-sm ${contract.refin_status === 'AVERBADO'
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-orange-500 text-white'
                                       }`}>
                                       {contract.refin_status}
                                    </span>
                                 )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mt-2">
                                 <div className="md:col-span-4 space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Novo Banco</p>
                                    <div className="flex items-center gap-2">
                                       {(() => {
                                          const searchName = contract.banco ? (contract.banco.includes('-') ? contract.banco.split('-')[1].trim().toUpperCase() : contract.banco.toUpperCase()) : "";
                                          const matchedBank = dbBanks.find(b => {
                                             const bName = b.name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]/g, '');
                                             const sName = searchName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]/g, '');
                                             return bName === sName || bName.includes(sName) || sName.includes(bName);
                                          });

                                          if (searchName.includes('BVC') || searchName.includes('BCV')) {
                                             const bcvMatch = dbBanks.find(b => b.name.toUpperCase().includes('BCV') || b.name.toUpperCase().includes('BVC'));
                                             if (bcvMatch?.logo_url) {
                                                return <img src={getStaticUrl(bcvMatch.logo_url)} alt="" className="w-10 h-10 object-contain rounded-md flex-shrink-0 bg-white border border-slate-100 shadow-sm" />;
                                             }
                                             return (
                                                <span className="w-10 h-10 bg-blue-600 text-white text-[11px] font-black flex items-center justify-center rounded-md flex-shrink-0 shadow-md">BVC</span>
                                             );
                                          }

                                          return matchedBank?.logo_url ? (
                                             <img src={getStaticUrl(matchedBank.logo_url)} alt="" className="w-10 h-10 object-contain rounded-md flex-shrink-0 bg-white border border-slate-100 shadow-sm" />
                                          ) : (
                                             <span className="text-lg">🏛️</span>
                                          );
                                       })()}
                                       <div className="flex flex-col min-w-0">
                                          <p className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">{contract.banco}</p>
                                          <p className="text-[8px] font-bold text-blue-600 uppercase truncate">{contract.tabela}</p>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="md:col-span-3 space-y-1 md:text-right md:pr-6">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Parcela Refin</p>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatCurrencyLocal(contract.parcela)}</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">TX: {formatTaxa(contract.taxa)} a.m.</p>
                                 </div>
                                 <div className="md:col-span-2 space-y-1 bg-blue-600/5 dark:bg-blue-500/10 px-3 py-2 rounded-xl border border-blue-100/20">
                                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest truncate">Valor Bruto</p>
                                    <p className="text-sm font-black text-blue-700 dark:text-blue-400">{formatCurrencyLocal(contract.valor_contrato)}</p>
                                 </div>
                                 <div className="md:col-span-3 space-y-1 bg-emerald-600/5 dark:bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-100/20">
                                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest truncate">Troco</p>
                                    <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">{formatCurrencyLocal(contract.valor_troco)}</p>
                                 </div>
                              </div>
                           </div>
                        </div>

                     </div>
                  );
               })
            )}
         </div>

      </div>
   );
}


