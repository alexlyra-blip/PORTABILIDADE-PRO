"use client";

import { useEffect, useState } from "react";
import { api, getStaticUrl } from "@/utils/api";

export default function CoefficientsPage() {
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [tables, setTables] = useState<any[]>([]);
  const [allCoefficients, setAllCoefficients] = useState<Record<string, any[]>>({});
  const [termFilters, setTermFilters] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoeff, setEditingCoeff] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleOpenModal = (coeff: any = null, targetTableId: string = "") => {
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
        term: 84,
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
            onClick={() => handleOpenModal()}
            className="w-full md:w-auto py-3.5 px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 hover:-translate-y-1 active:scale-95 disabled:opacity-50"
          >
            <span>🔢</span> Novo Coeficiente
          </button>
        </div>
      </div>

      <div className="space-y-10">
        {loading && Object.keys(allCoefficients).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white dark:bg-slate-900 rounded-[3rem] shadow-xl">
             <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest animate-pulse">Carregando Coeficientes...</p>
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-white/5 shadow-xl animate-in fade-in duration-500">
             <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Nenhuma tabela ativa correspondente aos filtros.</p>
          </div>
        ) : (
          filteredTables.map((table) => {
            const tableCoeffs = allCoefficients[table.id] || [];
            const activeTerm = termFilters[table.id] ?? null;

            const uniqueTerms = Array.from(new Set(tableCoeffs.map(c => c.term))).sort((a, b) => a - b);

            const filteredCoeffs = activeTerm !== null 
              ? tableCoeffs.filter(c => c.term === activeTerm) 
              : tableCoeffs;

            return (
              <div key={table.id} className="bg-white dark:bg-slate-900 rounded-[3.5rem] overflow-hidden border border-slate-100 dark:border-white/10 shadow-2xl animate-in slide-in-from-bottom-8 duration-700 mb-10">
                 <div className="px-10 py-8 bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row items-center gap-8">
                    <div className="w-20 h-20 rounded-3xl bg-white shadow-2xl border-4 border-white dark:border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                       {selectedBank?.logo_url ? (
                         <img src={getStaticUrl(selectedBank.logo_url)} className="w-full h-full object-cover" alt={selectedBank.name} />
                       ) : (
                         <span className="text-3xl font-black text-blue-600">{selectedBank?.name?.charAt(0)}</span>
                       )}
                    </div>
                    <div className="text-center md:text-left flex-1">
                       <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-1 leading-tight">
                          {selectedBank?.name} • {table.name}
                       </h2>
                       <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2">
                          <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-black uppercase rounded-lg tracking-widest">
                             CONVÊNIO: {table.agreement || "N/A"}
                          </span>
                          {table.sub_agreement && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-600 text-[9px] font-black uppercase rounded-lg tracking-widest">
                               {table.sub_agreement}
                            </span>
                          )}
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                             Taxa: {table.taxa_convenio}%
                          </span>
                       </div>
                    </div>
                    <button 
                      onClick={() => handleOpenModal(null, table.id.toString())}
                      className="py-3 px-8 bg-white dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-500 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-2 shrink-0"
                    >
                      <span>＋</span> Novo Coeficiente
                    </button>
                 </div>

                 <div className="p-10">
                    {tableCoeffs.length === 0 ? (
                       <div className="py-16 text-center border-4 border-dashed border-slate-50 dark:border-white/5 rounded-[3rem]">
                          <p className="text-[11px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-widest mb-4">Nenhum fator de cálculo nesta tabela.</p>
                          <button
                            onClick={() => handleOpenModal(null, table.id.toString())}
                            className="py-2.5 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-2 mx-auto"
                          >
                            Adicionar Primeiro Coeficiente
                          </button>
                       </div>
                    ) : (
                       <div className="space-y-6">
                          {uniqueTerms.length > 1 && (
                            <div className="flex flex-wrap items-center gap-2 mb-6 p-2 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 w-full">
                               <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mx-3">Prazos Disponíveis:</span>
                               <button
                                 onClick={() => setTermFilters({ ...termFilters, [table.id]: null })}
                                 className={`py-2 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTerm === null ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-100 dark:border-white/5'}`}
                               >
                                 Todos ({tableCoeffs.length})
                               </button>
                               {uniqueTerms.map(term => {
                                 const termCount = tableCoeffs.filter(c => c.term === term).length;
                                 return (
                                   <button
                                     key={term}
                                     onClick={() => setTermFilters({ ...termFilters, [table.id]: term })}
                                     className={`py-2 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTerm === term ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-100 dark:border-white/5'}`}
                                   >
                                     {term}X ({termCount})
                                   </button>
                                 );
                               })}
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                             {filteredCoeffs.length === 0 ? (
                                <div className="col-span-full py-10 text-center">
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum coeficiente correspondente a este prazo.</p>
                                </div>
                             ) : (
                                filteredCoeffs.sort((a, b) => b.term - a.term).map(coeff => (
                                   <div key={coeff.id} className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 hover:border-blue-500/40 hover:bg-white dark:hover:bg-slate-800/50 transition-all shadow-sm group flex flex-col justify-between">
                                      <div className="flex justify-between items-start mb-6">
                                         <div className="flex flex-col">
                                            <span className="text-blue-600 dark:text-blue-400 font-black text-2xl leading-none tracking-tighter">{coeff.term}x</span>
                                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Parcelas</span>
                                         </div>
                                         <div className="text-right">
                                            <span className="text-xs text-slate-800 dark:text-white font-black">{Number(coeff.interest_rate || 0).toFixed(2)}%</span>
                                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest block">AM</span>
                                         </div>
                                      </div>

                                      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-inner mb-6">
                                         <p className="text-[9px] text-slate-400 font-black uppercase mb-1.5 tracking-[0.1em]">Fator de Cálculo</p>
                                         <p className="text-base font-mono font-black text-slate-900 dark:text-white tracking-tighter">{coeff.coefficient}</p>
                                      </div>

                                      <div className="mt-auto flex gap-3 pt-5 border-t border-slate-100 dark:border-white/5">
                                        <button 
                                          onClick={() => handleOpenModal(coeff)}
                                          className="flex-1 py-3 bg-gradient-to-b from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 hover:from-blue-600 hover:to-indigo-600 text-slate-600 dark:text-slate-300 hover:text-white rounded-[1.25rem] text-[9px] font-black uppercase tracking-widest transition-all duration-300 border border-slate-200 dark:border-slate-700/50 hover:border-transparent hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 flex items-center justify-center gap-2.5 group/btn relative overflow-hidden"
                                        >
                                          <svg className="w-4 h-4 text-slate-400 group-hover/btn:text-white transition-colors group-hover/btn:rotate-90 duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                          Configurar
                                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
                                        </button>
                                        
                                        <button 
                                          onClick={() => handleDelete(coeff.id)}
                                          className="w-[46px] h-[46px] bg-rose-50/50 dark:bg-rose-900/10 hover:bg-gradient-to-br hover:from-rose-500 hover:to-red-600 text-rose-500 hover:text-white rounded-[1.25rem] transition-all duration-300 border border-rose-100 dark:border-rose-500/20 hover:border-transparent hover:shadow-xl hover:shadow-red-500/30 hover:-translate-y-0.5 flex items-center justify-center shrink-0 group/del relative overflow-hidden"
                                          title="Excluir Coeficiente"
                                        >
                                          <svg className="w-4 h-4 transition-transform group-hover/del:scale-110 group-hover/del:-rotate-12 duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/del:translate-x-full transition-transform duration-700"></div>
                                        </button>
                                      </div>
                                   </div>
                                ))
                             )}
                          </div>
                       </div>
                    )}
                 </div>
              </div>
            );
          })
        )}
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
                  {filteredTables.map(t => <option key={t.id} value={t.id}>{t.name} ({t.agreement})</option>)}
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
