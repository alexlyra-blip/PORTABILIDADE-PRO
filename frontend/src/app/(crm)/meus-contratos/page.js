"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, getStaticUrl } from "@/utils/api";
import PageHeader from "@/components/PageHeader";
import { Icons } from "@/components/Icons";
import { useToast } from "@/components/ToastProvider";

export default function MeusContratosPage() {
   const { toast } = useToast();
   const [contracts, setContracts] = useState([]);
   const [searchQuery, setSearchQuery] = useState("");
   const [dbBanks, setDbBanks] = useState([]);
   const [subLogos, setSubLogos] = useState([]);
   const [currentUser, setCurrentUser] = useState(null);
   const [editingId, setEditingId] = useState(null);
   const [editData, setEditData] = useState({ cliente: "", cpf: "", numero_proposta: "", data_aceite: "", data_envio_cip: "", data_cip: "", taxa_juros: "", banco_origem: "", banco: "", parcela: "", prazo_restante: "", saldo: "", valor_contrato: "", valor_liberado: "" });

   const [manualModalOpen, setManualModalOpen] = useState(false);
   const [manualData, setManualData] = useState({
      cliente: "", cpf: "", banco: "", convenio: "INSS", parcela: "", tabela: "MANUAL", taxa: "", valor_contrato: "", valor_troco: "", instituicao_origem: "", saldo_devedor: "", produto: "PORTABILIDADE", prazo: ""
   });

   const fetchContracts = async () => {
      try {
         const res = await api.get("/contracts");
         let parsed = Array.isArray(res) ? res : res.data;
         parsed.forEach(c => {
            if (!c.status) c.status = 'PENDENTE';
         });
         setContracts(parsed);
      } catch (err) {
         console.error("Erro ao buscar contratos:", err);
      }
   };

   useEffect(() => {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      setCurrentUser(user);

      fetchContracts();

      Promise.all([
         api.get("/admin/banks").catch(() => []),
         api.get("/admin/sub-logos").catch(() => [])
      ]).then(([banksList, subLogosList]) => {
         setDbBanks(banksList);
         setSubLogos(subLogosList);
      });
   }, []);

   const addBusinessDays = (startDateStr, days) => {
      let date = new Date(startDateStr + "T12:00:00");
      let count = 0;
      while (count < days) {
         date.setDate(date.getDate() + 1);
         if (date.getDay() !== 0 && date.getDay() !== 6) {
            count++;
         }
      }
      return date.toISOString().split('T')[0];
   };

   const updateStatus = async (id, newStatus) => {
      const current = contracts.find(c => c.id === id);
      if (!current) return;

      const updatePayload = { 
         status: newStatus,
         status_updated_at: Date.now().toString()
      };
      const today = new Date();

      if (newStatus === 'AG. RETORNO CIP' && current.status !== 'AG. RETORNO CIP') {
         const envioDate = today.toISOString().split('T')[0];
         updatePayload.data_envio_cip = envioDate;
         updatePayload.data_cip = addBusinessDays(envioDate, 5);
      } else if (newStatus === 'SALDO QUITADO') {
         const today = new Date();
         let daysAdded = 0;
         while (daysAdded < 5) {
            today.setDate(today.getDate() + 1);
            if (today.getDay() !== 0 && today.getDay() !== 6) {
               daysAdded++;
            }
         }
         updatePayload.data_cip = today.toISOString().split('T')[0];
         updatePayload.refin_status = 'AG. AVERBAÇÃO PORT';
         if (!current.port_status) {
            updatePayload.port_status = 'AG. AVERBAÇÃO';
         }
      } else if (newStatus === 'PAGO') {
         updatePayload.data_pago = new Date().toISOString().split('T')[0];
         updatePayload.refin_status = 'AVERBADO';
      } else if (newStatus === 'REPROVADO') {
         updatePayload.data_reprovado = new Date().toISOString().split('T')[0];
      }

      try {
         await api.patch(`/contracts/${id}`, updatePayload);
         setContracts(prev => prev.map(c => c.id === id ? { ...c, ...updatePayload } : c));
         window.dispatchEvent(new Event('contracts-updated'));
      } catch (err) {
         console.error("Erro ao atualizar status", err);
         toast.error("Erro ao atualizar status");
      }
   };

   const deleteContract = async (id) => {
      if (window.confirm("Tem certeza que deseja excluir esta proposta?")) {
         try {
            await api.delete(`/contracts/${id}`);
            setContracts(prev => prev.filter(c => c.id !== id));
            window.dispatchEvent(new Event('contracts-updated'));
            toast.success("Proposta excluída com sucesso!");
         } catch (err) {
            console.error("Erro ao excluir contrato", err);
            toast.error("Erro ao excluir contrato");
         }
      }
   };

   const updatePortStatus = async (id, newPortStatus) => {
      try {
         await api.patch(`/contracts/${id}`, { port_status: newPortStatus });
         setContracts(prev => prev.map(c => c.id === id ? { ...c, port_status: newPortStatus } : c));
         window.dispatchEvent(new Event('contracts-updated'));
      } catch (err) {
         console.error("Erro ao atualizar port status", err);
      }
   };

   const startEditing = (contract) => {
      setEditingId(contract.id);
      setEditData({
         cliente: contract.cliente || "",
         cpf: contract.cpf || "",
         numero_proposta: contract.numero_proposta || "",
         data_aceite: contract.data_aceite || "",
         data_envio_cip: contract.data_envio_cip || "",
         data_cip: contract.data_cip || "",
         taxa_juros: contract.taxa_juros || "",
         banco_origem: contract.banco_origem || "",
         banco: contract.banco || "",
         parcela: contract.parcela || "",
         prazo_restante: contract.prazo_restante || "",
         saldo: contract.saldo || "",
         valor_contrato: contract.valor_contrato || "",
         valor_liberado: contract.valor_liberado || ""
      });
   };

   const cancelEditing = () => {
      setEditingId(null);
      setEditData({ cliente: "", cpf: "", numero_proposta: "", data_aceite: "", data_envio_cip: "", data_cip: "", taxa_juros: "", banco_origem: "", banco: "", parcela: "", prazo_restante: "", saldo: "", valor_contrato: "", valor_liberado: "" });
   };

   const saveEdit = async (id) => {
      try {
         const contract = contracts.find(c => c.id === id);
         const updatePayload = {
            cliente: editData.cliente,
            cpf: editData.cpf,
            numero_proposta: editData.numero_proposta,
            data_aceite: editData.data_aceite,
            data_envio_cip: editData.data_envio_cip !== undefined ? editData.data_envio_cip : contract.data_envio_cip,
            data_cip: editData.data_cip !== undefined ? editData.data_cip : contract.data_cip,
            taxa_juros: parseFloat(editData.taxa_juros) || contract.taxa_juros,
            banco_origem: editData.banco_origem || contract.banco_origem,
            banco: editData.banco || contract.banco,
            parcela: parseFloat(editData.parcela) || contract.parcela,
            prazo_restante: parseInt(editData.prazo_restante) || contract.prazo_restante,
            saldo: parseFloat(editData.saldo) || contract.saldo,
            valor_contrato: parseFloat(editData.valor_contrato) || contract.valor_contrato,
            valor_liberado: parseFloat(editData.valor_liberado) || contract.valor_liberado
         };

         await api.patch(`/contracts/${id}`, updatePayload);
         setContracts(prev => prev.map(c => c.id === id ? { ...c, ...updatePayload } : c));
         window.dispatchEvent(new Event('contracts-updated'));
         setEditingId(null);
         toast.success("Proposta atualizada com sucesso!");
      } catch (err) {
         console.error("Erro ao salvar edição", err);
         toast.error("Erro ao editar contrato");
      }
   };

   const handleAddManual = async (e) => {
      e.preventDefault();
      try {
         const newContract = {
            id: Date.now().toString(),
            user_id: currentUser?.id,
            user_name: currentUser?.name || "Consultor",
            user_role: currentUser?.role,
            broker_id: currentUser?.broker_id,
            data_aceite: new Date().toISOString().split('T')[0],
            data_hora: new Date().toISOString(),
            cliente: manualData.cliente || "Cliente",
            cpf: manualData.cpf || "Não Informado",
            banco: manualData.banco || "Desconhecido",
            convenio: manualData.convenio || "INSS",
            parcela: parseFloat(manualData.parcela.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
            tabela: manualData.tabela || "MANUAL",
            taxa: parseFloat(manualData.taxa.replace(',', '.')) || 0,
            valor_contrato: parseFloat(manualData.valor_contrato.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
            valor_troco: parseFloat(manualData.valor_troco.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
            instituicao_origem: manualData.instituicao_origem || "N/A",
            saldo_devedor: parseFloat(manualData.saldo_devedor.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
            prazo_restante: manualData.produto === 'PORTABILIDADE' ? 0 : parseInt(manualData.prazo) || 0,
            orig_parcela: 0,
            produto: manualData.produto || "PORTABILIDADE",
            status: "PENDENTE"
         };
         await api.post('/contracts', newContract);
         setContracts(prev => [newContract, ...prev]);
         window.dispatchEvent(new Event('contracts-updated'));
         setManualModalOpen(false);
         setManualData({
            cliente: "", cpf: "", banco: "", convenio: "INSS", parcela: "", tabela: "MANUAL", taxa: "", valor_contrato: "", valor_troco: "", instituicao_origem: "", saldo_devedor: "", produto: "PORTABILIDADE"
         });
      } catch (err) {
         console.error("Erro ao adicionar manualmente", err);
         toast.error("Erro ao adicionar contrato manualmente");
      }
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
         const target = new Date(c.data_cip + "T12:00:00");
         const today = new Date();
         today.setHours(12, 0, 0, 0);
         const diff = target.getTime() - today.getTime();
         const daysLeft = Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
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

         if (a.status === 'AG. RETORNO CIP' && a.data_cip && b.data_cip) {
            const dateA = new Date(a.data_cip + "T12:00:00").getTime();
            const dateB = new Date(b.data_cip + "T12:00:00").getTime();
            if (dateA !== dateB) return dateA - dateB;
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
         <PageHeader 
            title="Meus" 
            highlight="Contratos" 
            subtitle="Gestão de Propostas Aprovadas"
         >
            <Link href="/ofertas" className="px-8 py-5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white border border-slate-800 dark:border-slate-700 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:shadow-2xl transition-all hover:scale-105 flex items-center gap-2">
               <Icons.Target size={14} className="text-white" /> Oportunidades
            </Link>
            <Link href="/relatorio" className="px-8 py-5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80 text-blue-600 border border-blue-100 dark:border-blue-900/30 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center gap-2">
               <Icons.BarChart size={14} className="text-blue-600" /> Dashboard
            </Link>
            <button onClick={() => setManualModalOpen(true)} className="px-8 py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-emerald-500/20 transition-all hover:scale-105 flex items-center gap-2 border border-emerald-500">
               <Icons.Plus size={14} className="text-white" /> Adicionar Manual
            </button>
            <Link href="/simulador" className="px-8 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-blue-500/20 transition-all hover:scale-105 flex items-center gap-2">
               <Icons.Plus size={14} className="text-white" /> Nova Simulação
            </Link>
         </PageHeader>

         {/* Estatísticas */}
         {(() => {
            const stats = getStats();
            return (
               <div className="grid grid-cols-2 md:grid-cols-5 gap-4 px-4">
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all group relative overflow-hidden flex flex-col justify-between">
                     <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-slate-800 to-black text-white flex items-center justify-center mb-5 shadow-lg shadow-black/20">
                        <Icons.FileText size={24} />
                     </div>
                     <div className="relative z-10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Total Propostas</span>
                        <span className="text-xl leading-tight font-black text-slate-800 dark:text-white mt-1 block">{stats.total}</span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1 block">{formatCurrencyLocal(stats.totalValue)}</span>
                     </div>
                     <div className="absolute -top-4 -right-4 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none scale-150 transform rotate-12 text-black">
                        <Icons.FileText size={100} />
                     </div>
                     <div className="absolute -bottom-10 -right-10 w-32 h-32 blur-3xl opacity-20 pointer-events-none bg-slate-900"></div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-orange-100 dark:border-orange-500/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all group relative overflow-hidden flex flex-col justify-between">
                     <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center mb-5 shadow-lg shadow-orange-500/30">
                        <Icons.AlertCircle size={24} />
                     </div>
                     <div className="relative z-10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Pendentes</span>
                        <span className="text-xl leading-tight font-black text-slate-800 dark:text-white mt-1 block">{stats.pendentes}</span>
                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-1 block">{formatCurrencyLocal(stats.pendentesValue)}</span>
                     </div>
                     <div className="absolute -top-4 -right-4 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none scale-150 transform rotate-12 text-orange-600">
                        <Icons.AlertCircle size={100} />
                     </div>
                     <div className="absolute -bottom-10 -right-10 w-32 h-32 blur-3xl opacity-20 pointer-events-none bg-orange-500"></div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-blue-100 dark:border-blue-500/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all group relative overflow-hidden flex flex-col justify-between">
                     <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center mb-5 shadow-lg shadow-blue-500/30">
                        <Icons.Clock size={24} />
                     </div>
                     <div className="relative z-10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Em Andamento</span>
                        <span className="text-xl leading-tight font-black text-slate-800 dark:text-white mt-1 block">{stats.andamento}</span>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-1 block">{formatCurrencyLocal(stats.andamentoValue)}</span>
                     </div>
                     <div className="absolute -top-4 -right-4 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none scale-150 transform rotate-12 text-blue-600">
                        <Icons.Clock size={100} />
                     </div>
                     <div className="absolute -bottom-10 -right-10 w-32 h-32 blur-3xl opacity-20 pointer-events-none bg-blue-500"></div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all group relative overflow-hidden flex flex-col justify-between">
                     <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/30">
                        <Icons.CheckCircle size={24} />
                     </div>
                     <div className="relative z-10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Pagas</span>
                        <span className="text-xl leading-tight font-black text-slate-800 dark:text-white mt-1 block">{stats.pagas}</span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">{formatCurrencyLocal(stats.pagasValue)}</span>
                     </div>
                     <div className="absolute -top-4 -right-4 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none scale-150 transform rotate-12 text-emerald-600">
                        <Icons.CheckCircle size={100} />
                     </div>
                     <div className="absolute -bottom-10 -right-10 w-32 h-32 blur-3xl opacity-20 pointer-events-none bg-emerald-500"></div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-red-100 dark:border-red-500/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all group relative overflow-hidden flex flex-col justify-between">
                     <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-red-400 to-rose-600 text-white flex items-center justify-center mb-5 shadow-lg shadow-red-500/30">
                        <Icons.XCircle size={24} />
                     </div>
                     <div className="relative z-10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Reprovadas</span>
                        <span className="text-xl leading-tight font-black text-slate-800 dark:text-white mt-1 block">{stats.reprovadas}</span>
                        <span className="text-xs font-bold text-red-600 dark:text-red-400 mt-1 block">{formatCurrencyLocal(stats.reprovadasValue)}</span>
                     </div>
                     <div className="absolute -top-4 -right-4 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none scale-150 transform rotate-12 text-red-600">
                        <Icons.XCircle size={100} />
                     </div>
                     <div className="absolute -bottom-10 -right-10 w-32 h-32 blur-3xl opacity-20 pointer-events-none bg-red-500"></div>
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
                  <Icons.Clock size={20} className="text-white/80" />
               </div>
               <p className="text-2xl font-black text-white">{getReturningTodayCount()}</p>
            </div>
         </div>

         <div className="space-y-6">
            {contracts.length === 0 ? (
               <div className="bg-white dark:bg-slate-900 p-12 rounded-[3rem] border border-slate-100 dark:border-white/10 text-center shadow-lg">
                  <span className="text-6xl mb-6 block opacity-20">📭</span>
                  <h3 className="text-xl font-black text-slate-500 uppercase tracking-widest">Nenhum contrato fechado ainda.</h3>
                  <p className="text-slate-400 text-sm mt-3">Faça uma simulação e clique em &quot;Aceitar&quot; para listar os contratos aqui.</p>
               </div>
            ) : (
               getSortedContracts().map((contract, pIdx) => {
                  // Calculate countdown for CIP counter
                  let daysLeft = 0;
                  if (contract.status === 'AG. RETORNO CIP' && contract.data_cip) {
                     const target = new Date(contract.data_cip + "T12:00:00");
                     const today = new Date();
                     today.setHours(12, 0, 0, 0);
                     const diff = target.getTime() - today.getTime();
                     daysLeft = Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
                  }

                  let cardBgClass = "bg-white dark:bg-slate-900";
                  if (contract.status === 'PAGO') cardBgClass = "bg-emerald-50/60 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/50 shadow-md shadow-emerald-100/50";
                  if (contract.status === 'REPROVADO') cardBgClass = "bg-red-50/60 dark:bg-red-950/10 border-red-200 dark:border-red-900/50 shadow-md shadow-red-100/50";
                  if (contract.status === 'AG. RETORNO CIP' && contract.data_cip && daysLeft === 0) {
                     cardBgClass = "bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-900/30 dark:via-teal-900/20 dark:to-emerald-900/30 border-emerald-400 dark:border-emerald-500/50 shadow-[0_10px_40px_-10px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400";
                  }

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
                              {/* Row 1: buttons */}
                              <div className="flex items-center gap-1.5 w-full flex-nowrap">
                                 {(() => {
                                    const topStatuses = (contract.produto && contract.produto !== 'PORTABILIDADE') ? ['PENDENTE'] : ['PENDENTE', 'AG. RETORNO CIP', 'SALDO QUITADO'];
                                    return topStatuses.map(st => (
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
                                    ));
                                 })()}
                              </div>

                              {/* Row 2: Remaining buttons */}
                              <div className={`flex items-center gap-1.5 flex-nowrap ${(contract.produto && contract.produto !== 'PORTABILIDADE') ? 'w-full' : 'w-[66.6%]'}`}>
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
                                  {editingId === contract.id ? (
                                     <div className="flex items-center gap-1">
                                        <span>Digitado:</span>
                                        <input type="date" className="bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-500/30 rounded px-1 py-0.5 text-slate-700 dark:text-white outline-none" value={editData.data_aceite || ''} onChange={e => setEditData({...editData, data_aceite: e.target.value})} />
                                     </div>
                                  ) : (
                                     <span>Digitado: {new Date(contract.data_aceite + "T12:00:00").toLocaleDateString('pt-BR')}</span>
                                  )}
                                  {contract.user_name && (
                                     <span className="ml-2 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-500 border border-slate-200 dark:border-white/10">
                                        👤 Consultor: <strong className="text-slate-700 dark:text-slate-300">{contract.user_name}</strong>
                                     </span>
                                  )}
                                 {contract.status === 'AG. RETORNO CIP' && (
                                    <div className="flex flex-col gap-1 w-full mt-2">
                                       <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 shadow-sm font-black text-xs">
                                          📤 Envio CIP: {editingId === contract.id ? (
                                             <input type="date" className="bg-white border border-slate-300 rounded px-1 ml-1 text-slate-700 outline-none" value={editData.data_envio_cip || ''} onChange={e => {
                                                const newDate = e.target.value;
                                                const newCipDate = newDate ? addBusinessDays(newDate, 5) : '';
                                                setEditData({...editData, data_envio_cip: newDate, data_cip: newCipDate});
                                             }} />
                                          ) : (
                                             contract.data_envio_cip ? new Date(contract.data_envio_cip + "T12:00:00").toLocaleDateString('pt-BR') : (contract.data_aceite ? new Date(contract.data_aceite + "T12:00:00").toLocaleDateString('pt-BR') : 'Não informada')
                                          )}
                                       </span>
                                       <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 shadow-sm font-black text-xs">
                                          ⏳ Prev. CIP: {editingId === contract.id ? (
                                             <input type="date" className="bg-white border border-blue-300 rounded px-1 ml-1 text-blue-700 outline-none" value={editData.data_cip || ''} onChange={e => setEditData({...editData, data_cip: e.target.value})} />
                                          ) : (
                                             contract.data_cip ? new Date(contract.data_cip + "T12:00:00").toLocaleDateString('pt-BR') : 'Não informada'
                                          )}
                                       </span>
                                       <span className={`inline-flex items-center gap-1.5 font-black text-[10px] px-3 py-1.5 rounded-xl shadow-md w-fit mt-1 animate-pulse ${daysLeft === 0 ? 'bg-emerald-600 text-white shadow-emerald-500/40' : 'bg-blue-600 text-white'}`}>
                                          {daysLeft === 0 ? (
                                             <><Icons.CheckCircle size={12} /> SALDO RETORNADO</>
                                          ) : (
                                             <><Icons.Clock size={12} /> FALTAM {daysLeft} DIAS ÚTEIS PARA RETORNO</>
                                          )}
                                       </span>
                                    </div>
                                 )}
                                 {contract.status === 'PAGO' && contract.data_pago && (
                                    <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 shadow-sm">
                                       <Icons.CheckCircle size={14} /> Pago em: {new Date(contract.data_pago + "T12:00:00").toLocaleDateString('pt-BR')}
                                    </span>
                                 )}
                                 {contract.status === 'REPROVADO' && contract.data_reprovado && (
                                    <span className="inline-flex items-center gap-1.5 text-red-700 bg-red-100 px-2.5 py-1 rounded-md border border-red-200 shadow-sm">
                                       <Icons.XCircle size={14} /> Reprovado em: {new Date(contract.data_reprovado + "T12:00:00").toLocaleDateString('pt-BR')}
                                    </span>
                                 )}
                              </div>

                              <div className="flex items-center gap-5 mt-4">
                                 <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
                                    <Icons.User size={24} />
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
                                       <>
                                          <input type="text" className="w-full text-xl font-black text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-500/30 rounded px-2 py-1 mb-1 focus:ring-2 focus:ring-blue-500 outline-none" value={editData.cliente} onChange={(e) => setEditData({ ...editData, cliente: e.target.value })} placeholder="Nome do Cliente" />
                                          <div className="flex gap-2">
                                             <input type="text" className="w-1/2 text-[10px] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-widest bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-500/30 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none" value={editData.cpf} onChange={(e) => setEditData({ ...editData, cpf: formatCPF(e.target.value) })} placeholder="CPF" />
                                             <input type="text" className="w-1/2 text-[10px] text-blue-600 font-black uppercase tracking-widest bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-500/30 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none" value={editData.numero_proposta} onChange={(e) => setEditData({ ...editData, numero_proposta: e.target.value })} placeholder="Nº PROPOSTA" />
                                          </div>
                                       </>
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
                                 {editingId === contract.id ? (
                                    <>
                                       <button onClick={() => saveEdit(contract.id)} className="group bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all p-2 flex items-center justify-center w-10 h-10 border border-emerald-200 rounded-full shadow-lg" title="Salvar"><Icons.Check size={16} /></button>
                                       <button onClick={cancelEditing} className="group bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all p-2 flex items-center justify-center w-10 h-10 border border-slate-200 rounded-full shadow-lg" title="Cancelar"><Icons.X size={16} /></button>
                                    </>
                                 ) : (
                                    <>
                                       <button onClick={() => startEditing(contract)} className="group text-slate-400 hover:text-blue-600 transition-all p-2 hover:scale-110 flex items-center justify-center w-10 h-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-full shadow-lg" title="Editar Proposta"><Icons.Edit size={16} className="transition-transform group-hover:rotate-12" /></button>
                                       <button onClick={() => deleteContract(contract.id)} className="group text-slate-400 hover:text-red-600 transition-all p-2 hover:scale-110 flex items-center justify-center w-10 h-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-full shadow-lg" title="Excluir Proposta"><Icons.Trash size={16} /></button>
                                    </>
                                 )}
                              </div>
                           )}
                           {(!contract.produto || contract.produto === 'PORTABILIDADE') ? (
                              <>
                                 {/* PORTABILIDADE (Linha de cima) */}
                                 <div className="space-y-3 bg-slate-50/50 dark:bg-slate-800/30 p-5 rounded-3xl border border-slate-100 dark:border-white/5">
                              <div className="flex justify-between items-center">
                                 <span className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                    <Icons.RefreshCw size={14} className="text-blue-500" /> Portabilidade
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
                                                return <img src={getStaticUrl(bcvMatch.logo_url)} alt="" loading="eager" fetchPriority="high" className="w-10 h-10 object-contain rounded-md flex-shrink-0 bg-white border border-slate-100 shadow-sm" />;
                                             }
                                             return (
                                                <span className="w-10 h-10 bg-blue-600 text-white text-[11px] font-black flex items-center justify-center rounded-md flex-shrink-0 shadow-md">BVC</span>
                                             );
                                          }

                                          return matchedSub?.logo_url ? (
                                             <img src={getStaticUrl(matchedSub.logo_url)} alt="" loading="eager" fetchPriority="high" className="w-10 h-10 object-contain rounded-md flex-shrink-0 bg-white border border-slate-100 shadow-sm" />
                                          ) : (
                                             <div className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-md border border-slate-200 shadow-sm text-slate-400">
                                                <Icons.Landmark size={20} />
                                             </div>
                                          );
                                       })()}
                                       {editingId === contract.id ? <input type="text" className="w-full text-sm font-black text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-500/30 rounded px-1 outline-none" value={editData.banco_origem} onChange={e => setEditData({...editData, banco_origem: e.target.value})} placeholder="Banco Origem" /> : <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{getFullOriginBankName(contract.instituicao_origem)}</p>}
                                    </div>
                                 </div>
                                 <div className="md:col-span-3 space-y-1 md:text-right md:pr-6">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Valor Parcela</p>
                                    {editingId === contract.id ? <input type="number" step="0.01" className="w-full text-sm font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-500/30 rounded px-1 outline-none md:text-right" value={editData.parcela} onChange={e => setEditData({...editData, parcela: e.target.value})} placeholder="Parcela" /> : <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatCurrencyLocal(contract.orig_parcela || contract.parcela)}</p>}
                                 </div>
                                 <div className="md:col-span-2 space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Prazo Restante</p>
                                    {editingId === contract.id ? <input type="number" className="w-full text-sm font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-500/30 rounded px-1 outline-none" value={editData.prazo_restante} onChange={e => setEditData({...editData, prazo_restante: e.target.value})} placeholder="Prazo" /> : <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{contract.prazo_restante ? `${contract.prazo_restante}X` : '56X'}</p>}
                                 </div>
                                 <div className="md:col-span-3 space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Saldo Devedor</p>
                                    {editingId === contract.id ? <input type="number" step="0.01" className="w-full text-sm font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-500/30 rounded px-1 outline-none" value={editData.saldo} onChange={e => setEditData({...editData, saldo: e.target.value})} placeholder="Saldo" /> : <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{typeof contract.saldo_devedor === 'number' ? formatCurrencyLocal(contract.saldo_devedor) : (contract.saldo_devedor && contract.saldo_devedor !== 'N/A' ? contract.saldo_devedor : 'R$ 5.000,00')}</p>}
                                 </div>
                              </div>
                           </div>

                           {/* REFINANCIAMENTO (Linha de baixo) */}
                           <div className="space-y-3 bg-blue-50/30 dark:bg-blue-950/10 p-5 rounded-3xl border border-blue-100/50 dark:border-blue-900/20">
                              <div className="flex justify-between items-center">
                                 <span className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                    <Icons.Coins size={14} className="text-emerald-500" /> Refinanciamento
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
                                                return <img src={getStaticUrl(bcvMatch.logo_url)} alt="" loading="eager" fetchPriority="high" className="w-10 h-10 object-contain rounded-md flex-shrink-0 bg-white border border-slate-100 shadow-sm" />;
                                             }
                                             return (
                                                <span className="w-10 h-10 bg-blue-600 text-white text-[11px] font-black flex items-center justify-center rounded-md flex-shrink-0 shadow-md">BVC</span>
                                             );
                                          }

                                          return matchedBank?.logo_url ? (
                                             <img src={getStaticUrl(matchedBank.logo_url)} alt="" loading="eager" fetchPriority="high" className="w-10 h-10 object-contain rounded-md flex-shrink-0 bg-white border border-slate-100 shadow-sm" />
                                          ) : (
                                             <span className="text-lg">🏛️</span>
                                          );
                                       })()}
                                       <div className="flex flex-col min-w-0">
                                          {editingId === contract.id ? <input type="text" className="w-full text-sm font-black text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-500/30 rounded px-1 outline-none" value={editData.banco} onChange={e => setEditData({...editData, banco: e.target.value})} placeholder="Banco" /> : <p className="text-sm font-black text-slate-900 dark:text-white uppercase truncate">{contract.banco}</p>}
                                          <p className="text-[8px] font-bold text-blue-600 uppercase truncate">{contract.tabela}</p>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="md:col-span-3 space-y-1 md:text-right md:pr-6">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Parcela Refin</p>
                                    {editingId === contract.id ? <input type="number" step="0.01" className="w-full text-sm font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-500/30 rounded px-1 outline-none md:text-right" value={editData.parcela} onChange={e => setEditData({...editData, parcela: e.target.value})} placeholder="Parcela" /> : <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatCurrencyLocal(contract.parcela)}</p>}
                                    <p className="text-[8px] font-bold text-slate-400 uppercase">TX: {formatTaxa(contract.taxa)} a.m.</p>
                                 </div>
                                 <div className="md:col-span-2 space-y-1 bg-blue-600/5 dark:bg-blue-500/10 px-3 py-2 rounded-xl border border-blue-100/20">
                                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest truncate">Valor Bruto</p>
                                    {editingId === contract.id ? <input type="number" step="0.01" className="w-full text-sm font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 border border-blue-300 rounded px-1 outline-none" value={editData.valor_contrato} onChange={e => setEditData({...editData, valor_contrato: e.target.value})} placeholder="Bruto" /> : <p className="text-sm font-black text-blue-700 dark:text-blue-400">{formatCurrencyLocal(contract.valor_contrato)}</p>}
                                 </div>
                                 <div className="md:col-span-3 space-y-1 bg-emerald-600/5 dark:bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-100/20">
                                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest truncate">Troco</p>
                                    {editingId === contract.id ? <input type="number" step="0.01" className="w-full text-sm font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/50 border border-emerald-300 rounded px-1 outline-none" value={editData.valor_liberado} onChange={e => setEditData({...editData, valor_liberado: e.target.value})} placeholder="Troco" /> : <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">{formatCurrencyLocal(contract.valor_troco)}</p>}
                                 </div>
                               </div>
                            </div>
                           </>
                           ) : (
                              <div className="space-y-3 bg-slate-50/50 dark:bg-slate-800/30 p-5 rounded-3xl border border-slate-100 dark:border-white/5 h-full flex flex-col justify-center">
                                 <div className="flex justify-between items-center mb-4">
                                    <span className="text-sm font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                       <span>📄</span> {contract.produto}
                                    </span>
                                    {contract.status === 'REPROVADO' && (
                                       <span className="px-3 py-1 bg-red-600 text-white text-[9px] font-black rounded-lg uppercase shadow-sm">
                                          REPROVADO
                                       </span>
                                    )}
                                    {contract.status === 'PAGO' && (
                                       <span className="px-3 py-1 bg-emerald-600 text-white text-[9px] font-black rounded-lg uppercase shadow-sm">
                                          PAGO
                                       </span>
                                    )}
                                 </div>
                                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
                                    <div className="space-y-1">
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
                                                   return <img src={getStaticUrl(bcvMatch.logo_url)} alt="" loading="eager" fetchPriority="high" className="w-10 h-10 object-contain rounded-md flex-shrink-0 bg-white border border-slate-100 shadow-sm" />;
                                                }
                                                return <span className="w-10 h-10 bg-blue-600 text-white text-[11px] font-black flex items-center justify-center rounded-md flex-shrink-0 shadow-md">BVC</span>;
                                             }

                                             return matchedSub?.logo_url ? (
                                                <img src={getStaticUrl(matchedSub.logo_url)} alt="" loading="eager" fetchPriority="high" className="w-10 h-10 object-contain rounded-md flex-shrink-0 bg-white border border-slate-100 shadow-sm" />
                                             ) : (
                                                <div className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-md border border-slate-200 shadow-sm text-slate-400">
                                                   <Icons.Landmark size={20} />
                                                </div>
                                             );
                                          })()}
                                          {editingId === contract.id ? <input type="text" className="w-full text-sm font-black text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-500/30 rounded px-1 outline-none" value={editData.banco_origem} onChange={e => setEditData({...editData, banco_origem: e.target.value})} placeholder="Banco Origem" /> : <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{getFullOriginBankName(contract.instituicao_origem)}</p>}
                                       </div>
                                    </div>
                                    <div className="space-y-1">
                                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Valor Parcela</p>
                                       {editingId === contract.id ? <input type="number" step="0.01" className="w-full text-sm font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-500/30 rounded px-1 outline-none md:text-right" value={editData.parcela} onChange={e => setEditData({...editData, parcela: e.target.value})} placeholder="Parcela" /> : <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatCurrencyLocal(contract.parcela)}</p>}
                                    </div>
                                    <div className="space-y-1">
                                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Prazo</p>
                                       <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{contract.prazo_restante ? `${contract.prazo_restante}X` : 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1 bg-blue-600/5 dark:bg-blue-500/10 px-3 py-2 rounded-xl border border-blue-100/20">
                                       <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest truncate">Valor Contrato</p>
                                       {editingId === contract.id ? <input type="number" step="0.01" className="w-full text-sm font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/50 border border-blue-300 rounded px-1 outline-none" value={editData.valor_contrato} onChange={e => setEditData({...editData, valor_contrato: e.target.value})} placeholder="Bruto" /> : <p className="text-sm font-black text-blue-700 dark:text-blue-400">{formatCurrencyLocal(contract.valor_contrato)}</p>}
                                    </div>
                                 </div>
                              </div>
                           )}
                        </div>

                     </div>
                  );
               })
            )}
         </div>

         {manualModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
               <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-white/10 flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                     <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                        <Icons.Plus size={16} className="text-emerald-500" />
                        Adicionar Contrato Manual
                     </h3>
                     <button onClick={() => setManualModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Icons.X size={20} />
                     </button>
                  </div>
                  <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                     <form id="manual-contract-form" onSubmit={handleAddManual} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-500 uppercase">Cliente</label>
                              <input type="text" required value={manualData.cliente} onChange={e => setManualData({...manualData, cliente: e.target.value})} className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold" placeholder="Nome Compledo do Cliente" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-500 uppercase">CPF</label>
                              <input type="text" value={manualData.cpf} onChange={e => setManualData({...manualData, cpf: formatCPF(e.target.value)})} className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold" placeholder="000.000.000-00" />
                           </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-500 uppercase">Produto</label>
                              <select value={manualData.produto} onChange={e => setManualData({...manualData, produto: e.target.value})} className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold">
                                 <option value="PORTABILIDADE">PORTABILIDADE</option>
                                 <option value="MARGEM">MARGEM</option>
                                 <option value="REFINANCIAMENTO">REFINANCIAMENTO</option>
                                 <option value="CARTÃO CONSIGNADO">CARTÃO CONSIGNADO</option>
                                 <option value="SAQUE COMPLEMENTAR">SAQUE COMPLEMENTAR</option>
                                 <option value="FGTS">FGTS</option>
                                 <option value="CREDITO PESSOAL">CRÉDITO PESSOAL</option>
                                 <option value="CLT PRIVADO">CLT PRIVADO</option>
                              </select>
                           </div>
                           {manualData.produto === 'PORTABILIDADE' && (
                              <div className="space-y-1">
                                 <label className="text-[10px] font-black text-slate-500 uppercase">Novo Banco (Ex: 626 - C6)</label>
                                 <input type="text" required value={manualData.banco} onChange={e => setManualData({...manualData, banco: e.target.value})} className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold" placeholder="Banco de Destino" />
                              </div>
                           )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-500 uppercase">Convênio</label>
                              <select value={manualData.convenio} onChange={e => setManualData({...manualData, convenio: e.target.value})} className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold">
                                 <option value="INSS">INSS</option>
                                 <option value="SIAPE">SIAPE</option>
                                 <option value="GOVERNOS">GOVERNOS</option>
                                 <option value="FORÇAS ARMADAS">FORÇAS ARMADAS</option>
                                 <option value="PREFEITURAS">PREFEITURAS</option>
                              </select>
                           </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-500 uppercase">Valor Parcela</label>
                              <input type="text" value={manualData.parcela} onChange={e => setManualData({...manualData, parcela: e.target.value})} className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold" placeholder="R$ 0,00" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-500 uppercase">Taxa (%)</label>
                              <input type="text" value={manualData.taxa} onChange={e => setManualData({...manualData, taxa: e.target.value})} className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold" placeholder="Ex: 1,66" />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-500 uppercase">Tabela (Opcional)</label>
                              <input type="text" value={manualData.tabela} onChange={e => setManualData({...manualData, tabela: e.target.value})} className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold" placeholder="MANUAL" />
                           </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-500 uppercase">Valor Bruto</label>
                              <input type="text" value={manualData.valor_contrato} onChange={e => setManualData({...manualData, valor_contrato: e.target.value})} className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold" placeholder="R$ 0,00" />
                           </div>
                           {manualData.produto === 'PORTABILIDADE' && (
                              <>
                                 <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">Valor Troco</label>
                                    <input type="text" value={manualData.valor_troco} onChange={e => setManualData({...manualData, valor_troco: e.target.value})} className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold" placeholder="R$ 0,00" />
                                 </div>
                                 <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase">Saldo Devedor</label>
                                    <input type="text" value={manualData.saldo_devedor} onChange={e => setManualData({...manualData, saldo_devedor: e.target.value})} className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold" placeholder="R$ 0,00" />
                                 </div>
                              </>
                           )}
                           {manualData.produto !== 'PORTABILIDADE' && (
                              <div className="space-y-1">
                                 <label className="text-[10px] font-black text-slate-500 uppercase">Prazo</label>
                                 <input type="text" value={manualData.prazo} onChange={e => setManualData({...manualData, prazo: e.target.value.replace(/\D/g, '')})} className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold" placeholder="Ex: 84" />
                              </div>
                           )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                           <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-500 uppercase">Banco Origem</label>
                              <input type="text" value={manualData.instituicao_origem} onChange={e => setManualData({...manualData, instituicao_origem: e.target.value})} className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold" placeholder="Ex: 033 - SANTANDER" />
                           </div>
                        </div>
                     </form>
                  </div>
                  <div className="p-4 border-t border-slate-100 dark:border-white/5 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/50">
                     <button type="button" onClick={() => setManualModalOpen(false)} className="px-6 py-3 rounded-xl font-black text-[10px] uppercase text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        Cancelar
                     </button>
                     <button type="submit" form="manual-contract-form" className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-emerald-500/20 transition-all hover:scale-105">
                        Salvar Contrato
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}


