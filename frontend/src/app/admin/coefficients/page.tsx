"use client";

import { useEffect, useState } from "react";
import { api, getStaticUrl } from "@/utils/api";

export default function CoefficientsPage() {
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [coefficients, setCoefficients] = useState<any[]>([]);
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

  useEffect(() => {
    loadBanks();
  }, []);

  useEffect(() => {
    if (selectedBankId) {
      loadTables(selectedBankId);
    } else {
      setTables([]);
      setSelectedTableId("");
    }
  }, [selectedBankId]);

  useEffect(() => {
    if (selectedTableId) {
      loadCoefficients(selectedTableId);
    } else {
      setCoefficients([]);
    }
  }, [selectedTableId]);

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
      if (data.length > 0) {
        // Find the first table that actually has coefficients if possible, else just the first one
        setSelectedTableId(data[0].id.toString());
      }
    } catch (error) {
      console.error("Erro ao carregar tabelas:", error);
    }
  };

  const loadCoefficients = async (tableId: string) => {
    try {
      setLoading(true);
      const data = await api.get(`/admin/bank-tables/${tableId}/coefficients`);
      setCoefficients(data);
    } catch (error) {
      console.error("Erro ao carregar coeficientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (coeff: any = null) => {
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
        table_id: selectedTableId,
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
      loadCoefficients(selectedTableId);
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
      loadCoefficients(selectedTableId);
    } catch (error) {
      console.error("Erro ao excluir coeficiente:", error);
      alert("Erro ao excluir coeficiente.");
    }
  };

  const selectedBank = banks.find(b => b.id.toString() === selectedBankId);
  const selectedTable = tables.find(t => t.id.toString() === selectedTableId);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header Premium com Filtros Lado a Lado */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-xl border border-slate-100 dark:border-white/5">
        <div className="flex-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none mb-1">Coeficientes</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest italic">Gestão de cálculo HP-12C</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
          {/* Seletor 1: BANCO */}
          <div className="relative w-full md:w-64">
             <select 
               value={selectedBankId}
               onChange={(e) => setSelectedBankId(e.target.value)}
               className="w-full py-3.5 px-6 bg-slate-50 dark:bg-white/5 rounded-2xl border-none shadow-inner text-[11px] font-black uppercase tracking-widest focus:ring-2 ring-blue-500/20 transition-all cursor-pointer text-blue-600"
             >
               {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
             </select>
          </div>

          {/* Seletor 2: TABELA */}
          <div className="relative w-full md:w-64">
             <select 
               value={selectedTableId}
               onChange={(e) => setSelectedTableId(e.target.value)}
               disabled={tables.length === 0}
               className="w-full py-3.5 px-6 bg-slate-50 dark:bg-white/5 rounded-2xl border-none shadow-inner text-[11px] font-black uppercase tracking-widest focus:ring-2 ring-blue-500/20 transition-all cursor-pointer text-slate-700 dark:text-white disabled:opacity-50"
             >
               <option value="">Selecione a Tabela...</option>
               {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
             </select>
          </div>

          <button 
            disabled={!selectedTableId}
            onClick={() => handleOpenModal()}
            className="w-full md:w-auto py-3.5 px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 hover:-translate-y-1 active:scale-95 disabled:opacity-50"
          >
            <span>🔢</span> Novo Coeficiente
          </button>
        </div>
      </div>

      {/* Janela de Visualização Agrupada por Convênio */}
      <div className="space-y-10">
        {!selectedTableId ? (
          <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 shadow-xl">
             <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">Escolha um banco e uma tabela para gerenciar os coeficientes.</p>
          </div>
        ) : (
          /* Janela Premium por Convênio (SIAPE ficaria em outra janela se filtrado) */
          /* Aqui o agrupamento por Convênio acontece dentro da seleção da tabela */
          <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] overflow-hidden border border-slate-100 dark:border-white/10 shadow-2xl animate-in slide-in-from-bottom-8 duration-700">
             {/* Cabeçalho da Janela da Tabela */}
             <div className="px-10 py-8 bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex flex-col md:flex-row items-center gap-8">
                <div className="w-20 h-20 rounded-3xl bg-white shadow-2xl border-4 border-white dark:border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                   {selectedBank?.logo_url ? (
                     <img src={getStaticUrl(selectedBank.logo_url)} className="w-full h-full object-cover" alt={selectedBank.name} />
                   ) : (
                     <span className="text-3xl font-black text-blue-600">{selectedBank?.name?.charAt(0)}</span>
                   )}
                </div>
                <div className="text-center md:text-left flex-1">
                   <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-1">
                      {selectedBank?.name} • {selectedTable?.name}
                   </h2>
                   <div className="flex items-center justify-center md:justify-start gap-3">
                      <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-black uppercase rounded-lg tracking-widest">
                         CONVÊNIO: {selectedTable?.agreement || "N/A"}
                      </span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                         Taxa: {selectedTable?.taxa_convenio}%
                      </span>
                   </div>
                </div>
                <button 
                  onClick={() => handleOpenModal()}
                  className="py-3 px-8 bg-white dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-500 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-2"
                >
                  <span>＋</span> Novo Coeficiente
                </button>
             </div>

             {/* Conteúdo: Grid de Coeficientes */}
             <div className="p-10">
                {loading ? (
                   <div className="flex justify-center py-10">
                      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                   </div>
                ) : coefficients.length === 0 ? (
                   <div className="py-20 text-center border-4 border-dashed border-slate-50 rounded-[3rem]">
                      <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Nenhum fator de cálculo nesta tabela.</p>
                   </div>
                ) : (
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {coefficients.sort((a, b) => b.term - a.term).map(coeff => (
                         <div key={coeff.id} className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 hover:border-blue-500/40 hover:bg-white transition-all shadow-sm group">
                            <div className="flex justify-between items-start mb-6">
                               <div className="flex flex-col">
                                  <span className="text-blue-600 dark:text-blue-400 font-black text-2xl leading-none tracking-tighter">{coeff.term}x</span>
                                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Parcelas</span>
                               </div>
                               <div className="text-right">
                                  <span className="text-xs text-slate-800 dark:text-white font-black">{coeff.interest_rate}%</span>
                                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest block">AM</span>
                               </div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-inner mb-6">
                               <p className="text-[9px] text-slate-400 font-black uppercase mb-1.5 tracking-[0.1em]">Fator de Cálculo</p>
                               <p className="text-base font-mono font-black text-slate-900 dark:text-white tracking-tighter">{coeff.coefficient}</p>
                            </div>

                            <div className="flex gap-2">
                               <button onClick={() => handleOpenModal(coeff)} className="flex-1 py-3 bg-white dark:bg-white/5 hover:bg-blue-600 hover:text-white text-slate-500 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border border-slate-200">Editar</button>
                               <button onClick={() => handleDelete(coeff.id)} className="w-12 h-12 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl transition-all border border-red-500/20 flex items-center justify-center">🗑️</button>
                            </div>
                         </div>
                      ))}
                   </div>
                )}
             </div>
          </div>
        )}
      </div>

      {/* Modal de Cadastro */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" onClick={handleCloseModal}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="bg-slate-50 dark:bg-white/5 px-8 py-7 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
              <h3 className="font-black text-slate-800 dark:text-white text-lg uppercase tracking-tight">{editingCoeff ? "Editar Fator" : "Novo Coeficiente"}</h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-red-500 text-3xl font-light">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
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
