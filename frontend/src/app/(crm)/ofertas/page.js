"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, getStaticUrl } from "@/utils/api";
import { motion, AnimatePresence } from "framer-motion";

export default function OfertasPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [inputData, setInputData] = useState(null);
  const [filterBank, setFilterBank] = useState("");
  const [sortBy, setSortBy] = useState("melhor_tabela");
  const [isInitializing, setIsInitializing] = useState(false);
  const [animBanks, setAnimBanks] = useState([]);
  const [activeBankIdx, setActiveBankIdx] = useState(0);
  const [activeContractId, setActiveContractId] = useState(null);
  const [bankOfferIdx, setBankOfferIdx] = useState({});

  useEffect(() => {
    const storedResults = sessionStorage.getItem("simulation_results");
    const storedInput = sessionStorage.getItem("simulation_input");

    if (storedResults) {
      const parsed = JSON.parse(storedResults);
      if (Array.isArray(parsed)) {
        setData({ ofertas: parsed, rejeitados: [], total_bancos_analisados: parsed.length, total_aprovados: parsed.length, total_rejeitados: 0, cliente: {} });
      } else {
        setData(parsed);
      }
    } else {
      router.push("/simulador");
    }

    if (storedInput) {
      const parsedInput = JSON.parse(storedInput);
      setInputData(parsedInput);
      if (parsedInput.contracts && parsedInput.contracts.length > 0) {
        setActiveContractId(parsedInput.contracts[0].id);
      }
    }

    Promise.all([
      api.get("/admin/banks").catch(() => []),
      api.get("/admin/sub-logos").catch(() => [])
    ]).then(([banksList, subLogosList]) => {
      const merged = [
        ...subLogosList.map(l => ({ name: l.name, logo: l.logo_url ? getStaticUrl(l.logo_url) : null })),
        ...banksList.map(b => ({ name: b.name, logo: b.logo_url ? getStaticUrl(b.logo_url) : null }))
      ];
      setAnimBanks(merged);
    });

    return () => { };
  }, [router]);

  if (!data || !data.ofertas) return null;

  const results = data?.ofertas || [];
  const cliente = data?.cliente || {};

  const applySort = (list, sortType) => {
    if (!Array.isArray(list)) return [];
    const newList = [...list];
    if (sortType === "melhor_tabela") return newList.sort((a, b) => (a?.valor_liberado || 0) - (b?.valor_liberado || 0));
    if (sortType === "maior_troco") return newList.sort((a, b) => (b?.valor_liberado || 0) - (a?.valor_liberado || 0));
    if (sortType === "menor_taxa") return newList.sort((a, b) => (a?.taxa_juros || 0) - (b?.taxa_juros || 0));
    return newList;
  };

  const contracts = inputData?.contracts || [];
  const activeContractData = contracts.find(c => c.id === activeContractId) || contracts[0] || inputData || {};
  
  const currentAgreement = inputData?.agreement;
  const contractResults = Array.isArray(results) ? results.filter(res => {
    const isCorrectContract = res?._contrato_id === activeContractId || !res?._contrato_id;
    if (!isCorrectContract) return false;
    
    // Se a oferta tiver o campo convenio ou agreement, deve bater com o selecionado
    const offerAgreement = res?.convenio || res?.agreement;
    if (currentAgreement && offerAgreement) {
      const normCur = currentAgreement.toUpperCase().replace("_", " ");
      const normOff = offerAgreement.toUpperCase().replace("_", " ");
      if (normOff !== normCur) return false;
    }

    // Filtro por Sub-Convênio (especialmente para Estados/Governos)
    const currentSubAgreement = inputData?.sub_agreement;
    const offerSubAgreement = res?.sub_convenio || res?.sub_agreement;
    if (currentSubAgreement && offerSubAgreement) {
      const normCurSub = currentSubAgreement.split(' - ')[0].toUpperCase();
      const normOffSub = offerSubAgreement.toUpperCase();
      // Verifica se o estado (ex: AC) bate com o retornado na oferta
      if (normOffSub !== normCurSub && !normOffSub.includes(normCurSub)) return false;
    }

    // Filtro adicional pelo nome da tabela para garantir
    if (currentAgreement && res?.tabela) {
      const tab = res.tabela.toUpperCase();
      const agr = currentAgreement.toUpperCase();
      
      // Se eu selecionei SIAPE, não posso mostrar tabelas que dizem explicitamente INSS
      if (agr === "SIAPE" && tab.includes("INSS")) return false;
      // Se eu selecionei INSS, não posso mostrar tabelas que dizem explicitamente SIAPE
      if (agr === "INSS" && tab.includes("SIAPE")) return false;
      // E assim por diante para outros convênios se houver distinção clara
      if (agr === "FORÇAS ARMADAS" && (tab.includes("INSS") || tab.includes("SIAPE"))) return false;
    }

    return true;
  }) : [];

  const filteredResults = applySort(
    contractResults.filter(res => !filterBank || res?.banco?.toLowerCase().includes(filterBank.toLowerCase())),
    sortBy
  );

  const groupedByBank = {};
  filteredResults.forEach(offer => {
    if (offer && offer.banco) {
      if (!groupedByBank[offer.banco]) {
        groupedByBank[offer.banco] = [];
      }
      groupedByBank[offer.banco].push(offer);
    }
  });

  const nextOffer = (banco, total) => {
    setBankOfferIdx(prev => ({ ...prev, [banco]: ((prev[banco] || 0) + 1) % total }));
  };

  // Lógica para encontrar a "Melhor Tabela" (1ª de cada banco com maior troco)
  const firstTablesByBank = [];
  const banksSeen = new Set();
  contractResults.forEach(res => {
    if (res && res.banco && !banksSeen.has(res.banco)) {
      banksSeen.add(res.banco);
      firstTablesByBank.push(res);
    }
  });

  const bestTableOffer = firstTablesByBank.length > 0 
    ? [...firstTablesByBank].sort((a, b) => (a?.valor_liberado || 0) - (b?.valor_liberado || 0))[0] 
    : null;

  const topByTaxa = contractResults.length > 0 
    ? [...contractResults].sort((a, b) => (a?.taxa_juros || 0) - (b?.taxa_juros || 0) || (b?.valor_liberado || 0) - (a?.valor_liberado || 0))[0] 
    : null;

  const topByTroco = contractResults.length > 0 
    ? [...contractResults].sort((a, b) => (b?.valor_liberado || 0) - (a?.valor_liberado || 0))[0] 
    : null;

  const baseHighlights = [
    { id: "melhor_tabela", title: "MELHOR TABELA", data: bestTableOffer, icon: "🏆", bg: "bg-blue-600/10", text: "text-blue-600", metric: bestTableOffer ? `R$ ${Number(bestTableOffer?.valor_liberado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "R$ 0,00", label: "Liberado" },
    { id: "menor_taxa", title: "MENOR TAXA", data: topByTaxa, icon: "📉", bg: "bg-cyan-600/10", text: "text-cyan-600", metric: topByTaxa ? `${Number(topByTaxa?.taxa_juros || 0).toFixed(2)}%` : "0,00%", label: "Taxa" },
    { id: "maior_troco", title: "MAIOR TROCO", data: topByTroco, icon: "💰", bg: "bg-emerald-600/10", text: "text-emerald-600", metric: topByTroco ? `R$ ${Number(topByTroco?.valor_liberado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "R$ 0,00", label: "Liberado" }
  ];



  const highlights = [...baseHighlights].sort((a, b) => {
    if (a.id === sortBy) return -1;
    if (b.id === sortBy) return 1;
    return 0;
  });

  const handleAccept = async (offer) => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : {};
      const payload = {
        client_name: cliente.nome || inputData?.nome_cliente || "Cliente",
        banco: offer.banco,
        taxa_juros: offer.taxa_juros,
        valor_liberado: offer.valor_liberado,
        parcela_nova: offer.valor_parcela || 0,
        prazo: offer.prazo || 84,
        original_banco: cliente.banco_originador || inputData?.banco || "Banco Original",
        original_parcela: cliente.valor_parcela || parseFloat(inputData?.parcela) || 0,
        original_taxa: cliente.taxa_calculada || 0,
        original_prazo_restante: cliente.prazo_restante || 0,
        original_saldo: cliente.saldo_devedor || 0,
        user_name: user.name || "Consultor",
        user_avatar: user.logo_url || null
      };
      const response = await api.post('/pdf/generate-proposal', payload, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposta_${offer.banco}.pdf`;
      a.click();

      // Salvar contrato aceito para a tela Meus Contratos e Relatórios
      const existingContracts = JSON.parse(localStorage.getItem('accepted_contracts') || '[]');
      existingContracts.push({
        id: Date.now().toString(),
        user_id: user.id,
        user_name: user.name || "Consultor",
        user_role: user.role,
        broker_id: user.broker_id,
        data_aceite: new Date().toISOString().split('T')[0], // YYYY-MM-DD para os gráficos
        data_hora: new Date().toISOString(),
        cliente: cliente.nome || inputData?.nome_cliente || "Cliente Oculto",
        cpf: inputData?.cpf || "Não Informado",
        banco: offer.banco,
        convenio: inputData?.agreement || "INSS",
        parcela: offer.valor_parcela || 0,
        tabela: offer.tabela || "Padrão",
        taxa: offer.taxa_juros || 0,
        valor_contrato: offer.valor_total_contrato || (offer.valor_parcela * (offer.prazo || 84)) || 0,
        valor_troco: offer.valor_liberado || 0,
        instituicao_origem: activeContractData?.banco || "BANCO BVC",
        saldo_devedor: activeContractData?.saldoDevedor ? (typeof activeContractData.saldoDevedor === 'string' ? parseFloat(activeContractData.saldoDevedor.replace(/[^\d,]/g, '').replace(',', '.')) : activeContractData.saldoDevedor) : 5000.00,
        prazo_restante: activeContractData?.prazoTotal ? (Math.max(0, parseInt(activeContractData.prazoTotal) - parseInt(activeContractData.parcelasPagas || "0"))) : 56,
        orig_parcela: parseFloat(activeContractData?.parcela) || parseFloat(inputData?.parcela) || offer.valor_parcela || 0

      });
      localStorage.setItem('accepted_contracts', JSON.stringify(existingContracts));

      setTimeout(() => {
        router.push('/meus-contratos');
      }, 500);

    } catch (error) { console.error("PDF Error:", error); alert("Erro ao gerar proposta."); }
  };

  const formatCurrency = (value) => `R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <>
      {/* Remoção da animação antiga para evitar duplicidade com o novo simulador */}


      <div className="w-full max-w-[1200px] mx-auto px-4 py-6 space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-500/30">
              <span className="text-white text-xl font-black italic">PRO</span>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tighter">Oportunidades Disponíveis</h1>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-0.5">Simulativo para: {inputData?.nome_cliente || "Geral"}</p>
            </div>
          </div>
          <Link href="/simulador" className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/20 transition-all hover:scale-105">← Início</Link>
        </div>



        {/* DADOS DA PORTABILIDADE SECTION */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-5 border border-slate-100 dark:border-white/10 shadow-xl">
          <h2 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">DADOS DA PORTABILIDADE</h2>

          {contracts.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
              {contracts.map((c, idx) => (
                <button
                  key={c.id}
                  onClick={() => setActiveContractId(c.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-black uppercase whitespace-nowrap transition-all ${activeContractId === c.id ? "bg-blue-600 text-white shadow-lg" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"}`}
                >
                  CONTRATO {idx + 1}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-white/5">
            <div className="flex flex-wrap md:flex-nowrap items-center gap-4 flex-1">
              {inputData?.nome_cliente && (
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">CLIENTE</p>
                  <p className="text-base font-black text-slate-900 dark:text-white truncate">{inputData.nome_cliente}</p>
                </div>
              )}
              {inputData?.cpf && (
                <div className="w-1/3 min-w-[120px]">
                  <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">CPF</p>
                  <p className="text-base font-black text-slate-900 dark:text-white">{inputData.cpf}</p>
                </div>
              )}
              <div className="w-1/4 min-w-[80px]">
                <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">IDADE</p>
                <p className="text-base font-black text-slate-900 dark:text-white">{inputData?.idade || "-"} anos</p>
              </div>
            </div>

            <button onClick={() => window.print()} className="print:hidden bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 text-[10px] font-black uppercase px-4 py-2 rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap">
              📄 Imprimir
            </button>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4">
            {(() => {
              const fullBankName = activeContractData?.banco_nome || activeContractData?.banco || "";
              const searchName = fullBankName ? (fullBankName.includes('-') ? fullBankName.split('-')[1].trim().toUpperCase() : fullBankName.toUpperCase()) : "";
              const matchedBank = animBanks.find(b => {
                 const bName = b.name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]/g, '');
                 const sName = searchName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w]/g, '');
                 return bName.includes(sName) || sName.includes(bName) || b.name.toUpperCase().includes(sName.slice(0, 5));
              });

              return (
                <div className="flex items-center gap-3 min-w-[320px] xl:min-w-[400px] bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {matchedBank?.logo ? <img src={matchedBank.logo} alt="" className="w-full h-full object-cover" /> : <span className="text-lg">🏛️</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ORIGEM</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white truncate max-w-[280px]">{fullBankName || "-"}</p>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 flex-1 w-full">
              <div className="bg-slate-50/50 dark:bg-white/5 p-2 rounded-xl border border-slate-100/50 dark:border-white/5">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">SALDO</p>
                <p className="text-xs font-black text-slate-900 dark:text-white">{activeContractData?.saldoDevedor || "-"}</p>
              </div>
              <div className="bg-slate-50/50 dark:bg-white/5 p-2 rounded-xl border border-slate-100/50 dark:border-white/5">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">PARCELA</p>
                <p className="text-xs font-black text-slate-900 dark:text-white">{activeContractData?.parcela || "-"}</p>
              </div>
              <div className="bg-slate-50/50 dark:bg-white/5 p-2 rounded-xl border border-slate-100/50 dark:border-white/5">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">CONVÊNIO</p>
                <p className="text-xs font-black text-slate-900 dark:text-white">{inputData?.agreement || "-"}</p>
              </div>
              <div className="bg-slate-50/50 dark:bg-white/5 p-2 rounded-xl border border-slate-100/50 dark:border-white/5">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">PRAZO REST.</p>
                <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {activeContractData?.prazoTotal ? `${Math.max(0, parseInt(activeContractData.prazoTotal) - parseInt(activeContractData.parcelasPagas || "0"))} X` : "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl p-2 rounded-[2rem] border border-slate-100 dark:border-white/10 shadow-2xl sticky top-4 z-[40]">
          <div className="flex flex-col md:flex-row items-center gap-3 relative">
            <div className="flex-1 w-full relative">
              <input type="text" value={filterBank} onChange={(e) => setFilterBank(e.target.value)} onFocus={() => document.getElementById('bank-suggestions')?.classList.remove('hidden')} onBlur={() => setTimeout(() => document.getElementById('bank-suggestions')?.classList.add('hidden'), 200)} className="w-full bg-slate-50 dark:bg-white/5 border-none rounded-3xl pl-14 pr-8 py-3 text-sm font-bold outline-none text-slate-800 dark:text-white" placeholder="Filtrar por Banco..." />
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-lg opacity-40">🔍</span>
              
              <div id="bank-suggestions" className="hidden absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/10 shadow-2xl rounded-2xl p-2 z-[50] max-h-60 overflow-y-auto">
                <button onClick={() => setFilterBank("")} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 transition-all uppercase tracking-widest">TODOS OS BANCOS</button>
                {[...new Set(contractResults.map(r => r.banco).filter(Boolean))].map((bancoName) => (
                   <button key={bancoName} onClick={() => setFilterBank(bancoName)} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 transition-all uppercase tracking-widest truncate">{bancoName}</button>
                ))}
              </div>
            </div>
            <div className="flex p-1.5 bg-slate-100/80 dark:bg-white/10 rounded-3xl gap-1 shrink-0">
              {[
                { id: "melhor_tabela", label: "Tabela", icon: "🏆" },
                { id: "maior_troco", label: "Troco", icon: "💰" },
                { id: "menor_taxa", label: "Taxa", icon: "📈" }
              ].map(opt => (
                <button key={opt.id} onClick={() => setSortBy(opt.id)} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all flex items-center gap-2 uppercase tracking-widest ${sortBy === opt.id ? "bg-white dark:bg-slate-700 text-blue-600 shadow-xl" : "text-slate-500 hover:text-slate-700"}`}>
                  <span>{opt.icon}</span> {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          initial="visible"
          animate="visible"
          variants={{
            visible: {
              transition: { staggerChildren: 0.1 }
            }
          }}
        >
          {highlights.map((h) => (
            <motion.div
              layout
              variants={{
                hidden: { opacity: 0, y: 150, scale: 0.8, rotateX: 30 },
                visible: { opacity: 1, y: 0, scale: 1, rotateX: 0 }
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              key={h.id}
              onClick={() => h.data && handleAccept(h.data)}
              className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-slate-100 dark:border-white/10 shadow-xl flex flex-col hover:shadow-2xl cursor-pointer"
              whileHover={{ y: -5, scale: 1.01, transition: { type: "spring", stiffness: 400 } }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 ${h.bg} ${h.text} rounded-lg text-[9px] font-black underline decoration-2 underline-offset-4`}>{h.title}</span>
                <span className="text-[9px] font-black text-slate-300 tracking-widest italic">{inputData?.agreement || "CONVÊNIO"}</span>
              </div>

              <div className="flex flex-col xl:flex-row items-center gap-3 mb-4 bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-100/50">
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-lg border border-white bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                  {h.data?.logo_url ? (
                    <img src={getStaticUrl(h.data.logo_url)} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span className="text-xl">🏛️</span>
                  )}
                </div>
                <div className="text-center xl:text-left">
                  <h3 className="text-xs xl:text-sm font-black text-slate-900 dark:text-white uppercase leading-tight tracking-tight mt-1">
                    {h.data?.banco || "INDISPONÍVEL"}
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-widest">{h.data?.tabela || "INDISPONÍVEL"}</p>
                  {h.data && (() => {
                    const agr = inputData?.agreement || "INSS";
                    return (
                      <span className={`mt-1 inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm ${
                        agr === 'INSS' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        agr === 'SIAPE' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        agr === 'FORCAS' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        agr === 'CLT_PRIVADO' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                        agr === 'GOV_EST' || agr === 'GOVERNOS' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                        'bg-slate-50 text-slate-500 border-slate-100'
                      }`}>
                        {agr === 'GOV_EST' || agr === 'GOVERNOS' ? 'GOVERNO' : agr === 'FORCAS' ? 'FORÇAS' : agr === 'CLT_PRIVADO' ? 'CLT' : agr}
                      </span>
                      {inputData?.sub_agreement && (
                         <span className="mt-1 inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white text-slate-600 border border-slate-200 shadow-sm ml-1">
                            {inputData.sub_agreement.split(' - ')[0]}
                         </span>
                      )}
                    );
                  })()}
                </div>
              </div>

              <div className="mt-auto space-y-3 pt-6 border-t border-slate-50 dark:border-white/5">
                {h.data && (
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl mb-3 text-xs text-slate-500 font-bold uppercase tracking-widest border border-slate-100 dark:border-white/5">
                    <div className="flex flex-col gap-1.5">
                      <span>Taxa Port: <strong className="text-slate-800 dark:text-slate-200">{h.data?.taxa_portabilidade_atual?.toFixed(2)}%</strong></span>
                      <span>Taxa Refin: <strong className="text-slate-800 dark:text-slate-200">{h.data?.taxa_juros?.toFixed(2)}%</strong></span>
                      <span className="text-[9px] text-blue-600 dark:text-blue-400 font-black">PRAZO: {h.data?.prazo || "84"}X</span>
                    </div>
                    <div className="text-right flex flex-col gap-1.5">
                      <span>Total Contrato</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {formatCurrency((activeContractData?.saldoDevedor ? parseFloat(String(activeContractData.saldoDevedor).replace(/[^\d,]/g, '').replace(',', '.')) : 0) + (h.data?.valor_liberado || 0))}
                      </strong>
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>{h.label}</span>
                  <span className={`text-xl font-black tracking-tighter ${h.text}`}>{h.metric}</span>
                </div>
                {h.id === "menor_taxa" && h.data && (
                  <div className="flex justify-between items-center text-sm font-bold text-slate-400 uppercase tracking-widest">
                    <span>Troco Liberado</span>
                    <span className="text-xl font-black tracking-tighter text-emerald-600">{formatCurrency(h.data.valor_liberado)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center bg-blue-600 text-white p-2.5 rounded-xl shadow-lg shadow-blue-500/30">
                  <span className="text-[10px] font-black uppercase">Parcela Final</span>
                  <span className="text-xs font-black italic">{h.data ? formatCurrency(h.data.valor_parcela) : "R$ 0,00"}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="space-y-6">
          {Object.entries(groupedByBank)
            .sort(([bancoA, offersA], [bancoB, offersB]) => {
              const pA = offersA[0]?.priority || 99;
              const pB = offersB[0]?.priority || 99;
              return pA - pB;
            })
            .map(([banco, offers], idx) => {
              const currentOfferIdx = bankOfferIdx[banco] || 0;
              const offer = offers[currentOfferIdx];
              if (!offer) return null;

              return (
                <div key={idx} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-white/10 shadow-lg overflow-hidden transition-all hover:shadow-2xl">
                  <div className="flex flex-col lg:flex-row gap-0 items-stretch">
                    <div className="bg-slate-50 dark:bg-white/5 p-5 lg:p-6 lg:w-1/3 xl:w-[28%] flex flex-col justify-center gap-4 shrink-0 relative">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-xl border-2 border-white">
                          <img src={getStaticUrl(offer.logo_url)} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="min-w-0 flex-1">
                          {(() => {
                            const agr = inputData?.agreement || "INSS";
                            return (
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-sm mb-1 inline-block truncate max-w-full ${
                                agr === 'INSS' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                agr === 'SIAPE' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                agr === 'FORCAS' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                agr === 'CLT_PRIVADO' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                agr === 'GOV_EST' || agr === 'GOVERNOS' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                'bg-slate-50 text-slate-500 border-slate-100'
                              }`}>
                                {agr === 'GOV_EST' || agr === 'GOVERNOS' ? 'GOVERNO' : agr === 'FORCAS' ? 'FORÇAS' : agr === 'CLT_PRIVADO' ? 'CLT' : agr}
                              </span>
                              {inputData?.sub_agreement && (
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white text-slate-600 border border-slate-200 shadow-sm mb-1 inline-block ml-1">
                                    {inputData.sub_agreement.split(' - ')[0]}
                                </span>
                              )}
                            );
                          })()}
                          <h3 className="text-sm xl:text-base font-black text-slate-900 dark:text-white uppercase leading-tight tracking-tight break-words">{offer.banco}</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-widest truncate">{offer.tabela}</p>
                        </div>
                      </div>
                      {offers.length > 1 && (
                        <button onClick={() => nextOffer(banco, offers.length)} className="mx-auto mt-1 text-[9px] font-black uppercase text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                          Ver Próxima <span className="bg-white/20 px-1 py-0.5 rounded-md">{currentOfferIdx + 1}/{offers.length}</span> ➔
                        </button>
                      )}
                    </div>

                    <div className="flex-1 w-full overflow-hidden">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={currentOfferIdx}
                          initial={{ opacity: 0, scale: 0.9, filter: "blur(8px)" }}
                          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                          exit={{ opacity: 0, scale: 1.1, filter: "blur(8px)" }}
                          transition={{ duration: 0.5, type: "spring", bounce: 0.5 }}
                          className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 lg:px-8 xl:px-10 border-l border-slate-50 w-full h-full"
                        >
                          <div className="space-y-0.5 w-full md:w-auto text-center md:text-left">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxa Port.</p>
                            <p className="text-2xl font-black text-blue-600 tracking-tighter">{offer.taxa_portabilidade_atual?.toFixed(2)}%</p>
                          </div>
                          <div className="space-y-0.5 w-full md:w-auto text-center md:text-left">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxa Refin</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                              {offer.taxa_juros?.toFixed(2)}%
                              <span className="text-[10px] text-slate-400 ml-1 font-bold">a.m.</span>
                            </p>
                            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest mt-1">Prazo: {offer.prazo || "84"}X</p>
                          </div>
                          <div className="space-y-0.5 bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 flex flex-col justify-center w-full md:w-auto shrink-0 md:min-w-[180px] xl:min-w-[210px] shadow-sm">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest text-center md:text-left">TROCO LIBERADO</p>
                            <p className="text-2xl xl:text-3xl font-black text-emerald-600 tracking-tighter whitespace-nowrap text-center md:text-left">{formatCurrency(offer.valor_liberado)}</p>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    <div className="p-6 lg:p-8 lg:w-1/5 xl:w-[18%] shrink-0 flex flex-col justify-center gap-2 border-t md:border-t-0 border-slate-50">
                      <button onClick={() => handleAccept(offer)} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/30 transition-all hover:-translate-y-1">Aceitar</button>
                      <p className="text-[9px] text-slate-400 font-bold uppercase text-center tracking-widest opacity-60">Geração de PDF Automática</p>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>

        {/* SECTION: BANCOS REJEITADOS */}
        {data?.rejeitados && data.rejeitados.length > 0 && (
          <div className="mt-16 pt-10 border-t border-slate-100 dark:border-white/5">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.4em] mb-8 flex items-center gap-4">
              <span className="w-8 h-[2px] bg-slate-200 dark:bg-white/10"></span>
              Bancos Indisponíveis nesta Simulação
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {data.rejeitados
                .filter(rej => rej)
                .map((rej, i) => {
                  if (!rej) return null;
                  
                  // Função para resumir e limpar motivos
                  const getCleanMotivo = (msg) => {
                    if (!msg) return "Requisitos não atendidos";
                    const m = msg.toUpperCase();
                    if (m.includes("IDADE")) return "IDADE FORA DO LIMITE";
                    if (m.includes("ESPÉCIE") || m.includes("ESPECIE")) return "ESPÉCIE NÃO PERMITIDA";
                    if (m.includes("ANALFABETO")) return "NÃO ACEITA ANALFABETO";
                    if (m.includes("VALOR MÍNIMO") || m.includes("TROCO") || m.includes("MÍNIMO")) return "TROCO MÍNIMO NÃO ATINGIDO";
                    if (m.includes("TABELA") || m.includes("REGRAS")) return "REGRAS DE TABELA NÃO ATENDIDAS";
                    return msg.length > 50 ? msg.substring(0, 47) + "..." : msg;
                  };

                  return (
                    <div key={i} className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-white shadow-sm border border-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                           {rej?.logo_url ? (
                             <img src={getStaticUrl(rej.logo_url)} className="w-full h-full object-cover" alt={rej?.banco} />
                           ) : (
                             <span className="text-base">🏦</span>
                           )}
                        </div>
                        <span className="font-black text-slate-900 dark:text-white uppercase text-[9px] truncate leading-tight flex-1">
                          {rej?.banco || "Banco Indeterminado"}
                        </span>
                      </div>
                      <p className="text-[8px] text-red-500 font-black uppercase tracking-tight leading-relaxed italic">
                        ❌ {getCleanMotivo(rej?.motivo)}
                      </p>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
