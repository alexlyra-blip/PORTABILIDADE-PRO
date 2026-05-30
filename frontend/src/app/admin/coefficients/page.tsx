"use client";

import { useEffect, useState } from "react";
import { api, getStaticUrl } from "@/utils/api";

export default function CoefficientsPage() {
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [tables, setTables] = useState<any[]>([]);
  const [allCoefficients, setAllCoefficients] = useState<Record<string, any[]>>({});
  const [globalTermFilter, setGlobalTermFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoeff, setEditingCoeff] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'term' | 'default'>('default');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isLoaded, setIsLoaded] = useState(false);

  // Carrega as preferências de ordenação salvas no localStorage de forma segura pós-hidratação
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSortBy = localStorage.getItem('coef_sortBy');
      const savedSortOrder = localStorage.getItem('coef_sortOrder');
      if (savedSortBy) {
        setSortBy(savedSortBy as 'name' | 'term' | 'default');
      }
      if (savedSortOrder) {
        setSortOrder(savedSortOrder as 'asc' | 'desc');
      }
      setIsLoaded(true);
    }
  }, []);

  // Salva no localStorage apenas após carregar as preferências iniciais
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem('coef_sortBy', sortBy);
      localStorage.setItem('coef_sortOrder', sortOrder);
    }
  }, [sortBy, sortOrder, isLoaded]);

  const [formData, setFormData] = useState<any>({
    bank_id: "",
    table_id: "",
    term: 84,
    interest_rate: 0,
    coefficient: ""
  });

  const [selectedAgreement, setSelectedAgreement] = useState("");
  const [selectedSubAgreement, setSelectedSubAgreement] = useState("");

  const ESTADOS = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"];

  useEffect(() => {
    loadBanks();
  }, []);

  useEffect(() => {
    if (selectedBankId) {
      loadTables(selectedBankId);
      setSelectedAgreement("");
      setSelectedSubAgreement("");
    } else {
      setTables([]);
      setAllCoefficients({});
    }
  }, [selectedBankId]);

  useEffect(() => {
    if (tables.length > 0) {
      loadAllCoefficients(tables);
    } else {
      setAllCoefficients({});
    }
  }, [tables]);

  const loadBanks = async () => {
    try {
      const data = await api.get("/admin/banks");
      setBanks(data);
      if (data.length > 0 && !selectedBankId) {
        setSelectedBankId(data[0].id.toString());
      }
    } catch (error) {
      console.error("Erro ao carregar bancos:", error);
    }
  };

  const loadTables = async (bankId: string) => {
    try {
      const data = await api.get(`/admin/banks/${bankId}/tables`);
      setTables(data);
    } catch (error) {
      console.error("Erro ao carregar tabelas:", error);
    }
  };

  const loadAllCoefficients = async (tablesList: any[]) => {
    try {
      setLoading(true);
      const coeffData: Record<string, any[]> = {};
      await Promise.all(
        tablesList.map(async (table) => {
          try {
            const data = await api.get(`/admin/bank-tables/${table.id}/coefficients`);
            coeffData[table.id] = data;
          } catch (err) {
            console.error(`Erro ao carregar coeficientes da tabela ${table.id}:`, err);
            coeffData[table.id] = [];
          }
        })
      );
      setAllCoefficients(coeffData);
    } catch (error) {
      console.error("Erro ao carregar coeficientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTables = tables.filter(t => {
    const matchAgr = !selectedAgreement || (t.agreement && t.agreement.toUpperCase().includes(selectedAgreement.toUpperCase()));
    const matchSub = !selectedSubAgreement || (t.sub_agreement && t.sub_agreement.toUpperCase().includes(selectedSubAgreement.toUpperCase()));
    return matchAgr && matchSub;
  });

  const handleOpenModal = (coeff: any = null, targetTableId: string = "", targetTerm: number | null = null) => {
    if (coeff) {
      setEditingCoeff(coeff);
      setFormData({
        bank_id: coeff.bank_id?.toString() || selectedBankId,
        table_id: coeff.table_id.toString(),
        term: coeff.term,
        interest_rate: coeff.interest_rate,
        coefficient: coeff.coefficient.toString()
      });
    } else {
      setEditingCoeff(null);
      setFormData({
        bank_id: selectedBankId,
        table_id: targetTableId || (filteredTables.length > 0 ? filteredTables[0].id.toString() : ""),
        term: targetTerm !== null ? targetTerm : 84,
        interest_rate: 0,
        coefficient: ""
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingCoeff(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { 
        ...formData, 
        bank_id: parseInt(formData.bank_id),
        table_id: parseInt(formData.table_id),
        term: parseInt(formData.term),
        interest_rate: parseFloat(formData.interest_rate),
        coefficient: formData.coefficient
      };

      if (editingCoeff) {
        await api.patch(`/admin/coefficients/${editingCoeff.id}`, payload);
      } else {
        await api.post("/admin/coefficients", payload);
      }
      handleCloseModal();
      loadAllCoefficients(tables);
    } catch (error) {
      console.error("Erro ao salvar coeficiente:", error);
      alert("Erro ao salvar coeficiente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Certeza que deseja excluir este coeficiente?")) return;
    try {
      await api.delete(`/admin/coefficients/${id}`);
      loadAllCoefficients(tables);
    } catch (error) {
      console.error("Erro ao excluir coeficiente:", error);
      alert("Erro ao excluir coeficiente.");
    }
  };

  const selectedBank = banks.find(b => b.id.toString() === selectedBankId);

  // Agrupar coeficientes por prazo para cada tabela
  const coeffWindows: any[] = [];
  filteredTables.forEach((table) => {
    const tableCoeffs = allCoefficients[table.id] || [];
    if (tableCoeffs.length === 0) {
      coeffWindows.push({
        key: `${table.id}-empty`,
        table,
        term: null,
        coefficients: []
      });
    } else {
      const coeffsByTerm: Record<number, any[]> = {};
      tableCoeffs.forEach((c) => {
        const term = Number(c.term);
        if (!coeffsByTerm[term]) {
          coeffsByTerm[term] = [];
        }
        coeffsByTerm[term].push(c);
      });

      Object.keys(coeffsByTerm)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach((term) => {
          coeffWindows.push({
            key: `${table.id}-${term}`,
            table,
            term,
            coefficients: coeffsByTerm[term]
          });
        });
    }
  });

  // Obter todos os prazos únicos existentes em todos os coeficientes carregados
  const allUniqueTerms = Array.from(
    new Set(
      Object.values(allCoefficients)
        .flatMap((coeffs) => coeffs || [])
        .map((c) => Number(c.term))
        .filter((t) => !isNaN(t))
    )
  ).sort((a, b) => a - b);

  const termFilterOptions = allUniqueTerms.length > 0 ? allUniqueTerms : [84, 96, 108, 120];

  const displayedWindows = globalTermFilter !== null
    ? coeffWindows.filter((w) => w.term === globalTermFilter)
    : coeffWindows;

  const sortedWindows = [...displayedWindows];
  if (sortBy === 'name') {
    sortedWindows.sort((a, b) => {
      const nameA = a.table.name || "";
      const nameB = b.table.name || "";
      const comp = nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
      return sortOrder === 'asc' ? comp : -comp;
    });
  } else if (sortBy === 'term') {
    sortedWindows.sort((a, b) => {
      const termA = a.term ?? 0;
      const termB = b.term ?? 0;
      const comp = termA - termB;
      return sortOrder === 'asc' ? comp : -comp;
    });
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-xl border border-slate-100 dark:border-white/5">
        <div className="flex-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none mb-1">Coeficientes</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic">Gestão de cálculo HP-12C</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="relative w-full md:w-48">
             <select 
               value={selectedBankId}
               onChange={(e) => setSelectedBankId(e.target.value)}
               className="w-full py-3.5 px-6 bg-slate-50 dark:bg-white/5 rounded-2xl border-none shadow-inner text-[11px] font-black uppercase tracking-widest focus:ring-2 ring-blue-500/20 transition-all cursor-pointer text-blue-600"
             >
               {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
             </select>
          </div>

          <div className="relative w-full md:w-48">
             <select 
               value={selectedAgreement}
               onChange={(e) => setSelectedAgreement(e.target.value)}
               className="w-full py-3.5 px-6 bg-slate-50 dark:bg-white/5 rounded-2xl border-none shadow-inner text-[11px] font-black uppercase tracking-widest focus:ring-2 ring-blue-500/20 transition-all cursor-pointer text-slate-700 dark:text-white"
             >
               <option value="">TODOS CONVÊNIOS</option>
               <option value="INSS">INSS</option>
               <option value="SIAPE">SIAPE</option>
               <option value="FORÇAS ARMADAS">FORÇAS ARMADAS</option>
               <option value="GOVERNOS">GOVERNOS</option>
               <option value="CLT PRIVADO">CLT PRIVADO</option>
             </select>
          </div>

          {selectedAgreement === "GOVERNOS" && (
            <div className="relative w-full md:w-32 animate-in zoom-in duration-300">
               <select 
                 value={selectedSubAgreement}
                 onChange={(e) => setSelectedSubAgreement(e.target.value)}
                 className="w-full py-3.5 px-6 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border-none shadow-inner text-[11px] font-black uppercase tracking-widest focus:ring-2 ring-blue-500/20 transition-all cursor-pointer text-blue-600"
               >
                 <option value="">ESTADOS</option>
                 {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
               </select>
            </div>
          )}

          <button 
            disabled={filteredTables.length === 0}
            onClick={() => handleOpenModal(null, "", globalTermFilter)}
            className="w-full md:w-auto py-3.5 px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 hover:-translate-y-1 active:scale-95 disabled:opacity-50"
          >
            <span>🔢</span> Novo Coeficiente
          </button>
        </div>
      </div>

      {/* Filtro Global por Prazo & Ordenação */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-white/5 animate-in fade-in duration-500">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 w-full xl:w-auto">
          {/* Visualizar por Prazo */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0">Visualizar por Prazo:</span>
            <div className="flex flex-wrap items-center gap-2 mt-1 sm:mt-0">
              <button
                type="button"
                onClick={() => setGlobalTermFilter(null)}
                className={`py-2 px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  globalTermFilter === null
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105"
                    : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                }`}
              >
                Todos ({coeffWindows.length})
              </button>
              {termFilterOptions.map((term) => {
                const termWindowsCount = coeffWindows.filter((w) => w.term === term).length;
                return (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setGlobalTermFilter(term)}
                    className={`py-2 px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      globalTermFilter === term
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105"
                        : "bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                    }`}
                  >
                    {term}X ({termWindowsCount})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ordenar Tabelas */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-white/5 pt-4 lg:pt-0 lg:pl-6">
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0">Ordenar Tabelas:</span>
            <div className="flex flex-wrap items-center gap-2 mt-1 sm:mt-0">
              <button
                type="button"
                onClick={() => {
                  if (sortBy !== 'name') {
                    setSortBy('name');
                    setSortOrder('asc');
                  } else {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }
                }}
                className={`py-2.5 px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 shadow-sm ${
                  sortBy === 'name'
                    ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                    : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-300 border-transparent hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
                title={sortBy === 'name' ? (sortOrder === 'asc' ? "Nome A-Z (Clique para Z-A)" : "Nome Z-A (Clique para A-Z)") : "Ordenar por Nome"}
              >
                <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${sortBy === 'name' && sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                Nome {sortBy === 'name' ? (sortOrder === 'asc' ? 'A-Z' : 'Z-A') : ''}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (sortBy !== 'term') {
                    setSortBy('term');
                    setSortOrder('asc');
                  } else {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }
                }}
                className={`py-2.5 px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 shadow-sm ${
                  sortBy === 'term'
                    ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                    : 'bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-300 border-transparent hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
                title={sortBy === 'term' ? (sortOrder === 'asc' ? "Prazo Crescente (Clique para Decrescente)" : "Prazo Decrescente (Clique para Crescente)") : "Ordenar por Prazo"}
              >
                <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${sortBy === 'term' && sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                Prazo {sortBy === 'term' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </button>

              {sortBy !== 'default' && (
                <button
                  type="button"
                  onClick={() => {
                    setSortBy('default');
                    setSortOrder('asc');
                  }}
                  className="py-2 px-3 text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest transition-colors"
                  title="Limpar Ordenação"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0 self-end xl:self-center">
          {sortedWindows.length} {sortedWindows.length === 1 ? "Janela" : "Janelas"} exibidas
        </div>
      </div>

      <div className="space-y-12">
        {loading && Object.keys(allCoefficients).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white dark:bg-slate-900 rounded-[3rem] shadow-xl">
             <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest animate-pulse">Carregando Coeficientes...</p>
          </div>
        ) : sortedWindows.length === 0 ? (
          <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-white/5 shadow-xl animate-in fade-in duration-500">
             <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Nenhuma janela correspondente aos filtros.</p>
          </div>
        ) : (() => {
          // Agrupar coeffWindows por Agreement, depois por Term, e depois por Sub-Agreement
          const groupedByAgreement: Record<string, Record<string, Record<string, any[]>>> = {};

          sortedWindows.forEach((w) => {
            const agreement = (w.table.agreement || "OUTROS").toUpperCase();
            const termLabel = w.term !== null ? `${w.term}X` : "SEM COEFICIENTE";
            const subAgreement = (w.table.sub_agreement || "GERAL").toUpperCase();

            if (!groupedByAgreement[agreement]) {
              groupedByAgreement[agreement] = {};
            }
            if (!groupedByAgreement[agreement][termLabel]) {
              groupedByAgreement[agreement][termLabel] = {};
            }
            if (!groupedByAgreement[agreement][termLabel][subAgreement]) {
              groupedByAgreement[agreement][termLabel][subAgreement] = [];
            }
            groupedByAgreement[agreement][termLabel][subAgreement].push(w);
          });

          return Object.keys(groupedByAgreement)
            .sort((a, b) => a.localeCompare(b))
            .map((agreement) => {
              const termsMap = groupedByAgreement[agreement];
              return (
                <div key={agreement} className="space-y-8 animate-in fade-in duration-500 bg-slate-50/20 dark:bg-white/[0.01] p-6 md:p-8 rounded-[3.5rem] border border-slate-100 dark:border-white/5 shadow-inner">
                  {/* Cabeçalho Premium do Convênio */}
                  <div className="flex items-center gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-5 rounded-[2rem] shadow-xl shadow-blue-500/10">
                    <span className="text-2xl drop-shadow-md">
                      {agreement === 'INSS' ? '📘' :
                       agreement === 'SIAPE' ? '📙' :
                       agreement === 'FORÇAS ARMADAS' || agreement === 'FORCAS' ? '📗' :
                       agreement === 'GOVERNOS' ? '🏛️' : '🔘'}
                    </span>
                    <div>
                      <h2 className="text-xs font-black text-blue-100/70 uppercase tracking-[0.2em] leading-none mb-1">Grupo de Convênio</h2>
                      <p className="text-base font-black text-white uppercase tracking-tight leading-none">{agreement}</p>
                    </div>
                  </div>

                  {/* Loop por Prazos dentro do Convênio */}
                  <div className="space-y-10 pl-0 md:pl-4">
                    {Object.keys(termsMap)
                      .sort((a, b) => {
                        if (a === "SEM COEFICIENTE") return 1;
                        if (b === "SEM COEFICIENTE") return -1;
                        return parseInt(a) - parseInt(b);
                      })
                      .map((termLabel) => {
                        const subsMap = termsMap[termLabel];
                        const hasRealSub = Object.keys(subsMap).some(s => s !== "GERAL");

                        return (
                          <div key={termLabel} className="space-y-5">
                            {/* Sub-Cabeçalho do Prazo */}
                            <div className="flex items-center gap-3 bg-white dark:bg-slate-800/40 px-5 py-3 rounded-2xl border border-slate-100 dark:border-white/5 w-fit shadow-sm">
                              <span className="px-2.5 py-1 bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase rounded-lg tracking-wider border border-blue-500/20 shadow-sm leading-none flex items-center justify-center shrink-0">
                                {termLabel}
                              </span>
                              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                                ({Object.values(subsMap).flat().length} {Object.values(subsMap).flat().length === 1 ? 'tabela correspondente' : 'tabelas correspondentes'})
                              </span>
                            </div>

                            {/* Renderizar grupos de Sub-Convênios */}
                            <div className="space-y-8 pl-0 md:pl-4">
                              {Object.keys(subsMap)
                                .sort((a, b) => {
                                  if (a === "GERAL") return -1;
                                  if (b === "GERAL") return 1;
                                  return a.localeCompare(b);
                                })
                                .map((subLabel) => {
                                  const windows = subsMap[subLabel];
                                  return (
                                    <div key={subLabel} className="space-y-4">
                                      {/* Cabeçalho do Sub-Convênio (Apenas se houver sub-convênios reais) */}
                                      {hasRealSub && (
                                        <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-100/50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-200 dark:border-white/5 w-fit shadow-inner">
                                          <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></span>
                                          <span className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                                            Sub-Convênio: {subLabel}
                                          </span>
                                        </div>
                                      )}

                                      {/* Grid das Janelas daquele Sub-Convênio */}
                                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pl-0 md:pl-2">
                                        {windows.map((w) => {
                                          return (
                                            <div key={w.key} className="bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-100 dark:border-white/10 shadow-2xl animate-in slide-in-from-bottom-8 duration-700 flex flex-col h-full">
                                               <div className="px-6 py-5 bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-4">
                                                  <div className="flex items-center gap-4 min-w-0">
                                                     <div className="w-12 h-12 rounded-2xl bg-white shadow-md border-2 border-white dark:border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                                                        {selectedBank?.logo_url ? (
                                                           <img src={getStaticUrl(selectedBank.logo_url)} className="w-full h-full object-cover" alt={selectedBank.name} />
                                                        ) : (
                                                           <span className="text-xl font-black text-blue-600">{selectedBank?.name?.charAt(0)}</span>
                                                        )}
                                                     </div>
                                                     <div className="min-w-0">
                                                        <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none flex items-center gap-2 flex-wrap">
                                                           <span className="truncate">{selectedBank?.name} • {w.table.name}</span>
                                                           {w.term !== null && (
                                                             <span className="px-2 py-0.5 bg-blue-600 dark:bg-blue-500 text-white text-[9px] font-black uppercase rounded-lg tracking-wider shrink-0 shadow-sm">
                                                                {w.term}X
                                                             </span>
                                                           )}
                                                        </h2>
                                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                                           <span className="px-2 py-0.5 bg-slate-900 text-white text-[8px] font-black uppercase rounded tracking-wider">
                                                              {w.table.agreement || "N/A"}
                                                           </span>
                                                           {w.table.sub_agreement && (
                                                             <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[8px] font-black uppercase rounded tracking-wider">
                                                                {w.table.sub_agreement}
                                                             </span>
                                                           )}
                                                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                                              Taxa: {Number(w.table.taxa_convenio || 0).toFixed(2).replace('.', ',')}%
                                                           </span>
                                                        </div>
                                                     </div>
                                                  </div>
                                                  <button 
                                                    onClick={() => handleOpenModal(null, w.table.id.toString(), w.term)}
                                                    className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-1 shrink-0 hover:-translate-y-0.5 active:scale-95"
                                                  >
                                                    <span>＋</span> Novo
                                                  </button>
                                               </div>

                                               <div className="p-6 flex-1 flex flex-col justify-between">
                                                  {w.coefficients.length === 0 ? (
                                                     <div className="py-12 text-center border-2 border-dashed border-slate-100 dark:border-white/5 rounded-2xl flex-1 flex flex-col items-center justify-center">
                                                        <p className="text-[10px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-widest mb-3">Nenhum fator nesta tabela.</p>
                                                        <button
                                                          onClick={() => handleOpenModal(null, w.table.id.toString(), 84)}
                                                          className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-1 mx-auto"
                                                        >
                                                          Adicionar
                                                        </button>
                                                     </div>
                                                  ) : (
                                                     <div className="space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                           {w.coefficients.sort((a, b) => a.interest_rate - b.interest_rate).map(coeff => (
                                                              <div key={coeff.id} className="bg-slate-50/50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-blue-500/30 hover:bg-white dark:hover:bg-slate-800/40 transition-all shadow-sm flex flex-col justify-between">
                                                                 <div className="flex justify-between items-center mb-3">
                                                                    <div className="flex flex-col">
                                                                       <span className="text-blue-600 dark:text-blue-400 font-black text-base leading-none tracking-tight">{coeff.term}x</span>
                                                                       <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider mt-0.5">Prazo</span>
                                                                    </div>
                                                                    <div className="text-right">
                                                                       <span className="text-[11px] text-slate-800 dark:text-white font-black">{Number(coeff.interest_rate || 0).toFixed(2).replace('.', ',')}%</span>
                                                                       <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block leading-none">AM</span>
                                                                    </div>
                                                                 </div>

                                                                 <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-white/5 shadow-inner mb-3">
                                                                    <p className="text-[8px] text-slate-400 font-black uppercase mb-1 tracking-wider leading-none">Fator</p>
                                                                    <p className="text-xs font-mono font-black text-slate-900 dark:text-white tracking-tighter">{coeff.coefficient}</p>
                                                                 </div>

                                                                 <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
                                                                   <button 
                                                                     onClick={() => handleOpenModal(coeff)}
                                                                     className="flex-1 py-2 bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 hover:from-blue-600 hover:to-indigo-600 text-slate-600 dark:text-slate-300 hover:text-white rounded-xl text-[8px] font-black uppercase tracking-widest transition-all duration-300 border border-slate-200 dark:border-slate-700/50 hover:border-transparent flex items-center justify-center gap-1.5"
                                                                   >
                                                                     <svg className="w-3.5 h-3.5 text-slate-400 hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                                                     Config.
                                                                   </button>
                                                                   
                                                                   <button 
                                                                     onClick={() => handleDelete(coeff.id)}
                                                                     className="w-[32px] h-[32px] bg-rose-50/50 dark:bg-rose-900/10 hover:bg-gradient-to-br hover:from-rose-500 hover:to-red-600 text-rose-500 hover:text-white rounded-xl transition-all duration-300 border border-rose-100 dark:border-rose-500/20 hover:border-transparent flex items-center justify-center shrink-0"
                                                                     title="Excluir"
                                                                   >
                                                                     <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                                   </button>
                                                                </div>
                                                             </div>
                                                           ))}
                                                        </div>
                                                     </div>
                                                  )}
                                               </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            });
        })()}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={handleCloseModal}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="bg-slate-50 dark:bg-white/5 px-8 py-7 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
              <h3 className="font-black text-slate-800 dark:text-white text-lg uppercase tracking-tight">{editingCoeff ? "Editar Fator" : "Novo Coeficiente"}</h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-red-500 text-3xl font-light">×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Tabela de Comissão *</label>
                <select 
                  required
                  value={formData.table_id} 
                  onChange={(e) => setFormData({...formData, table_id: e.target.value})} 
                  className="input-admin !py-3"
                >
                  <option value="">Selecione a Tabela...</option>
                  {filteredTables.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.agreement}) - {t.term || 84}X
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Prazo *</label>
                  <input type="number" required value={formData.term} onChange={(e) => setFormData({...formData, term: parseInt(e.target.value)})} className="input-admin !py-3" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Taxa Am *</label>
                  <input type="number" step="0.01" required value={formData.interest_rate} onChange={(e) => setFormData({...formData, interest_rate: parseFloat(e.target.value)})} className="input-admin !py-3" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Coeficiente *</label>
                <input type="text" required value={formData.coefficient} onChange={(e) => setFormData({...formData, coefficient: e.target.value})} className="input-admin !font-mono !py-3" placeholder="0.02456" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 bg-slate-50 rounded-2xl">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-4 text-[10px] font-black uppercase text-white bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/30">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
